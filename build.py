#!/usr/bin/env python3
"""Build the COPHIR static site.

Assembles src/pages/*.html with the shared header/footer partials into
ready-to-host HTML files at the site root, and compiles the French
translations (src/i18n/fr.json) into js/i18n-fr.js.

Usage:  python3 build.py            build everything
        python3 build.py --strings  also list every English string (src/i18n/strings-en.json)

No dependencies beyond the Python 3 standard library.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"

# Final production domain. Used for canonical URLs, Open Graph and the sitemap.
SITE_URL = "https://www.cophir.com"

PAGES = {
    "index.html": "home",
    "local-companies.html": "local",
    "international-contractors.html": "intl",
    "about.html": "about",
    "contact.html": "contact",
}

ICONS = {
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    "play": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a.8.8 0 0 0 1.2.7l12.2-7.5a.8.8 0 0 0 0-1.4L8.2 3.8A.8.8 0 0 0 7 4.5z"/></svg>',
    "x": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg>',
    "close": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
}

DATA_T = re.compile(
    r"<(?P<tag>[a-z][a-z0-9]*)(?P<pre>[^<>]*?)\sdata-t(?P<post>(?=[\s>])[^<>]*)>(?P<inner>.*?)</(?P=tag)>",
    re.S,
)


def norm(html: str) -> str:
    return re.sub(r"\s+", " ", html).strip()


def key_for(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]


def front_matter(raw: str):
    m = re.match(r"\s*<!--(.*?)-->\s*", raw, re.S)
    meta = {}
    if m:
        for line in m.group(1).strip().splitlines():
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
        raw = raw[m.end():]
    return meta, raw


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def head(meta, page):
    url = SITE_URL + "/" + ("" if page == "index.html" else page)
    image = SITE_URL + "/" + meta.get("image", "assets/img/abidjan.jpg")
    ld = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "COPHIR",
        "url": SITE_URL + "/",
        "logo": SITE_URL + "/assets/logo/cophir-logo.png",
        "email": "contact@cophir.com",
        "description": "Business development firm specialising in West African Oil & Gas.",
        "areaServed": "West Africa",
        "address": {"@type": "PostalAddress", "addressLocality": "Abidjan", "addressCountry": "CI"},
    }
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(meta['title'])}</title>
<meta name="description" content="{esc(meta['description'])}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#06101d">
<meta property="og:type" content="website">
<meta property="og:site_name" content="COPHIR">
<meta property="og:title" content="{esc(meta['title'])}">
<meta property="og:description" content="{esc(meta['description'])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="assets/logo/favicon-32.png">
<link rel="apple-touch-icon" href="assets/logo/mark-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,500;0,600;0,700;0,800;1,500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="css/style.css">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body data-page="{PAGES[page]}">
"""


MODAL = """
<div class="modal" id="vsl-modal" role="dialog" aria-modal="true" aria-label="COPHIR film" hidden>
  <div class="modal__box">
    <button class="modal__close" type="button" data-video-close aria-label="Close video">{close}</button>
    <video id="vsl-video" controls playsinline preload="none" poster="assets/img/port-worker.jpg">
      <source src="assets/video/cophir-vsl.mp4" type="video/mp4">
    </video>
    <div class="modal__cta">
      <span data-t>You already have half of the deal.</span>
      <div class="btn-row">
        <a class="btn btn--blue btn--sm" href="contact.html#opportunity"><span data-t>Bring us an opportunity</span></a>
        <a class="btn btn--primary btn--sm" href="contact.html#capabilities"><span data-t>Show us your capabilities</span></a>
      </div>
    </div>
  </div>
</div>
"""


def render_icons(html: str) -> str:
    return re.sub(r"\{\{(\w+)\}\}", lambda m: ICONS[m.group(1)] if m.group(1) in ICONS else m.group(0), html)


def main():
    header_tpl = (SRC / "partials/header.html").read_text(encoding="utf-8")
    footer_tpl = (SRC / "partials/footer.html").read_text(encoding="utf-8")
    fr_src = json.loads((SRC / "i18n/fr.json").read_text(encoding="utf-8"))
    fr_strings = {norm(k): v for k, v in fr_src.get("strings", {}).items()}

    seen = {}       # key -> english
    fr_out = {}     # key -> french
    missing = []

    def tag_strings(html: str) -> str:
        def sub(m):
            inner = norm(m.group("inner"))
            k = key_for(inner)
            seen[k] = inner
            if inner in fr_strings:
                fr_out[k] = fr_strings[inner]
            elif inner not in missing:
                missing.append(inner)
            return f'<{m.group("tag")}{m.group("pre")} data-t="{k}"{m.group("post")}>{m.group("inner")}</{m.group("tag")}>'
        return DATA_T.sub(sub, html)

    titles_fr = {}
    for page, nav in PAGES.items():
        meta, body = front_matter((SRC / "pages" / page).read_text(encoding="utf-8"))
        header = header_tpl
        for n in PAGES.values():
            header = header.replace("{{cur:%s}}" % n, 'aria-current="page"' if n == nav else "")
        header = re.sub(r"\s+>", ">", header)
        parts = [header, '<main id="main">', body, "</main>", footer_tpl]
        if meta.get("vsl") == "yes":
            parts.append(MODAL.replace("{close}", ICONS["close"]))
        html = "\n".join(parts)
        html = tag_strings(render_icons(html))
        out = head(meta, page) + html + '\n<script src="js/i18n-fr.js" defer></script>\n<script src="js/main.js" defer></script>\n</body>\n</html>\n'
        (ROOT / page).write_text(out, encoding="utf-8")
        t = fr_src.get("titles", {}).get(page)
        if t:
            titles_fr[nav] = t

    bundle = {"strings": fr_out, "titles": titles_fr, "svg": fr_src.get("svg", {})}
    (ROOT / "js/i18n-fr.js").write_text(
        "/* Generated by build.py from src/i18n/fr.json. Do not edit by hand. */\n"
        "window.COPHIR_FR = " + json.dumps(bundle, ensure_ascii=False, indent=0) + ";\n",
        encoding="utf-8",
    )

    urls = "".join(
        f"  <url><loc>{SITE_URL}/{'' if p == 'index.html' else p}</loc></url>\n" for p in PAGES
    )
    (ROOT / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n',
        encoding="utf-8",
    )
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")

    if "--strings" in sys.argv:
        (SRC / "i18n/strings-en.json").write_text(
            json.dumps(sorted(set(seen.values())), ensure_ascii=False, indent=1), encoding="utf-8"
        )
    print(f"Built {len(PAGES)} pages, {len(seen)} translatable strings, {len(fr_out)} translated.")
    if missing:
        print(f"WARNING: {len(missing)} strings have no French translation:")
        for s in missing:
            print("  -", s)
        sys.exit(1 if "--strict" in sys.argv else 0)


if __name__ == "__main__":
    main()
