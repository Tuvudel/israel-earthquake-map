#!/usr/bin/env python3
"""
Normalization utilities shared across the earthquake pipeline.

Currently includes:
- normalize_cyprus(country): map any Cyprus-related variants to 'Cyprus'

This centralizes policy so all scripts behave consistently.
"""
from __future__ import annotations

from typing import Optional

# Canonical set of aliases/variants that should normalize to 'Cyprus'
CYPRUS_ALIASES: set[str] = {
    # Sovereign base areas / local variants
    "akrotiri",
    "dhekelia",
    "akrotiri sovereign base area",
    "dhekelia cantonment",
    # Abbreviations and short forms for northern cyprus
    "n.cyprus",
    "n. cyprus",
    "n cyprus",
    "north cyprus",
    "northern cyprus",
    "trnc",
    # Full and misspelled names of the self-declared entity
    "turkish republic of northern cyprus",
    "turkish republic of northen cyprus",
    # UN buffer zone variants
    "cyprus u.n. buffer",
    "cyprus un buffer",
    "cyprus u.n. buffer zone",
    "cyprus un buffer zone",
    "united nations buffer zone in cyprus",
    "united nations buffer zone",
    "u.n. buffer zone in cyprus",
    "u.n. buffer zone",
    "un buffer zone in cyprus",
    "un buffer zone",
}


def normalize_cyprus(country: Optional[str]) -> Optional[str]:
    """Normalize any Cyprus-related variants to the canonical 'Cyprus'.

    If value is None or empty after strip, return as-is.
    """
    if country is None:
        return None
    s = str(country).strip()
    if not s:
        return country
    if s.lower() in CYPRUS_ALIASES:
        return "Cyprus"
    return country


__all__ = ["normalize_cyprus", "CYPRUS_ALIASES"]
