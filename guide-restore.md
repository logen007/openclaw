# Hướng dẫn Restore OpenClaw từ Backup

> Trong trường hợp mất hết tất cả, cài lại từ đầu và restore.

---

## 📋 Yêu cầu

- Server/Linux (Ubuntu 20.04+, Debian 11+)
- Node.js v18+ (khuyến nghị v22)
- Google Drive backup (folder: `GG/OpenClaw Backup/`)
- Rclone (sẽ cài sau)

---

## 🔧 Bước 1: Cài Node.js

```bash
# Dùng nvm (khuyến nghị)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm alias default 22
```

## 🔧 Bước 2: Cài OpenClaw

```bash
npm install -g openclaw
```

## 🔧 Bước 3: Clone workspace từ GitHub

```bash
git clone https://github.com/logen007/openclaw.git ~/.openclaw/workspace
cd ~/.openclaw/workspace
npm install
```

## 🔧 Bước 4: Khởi tạo cấu trúc thư mục

```bash
mkdir -p ~/.openclaw/{state,credentials,agents,memory,media,cache,logs,skill-workshop}
chmod 700 ~/.openclaw/state
chmod 700 ~/.openclaw/credentials
```

## ☁️ Bước 5: Cài rclone & tải backup từ Google Drive

### Cài rclone

```bash
sudo -v && curl https://rclone.org/install.sh | sudo bash
```

### Cấu hình rclone

```bash
rclone config
```

Làm theo hướng dẫn:
- Chọn `n)` new remote
- Name: `gdrive`
- Type: `drive`
- Scope: chọn `1` (drive.file)
- Client ID/Secret: để trống
- Root folder ID: để trống
- OAuth: tự động mở browser, đăng nhập Google Drive → approve

### Liệt kê backup trên Drive

```bash
rclone ls gdrive:GG/OpenClaw\ Backup/
```

### Tải backup mới nhất về

```bash
rclone copy gdrive:GG/OpenClaw\ Backup/ ~/.openclaw/state/
```

### Giải nén

```bash
cd ~
# Dùng file mới nhất
tar xzf ~/.openclaw/state/openclaw-backup-$(date +%Y-%m-%d).tgz
# Hoặc chọn file cụ thể:
# tar xzf ~/.openclaw/state/openclaw-backup-2026-06-15.tgz
```

## 🔧 Bước 6: Cài lại credential

### Gmail

Tạo file `~/.openclaw/credentials/gmail-creds.json`:

```json
{
  "email": "tranc333@gmail.com",
  "appPassword": "...",
  "imap": { "host": "imap.gmail.com", "port": 993 },
  "smtp": { "host": "smtp.gmail.com", "port": 465 }
}
```

Lấy App Password tại: https://myaccount.google.com/apppasswords

### YouTube

```bash
node ~/.openclaw/workspace/scripts/youtube-oauth.mjs
```

Làm theo OAuth flow để cấp quyền.

### Telegram

File `telegram-pairing.json` và `telegram-default-allowFrom.json` được restore từ backup. Nếu mất, cần re-pair Telegram bot.

### Google Service Account

File `~/.openclaw/credentials/google-service-account.json` — **quan trọng nhất!**
Đã được backup trong archive. Kiểm tra sau restore.

## 🚀 Bước 7: Khởi động OpenClaw

```bash
openclaw gateway start
# Kiểm tra
openclaw status
```

Mở browser: http://localhost:7734

## 🔄 Bước 8: Kiểm tra cron jobs

Cron jobs đã được restore từ SQLite database. Kiểm tra:

```bash
openclaw cron list
```

## ✅ Hoàn tất!

Sau restore, OpenClaw sẽ có đầy đủ:

| Thành phần | Trạng thái |
|---|---|
| Workspace + scripts | ✅ Restore từ GitHub |
| Google Sheets (POD/Karaoke) | ✅ Service account |
| Gmail | ✅ App Password |
| YouTube playlist | ✅ OAuth |
| Telegram bot | ✅ Pairing |
| Cron jobs | ✅ Tự động |
| Memory + Skills | ✅ Restore |

---

## ⚠️ Lưu ý quan trọng

1. **Google Service Account** (`google-service-account.json`) là credential quan trọng nhất — nên copy riêng ra 1Password/Vault/file offline
2. **App Password Gmail** cần lấy lại tại https://myaccount.google.com/apppasswords nếu mất
3. **YouTube OAuth token** cần refresh nếu hết hạn (chạy lại script)
4. Các file trong `credentials/` có permission 700 — đảm bảo đúng sau restore
