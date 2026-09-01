# KnowBody — AI โค้ชโภชนาการในไลน์ 🥗

โค้ชโภชนาการ + เทรนเนอร์ส่วนตัวบน LINE ที่เข้าใจอาหารไทย ถ่ายรูปจานเดียว
รู้พลังงาน / โปรตีน / คาร์บ / ไขมัน / โซเดียม / น้ำตาล ครบ พร้อมคำแนะนำ
สรุปภาพรวมทั้งวัน ประวัติมื้ออาหาร รายงานเทรนด์ ตั้งเป้าหมาย TDEE ติดตามน้ำหนัก
ออกแบบโปรแกรมออกกำลังกาย และตั้งเตือนอัตโนมัติ

> **ชื่อโค้ช ปรับได้** — ตั้งค่าที่ `COACH_NAME` ("พี่ชาด" ในตัวอย่างเป็นเพียง reference
> ไม่ได้ผูกกับโค้ดใด ๆ)

## Stack

| ส่วน | เทคโนโลยี |
| --- | --- |
| Frontend + API | Next.js 16 (App Router) บน Vercel |
| Chat | LINE Messaging API (webhook, Flex, push) |
| Mini-app UI | LINE LIFF → เรียก Next.js API routes (ตรวจ ID token ฝั่ง server) |
| AI | Google AI Studio (Gemini) ผ่าน Vercel AI SDK — structured output |
| DB + Storage | Supabase (Postgres + Storage, RLS deny-by-default) |
| Scheduler | Vercel Cron → push reminder ผ่าน LINE |

## โครงสร้างโค้ด

```
src/
  app/
    page.tsx                     หน้าบ้าน (landing + Add friend)
    api/line/webhook/route.ts    LINE webhook (ภาพ/ข้อความ/postback)
    api/liff/{history,report,profile,weight,meal}/route.ts
    api/cron/reminders/route.ts  Vercel Cron
    liff/{onboarding,history,report,edit}/page.tsx   LIFF views
  lib/
    ai/         gemini.ts, prompts.ts   วิเคราะห์อาหาร + persona โค้ช
    line/       client.ts, verify.ts, flex.ts, liff-auth.ts, types.ts
    domain/     nutrition.ts (TDEE), repo.ts, context.ts, time.ts (Asia/Bangkok)
    supabase/   client.ts (service role), storage.ts, types.ts
    config.ts   แบรนด์ + ชื่อโค้ช + LIFF ids + สี
  components/charts.tsx           Ring / LineChart / ProgressBar (SVG, ไม่มี dep เพิ่ม)
supabase/migrations/0001_init.sql  schema
vercel.json                        cron ทุก 15 นาที
```

## ตั้งค่า (Setup)

### 1) Supabase
1. สร้างโปรเจกต์ → รัน `supabase/migrations/0001_init.sql` ใน SQL editor
2. Storage → สร้าง bucket **`meal-photos`** แบบ **Public**
3. คัดลอก `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` (Settings → API)

### 2) Google AI Studio
1. สร้าง API key ที่ https://aistudio.google.com/apikey
2. ตั้ง `GOOGLE_GENERATIVE_AI_API_KEY` (ค่าเริ่มต้นโมเดล `gemini-2.5-flash`)

### 3) LINE — Messaging API channel
1. LINE Developers Console → Provider → สร้าง **Messaging API channel**
2. เก็บ **Channel secret** → `LINE_CHANNEL_SECRET`
3. ออก **Channel access token (long-lived)** → `LINE_CHANNEL_ACCESS_TOKEN`
4. Webhook URL = `https://<domain>/api/line/webhook` แล้วเปิด **Use webhook**
5. ปิด auto-reply / greeting message ใน LINE Official Account Manager

### 4) LINE — LIFF (ใช้ LINE Login channel)
1. สร้าง **LINE Login channel** → เก็บ Channel ID → `LINE_LOGIN_CHANNEL_ID`
2. สร้าง LIFF app 4 ตัว (Size: Full) endpoint ชี้ไปที่:
   - `/liff/onboarding` → `NEXT_PUBLIC_LIFF_ID_ONBOARDING`
   - `/liff/history` → `NEXT_PUBLIC_LIFF_ID_HISTORY`
   - `/liff/report` → `NEXT_PUBLIC_LIFF_ID_REPORT`
   - `/liff/edit` (โปรไฟล์/แก้ไข) → `NEXT_PUBLIC_LIFF_ID_PROFILE`
   - Scopes: `profile`, `openid`
