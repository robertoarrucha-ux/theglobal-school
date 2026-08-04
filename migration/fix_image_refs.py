#!/usr/bin/env python3
"""Normaliza CUALQUIER referencia a wp-content/uploads (absoluta o relativa) en los .md
a la ruta local /media/... si el archivo existe. Si no existe (imagen rota en origen),
elimina la sintaxis de imagen markdown para no romper el build."""
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
CONTENT = BASE / "content"
MEDIA = BASE / "public" / "media"
KEEP = {"gif", "svg", "webp"}

# captura cualquier prefijo antes de wp-content/uploads/
REF = re.compile(r"(?:https?://[^\s\"'\)\]]*?)?(?:\.\./|/)?wp-content/uploads/([^\s\"'\)\]]+)")

def local_for(after):
    p = after.split("?")[0].split("#")[0].lstrip("/").replace("..", "")
    while "//" in p:
        p = p.replace("//", "/")
    stem, _, ext = p.rpartition(".")
    ext = ext.lower()
    cand = p if ext in KEEP else f"{stem}.webp"
    if (MEDIA / cand).exists():
        return "/media/" + cand
    if (MEDIA / p).exists():
        return "/media/" + p
    return None  # no existe local

changed = files = removed = 0
for md in CONTENT.rglob("*.md"):
    txt = md.read_text(encoding="utf-8")
    def repl(m):
        global removed
        local = local_for(m.group(1))
        if local:
            return local
        removed += 1
        return "MISSING_IMAGE"
    new = REF.sub(repl, txt)
    # limpiar imágenes markdown que quedaron apuntando a MISSING_IMAGE
    new = re.sub(r"!\[[^\]]*\]\(MISSING_IMAGE[^\)]*\)", "", new)
    new = new.replace("MISSING_IMAGE", "")
    if new != txt:
        md.write_text(new, encoding="utf-8")
        files += 1
        changed += 1

# verificación: ¿quedó alguna ref wp-content?
left = sum(1 for md in CONTENT.rglob("*.md") if "wp-content" in md.read_text(encoding="utf-8"))
print(f"Archivos .md modificados: {files}")
print(f"Imágenes inexistentes eliminadas: {removed}")
print(f"Referencias wp-content restantes: {left}")
