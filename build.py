#!/usr/bin/env python3
"""Build the COPHIR static site, in English and French.

Assembles src/pages/*.html with the shared header/footer partials into
ready-to-host pages: English at the site root, French in /fr/. French text
comes from src/i18n/fr.json and is written into the HTML itself, so both
languages are indexed by search engines (with hreflang links between them).

Usage:  python3 build.py            build everything
        python3 build.py --strict   fail if any English string has no French version
        python3 build.py --strings  also list every English string (src/i18n/strings-en.json)

No dependencies beyond the Python 3 standard library.
"""
import hashlib, json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"

# Company profiles to link from the structured data (LinkedIn page, etc.).
SAME_AS = ["https://www.linkedin.com/company/112598465/"]
BUILD_DATE = __import__("datetime").date.today().isoformat()

# Final production domain. Used for canonical URLs, hreflang, Open Graph and the sitemap.
SITE_URL = "https://www.cophir.com"

PAGES = {
    "index.html": "home",
    "local-companies.html": "local",
    "international-contractors.html": "intl",
    "about.html": "about",
    "contact.html": "contact",
}

# Version stamp for the stylesheet and script, so browsers fetch the new files after each deploy
ROOT_DIR = __import__("pathlib").Path(__file__).resolve().parent
ASSET_V = hashlib.sha1((ROOT_DIR / "css/style.css").read_bytes() + (ROOT_DIR / "js/main.js").read_bytes()).hexdigest()[:10]

ICONS = {
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    "play": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a.8.8 0 0 0 1.2.7l12.2-7.5a.8.8 0 0 0 0-1.4L8.2 3.8A.8.8 0 0 0 7 4.5z"/></svg>',
    "x": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    "sound": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    "linkedin": '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.83v1.54h.05c.53-1 1.84-2.05 3.79-2.05 4.05 0 4.8 2.67 4.8 6.13V21h-4v-5.02c0-1.2-.02-2.74-1.67-2.74-1.67 0-1.93 1.3-1.93 2.65V21h-4V9.75Z"/></svg>',
    "envelope": '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v.35l-10 6.25L2 7.35V7a2 2 0 0 1 2-2Zm-2 4.7 9.47 5.92a1 1 0 0 0 1.06 0L22 9.7V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.7Z"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg>',
}

DATA_T = re.compile(
    r"<(?P<tag>[a-z][a-z0-9]*)(?P<pre>[^<>]*?)\sdata-t(?P<post>(?=[\s>])[^<>]*)>(?P<inner>.*?)</(?P=tag)>",
    re.S,
)
ATTR = re.compile(r'\b(alt|aria-label|placeholder|title)="([^"]*)"')
# Clean addresses: links to "about.html" become "about", "index.html" becomes "./" (the server maps them back)
PAGE_LINK = re.compile(r'href="((?:\.\./|fr/)?)(index|local-companies|international-contractors|about|contact)\.html(#[^"]*)?"')


def clean_links(html):
    def rep(m):
        prefix, name, frag = m.group(1), m.group(2), m.group(3) or ""
        if name == "index":
            return f'href="{prefix or "./"}{frag}"'
        return f'href="{prefix}{name}{frag}"'
    return PAGE_LINK.sub(rep, html)


LOCAL_URL = re.compile(r'\b(src|href|poster)="(assets/|css/|js/)')


def norm(html):
    return re.sub(r"\s+", " ", html).strip()


def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def front_matter(raw):
    m = re.match(r"\s*<!--(.*?)-->\s*", raw, re.S)
    meta = {}
    if m:
        for line in m.group(1).strip().splitlines():
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
        raw = raw[m.end():]
    return meta, raw


def url_for(page, lang):
    path = "" if page == "index.html" else page[:-5]
    return f"{SITE_URL}/{'fr/' if lang == 'fr' else ''}{path}"


def head(meta, page, lang, fr):
    title = fr["titles"].get(page, meta["title"]) if lang == "fr" else meta["title"]
    desc = fr["descriptions"].get(page, meta["description"]) if lang == "fr" else meta["description"]
    prefix = "../" if lang == "fr" else ""
    image = SITE_URL + "/" + meta.get("image", "assets/img/home-platform.jpg")
    org_id = SITE_URL + "/#organization"
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": ["Organization", "ProfessionalService"],
                "@id": org_id,
                "name": "COPHIR",
                "url": SITE_URL + "/",
                "logo": SITE_URL + "/assets/logo/cophir-logo.png",
                "image": image,
                "email": "contact@cophir.com",
                "description": fr["org"] if lang == "fr" else "Business development firm for Oil & Gas in West Africa, working across Côte d'Ivoire and Togo.",
                "areaServed": [{"@type": "Place", "name": n} for n in ("Côte d'Ivoire", "Togo", "West Africa")],
                "knowsLanguage": ["en", "fr"],
                "knowsAbout": ["Oil and gas business development", "Local content", "Tenders", "Subsea", "Offshore", "Downstream", "Industrial procurement"],
                "founder": {"@type": "Person", "name": "Jacques Coquerel", "jobTitle": "Founder"},
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "71–75 Shelton Street",
                    "addressLocality": "London",
                    "postalCode": "WC2H 9JQ",
                    "addressCountry": "GB",
                },
                "contactPoint": {"@type": "ContactPoint", "contactType": "sales", "email": "contact@cophir.com", "availableLanguage": ["English", "French"]},
                **({"sameAs": SAME_AS} if SAME_AS else {}),
            },
            {
                "@type": "WebSite",
                "@id": SITE_URL + "/#website",
                "url": SITE_URL + "/",
                "name": "COPHIR",
                "inLanguage": ["en", "fr"],
                "publisher": {"@id": org_id},
            },
        ],
    }
    return f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url_for(page, lang)}">
