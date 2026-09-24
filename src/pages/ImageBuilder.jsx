import { useEffect, useRef, useState } from 'react';
import {
  HiOutlineDownload,
  HiOutlineDuplicate,
  HiOutlinePhotograph,
  HiOutlineSparkles,
  HiOutlineSwitchHorizontal,
  HiOutlineUpload,
  HiX,
} from 'react-icons/hi';
import {
  ENHANCE_PRESETS,
  copyImageBlob,
  downloadBlob,
  enhanceLandImage,
  enhancedFilename,
} from '../utils/enhanceLandImage.js';

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';
const MAX_BYTES = 25 * 1024 * 1024;
const MIN_LOADING_MS = 1400;

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useObjectUrl(object) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!object) {
      setUrl('');
      return undefined;
    }
    const next = URL.createObjectURL(object);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [object]);
  return url;
}

function paintLoader() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function PreviewFrame({ children, busy = false }) {
  return (
    <div className="relative flex items-center justify-center min-h-[28rem] md:min-h-[32rem] rounded-2xl bg-myland-mist/70 px-4 py-5 overflow-hidden">
      {children}
      {busy && <EnhanceLoader />}
    </div>
  );
}

function EnhanceLoader() {
  return (
    <div className="absolute inset-0 z-10 bg-white/95 flex flex-col items-center justify-center gap-4">
      <span className="relative w-14 h-14">
        <span className="absolute inset-0 rounded-full border-4 border-myland-mist" />
        <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-myland-red animate-spin" />
        <HiOutlineSparkles className="absolute inset-0 m-auto text-myland-red text-lg" />
      </span>
      <div className="text-center">
        <p className="font-display font-semibold text-sm text-myland-ink">Enhancing photo</p>
        <p className="text-xs text-myland-slate mt-1 animate-pulse">Greening the plot and polishing the sky…</p>
      </div>
    </div>
  );
}

