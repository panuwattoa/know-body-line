// Create + upload + set the KnowBody rich menu (premium layout).
//
// Run:  node --env-file=.env.local scripts/setup-richmenu.mjs
// Preview only (no LINE calls): node scripts/setup-richmenu.mjs --dry
//
// Generates the menu image on the fly (SVG -> PNG via sharp), so there is no
// binary asset to commit and it always uses your local Thai fonts.

import sharp from "sharp";
import { writeFileSync } from "node:fs";

const DRY = process.argv.includes("--dry");
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!TOKEN && !DRY) {
  console.error("✗ Missing LINE_CHANNEL_ACCESS_TOKEN (run with --env-file=.env.local)");
  process.exit(1);
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://know-body-line.vercel.app").replace(/\/$/, "");
const liffUri = (id, path) => (id ? `https://liff.line.me/${id}` : `${APP_URL}${path}`);

const W = 2500;
const H = 1686;

// ---- palette ----
const CREAM = "#FFFBF2";
const INK = "#2c2c2c";
const SUB = "#9a9a9a";
const ICON = "#5a9e2e";
const ICON_BG = "#eaf6df";

// ---- layout geometry ----
const P = 44;
const G = 28;
const contentW = W - P * 2;
const heroW = 1254;
const rightX = P + heroW + G;
const rightW = contentW - heroW - G;
const topH = 858;
const rightCardH = (topH - G) / 2;
const bottomY = P + topH + G;
const bottomH = H - bottomY - P;
const bw = (contentW - G * 3) / 4;
const bx = (i) => P + i * (bw + G);

const FONT = 'font-family="Noto Sans Thai, Thonburi, Sukhumvit Set, sans-serif"';

// ---- regions: geometry + tap action + how to draw ----
const regions = [
  { kind: "hero", x: P, y: P, w: heroW, h: topH, title: "จดอาหาร", sub: "แตะเพื่อถ่ายรูป หรือพิมพ์ชื่อเมนู", icon: "camera", action: { type: "camera", label: "ถ่ายรูป" } },
  { kind: "card", x: rightX, y: P, w: rightW, h: rightCardH, title: "ประวัติ", sub: "รายการทั้งหมด", icon: "book", action: { type: "uri", label: "ประวัติ", uri: liffUri(process.env.NEXT_PUBLIC_LIFF_ID_HISTORY, "/liff/history") } },
  { kind: "card", x: rightX, y: P + rightCardH + G, w: rightW, h: rightCardH, title: "รายงาน", sub: "เทรนด์ย้อนหลัง", icon: "chart", action: { type: "uri", label: "รายงาน", uri: liffUri(process.env.NEXT_PUBLIC_LIFF_ID_REPORT, "/liff/report") } },
  { kind: "card", x: bx(0), y: bottomY, w: bw, h: bottomH, title: "ตั้งเป้าหมาย", sub: "โปรไฟล์", icon: "target", action: { type: "uri", label: "ตั้งเป้าหมาย", uri: liffUri(process.env.NEXT_PUBLIC_LIFF_ID_ONBOARDING, "/liff/onboarding") } },
  { kind: "card", x: bx(1), y: bottomY, w: bw, h: bottomH, title: "ตั้งเตือน", sub: "แจ้งเตือน", icon: "bell", action: { type: "uri", label: "ตั้งเตือน", uri: liffUri(process.env.NEXT_PUBLIC_LIFF_ID_REMINDERS, "/liff/reminders") } },
  { kind: "card", x: bx(2), y: bottomY, w: bw, h: bottomH, title: "อัปเดตน้ำหนัก", sub: "บันทึกน้ำหนัก", icon: "scale", action: { type: "message", label: "อัปเดตน้ำหนัก", text: "อัปเดตน้ำหนัก" } },
  { kind: "card", x: bx(3), y: bottomY, w: bw, h: bottomH, title: "กินอะไรดี", sub: "โค้ชแนะนำ", icon: "plate", action: { type: "message", label: "กินอะไรดี", text: "วันนี้กินอะไรดี" } },
];

// ---- icons (cx, cy, s = half-size, col) ----
function icon(name, cx, cy, s, col) {
  const sw = Math.max(6, s * 0.16);
  const st = `stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  switch (name) {
    case "camera":
      return `<rect x="${cx - s * 1.05}" y="${cy - s * 0.45}" width="${s * 2.1}" height="${s * 1.45}" rx="${s * 0.28}" ${st}/>
        <rect x="${cx - s * 0.34}" y="${cy - s * 0.72}" width="${s * 0.68}" height="${s * 0.34}" rx="${s * 0.12}" ${st}/>
        <circle cx="${cx}" cy="${cy + s * 0.3}" r="${s * 0.5}" ${st}/>`;
    case "book":
      return `<path d="M ${cx} ${cy - s * 0.7} C ${cx - s * 0.6} ${cy - s} ${cx - s * 1.05} ${cy - s * 0.7} ${cx - s * 1.05} ${cy - s * 0.55} L ${cx - s * 1.05} ${cy + s * 0.75} C ${cx - s * 1.05} ${cy + s * 0.6} ${cx - s * 0.6} ${cy + s * 0.35} ${cx} ${cy + s * 0.6} Z" ${st}/>
        <path d="M ${cx} ${cy - s * 0.7} C ${cx + s * 0.6} ${cy - s} ${cx + s * 1.05} ${cy - s * 0.7} ${cx + s * 1.05} ${cy - s * 0.55} L ${cx + s * 1.05} ${cy + s * 0.75} C ${cx + s * 1.05} ${cy + s * 0.6} ${cx + s * 0.6} ${cy + s * 0.35} ${cx} ${cy + s * 0.6} Z" ${st}/>`;
    case "chart":
      return `<line x1="${cx - s}" y1="${cy + s * 0.85}" x2="${cx + s}" y2="${cy + s * 0.85}" ${st}/>
        <rect x="${cx - s * 0.85}" y="${cy + s * 0.1}" width="${s * 0.42}" height="${s * 0.75}" rx="${s * 0.1}" fill="${col}"/>
        <rect x="${cx - s * 0.2}" y="${cy - s * 0.55}" width="${s * 0.42}" height="${s * 1.4}" rx="${s * 0.1}" fill="${col}"/>
        <rect x="${cx + s * 0.45}" y="${cy - s * 0.15}" width="${s * 0.42}" height="${s * 1.0}" rx="${s * 0.1}" fill="${col}"/>`;
    case "target":
      return `<circle cx="${cx}" cy="${cy}" r="${s}" ${st}/><circle cx="${cx}" cy="${cy}" r="${s * 0.6}" ${st}/><circle cx="${cx}" cy="${cy}" r="${s * 0.22}" fill="${col}"/>`;
    case "bell":
      return `<path d="M ${cx} ${cy - s * 0.95} C ${cx + s * 0.78} ${cy - s * 0.95} ${cx + s * 0.7} ${cy + s * 0.05} ${cx + s * 0.95} ${cy + s * 0.5} L ${cx - s * 0.95} ${cy + s * 0.5} C ${cx - s * 0.7} ${cy + s * 0.05} ${cx - s * 0.78} ${cy - s * 0.95} ${cx} ${cy - s * 0.95} Z" ${st}/>
        <path d="M ${cx - s * 0.25} ${cy + s * 0.65} a ${s * 0.25} ${s * 0.25} 0 0 0 ${s * 0.5} 0" ${st}/>
        <line x1="${cx}" y1="${cy - s * 1.15}" x2="${cx}" y2="${cy - s * 0.95}" ${st}/>`;
    case "scale":
      return `<rect x="${cx - s}" y="${cy - s}" width="${s * 2}" height="${s * 2}" rx="${s * 0.32}" ${st}/>
        <path d="M ${cx - s * 0.5} ${cy - s * 0.35} a ${s * 0.5} ${s * 0.5} 0 1 0 ${s} 0" ${st}/>
        <line x1="${cx}" y1="${cy + s * 0.15}" x2="${cx + s * 0.3}" y2="${cy - s * 0.35}" ${st}/>`;
    case "plate":
      return `<circle cx="${cx}" cy="${cy}" r="${s * 0.62}" ${st}/>
        <line x1="${cx - s * 1.05}" y1="${cy - s * 0.8}" x2="${cx - s * 1.05}" y2="${cy + s * 0.85}" ${st}/>
        <line x1="${cx - s * 1.25}" y1="${cy - s * 0.8}" x2="${cx - s * 1.25}" y2="${cy - s * 0.25}" ${st}/>
        <line x1="${cx - s * 0.85}" y1="${cy - s * 0.8}" x2="${cx - s * 0.85}" y2="${cy - s * 0.25}" ${st}/>
        <line x1="${cx + s * 1.1}" y1="${cy - s * 0.8}" x2="${cx + s * 1.1}" y2="${cy + s * 0.85}" ${st}/>
        <path d="M ${cx + s * 1.1} ${cy - s * 0.8} q ${s * 0.3} ${s * 0.25} 0 ${s * 0.6}" ${st}/>`;
    default:
      return "";
  }
}

function heroSvg(r) {
  const iy = r.y + r.h * 0.5;
  const ix = r.x + r.w * 0.76;
  const tx = r.x + 84;
  return `
    <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="48" fill="url(#hero)"/>
    <circle cx="${ix}" cy="${iy}" r="${r.h * 0.32}" fill="#ffffff" opacity="0.14"/>
    ${icon(r.icon, ix, iy, r.h * 0.2, "#ffffff")}
    <text x="${tx}" y="${r.y + r.h * 0.46}" ${FONT} font-size="132" font-weight="800" fill="#ffffff">${r.title}</text>
    <text x="${tx}" y="${r.y + r.h * 0.46 + 74}" ${FONT} font-size="46" fill="#ffffff" opacity="0.92">${r.sub}</text>
    <g>
      <rect x="${tx}" y="${r.y + r.h * 0.66}" width="330" height="86" rx="43" fill="#ffffff"/>
      <path d="M ${tx + 52} ${r.y + r.h * 0.66 + 30} l 34 22 l -34 22 Z" fill="${ICON}"/>
      <text x="${tx + 200}" y="${r.y + r.h * 0.66 + 56}" ${FONT} font-size="42" font-weight="700" fill="${ICON}" text-anchor="middle">แตะเริ่มเลย</text>
    </g>`;
}

function cardSvg(r) {
  const cx = r.x + r.w / 2;
  const iconCy = r.y + r.h * 0.36;
  const iconR = Math.min(78, r.h * 0.2);
  const circleR = iconR * 1.35;
  const titleY = r.y + r.h * 0.68;
  const titleSize = r.h < 500 ? 58 : 60;
  return `
    <rect x="${r.x}" y="${r.y + 8}" width="${r.w}" height="${r.h}" rx="40" fill="#000000" opacity="0.06"/>
    <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="40" fill="${CREAM}"/>
    <circle cx="${cx}" cy="${iconCy}" r="${circleR}" fill="${ICON_BG}"/>
    ${icon(r.icon, cx, iconCy, iconR * 0.78, ICON)}
    <text x="${cx}" y="${titleY}" ${FONT} font-size="${titleSize}" font-weight="800" fill="${INK}" text-anchor="middle">${r.title}</text>
    <text x="${cx}" y="${titleY + 52}" ${FONT} font-size="36" fill="${SUB}" text-anchor="middle">${r.sub}</text>`;
}

function buildSvg() {
  const body = regions.map((r) => (r.kind === "hero" ? heroSvg(r) : cardSvg(r))).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8ccf58"/><stop offset="1" stop-color="#6ab838"/>
      </linearGradient>
      <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#63b636"/><stop offset="1" stop-color="#4a8f26"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${body}
  </svg>`;
}

function buildAreas() {
  return regions.map((r) => ({
    bounds: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h) },
    action: r.action,
  }));
}

