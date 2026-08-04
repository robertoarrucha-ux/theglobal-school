#!/usr/bin/env python3
"""Consolida hallazgos empíricos del crawl:
- redirects detectados en vivo -> redirects_empirical.csv
- URLs que necesitan atención manual (escasas / rotas) -> needs_manual.csv
"""
import csv
from pathlib import Path
MIG = Path(__file__).resolve().parent

rep = list(csv.DictReader(open(MIG / "crawl_report.csv", encoding="utf-8")))

# redirects reales detectados por el crawler (redirected=yes)
emp = []
for x in rep:
    if x["redirected"] == "yes":
        emp.append({"source": x["url"], "target": x["final_url"], "code": 301,
                    "lang": x["lang"], "detected_by": "crawl-follow"})
# los 2 con redirect relativo capturado a mano (HEAD Location)
manual_redirects = {
    "https://es.theglobal.school/innovation-box/": "https://es.theglobal.school/innovation-toolbox-for-ceos-and-founders/",
    "https://es.theglobal.school/pasantias-pagadas-analisis-y-creacion-de-contenido/": "https://es.theglobal.school/internship-youtuber/",
}
for s, t in manual_redirects.items():
    emp.append({"source": s, "target": t, "code": 301,
                "lang": "es", "detected_by": "crawl-HEAD"})

with open(MIG / "redirects_empirical.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["source", "target", "code", "lang", "detected_by"])
    w.writeheader(); w.writerows(emp)

# atención manual: contenido escaso (<300) + rotos (loop)
broken_loop = {
    "https://theglobal.school/doughnut-economics/",
    "https://theglobal.school/the-holy-land-experience/",
    "https://theglobal.school/un-antonio-guterres/",
}
manual = []
for x in rep:
    reason = ""
    if x["url"] in broken_loop:
        reason = "ROTO en vivo (loop 301) - recuperar del WXR si se conserva"
    elif x["status"] == "200" and x["md_chars"].isdigit() and int(x["md_chars"]) < 300:
        reason = f"contenido escaso ({x['md_chars']}c) - pagina de diseño, reconstruir en Fase 2"
    if reason:
        manual.append({"url": x["url"], "lang": x["lang"], "type_hint": "page",
                       "md_chars": x["md_chars"], "reason": reason})

with open(MIG / "needs_manual.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["url", "lang", "type_hint", "md_chars", "reason"])
    w.writeheader(); w.writerows(manual)

# cruce: ¿los redirects empíricos ya están en el master?
master = {r["source"].rstrip("/").lower() for r in csv.DictReader(open(MIG / "redirects_master.csv", encoding="utf-8"))}
new_redirects = [e for e in emp if e["source"].rstrip("/").lower() not in master]

print(f"Redirects empíricos detectados: {len(emp)}")
print(f"  ya en redirects_master: {len(emp)-len(new_redirects)}")
print(f"  NUEVOS (no estaban):    {len(new_redirects)}")
for e in new_redirects:
    print(f"    + {e['source']} -> {e['target']}")
print(f"\nURLs para atención manual: {len(manual)}")
