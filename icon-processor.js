// icon-processor.js

// This object will hold our high-quality, pre-rendered icon images.
const iconCache = {};

// --- List of all themeable icon assets ---
// Add any new icon filenames to this list.
const ICON_ASSETS = [
  "block.png",
  "cancel.png",
  "chat.png",
  "check24_Normal_Normal.png",
  "close.png",
  "copy.png",
  "doc.png",
  "fees.png",
  "info.png",
  "lightning.png",
  "pending.png",
  "percent.png",
  "person.png",
  "report.png",
  "transfer-out.png",
];

/**
 * The core image processing function.
 * Takes an Image object and a target color, and returns a crisp, tinted image as a Data URL.
 * @param {HTMLImageElement} img - The source image element.
 * @param {'black' | 'white'} color - The target color.
 * @returns {string} - A base64 Data URL of the processed image.
 */
function processIconToDataURL(img, color) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // Set canvas to the image's native resolution to ensure max quality.
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const [r, g, b] = color === "black" ? [0, 0, 0] : [255, 255, 255];

  for (let i = 0; i < data.length; i += 4) {
    // If the pixel is not transparent (alpha channel > 0)
    if (data[i + 3] > 0) {
      data[i] = r; // Red
      data[i + 1] = g; // Green
      data[i + 2] = b; // Blue
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Loads all icon assets, processes them into black and white versions,
 * and stores them in the iconCache.
 * @returns {Promise<void>} - A promise that resolves when all icons are processed.
 */
function initializeIconCache() {
  const promises = ICON_ASSETS.map((filename) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = `tansicon/${filename}`;

      img.onload = () => {
        iconCache[filename] = {};
        iconCache[filename].black = processIconToDataURL(img, "black");
        iconCache[filename].white = processIconToDataURL(img, "white");
        resolve();
      };

      img.onerror = () => {
        console.error(`Failed to load icon: ${filename}`);
        reject(`Failed to load icon: ${filename}`);
      };
    });
  });

  return Promise.all(promises);
}
