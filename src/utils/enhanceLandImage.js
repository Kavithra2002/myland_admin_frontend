const MAX_EDGE = 4500;

export const ENHANCE_PRESETS = {
  subtle: { strength: 0.62 },
  balanced: { strength: 1 },
};

const PIPELINE = {
  sky: { exposure: 0.15, contrast: 0.2, blueSaturation: 0.25, dehaze: 0.15 },
  ground: { saturation: 0.35, clarity: 0.2, hue: 0.31 },
  foliage: { greenSaturation: 0.25, greenLuminance: -0.05, sharpness: 0.3 },
  finish: { globalSharpness: 0.15, overallContrast: 0.1 },
};

export async function loadImageFromFile(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to the Image path for unusual JPEG/WEBP files.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read this image. Try a JPG, PNG, or WEBP photo.'));
      img.src = url;
    });
    if (typeof image.decode === 'function') {
      await image.decode().catch(() => {});
    }
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function outputType(file) {
  if (file?.type === 'image/png') return 'image/png';
  if (file?.type === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

function outputQuality(type) {
  if (type === 'image/jpeg' || type === 'image/webp') return 0.92;
  return undefined;
}

export function canvasToBlob(canvas, type = 'image/jpeg', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not export the enhanced image.'));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

function drawScaled(image) {
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, width, height };
}

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function softClip(value) {
  if (value <= 0.92) return clamp01(value);
  return 0.92 + (0.08 * (value - 0.92)) / (1 + (value - 0.92) * 5);
}

function safeByte(value, fallback) {
  const next = Math.round(softClip(value) * 255);
  return Number.isFinite(next) ? Math.min(255, Math.max(0, next)) : fallback;
}

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hue2rgb(p, q, t) {
  let h = t;
  if (h < 0) h += 1;
  if (h > 1) h -= 1;
  if (h < 1 / 6) return p + (q - p) * 6 * h;
  if (h < 1 / 2) return q;
  if (h < 2 / 3) return p + (q - p) * (2 / 3 - h) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  if (s <= 1e-5) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function classifyPixel(r, g, b, yNorm) {
  const [h, s, l] = rgbToHsl(r, g, b);
  const hue = h * 360;
  const overlayYellow = hue >= 40 && hue <= 68 && s > 0.52 && l > 0.38;
  const overlayWhite = l > 0.9 && s < 0.16;
  const overlay = overlayYellow || overlayWhite ? 1 : 0;

  const blueSky = hue >= 185 && hue <= 245 && l > 0.38 && b > r;
  const cloud = l > 0.78 && s < 0.2 && yNorm < 0.58;
  let sky = 0;
  if (blueSky) sky = Math.min(1, 0.35 + s * 1.6) * (1 - smoothstep(0.48, 0.82, yNorm));
  if (cloud) sky = Math.max(sky, 0.75 * (1 - smoothstep(0.35, 0.62, yNorm)));
  sky *= 1 - overlay;

  let foliage = 0;
  if (hue >= 72 && hue <= 165 && s > 0.18 && l > 0.1 && l < 0.78) {
    foliage = Math.min(1, (s - 0.14) * 2.4);
  }
  foliage *= 1 - overlay;

  const trunk = l < 0.36 && s < 0.28 && hue >= 8 && hue <= 50;
  const warm = r > b + 0.03 && r >= g * 0.88 && hue >= 12 && hue <= 65;
  const dry = warm && s >= 0.06 && s <= 0.62 && l >= 0.22 && l <= 0.86;
  const groundPrior = smoothstep(0.22, 0.42, yNorm);
  let ground = 0;
  if (dry && !trunk && overlay < 1 && foliage < 0.28) {
    ground = groundPrior * smoothstep(0.05, 0.11, s);
  }
  ground *= 1 - overlay;

  return { h, s, l, sky, ground, foliage, overlay, cloud: cloud ? 1 : 0 };
}

async function applyLandPipeline(source, strength) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const { width, height } = canvas;
  const amounts = new Float32Array(width * height);
  const k = strength;

  const skyP = PIPELINE.sky;
  const groundP = PIPELINE.ground;
  const foliageP = PIPELINE.foliage;
  const finishP = PIPELINE.finish;

  for (let y = 0; y < height; y += 1) {
    if (y > 0 && y % 24 === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    const yNorm = y / Math.max(1, height - 1);
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;
      const mask = classifyPixel(r, g, b, yNorm);

      if (mask.sky > 0.02) {
        const cloudProtect = mix(1, 0.35, mask.cloud);
        const exposure = 1 + skyP.exposure * k * mask.sky * cloudProtect;
        r *= exposure;
        g *= exposure;
        b *= exposure;
        const dehaze = skyP.dehaze * k * mask.sky;
        r = mix(r, (r - 0.72 * dehaze) / (1 - dehaze * 0.65), 0.85);
        g = mix(g, (g - 0.74 * dehaze) / (1 - dehaze * 0.65), 0.85);
        b = mix(b, (b - 0.7 * dehaze) / (1 - dehaze * 0.65), 0.85);
        const mid = 0.5;
        const contrast = 1 + skyP.contrast * k * mask.sky * cloudProtect;
        r = mid + (r - mid) * contrast;
        g = mid + (g - mid) * contrast;
        b = mid + (b - mid) * contrast;
        const [hh, ss, ll] = rgbToHsl(clamp01(r), clamp01(g), clamp01(b));
        const blueBoost = skyP.blueSaturation * k * mask.sky * (1 - 0.7 * mask.cloud);
        const [sr, sg, sb] = hslToRgb(mix(hh, 0.58, 0.12 * mask.sky), clamp01(ss + blueBoost * (1 - ss)), ll);
        r = mix(r, sr, mask.sky);
        g = mix(g, sg, mask.sky);
        b = mix(b, sb, mask.sky);
      }

      if (mask.ground > 0.04) {
        const t = Math.min(1, mask.ground * (0.75 + 0.25 * k) * 1.15);
        const [nr, ng, nb] = hslToRgb(
          mix(mask.h, groundP.hue, 0.96 * t),
          mix(mask.s, 0.5 + groundP.saturation * 0.2, 0.9 * t),
          mix(mask.l, mask.l * 0.93, t)
        );
        r = mix(r, nr, t);
        g = mix(g, ng, t);
        b = mix(b, nb, t);
      }

      if (mask.foliage > 0.04 && mask.ground < 0.35) {
        const t = mask.foliage * k * (1 - mask.ground);
        const haze = smoothstep(0.48, 0.72, mask.l);
        const [nr, ng, nb] = hslToRgb(
          mix(mask.h, 0.33, 0.18 * t),
          clamp01(mask.s * (1 + foliageP.greenSaturation * t)),
          clamp01(mask.l * (1 + foliageP.greenLuminance * t) - 0.04 * haze * t)
        );
        r = mix(r, nr, t);
        g = mix(g, ng, t);
        b = mix(b, nb, t);
      }

      if (mask.overlay < 0.7) {
        const mid = luma(r, g, b);
        const contrast = 1 + finishP.overallContrast * k * (1 - mask.sky * 0.4);
        const scale = mid > 1e-4 ? (0.5 + (mid - 0.5) * contrast) / mid : 1;
        r *= scale;
        g *= scale;
        b *= scale;
      }

      data[i] = safeByte(r, data[i]);
      data[i + 1] = safeByte(g, data[i + 1]);
      data[i + 2] = safeByte(b, data[i + 2]);

      const pixel = y * width + x;
      amounts[pixel] =
        finishP.globalSharpness * k * (mask.overlay ? 0.2 : 1) +
        groundP.clarity * k * mask.ground +
        foliageP.sharpness * k * mask.foliage * (1 - mask.ground) +
        0.06 * k * mask.sky * (1 - mask.cloud);
    }
  }

  ctx.putImageData(image, 0, 0);
  return applyWeightedSharpen(canvas, amounts);
}

function applyWeightedSharpen(source, amounts) {
  const { width, height } = source;
  if (width * height > 16_000_000) return source;

  const sharp = document.createElement('canvas');
  sharp.width = width;
  sharp.height = height;
  const ctx = sharp.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);

  const blur = document.createElement('canvas');
  blur.width = width;
  blur.height = height;
  const blurCtx = blur.getContext('2d');
  blurCtx.filter = 'blur(0.85px)';
  blurCtx.drawImage(source, 0, 0);

  const original = ctx.getImageData(0, 0, width, height);
  const blurred = blurCtx.getImageData(0, 0, width, height);
  const next = original.data;
  const prev = blurred.data;
  for (let i = 0, p = 0; i < next.length; i += 4, p += 1) {
    const lum = (next[i] + next[i + 1] + next[i + 2]) / 3;
    const amt = lum > 220 ? amounts[p] * 0.15 : amounts[p];
    next[i] = Math.min(255, Math.max(0, next[i] + amt * (next[i] - prev[i])));
    next[i + 1] = Math.min(255, Math.max(0, next[i + 1] + amt * (next[i + 1] - prev[i + 1])));
    next[i + 2] = Math.min(255, Math.max(0, next[i + 2] + amt * (next[i + 2] - prev[i + 2])));
  }
  ctx.putImageData(original, 0, 0);
  return sharp;
}

export async function enhanceLandImage(file, preset = ENHANCE_PRESETS.balanced) {
  const image = await loadImageFromFile(file);
  try {
    const source = drawScaled(image);
    const enhanced = await applyLandPipeline(source.canvas, preset.strength ?? 1);
    const type = outputType(file);
    const blob = await canvasToBlob(enhanced, type, outputQuality(type));
    if (!blob || blob.size < 32) {
      throw new Error('Could not enhance this photo. Try another image.');
    }
    const pngBlob = type === 'image/png' ? blob : await canvasToBlob(enhanced, 'image/png');
    return {
      blob,
      pngBlob,
      type,
      width: enhanced.width,
      height: enhanced.height,
    };
  } finally {
    if (typeof image.close === 'function') image.close();
  }
}

export async function copyImageBlob(pngBlob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Copy is not supported in this browser. Download the image instead.');
  }
  window.focus();
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
  } catch (err) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': Promise.resolve(pngBlob) }),
      ]);
    } catch {
      const message = String(err?.message || '');
      if (/not focused|not allowed|permission|denied/i.test(message)) {
        throw new Error('Could not copy from this window. Click the page and try Copy again, or download the photo.');
      }
      throw new Error('Could not copy the image. Download it instead.');
    }
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function enhancedFilename(file, type) {
  const base = String(file?.name || 'land-photo')
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w.-]+/g, '-')
    .slice(0, 60) || 'land-photo';
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  return `${base}-enhanced.${ext}`;
}
