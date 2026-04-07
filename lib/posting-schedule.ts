import { NicheCategory } from './niche-detect';

export interface TimeSlot {
  hour: number; // 0-23
  label: string; // e.g. "7:00 AM"
  strength: 'peak' | 'good' | 'okay';
}

export interface DaySchedule {
  day: string;
  dayShort: string;
  rank: 'best' | 'good' | 'average';
  slots: TimeSlot[];
}

export interface PostingPlan {
  niche: NicheCategory;
  frequency: { min: number; max: number; label: string };
  bestDays: DaySchedule[];
  tips: string[];
}

function slot(hour: number, strength: TimeSlot['strength']): TimeSlot {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return { hour, label: `${h}:00 ${ampm}`, strength };
}

// Research-backed posting time data per niche.
// Sources: Hootsuite 2024, Later 2024, Sprout Social 2024, Buffer research.
const NICHE_SCHEDULES: Record<NicheCategory, {
  peakDays: string[];
  goodDays: string[];
  peakHours: number[];
  goodHours: number[];
  okayHours: number[];
  frequency: { min: number; max: number; label: string };
  tips: string[];
}> = {
  comedy: {
    peakDays: ['Tuesday', 'Thursday', 'Friday'],
    goodDays: ['Wednesday', 'Saturday'],
    peakHours: [12, 19, 21],
    goodHours: [10, 15, 20],
    okayHours: [8, 17],
    frequency: { min: 4, max: 7, label: '4-7x/week' },
    tips: [
      'Post during lunch breaks and evening wind-down for max shares',
      'Friday evenings get the most shares - people send comedy to friends',
      'Trending sounds peak within 48 hrs - post fast when you spot one',
    ],
  },
  education: {
    peakDays: ['Tuesday', 'Wednesday', 'Thursday'],
    goodDays: ['Monday', 'Sunday'],
    peakHours: [7, 11, 16],
    goodHours: [9, 14, 19],
    okayHours: [6, 20],
    frequency: { min: 3, max: 5, label: '3-5x/week' },
    tips: [
      'Morning posts get saved more - people bookmark during commutes',
      'Midweek performs best; weekends dip for educational content',
      'Series-style content (Part 1, 2, 3) boosts saves and follows',
    ],
  },
  lifestyle: {
    peakDays: ['Monday', 'Wednesday', 'Friday'],
    goodDays: ['Sunday', 'Thursday'],
    peakHours: [7, 12, 19],
    goodHours: [9, 15, 21],
    okayHours: [8, 17],
    frequency: { min: 4, max: 6, label: '4-6x/week' },
    tips: [
      'Monday morning routines perform well - people seek motivation',
      'GRWM content peaks between 7-9 AM when your audience is getting ready',
      'Sunday evening "weekly reset" content gets high saves',
    ],
  },
  fitness: {
    peakDays: ['Monday', 'Tuesday', 'Wednesday'],
    goodDays: ['Thursday', 'Sunday'],
    peakHours: [6, 12, 17],
    goodHours: [7, 16, 19],
    okayHours: [5, 20],
    frequency: { min: 4, max: 6, label: '4-6x/week' },
    tips: [
      'Early morning posts catch pre-workout scrollers (5-7 AM)',
      'Monday is the biggest day - "new week new me" energy',
      'Post workout tutorials before typical gym hours in your timezone',
    ],
  },
  beauty: {
    peakDays: ['Tuesday', 'Thursday', 'Saturday'],
    goodDays: ['Wednesday', 'Friday'],
    peakHours: [10, 14, 19],
    goodHours: [8, 12, 21],
    okayHours: [7, 16],
    frequency: { min: 4, max: 6, label: '4-6x/week' },
    tips: [
      'Saturday mornings are prime for GRWM and tutorial content',
      'New product launches? Post the same day for algorithm boost',
      'Evening posts (7-9 PM) catch the nighttime skincare routine crowd',
    ],
  },
  tech: {
    peakDays: ['Tuesday', 'Wednesday', 'Thursday'],
    goodDays: ['Monday', 'Friday'],
    peakHours: [9, 12, 18],
    goodHours: [7, 15, 20],
    okayHours: [8, 21],
    frequency: { min: 3, max: 5, label: '3-5x/week' },
    tips: [
      'Weekday lunch breaks are peak - tech workers scroll at noon',
      'Product launch days: post immediately for discovery boost',
      'Coding tutorials perform better posted before work hours (7-9 AM)',
    ],
  },
  food: {
    peakDays: ['Wednesday', 'Friday', 'Sunday'],
    goodDays: ['Tuesday', 'Saturday'],
    peakHours: [11, 17, 19],
    goodHours: [8, 12, 20],
    okayHours: [7, 15],
    frequency: { min: 4, max: 7, label: '4-7x/week' },
    tips: [
      'Post recipes 1-2 hours before meal times for max engagement',
      'Sunday meal-prep content is a save machine',
      'Friday evening "what to cook" content catches weekend planners',
    ],
  },
  finance: {
    peakDays: ['Tuesday', 'Wednesday', 'Thursday'],
    goodDays: ['Monday', 'Sunday'],
    peakHours: [7, 12, 18],
    goodHours: [9, 15, 20],
    okayHours: [6, 21],
    frequency: { min: 3, max: 5, label: '3-5x/week' },
    tips: [
      'Market-hours content (9 AM-4 PM) gets higher engagement on weekdays',
      'Sunday evening "weekly finance tip" builds routine audiences',
      'Tax season and earnings week = post more frequently',
    ],
  },
  travel: {
    peakDays: ['Thursday', 'Friday', 'Sunday'],
    goodDays: ['Wednesday', 'Saturday'],
    peakHours: [10, 14, 20],
    goodHours: [8, 12, 19],
    okayHours: [7, 17],
    frequency: { min: 3, max: 5, label: '3-5x/week' },
    tips: [
      'Thursday/Friday posts catch weekend trip planners',
      'Sunday evening wanderlust content gets massive saves',
      'Post destination content during the destination\'s peak season',
    ],
  },
  gaming: {
    peakDays: ['Friday', 'Saturday', 'Sunday'],
    goodDays: ['Thursday', 'Wednesday'],
    peakHours: [15, 19, 22],
    goodHours: [12, 17, 21],
    okayHours: [10, 23],
    frequency: { min: 5, max: 7, label: '5-7x/week' },
    tips: [
      'Weekend evenings are prime gaming time - post when gamers are online',
      'New game releases = immediate content for algorithm boost',
      'Late night posts (10 PM+) still perform well for gaming audiences',
    ],
  },
  parenting: {
    peakDays: ['Tuesday', 'Thursday', 'Saturday'],
    goodDays: ['Monday', 'Wednesday'],
    peakHours: [9, 12, 20],
    goodHours: [7, 14, 21],
    okayHours: [6, 19],
    frequency: { min: 3, max: 5, label: '3-5x/week' },
    tips: [
      'Post during naptime (12-2 PM) when parents scroll',
      'Evening posts (8-10 PM) catch the after-bedtime crowd',
      'Relatable Monday morning content performs especially well',
    ],
  },
  fashion: {
    peakDays: ['Tuesday', 'Thursday', 'Saturday'],
    goodDays: ['Wednesday', 'Friday'],
    peakHours: [10, 14, 19],
    goodHours: [8, 12, 21],
    okayHours: [9, 17],
    frequency: { min: 4, max: 6, label: '4-6x/week' },
    tips: [
      'Saturday content catches weekend shopping intent',
      'OOTD posts perform best in the morning when people are deciding what to wear',
      'Seasonal transition content (fall fits, summer looks) peaks at season change',
    ],
  },
  pets: {
    peakDays: ['Monday', 'Wednesday', 'Saturday'],
    goodDays: ['Tuesday', 'Sunday'],
    peakHours: [8, 12, 19],
    goodHours: [7, 15, 21],
    okayHours: [10, 17],
    frequency: { min: 5, max: 7, label: '5-7x/week' },
    tips: [
      'Cute pet content is evergreen - consistency matters more than timing',
      'Morning posts catch commuters looking for serotonin boosts',
      'Monday blues = peak cute pet content engagement',
    ],
  },
  diy: {
    peakDays: ['Saturday', 'Sunday', 'Wednesday'],
    goodDays: ['Friday', 'Thursday'],
    peakHours: [9, 14, 19],
    goodHours: [7, 11, 20],
    okayHours: [8, 17],
    frequency: { min: 3, max: 5, label: '3-5x/week' },
    tips: [
      'Weekend mornings are prime - people plan DIY projects on weekends',
      'Before/After content always outperforms step-by-step alone',
      'Wednesday posts catch mid-week hobby scrollers',
    ],
  },
  music: {
    peakDays: ['Friday', 'Saturday', 'Thursday'],
    goodDays: ['Wednesday', 'Sunday'],
    peakHours: [12, 18, 21],
    goodHours: [10, 15, 20],
    okayHours: [9, 22],
    frequency: { min: 4, max: 7, label: '4-7x/week' },
    tips: [
      'Friday is music discovery day - new music Fridays are real on TikTok too',
      'Evening posts catch people building playlists and vibing',
      'Cover/remix trending sounds within 24 hours for max discoverability',
    ],
  },
};

