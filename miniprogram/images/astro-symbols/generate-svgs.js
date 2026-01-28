import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 行星符号 SVG 路径数据（来自 chart-config.js）
const PLANET_PATHS = {
  'Sun': 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-2a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  'Moon': 'M12 3c.132 0 .263 0 .393.01a7.5 7.5 0 0 0 0 14.98A8 8 0 1 1 12 3z',
  'Mercury': 'M12 2a1 1 0 0 1 1 1v2.05A5.002 5.002 0 0 1 12 15a5.002 5.002 0 0 1-1-9.95V3a1 1 0 0 1 1-1zm0 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-4 12a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h8zm-3-2a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z',
  'Venus': 'M12 2a6 6 0 0 1 1 11.91V16h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2H9a1 1 0 1 1 0-2h2v-2.09A6.002 6.002 0 0 1 12 2zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  'Mars': 'M14 2h6v6h-2V5.414l-4.293 4.293a6 6 0 1 1-1.414-1.414L16.586 4H14V2zM9 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  'Jupiter': 'M4 6h7v2H6.5L11 12l-4.5 4H11v2H4v-2h3.5L4 12l3.5-4H4V6zm16 0v2h-4v4h4v2h-4v4h-2V6h6z',
  'Saturn': 'M5 3h6v2H8.236l3.528 4.704A5 5 0 1 1 7.05 15H5v-2h2.05a3 3 0 1 0 3.186-4.24L6.236 5H5V3zm14 0v18h-2V3h2z',
  'Uranus': 'M11 2v4H9V2h2zm4 0v4h-2V2h2zm-3 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  'Neptune': 'M12 2v3l3-2v3l-3-1v4.1A5.002 5.002 0 0 1 12 19a5.002 5.002 0 0 1 0-9.9V5L9 6V3l3 2V2h0zm0 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'Pluto': 'M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V22h-2v-5H10v5H8v-7.26A7 7 0 0 1 12 2zm0 2a5 5 0 0 0-2 9.58V17h4v-3.42A5 5 0 0 0 12 4zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  'Ascendant': 'M4 12h16M12 4l4 8-4 8-4-8 4-8z',
  'North Node': 'M12 4a4 4 0 0 1 4 4v8a4 4 0 0 1-8 0V8a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v2h4V8a2 2 0 0 0-2-2zM6 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
};

// 星座符号 SVG 路径数据
const SIGN_PATHS = {
  'Aries': 'M5 20c0-8 3-14 7-14s7 6 7 14M12 6V2',
  'Taurus': 'M4 8c0-3.3 3.6-6 8-6s8 2.7 8 6c0 2.5-2 4.5-4.5 5.5C13 14.5 12 17 12 20v2M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  'Gemini': 'M4 4h16M4 20h16M8 4v16M16 4v16',
  'Cancer': 'M12 12a5 5 0 1 0-5-5M12 12a5 5 0 1 0 5 5',
  'Leo': 'M6 16a4 4 0 1 0 0-8M6 12h8a4 4 0 0 1 4 4v4',
  'Virgo': 'M4 4v12a4 4 0 0 0 4 4M8 4v16M12 4v12a4 4 0 0 0 4 4h2M16 4v8M20 12v8',
  'Libra': 'M4 16h16M12 16V8M6 8h12M4 4h4M16 4h4',
  'Scorpio': 'M4 4v12a4 4 0 0 0 4 4M8 4v16M12 4v12a4 4 0 0 0 4 4M16 4v16l4-4',
  'Sagittarius': 'M4 20L20 4M20 4h-8M20 4v8M8 12l4 4',
  'Capricorn': 'M4 8v8a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8M16 8a4 4 0 1 1 0 8',
  'Aquarius': 'M4 8l4 4-4 4M8 8l4 4-4 4M12 8l4 4-4 4M16 8l4 4-4 4',
  'Pisces': 'M8 4v16M16 4v16M4 12h16',
};

// 颜色映射
const PLANET_COLORS = {
  'Sun': '#FF6B6B',
  'Moon': '#74B9FF',
  'Mercury': '#FFEAA7',
  'Venus': '#55EFC4',
  'Mars': '#FF85C1',
  'Jupiter': '#FF7675',
  'Saturn': '#DFE6E9',
  'Uranus': '#00CEC9',
  'Neptune': '#74B9FF',
  'Pluto': '#A29BFE',
  'Ascendant': '#FFFFFF',
  'North Node': '#E056FD',
};

const SIGN_COLORS = {
  'Aries': '#FF6B6B',
  'Taurus': '#FFEAA7',
  'Gemini': '#00CEC9',
  'Cancer': '#74B9FF',
  'Leo': '#FF7675',
  'Virgo': '#FFEAA7',
  'Libra': '#00CEC9',
  'Scorpio': '#74B9FF',
  'Sagittarius': '#FF6B6B',
  'Capricorn': '#FFEAA7',
  'Aquarius': '#00CEC9',
  'Pisces': '#74B9FF',
};

// 生成 SVG 文件
function generateSVG(name, pathData, color, type) {
  const strokeWidth = type === 'sign' ? 2 : 1.5;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="${pathData}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

  const filename = `${name.toLowerCase()}.svg`;
  fs.writeFileSync(path.join(__dirname, filename), svg);
  console.log(`Created: ${filename}`);
}

// 生成所有行星符号
console.log('Generating planet symbols...');
Object.entries(PLANET_PATHS).forEach(([name, path]) => {
  generateSVG(name, path, PLANET_COLORS[name] || '#888888', 'planet');
});

// 生成所有星座符号
console.log('\nGenerating sign symbols...');
Object.entries(SIGN_PATHS).forEach(([name, path]) => {
  generateSVG(name, path, SIGN_COLORS[name] || '#888888', 'sign');
});

console.log('\n✅ All SVG files generated!');
console.log('\n📝 Next steps:');
console.log('1. Convert all SVG files to PNG (24x24px) using:');
console.log('   https://cloudconvert.com/svg-to-png');
console.log('2. Or use ImageMagick: for f in *.svg; do convert -background none -density 300 "$f" "${f%.svg}.png"; done');
console.log('3. Optimize PNG files if needed');
