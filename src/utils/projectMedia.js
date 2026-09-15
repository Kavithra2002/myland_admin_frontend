import { apiUrl } from '../api/http.js';

export function mediaSrc(src) {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  if (src.startsWith('/api/')) return apiUrl(src) || src;
  return src;
}

export function isDirectVideo(url) {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(String(url || ''));
}

export function youtubeEmbedId(url) {
  const match = String(url || '').match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/
  );
  return match?.[1] || '';
}

export function mapEmbedUrl(query) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query || 'Sri Lanka')}&z=14&output=embed`;
}

export function formatDisplayPrice(amount, unit) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '';
  const formatted = n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (unit === 'perch') return `Rs. ${formatted}/per perch up`;
  return `Starting from Rs. ${formatted}/Full Land`;
}

export function priceUnitFromText(price) {
  return /perch/i.test(String(price || '')) ? 'perch' : 'land';
}
