#!/usr/bin/env python3
"""Fase 0 - Extrae inventario de URLs + metadatos SEO del export WXR de WordPress.
Salida: migration/inventory.csv (todas las URLs publicadas EN+ES) y migration/redirects.csv.
No toca el sitio en vivo; solo lee el XML local."""
import csv, re, sys
import xml.etree.ElementTree as ET
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
XML = BASE / "thenewglobalschool.WordPress.2026-07-28.xml"
OUT = BASE / "migration"
OUT.mkdir(exist_ok=True)

NS = {
    "wp": "http://wordpress.org/export/1.2/",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "excerpt": "http://wordpress.org/export/1.2/excerpt/",
    "dc": "http://purl.org/dc/elements/1.1/",
}

def text(el, path, ns=None):
    found = el.find(path, ns or {})
    return found.text if found is not None and found.text else ""

print("Parseando WXR (44MB, puede tardar)...", file=sys.stderr)
tree = ET.parse(XML)
root = tree.getroot()
channel = root.find("channel")

items = channel.findall("item")
inv_rows = []
redirect_rows = []
lang_counter = {}
type_counter = {}

for it in items:
    ptype = text(it, "wp:post_type", NS)
    status = text(it, "wp:status", NS)
    title = (text(it, "title") or "").strip()
    link = (text(it, "link") or "").strip()
    slug = text(it, "wp:post_name", NS)
    date = text(it, "wp:post_date", NS)

    # postmeta -> dict
    meta = {}
    for pm in it.findall("wp:postmeta", NS):
        k = text(pm, "wp:meta_key", NS)
        v = text(pm, "wp:meta_value", NS)
        if k:
            meta[k] = v

    # idioma: por dominio del link (WPML usa subdominio es.)
    if "es.theglobal.school" in link:
        lang = "es"
    elif "theglobal.school" in link:
        lang = "en"
    else:
        lang = meta.get("_wpml_language", "")

    # redirects de SEOPress
    rtype = meta.get("_seopress_redirections_type", "")
    rurl = meta.get("_seopress_redirections_value", "") or meta.get("_seopress_redirections_url", "")
    renabled = meta.get("_seopress_redirections_enabled", "")
    if rtype or rurl:
        redirect_rows.append({
            "source": link, "target": rurl, "type": rtype,
            "enabled": renabled, "title": title,
        })

    # solo contenido público real para el inventario
    if ptype in ("post", "page", "project") and status == "publish":
        lang_counter[lang] = lang_counter.get(lang, 0) + 1
        type_counter[ptype] = type_counter.get(ptype, 0) + 1
        inv_rows.append({
            "lang": lang,
            "type": ptype,
            "title": title,
            "url": link,
            "slug": slug,
            "date": date,
            "seo_title": meta.get("_seopress_titles_title", ""),
            "seo_desc": meta.get("_seopress_titles_desc", ""),
            "target_kw": meta.get("_seopress_analysis_target_kw", ""),
            "og_title": meta.get("_seopress_social_fb_title", ""),
            "og_img": meta.get("_seopress_social_fb_img", ""),
        })

# escribir inventario
inv_path = OUT / "inventory.csv"
with open(inv_path, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(inv_rows[0].keys()))
    w.writeheader()
    w.writerows(sorted(inv_rows, key=lambda r: (r["lang"], r["type"], r["slug"])))

# escribir redirects
red_path = OUT / "redirects.csv"
with open(red_path, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["source", "target", "type", "enabled", "title"])
    w.writeheader()
    w.writerows(redirect_rows)

print(f"\n=== INVENTARIO ({len(inv_rows)} URLs públicas publicadas) ===")
print("Por idioma:", lang_counter)
print("Por tipo:  ", type_counter)
print(f"\nRedirects encontrados: {len(redirect_rows)}")
print(f"\nArchivos escritos:\n  {inv_path}\n  {red_path}")