<link rel="alternate" hreflang="en" href="{url_for(page, 'en')}">
<link rel="alternate" hreflang="fr" href="{url_for(page, 'fr')}">
<link rel="alternate" hreflang="x-default" href="{url_for(page, 'en')}">
<meta name="theme-color" content="#122741">
<meta property="og:type" content="website">
<meta property="og:site_name" content="COPHIR">
<meta property="og:locale" content="{'fr_FR' if lang == 'fr' else 'en_GB'}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url_for(page, lang)}">
<meta property="og:image" content="{image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{prefix}favicon.ico?v=3" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="{prefix}assets/logo/favicon-32.png?v=3">
<link rel="icon" type="image/png" sizes="192x192" href="{prefix}assets/logo/icon-192.png?v=3">
<link rel="apple-touch-icon" href="{prefix}assets/logo/apple-touch-icon.png?v=3">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,500;0,600;0,700;0,800;1,500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="{prefix}css/style.css?v={ASSET_V}">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body data-page="{PAGES[page]}">
"""


def main():
    header_tpl = (SRC / "partials/header.html").read_text(encoding="utf-8")
    footer_tpl = (SRC / "partials/footer.html").read_text(encoding="utf-8")
    fr = json.loads((SRC / "i18n/fr.json").read_text(encoding="utf-8"))
    fr_strings = {norm(k): v for k, v in fr["strings"].items()}
    fr_attrs = fr.get("attrs", {})
    seen, missing, used = set(), [], set()

    def translate(html, lang):
        def sub(m):
            inner = norm(m.group("inner"))
            seen.add(inner)
            out = m.group("inner")
            if lang == "fr":
                if inner in fr_strings:
                    out = fr_strings[inner]
                    used.add(inner)
                elif inner not in missing:
                    missing.append(inner)
            return f'<{m.group("tag")}{m.group("pre")}{m.group("post")}>{out}</{m.group("tag")}>'
        html = DATA_T.sub(sub, html)
        if lang == "fr":
            html = ATTR.sub(lambda m: f'{m.group(1)}="{fr_attrs.get(m.group(2), m.group(2))}"', html)
            html = LOCAL_URL.sub(lambda m: f'{m.group(1)}="../{m.group(2)}', html)
        return html

    (ROOT / "fr").mkdir(exist_ok=True)
    for page, nav in PAGES.items():
        meta, body = front_matter((SRC / "pages" / page).read_text(encoding="utf-8"))
        for lang in ("en", "fr"):
            header = header_tpl
            for n in PAGES.values():
                header = header.replace("{{cur:%s}}" % n, 'aria-current="page"' if n == nav else "")
            header = (header
                      .replace("{{href_en}}", page if lang == "en" else "../" + page)
                      .replace("{{href_fr}}", "fr/" + page if lang == "en" else page)
                      .replace("{{cur_en}}", 'aria-current="true"' if lang == "en" else "")
                      .replace("{{cur_fr}}", 'aria-current="true"' if lang == "fr" else ""))
            header = re.sub(r"\s+>", ">", header)
            html = "\n".join([header, '<main id="main">', body, "</main>", footer_tpl])
            html = re.sub(r"\{\{(\w+)\}\}", lambda m: ICONS.get(m.group(1), m.group(0)), html)
            html = translate(html, lang)
            html = clean_links(html)
            prefix = "../" if lang == "fr" else ""
            out = head(meta, page, lang, fr) + html + f'\n<script src="{prefix}js/main.js?v={ASSET_V}" defer></script>\n</body>\n</html>\n'
            (ROOT / ("fr/" + page if lang == "fr" else page)).write_text(out, encoding="utf-8")

    urls = ""
    for p in PAGES:
        for lang in ("en", "fr"):
            urls += (f"  <url><loc>{url_for(p, lang)}</loc><lastmod>{BUILD_DATE}</lastmod>"
                     f'<xhtml:link rel="alternate" hreflang="en" href="{url_for(p, "en")}"/>'
                     f'<xhtml:link rel="alternate" hreflang="fr" href="{url_for(p, "fr")}"/></url>\n')
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        f'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n{urls}</urlset>\n', encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")

    if "--strings" in sys.argv:
        (SRC / "i18n/strings-en.json").write_text(json.dumps(sorted(seen), ensure_ascii=False, indent=1), encoding="utf-8")
    unused = [k for k in fr_strings if k not in seen]
    print(f"Built {len(PAGES)} pages x 2 languages, {len(seen)} strings, {len(seen) - len(missing)} translated.")
    if unused:
        print(f"Note: {len(unused)} French entries are no longer used:")
        for s in unused:
            print("  ~", s[:90])
    if missing:
        print(f"WARNING: {len(missing)} strings have no French translation:")
        for s in missing:
            print("  -", s)
        sys.exit(1 if "--strict" in sys.argv else 0)


if __name__ == "__main__":
    main()
