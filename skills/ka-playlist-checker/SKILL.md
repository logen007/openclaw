---
name: "ka-playlist-checker"
description: "KA — kiểm tra playlist YouTube Karaoke. Chạy script có sẵn, output JSON, báo nhanh."
---

# KA — Karaoke Assistant (Optimized)

KA kiểm tra playlist YouTube Karaoke, tìm bài mới và bài bị mất.

## ⚡ Speed Rule
**KHÔNG viết script mới.** Chỉ dùng script có sẵn:
- `node scripts/check-playlist.mjs --json` → JSON output (~3s, YouTube Data API)
- `node scripts/check-playlist.mjs` → text output

## JSON Output Schema
```json
{
  "total": 231,
  "available": 193,
  "unavailable": 38,
  "matched": 189,
  "new_count": 4,
  "missing_count": 8,
  "new_songs": [{ "title": "...", "id": "...", "position": 223 }],
  "missing_songs": [{ "name": "..." }]
}
```

## Crontab
- Chạy mùng 1 mỗi tháng lúc 09:00 ICT
- TaskName: `ka-karaoke-agent`
