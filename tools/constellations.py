"""
Builds the constellation data from two open sources:
- figures (line strips between stars): d3-celestial, constellations.lines.json (Olaf Frohn, BSD-3-Clause);
- stars (positions, distances, magnitudes, spectra): HYG database v4.1 (astronexus, CC BY-SA 4.0), whose
  distances come from Hipparcos / Gaia parallaxes.
Each line vertex is matched to the nearest HYG star brighter than MATCH_MAG within MATCH_DEG.

Writes public/data/constellations/<slug>.json (stars and segments, fetched by the 3D page) and
app/data/constellations.generated.ts (names, mini figure paths and summary figures for the list).
Usage: python3 tools/constellations.py <d3-celestial/data> <hygdata_v41.csv> <project root>
"""
import csv, json, math, sys, os, re

D3, HYG, ROOT = sys.argv[1], sys.argv[2], sys.argv[3]
MATCH_DEG = 0.25      # line vertices are star positions rounded to 4 decimals: anything farther is a bad match
MATCH_MAG = 7.0       # figures use naked-eye stars only
EXTRA_MAG = 4.0       # other stars of the constellation shown (unlinked) when brighter than this
PC_TO_LY = 3.26156
UNKNOWN_PC = 100000   # HYG's placeholder for "no parallax"

GREEK = {'Alp': 'α', 'Bet': 'β', 'Gam': 'γ', 'Del': 'δ', 'Eps': 'ε', 'Zet': 'ζ', 'Eta': 'η', 'The': 'θ', 'Iot': 'ι',
         'Kap': 'κ', 'Lam': 'λ', 'Mu': 'μ', 'Nu': 'ν', 'Xi': 'ξ', 'Omi': 'ο', 'Pi': 'π', 'Rho': 'ρ', 'Sig': 'σ',
         'Tau': 'τ', 'Ups': 'υ', 'Phi': 'φ', 'Chi': 'χ', 'Psi': 'ψ', 'Ome': 'ω'}
SUP = str.maketrans('0123456789', '⁰¹²³⁴⁵⁶⁷⁸⁹')

def slug(s):
    s = s.lower().replace('ö', 'o').replace('é', 'e')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def unit(ra_deg, dec_deg):
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    return (math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec))

stars = []
for r in csv.DictReader(open(HYG, encoding='utf-8')):
    if not r['hip'] or r['proper'] == 'Sol':
        continue
    mag = float(r['mag'])
    if mag > MATCH_MAG:
        continue
    ra_deg = float(r['ra']) * 15
    dec = float(r['dec'])
    stars.append({**r, '_ra': ra_deg, '_dec': dec, '_u': unit(ra_deg, dec), '_mag': mag})

