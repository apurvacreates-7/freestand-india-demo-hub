# FreeStand — India Demo Hub

Interactive "demo of demos" for FreeStand India: six sampling journeys in one shell.

1. Website sampling — Lotus Biscoff, the whole journey
2. Promoter sampling — Oreo, offline at the stall
3. Online to offline — Cadbury
4. Digital sampling — Cadbury Celebrations
5. Loyalty — Joy Club
6. CDP — FreeStand Data Platform

`index.html` is a self-contained bundle exported from Claude Design (all fonts, images and
nested demo pages are embedded), so it is served as-is by GitHub Pages.
Use ← / → or the Previous / Next buttons to step through each demo.

> Serve it over http(s) (GitHub Pages or `python3 -m http.server`). Opened straight from disk
> (`file://`), the browser blocks the hub from forwarding Next/Prev into the interactive demos 2–4.

## Pampers Demo Hub

`pampers/index.html` — FreeStand × Pampers India, two tabs:

1. Claim to loyalty — pampers.in web form, WhatsApp OTP, size allocation, qualification checks, then delivery, feedback and Pampers Club on WhatsApp
2. Offline + voice AI — in-store stand, size-matched hand-over, voice AI verification, loyalty or audit flag

Live at `/pampers/` under this site's GitHub Pages URL.

## Mondelēz: one platform, end to end

`mondelez/index.html` — FreeStand × Mondelēz India story in the Freestand Studio UI. Pick any of 12 campaign
mechanics (each live in 1–2 days), run its demo, see its analytics in Studio, then follow the data:
Meena’s unified profile → enrichment with Paytm, Google Pay, Swiggy, Blinkit and Zepto via the KOSA clean
room → cohorts → insights → push to Mondelēz Lytics and activation with match rates → pricing.
Use ← / → or the story bar.

Live at `/mondelez/` under this site's GitHub Pages URL. Built output only; the editable React source is kept separately.
