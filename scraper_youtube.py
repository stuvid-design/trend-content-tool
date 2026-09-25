import os
import sys
import json
import time
import urllib.request
import urllib.error
import urllib.parse

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not (YOUTUBE_API_KEY and SUPABASE_URL and SUPABASE_KEY):
    print("Ada kredensial yang belum diisi di file .env")
    sys.exit(1)

MAX_PERCOBAAN = 3


def ambil_video():
    params = urllib.parse.urlencode({
        "part": "snippet,statistics",
        "chart": "mostPopular",
        "regionCode": "ID",
        "maxResults": 10,
        "key": YOUTUBE_API_KEY,
    })
    url = f"https://www.googleapis.com/youtube/v3/videos?{params}"

    for percobaan in range(1, MAX_PERCOBAAN + 1):
        try:
            with urllib.request.urlopen(url, timeout=20) as resp:
                return json.load(resp).get("items", [])
        except Exception as e:
            print(f"Percobaan {percobaan} gagal: {type(e).__name__}")
            if percobaan < MAX_PERCOBAAN:
                time.sleep(5 * percobaan)
    return None


def rapikan(items):
    baris = []
    for rank, item in enumerate(items, start=1):
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        video_id = item.get("id")
        baris.append({
            "keyword": snippet.get("title", "(tanpa judul)"),
            "source": "youtube",
            "region": "ID",
            "metadata": {
                "rank": rank,
                "view_count": int(stats.get("viewCount", 0)),
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "channel": snippet.get("channelTitle"),
                "published_at": snippet.get("publishedAt"),
            },
        })
    return baris


items = ambil_video()
if not items:
    print("Gagal mengambil data YouTube.")
    sys.exit(1)

baris = rapikan(items)

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    supabase.table("trending_items").insert(baris).execute()
except Exception as e:
    print("Gagal menyimpan ke Supabase:", type(e).__name__, e)
    sys.exit(1)

print(f"Berhasil menyimpan {len(baris)} video YouTube.")