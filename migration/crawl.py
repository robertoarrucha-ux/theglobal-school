#!/usr/bin/env python3
"""Fase 1 - Crawler respetuoso de theglobal.school.
Extrae el cuerpo limpio de cada URL -> Markdown + frontmatter SEO.
Uso:
  crawl.py --test          # 5 URLs de muestra (EN+ES)
  crawl.py --all           # las 387 del inventario
  crawl.py URL1 URL2 ...    # URLs sueltas
Salida: content/<lang>/<slug>.md  +  migration/crawl_report.csv
"""
import sys, csv, re, time, json, urllib.request, urllib.error
from pathlib import Path
from bs4 import BeautifulSoup
from markdownify import markdownify as md

BASE = Path(__file__).resolve().parent.parent
MIG = BASE / "migration"
CONTENT = BASE / "content"
UA = "Mozilla/5.0 (Macintosh; theglobal-migration-bot; +roberto@pro-latam.org)"
DELAY = 1.0  # segundos entre peticiones (rastreo respetuoso)

def load_inventory():
    rows = list(csv.DictReader(open(MIG / "inventory.csv", encoding="utf-8")))
    return {r["url"].rstrip("/"): r for r in rows}

INV = load_inventory()

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            final = r.geturl()
            html = r.read().decode("utf-8", "replace")
            return r.status, final, html
    except urllib.error.HTTPError as e:
        return e.code, url, ""
    except Exception as e:
        return 0, url, f"ERROR: {e}"

def clean_soup(node):
    """Quita scripts, estilos, botones sociales, navegación residual."""
    for sel in ["script", "style", "noscript"]:
        for t in node.find_all(sel):
            t.decompose()
    # quitar clases de UI de Divi que no son contenido
    for cls in ["et_social", "sharedaddy", "et_pb_button_module_wrapper",
                "et-pb-icon", "screen-reader-text", "et_pb_widget_area",
                "et_pb_social_media_follow", "comment-respond", "et-pb-scroll",
                "et_audio_container", "et_pb_search"]:
        for t in node.select(f'[class*="{cls}"]'):
            t.decompose()
    # quitar navegación/aside residual
    for t in node.find_all(["nav", "aside", "form", "footer", "header"]):
        t.decompose()
    return node

def extract_body(soup):
    # 1) cuerpo de post (Divi): contenedor único y limpio
    node = soup.select_one(".et_pb_post_content")
    if node:
        return node
    # 2) páginas Divi: el contenido vive repartido en muchos módulos.
    #    Tomamos TODO #main-content y luego clean_soup quita el chrome.
    return soup.select_one("#main-content") or soup.select_one("main") or soup.body

def extract_media(node, base_url):
    imgs = []
    for img in node.find_all("img"):
        src = img.get("src") or img.get("data-src") or ""
        if src:
            imgs.append(src)
    return imgs

def head_meta(soup):
    def m(sel, attr="content"):
        el = soup.select_one(sel)
        return (el.get(attr).strip() if el and el.get(attr) else "")
    return {
        "title_tag": (soup.title.string.strip() if soup.title and soup.title.string else ""),
        "meta_desc": m('meta[name="description"]'),
        "canonical": m('link[rel="canonical"]', "href"),
        "og_title": m('meta[property="og:title"]'),
        "og_image": m('meta[property="og:image"]'),
        "h1": (soup.select_one("h1").get_text(strip=True) if soup.select_one("h1") else ""),
    }

def yaml_escape(s):
    s = (s or "").replace('"', "'").replace("\n", " ").strip()
    return s

def slugify_from_url(url):
    p = url.rstrip("/").split("/")[-1]
    return p or "index"

