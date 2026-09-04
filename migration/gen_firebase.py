#!/usr/bin/env python3
"""Genera firebase.json (2 hosting targets EN/ES + redirects 301) y .firebaserc.
Divide los redirects por dominio de origen y los convierte a paths relativos."""
import csv, json
from pathlib import Path
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parent.parent
MIG = BASE / "migration"
PROJECT = "gen-lang-client-0345505794"

def norm_source(url):
    """URL de origen -> (dominio, path relativo con trailing slash)."""
    s = urlsplit(url if "//" in url else "https://" + url)
    host = s.netloc or ("es.theglobal.school" if url.startswith("/es") else "")
    path = s.path or url
    if not path.startswith("/"):
        path = "/" + path
    return host, path

def norm_dest(url):
    """Destino: si es del mismo sitio, path relativo; si externo, URL completa."""
    if url.startswith("/"):
        return url
    s = urlsplit(url)
    if s.netloc in ("theglobal.school", "es.theglobal.school"):
        return s.path or "/"
    return url  # externo (p.ej. awards.pro-latam.org) -> URL absoluta

def load_redirects():
    rows = []
    # master (plugins)
    for r in csv.DictReader(open(MIG / "redirects_master.csv", encoding="utf-8")):
        if not r.get("target", "").strip():
            continue
        if str(r.get("enabled", "")).lower() in ("false", "0", "off"):
            continue
        rows.append((r["source"], r["target"], r.get("code", "301")))
    # empíricos (crawl)
    ep = MIG / "redirects_empirical.csv"
    if ep.exists():
        for r in csv.DictReader(open(ep, encoding="utf-8")):
            if r.get("target", "").strip():
                rows.append((r["source"], r["target"], r.get("code", "301")))
    return rows

redir = {"en": {}, "es": {}}   # dedup por path
both = 0
for src, tgt, code in load_redirects():
    host, path = norm_source(src)
    dest = norm_dest(tgt)
    if path == dest:   # redirect a sí mismo -> ignorar
        continue
    try:
        c = int(str(code).strip() or 301)
    except ValueError:
        c = 301
    entry = {"source": path, "destination": dest, "type": c}
    if "es.theglobal.school" in host:
        redir["es"][path] = entry
    elif "theglobal.school" in host:
        redir["en"][path] = entry
    else:
        # origen relativo (sin dominio): aplicar a ambos targets por seguridad SEO
        redir["en"].setdefault(path, entry)
        redir["es"].setdefault(path, entry)
        both += 1

# --- rutas realmente servidas por idioma (slug = nombre de archivo) ---
SELF_DOMAIN = {"en": "https://theglobal.school", "es": "https://es.theglobal.school"}
def served_paths(lang):
    s = set()
    d = BASE / "content" / lang
    if d.exists():
        for md in d.rglob("*.md"):
            s.add(f"/{md.stem}/")
    s.update({"/", "/contact/" if lang == "en" else "/contacto/"})
    return s
SERVED = {"en": served_paths("en"), "es": served_paths("es")}

# 1) Fix destinos cross-idioma: si el destino relativo no existe en ESTE idioma
#    pero sí en el otro, apuntar a la URL absoluta del otro dominio.
for lang in ("en", "es"):
    other = "es" if lang == "en" else "en"
    for path, r in redir[lang].items():
        dest = r["destination"]
        if dest.startswith("/") and dest not in SERVED[lang] and dest in SERVED[other]:
            r["destination"] = SELF_DOMAIN[other] + dest

# 2) Redirects estructurales: URLs originales con prefijo de ruta (p.ej. /project/<slug>/)
#    que ahora servimos en la raíz -> 301 al slug raíz.
for r in csv.DictReader(open(MIG / "inventory.csv", encoding="utf-8")):
    lang = r["lang"]
    path = urlsplit(r["url"]).path
    segs = [s for s in path.split("/") if s]
    if len(segs) > 1:  # tenía prefijo (project/, etc.)
        root = f"/{segs[-1]}/"
        if root in SERVED[lang] and path not in redir[lang]:
            redir[lang][path] = {"source": path, "destination": root, "type": 301}

