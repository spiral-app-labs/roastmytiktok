'use client';

import { useRef, useCallback, useState } from 'react';
import { RoastResult } from '@/lib/types';

type Variant = 'square' | 'story';

export function useScoreCardDownload(roast: RoastResult) {
  const squareRef = useRef<HTMLDivElement | null>(null);
  const storyRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState<Variant | null>(null);

  const download = useCallback(
    async (variant: Variant) => {
      const ref = variant === 'square' ? squareRef : storyRef;
      if (!ref.current) return;

      setDownloading(variant);
      try {
        const { toPng } = await import('html-to-image');
        const dataUrl = await toPng(ref.current, {
          cacheBust: true,
          pixelRatio: 1,
          // html-to-image skips nodes with this attribute
          filter: (node) => !(node instanceof Element && node.hasAttribute('data-html2canvas-ignore')),
        });

        const link = document.createElement('a');
        link.download = `go-viral-score-${roast.overallScore}${variant === 'story' ? '-story' : ''}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('[ScoreCard] download failed', err);
      } finally {
        setDownloading(null);
      }
    },
    [roast.overallScore]
  );

  return { squareRef, storyRef, download, downloading };
}