async function api(path, opts = {}) {
  return fetch(`https://api.line.me${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(opts.headers || {}) },
  });
}

async function main() {
  console.log("→ generating rich menu image…");
  const png = await sharp(Buffer.from(buildSvg())).png().toBuffer();
  console.log(`  image ${W}×${H}, ${(png.length / 1024).toFixed(0)} KB`);

  if (DRY) {
    writeFileSync("richmenu-preview.png", png);
    console.log("✓ dry run — wrote richmenu-preview.png (no LINE API calls)");
    return;
  }

  const listRes = await api("/v2/bot/richmenu/list");
  if (listRes.ok) {
    const { richmenus = [] } = await listRes.json();
    for (const rm of richmenus) {
      await api(`/v2/bot/richmenu/${rm.richMenuId}`, { method: "DELETE" });
      console.log(`  deleted old rich menu ${rm.richMenuId}`);
    }
  }

  const createRes = await api("/v2/bot/richmenu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      size: { width: W, height: H },
      selected: true,
      name: "KnowBody Main",
      chatBarText: "เมนู",
      areas: buildAreas(),
    }),
  });
  if (!createRes.ok) {
    console.error("✗ create failed", createRes.status, await createRes.text());
    process.exit(1);
  }
  const { richMenuId } = await createRes.json();
  console.log(`✓ created ${richMenuId}`);

  const upRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "image/png" },
    body: png,
  });
  if (!upRes.ok) {
    console.error("✗ image upload failed", upRes.status, await upRes.text());
    process.exit(1);
  }
  console.log("✓ image uploaded");

  const defRes = await api(`/v2/bot/user/all/richmenu/${richMenuId}`, { method: "POST" });
  if (!defRes.ok) {
    console.error("✗ set default failed", defRes.status, await defRes.text());
    process.exit(1);
  }
  console.log("✓ set as default rich menu — done! 🎉");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
