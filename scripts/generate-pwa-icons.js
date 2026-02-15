// Script to generate PWA icons from the original icon.png
// Uses the Canvas API via Node.js (sharp or canvas package)
// For simplicity, we'll create a script that copies and creates proper icons

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SOURCE_ICON = path.join(__dirname, '..', 'public', 'icon.png');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory
if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Check if sharp is available, if not use simple copy
try {
    const sharp = require('sharp');

    console.log('Generating PWA icons using sharp...\n');

    const promises = SIZES.map(async (size) => {
        const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
        await sharp(SOURCE_ICON)
            .resize(size, size, { fit: 'contain', background: { r: 5, g: 5, b: 5, alpha: 1 } })
            .png()
            .toFile(outputPath);
        console.log(`✅ Generated: icon-${size}x${size}.png`);
    });

    // Also generate maskable icons (with padding)
    const maskableSizes = [192, 512];
    const maskablePromises = maskableSizes.map(async (size) => {
        const outputPath = path.join(ICONS_DIR, `icon-maskable-${size}x${size}.png`);
        const padding = Math.round(size * 0.1); // 10% padding for maskable
        const innerSize = size - (padding * 2);

        await sharp(SOURCE_ICON)
            .resize(innerSize, innerSize, { fit: 'contain', background: { r: 5, g: 5, b: 5, alpha: 1 } })
            .extend({
                top: padding,
                bottom: padding,
                left: padding,
                right: padding,
                background: { r: 5, g: 5, b: 5, alpha: 1 },
            })
            .png()
            .toFile(outputPath);
        console.log(`✅ Generated: icon-maskable-${size}x${size}.png`);
    });

    Promise.all([...promises, ...maskablePromises]).then(() => {
        console.log('\n🎉 All PWA icons generated successfully!');
    });

} catch (e) {
    // Fallback: just copy the original icon for all sizes
    console.log('sharp not available, copying original icon for all sizes...');
    console.log('For best results, install sharp: npm install sharp\n');

    const sourceBuffer = fs.readFileSync(SOURCE_ICON);

    SIZES.forEach((size) => {
        const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
        fs.writeFileSync(outputPath, sourceBuffer);
        console.log(`📋 Copied as: icon-${size}x${size}.png (original size, browser will resize)`);
    });

    // Maskable icons
    [192, 512].forEach((size) => {
        const outputPath = path.join(ICONS_DIR, `icon-maskable-${size}x${size}.png`);
        fs.writeFileSync(outputPath, sourceBuffer);
        console.log(`📋 Copied as: icon-maskable-${size}x${size}.png (original size, browser will resize)`);
    });

    console.log('\n✅ Icons copied successfully! Browsers will handle resizing.');
}
