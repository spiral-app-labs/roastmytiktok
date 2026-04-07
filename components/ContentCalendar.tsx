'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NicheCategory, NICHE_CATEGORIES } from '@/lib/niche-detect';
import { getPostingPlan, type PostingPlan, type DaySchedule, type TimeSlot } from '@/lib/posting-schedule';

const RANK_STYLES: Record<DaySchedule['rank'], { bg: string; border: string; label: string; dot: string }> = {
  best: { bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'text-green-400', dot: 'bg-green-400' },
  good: { bg: 'bg-yellow-500/8', border: 'border-yellow-500/20', label: 'text-yellow-400', dot: 'bg-yellow-400' },
  average: { bg: 'bg-zinc-800/40', border: 'border-zinc-700/30', label: 'text-zinc-500', dot: 'bg-zinc-500' },
};

const STRENGTH_STYLES: Record<TimeSlot['strength'], string> = {
  peak: 'bg-orange-500 text-white',
  good: 'bg-orange-500/30 text-orange-300',
  okay: 'bg-zinc-700/50 text-zinc-400',
};

// Track which days the user "posted" - stored in localStorage
function usePostingTracker() {
  const [postedDays, setPostedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rmt_posting_tracker');
      if (stored) setPostedDays(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  const toggleDay = (dateKey: string) => {
    setPostedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      try { localStorage.setItem('rmt_posting_tracker', JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  return { postedDays, toggleDay };
}

function getWeekDates(): { dateKey: string; dayShort: string; dayNum: number; isToday: boolean }[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((dayShort, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      dateKey: d.toISOString().split('T')[0],
      dayShort,
      dayNum: d.getDate(),
      isToday: d.toDateString() === now.toDateString(),
    };
  });
}

function getLast4Weeks(): { dateKey: string; dayNum: number; isToday: boolean }[][] {
  const now = new Date();
  const weeks: { dateKey: string; dayNum: number; isToday: boolean }[][] = [];
  const dayOfWeek = now.getDay();
  const startMonday = new Date(now);
  startMonday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) - 21); // 3 weeks back from this Monday

  for (let w = 0; w < 4; w++) {
    const week: { dateKey: string; dayNum: number; isToday: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startMonday);
      date.setDate(startMonday.getDate() + w * 7 + d);
      week.push({
        dateKey: date.toISOString().split('T')[0],
        dayNum: date.getDate(),
        isToday: date.toDateString() === now.toDateString(),
      });
    }
    weeks.push(week);
  }
  return weeks;
}

function NicheSelector({ selected, onChange }: { selected: NicheCategory; onChange: (n: NicheCategory) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {NICHE_CATEGORIES.map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
            selected === n
              ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25'
              : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:border-orange-500/30 hover:text-zinc-200'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function WeeklySchedule({ plan }: { plan: PostingPlan }) {
  return (
    <div className="space-y-2">
      {plan.bestDays.map((day, i) => {
        const style = RANK_STYLES[day.rank];
        return (
          <motion.div
            key={day.day}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`${style.bg} border ${style.border} rounded-xl p-3 flex items-center gap-3`}
          >
            <div className="w-12 shrink-0">
              <span className={`text-sm font-bold ${style.label}`}>{day.dayShort}</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} />
            <div className="flex flex-wrap gap-1.5">
              {day.slots.map(s => (
                <span
                  key={s.hour}
                  className={`${STRENGTH_STYLES[s.strength]} text-[11px] font-medium px-2 py-0.5 rounded-md`}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function PostingTracker({ plan }: { plan: PostingPlan }) {
  const { postedDays, toggleDay } = usePostingTracker();
  const weeks = getLast4Weeks();
  const currentWeek = getWeekDates();
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const totalThisWeek = currentWeek.filter(d => postedDays.has(d.dateKey)).length;
  const { min, max } = plan.frequency;
  const onTrack = totalThisWeek >= min;

  return (
    <div className="space-y-4">
      {/* This week's progress bar */}
      <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-400">This week</span>
          <span className={`text-sm font-bold ${onTrack ? 'text-green-400' : 'text-orange-400'}`}>
            {totalThisWeek}/{min}-{max} posts
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${onTrack ? 'bg-green-500' : 'bg-gradient-to-r from-orange-500 to-pink-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((totalThisWeek / max) * 100, 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* 4-week grid */}
      <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-3 font-medium">Last 4 weeks - tap to log posts</p>
        <div className="space-y-1.5">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-1">
            {dayLabels.map((label, i) => (
              <span key={i} className="text-[10px] text-zinc-600 text-center font-medium">{label}</span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1.5">
              {week.map(day => {
                const posted = postedDays.has(day.dateKey);
                return (
                  <button
                    key={day.dateKey}
                    onClick={() => toggleDay(day.dateKey)}
                    className={`aspect-square rounded-lg text-[10px] font-medium flex items-center justify-center transition-all ${
                      posted
                        ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-sm shadow-orange-500/30'
                        : day.isToday
                          ? 'bg-zinc-700/60 text-white border border-orange-500/40'
                          : 'bg-zinc-800/40 text-zinc-600 hover:bg-zinc-700/50 hover:text-zinc-400'
                    }`}
                    title={day.dateKey}
                  >
                    {day.dayNum}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ContentCalendar({ initialNiche }: { initialNiche?: NicheCategory }) {
  const [niche, setNiche] = useState<NicheCategory>(initialNiche ?? 'comedy');
  const [plan, setPlan] = useState<PostingPlan>(() => getPostingPlan(initialNiche ?? 'comedy'));

  useEffect(() => {
    setPlan(getPostingPlan(niche));
  }, [niche]);

  return (
    <div className="space-y-6">
      {/* Niche picker */}
      <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-zinc-300 mb-3">Select your niche</h3>
        <NicheSelector selected={niche} onChange={setNiche} />
      </div>

      {/* Frequency recommendation */}
      <motion.div
        key={`freq-${niche}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl font-black bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
            {plan.frequency.label}
          </span>
          <span className="text-zinc-400 text-sm">recommended for <span className="text-white capitalize font-medium">{niche}</span></span>
        </div>
        <p className="text-zinc-500 text-xs">Consistency beats virality. Regular posting trains the algorithm to push your content.</p>
      </motion.div>

      {/* Two-column layout on desktop */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly schedule */}
        <div>
          <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-[10px]">&#128197;</span>
            Best posting times
          </h3>
          <div className="flex items-center gap-4 text-[10px] text-zinc-500 mb-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Best day</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Good day</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500" /> Average</span>
          </div>
          <WeeklySchedule plan={plan} />
        </div>

        {/* Posting tracker */}
        <div>
          <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-[10px]">&#128293;</span>
            Posting streak
          </h3>
          <PostingTracker plan={plan} />
        </div>
      </div>

      {/* Niche tips */}
      <motion.div
        key={`tips-${niche}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/70 border border-zinc-800/60 rounded-2xl p-5"
      >
        <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-[10px]">&#128161;</span>
          {niche} scheduling tips
        </h3>
        <ul className="space-y-2">
          {plan.tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-orange-400 shrink-0 mt-0.5">&#8226;</span>
              <span className="text-zinc-300">{tip}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
