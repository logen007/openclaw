#!/usr/bin/env python3
"""Fetch full YouTube playlist and update sheet with video IDs."""
import json, urllib.request, urllib.parse, time
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession

API_KEY = '***'
PLIST_ID = 'PLV4DMTjPQbc3bUMh0hel3zqogU9Vb-Kt7'

all_videos = []
page_token = None

while True:
    params = {'part': 'snippet', 'maxResults': 50, 'playlistId': PLIST_ID, 'key': API_KEY}
    if page_token:
        params['pageToken'] = page_token
    
    url = f"https://www.googleapis.com/youtube/v3/playlistItems?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=15) as r:
        data = json.loads(r.read())
    
    for item in data.get('items', []):
        s = item.get('snippet', {})
        title = s.get('title', 'NA')
        vid = s.get('resourceId', {}).get('videoId', '')
        all_videos.append((s.get('position', 0), title, vid))
    
    page_token = data.get('nextPageToken')
    if not page_token:
        break
    time.sleep(0.3)

all_videos.sort()
print(f"✅ Total: {len(all_videos)} videos")

# Sheet data: Song | Available | Note | Video ID
rows = [['Song', 'Available', 'Note', 'Video ID']]
for pos, title, vid in all_videos:
    if title == 'Deleted video':
        rows.append(['[Deleted]', 'NO', 'Removed from YouTube', vid])
    elif title == 'Private video':
        rows.append(['[Private]', 'NO', 'Private video', vid])
    else:
        rows.append([title, '', '', vid])

real = len([r for r in rows[1:] if r[1] != 'NO'])
deleted = len([r for r in rows[1:] if r[0] == '[Deleted]'])
private = len([r for r in rows[1:] if r[0] == '[Private]'])
print(f"Real: {real}, Deleted: {deleted}, Private: {private}")

# Write to sheet
sa_key = json.load(open('/home/openclaw/.openclaw/credentials/google-service-account.json'))
creds = service_account.Credentials.from_service_account_info(
    sa_key, scopes=['https://www.googleapis.com/auth/spreadsheets'])
session = AuthorizedSession(creds)

SID = '1QSJHCx1MLOBIjHDhCqeIukYmj5AtDGOvaizrnKLCtog'
session.post(f'https://sheets.googleapis.com/v4/spreadsheets/{SID}/values/PlayList!A:D/clear')
session.put(
    f'https://sheets.googleapis.com/v4/spreadsheets/{SID}/values/PlayList!A1:D{len(rows)}',
    params={'valueInputOption': 'USER_ENTERED'},
    json={'values': rows, 'majorDimension': 'ROWS'}
)
print("✅ Sheet updated!")
