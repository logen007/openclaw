#!/bin/bash
# Brick Backup — OpenClaw daily backup script
# Chạy 00:00 PT (07:00 UTC) mỗi ngày

BACKUP_DIR="$HOME/.openclaw/state"
BACKUP_NAME="openclaw-backup-$(date +'%Y-%m-%d')"
ARCHIVE="${BACKUP_DIR}/${BACKUP_NAME}.tgz"
RCLONE_DEST="gdrive:GG/OpenClaw Backup/"

# Exit silently if rclone remote not configured
if ! rclone listremotes 2>/dev/null | grep -q "^gdrive:"; then
    echo "gdrive remote not configured" >&2
    exit 0
fi

# Ensure backup dir exists
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# 1. Nén ~/.openclaw/
tar czf "$ARCHIVE" -C ~ .openclaw/
chmod 600 "$ARCHIVE"

# 2. Upload lên Google Drive
rclone copy "$ARCHIVE" "$RCLONE_DEST" 2>&1
RC=$?

# 3. Xoá file tạm cũ hơn 7 ngày
find "$BACKUP_DIR" -name 'openclaw-backup-*' -mtime +7 -delete 2>/dev/null

# 4. Xoá backup cũ trên Drive — giữ 7 bản gần nhất
if [ $RC -eq 0 ]; then
    rclone lsjson "$RCLONE_DEST" --no-modtime --no-mimetype 2>/dev/null | \
        python3 -c "
import json, sys
backups = json.load(sys.stdin)
backups.sort(key=lambda x: x['Name'])
for b in backups[:-7]:
    print(b['Name'])
" 2>/dev/null | while read -r old; do
        rclone deletefile "$RCLONE_DEST$old" 2>/dev/null
        echo "   🗑️ Xoá backup cũ: $old"
    done
fi

if [ $RC -eq 0 ]; then
    echo "✅ Backup thành công: $ARCHIVE"
else
    echo "❌ Backup thất bại"
fi
exit $RC
