import { apiFetch, readError } from './http.js';
import { mediaSrc } from '../utils/projectMedia.js';
import { preloadImage } from '../utils/imageCache.js';

function normalizeImages(images) {
  return (Array.isArray(images) ? images : [])
    .map((item) => {
      const src = typeof item === 'string' ? item : item?.src || item?.url || '';
      if (!src) return null;
      return {
        src,
        alt: String(item?.alt || '').trim(),
      };
    })
    .filter(Boolean);
}

function mapGallery(data = {}) {
  const images = normalizeImages(data.images);
  const pendingImages = normalizeImages(data.pendingImages);
  images.slice(0, 8).forEach((item) => preloadImage(mediaSrc(item.src)));
  pendingImages.slice(0, 4).forEach((item) => preloadImage(mediaSrc(item.src)));
  return {
    images,
    pendingImages,
    updatedAt: data.updatedAt,
    approvalStatus: data.approvalStatus || 'approved',
    pendingAction: data.pendingAction || 'none',
    approverId: data.approverId,
    requestedBy: data.requestedBy,
    approverName: data.approverName,
    requestedByName: data.requestedByName,
    approvalMessage: data.approvalMessage,
  };
}

export async function fetchGallery() {
  const res = await apiFetch('/api/gallery');
  const data = await readError(res, 'Could not load gallery');
  return mapGallery(data);
}

export async function submitGalleryChange({ images, approverId }) {
  const res = await apiFetch('/api/gallery/submit', {
    method: 'POST',
    body: JSON.stringify({
      images: normalizeImages(images),
      approverId: Number(approverId),
    }),
  });
  const data = await readError(res, 'Could not send for approval');
  return mapGallery(data);
}

export async function reviewGallery(payload) {
  const res = await apiFetch('/api/gallery/review', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await readError(res, 'Could not review gallery');
  return mapGallery(data);
}

export async function uploadGalleryMedia(files) {
  const list = Array.from(files || []).filter(Boolean);
  if (!list.length) return [];
  const body = new FormData();
  list.forEach((file) => body.append('files', file));
  const res = await apiFetch('/api/gallery/uploads', {
    method: 'POST',
    body,
  });
  const data = await readError(res, 'Could not upload photos');
  return data.urls || [];
}

function altFromFile(file) {
  return String(file?.name || 'Myland project photo')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Myland project photo';
}

export function galleryItemsFromUpload(files, urls) {
  const list = Array.from(files || []).filter(Boolean);
  return (urls || []).map((src, index) => ({
    src,
    alt: altFromFile(list[index]),
  }));
}
