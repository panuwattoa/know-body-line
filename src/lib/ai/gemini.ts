import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { GEMINI_MODEL } from "@/lib/config";
import {
  foodAnalysisInstruction,
  personaSystem,
} from "@/lib/ai/prompts";

/**
 * Google AI Studio (Gemini) is configured via GOOGLE_GENERATIVE_AI_API_KEY.
 * We use structured output for food analysis and free text for coach chat.
 */

const nutritionShape = {
  kcal: z.number().describe("พลังงาน กิโลแคลอรี"),
  protein_g: z.number().describe("โปรตีน กรัม"),
  carb_g: z.number().describe("คาร์โบไฮเดรต กรัม"),
  fat_g: z.number().describe("ไขมัน กรัม"),
  sodium_mg: z.number().describe("โซเดียม มิลลิกรัม"),
  sugar_g: z.number().describe("น้ำตาล กรัม"),
};

export const foodAnalysisSchema = z.object({
  kind: z.enum(["food", "label", "unknown"]),
  name: z.string().describe("ชื่อเมนู/ผลิตภัณฑ์ ภาษาไทย"),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  portion_g: z.number().describe("น้ำหนักรวมโดยประมาณ กรัม"),
  items: z
    .array(
      z.object({
        name: z.string(),
        amount_g: z.number(),
        ...nutritionShape,
      }),
    )
    .describe("ส่วนประกอบพร้อมค่าโภชนาการรายรายการ"),
  total: z.object(nutritionShape),
  coach_note: z.string().describe("คำแนะนำสั้นๆ ในบุคลิกโค้ช"),
  confidence: z.number().min(0).max(1).describe("ความมั่นใจในการประเมิน 0-1"),
});

export type FoodAnalysis = z.infer<typeof foodAnalysisSchema>;

/** Analyze a food photo or nutrition label. */
export async function analyzeFoodImage(opts: {
  image: Uint8Array | Buffer;
  mediaType?: string;
  context?: string;
  hint?: string;
}): Promise<FoodAnalysis> {
  const { object } = await generateObject({
    model: google(GEMINI_MODEL),
    schema: foodAnalysisSchema,
    system: personaSystem(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: foodAnalysisInstruction(opts.context ?? "") +
              (opts.hint ? `\n\nผู้ใช้ระบุเพิ่มเติม: ${opts.hint}` : ""),
          },
          {
            type: "image",
            image: opts.image,
            mediaType: opts.mediaType ?? "image/jpeg",
          },
        ],
      },
    ],
  });
  return object;
}

/** Analyze a typed menu name / description (no image). */
export async function analyzeFoodText(opts: {
  text: string;
  context?: string;
}): Promise<FoodAnalysis> {
  const { object } = await generateObject({
    model: google(GEMINI_MODEL),
    schema: foodAnalysisSchema,
    system: personaSystem(),
    prompt:
      foodAnalysisInstruction(opts.context ?? "") +
      `\n\nเมนู/รายการอาหารที่ผู้ใช้พิมพ์มา: "${opts.text}"`,
  });
  return object;
}

/** Free-form coach chat: "วันนี้กินอะไรดี", "ออกกำลังกายอะไรดี", ฯลฯ */
export async function coachReply(opts: {
  message: string;
  context?: string;
  task?: "meal_suggest" | "workout_suggest" | "general";
}): Promise<string> {
  const taskHint =
    opts.task === "meal_suggest"
      ? "\nงาน: ออกแบบเมนูที่เหมาะกับเป้าหมายและโควตาที่เหลือของวันนี้ บอกส่วนประกอบและปริมาณคร่าวๆ พร้อมค่าแคลโดยประมาณ"
      : opts.task === "workout_suggest"
        ? "\nงาน: ออกแบบโปรแกรมออกกำลังกายวันนี้ให้เหมาะกับเป้าหมาย บอกท่า เซ็ต จำนวนครั้ง และเหตุผลสั้นๆ"
        : "";

  const { text } = await generateText({
    model: google(GEMINI_MODEL),
    system: personaSystem(),
    prompt:
      (opts.context ? `บริบทผู้ใช้:\n${opts.context}\n\n` : "") +
      `ผู้ใช้ถามว่า: "${opts.message}"${taskHint}\n\nตอบแบบกระชับ อ่านง่ายบนมือถือ`,
  });
  return text.trim();
}

/** Lightweight intent router for free-text messages. */
export type Intent = "log_food" | "meal_suggest" | "workout_suggest" | "chat";

export async function classifyIntent(text: string): Promise<Intent> {
  // Fast heuristic first (saves a model call for the common cases).
  const t = text.toLowerCase();
  if (/(กินอะไรดี|เมนูอะไร|แนะนำเมนู|กินไรดี)/.test(t)) return "meal_suggest";
  if (/(ออกกำลัง|เล่นเวท|เวิร์คเอาท์|workout|ท่าออก)/.test(t)) return "workout_suggest";

  const { object } = await generateObject({
    model: google(GEMINI_MODEL),
    schema: z.object({
      intent: z.enum(["log_food", "meal_suggest", "workout_suggest", "chat"]),
    }),
    prompt: `จัดหมวดข้อความของผู้ใช้แอปโภชนาการนี้:
- "log_food": ผู้ใช้บอกชื่ออาหาร/เมนูที่กิน เพื่อให้จดแคล (เช่น "ข้าวผัดกระเพราไก่ไข่ดาว", "กาแฟเย็น 1 แก้ว")
- "meal_suggest": ถามว่าควรกินอะไร
- "workout_suggest": ถามเรื่องออกกำลังกาย
- "chat": ทักทาย/ถามทั่วไป

ข้อความ: "${text}"`,
  });
  return object.intent;
}