# 3b) Gaps detectados en Search Console (16 meses): URLs con impresiones que hoy 404.
#     - post borrado con 3.467 impresiones -> al post afín existente.
#     - taxonomías delgadas (/tag/, /testimonial/) -> home (evita 404, consolida equity).
GAP_REDIRECTS = {
    "en": [
        ("/can-women-lead-an-army/", "/women-leadership/"),
        ("/tag/**", "/"),
        ("/testimonial/**", "/"),
        ("/404-2/", "/"),
        ("/theglobal.school/", "/"),
        # URLs 404 de Search Console -> a home (o mejor destino). Secciones muertas con wildcard.
        ("/becarios/**", "/"), ("/becarios/", "/"),
        ("/author/**", "/"),
        ("/category/blog/", "/blog/"),
        ("/votos-mujeres-autenticas", "https://awards.pro-latam.org/"),
        ("/prepara-tu-campana/", "/"),
        ("/seguridad-confianza-y-transparencia/", "/"),
        ("/mi-cuenta/", "/"),
        ("/home-4/", "/"), ("/home-6/", "/"),
        ("/our-new-partners/", "/"),
        ("/nominate", "/"),
        ("/mission/", "/"),
        ("/documents/project-details/", "/"),
        ("/viena-ciudad-inteligente/", "/"),
        ("/our-children-in-school/", "/"),
        ("/become-a-volunteer/", "/"), ("/become-a-volounteer/", "/"),
        ("/prices/", "/"),
        # 404 GSC (drilldown 2026-08-15)
        ("/invitation-masterclass/", "/"),
        ("/purpose-driven-leader/", "/"),
    ],
    "es": [
        ("/tag/**", "/"),
        ("/testimonial/**", "/"),
        ("/404-2/", "/"),
        ("/es.theglobal.school/", "/"),
        ("/welcome/", "/"),
        # Latin American Leaders Awards: el premio lo organiza Pro-Latam -> 301 a su sitio oficial.
        ("/latin-america-leaders-awards/", "https://awards.pro-latam.org/"),
        ("/latin-america-leaders-awards", "https://awards.pro-latam.org/"),
        ("/bienvenido-a-los-latin-american-leaders-awards/", "https://awards.pro-latam.org/"),
        ("/bienvenido-a-los-latin-american-leaders-awards", "https://awards.pro-latam.org/"),
        ("/experiencias/latin-america-leaders-awards/", "https://awards.pro-latam.org/"),
        ("/experiencias/latin-america-leaders-awards", "https://awards.pro-latam.org/"),
        ("/equipo-latam-awards/", "https://awards.pro-latam.org/"),
        ("/equipo-latam-awards", "https://awards.pro-latam.org/"),
        ("/confirmacion-de-postulacion-latam-awards/", "https://awards.pro-latam.org/"),
        ("/confirmacion-de-postulacion-latam-awards", "https://awards.pro-latam.org/"),
        # URLs 404 de Search Console -> a home (o mejor destino).
        ("/expeditions/great-war-trenches", "/experiencias/great-war-trenches/"),
        ("/votos-latin-american-leaders-awards", "https://awards.pro-latam.org/"),
        ("/miembros-/", "/"),
        ("/digital-innovation-toolbox/", "/"),
        ("/who-is-arora-akanksha/", "/"),
        ("/the-holy-land-experience/", "/"),
        ("/europe/", "/"),
        ("/latam-covid19/", "/"),
        ("/latin-american-networking-in-vienna/", "/"),
        ("/muje", "/"),
        ("/bienvenido-", "/"),
        ("/why-cultural-transformation-is-so-important-nowadays/", "/"),
        ("/lessons-indigenous/", "/"),
        ("/startups-and-speakers-applications/", "/"),
        ("/how-consulting-businesses-are-working-online/", "/"),
        ("/certification-iso-26000-social-responsibility/", "/"),
        ("/airbnb-violence-survivors/", "/"),
        ("/the-battle-against-inequality-starts-in-mexico/", "/"),
        ("/5-lessons/", "/"),
        # 404 GSC (drilldown 2026-08-15): cruft de WordPress (archivos de fecha, paginación, etc.)
        ("/viena-ciudad-inteligente/page/**", "/"),
        ("/viena-ciudad-", "/"),
        ("/abril-2020/", "/"),
        ("/july-2023-es/", "/"),
        ("/junio-2023/", "/"),
        ("/sin-categorizar/", "/"),
        ("/can-women-lead-an-army/", "/"),
        ("/libro-roberto/", "/"),
    ],
}
for lang, pairs in GAP_REDIRECTS.items():
    for src, dst in pairs:
        redir[lang].setdefault(src, {"source": src, "destination": dst, "type": 301})


def target_conf(lang):
    return {
        "target": lang,
        "public": f"dist-{lang}",
        "cleanUrls": False,
        "trailingSlashBehavior": "ADD",
        "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
        "rewrites": [
            {"source": "/api/lead", "function": "submitLead"},
            {"source": "/api/votes", "function": "marketplaceVotes"},
            {"source": "/api/experience", "function": "experiencePublic"},
            {"source": "/api/waitlist", "function": "waitlist"},
        ],
        "redirects": sorted(redir[lang].values(), key=lambda r: r["source"]),
        "headers": [
            {"source": "/media/**",
             "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
            {"source": "**/*.@(js|css|woff2)",
             "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
        ],
    }

firebase = {
    "hosting": [target_conf("en"), target_conf("es")],
    "functions": [{
        "source": "functions",
        "codebase": "theglobal",
        "runtime": "nodejs22",
        "ignore": ["node_modules", ".git", "*.local"],
    }],
}
(BASE / "firebase.json").write_text(json.dumps(firebase, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

firebaserc = {
    "projects": {"default": PROJECT},
    "targets": {
        PROJECT: {
            "hosting": {
                "en": ["theglobal-en"],
                "es": ["theglobal-es"],
            }
        }
    },
}
(BASE / ".firebaserc").write_text(json.dumps(firebaserc, indent=2) + "\n", encoding="utf-8")

print(f"firebase.json generado.")
print(f"  redirects EN: {len(redir['en'])}")
print(f"  redirects ES: {len(redir['es'])}")
print(f"  de origen relativo aplicados a ambos: {both}")
print(f".firebaserc -> project {PROJECT}, targets: theglobal-en / theglobal-es")
