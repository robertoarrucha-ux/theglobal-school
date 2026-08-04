#!/usr/bin/env python3
"""Descarga las imágenes de portada de las expediciones (de theglobal.school) a public/media/,
convirtiendo a WebP si hace falta. Lee migration/expedition_media_urls.txt."""
import io, urllib.request, urllib.parse
from pathlib import Path
from PIL import Image

BASE = Path(__file__).resolve().parent.parent
MEDIA = BASE / "public" / "media"
UA = "Mozilla/5.0 (theglobal-migration-bot)"
KEEP = {"gif", "svg", "webp"}

def local_rel(after):
    p = after.split("?")[0].lstrip("/")
    stem, _, ext = p.rpartition(".")
    ext = ext.lower()
    return p if ext in KEEP else f"{stem}.webp", ext in KEEP

def download(url):
    parts = urllib.parse.urlsplit(url)
    safe = urllib.parse.urlunsplit((parts.scheme, parts.netloc, urllib.parse.quote(parts.path, safe="/%"), parts.query, parts.fragment))
    req = urllib.request.Request(safe, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

urls = [u.strip() for u in open(BASE / "migration/expedition_media_urls.txt") if u.strip()]
ok = skip = fail = 0
for url in urls:
    after = url.split("wp-content/uploads/")[1]
    rel, keep = local_rel(after)
    dest = MEDIA / rel
    if dest.exists():
        skip += 1; continue
    try:
        dest.parent.mkdir(parents=True, exist_ok=True)
        data = download(url)
        if keep:
            dest.write_bytes(data)
        else:
            im = Image.open(io.BytesIO(data))
            im = im.convert("RGB") if im.mode not in ("RGB", "RGBA") else im
            im.save(dest, "WEBP", quality=82, method=6)
        ok += 1
        print(f"  ✓ /media/{rel}")
    except Exception as e:
        fail += 1
        print(f"  ✗ {url} -> {e}")

print(f"\nDescargadas ok={ok} skip={skip} fail={fail}")
