# KnowBody — คู่มือติดตั้งและ Deploy

คู่มือทีละขั้นตอน ตั้งแต่ศูนย์จนบอทใช้งานได้จริงบน production
มี 4 บริการที่ต้องเตรียม: **Supabase**, **Google AI Studio**, **LINE Messaging API**, **LINE LIFF**
แล้วค่อย deploy ขึ้น **Vercel**

> เวลาโดยประมาณ: 30–45 นาที (ส่วนใหญ่หมดไปกับการสร้าง channel/LIFF ใน LINE)

---

## 0. ภาพรวม env ทั้งหมด

คัดลอกไฟล์ก่อน แล้วค่อยเติมค่าทีละส่วนตามหัวข้อด้านล่าง

```bash
cp .env.example .env.local
```

| ตัวแปร | ได้จาก | หัวข้อ |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | โดเมนของแอป (local = http://localhost:3000) | §4, §6 |
| `COACH_NAME` | ตั้งเอง เช่น "โค้ช" (ชื่อ persona) | — |
| `NEXT_PUBLIC_LINE_ADD_FRIEND_URL` | ลิงก์ add friend ของ OA (เช่น https://lin.ee/xxxx) | §3 |
| `LINE_CHANNEL_SECRET` | Messaging API channel → Basic settings | §3 |
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API channel → Messaging API | §3 |
| `LINE_LOGIN_CHANNEL_ID` | LINE Login channel → Basic settings (Channel ID) | §4 |
| `NEXT_PUBLIC_LIFF_ID_ONBOARDING` | LIFF app `/liff/onboarding` | §4 |
| `NEXT_PUBLIC_LIFF_ID_HISTORY` | LIFF app `/liff/history` | §4 |
| `NEXT_PUBLIC_LIFF_ID_REPORT` | LIFF app `/liff/report` | §4 |
| `NEXT_PUBLIC_LIFF_ID_PROFILE` | LIFF app `/liff/edit` | §4 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio | §2 |
| `GEMINI_MODEL` | ค่า default `gemini-2.5-flash` | §2 |
| `SUPABASE_URL` | Supabase → Settings → API | §1 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role) | §1 |
| `CRON_SECRET` | สุ่มเอง (ใช้ตอน deploy) | §6 |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` และ `LINE_CHANNEL_ACCESS_TOKEN` เป็นความลับ ห้าม commit / ห้ามใช้ฝั่ง client

---

## 1. Supabase (ฐานข้อมูล + เก็บรูป)

1. ไปที่ https://supabase.com → **New project** (เลือก region ใกล้ไทย เช่น Singapore)
2. เมื่อโปรเจกต์พร้อม → เมนู **SQL Editor** → **New query** → วางเนื้อหาไฟล์
   `supabase/migrations/0001_init.sql` ทั้งหมด → **Run**
   (จะสร้างตาราง users, profiles, meals, meal_items, weight_logs, workout_plans,
   reminders, chat_states + เปิด RLS)
3. เมนู **Storage** → **New bucket** → ชื่อ **`meal-photos`** → ติ๊ก **Public bucket** → Create
4. เมนู **Settings → API** → คัดลอก:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret → `SUPABASE_SERVICE_ROLE_KEY`

ตรวจสอบ: ใน Table editor ควรเห็นตารางครบ 8 ตาราง

---

## 2. Google AI Studio (Gemini)

1. ไปที่ https://aistudio.google.com/apikey → **Create API key**
2. คัดลอกคีย์ → `GOOGLE_GENERATIVE_AI_API_KEY`
3. ปล่อย `GEMINI_MODEL=gemini-2.5-flash` ไว้ (เร็ว + วิเคราะห์รูปได้ดี)
   ถ้าต้องการความแม่นสูงขึ้นเปลี่ยนเป็น `gemini-2.5-pro` ได้

---

## 3. LINE — Messaging API channel (ตัวบอท)

1. ไปที่ https://developers.line.biz/console/ → สร้าง **Provider** (ถ้ายังไม่มี)
2. **Create a new channel → Messaging API**
3. แท็บ **Basic settings**:
   - คัดลอก **Channel secret** → `LINE_CHANNEL_SECRET`
4. แท็บ **Messaging API**:
   - **Channel access token (long-lived)** → **Issue** → คัดลอก → `LINE_CHANNEL_ACCESS_TOKEN`
   - **Webhook URL** = `https://<โดเมนของคุณ>/api/line/webhook`
     (ยังไม่มีโดเมน? ใส่ทีหลังหลัง deploy §6 หรือใช้ ngrok §5)
   - เปิด **Use webhook = ON**
5. ไปที่ **LINE Official Account Manager** (https://manager.line.biz) → ตั้งค่าของ OA นี้:
   - **Response settings** → ปิด **Auto-reply messages** และ **Greeting messages**
     (ไม่งั้นจะชนกับบอท)
   - เปิด **Webhooks = ON**
6. เอา **Add friend** link ของ OA (เมนู Gain friends / QR) → `NEXT_PUBLIC_LINE_ADD_FRIEND_URL`

---

## 4. LINE — LIFF (หน้า mini-app: onboarding / ประวัติ / รายงาน / แก้ไข)

LIFF ต้องผูกกับ **LINE Login channel** (คนละตัวกับ Messaging API)

1. ใน Provider เดิม → **Create a new channel → LINE Login**
2. แท็บ **Basic settings** → คัดลอก **Channel ID** → `LINE_LOGIN_CHANNEL_ID`
3. แท็บ **LIFF** → **Add** สร้าง 4 ตัว (ทั้งหมด **Size: Full**, **Scopes: `profile`, `openid`**):

   | Endpoint URL | เก็บ LIFF ID ไปที่ |
   | --- | --- |
   | `https://<โดเมน>/liff/onboarding` | `NEXT_PUBLIC_LIFF_ID_ONBOARDING` |
   | `https://<โดเมน>/liff/history` | `NEXT_PUBLIC_LIFF_ID_HISTORY` |
   | `https://<โดเมน>/liff/report` | `NEXT_PUBLIC_LIFF_ID_REPORT` |
   | `https://<โดเมน>/liff/edit` | `NEXT_PUBLIC_LIFF_ID_PROFILE` |

   > `<โดเมน>` = ค่าเดียวกับ `NEXT_PUBLIC_APP_URL` (ตอน dev ใช้ ngrok, ตอน prod ใช้โดเมน Vercel)
   > แต่ละ LIFF จะได้ ID หน้าตา `1234567890-abcdEFGh` เอาเฉพาะส่วนนั้นไปใส่ env

4. (แนะนำ) เชื่อม LINE Login channel นี้เข้ากับ OA เดียวกัน ที่ **Basic settings → Linked LINE Official Account**

---

## 5. รันในเครื่อง (Local dev)

```bash
npm install          # ครั้งแรกเท่านั้น
npm run dev          # เปิด http://localhost:3000
```

ให้ LINE เข้าถึง webhook ได้ด้วย tunnel:

```bash
npx ngrok http 3000
# เอา URL https://xxxx.ngrok-free.app ไป:
#   - ตั้ง NEXT_PUBLIC_APP_URL ใน .env.local
#   - ตั้ง LIFF endpoint ทั้ง 4 (§4)
#   - ตั้ง Webhook URL = https://xxxx.ngrok-free.app/api/line/webhook (§3)
# แล้วรีสตาร์ท npm run dev
```

ทดสอบ: แอดเพื่อน OA → ควรได้ข้อความต้อนรับ → กดตั้งเป้าหมาย → ถ่ายรูปอาหาร → ได้การ์ดแคล

> หมายเหตุ: cron ไม่ทำงานตอน local (เป็นฟีเจอร์ของ Vercel) — ทดสอบ reminder ด้วยการยิงเอง:
> `curl http://localhost:3000/api/cron/reminders` (ตอน local ไม่ได้ตั้ง `CRON_SECRET` จะเรียกได้เลย)

---

## 6. Deploy ขึ้น Vercel

### 6.1 ครั้งแรก

```bash
npm i -g vercel        # ถ้ายังไม่มี
vercel login
vercel                 # ทำตาม prompt เพื่อ link/สร้างโปรเจกต์ (preview)
```

### 6.2 ใส่ Environment Variables

Vercel → โปรเจกต์ → **Settings → Environment Variables** ใส่ครบทุกตัวจากตาราง §0
(เลือก scope **Production** และ **Preview** ตามต้องการ) รวมถึง:

- `NEXT_PUBLIC_APP_URL` = โดเมน production เช่น `https://knowbody.vercel.app`
- `CRON_SECRET` = สุ่มค่า เช่น `openssl rand -hex 32`

จากนั้น deploy production:

```bash
vercel --prod
```

### 6.3 ชี้ URL กลับไปที่ LINE (สำคัญ!)

หลังได้โดเมน production แล้ว กลับไปแก้:
- **Messaging API → Webhook URL** = `https://<โดเมน prod>/api/line/webhook`
- **LIFF endpoint ทั้ง 4** ให้ชี้ `https://<โดเมน prod>/liff/...`
- ถ้าเปลี่ยนโดเมน อย่าลืมอัปเดต `NEXT_PUBLIC_APP_URL` แล้ว redeploy

### 6.4 Cron

`vercel.json` ตั้ง cron `/api/cron/reminders` ไว้ทุก 15 นาทีอยู่แล้ว
Vercel จะแนบ `Authorization: Bearer $CRON_SECRET` มาให้อัตโนมัติ — route ตรวจให้แล้ว

---

## 7. ตรวจความเรียบร้อย (Checklist)

- [ ] SQL รันแล้ว เห็นตารางครบใน Supabase
- [ ] bucket `meal-photos` เป็น Public
- [ ] Messaging API: Webhook = ON, ปุ่ม **Verify** ใน console ขึ้นเขียว (Success)
- [ ] OA ปิด auto-reply / greeting
- [ ] LIFF 4 ตัว endpoint ถูกต้อง, scope มี `profile` + `openid`
- [ ] env ครบทั้งใน Vercel (Production)
- [ ] แอดเพื่อน → ได้ข้อความต้อนรับ
- [ ] ตั้งเป้าหมาย (LIFF) → ได้การ์ด "เป้าหมายรายวัน" กลับเข้าแชท
- [ ] ถ่ายรูป/พิมพ์เมนู → การ์ดแคล → กด "จดมื้อนี้" → การ์ด "ภาพรวมวันนี้"
- [ ] เปิดประวัติ/รายงานจาก LIFF ได้

---

## 8. Troubleshooting

| อาการ | สาเหตุที่พบบ่อย |
| --- | --- |
| Webhook Verify ไม่ผ่าน / บอทเงียบ | `LINE_CHANNEL_SECRET` ผิด, ยังไม่ได้ redeploy, Webhook URL พิมพ์ผิด, หรือ OA ยังเปิด auto-reply |
| ตอบ "signature ไม่ถูกต้อง" (401) | `LINE_CHANNEL_SECRET` ไม่ตรงกับ channel |
| LIFF ขึ้นจอขาว / login วน | LIFF ID ผิด, endpoint ไม่ตรงโดเมน, หรือ scope ไม่มี `openid`/`profile` |
| LIFF เรียก API แล้ว 401 | `LINE_LOGIN_CHANNEL_ID` ไม่ตรงกับ channel ที่สร้าง LIFF |
| วิเคราะห์รูปแล้ว error | `GOOGLE_GENERATIVE_AI_API_KEY` หมดสิทธิ์/ผิด หรือรูปใหญ่เกิน |
| รูปอาหารไม่ขึ้นในประวัติ | bucket `meal-photos` ไม่ได้ตั้ง Public |
| reminder ไม่ยิง | ดู Vercel → Deployments → Functions logs ของ `/api/cron/reminders`; ตรวจ `CRON_SECRET` |

ดู log ฝั่ง server: **Vercel → Project → Logs** (หรือ `vercel logs <deployment-url>`)

---

## 9. หลัง deploy: สิ่งที่ควรทำต่อ (ไม่บังคับ)

- ทำ **Rich menu** ใน OA Manager ผูกปุ่ม: ประวัติ / รายงาน / ตั้งเป้าหมาย / อัปเดตน้ำหนัก
  (ชี้ไปที่ LIFF url `https://liff.line.me/<liffId>`)
- ผูก **custom domain** ใน Vercel แล้วอัปเดต `NEXT_PUBLIC_APP_URL` + LIFF endpoints
- ถ้าทราฟฟิกสูง: ย้ายงานหนักใน webhook ไป queue แล้วตอบด้วย push (ดูหมายเหตุใน README)
