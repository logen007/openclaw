#!/usr/bin/env python3
"""Fetch ALL videos from a YouTube playlist using continuation tokens."""
import re, json, sys, urllib.request, time

PLAYLIST_URL = "https://www.youtube.com/playlist?list=PLV4DMTjPQbc3bUMh0hel3zqogU9Vb-Kt7"

def fetch_json(url, data=None):
    req = urllib.request.Request(url, data=data, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://www.youtube.com",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20240611.01.00",
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8", errors="replace"))

def extract_api_key(html):
    m = re.search(r'ytcfg\.set\s*\(\s*({.*?})\s*\)\s*;', html, re.DOTALL)
    if m:
        cfg = json.loads(m.group(1))
        return cfg.get("INNERTUBE_API_KEY", ""), cfg.get("INNERTUBE_CONTEXT", {})
    return "", {}

def extract_videos_from_section(contents):
    """Extract video titles from sectionListRenderer content."""
    titles = []
    for section in contents:
        isr = section.get("itemSectionRenderer", {}).get("contents", [])
        for item in isr:
            lvm = item.get("lockupViewModel", {})
            if not lvm:
                continue
            metadata = lvm.get("metadata", {})
            title = ""
            if isinstance(metadata, dict):
                title = metadata.get("title", "")
            if not title:
                title = lvm.get("contentId", "NA")
            titles.append(title)
    return titles

def find_continuation(contents):
    """Find the continuation token in section data."""
    for section in contents:
        for item in section.get("itemSectionRenderer", {}).get("contents", []):
            cont = item.get("continuationItemViewModel", {})
            if cont:
                cmd = cont.get("continuationCommand", {})
                inner = cmd.get("innertubeCommand", {})
                cc = inner.get("continuationCommand", {})
                token = cc.get("token", "")
                if token:
                    return token, inner.get("clickTrackingParams", "")
    return None, None

def extract_videos(data):
    """Extract video titles and continuation from initial page data."""
    try:
        slr = data["contents"]["twoColumnBrowseResultsRenderer"]["tabs"][0] \
              ["tabRenderer"]["content"]["sectionListRenderer"]
        contents = slr["contents"]
        return extract_videos_from_section(contents), find_continuation(contents)
    except:
        return [], (None, None)

def main():
    print("📥 Fetching playlist page...", file=sys.stderr)
    html = urllib.request.urlopen(urllib.request.Request(PLAYLIST_URL, headers={
        "User-Agent": "Mozilla/5.0"
    }), timeout=15).read().decode("utf-8", errors="replace")
    
    m = re.search(r'ytInitialData\s*=\s*({.*?});', html, re.DOTALL)
    if not m:
        print("❌ Cannot find ytInitialData", file=sys.stderr)
        sys.exit(1)
    
    api_key, context = extract_api_key(html)
    data = json.loads(m.group(1))
    
    all_titles = []
    continuation_token, click_params = extract_videos(data)
    page = 1
    
    # Get first batch from the page
    # Actually we need to extract from the page data differently
    # Let me redo this
    
    # Extract from the page directly
    try:
        slr = data["contents"]["twoColumnBrowseResultsRenderer"]["tabs"][0] \
              ["tabRenderer"]["content"]["sectionListRenderer"]
        contents = slr["contents"]
    except Exception as e:
        print(f"❌ Parse error: {e}", file=sys.stderr)
        sys.exit(1)
    
    # First page items
    for section in contents:
        items = section.get("itemSectionRenderer", {}).get("contents", [])
        for idx, item in enumerate(items):
            lvm = item.get("lockupViewModel", {})
            if not lvm:
                continue
            metadata = lvm.get("metadata", {})
            title = ""
            if isinstance(metadata, dict):
                title = metadata.get("title", "")
            elif isinstance(metadata, list):
                for m in metadata:
                    if hasattr(m, "get") and m.get("title"):
                        title = m["title"]
                        break
            if not title:
                title = lvm.get("contentId", "NA")
            all_titles.append(title)
    
    # Get continuation
    cont_token = None
    for section in contents:
        for item in section.get("itemSectionRenderer", {}).get("contents", []):
            cont = item.get("continuationItemViewModel", {})
            cmd = cont.get("continuationCommand", {})
            inner = cmd.get("innertubeCommand", {})
            cc = inner.get("continuationCommand", {})
            if cc.get("token"):
                cont_token = cc["token"]
                break
    
    print(f"📄 Page 1: {len(all_titles)} videos", file=sys.stderr)
    
    # Follow continuation
    page = 2
    while cont_token and page <= 10:
        time.sleep(0.5)
        print(f"📄 Page {page}: fetching continuation...", file=sys.stderr)
        
        payload = {
            "context": context,
            "continuation": cont_token,
        }
        
        try:
            url = f"https://www.youtube.com/youtubei/v1/browse?key={api_key}"
            resp_data = fetch_json(url, json.dumps(payload).encode("utf-8"))
            
            # Parse response
            oner = resp_data.get("onResponseReceivedEndpoints", [])
            new_titles = []
            new_cont = None
            
            for endpoint in oner:
                append = endpoint.get("appendContinuationItemsAction", {})
                items = append.get("continuationItems", [])
                for item in items:
                    lvm = item.get("lockupViewModel", {})
                    if lvm:
                        metadata = lvm.get("metadata", {})
                        title = ""
                        if isinstance(metadata, dict):
                            title = metadata.get("title", "")
                        if not title:
                            title = lvm.get("contentId", "NA")
                        if title and title != "NA":
                            new_titles.append(title)
                    
                    # Check for next continuation
                    cont = item.get("continuationItemViewModel", {})
                    cmd = cont.get("continuationCommand", {})
                    inner = cmd.get("innertubeCommand", {})
                    cc = inner.get("continuationCommand", {})
                    if cc.get("token"):
                        new_cont = cc["token"]
            
            if new_titles:
                all_titles.extend(new_titles)
                print(f"   +{len(new_titles)} videos (total: {len(all_titles)})", file=sys.stderr)
            
            cont_token = new_cont
            page += 1
            
        except Exception as e:
            print(f"   ❌ Error: {e}", file=sys.stderr)
            break
    
    print(f"\n✅ Total: {len(all_titles)} videos", file=sys.stderr)
    print("\n".join(all_titles))

if __name__ == "__main__":
    main()
