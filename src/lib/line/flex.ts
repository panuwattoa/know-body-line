import { COACH_NAME, COLORS, LIFF_IDS, liffUrl } from "@/lib/config";
import type { FoodAnalysis } from "@/lib/ai/gemini";
import type {
  FlexBox,
  FlexBubble,
  FlexComponent,
  LineOutgoingMessage,
  QuickReply,
} from "@/lib/line/types";
import type { DailyTargets } from "@/lib/domain/nutrition";

const MEAL_TYPE_TH: Record<string, string> = {
  breakfast: "มื้อเช้า",
  lunch: "มื้อกลางวัน",
  dinner: "มื้อเย็น",
  snack: "มื้อว่าง",
};

function n(v: number): string {
  return Math.round(v).toLocaleString("en-US");
}

/** A macro cell: number on top, label + unit below. */
function macroCell(label: string, value: number, unit: string): FlexBox {
  return {
    type: "box",
    layout: "vertical",
    flex: 1,
    contents: [
      { type: "text", text: label, size: "xxs", color: COLORS.subtle, align: "center" },
      { type: "text", text: n(value), size: "lg", weight: "bold", align: "center", color: COLORS.text },
      { type: "text", text: unit, size: "xxs", color: COLORS.subtle, align: "center" },
    ],
  };
}

/** Progress bar simulated with nested boxes. */
function progressBar(pct: number, color: string): FlexBox {
  const clamped = Math.max(2, Math.min(100, Math.round(pct)));
  return {
    type: "box",
    layout: "vertical",
    height: "8px",
    backgroundColor: "#e6e6e6",
    cornerRadius: "4px",
    margin: "sm",
    contents: [
      {
        type: "box",
        layout: "vertical",
        width: `${clamped}%`,
        height: "8px",
        backgroundColor: color,
        cornerRadius: "4px",
        contents: [{ type: "filler" }],
      },
    ],
  };
}

function pctColor(pct: number, overIsBad = false): string {
  if (overIsBad) return pct > 100 ? COLORS.danger : COLORS.ok;
  if (pct >= 100) return COLORS.ok;
  if (pct >= 60) return COLORS.brand;
  return COLORS.warn;
}

/** Nutrition result card for a single analyzed meal. */
export function mealResultBubble(a: FoodAnalysis, remainingKcal?: number): FlexBubble {
  const items: FlexComponent[] = a.items.slice(0, 8).map((it) => ({
    type: "box",
    layout: "horizontal",
    contents: [
      { type: "text", text: it.name, size: "sm", color: COLORS.text, flex: 4, wrap: true },
      { type: "text", text: `${n(it.amount_g)} g`, size: "sm", color: COLORS.subtle, flex: 2, align: "end" },
    ],
  }));

  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        { type: "text", text: a.name, size: "xl", weight: "bold", wrap: true, color: COLORS.text },
        {
          type: "box",
          layout: "baseline",
          contents: [
            {
              type: "box",
              layout: "vertical",
              backgroundColor: "#eaf6df",
              cornerRadius: "6px",
              paddingAll: "4px",
              flex: 0,
              contents: [
                { type: "text", text: MEAL_TYPE_TH[a.meal_type] ?? a.meal_type, size: "xs", color: COLORS.brandDark },
              ],
            },
            { type: "text", text: `~${n(a.portion_g)} g`, size: "xs", color: COLORS.subtle, margin: "md" },
          ],
        },
        {
          type: "box",
          layout: "baseline",
          contents: [
            { type: "text", text: n(a.total.kcal), size: "3xl", weight: "bold", color: COLORS.text, flex: 0 },
            { type: "text", text: "kcal", size: "sm", color: COLORS.subtle, margin: "sm" },
          ],
        },
        // Macro grid
        {
          type: "box",
          layout: "horizontal",
          backgroundColor: COLORS.cardBg,
          cornerRadius: "10px",
          paddingAll: "12px",
          contents: [
            macroCell("โปรตีน", a.total.protein_g, "g"),
            macroCell("คาร์บ", a.total.carb_g, "g"),
            macroCell("ไขมัน", a.total.fat_g, "g"),
            macroCell("โซเดียม", a.total.sodium_mg, "mg"),
            macroCell("น้ำตาล", a.total.sugar_g, "g"),
          ],
        },
        // Ingredients
        {
          type: "box",
          layout: "vertical",
          backgroundColor: COLORS.cardBg,
          cornerRadius: "10px",
          paddingAll: "12px",
          spacing: "sm",
          contents: [
            { type: "text", text: "🧂 ส่วนผสม", size: "sm", weight: "bold", color: COLORS.text },
            ...items,
          ],
        },
        { type: "separator", margin: "md" },
        // Coach note
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            { type: "text", text: `💬 คำแนะนำจาก${COACH_NAME}`, size: "sm", weight: "bold", color: COLORS.subtle },
            { type: "text", text: a.coach_note, size: "sm", wrap: true, color: COLORS.text },
            ...(remainingKcal !== undefined
              ? [{ type: "text" as const, text: `เหลือโควตาวันนี้ ~${n(remainingKcal)} kcal`, size: "xs", color: COLORS.subtle }]
              : []),
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: COLORS.brand,
          action: { type: "postback", label: "✍️ จดมื้อนี้", data: "action=log_meal", displayText: "จดมื้อนี้" },
        },
        {
          type: "button",
          style: "secondary",
          action: { type: "uri", label: "✏️ แก้ไข", uri: liffUrl(LIFF_IDS.profile, "/liff/edit") },
        },
        { type: "text", text: `ถ้า${COACH_NAME}ประเมินผิด บอกได้เลย 😉`, size: "xxs", color: COLORS.subtle, align: "center" },
      ],
    },
  };
}

