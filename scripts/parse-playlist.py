#!/usr/bin/env python3
"""Extract video titles from YouTube playlist page source."""
import re, json, sys, urllib.request

url = "https://www.youtube.com/playlist?list=PLV4DMTjPQbc3bUMh0hel3zqogU9Vb-Kt7"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

try:
    with urllib.request.urlopen(req, timeout=15) as r:
        html = r.read().decode("utf-8", errors="replace")
except Exception as e:
    print(f"Fetch error: {e}")
    sys.exit(1)

# Find ytInitialData
patterns = [
    r'window\[["\']ytInitialData["\']\]\s*=\s*({.*?});',
    r'ytInitialData\s*=\s*({.*?});',
]
data = None
for p in patterns:
    m = re.search(p, html, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(1))
            break
        except:
            continue

if not data:
    print("Could not extract ytInitialData")
    sys.exit(1)

# Try to find video list in the data
def find_videos(obj, depth=0):
    if depth > 10:
        return []
    results = []
    if isinstance(obj, dict):
        if "playlistVideoRenderer" in obj:
            pvr = obj["playlistVideoRenderer"]
            title = ""
            tr = pvr.get("title", {})
            if isinstance(tr, dict):
                runs = tr.get("runs", [])
                if runs:
                    title = runs[0].get("text", "")
                else:
                    title = tr.get("simpleText", "")
            results.append(title or "NA")
        for v in obj.values():
            results.extend(find_videos(v, depth + 1))
    elif isinstance(obj, list):
        for item in obj:
            results.extend(find_videos(item, depth + 1))
    return results

titles = find_videos(data)

# Deduplicate
seen = set()
unique = []
for t in titles:
    if t not in seen:
        seen.add(t)
        unique.append(t)

print(f"Total videos found: {len(unique)}")
print()
for t in unique:
    print(t)
