import os
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

from dotenv import load_dotenv
from supabase import create_client

URL = "https://trends.google.com/trending/rss?geo=ID&hl=id"
NS = {"ht": "https://trends.google.com/trending/rss"}
SOURCE = "google_trends"
REGION = "ID"


def ambil_feed(percobaan=3):
    for n in range(1, percobaan + 1):
        try:
            req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception as e:
            print(f"Percobaan {n}/{percobaan} gagal: {e}")
            if n < percobaan:
                time.sleep(5 * n)
    raise RuntimeError("Gagal mengambil feed setelah beberapa percobaan")


def olah_feed(data):
    root = ET.fromstring(data)
    baris = []
    for rank, item in enumerate(root.findall("./channel/item"), 1):
        kata_kunci = item.findtext("title")
        if not kata_kunci:
            continue
        try:
            waktu = parsedate_to_datetime(item.findtext("pubDate")).isoformat()
        except Exception:
            waktu = None
        berita = []
        for b in item.findall("ht:news_item", NS)[:3]:
            berita.append({
                "title": b.findtext("ht:news_item_title", namespaces=NS),
                "url": b.findtext("ht:news_item_url", namespaces=NS),
                "source": b.findtext("ht:news_item_source", namespaces=NS),
            })
        baris.append({
            "keyword": kata_kunci,
            "source": SOURCE,
            "region": REGION,
            "metadata": {
                "rank": rank,
                "approx_traffic": item.findtext("ht:approx_traffic", namespaces=NS),
                "published_at": waktu,
                "news": berita,
            },
        })
    return baris


def main():
    load_dotenv()
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_KEY belum diisi")

    data = ambil_feed()
    baris = olah_feed(data)
    if not baris:
        raise RuntimeError("Feed terbaca tapi isinya kosong")

    supabase = create_client(url, key)
    supabase.table("trending_items").insert(baris).execute()
    print(f"Berhasil menyimpan {len(baris)} kata kunci Google Trends.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"GAGAL: {e}")
        sys.exit(1)
