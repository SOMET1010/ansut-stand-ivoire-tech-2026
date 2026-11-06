#!/usr/bin/env python3
"""Convertit la matrice ANSUT « Invitations et présence » (CSV ; séparateur « ; », export Excel) en JSON.

  python3 scripts/matrice-to-json.py <matrice.csv>

Écrit :
  data/itf2026-sessions.json                 programme PUBLIC (versionné)
  data/private/itf2026-sessions-full.json    + partenaires, statuts (JAMAIS versionné)
Ensuite : scripts/seed-itf2026.ts puis scripts/import-invitations-itf2026.ts
"""
import csv, io, json, os, sys

DAYS = {'11/11/2026': 'Mer. 11 nov.', '12/11/2026': 'Jeu. 12 nov.', '13/11/2026': 'Ven. 13 nov.'}

raw = open(sys.argv[1], 'rb').read()
try:
    text = raw.decode('utf-8-sig')
except UnicodeDecodeError:
    text = raw.decode('cp1252')  # export Excel Windows
rows = list(csv.reader(io.StringIO(text), delimiter=';'))
header = next(i for i, r in enumerate(rows) if r and r[0].strip().lower().startswith('jour'))

full = []
for r in rows[header + 1:]:
    if not r or not r[0].strip():
        continue
    r += [''] * (20 - len(r))
    partners = [{'name': r[5 + 3 * k].strip(), 'contact': r[6 + 3 * k].strip(), 'email': r[7 + 3 * k].strip()}
                for k in range(4) if r[5 + 3 * k].strip()]
    full.append({'id': f'itf26-{len(full) + 1:02d}', 'date': r[0].strip(), 'day': DAYS.get(r[0].strip(), r[0].strip()),
                 'time': r[1].strip(), 'location': r[2].strip(), 'title': r[3].strip(), 'pilot': r[4].strip(),
                 'partners': partners, 'otherPartners': r[17].strip(), 'letterStatus': r[18].strip(), 'dgValidation': r[19].strip()})

os.makedirs('data/private', exist_ok=True)
json.dump(full, open('data/private/itf2026-sessions-full.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
public = [{k: s[k] for k in ('id', 'date', 'day', 'time', 'location', 'title', 'pilot')} for s in full]
open('data/itf2026-sessions.json', 'w', encoding='utf-8').write(json.dumps(public, ensure_ascii=False, indent=2) + '\n')
print(f'OK : {len(full)} séquences')