# Coarse sky grid so matching is not 9,000 × 1,500.
grid = {}
for s in stars:
    grid.setdefault((int(s['_ra'] // 5), int((s['_dec'] + 90) // 5)), []).append(s)

def nearest(ra_deg, dec):
    u = unit(ra_deg, dec)
    best, bestd = None, 1e9
    cx, cy = int(ra_deg // 5), int((dec + 90) // 5)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for s in grid.get(((cx + dx) % 72, cy + dy), []):
                d = math.degrees(math.acos(max(-1, min(1, sum(a * b for a, b in zip(u, s['_u']))))))
                if d < bestd:
                    best, bestd = s, d
    return best if bestd <= MATCH_DEG else None

names = {f['id']: f['properties'] for f in json.load(open(os.path.join(D3, 'constellations.json')))['features']}
figures = {}
for f in json.load(open(os.path.join(D3, 'constellations.lines.json')))['features']:
    figures.setdefault(f['id'], []).extend(f['geometry']['coordinates'])

def star_record(s, in_figure):
    pc = float(s['dist'])
    bayer = s['bayer']
    letter = ''
    if bayer:
        base, _, num = bayer.partition('-')
        letter = GREEK.get(base, base) + (num.translate(SUP) if num else '')
    desig = f"{letter} {s['con']}" if letter else (f"{s['flam']} {s['con']}" if s['flam'] else f"HIP {s['hip']}")
    return {
        'hip': int(s['hip']), 'name': s['proper'] or None, 'designation': desig,
        'ra': round(s['_ra'], 4), 'dec': round(s['_dec'], 4),
        'distLy': None if pc >= UNKNOWN_PC else round(pc * PC_TO_LY, 1),
        'mag': float(s['mag']), 'absmag': float(s['absmag']), 'spect': s['spect'] or None,
        'ci': float(s['ci']) if s['ci'] else None, 'lum': round(float(s['lum']), 3), 'figure': in_figure,
    }

index = []
out_dir = os.path.join(ROOT, 'public/data/constellations')
unmatched = 0
for abbr, strips in figures.items():
    p = names[abbr]
    sid = slug(p['name'])
    chosen, order, segments = {}, [], set()
    for strip in strips:
        prev = None
        for lon, lat in strip:
            s = nearest(lon % 360, lat)
            if not s:
                unmatched += 1
                prev = None
                continue
            if s['hip'] not in chosen:
                chosen[s['hip']] = len(order)
                order.append(s)
            i = chosen[s['hip']]
            if prev is not None and prev != i:
                segments.add((min(prev, i), max(prev, i)))
            prev = i
    for s in stars:
        if s['con'] == abbr and s['_mag'] < EXTRA_MAG and s['hip'] not in chosen:
            chosen[s['hip']] = len(order)
            order.append(s)
    figure_count = len({i for seg in segments for i in seg})
    recs = [star_record(s, i in {k for seg in segments for k in seg}) for i, s in enumerate(order)]
    json.dump({'id': sid, 'abbr': abbr, 'stars': recs, 'segments': sorted(segments)},
              open(os.path.join(out_dir, f'{sid}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    # Mini figure: gnomonic projection about the figure's centre, fitted into a 100 × 100 box, east to the left.
    fig = [r for r in recs if r['figure']]
    cx, cy, cz = (sum(unit(r['ra'], r['dec'])[k] for r in fig) for k in range(3))
    n = math.sqrt(cx * cx + cy * cy + cz * cz)
    c = (cx / n, cy / n, cz / n)
    east = (-c[1], c[0], 0)
    en = math.hypot(*east) or 1
    east = tuple(e / en for e in east)
    north = (c[1] * east[2] - c[2] * east[1], c[2] * east[0] - c[0] * east[2], c[0] * east[1] - c[1] * east[0])
    pts = {}
    for i, r in enumerate(recs):
        u = unit(r['ra'], r['dec'])
        d = sum(a * b for a, b in zip(u, c))
        pts[i] = (-sum(a * b for a, b in zip(u, east)) / d, -sum(a * b for a, b in zip(u, north)) / d)
    used = [pts[i] for i, r in enumerate(recs) if r['figure']] or list(pts.values())
    xs, ys = [q[0] for q in used], [q[1] for q in used]
    span = max(max(xs) - min(xs), max(ys) - min(ys)) or 1
    ox, oy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    fit = lambda q: (round(50 + (q[0] - ox) / span * 84, 1), round(50 + (q[1] - oy) / span * 84, 1))
    path = ' '.join(f"M{fit(pts[a])[0]} {fit(pts[a])[1]}L{fit(pts[b])[0]} {fit(pts[b])[1]}" for a, b in sorted(segments))
    dots = [[*fit(pts[i]), r['mag']] for i, r in enumerate(recs) if r['figure']]
    dists = [r['distLy'] for r in fig if r['distLy']]
    brightest = min(recs, key=lambda r: r['mag'])
    index.append({
        'id': sid, 'abbr': abbr, 'name': {'fr': p['fr'], 'en': p['en']}, 'latin': p['name'], 'genitive': p['gen'],
        'path': path, 'dots': dots, 'figureStars': figure_count,
        'nearestLy': min(dists) if dists else None, 'farthestLy': max(dists) if dists else None,
        'brightest': brightest['name'] or brightest['designation'],
    })

index.sort(key=lambda c: c['latin'])
ts = ('/* Generated by tools/constellations.py from d3-celestial (BSD-3-Clause) and the HYG database v4.1 (CC BY-SA 4.0). Do not edit. */\n'
      "import type { ConstellationSummary } from '~/types/constellations'\n\n"
      'export const CONSTELLATIONS: ConstellationSummary[] = ' + json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n')
open(os.path.join(ROOT, 'app/data/constellations.generated.ts'), 'w', encoding='utf-8').write(ts)
print(len(index), 'constellations; unmatched vertices:', unmatched)