3. Add-friend link ของ OA → `NEXT_PUBLIC_LINE_ADD_FRIEND_URL`

### 5) Rich menu (แนะนำ)
ผูกปุ่มไปที่ LIFF url: ประวัติ / รายงาน / ตั้งเป้าหมาย / อัปเดตน้ำหนัก
(ปุ่มถ่ายรูปใช้ quick reply แบบ `camera` อยู่แล้วในแชท)

## รันในเครื่อง

```bash
cp .env.example .env.local   # เติมค่าต่าง ๆ
npm run dev
# เปิด tunnel ให้ LINE เข้าถึง webhook ได้ เช่น:  ngrok http 3000
# แล้วตั้ง Webhook URL = https://<ngrok>/api/line/webhook
```

## Deploy (Vercel)

```bash
vercel            # หรือเชื่อม GitHub repo
```
- ใส่ env ทั้งหมดใน Project Settings → Environment Variables
- ตั้ง `CRON_SECRET` (Vercel Cron จะแนบมาเป็น `Authorization: Bearer`)
- `vercel.json` ตั้ง cron `/api/cron/reminders` ทุก 15 นาทีให้แล้ว

## Flow การทำงาน

1. **Add friend / follow** → สร้าง user + ส่งข้อความต้อนรับ + ปุ่มตั้งเป้าหมาย (LIFF)
2. **Onboarding (LIFF)** → กรอกน้ำหนัก/ส่วนสูง/เป้าหมาย → คำนวณ TDEE + มาโคร (Mifflin‑St Jeor)
   → บันทึก + push การ์ด "เป้าหมายรายวัน" กลับเข้าแชท + seed reminder เริ่มต้น
3. **ถ่ายรูป / พิมพ์เมนู / ฉลาก** → Gemini วิเคราะห์ → การ์ดผล + ปุ่ม *จดมื้อนี้ / แก้ไข*
4. **จดมื้อนี้ (postback)** → บันทึกลง Supabase → การ์ด "ภาพรวมวันนี้"
5. **แก้ไข (LIFF)** → ปรับปริมาณ/ส่วนประกอบ → คำนวณรวมใหม่
6. **ถามโค้ช** — "วันนี้กินอะไรดี" / "ออกกำลังกายอะไรดี" → ตอบอิงเป้าหมาย + สิ่งที่กินไปแล้ว
7. **น้ำหนัก** — พิมพ์ "น้ำหนัก 74" บันทึก + กราฟเทรนด์
8. **ประวัติ / รายงาน (LIFF)** — รายวัน + เทรนด์ 7/30 วัน + คำวิเคราะห์จากโค้ช
9. **Cron** — ยิงเตือนกินข้าว / ออกกำลังกาย / ชั่งน้ำหนัก ตามเวลา (Asia/Bangkok)

## หมายเหตุด้านสถาปัตยกรรม
- Webhook ตรวจ `x-line-signature` (HMAC‑SHA256) บน raw body เสมอ
- LIFF API ตรวจ LINE **ID token** ฝั่ง server (`/oauth2/v2.1/verify`) — ไม่เชื่อ id ที่ client ส่งมาเอง
- ตอนนี้ webhook ประมวลผลแบบ synchronous แล้ว reply — ถ้าโหลดสูงควรย้ายงานหนักไป
  queue (เช่น Vercel Queues) แล้วตอบด้วย push แทน
- เวลา/ขอบเขตวัน คิดที่ Asia/Bangkok (UTC+7 คงที่)

## TODO / ต่อยอด
- Rich menu JSON + สคริปต์อัปโหลด
- หน้าจัดการ reminder ใน LIFF (ตอนนี้ seed อัตโนมัติหลัง onboarding)
- เก็บ/แสดง workout plan รายสัปดาห์ลงตาราง `workout_plans`
- ระบบสมัครสมาชิก/อัปเกรด (ปุ่ม "อัปเกรด" ในตัวอย่าง)