export interface DailySummary {
  date: string;
  mealName?: string;
  mealType?: string;
  totalG?: number;
  consumed: { kcal: number; protein: number; carb: number; fat: number; sodium: number; sugar: number };
  targets: { kcal: number; protein: number; carb: number; fat: number; sodium: number; sugar: number };
}

function summaryRow(label: string, consumed: number, target: number, unit: string, overIsBad = false): FlexComponent[] {
  const pct = target > 0 ? (consumed / target) * 100 : 0;
  const valueColor = overIsBad && pct > 100 ? COLORS.danger : COLORS.text;
  return [
    {
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        { type: "text", text: label, size: "sm", color: COLORS.text, flex: 3 },
        { type: "text", text: `${n(consumed)} / ${n(target)} ${unit}`, size: "sm", weight: "bold", align: "end", color: valueColor, flex: 4 },
      ],
    },
    progressBar(pct, pctColor(pct, overIsBad)),
  ];
}

/** "ภาพรวมวันนี้" summary card after logging a meal. */
export function dailySummaryBubble(s: DailySummary): FlexBubble {
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: COLORS.brand,
      paddingAll: "16px",
      contents: [
        { type: "text", text: `✅ ${COACH_NAME}จดให้แล้ว!`, size: "lg", weight: "bold", color: "#ffffff" },
        ...(s.mealName
          ? [{ type: "text" as const, text: `${s.mealName}${s.mealType ? " • " + (MEAL_TYPE_TH[s.mealType] ?? s.mealType) : ""}`, size: "sm", color: "#ffffff", wrap: true, margin: "sm" }]
          : []),
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#eaf6df",
          cornerRadius: "8px",
          paddingAll: "8px",
          contents: [{ type: "text", text: "ภาพรวมวันนี้", weight: "bold", align: "center", color: COLORS.brandDark }],
        },
        ...summaryRow("พลังงาน", s.consumed.kcal, s.targets.kcal, "kcal"),
        ...summaryRow("โปรตีน", s.consumed.protein, s.targets.protein, "g"),
        ...summaryRow("คาร์บ", s.consumed.carb, s.targets.carb, "g"),
        ...summaryRow("ไขมัน", s.consumed.fat, s.targets.fat, "g", true),
        ...summaryRow("โซเดียม", s.consumed.sodium, s.targets.sodium, "mg", true),
        ...summaryRow("น้ำตาล", s.consumed.sugar, s.targets.sugar, "g", true),
      ],
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        { type: "button", style: "secondary", height: "sm", action: { type: "uri", label: "📋 ประวัติ", uri: liffUrl(LIFF_IDS.history, "/liff/history") } },
        { type: "button", style: "secondary", height: "sm", action: { type: "uri", label: "📊 รายงาน", uri: liffUrl(LIFF_IDS.report, "/liff/report") } },
      ],
    },
  };
}

