import { useEffect, useRef, useState } from 'react';
import { isWarmed, markWarmed } from '../utils/imageCache.js';

export default function WarmImage({
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  priority = false,
  lazy,
  sizes,
  srcSet,
  onReady,
  ...rest
}) {
  const [displaySrc, setDisplaySrc] = useState(src || '');
  const [ready, setReady] = useState(() => Boolean(src) && isWarmed(src));
  const [failed, setFailed] = useState(false);
  const shown = useRef(isWarmed(src) ? src || '' : '');

  useEffect(() => {
    setFailed(false);
    if (!src) {
      shown.current = '';
      setDisplaySrc('');
      setReady(false);
      return;
    }
    if (shown.current === src || isWarmed(src)) {
      shown.current = src;
      setDisplaySrc(src);
      setReady(true);
      return;
    }
    if (!shown.current) {
      setDisplaySrc(src);
      setReady(false);
    }
  }, [src]);

  const finish = (nextSrc) => {
    if (!nextSrc) return;
    markWarmed(nextSrc);
    if (shown.current === nextSrc) {
      setReady(true);
      return;
    }
    shown.current = nextSrc;
    setDisplaySrc(nextSrc);
    setReady(true);
    onReady?.(nextSrc);
  };

  const handleLoad = async (event) => {
    const img = event.currentTarget;
    try {
      if (typeof img.decode === 'function') await img.decode();
    } catch {
      /* bitmap is still usable */
    }
    finish(src);
  };

  const loading = priority ? 'eager' : lazy === false ? 'eager' : 'lazy';
  const pendingSwap = Boolean(src && src !== displaySrc);

  return (
    <span className={`warm-image ${wrapperClassName}`.trim()}>
      {!ready && !failed ? <span className="warm-image-shimmer" aria-hidden="true" /> : null}
      {displaySrc && !failed ? (
        <img
          src={displaySrc}
          alt={alt}
          className={`warm-image-el ${ready ? 'is-ready' : ''} ${className}`.trim()}
          loading={loading}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          sizes={sizes}
          srcSet={src === displaySrc ? srcSet : undefined}
          onLoad={handleLoad}
          onError={() => {
            if (displaySrc === src) setFailed(true);
          }}
          {...rest}
        />
      ) : null}
      {pendingSwap ? (
        <img
          src={src}
          alt=""
          className="warm-image-loader"
          loading="eager"
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
          sizes={sizes}
          srcSet={srcSet}
          onLoad={handleLoad}
          onError={() => setFailed(true)}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}
