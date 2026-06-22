#!/bin/bash
# Disk Cleanup — chạy mỗi thứ 5 hàng tuần
# Chỉ dọn cache, log, tạm thời — không auto remove gói

echo "🧹 Disk Cleanup — $(date '+%Y-%m-%d %H:%M %Z')"

BEFORE=$(df -h / | tail -1 | awk '{print $5, $4}')

# 1. Dọn package cache — không xoá gói
sudo apt-get autoclean -y 2>&1 | tail -1
sudo apt-get autoremove -y 2>&1 | tail -1

# 2. Dọn journal log cũ (giữ 3 ngày)
sudo journalctl --vacuum-time=3d 2>&1 | tail -1

# 3. Dọn npm cache
npm cache clean --force 2>&1 | tail -1

# 4. Dọn /tmp cũ (file >7 ngày không truy cập)
sudo find /tmp -type f -atime +7 -delete 2>/dev/null

# 5. Dọn apt list cache
sudo rm -rf /var/lib/apt/lists/* 2>/dev/null

# 6. Dọn thumbnail cache nếu có
rm -rf ~/.thumbnails/* 2>/dev/null
rm -rf ~/.cache/thumbnails/* 2>/dev/null

echo ""
echo "📊 Trước: $BEFORE"
echo "📊 Sau:  $(df -h / | tail -1 | awk '{print $5, $4}')"
echo "✅ Done"