/** "เป้าหมายรายวัน" card shown after onboarding. */
export function goalSummaryBubble(opts: {
  name?: string | null;
  targets: DailyTargets;
  fromKg: number;
  toKg: number;
}): FlexBubble {
  const { targets } = opts;
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        { type: "text", text: "🎯 เป้าหมายรายวัน", weight: "bold", size: "lg", color: COLORS.text },
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#eaf6df",
          cornerRadius: "10px",
          paddingAll: "12px",
          contents: [
            { type: "text", text: "แคลอรี", align: "center", size: "sm", color: COLORS.brandDark },
            { type: "text", text: n(targets.target_kcal), align: "center", size: "3xl", weight: "bold", color: COLORS.text },
            { type: "text", text: "kcal / วัน", align: "center", size: "xs", color: COLORS.subtle },
          ],
        },
        { type: "separator" },
        ...macroLine("💪 โปรตีน", `${n(targets.target_protein_g)} g`),
        ...macroLine("🍚 คาร์บ", `${n(targets.target_carb_g)} g`),
        ...macroLine("🥑 ไขมัน", `${n(targets.target_fat_g)} g`),
        ...macroLine("🧂 โซเดียม", `${n(targets.target_sodium_mg)} mg`),
        ...macroLine("🍬 น้ำตาล", `${n(targets.target_sugar_g)} g`),
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#eef4fb",
          cornerRadius: "8px",
          paddingAll: "10px",
          margin: "md",
          contents: [
            { type: "text", text: "📅 ไทม์ไลน์เป้าหมาย", size: "xs", weight: "bold", color: "#3a6ea5" },
            {
              type: "box",
              layout: "baseline",
              margin: "sm",
              contents: [
                { type: "text", text: `${n(opts.fromKg)} → ${n(opts.toKg)} kg`, size: "md", weight: "bold", color: COLORS.text, flex: 3 },
                { type: "text", text: `~${targets.weeks_to_target} สัปดาห์`, size: "sm", color: "#3a6ea5", align: "end", flex: 2 },
              ],
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: COLORS.brand,
          action: { type: "camera", label: "📸 เริ่มมื้อแรก" },
        },
      ],
    },
  };
}

function macroLine(label: string, value: string): FlexComponent[] {
  return [
    {
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: label, size: "sm", color: COLORS.text, flex: 3 },
        { type: "text", text: value, size: "sm", weight: "bold", align: "end", color: COLORS.text, flex: 2 },
      ],
    },
  ];
}

/** Quick reply buttons shown under coach messages. */
export function mainQuickReply(): QuickReply {
  return {
    items: [
      { type: "action", action: { type: "camera", label: "📸 ถ่ายรูปอาหาร" } },
      { type: "action", action: { type: "cameraRoll", label: "🖼️ เลือกจากคลัง" } },
      { type: "action", action: { type: "message", label: "🍽️ วันนี้กินอะไรดี", text: "วันนี้กินอะไรดี" } },
      { type: "action", action: { type: "message", label: "🏋️ ออกกำลังกายอะไรดี", text: "วันนี้ออกกำลังกายอะไรดี" } },
      { type: "action", action: { type: "uri", label: "📋 ประวัติ", uri: liffUrl(LIFF_IDS.history, "/liff/history") } },
      { type: "action", action: { type: "uri", label: "📊 รายงาน", uri: liffUrl(LIFF_IDS.report, "/liff/report") } },
    ],
  };
}

/** Welcome + onboarding invitation for new followers. */
export function welcomeMessages(name?: string | null): LineOutgoingMessage[] {
  const hello = name ? `สวัสดีครับ ${name}!` : "สวัสดีครับ!";
  return [
    {
      type: "text",
      text: `${hello} ${COACH_NAME}เองครับ 👋\n\nผมจะดูแลเรื่องการกินให้ทุกวัน\nแค่ถ่ายรูปอาหาร → ผมบอกแคลให้ 🔥\n\nเริ่มจากตั้งเป้าหมายกันก่อนนะครับ ใช้เวลาแค่ 2 นาที`,
    },
    {
      type: "flex",
      altText: "ตั้งเป้าหมายกับโค้ช",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            { type: "text", text: "🎯 ตั้งเป้าหมายกับโค้ช", weight: "bold", size: "lg", color: COLORS.text },
            { type: "text", text: "แคลอรี | โปรตีน | คาร์บ | ไขมัน — คำนวณ TDEE ให้อัตโนมัติ", size: "sm", color: COLORS.subtle, wrap: true },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "primary",
              color: COLORS.brand,
              action: { type: "uri", label: "เริ่มตั้งเป้าหมาย", uri: liffUrl(LIFF_IDS.onboarding, "/liff/onboarding") },
            },
          ],
        },
      },
      quickReply: mainQuickReply(),
    },
  ];
}