export default function ImageBuilder() {
  const inputRef = useRef(null);
  const runId = useRef(0);
  const [file, setFile] = useState(null);
  const [preset, setPreset] = useState('balanced');
  const [result, setResult] = useState(null);
  const [view, setView] = useState('upload');
  const [compareFace, setCompareFace] = useState('enhanced');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const originalUrl = useObjectUrl(file);
  const enhancedUrl = useObjectUrl(result?.blob);

  const pickFile = (nextFile) => {
    if (!nextFile) return;
    if (!nextFile.type.startsWith('image/')) {
      setError('Please choose a photo file (JPG, PNG, or WEBP).');
      return;
    }
    if (nextFile.size > MAX_BYTES) {
      setError('That photo is larger than 25 MB. Try a smaller file.');
      return;
    }
    runId.current += 1;
    setResult(null);
    setView('ready');
    setCompareFace('enhanced');
    setBusy(false);
    setError('');
    setNotice('');
    setFile(nextFile);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files?.[0]);
  };

  const clear = () => {
    runId.current += 1;
    setFile(null);
    setView('upload');
    setCompareFace('enhanced');
    setBusy(false);
    setResult(null);
    setError('');
    setNotice('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const enhance = async () => {
    if (!file || busy) return;
    const id = ++runId.current;
    setBusy(true);
    setError('');
    setNotice('');
    const started = Date.now();
    try {
      await paintLoader();
      const next = await enhanceLandImage(file, ENHANCE_PRESETS[preset]);
      const wait = MIN_LOADING_MS - (Date.now() - started);
      if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
      if (id !== runId.current) return;
      setResult(next);
    } catch (err) {
      if (id === runId.current) {
        setError(err.message || 'Could not enhance this photo.');
        setBusy(false);
      }
    }
  };

  useEffect(() => {
    if (!busy || !result?.blob || !enhancedUrl) return undefined;
    let cancelled = false;
    const img = new Image();
    const finish = () => {
      if (cancelled) return;
      setView('preview');
      setCompareFace('enhanced');
      setBusy(false);
    };
    img.onload = finish;
    img.onerror = () => {
      if (cancelled) return;
      setError('Could not display the enhanced photo.');
      setBusy(false);
    };
    img.src = enhancedUrl;
    const timer = window.setTimeout(finish, 8000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [busy, result, enhancedUrl]);

  const download = () => {
    if (!result?.blob || !file) return;
    downloadBlob(result.blob, enhancedFilename(file, result.type));
    setNotice('Enhanced photo downloaded.');
  };

  const copy = async () => {
    if (!result?.pngBlob) return;
    setNotice('');
    setError('');
    try {
      await copyImageBlob(result.pngBlob);
      setNotice('Enhanced photo copied. You can paste it into a listing or chat.');
    } catch (err) {
      setError(err.message || 'Could not copy the image.');
    }
  };

  const showingEnhanced = !busy && (view !== 'compare' || compareFace === 'enhanced');
  const previewSrc = showingEnhanced && enhancedUrl ? enhancedUrl : originalUrl;
  const previewAlt = showingEnhanced ? 'Enhanced land photo' : 'Original land photo';

  return (
    <div className="space-y-6 max-w-5xl">
      <section className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-myland-red/10 text-myland-red flex items-center justify-center shrink-0">
            <HiOutlineSparkles className="text-lg" />
          </span>
          <div>
            <h2 className="font-display font-semibold text-lg text-myland-ink">Land photo polish</h2>
          </div>
        </div>
      </section>

      {view === 'upload' && (
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`block bg-white rounded-xl3 p-8 md:p-10 shadow-card border-2 border-dashed cursor-pointer transition-colors ${
            dragging ? 'border-myland-red bg-myland-red/5' : 'border-myland-mist'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => pickFile(event.target.files?.[0])}
          />
          <div className="flex flex-col items-center text-center">
            <span className="w-14 h-14 rounded-full bg-myland-cream text-myland-ink flex items-center justify-center mb-4">
              <HiOutlineUpload className="text-2xl" />
            </span>
            <p className="font-display font-semibold text-myland-ink">Drop a land photo here</p>
            <p className="text-sm text-myland-slate mt-1">or click to browse JPG, PNG, or WEBP up to 25 MB</p>
          </div>
        </label>
      )}

      {file && view !== 'upload' && (
        <section className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display font-semibold text-myland-ink truncate">{file.name}</p>
              <p className="text-xs text-myland-slate mt-0.5">
                {formatSize(file.size)}
                {result ? ` · ${result.width}×${result.height}` : ''}
              </p>
            </div>
            <button type="button" onClick={clear} className="btn-ghost !py-2 !px-3 !text-xs">
              <HiX /> Replace
            </button>
          </div>

          {view === 'ready' && (
            <>
              <div className="flex rounded-full bg-myland-mist p-1 w-fit">
                {[
                  { id: 'subtle', label: 'Subtle' },
                  { id: 'balanced', label: 'Balanced' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreset(item.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-display font-semibold ${
                      preset === item.id ? 'bg-white text-myland-ink shadow-sm' : 'text-myland-slate'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <PreviewFrame busy={busy}>
                {originalUrl ? (
                  <img src={originalUrl} alt="Original land photo" className="image-builder-preview" />
                ) : (
                  <p className="text-sm text-myland-slate flex items-center gap-2">
                    <HiOutlinePhotograph className="text-xl" />
                    Loading photo…
                  </p>
                )}
              </PreviewFrame>
              <button type="button" disabled={busy} onClick={enhance} className="btn-primary !py-2.5 !px-5 !text-xs">
                <HiOutlineSparkles /> Enhance
              </button>
            </>
          )}

          {(view === 'preview' || view === 'compare') && result?.blob && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex rounded-full bg-myland-mist p-1">
                  <button
                    type="button"
                    onClick={() => setView('preview')}
                    className={`rounded-full px-3 py-1.5 text-xs font-display font-semibold ${
                      view === 'preview' ? 'bg-white text-myland-ink shadow-sm' : 'text-myland-slate'
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setView('compare');
                      setCompareFace('enhanced');
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-display font-semibold ${
                      view === 'compare' ? 'bg-white text-myland-ink shadow-sm' : 'text-myland-slate'
                    }`}
                  >
                    Compare
                  </button>
                </div>
                {view === 'compare' && (
                  <span
                    className={`text-[10px] uppercase tracking-wide font-display font-semibold rounded-full px-2.5 py-1 ${
                      showingEnhanced ? 'bg-myland-red text-white' : 'bg-myland-ink text-white'
                    }`}
                  >
                    {showingEnhanced ? 'Enhanced' : 'Original'}
                  </span>
                )}
              </div>

              <PreviewFrame busy={busy}>
                <img src={previewSrc} alt={previewAlt} className="image-builder-preview" />
              </PreviewFrame>

              {view === 'compare' && (
                <button
                  type="button"
                  onClick={() => setCompareFace((current) => (current === 'enhanced' ? 'original' : 'enhanced'))}
                  className="btn-ghost !py-2.5 !px-5 !text-xs"
                >
                  <HiOutlineSwitchHorizontal />
                  Flip to {showingEnhanced ? 'original' : 'enhanced'}
                </button>
              )}

              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={download} className="btn-primary !py-2.5 !px-5 !text-xs">
                  <HiOutlineDownload /> Download
                </button>
                <button type="button" disabled={busy} onClick={copy} className="btn-ghost !py-2.5 !px-5 !text-xs">
                  <HiOutlineDuplicate /> Copy image
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={enhance}
                  className="btn-ghost !py-2.5 !px-5 !text-xs"
                >
                  <HiOutlineSparkles /> Enhance again
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {error && <p className="text-sm text-myland-red">{error}</p>}
      {notice && !error && <p className="text-sm text-emerald-700">{notice}</p>}
    </div>
  );
}