def process(url, report):
    key = url.rstrip("/")
    inv = INV.get(key, {})
    lang = inv.get("lang") or ("es" if "es.theglobal.school" in url else "en")
    status, final, html = fetch(url)
    row = {"url": url, "final_url": final, "status": status, "lang": lang,
           "redirected": "yes" if final.rstrip("/") != key else "no",
           "slug": "", "md_chars": 0, "images": 0, "warn": ""}
    if status != 200 or not html or html.startswith("ERROR"):
        row["warn"] = f"no-200 ({html[:60] if html.startswith('ERROR') else ''})"
        report.append(row); return
    soup = BeautifulSoup(html, "lxml")
    meta = head_meta(soup)
    body = extract_body(soup)
    if not body:
        row["warn"] = "sin contenedor de contenido"; report.append(row); return
    body = clean_soup(body)
    images = extract_media(body, final)
    markdown = md(str(body), heading_style="ATX", bullets="-", strip=["a-empty"]).strip()
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    # limpiar doble numeración de Divi: "1. **1.** texto" -> "1. texto"
    markdown = re.sub(r"(^\d+\.\s+)\*\*\d+\.\*\*\s*", r"\1", markdown, flags=re.M)
    # colapsar separadores/espacios vacíos repetidos
    markdown = re.sub(r"(\n---\n){2,}", "\n---\n", markdown)

    slug = slugify_from_url(final)
    row["slug"] = slug; row["md_chars"] = len(markdown); row["images"] = len(images)

    # guardar snapshot HTML crudo para referencia de diseño
    raw_dir = MIG / "crawl_raw" / lang
    raw_dir.mkdir(parents=True, exist_ok=True)
    (raw_dir / f"{slug}.html").write_text(html, encoding="utf-8")

    # seoTitle: si SEOPress guardó una plantilla (%%...%%), usar el <title> real
    seo_title = inv.get("seo_title") or ""
    if not seo_title or "%%" in seo_title:
        seo_title = meta["title_tag"]
    # hero: si el cuerpo no trae imágenes, usar la featured (og:image)
    hero = images[0] if images else (inv.get("og_img") or meta["og_image"])

    fm = [
        "---",
        f'title: "{yaml_escape(inv.get("title") or meta["h1"] or meta["title_tag"])}"',
        f'seoTitle: "{yaml_escape(seo_title)}"',
        f'description: "{yaml_escape(inv.get("seo_desc") or meta["meta_desc"])}"',
        f'slug: "{slug}"',
        f'lang: "{lang}"',
        f'type: "{inv.get("type","post")}"',
        f'date: "{inv.get("date","")}"',
        f'canonical: "{meta["canonical"] or final}"',
        f'ogTitle: "{yaml_escape(inv.get("og_title") or meta["og_title"])}"',
        f'ogImage: "{inv.get("og_img") or meta["og_image"]}"',
        f'hero: "{hero}"',
        f'targetKeyword: "{yaml_escape(inv.get("target_kw"))}"',
        f'sourceUrl: "{final}"',
        f"images: {json.dumps(images, ensure_ascii=False)}",
        "---",
        "",
    ]
    outdir = CONTENT / lang / inv.get("type", "post")
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / f"{slug}.md").write_text("\n".join(fm) + markdown + "\n", encoding="utf-8")
    report.append(row)

def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__); return
    if args[0] == "--test":
        urls = [
            "https://theglobal.school/carbon-economy/",
            "https://theglobal.school/a-message-for-greta-haters/",
            "https://theglobal.school/about-us/",
            "https://es.theglobal.school/5-consejos-vida-sustentable/",
            "https://es.theglobal.school/alianzas/",
        ]
    elif args[0] == "--all":
        urls = [r["url"] for r in csv.DictReader(open(MIG / "inventory.csv", encoding="utf-8"))]
    else:
        urls = args

    report = []
    for i, u in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] {u}", file=sys.stderr)
        process(u, report)
        if i < len(urls):
            time.sleep(DELAY)

    rep_path = MIG / "crawl_report.csv"
    with open(rep_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(report[0].keys()))
        w.writeheader(); w.writerows(report)
    ok = sum(1 for r in report if r["status"] == 200 and not r["warn"])
    print(f"\nOK: {ok}/{len(report)}  |  reporte: {rep_path}")
    for r in report:
        flag = "OK " if (r["status"] == 200 and not r["warn"]) else "!! "
        print(f"  {flag}{r['status']} {r['lang']} {r['slug']:35} md={r['md_chars']:>6} img={r['images']} {r['warn']}")

if __name__ == "__main__":
    main()
