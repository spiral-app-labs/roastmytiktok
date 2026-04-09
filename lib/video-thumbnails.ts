'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Config ──────────────────────────────────────────────────────────────────

const THUMB_KEY_PREFIX = 'videoThumb_';
const THUMB_INDEX_KEY = 'videoThumb_index';
const MAX_CACHE_ENTRIES = 40;
const EXTRACT_TIMEOUT_MS = 8000;
const DEFAULT_SEEK_SECONDS = 0.3;
const DEFAULT_QUALITY = 0.72;
const DEFAULT_MAX_WIDTH = 480;

// ─── Cache ───────────────────────────────────────────────────────────────────

function readIndex(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(THUMB_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(index: string[]): void {
  try {
    localStorage.setItem(THUMB_INDEX_KEY, JSON.stringify(index));
  } catch {
    /* ignore */
  }
}

function touchIndex(id: string): void {
  const index = readIndex().filter((x) => x !== id);
  index.push(id);
  writeIndex(index);
}

function evictOldest(): boolean {
  const index = readIndex();
  const oldest = index.shift();
  if (!oldest) return false;
  try {
    localStorage.removeItem(`${THUMB_KEY_PREFIX}${oldest}`);
    writeIndex(index);
    return true;
  } catch {
    return false;
  }
}

export function getCachedThumbnail(id: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${THUMB_KEY_PREFIX}${id}`);
    if (!raw) return null;
    // Stored value is the data URL directly for simplicity.
    if (raw.startsWith('data:image/')) return raw;
    // Backwards tolerant: accept {dataUrl: ...} shape too.
    const parsed = JSON.parse(raw);
    return typeof parsed?.dataUrl === 'string' ? parsed.dataUrl : null;
  } catch {
    return null;
  }
}

export function cacheThumbnail(id: string, dataUrl: string): void {
  if (typeof window === 'undefined') return;

  const index = readIndex();
  while (index.length >= MAX_CACHE_ENTRIES) {
    const oldest = index.shift();
    if (!oldest) break;
    try {
      localStorage.removeItem(`${THUMB_KEY_PREFIX}${oldest}`);
    } catch {
      /* ignore */
    }
  }
  writeIndex(index);

  const key = `${THUMB_KEY_PREFIX}${id}`;
  const attempts = 3;
  for (let i = 0; i < attempts; i++) {
    try {
      localStorage.setItem(key, dataUrl);
      touchIndex(id);
      return;
    } catch {
      // QuotaExceededError — evict oldest and retry
      if (!evictOldest()) return;
    }
  }
}

// ─── First-frame extraction ──────────────────────────────────────────────────

interface ExtractOptions {
  seekSeconds?: number;
  quality?: number;
  maxWidth?: number;
}

export function extractFirstFrame(
  videoUrl: string,
  opts: ExtractOptions = {}
): Promise<string> {
  const seekSeconds = opts.seekSeconds ?? DEFAULT_SEEK_SECONDS;
  const quality = opts.quality ?? DEFAULT_QUALITY;
  const maxWidth = opts.maxWidth ?? DEFAULT_MAX_WIDTH;

  return new Promise<string>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('extractFirstFrame called server-side'));
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    // Keep the element off-screen and out of the DOM
    video.style.position = 'fixed';
    video.style.top = '-99999px';
    video.style.left = '-99999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';

    let settled = false;
    const cleanup = () => {
      try {
        video.removeAttribute('src');
        video.load();
      } catch {
        /* ignore */
      }
      video.onloadedmetadata = null;
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      if (video.parentNode) video.parentNode.removeChild(video);
    };

    const finish = (value: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(value);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(err);
    };

    const timer = setTimeout(() => fail(new Error('extractFirstFrame: timeout')), EXTRACT_TIMEOUT_MS);

    video.onloadedmetadata = () => {
      const targetTime = Math.min(seekSeconds, Math.max(0, (video.duration || 1) - 0.05));
      try {
        video.currentTime = targetTime;
      } catch (err) {
        fail(err instanceof Error ? err : new Error('seek failed'));
      }
    };

    video.onseeked = () => {
      try {
        const w = video.videoWidth || 0;
        const h = video.videoHeight || 0;
        if (!w || !h) {
          fail(new Error('video has no dimensions'));
          return;
        }
        const scale = w > maxWidth ? maxWidth / w : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fail(new Error('canvas 2d context unavailable'));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        finish(dataUrl);
      } catch (err) {
        fail(err instanceof Error ? err : new Error('frame capture failed'));
      }
    };

    video.onerror = () => fail(new Error('video element error'));

    document.body.appendChild(video);
    video.src = videoUrl;
  });
}

// ─── Signed URL fetch ────────────────────────────────────────────────────────

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_TTL_MS = 50 * 60 * 1000; // 50 min, slightly under backend 1h

export async function getSignedVideoUrl(id: string, signal?: AbortSignal): Promise<string | null> {
  const cached = signedUrlCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const res = await fetch(`/api/roast/${encodeURIComponent(id)}/video`, { signal });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const url = typeof data?.url === 'string' ? data.url : null;
  if (url) {
    signedUrlCache.set(id, { url, expiresAt: Date.now() + SIGNED_URL_TTL_MS });
  }
  return url;
}

// ─── React hook ──────────────────────────────────────────────────────────────

export type ThumbnailStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseVideoThumbnailResult {
  src: string | null;
  status: ThumbnailStatus;
  containerRef: (node: Element | null) => void;
}

/**
 * Lazily extracts (or reads from cache) the first-frame thumbnail for a given
 * roast id. Extraction runs only once the returned ref scrolls into view.
 *
 * Usage:
 *   const { src, status, containerRef } = useVideoThumbnail(entry.id);
 *   return <div ref={containerRef}>{src && <img src={src} />}</div>;
 */
export function useVideoThumbnail(id: string): UseVideoThumbnailResult {
  const [src, setSrc] = useState<string | null>(() => getCachedThumbnail(id));
  const [status, setStatus] = useState<ThumbnailStatus>(() =>
    getCachedThumbnail(id) ? 'ready' : 'idle'
  );
  const didStartRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    if (didStartRef.current) return;
    didStartRef.current = true;

    const cached = getCachedThumbnail(id);
    if (cached) {
      setSrc(cached);
      setStatus('ready');
      return;
    }

    setStatus('loading');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const videoUrl = await getSignedVideoUrl(id, controller.signal);
      if (controller.signal.aborted) return;
      if (!videoUrl) {
        setStatus('error');
        return;
      }
      const dataUrl = await extractFirstFrame(videoUrl);
      if (controller.signal.aborted) return;
      cacheThumbnail(id, dataUrl);
      setSrc(dataUrl);
      setStatus('ready');
    } catch (err) {
      if (controller.signal.aborted) return;
      console.warn(`[video-thumbnails] extraction failed for ${id}:`, err);
      setStatus('error');
    }
  };

  const containerRef = (node: Element | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node || didStartRef.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      void run();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io.disconnect();
            observerRef.current = null;
            void run();
            break;
          }
        }
      },
      { rootMargin: '200px' }
    );
    io.observe(node);
    observerRef.current = io;
  };

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { src, status, containerRef };
}
