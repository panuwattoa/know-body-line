import { NextResponse } from "next/server";
import { verifyLineSignature } from "@/lib/line/verify";
import {
  getMessageContent,
  getProfile as getLineProfile,
  reply,
  showLoading,
} from "@/lib/line/client";
import {
  dailySummaryBubble,
  mainQuickReply,
  mealResultBubble,
  welcomeMessages,
} from "@/lib/line/flex";
import {
  analyzeFoodImage,
  analyzeFoodText,
  classifyIntent,
  coachReply,
} from "@/lib/ai/gemini";
import { uploadMealPhoto } from "@/lib/supabase/storage";
import { compressImage } from "@/lib/media/image";
import {
  bumpImageUsage,
  DAILY_IMAGE_LIMIT,
  getDailyTotals,
  getOrCreateUser,
  getPendingMeal,
  getTargets,
  logWeight,
  saveMeal,
  setChatState,
  setPendingMeal,
} from "@/lib/domain/repo";
import { buildUserContext } from "@/lib/domain/context";
import { COACH_NAME } from "@/lib/config";
import type {
  LineEvent,
  LineImageMessage,
  LineMessageEvent,
  LinePostbackEvent,
  LineTextMessage,
  LineWebhookBody,
} from "@/lib/line/types";
import type { AppUser } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody) as LineWebhookBody;

  // Handle events sequentially; isolate failures so one bad event can't 500 the batch.
  for (const event of body.events ?? []) {
    try {
      await handleEvent(event);
    } catch (err) {
      console.error("Event handling error", err);
      if ("replyToken" in event && event.replyToken) {
        await reply(event.replyToken as string, [
          { type: "text", text: `ขออภัยครับ ${COACH_NAME}สะดุดนิดนึง ลองส่งใหม่อีกครั้งนะครับ 🙏` },
        ]).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true });
}

/** Max characters accepted from a single text message. */
const MAX_TEXT_LEN = 500;

async function handleEvent(event: LineEvent) {
  const userId = event.source?.userId;
  if (!userId) return;
  // Only serve 1:1 chats — ignore group/room to avoid noise and abuse.
  if (event.source?.type && event.source.type !== "user") return;

  if (event.type === "follow") {
    const user = await getOrCreateUser(userId, () => getLineProfile(userId));
    await reply((event as LineMessageEvent).replyToken, welcomeMessages(user.display_name));
    return;
  }

  if (event.type === "message") {
    const msg = (event as LineMessageEvent).message;
    if (msg.type === "text") {
      await handleText(event as LineMessageEvent, (msg as LineTextMessage).text.trim());
    } else if (msg.type === "image") {
      await handleImage(event as LineMessageEvent, msg as LineImageMessage);
    } else {
      await reply((event as LineMessageEvent).replyToken, [
        { type: "text", text: `ส่งรูปอาหารหรือพิมพ์ชื่อเมนูมาได้เลยครับ 📸`, quickReply: mainQuickReply() },
      ]);
    }
    return;
  }

  if (event.type === "postback") {
    await handlePostback(event as LinePostbackEvent);
    return;
  }
}

async function loadUser(userId: string): Promise<AppUser> {
  return getOrCreateUser(userId, () => getLineProfile(userId));
}

// ---- text ----

async function handleText(event: LineMessageEvent, text: string) {
  const userId = event.source.userId!;

  // Guard: reject empty or overly long input before spending any AI calls.
  if (!text) return;
  if (text.length > MAX_TEXT_LEN) {
    await reply(event.replyToken, [
      { type: "text", text: `ข้อความยาวไปนิดครับ 😅 ลองพิมพ์ชื่อเมนูสั้นๆ หรือถ่ายรูปอาหารมาได้เลย`, quickReply: mainQuickReply() },
    ]);
    return;
  }

  const user = await loadUser(userId);

  // Weight logging shortcut: "น้ำหนัก 74" / "74 kg" / "74.5"
  const weight = parseWeight(text);
  if (weight) {
    await logWeight(user.id, weight);
    await reply(event.replyToken, [
      { type: "text", text: `บันทึกน้ำหนัก ${weight} kg ให้แล้วครับ 💪 สู้ๆ นะ!`, quickReply: mainQuickReply() },
    ]);
    return;
  }

  await showLoading(userId);
  const intent = await classifyIntent(text);
  const { context } = await buildUserContext(user);

  if (intent === "meal_suggest") {
    const answer = await coachReply({ message: text, context, task: "meal_suggest" });
    await reply(event.replyToken, [{ type: "text", text: answer, quickReply: mainQuickReply() }]);
    return;
  }
  if (intent === "workout_suggest") {
    const answer = await coachReply({ message: text, context, task: "workout_suggest" });
    await reply(event.replyToken, [{ type: "text", text: answer, quickReply: mainQuickReply() }]);
    return;
  }
  if (intent === "chat") {
    const answer = await coachReply({ message: text, context, task: "general" });
    await reply(event.replyToken, [{ type: "text", text: answer, quickReply: mainQuickReply() }]);
    return;
  }

  // log_food: analyze the typed menu
  const analysis = await analyzeFoodText({ text, context });
  await setPendingMeal(user.id, analysis);
  const targets = await getTargets(user.id);
  const consumed = await getDailyTotals(user.id);
  await reply(event.replyToken, [
    {
      type: "flex",
      altText: `${analysis.name} • ${Math.round(analysis.total.kcal)} kcal`,
      contents: mealResultBubble(analysis, targets.kcal - consumed.kcal),
    },
  ]);
}

