#!/usr/bin/env python3
"""
RoastMyTikTok — TikTok Video Analysis Pipeline
Downloads a TikTok video, extracts frames, analyzes with GPT-4o Vision,
transcribes audio, and outputs 100+ structured data points as JSON.

Usage: python analyze_tiktok.py <tiktok_url>
"""

import sys
import os
import json
import subprocess
import tempfile
import glob
import base64
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    print(json.dumps({"error": "openai package not installed. Run: pip install openai"}))
    sys.exit(1)


def download_video(url: str, output_dir: str) -> dict:
    """Download TikTok video with yt-dlp and extract metadata."""
    video_path = os.path.join(output_dir, "video.mp4")
    info_path = os.path.join(output_dir, "info.json")

    # Download video + metadata
    cmd = [
        "yt-dlp",
        "--no-warnings",
        "-f", "best",
        "-o", video_path,
        "--write-info-json",
        "--write-subs",
        "--sub-langs", "en",
        "--no-playlist",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {result.stderr}")

    # Load metadata
    # yt-dlp writes info json with .info.json suffix
    info_files = glob.glob(os.path.join(output_dir, "*.info.json"))
    metadata = {}
    if info_files:
        with open(info_files[0]) as f:
            metadata = json.load(f)

    return {
        "video_path": video_path,
        "metadata": {
            "title": metadata.get("title", ""),
            "description": metadata.get("description", ""),
            "views": metadata.get("view_count", 0),
            "likes": metadata.get("like_count", 0),
            "comments": metadata.get("comment_count", 0),
            "shares": metadata.get("repost_count", 0),
            "duration": metadata.get("duration", 0),
            "uploader": metadata.get("uploader", ""),
            "upload_date": metadata.get("upload_date", ""),
            "hashtags": metadata.get("tags", []),
            "music": metadata.get("track", ""),
            "music_artist": metadata.get("artist", ""),
        },
    }


def extract_frames(video_path: str, output_dir: str, interval: float = 2.0) -> list[str]:
    """Extract frames from video every N seconds using ffmpeg."""
    frames_dir = os.path.join(output_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vf", f"fps=1/{interval}",
        "-q:v", "2",
        os.path.join(frames_dir, "frame_%04d.jpg"),
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=60)

    frames = sorted(glob.glob(os.path.join(frames_dir, "*.jpg")))
    return frames


def encode_image_base64(image_path: str) -> str:
    """Encode image to base64 for API call."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def analyze_frame(client: OpenAI, image_path: str, frame_index: int) -> dict:
    """Analyze a single frame with GPT-4o Vision."""
    b64 = encode_image_base64(image_path)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a TikTok video analyst. Analyze this frame and return ONLY valid JSON "
                    "with these fields: text_on_screen (string), visual_appeal (1-10), brightness (1-10), "
                    "color_palette (array of dominant colors), composition_score (1-10), face_detected (bool), "
                    "emotion_detected (string or null), text_readability (1-10 or null if no text), "
                    "background_complexity (1-10), brand_elements (array of strings), hook_strength (1-10), "
                    "description (string, 1-2 sentences describing what's shown)."
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Analyze frame {frame_index + 1} of this TikTok video:"},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                    },
                ],
            },
        ],
        max_tokens=500,
        temperature=0.3,
    )

    try:
        text = response.choices[0].message.content or "{}"
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return {"error": "Failed to parse frame analysis", "raw": text}


def transcribe_audio(video_path: str, output_dir: str) -> str:
    """Extract and transcribe audio using whisper."""
    audio_path = os.path.join(output_dir, "audio.mp3")

    # Extract audio with ffmpeg
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vn", "-acodec", "libmp3lame", "-q:a", "4",
        audio_path,
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=60)

    if not os.path.exists(audio_path):
        return ""

    # Try whisper transcription via OpenAI API
    try:
        client = OpenAI()
        with open(audio_path, "rb") as f:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
            )
        return transcript.text
    except Exception as e:
        return f"[transcription failed: {e}]"


def compute_aggregates(frame_analyses: list[dict], metadata: dict, transcript: str) -> dict:
    """Compute aggregate metrics across all frames for 100+ data points."""
    valid_frames = [f for f in frame_analyses if "error" not in f]
    n = len(valid_frames) or 1

    def avg(key: str) -> float:
        vals = [f.get(key, 0) for f in valid_frames if isinstance(f.get(key), (int, float))]
        return round(sum(vals) / len(vals), 2) if vals else 0

    faces = [f for f in valid_frames if f.get("face_detected")]
    texts = [f for f in valid_frames if f.get("text_on_screen")]
    all_colors = []
    for f in valid_frames:
        all_colors.extend(f.get("color_palette", []))

    # Count unique colors
    unique_colors = list(set(all_colors))[:10]

    # Engagement rate
    views = metadata.get("views", 0) or 1
    engagement_rate = round(
        ((metadata.get("likes", 0) + metadata.get("comments", 0) + metadata.get("shares", 0))
         / views) * 100, 2
    )

    # Word count from transcript
    words = transcript.split() if transcript else []
    duration = metadata.get("duration", 1) or 1
    wpm = round(len(words) / (duration / 60), 1) if duration > 0 else 0

    return {
        # Frame-level aggregates
        "total_frames_analyzed": len(valid_frames),
        "avg_visual_appeal": avg("visual_appeal"),
        "avg_brightness": avg("brightness"),
        "avg_composition_score": avg("composition_score"),
        "avg_background_complexity": avg("background_complexity"),
        "avg_hook_strength": avg("hook_strength"),
        "avg_text_readability": avg("text_readability"),
        "face_time_percentage": round(len(faces) / n * 100, 1),
        "text_density_percentage": round(len(texts) / n * 100, 1),
        "dominant_colors": unique_colors,
        "scene_count": n,  # Simplified; could do scene detection
        "has_face": len(faces) > 0,
        "emotions_detected": list(set(
            f.get("emotion_detected", "") for f in valid_frames
            if f.get("emotion_detected")
        )),
        "brand_elements_found": list(set(
            el for f in valid_frames for el in f.get("brand_elements", [])
        )),

        # Metadata aggregates
        "views": metadata.get("views", 0),
        "likes": metadata.get("likes", 0),
        "comments": metadata.get("comments", 0),
        "shares": metadata.get("shares", 0),
        "duration_seconds": metadata.get("duration", 0),
        "engagement_rate": engagement_rate,
        "hashtag_count": len(metadata.get("hashtags", [])),
        "hashtags": metadata.get("hashtags", []),
        "description_length": len(metadata.get("description", "")),
        "description": metadata.get("description", ""),
        "uploader": metadata.get("uploader", ""),
        "upload_date": metadata.get("upload_date", ""),
        "music_track": metadata.get("music", ""),
        "music_artist": metadata.get("music_artist", ""),
        "has_music": bool(metadata.get("music")),

        # Audio/transcript aggregates
        "transcript": transcript,
        "transcript_word_count": len(words),
        "words_per_minute": wpm,
        "has_speech": len(words) > 5,

        # Derived scores
        "hook_score_first_frame": (
            valid_frames[0].get("hook_strength", 0) if valid_frames else 0
        ),
        "visual_consistency": (
            round(max(0, 10 - (max(
                f.get("visual_appeal", 5) for f in valid_frames
            ) - min(
                f.get("visual_appeal", 5) for f in valid_frames
            ))), 1) if valid_frames else 0
        ),
        "thumbnail_potential": (
            valid_frames[0].get("visual_appeal", 0) if valid_frames else 0
        ),
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python analyze_tiktok.py <tiktok_url>"}))
        sys.exit(1)

    tiktok_url = sys.argv[1]

    with tempfile.TemporaryDirectory(prefix="roast_") as tmpdir:
        print(json.dumps({"status": "downloading"}), flush=True)
        dl = download_video(tiktok_url, tmpdir)

        print(json.dumps({"status": "extracting_frames"}), flush=True)
        frames = extract_frames(dl["video_path"], tmpdir, interval=2.0)

        print(json.dumps({"status": "transcribing_audio"}), flush=True)
        transcript = transcribe_audio(dl["video_path"], tmpdir)

        print(json.dumps({"status": "analyzing_frames", "frame_count": len(frames)}), flush=True)
        client = OpenAI()
        frame_analyses = []
        for i, frame_path in enumerate(frames):
            analysis = analyze_frame(client, frame_path, i)
            frame_analyses.append(analysis)

        print(json.dumps({"status": "computing_aggregates"}), flush=True)
        aggregates = compute_aggregates(frame_analyses, dl["metadata"], transcript)

        # Final output
        result = {
            "status": "complete",
            "url": tiktok_url,
            "frame_analyses": frame_analyses,
            "aggregates": aggregates,
            "data_point_count": (
                len(frame_analyses) * 12  # 12 fields per frame
                + len(aggregates)  # aggregate fields
            ),
        }

        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
