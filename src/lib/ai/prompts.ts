import { BRAND, COACH_NAME } from "@/lib/config";

/**
 * Persona for the KnowBody coach. The name is injected from config so the whole
 * personality can be rebranded without editing prompts.
 */
export function personaSystem(): string {
  return `คุณคือ "${COACH_NAME}" โค้ชโภชนาการและเทรนเนอร์ส่วนตัวของแอป ${BRAND}
บุคลิก: เป็นพี่ชายใจดี พูดจาให้กำลังใจ เป็นกันเอง กระชับ ใช้ภาษาไทย แทรกอิโมจิได้บ้างแต่ไม่รก
พูดกับผู้ใช้แบบโค้ชที่จำข้อมูลเขาได้ อ้างอิงเป้าหมายและสิ่งที่เขากินจริง ไม่พูดเวิ่นเว้อ
ห้ามให้คำแนะนำทางการแพทย์ที่อันตราย ถ้าผู้ใช้มีโรคประจำตัวให้แนะนำปรึกษาแพทย์
เชี่ยวชาญอาหารไทยมากกว่า 1,000 เมนู ประเมินปริมาณจากรูปได้แม่นยำ อ่านฉลากโภชนาการได้`;
}

/** Instruction block for the food-analysis structured task. */
export function foodAnalysisInstruction(ctx: string): string {
  return `วิเคราะห์อาหารต่อไปนี้และประเมินคุณค่าทางโภชนาการให้ครบถ้วน

หน้าที่:
1. ระบุว่าอินพุตเป็นอะไร: "food" (จานอาหาร/เมนู), "label" (ฉลากโภชนาการ/ซองผลิตภัณฑ์), หรือ "unknown"
2. ตั้งชื่อเมนูเป็นภาษาไทยให้ถูกต้อง (เช่น ข้าวมันไก่, ส้มตำไทย, เมจิ ไฮโปรตีน รสกาแฟ)
3. เดาประเภทมื้อจากบริบท/เวลา: breakfast, lunch, dinner, snack
4. แยกส่วนประกอบ (items) พร้อมปริมาณโดยประมาณเป็นกรัม และค่าโภชนาการต่อส่วนประกอบ
5. รวมค่าทั้งจาน (total): พลังงาน(kcal), โปรตีน(g), คาร์บ(g), ไขมัน(g), โซเดียม(mg), น้ำตาล(g)
6. ถ้าเป็นฉลาก ให้อ่านค่าจากฉลากตามหน่วยบริโภคที่ระบุ
7. เขียน coach_note สั้นๆ 1-2 ประโยคในบุคลิกโค้ช โยงกับเป้าหมายของผู้ใช้

ประเมินตามหลักโภชนาการอาหารไทยตามความเป็นจริง อย่ากลัวที่จะให้ตัวเลข ค่าที่ให้ควรสมเหตุสมผล
${ctx ? `\nบริบทของผู้ใช้ (เพื่อประเมินปริมาณและเขียนคำแนะนำ):\n${ctx}` : ""}`;
}

/** Build a compact context string describing the user for personalized replies. */
export function userContextBlock(opts: {
  displayName?: string | null;
  goalLabel?: string;
  targets?: {
    kcal?: number | null;
    protein?: number | null;
    carb?: number | null;
    fat?: number | null;
  };
  consumedToday?: {
    kcal: number;
    protein: number;
    carb: number;
    fat: number;
  };
  weightKg?: number | null;
  targetWeightKg?: number | null;
}): string {
  const lines: string[] = [];
  if (opts.displayName) lines.push(`ชื่อ: ${opts.displayName}`);
  if (opts.goalLabel) lines.push(`เป้าหมาย: ${opts.goalLabel}`);
  if (opts.weightKg) lines.push(`น้ำหนักปัจจุบัน: ${opts.weightKg} kg`);
  if (opts.targetWeightKg) lines.push(`น้ำหนักเป้าหมาย: ${opts.targetWeightKg} kg`);
  if (opts.targets) {
    lines.push(
      `เป้าหมายต่อวัน: ${opts.targets.kcal ?? "-"} kcal, โปรตีน ${opts.targets.protein ?? "-"}g, คาร์บ ${opts.targets.carb ?? "-"}g, ไขมัน ${opts.targets.fat ?? "-"}g`,
    );
  }
  if (opts.consumedToday) {
    const c = opts.consumedToday;
    lines.push(
      `กินไปแล้ววันนี้: ${Math.round(c.kcal)} kcal, โปรตีน ${Math.round(c.protein)}g, คาร์บ ${Math.round(c.carb)}g, ไขมัน ${Math.round(c.fat)}g`,
    );
    if (opts.targets?.kcal) {
      lines.push(`เหลือโควตาวันนี้: ~${Math.round(opts.targets.kcal - c.kcal)} kcal`);
    }
  }
  return lines.join("\n");
}
