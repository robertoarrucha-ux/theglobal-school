#!/usr/bin/env python3
"""Recupera el contenido de posts/páginas ROTOS en vivo, desde el export WXR.
Limpia shortcodes Divi [et_pb_*] conservando el HTML interno, y convierte a Markdown."""
import re, csv, json
import xml.etree.ElementTree as ET
from pathlib import Path
from bs4 import BeautifulSoup
from markdownify import markdownify as md

BASE = Path(__file__).resolve().parent.parent
XML = BASE / "thenewglobalschool.WordPress.2026-07-28.xml"
CONTENT = BASE / "content"
NS = {"wp": "http://wordpress.org/export/1.2/",
      "content": "http://purl.org/rss/1.0/modules/content/"}

# slugs a recuperar (rotas en vivo por loop 301)
TARGETS = {"doughnut-economics", "the-holy-land-experience", "un-antonio-guterres"}

def strip_divi(text):
    # quitar shortcodes de Divi/otros: [et_pb_x ...] y [/et_pb_x], y CSS embebido
    text = re.sub(r"\[/?et_pb_[^\]]*\]", "\n", text)
    text = re.sub(r"\[/?[a-z_]+[^\]]*\]", "\n", text)  # otros shortcodes
    return text

def load_inv():
    return {r["slug"]: r for r in csv.DictReader(open(BASE / "migration/inventory.csv", encoding="utf-8"))}

INV = load_inv()
tree = ET.parse(XML)
ch = tree.getroot().find("channel")

recovered = []
for it in ch.findall("item"):
    slug = (it.findtext("wp:post_name", "", NS) or "").strip()
    if slug not in TARGETS:
        continue
    link = (it.findtext("link", "") or "").strip()
    lang = "es" if "es.theglobal.school" in link else "en"
    ptype = it.findtext("wp:post_type", "post", NS)
    raw = it.findtext("content:encoded", "", NS) or ""
    cleaned = strip_divi(raw)
    soup = BeautifulSoup(cleaned, "lxml")
    for t in soup.find_all(["script", "style"]):
        t.decompose()
    markdown = md(str(soup), heading_style="ATX", bullets="-").strip()
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    inv = INV.get(slug, {})
    fm = [
        "---",
        f'title: "{(inv.get("title") or slug).replace(chr(34),chr(39))}"',
        f'seoTitle: "{(inv.get("seo_title") or "").replace(chr(34),chr(39))}"',
        f'description: "{(inv.get("seo_desc") or "").replace(chr(34),chr(39))}"',
        f'slug: "{slug}"', f'lang: "{lang}"', f'type: "{ptype}"',
        f'date: "{inv.get("date","")}"',
        f'canonical: "{link}"',
        f'ogImage: "{inv.get("og_img","")}"',
        f'hero: "{inv.get("og_img","")}"',
        f'targetKeyword: "{(inv.get("target_kw") or "").replace(chr(34),chr(39))}"',
        f'sourceUrl: "{link}"',
        'recovered: "from-wxr (roto en vivo)"',
        "images: []",
        "---", "",
    ]
    outdir = CONTENT / lang / ptype
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / f"{slug}.md").write_text("\n".join(fm) + markdown + "\n", encoding="utf-8")
    recovered.append((slug, lang, ptype, len(markdown)))

for s, lg, tp, n in recovered:
    print(f"  recuperado: {lg}/{tp}/{s}.md  ({n} chars)")
print(f"Total recuperados del WXR: {len(recovered)}")
