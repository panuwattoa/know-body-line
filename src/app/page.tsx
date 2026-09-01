import { BRAND } from "@/lib/config";

const ADD_FRIEND_URL = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL || "#";

const AUDIENCE = [
  { emoji: "🔥", text: "ลดน้ำหนัก" },
  { emoji: "💪", text: "สร้างกล้าม" },
  { emoji: "🥗", text: "กินคลีน" },
  { emoji: "❤️", text: "สุขภาพดี" },
];

const FEATURES = [
  { icon: "📸", title: "AI อ่านรูปอาหารไทย", desc: "รู้จักเมนูไทยมากกว่า 1,000 เมนู ตั้งแต่ข้าวมันไก่ยันส้มตำ ประเมินปริมาณจากรูปได้ค่อนข้างแม่น" },
  { icon: "🏷️", title: "อ่านฉลากโภชนาการ", desc: "ถ่ายซองผลิตภัณฑ์ อ่านค่าพลังงาน โปรตีน คาร์บ ไขมัน โซเดียม น้ำตาล ให้ครบ" },
  { icon: "✏️", title: "แก้ไขได้ทุกอย่าง", desc: "หลังประเมินเสร็จ ปรับปริมาณ เพิ่ม–ลดส่วนประกอบเองได้ ก่อนบันทึกมื้อ" },
  { icon: "🧂", title: "วัดโซเดียม / น้ำตาล", desc: "เตือนเรื่องโซเดียมและน้ำตาลเกินลิมิต ก่อนไตจะทำงานหนักเกินไป" },
  { icon: "📊", title: "รายงานรายวัน / สัปดาห์", desc: "ดูเทรนด์การกิน กราฟเข้าใจง่าย รู้ว่าวันไหนดี วันไหนพลาด" },
  { icon: "🎯", title: "ตั้งเป้าส่วนตัว", desc: "คำนวณ TDEE อัตโนมัติจากน้ำหนัก ส่วนสูง อายุ และเป้าหมายที่ตั้ง" },
  { icon: "⚖️", title: "ติดตามน้ำหนัก", desc: "บันทึกน้ำหนักประจำวัน ดูกราฟเทรนด์ว่าจะถึงเป้าเมื่อไหร่" },
  { icon: "🏋️", title: "ออกแบบโปรแกรมออกกำลังกาย", desc: "ถามได้ว่าวันนี้ควรเล่นอะไร อิงจากแผนรายสัปดาห์ ปรับตามน้ำหนักและเป้าหมาย" },
  { icon: "⏰", title: "ตั้งเตือนอัตโนมัติ", desc: "เตือนให้จดมื้ออาหาร เตือนไปออกกำลังกาย ยิงข้อความถึงในไลน์" },
];

export default function Home() {
  return (
    <main className="flex-1 bg-white text-[#1a1a1a]">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#eaf6df] to-white px-6 pt-16 pb-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-4 py-1 text-sm font-semibold text-brand-dark">
            🤖 AI โค้ชโภชนาการในไลน์
          </div>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
            {BRAND}
            <span className="block text-brand-dark">มากกว่าการจดแคล</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
            ถ่ายรูปจานเดียว บอกพลังงาน โปรตีน คาร์บ ไขมัน ครบหมด พร้อมคำแนะนำ
            เข้าใจอาหารไทย ถ่ายรูปหรือพิมพ์ชื่อเมนูก็ได้ แม้แต่ฉลากโภชนาการก็อ่านได้
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {AUDIENCE.map((a) => (
              <span key={a.text} className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-gray-100">
                {a.emoji} {a.text}
              </span>
            ))}
          </div>

          <a
            href={ADD_FRIEND_URL}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#06C755] px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:brightness-105"
          >
            <span className="text-2xl">＋</span> เพิ่มเพื่อนใน LINE
          </a>
          <p className="mt-3 text-sm text-gray-400">เริ่มฟรี · แค่ถ่ายรูปอาหาร แล้วปล่อยที่เหลือให้โค้ช</p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold">ทำอะไรได้บ้าง</h2>
          <p className="mt-2 text-center text-gray-500">เหมือนมีเทรนเนอร์ส่วนตัวที่จำข้อมูลคุณได้ อยู่ในไลน์</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl bg-[#f7f9f4] p-6 ring-1 ring-gray-100">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="bg-[#eaf6df] px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold">ใช้ง่ายใน 3 ขั้น</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { n: "1", t: "ตั้งเป้าหมาย", d: "บอกน้ำหนัก ส่วนสูง เป้าหมาย โค้ชคำนวณ TDEE ให้" },
              { n: "2", t: "ถ่ายรูป / พิมพ์เมนู", d: "ได้ทั้ง 2 แบบ โค้ชประเมินแคลให้ทันที" },
              { n: "3", t: "ดูสรุป & ปรับตัว", d: "สรุปภาพรวมทั้งวัน + รายงานเทรนด์ + คำแนะนำ" },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-3 font-bold">{s.t}</h3>
                <p className="mt-1 text-sm text-gray-600">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a
              href={ADD_FRIEND_URL}
              className="inline-flex items-center gap-2 rounded-full bg-[#06C755] px-8 py-4 text-lg font-bold text-white shadow-lg"
            >
              <span className="text-2xl">＋</span> เริ่มเลย เพิ่มเพื่อน {BRAND}
            </a>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-sm text-gray-400">
        © {BRAND} · โค้ชโภชนาการอาหารไทยในไลน์
      </footer>
    </main>
  );
}
