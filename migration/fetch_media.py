#!/usr/bin/env python3
"""Descarga las imágenes propias (wp-content/uploads) referenciadas en el contenido,
las convierte a WebP y reescribe TODAS las referencias en los .md a rutas locales /media/...
Las imágenes externas (otros dominios) se dejan como están.
Salida imágenes: public/media/<año>/<mes>/<archivo>.webp
"""
import re, io, sys, time, urllib.request, urllib.error, urllib.parse
from pathlib import Path
from PIL import Image

BASE = Path(__file__).resolve().parent.parent
CONTENT = BASE / "content"
MEDIA = BASE / "public" / "media"
UA = "Mozilla/5.0 (Macintosh; theglobal-migration-bot; +roberto@pro-latam.org)"
DELAY = 0.3
WEBP_Q = 82
KEEP_AS_IS = {"gif", "svg", "webp"}  # no re-encodear (animación/vector/ya-óptimo)

# regex para URLs de imágenes del propio sitio
URL_RE = re.compile(r"https?://(?:es\.)?theglobal\.school/wp-content/uploads/([^\s\"'\)\]]+)")

def local_rel(path_after_uploads):
    """path tras /uploads/ -> ruta relativa dentro de /media, con extensión final."""
    p = path_after_uploads.split("?")[0].split("#")[0]
    p = p.lstrip("/").replace("..", "")   # nunca ruta absoluta ni escape de dir
    while "//" in p:
        p = p.replace("//", "/")
    stem, dot, ext = p.rpartition(".")
    ext = ext.lower()
    if ext in KEEP_AS_IS:
        return p, ext, False          # se copia tal cual
    return f"{stem}.webp", ext, True  # se convierte

def collect_urls():
    urls = {}
    for md in CONTENT.rglob("*.md"):
        txt = md.read_text(encoding="utf-8")
        for m in URL_RE.finditer(txt):
            full = m.group(0)
            after = m.group(1)
            urls[full] = after
    return urls

def download(url):
    # codificar caracteres no-ASCII del path (acentos, emoji) sin tocar el resto
    parts = urllib.parse.urlsplit(url)
    safe_path = urllib.parse.quote(parts.path, safe="/%")
    url = urllib.parse.urlunsplit((parts.scheme, parts.netloc, safe_path, parts.query, parts.fragment))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

def main():
    urls = collect_urls()
    print(f"URLs de imágenes propias a procesar: {len(urls)}", file=sys.stderr)
    mapping = {}   # url_original -> /media/ruta
    ok = skipped = failed = 0
    for i, (url, after) in enumerate(sorted(urls.items()), 1):
        rel, ext, convert = local_rel(after)
        dest = MEDIA / rel
        web_path = "/media/" + rel
        mapping[url] = web_path
        if dest.exists():
            skipped += 1
            continue
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            data = download(url)
            if convert:
                try:
                    im = Image.open(io.BytesIO(data))
                    if im.mode in ("P", "RGBA", "LA"):
                        im = im.convert("RGBA") if "A" in im.mode else im.convert("RGB")
                    elif im.mode != "RGB":
                        im = im.convert("RGB")
                    im.save(dest, "WEBP", quality=WEBP_Q, method=6)
                except Exception:
                    # si falla la conversión, guardar original con su extensión
                    orig = MEDIA / after.split("?")[0]
                    orig.parent.mkdir(parents=True, exist_ok=True)
                    orig.write_bytes(data)
                    mapping[url] = "/media/" + after.split("?")[0]
            else:
                dest.write_bytes(data)
            ok += 1
        except Exception as e:
            failed += 1
            print(f"  FAIL {url} -> {e}", file=sys.stderr)
            del mapping[url]
        if i % 50 == 0:
            print(f"  {i}/{len(urls)} (ok={ok} skip={skipped} fail={failed})", file=sys.stderr)
        time.sleep(DELAY)

    # reescribir referencias en los .md
    rewrites = 0
    for md in CONTENT.rglob("*.md"):
        txt = md.read_text(encoding="utf-8")
        new = txt
        for url, web in mapping.items():
            if url in new:
                new = new.replace(url, web)
        if new != txt:
            md.write_text(new, encoding="utf-8")
            rewrites += 1

    total_size = sum(f.stat().st_size for f in MEDIA.rglob("*") if f.is_file())
    print(f"\nImágenes: ok={ok} skip={skipped} fail={failed}")
    print(f"Archivos .md reescritos: {rewrites}")
    print(f"Peso total de /media: {total_size/1024/1024:.1f} MB")

if __name__ == "__main__":
    main()
