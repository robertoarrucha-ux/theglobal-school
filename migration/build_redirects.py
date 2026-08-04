#!/usr/bin/env python3
"""Consolida redirects del plugin Redirection (JSON) + SEOPress (WXR ya en redirects.csv)
en un maestro limpio para traducir luego a firebase.json."""
import json, csv
from pathlib import Path

M = Path(__file__).resolve().parent
data = json.load(open(M / "redirection-export.json"))
reds = data.get("redirects", [])

rows = []
regex_rows = []
for r in reds:
    src = r.get("url", "")
    ad = r.get("action_data") or {}
    target = ad.get("url", "") if isinstance(ad, dict) else str(ad)
    row = {
        "source": src,
        "target": target,
        "code": r.get("action_code", 301),
        "action_type": r.get("action_type", ""),
        "match_type": r.get("match_type", ""),
        "regex": r.get("regex", False),
        "enabled": r.get("enabled", True),
        "hits": r.get("hits", 0),
        "title": (r.get("title") or "").strip(),
        "source_plugin": "redirection",
    }
    (regex_rows if r.get("regex") else rows).append(row)

# sumar los de SEOPress (redirects.csv) que tengan target
sp_path = M / "redirects.csv"
if sp_path.exists():
    for r in csv.DictReader(open(sp_path)):
        if r.get("target", "").strip():
            rows.append({
                "source": r["source"], "target": r["target"],
                "code": r.get("type", "301"), "action_type": "url",
                "match_type": "url", "regex": False, "enabled": r.get("enabled", ""),
                "hits": "", "title": r.get("title", ""), "source_plugin": "seopress",
            })

# dedup por (source normalizado)
seen = set()
final = []
for r in sorted(rows, key=lambda x: (not x["enabled"], x["source"])):
    key = r["source"].rstrip("/").lower()
    if key in seen:
        continue
    seen.add(key)
    final.append(r)

fields = ["source", "target", "code", "action_type", "match_type", "regex", "enabled", "hits", "title", "source_plugin"]
with open(M / "redirects_master.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(final)

with open(M / "redirects_regex_REVISAR.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(regex_rows)

enabled = sum(1 for r in final if r["enabled"] in (True, "true", "on", "1"))
print(f"Redirects consolidados (simples): {len(final)}  (activos: {enabled})")
print(f"Redirects regex (revisar a mano): {len(regex_rows)}")
print(f"Escrito: redirects_master.csv, redirects_regex_REVISAR.csv")
