'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import UnifiedUploadFlow from '@/components/upload/UnifiedUploadFlow';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UploadModal({ open, onClose }: UploadModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Upload a video"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full max-w-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close upload"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <UnifiedUploadFlow variant="compact" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
