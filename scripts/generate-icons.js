const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [48, 96];
const svgPath = path.join(__dirname, '../src/icons/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `../src/icons/icon-${size}.png`));

    console.log(`Generated ${size}x${size} icon`);
  }
}

generateIcons().catch(console.error);
