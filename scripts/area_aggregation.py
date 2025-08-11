#!/usr/bin/env python3
"""
Area aggregation helper.
Maps (country, admin1 area) into broader buckets per user's specification.
Returned names intentionally omit the country tag in parentheses (e.g., 'North', 'South', 'Central', 'HaMerkaz', etc.).
"""
from __future__ import annotations
from typing import Optional
import unicodedata

# Country aliases normalized elsewhere in the pipeline, but we also guard here
_CYPRUS_ALIASES = {
    'akrotiri', 'dhekelia', 'n.cyprus', 'n. cyprus', 'n cyprus',
    'north cyprus', 'northern cyprus',
    'cyprus u.n. buffer', 'cyprus un buffer',
    'cyprus u.n. buffer zone', 'cyprus un buffer zone',
    'akrotiri sovereign base area', 'dhekelia cantonment',
}

# Utility to normalize strings (lowercase, strip, remove diacritics)
def _norm(s: Optional[str]) -> str:
    if s is None:
        return ''
    s = str(s).strip()
    # deaccent
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    return s.lower()


def aggregate_area(country: Optional[str], area: Optional[str]) -> Optional[str]:
    """
    Return aggregated area name for the given country + admin1 area.
    If no mapping matches, returns the original area unchanged.
    """
    if area is None or str(area).strip() == '':
        return area

    c = _norm(country)
    a = _norm(area)

    # Normalize certain country aliases locally just in case
    if c in _CYPRUS_ALIASES:
        c = 'cyprus'

    # Some countries may appear with variants
    if c in {'saudi', 'saudi arabia', 'kingdom of saudi arabia'}:
        c = 'saudi arabia'

    # Jordan Ma'an variants
    if a in {"ma'an", 'maan', 'ma’ an', 'maʼan', 'maʿan'}:
        a = "ma'an"

    # Lebanon Bekaa variants
    if a in {'beqaa', 'bekaa', 'beqa', 'beqaa valley'}:
        a = 'beqaa'

    # Syria As-Suwayda variants
    if a in {'as suwayda', 'suwayda', 'as-suwayda'}:
        a = 'as-suwayda'

    # Egypt Sharqia variants (though list uses Al Sharqia for SA, not Egypt)
    if a in {'ash sharqiyah', 'ash sharqiyah province', 'eastern province'}:
        a = 'al sharqia'

    mapping = {
        'syria': {
            'aleppo': 'North', 'idlib': 'North', 'latakia': 'North', 'tartus': 'North', 'hama': 'North',
            'rif dimashq': 'South', 'quneitra': 'South', 'homs': 'South', 'daraa': 'South', 'as-suwayda': 'South',
            'western al-samadania': 'South',
        },
        'turkey': {
            'hatay': 'South', 'antalya': 'South', 'mersin': 'South',
        },
        'lebanon': {
            'north': 'North', 'beirut': 'North', 'mount lebanon': 'North',
            'beqaa': 'South', 'nabatieh': 'South', 'south': 'South',
        },
        'jordan': {
            'irbid': 'North', 'ajloun': 'North', 'mafraq': 'North',
            'amman': 'Central', 'zarqa': 'Central', 'balqa': 'Central', 'madaba': 'Central',
            "ma'an": 'South', 'karak': 'South', 'tafilah': 'South', 'aqaba': 'South',
        },
        'israel': {
            'tel aviv': 'HaMerkaz', 'hamerkaz': 'HaMerkaz', 'yerushalayim': 'HaMerkaz',
            'haifa': 'HaZafon', 'hazafon': 'HaZafon',
            'hadarom': 'HaDarom',
        },
        'palestine': {
            'gaza': 'Palestine',
            'west bank': 'West Bank',
        },
        'cyprus': {
            'nicosia': 'Cyprus', 'limassol': 'Cyprus', 'larnaca': 'Cyprus', 'paphos': 'Cyprus', 'famagusta': 'Cyprus',
            'northern cyprus': 'Cyprus', 'akrotiri': 'Cyprus', 'dhekelia': 'Cyprus',
        },
        'egypt': {
            'damietta': 'North', 'port said': 'North', 'ismailia': 'North',
            'suez': 'South', 'red sea': 'South',
            'north sinai': 'Sinai', 'south sinai': 'Sinai',
        },
        'saudi arabia': {
            'tabuk': 'Northwest', 'al-jowf': 'Northwest', 'al jowf': 'Northwest',
            'al madinah': 'Northwest', 'al sharqia': 'Northwest', 'ash sharqiyah': 'Northwest', 'eastern province': 'Northwest',
        },
    }

    agg = mapping.get(c, {}).get(a)
    if agg:
        return agg

    # If country is cyprus and area equals SBa country names (handled above) map to Cyprus
    if c == 'cyprus' and a in {'akrotiri sovereign base area', 'dhekelia cantonment'}:
        return 'Cyprus'

    # Default: keep original area
    return area
