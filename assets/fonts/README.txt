Montserrat (SIL Open Font License), 4 weights used by the site:
400 Regular, 500 Medium, 600 SemiBold, 700 Bold.

Each weight is split into two WOFF2 files:
  *-latin.woff2     – English text, punctuation, €, ™ etc.
  *-cyrillic.woff2  – Cyrillic letters (downloaded only if a page uses them)

The @font-face rules are at the top of assets/css/main.css.
Regular-latin and Medium-latin are preloaded in every page <head>.
No .ttf files are needed.
