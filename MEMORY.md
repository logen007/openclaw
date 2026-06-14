# MEMORY.md — Long-Term Memories

## 🔐 OAuth Google Rules
**MỖI LẦN OAuth với Google, LUÔN phải bao gồm đủ 3 scope:**
1. `drive.file` — Google Drive (backup rclone)
2. `spreadsheets` — Google Sheets (báo cáo, data)
3. `youtube` — YouTube (playlist, karaoke)
Không approve riêng lẻ từng cái.

⚠️ **Nguyên tắc:** Luôn phải bao gồm TẤT CẢ quyền đã được approve trước đó.
Nếu sau này thêm quyền mới (>3), lần OAuth tiếp theo cũng phải gộp chung cả quyền cũ + quyền mới.

## Self-Improving Agent
- Sub-agent chuyên audit, review và cải tiến hệ thống agents
- Review: MEMORY.md, AGENTS.md, SOUL.md, skills, scripts
- Đề xuất giải pháp tối ưu, tự động sửa nếu an toàn
- TaskName: `self-improving-agent`

### Audit Log (14/06/2026)
- **Fixed outdated karaoke sheet IDs** in 3 scripts (sync-karaoke-to-sheet, test-sheet-access, update-youtube-sheet)
- **Created shared JWT module** `scripts/sheets-jwt.mjs` — eliminated 100+ lines of boilerplate from brick-report & peek-sheet
- **Added .gitignore** for node_modules
- **Made brick-report.mjs accept DAY as CLI arg** instead of hardcoded
- **Backup concern:** Credentials archived to world-readable `/tmp/`, no Google Drive cleanup — flagged for review
- **Karaoke scripts:** `find-new.mjs` & `compare-playlist.mjs` depend on fragile temp files (/tmp/playlist-titles.txt, /tmp/playlist-ok.txt)

## KA — Karaoke Assistant
- Sub-agent chuyên check YouTube playlist Karaoke
- Script: `scripts/check-playlist.mjs`
- Cron: mùng 1 mỗi tháng lúc 09:00 ICT
- Playlist: https://www.youtube.com/playlist?list=PLV4DMTjPQbc3bUMh0hel3zqogU9Vb-Kt7
- TaskName: `ka-karaoke-agent`

## Gmail — Email (IMAP+SMTP)
- Email: `tranc333@gmail.com`
- Kết nối qua App Password
- Credentials file: `~/.openclaw/credentials/gmail-creds.json`
- Scripts:
  - `scripts/email-inbox.mjs [số_lượng]` — xem email gần nhất
  - `scripts/email-read.mjs <seq>` — đọc nội dung email
  - `scripts/email-send.mjs <to> <subject> [body]` — gửi email
- Module config: `scripts/email-config.mjs`
- Dependencies: nodemailer, imapflow

## Brick — Daily Sales Reporter
- Sub-agent chuyên báo cáo doanh thu POD
- Chỉ trả lời khi được gọi, báo cáo ngắn gọn
- Data từ Google Sheet ID: `1b41Q0HDaLwwBtBXXR38RVJh_eLigrXN6PYcteIYHhBM`
- Tính theo giờ Los Angeles (PT)
- TaskName: `brick-sales-agent`

## Backup OpenClaw
- Rclone remote `gdrive:` → Google Drive folder `GG/OpenClaw Backup/` (folder ID: `1AcGv06BFjB0wl7ROcutD65YSwHyBOC0f`)
- https://drive.google.com/drive/u/0/folders/1AcGv06BFjB0wl7ROcutD65YSwHyBOC0f
- Chạy 00:00 PT (07:00 UTC) mỗi ngày qua OpenClaw cron
- Giữ backup 7 ngày gần nhất
