// Générateur de placeholders SVG élégants pour BEBBA Healthy Food (Bloc 1)
// Produit des illustrations vectorielles légères, une par plat, style "healthy"
import { writeFileSync, mkdirSync } from "fs";

const OUT = "/home/z/my-project/public/products";
mkdirSync(OUT, { recursive: true });

interface Spec {
  file: string;
  from: string; to: string;          // dégradé de fond
  blob: string;                      // couleur blob décoratif
  draw: string;                      // illustration du plat (coordonnées 800x600, assiette centrée 400,300 r=170)
}

const leaves = (x: number, y: number, s: number, color: string, opacity = 0.9) => `
  <g transform="translate(${x},${y}) scale(${s})" fill="${color}" opacity="${opacity}">
    <path d="M0 0 C 18 -26, 52 -30, 66 -14 C 58 12, 22 20, 0 0 Z"/>
    <path d="M14 -6 C 30 -14, 48 -14, 60 -10" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.5"/>
  </g>`;

const plate = `
  <ellipse cx="400" cy="470" rx="200" ry="26" fill="#000000" opacity="0.10"/>
  <circle cx="400" cy="300" r="175" fill="#ffffff"/>
  <circle cx="400" cy="300" r="150" fill="#f7f8f4"/>
  <circle cx="400" cy="300" r="150" fill="none" stroke="#e8ece2" stroke-width="2"/>`;

