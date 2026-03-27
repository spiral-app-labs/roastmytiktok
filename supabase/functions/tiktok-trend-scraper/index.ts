import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface TrendingItem {
  category?: string;
  description?: string;
  view_count?: number;
  like_count?: number;
  audio_title?: string;
  hashtags?: string[];
  hook_text?: string;
  duration_sec?: number;
  video_url?: string;
  author_username?: string;
}

function parseTikTokResponse(data: Record<string, unknown>): TrendingItem[] {
  const items: TrendingItem[] = [];

  // Handle TikTok explore API response format
  const itemList = (data.itemList ?? data.items ?? []) as Record<string, unknown>[];

  for (const item of itemList) {
    const desc = (item.desc ?? item.description ?? "") as string;
    const stats = (item.stats ?? {}) as Record<string, number>;
    const music = (item.music ?? {}) as Record<string, unknown>;
    const video = (item.video ?? {}) as Record<string, unknown>;
    const author = (item.author ?? {}) as Record<string, string>;

    // Extract hashtags from description
    const hashtagMatches = desc.match(/#\w+/g) ?? [];

    // Extract hook text: first line or first ~100 chars before hashtags
    const hookText = desc.split("\n")[0].replace(/#\w+/g, "").trim().slice(0, 100) || undefined;

    items.push({
      category: (item.categoryType as string) ?? undefined,
      description: desc || undefined,
      view_count: stats.playCount ?? stats.viewCount ?? undefined,
      like_count: stats.diggCount ?? stats.likeCount ?? undefined,
      audio_title: (music.title as string) ?? undefined,
      hashtags: hashtagMatches.length > 0 ? hashtagMatches : undefined,
      hook_text: hookText,
      duration_sec: (video.duration as number) ?? undefined,
      video_url: item.id ? `https://www.tiktok.com/@${author.uniqueId ?? "unknown"}/video/${item.id}` : undefined,
      author_username: author.uniqueId ?? undefined,
    });
  }

  return items;
}

async function fetchTrending(): Promise<{ items: TrendingItem[]; raw: unknown }> {
  // Try multiple TikTok trending endpoints
  const endpoints = [
    "https://www.tiktok.com/api/explore/item_list/?categoryType=1&count=20",
    "https://www.tiktok.com/api/explore/item_list/?categoryType=0&count=20",
  ];

  for (const url of endpoints) {
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://www.tiktok.com/explore",
        },
      });

      if (!resp.ok) {
        console.log(`[scraper] ${url} returned ${resp.status}, trying next...`);
        continue;
      }

      const data = await resp.json();
      const items = parseTikTokResponse(data);

      if (items.length > 0) {
        return { items, raw: data };
      }

      console.log(`[scraper] ${url} returned 0 items, trying next...`);
    } catch (err) {
      console.error(`[scraper] Error fetching ${url}:`, err);
    }
  }

  return { items: [], raw: null };
}

Deno.serve(async (_req) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase credentials", inserted: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch trending content
    console.log("[scraper] Fetching trending TikTok content...");
    const { items, raw } = await fetchTrending();

    if (items.length === 0) {
      console.log("[scraper] No trending items fetched");
      return new Response(
        JSON.stringify({ error: "No trending items returned from TikTok", fetched: 0, inserted: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(`[scraper] Fetched ${items.length} trending items`);

    // Get today's existing video_urls to deduplicate
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existing } = await supabase
      .from("tmt_trending_content")
      .select("video_url")
      .gte("fetched_at", today.toISOString());

    const existingUrls = new Set((existing ?? []).map((r: { video_url: string }) => r.video_url));

    // Filter out duplicates
    const newItems = items.filter((item) => item.video_url && !existingUrls.has(item.video_url));

    if (newItems.length === 0) {
      return new Response(
        JSON.stringify({ fetched: items.length, inserted: 0, message: "All items already exist for today" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Insert new items
    const rows = newItems.map((item) => ({
      category: item.category,
      description: item.description,
      view_count: item.view_count,
      like_count: item.like_count,
      audio_title: item.audio_title,
      hashtags: item.hashtags ?? [],
      hook_text: item.hook_text,
      duration_sec: item.duration_sec,
      video_url: item.video_url,
      author_username: item.author_username,
      raw_data: raw,
    }));

    const { error } = await supabase.from("tmt_trending_content").insert(rows);

    if (error) {
      console.error("[scraper] Insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message, fetched: items.length, inserted: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(`[scraper] Inserted ${newItems.length} new trending items`);
    return new Response(
      JSON.stringify({ fetched: items.length, inserted: newItems.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[scraper] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: String(err), inserted: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
});
