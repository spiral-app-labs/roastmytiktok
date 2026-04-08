'use client';

import { useEffect, useState } from 'react';
import { AnalysisStageProgress, deriveAnalysisProgressPercent } from '@/components/upload/AnalysisStageProgress';

export default function AnalyzeLoading() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((current) => (current < 5 ? current + 1 : current));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden px-4 py-10">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-orange-500/12 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-pink-500/8 blur-[100px]" />
        <div className="absolute top-1/3 left-0 h-56 w-56 rounded-full bg-indigo-500/6 blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <AnalysisStageProgress
          activeIndex={activeStep}
          progressPercent={deriveAnalysisProgressPercent(activeStep)}
          eyebrow="Preparing analysis"
          title="Building your Go Viral diagnosis"
          description="The upload has been accepted. Next.js is loading the live analysis screen while the pipeline moves into frame extraction and scoring."
          liveDetail="Connecting to the live analysis stream..."
        />
      </div>
    </main>
  );
}