const ALL_DAYS = [
  { day: 'Monday', dayShort: 'Mon' },
  { day: 'Tuesday', dayShort: 'Tue' },
  { day: 'Wednesday', dayShort: 'Wed' },
  { day: 'Thursday', dayShort: 'Thu' },
  { day: 'Friday', dayShort: 'Fri' },
  { day: 'Saturday', dayShort: 'Sat' },
  { day: 'Sunday', dayShort: 'Sun' },
];

export function getPostingPlan(niche: NicheCategory): PostingPlan {
  const config = NICHE_SCHEDULES[niche];

  const bestDays: DaySchedule[] = ALL_DAYS.map(({ day, dayShort }) => {
    const rank: DaySchedule['rank'] = config.peakDays.includes(day)
      ? 'best'
      : config.goodDays.includes(day)
        ? 'good'
        : 'average';

    const slots: TimeSlot[] = [
      ...config.peakHours.map(h => slot(h, 'peak')),
      ...config.goodHours.map(h => slot(h, 'good')),
      ...config.okayHours.map(h => slot(h, 'okay')),
    ].sort((a, b) => a.hour - b.hour);

    return { day, dayShort, rank, slots };
  });

  return {
    niche,
    frequency: config.frequency,
    bestDays,
    tips: config.tips,
  };
}
