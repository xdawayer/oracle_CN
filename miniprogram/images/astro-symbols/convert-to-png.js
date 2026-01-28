import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertSvgToPng() {
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.svg'));

  console.log(`找到 ${files.length} 个 SVG 文件，开始转换...\n`);

  for (const file of files) {
    const svgPath = path.join(__dirname, file);
    const pngPath = path.join(__dirname, file.replace('.svg', '.png'));

    try {
      await sharp(svgPath)
        .resize(24, 24)
        .png({ compressionLevel: 9 })
        .toFile(pngPath);

      console.log(`✓ ${file} -> ${file.replace('.svg', '.png')}`);
    } catch (error) {
      console.error(`✗ ${file} 转换失败:`, error.message);
    }
  }

  console.log('\n✅ 所有文件转换完成！');
}

convertSvgToPng().catch(console.error);
