// Create + upload + set the KnowBody rich menu.
//
// Run:  node --env-file=.env.local scripts/setup-richmenu.mjs
//
// Requires in env: LINE_CHANNEL_ACCESS_TOKEN and (ideally) the LIFF ids.
// Generates the menu image on the fly (no binary asset to commit).

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
const GREEN = "#7BC043";
const GREEN_DARK = "#5a9e2e";

// 3 columns × 2 rows
const XS = [0, 833, 1666];
const CW = [833, 833, 834];
const YS = [0, 843];
const CH = [843, 843];

// cell definitions in row-major order
const CELLS = [
  { label: "ถ่ายรูปอาหาร", icon: "camera", action: { type: "camera", label: "ถ่ายรูป" } },
  { label: "กินอะไรดี", icon: "plate", action: { type: "message", label: "กินอะไรดี", text: "วันนี้กินอะไรดี" } },
  { label: "ออกกำลังกาย", icon: "dumbbell", action: { type: "message", label: "ออกกำลังกาย", text: "วันนี้ออกกำลังกายอะไรดี" } },
  { label: "ตั้งเป้าหมาย", icon: "target", action: { type: "uri", label: "ตั้งเป้าหมาย", uri: liffUri(process.env.NEXT_PUBLIC_LIFF_ID_ONBOARDING, "/liff/onboarding") } },
  { label: "ประวัติ", icon: "clipboard", action: { type: "uri", label: "ประวัติ", uri: liffUri(process.env.NEXT_PUBLIC_LIFF_ID_HISTORY, "/liff/history") } },
  { label: "รายงาน", icon: "chart", action: { type: "uri", label: "รายงาน", uri: liffUri(process.env.NEXT_PUBLIC_LIFF_ID_REPORT, "/liff/report") } },
];

// ---- SVG icon builders (white, centered on cx,cy) ----
const S = 'stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"';
const icons = {
  camera: (x, y) => `
    <rect x="${x - 95}" y="${y - 40}" width="190" height="130" rx="22" ${S}/>
    <rect x="${x - 32}" y="${y - 66}" width="64" height="30" rx="10" ${S}/>
    <circle cx="${x}" cy="${y + 28}" r="42" ${S}/>`,
  plate: (x, y) => `
    <circle cx="${x}" cy="${y}" r="66" ${S}/>
    <line x1="${x - 120}" y1="${y - 72}" x2="${x - 120}" y2="${y + 74}" ${S}/>
    <line x1="${x - 136}" y1="${y - 72}" x2="${x - 136}" y2="${y - 28}" ${S}/>
    <line x1="${x - 104}" y1="${y - 72}" x2="${x - 104}" y2="${y - 28}" ${S}/>
    <line x1="${x + 122}" y1="${y - 72}" x2="${x + 122}" y2="${y + 74}" ${S}/>
    <path d="M ${x + 122} ${y - 72} q 26 22 0 52" ${S}/>`,
  dumbbell: (x, y) => `
    <rect x="${x - 78}" y="${y - 16}" width="156" height="32" rx="8" fill="#fff"/>
    <rect x="${x - 122}" y="${y - 52}" width="44" height="104" rx="14" fill="#fff"/>
    <rect x="${x + 78}" y="${y - 52}" width="44" height="104" rx="14" fill="#fff"/>`,
  target: (x, y) => `
    <circle cx="${x}" cy="${y}" r="86" ${S}/>
    <circle cx="${x}" cy="${y}" r="54" ${S}/>
    <circle cx="${x}" cy="${y}" r="22" fill="#fff"/>`,
  clipboard: (x, y) => `
    <rect x="${x - 72}" y="${y - 92}" width="144" height="184" rx="18" ${S}/>
    <rect x="${x - 34}" y="${y - 110}" width="68" height="38" rx="10" fill="#fff"/>
    <line x1="${x - 40}" y1="${y - 20}" x2="${x + 40}" y2="${y - 20}" ${S}/>
    <line x1="${x - 40}" y1="${y + 20}" x2="${x + 40}" y2="${y + 20}" ${S}/>
    <line x1="${x - 40}" y1="${y + 60}" x2="${x + 10}" y2="${y + 60}" ${S}/>`,
  chart: (x, y) => {
    const base = y + 80;
    const bar = (bx, h) => `<rect x="${bx}" y="${base - h}" width="46" height="${h}" rx="8" fill="#fff"/>`;
    return `${bar(x - 78, 90)}${bar(x - 22, 150)}${bar(x + 34, 116)}
      <line x1="${x - 100}" y1="${base + 10}" x2="${x + 100}" y2="${base + 10}" ${S}/>`;
  },
};

function buildSvg() {
  let cells = "";
  let i = 0;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const cell = CELLS[i++];
      const x = XS[c];
      const y = YS[r];
      const cx = x + CW[c] / 2;
      const iconY = y + CH[r] / 2 - 60;
      const bg = (r + c) % 2 === 0 ? GREEN : GREEN_DARK;
      cells += `
        <g>
          <rect x="${x}" y="${y}" width="${CW[c]}" height="${CH[r]}" fill="${bg}"/>
          ${icons[cell.icon](cx, iconY)}
          <text x="${cx}" y="${y + CH[r] / 2 + 150}" text-anchor="middle"
            font-family="Noto Sans Thai, Thonburi, Sukhumvit Set, sans-serif"
            font-size="80" font-weight="700" fill="#ffffff">${cell.label}</text>
        </g>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#ffffff"/>
    ${cells}
    <line x1="833" y1="0" x2="833" y2="${H}" stroke="#ffffff" stroke-width="6"/>
    <line x1="1666" y1="0" x2="1666" y2="${H}" stroke="#ffffff" stroke-width="6"/>
    <line x1="0" y1="843" x2="${W}" y2="843" stroke="#ffffff" stroke-width="6"/>
  </svg>`;
}

function buildAreas() {
  const areas = [];
  let i = 0;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      areas.push({
        bounds: { x: XS[c], y: YS[r], width: CW[c], height: CH[r] },
        action: CELLS[i++].action,
      });
    }
  }
  return areas;
}

async function api(path, opts = {}) {
  const res = await fetch(`https://api.line.me${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(opts.headers || {}) },
  });
  return res;
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

  // 1) Clean up old rich menus so re-running doesn't pile up duplicates.
  const listRes = await api("/v2/bot/richmenu/list");
  if (listRes.ok) {
    const { richmenus = [] } = await listRes.json();
    for (const rm of richmenus) {
      await api(`/v2/bot/richmenu/${rm.richMenuId}`, { method: "DELETE" });
      console.log(`  deleted old rich menu ${rm.richMenuId}`);
    }
  }

  // 2) Create the rich menu object.
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

  // 3) Upload the image (note: api-data host).
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

  // 4) Set as default for all users.
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