// ---- image ----

async function handleImage(event: LineMessageEvent, msg: LineImageMessage) {
  const userId = event.source.userId!;
  const user = await loadUser(userId);

  // Rate limit: cap daily photo analyses before any download/AI cost.
  const count = await bumpImageUsage(user.id);
  if (count > DAILY_IMAGE_LIMIT) {
    await reply(event.replyToken, [
      {
        type: "text",
        text: `วันนี้ถ่ายรูปครบ ${DAILY_IMAGE_LIMIT} รูปแล้วครับ 📸 พักก่อนน้า เดี๋ยวพรุ่งนี้มาลุยต่อ! ระหว่างนี้พิมพ์ชื่อเมนูให้พี่จดแคลได้อยู่นะ ✍️`,
        quickReply: mainQuickReply(),
      },
    ]);
    return;
  }

  await showLoading(userId, 30);
  const original = await getMessageContent(msg.id);
  // Compress once, then reuse for both AI analysis and storage.
  const { buffer, mediaType } = await compressImage(original.buffer);
  const [{ context }, imageUrl] = await Promise.all([
    buildUserContext(user),
    uploadMealPhoto(user.id, buffer, mediaType),
  ]);

  const analysis = await analyzeFoodImage({ image: buffer, mediaType, context });

  if (analysis.kind === "unknown") {
    await reply(event.replyToken, [
      {
        type: "text",
        text: `ผมดูรูปนี้ไม่ค่อยออกครับ 😅 ลองถ่ายให้เห็นอาหารชัดๆ หรือพิมพ์ชื่อเมนูมาก็ได้นะ`,
        quickReply: mainQuickReply(),
      },
    ]);
    return;
  }

  await setPendingMeal(user.id, analysis, imageUrl ?? undefined);
  const targets = await getTargets(user.id);
  const consumed = await getDailyTotals(user.id);
  await reply(event.replyToken, [
    {
      type: "flex",
      altText: `${analysis.name} • ${Math.round(analysis.total.kcal)} kcal`,
      contents: mealResultBubble(analysis, targets.kcal - consumed.kcal),
    },
  ]);
}

// ---- postback ----

async function handlePostback(event: LinePostbackEvent) {
  const userId = event.source.userId!;
  const user = await loadUser(userId);
  const params = new URLSearchParams(event.postback.data);
  const action = params.get("action");

  if (action === "log_meal") {
    const pending = await getPendingMeal(user.id);
    if (!pending) {
      await reply(event.replyToken, [
        { type: "text", text: `ไม่เจอมื้อที่ค้างไว้ครับ ลองถ่ายรูปหรือพิมพ์เมนูใหม่นะ 📸`, quickReply: mainQuickReply() },
      ]);
      return;
    }
    const source = pending.imageUrl ? "photo" : "text";
    await saveMeal(user.id, { analysis: pending.analysis, imageUrl: pending.imageUrl, source });
    await setChatState(user.id, null, null);

    const [targets, consumed] = await Promise.all([getTargets(user.id), getDailyTotals(user.id)]);
    await reply(event.replyToken, [
      {
        type: "flex",
        altText: "จดมื้อนี้ให้แล้ว!",
        contents: dailySummaryBubble({
          date: new Date().toISOString().slice(0, 10),
          mealName: pending.analysis.name,
          mealType: pending.analysis.meal_type,
          consumed,
          targets,
        }),
      },
    ]);
    return;
  }

  await reply(event.replyToken, [
    { type: "text", text: `รับทราบครับ`, quickReply: mainQuickReply() },
  ]);
}

// ---- helpers ----

function parseWeight(text: string): number | null {
  const m = text.match(/(?:น้ำหนัก\s*)?(\d{2,3}(?:\.\d)?)\s*(?:kg|กก|กิโล|กิโลกรัม)?$/i);
  if (!text.includes("น้ำหนัก") && !/kg|กก|กิโล/i.test(text)) return null;
  if (!m) return null;
  const v = parseFloat(m[1]);
  return v >= 30 && v <= 300 ? v : null;
}
