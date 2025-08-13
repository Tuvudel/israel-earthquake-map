#!/usr/bin/env python3
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEO = ROOT / 'data' / 'all_EQ_cleaned.geojson'

ALIASES = {
    # Sovereign base areas / local variants
    'akrotiri', 'dhekelia', 'akrotiri sovereign base area', 'dhekelia cantonment',
    # Abbreviations and short forms for northern cyprus
    'n.cyprus', 'n. cyprus', 'n cyprus', 'north cyprus', 'northern cyprus', 'trnc',
    # Full and misspelled names of the self-declared entity
    'turkish republic of northern cyprus', 'turkish republic of northen cyprus',
    # UN buffer zone variants
    'cyprus u.n. buffer', 'cyprus un buffer',
    'cyprus u.n. buffer zone', 'cyprus un buffer zone',
    'united nations buffer zone in cyprus', 'united nations buffer zone',
    'u.n. buffer zone in cyprus', 'u.n. buffer zone', 'un buffer zone in cyprus', 'un buffer zone'
}

ALLOWED_KEYS = {
    'epiid', 'latitude', 'longitude', 'date', 'date-time', 'magnitude', 'depth', 'felt?',
    'city', 'area', 'country', 'on_land', 'location_text'
}

def main():
    if not GEO.exists():
        print(f"✗ GeoJSON not found: {GEO}")
        return 2
    with open(GEO, 'r', encoding='utf-8') as f:
        data = json.load(f)
    feats = data.get('features', [])
    n = len(feats)
    print(f"Dataset features: {n}")

    # Country checks
    c_counter = Counter((ft.get('properties', {}) or {}).get('country') for ft in feats)
    offenders = sorted({v for v in c_counter.keys() if v and str(v).strip().lower() in ALIASES and str(v) != 'Cyprus'})
    print("Unique country values (top 10):", c_counter.most_common(10))
    if offenders:
        print("✗ Offending country values (should be 'Cyprus'):")
        for v in offenders:
            print(" -", repr(v), '-> count:', c_counter.get(v))
    else:
        print("✓ No Cyprus variants remain in 'country'")

    # Geometry and coordinate sanity
    bad_geom = 0
    bad_latlon = 0
    missing_keys = defaultdict(int)
    extra_prop_keys = set()
    for ft in feats:
        props = ft.get('properties', {}) or {}
        geom = ft.get('geometry', {}) or {}
        # geometry type and coords
        if geom.get('type') != 'Point':
            bad_geom += 1
        coords = geom.get('coordinates')
        if not (isinstance(coords, list) and len(coords) == 2):
            bad_geom += 1
        else:
            try:
                lon, lat = float(coords[0]), float(coords[1])
                if not (-180 <= lon <= 180) or not (-90 <= lat <= 90):
                    bad_latlon += 1
            except Exception:
                bad_geom += 1
        # properties schema
        for k in ALLOWED_KEYS:
            if k not in props:
                missing_keys[k] += 1
        extra_prop_keys.update(set(props.keys()) - ALLOWED_KEYS)

    if bad_geom:
        print(f"✗ Features with invalid geometry structure: {bad_geom}")
    else:
        print("✓ All features have valid Point geometry structure")

    if bad_latlon:
        print(f"✗ Features with out-of-range coordinates: {bad_latlon}")
    else:
        print("✓ All coordinates within valid ranges")

    missing_any = {k: v for k, v in missing_keys.items() if v > 0}
    if missing_any:
        print("⚠ Missing properties counts (should typically be 0, some may be acceptable like location_text):")
        for k, v in sorted(missing_any.items(), key=lambda x: -x[1]):
            print(f" - {k}: {v}")
    else:
        print("✓ All allowed properties present on all features")

    if extra_prop_keys:
        print("⚠ Extra property keys encountered (not in allowed schema):", sorted(extra_prop_keys))
    else:
        print("✓ No extra property keys beyond allowed schema")

    # location_text occurrences of Cyprus variants (informational)
    loc_hits = 0
    area_in_loc = 0
    samples_area_in_loc = []
    import re
    for ft in feats:
        props = (ft.get('properties', {}) or {})
        lt = props.get('location_text') or ''
        s = lt.lower()
        if any(k in s for k in ALIASES):
            loc_hits += 1
        area = props.get('area')
        if isinstance(lt, str) and isinstance(area, str) and area.strip():
            ae = re.escape(area.strip())
            if re.search(r",\s*" + ae + r"\s*,\s*", lt) or re.search(r",\s*" + ae + r"\s*$", lt):
                area_in_loc += 1
                if len(samples_area_in_loc) < 5:
                    samples_area_in_loc.append(lt)
    print(f"ℹ Location_text entries mentioning Cyprus variants: {loc_hits}")
    if area_in_loc:
        print(f"✗ location_text includes admin area token in {area_in_loc} features (examples):")
        for x in samples_area_in_loc:
            print(" -", x)
    else:
        print("✓ location_text has no embedded admin area segment")

    # Exit code depending on critical issues
    if offenders or bad_geom or bad_latlon or area_in_loc:
        return 1
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