const specs: Spec[] = [
  {
    file: "bowl-quinoa", from: "#eaf5df", to: "#cfe8b8", blob: "#b6dfa0",
    draw: `
      ${plate}
      <path d="M280 280 a120 78 0 0 0 240 0 Z" fill="#e9dfc8"/>
      <path d="M280 280 a120 78 0 0 0 240 0 Z" fill="none" stroke="#d9c9a5" stroke-width="4"/>
      <ellipse cx="400" cy="280" rx="120" ry="26" fill="#f4ead2"/>
      <circle cx="355" cy="272" r="14" fill="#8db863"/><circle cx="395" cy="266" r="14" fill="#a5c877"/>
      <circle cx="435" cy="274" r="14" fill="#8db863"/><circle cx="375" cy="258" r="12" fill="#c9a86a"/>
      <circle cx="418" cy="256" r="12" fill="#d66f5e"/><circle cx="390" cy="278" r="11" fill="#e0e8c9"/>
      ${leaves(300, 220, 0.9, "#7aa658")}
      ${leaves(470, 230, -0.7, "#7aa658", 0.75)}`,
  },
  {
    file: "salade-saumon", from: "#e3f2ef", to: "#c2e2dc", blob: "#a9d8cf",
    draw: `
      ${plate}
      <path d="M270 285 a130 82 0 0 0 260 0 Z" fill="#eef4e3"/>
      <ellipse cx="400" cy="285" rx="130" ry="28" fill="#dcecc6"/>
      <path d="M320 268 q20 -30 44 -8 q-8 26 -44 8 Z" fill="#f2969a"/>
      <path d="M360 262 q22 -28 46 -6 q-10 26 -46 6 Z" fill="#ef8489"/>
      <path d="M404 264 q22 -28 46 -6 q-10 26 -46 6 Z" fill="#f2969a"/>
      <path d="M300 250 q14 -20 30 -4 q-6 18 -30 4 Z" fill="#8fbf6f"/>
      <path d="M470 252 q14 -20 30 -4 q-6 18 -30 4 Z" fill="#8fbf6f"/>
      <circle cx="445" cy="272" r="9" fill="#5f8f4e"/><circle cx="330" cy="278" r="9" fill="#5f8f4e"/>
      ${leaves(290, 205, 1.0, "#6f9e57")}${leaves(480, 215, -0.8, "#6f9e57", 0.7)}`,
  },
  {
    file: "poke-veggie", from: "#f0f7e0", to: "#d7ecb9", blob: "#c3e3a0",
    draw: `
      ${plate}
      <path d="M275 282 a125 80 0 0 0 250 0 Z" fill="#ffffff"/>
      <ellipse cx="400" cy="282" rx="125" ry="26" fill="#f1ecd8"/>
      <rect x="330" y="252" width="34" height="34" rx="8" fill="#f7e6c4" transform="rotate(8 347 269)"/>
      <rect x="376" y="246" width="34" height="34" rx="8" fill="#f2c9b0" transform="rotate(-6 393 263)"/>
      <rect x="424" y="254" width="34" height="34" rx="8" fill="#e8a2a2" transform="rotate(4 441 271)"/>
      <circle cx="352" cy="240" r="11" fill="#9dc46f"/><circle cx="452" cy="244" r="11" fill="#c9de7c"/>
      <circle cx="400" cy="238" r="10" fill="#f0b64f"/>
      ${leaves(295, 215, 0.9, "#82b35d")}${leaves(475, 222, -0.75, "#82b35d", 0.7)}`,
  },
  {
    file: "poulet-grille", from: "#fdf0e0", to: "#f5d9b4", blob: "#eec9a0",
    draw: `
      ${plate}
      <g transform="rotate(-18 400 300)">
        <rect x="300" y="270" width="150" height="64" rx="32" fill="#d9a35f"/>
        <rect x="300" y="270" width="150" height="64" rx="32" fill="none" stroke="#c48d4a" stroke-width="4"/>
        <circle cx="456" cy="288" r="13" fill="#f7f1e6"/><circle cx="462" cy="308" r="13" fill="#f7f1e6"/>
        <ellipse cx="340" cy="292" rx="26" ry="10" fill="#c48d4a" opacity="0.65"/>
        <ellipse cx="390" cy="308" rx="22" ry="8" fill="#c48d4a" opacity="0.65"/>
      </g>
      <ellipse cx="316" cy="352" rx="42" ry="24" fill="#e7b877"/><ellipse cx="316" cy="346" rx="42" ry="20" fill="#f0c98d"/>
      <ellipse cx="478" cy="345" rx="38" ry="22" fill="#e7b877"/><ellipse cx="478" cy="339" rx="38" ry="18" fill="#f0c98d"/>
      ${leaves(292, 225, 0.9, "#9ab86a")}${leaves(488, 235, -0.7, "#9ab86a", 0.7)}`,
  },
  {
    file: "dorade", from: "#e2f1f2", to: "#bedfe2", blob: "#a4d3d6",
    draw: `
      ${plate}
      <g transform="rotate(-8 400 300)">
        <path d="M300 300 Q 360 252 440 268 Q 480 276 496 262 L 486 300 L 496 338 Q 480 324 440 332 Q 360 348 300 300 Z" fill="#e8b06b"/>
        <path d="M300 300 Q 360 252 440 268 Q 480 276 496 262 L 486 300 L 496 338 Q 480 324 440 332 Q 360 348 300 300 Z" fill="none" stroke="#d19a52" stroke-width="4"/>
        <path d="M330 292 q26 -14 52 -4 M340 306 q26 -12 52 -2" stroke="#c4884a" stroke-width="5" fill="none" stroke-linecap="round"/>
        <circle cx="318" cy="294" r="5" fill="#5b4630"/>
      </g>
      <circle cx="472" cy="352" r="16" fill="#f4d06f"/><circle cx="496" cy="342" r="13" fill="#f4d06f"/>
      ${leaves(300, 218, 0.85, "#6fa08a")}${leaves(486, 226, -0.7, "#6fa08a", 0.7)}`,
  },
  {
    file: "brochettes", from: "#f8e9e2", to: "#eec7b8", blob: "#e3b3a0",
    draw: `
      ${plate}
      <g transform="rotate(-24 400 300)">
        <line x1="296" y1="300" x2="510" y2="300" stroke="#8a6b4f" stroke-width="7" stroke-linecap="round"/>
        <rect x="316" y="272" width="42" height="56" rx="14" fill="#b45f52"/>
        <rect x="374" y="268" width="42" height="64" rx="14" fill="#c16f5f"/>
        <circle cx="444" cy="300" r="22" fill="#e0b15c"/>
        <rect x="336" y="322" width="40" height="40" rx="12" fill="#7fae5e" transform="rotate(90 356 342)" opacity="0"/>
      </g>
      <circle cx="322" cy="358" r="20" fill="#7fae5e"/><circle cx="356" cy="366" r="17" fill="#a9c97c"/>
      ${leaves(296, 232, 0.85, "#b07a5a")}${leaves(490, 240, -0.7, "#b07a5a", 0.65)}`,
  },
  {
    file: "mini-burgers", from: "#fdf2df", to: "#f6ddb6", blob: "#f0d09e",
    draw: `
      ${plate}
      <g>
        <g transform="translate(298,262)">
          <path d="M0 26 a42 30 0 0 1 84 0 Z" fill="#e8b06b"/>
          <rect x="-4" y="26" width="92" height="16" rx="8" fill="#8fae5f"/>
          <rect x="0" y="42" width="84" height="14" rx="7" fill="#d19a52"/>
          <circle cx="24" cy="8" r="3" fill="#fff" opacity="0.8"/><circle cx="46" cy="2" r="3" fill="#fff" opacity="0.8"/><circle cx="64" cy="10" r="3" fill="#fff" opacity="0.8"/>
        </g>
        <g transform="translate(418,262)">
          <path d="M0 26 a42 30 0 0 1 84 0 Z" fill="#e8b06b"/>
          <rect x="-4" y="26" width="92" height="16" rx="8" fill="#8fae5f"/>
          <rect x="0" y="42" width="84" height="14" rx="7" fill="#d19a52"/>
          <circle cx="24" cy="8" r="3" fill="#fff" opacity="0.8"/><circle cx="46" cy="2" r="3" fill="#fff" opacity="0.8"/><circle cx="64" cy="10" r="3" fill="#fff" opacity="0.8"/>
        </g>
      </g>
      <g transform="translate(0,0)">
        <rect x="330" y="348" width="140" height="26" rx="13" fill="#e8875f"/>
        <circle cx="352" cy="361" r="9" fill="#f2a87f"/><circle cx="384" cy="357" r="9" fill="#f2a87f"/><circle cx="418" cy="361" r="9" fill="#f2a87f"/><circle cx="448" cy="357" r="9" fill="#f2a87f"/>
      </g>
      ${leaves(288, 226, 0.9, "#a3bd6a")}${leaves(494, 232, -0.7, "#a3bd6a", 0.7)}`,
  },
  {
    file: "wrap-dinde", from: "#fbf3dd", to: "#f0e2b4", blob: "#e6d49a",
    draw: `
      ${plate}
      <g transform="rotate(-30 400 300)">
        <path d="M300 300 L 470 268 Q 496 262 508 300 Q 496 338 470 332 Z" fill="#f2ddb0"/>
        <path d="M300 300 L 470 268 Q 496 262 508 300 Q 496 338 470 332 Z" fill="none" stroke="#e0c68e" stroke-width="4"/>
        <ellipse cx="410" cy="300" rx="14" ry="10" fill="#8fae5f"/>
        <ellipse cx="446" cy="292" rx="14" ry="10" fill="#e8875f"/>
        <ellipse cx="448" cy="312" rx="14" ry="10" fill="#f4f0e2"/>
      </g>
      ${leaves(296, 236, 0.9, "#c9b36e")}${leaves(486, 240, -0.7, "#c9b36e", 0.65)}`,
  },
  {
    file: "jus-vert", from: "#e9f6e2", to: "#cdebc0", blob: "#b9e0a6",
    draw: `
      ${plate}
      <g>
        <path d="M330 210 L 470 210 L 452 400 Q 448 416 430 416 L 370 416 Q 352 416 348 400 Z" fill="#ffffff"/>
        <path d="M337 258 L 463 258 L 450 398 Q 447 410 434 410 L 366 410 Q 353 410 350 398 Z" fill="#9fd06f"/>
        <path d="M337 258 L 463 258 L 461 278 L 339 278 Z" fill="#b9de8e"/>
        <rect x="452" y="180" width="14" height="120" rx="7" fill="#e8875f" transform="rotate(14 459 240)"/>
        <circle cx="380" cy="300" r="12" fill="#88c25c" opacity="0.7"/><circle cx="415" cy="330" r="9" fill="#88c25c" opacity="0.7"/>
      </g>
      ${leaves(288, 226, 1.1, "#6faf4e")}${leaves(498, 236, -0.85, "#6faf4e", 0.7)}`,
  },
  {
    file: "jus-carotte", from: "#fdeede", to: "#f8d7b4", blob: "#f2c79a",
    draw: `
      ${plate}
      <g>
        <path d="M330 210 L 470 210 L 452 400 Q 448 416 430 416 L 370 416 Q 352 416 348 400 Z" fill="#ffffff"/>
        <path d="M337 258 L 463 258 L 450 398 Q 447 410 434 410 L 366 410 Q 353 410 350 398 Z" fill="#f0a54f"/>
        <path d="M337 258 L 463 258 L 461 278 L 339 278 Z" fill="#f5bd78"/>
        <rect x="452" y="180" width="14" height="120" rx="7" fill="#7fae5e" transform="rotate(14 459 240)"/>
        <circle cx="385" cy="305" r="11" fill="#e8924a" opacity="0.75"/><circle cx="418" cy="332" r="8" fill="#e8924a" opacity="0.75"/>
      </g>
      <g transform="translate(288,230) rotate(-24)">
        <path d="M0 0 C 10 -34, 40 -34, 46 -4 C 34 16, 10 18, 0 0 Z" fill="#e8924a"/>
        <path d="M40 -30 q14 -18 30 -12 M36 -18 q16 -12 30 -4" stroke="#7fae5e" stroke-width="6" fill="none" stroke-linecap="round"/>
      </g>
      ${leaves(490, 240, -0.8, "#c98744", 0.7)}`,
  },
  {
    file: "programme-30j", from: "#e7f2e0", to: "#c9e3ba", blob: "#b2d69c",
    draw: `
      ${plate}
      <g>
        <rect x="308" y="204" width="184" height="192" rx="20" fill="#ffffff" stroke="#dfe7d2" stroke-width="4"/>
        <rect x="308" y="204" width="184" height="52" rx="20" fill="#7fae5e"/>
        <rect x="308" y="236" width="184" height="20" fill="#7fae5e"/>
        <circle cx="352" cy="230" r="8" fill="#ffffff"/><circle cx="448" cy="230" r="8" fill="#ffffff"/>
        <g fill="#dbe8cd">
          <rect x="326" y="272" width="44" height="30" rx="6"/><rect x="378" y="272" width="44" height="30" rx="6"/><rect x="430" y="272" width="44" height="30" rx="6"/>
          <rect x="326" y="312" width="44" height="30" rx="6"/><rect x="378" y="312" width="44" height="30" rx="6"/><rect x="430" y="312" width="44" height="30" rx="6"/>
          <rect x="326" y="352" width="44" height="30" rx="6"/><rect x="378" y="352" width="44" height="30" rx="6"/><rect x="430" y="352" width="44" height="30" rx="6"/>
        </g>
        <rect x="326" y="272" width="44" height="30" rx="6" fill="#8db863"/>
        <rect x="430" y="312" width="44" height="30" rx="6" fill="#8db863"/>
        <rect x="378" y="352" width="44" height="30" rx="6" fill="#8db863"/>
      </g>
      ${leaves(282, 250, 1.0, "#6f9e57")}${leaves(500, 258, -0.8, "#6f9e57", 0.7)}`,
  },
];

for (const s of specs) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${s.from}"/><stop offset="1" stop-color="${s.to}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <circle cx="680" cy="90" r="150" fill="${s.blob}" opacity="0.45"/>
  <circle cx="90" cy="530" r="130" fill="${s.blob}" opacity="0.35"/>
  <circle cx="740" cy="500" r="70" fill="${s.blob}" opacity="0.30"/>
  ${s.draw}
</svg>`;
  writeFileSync(`${OUT}/${s.file}.svg`, svg);
  console.log(`✓ ${s.file}.svg`);
}
console.log(`🎨 ${specs.length} visuels générés dans ${OUT}`);
