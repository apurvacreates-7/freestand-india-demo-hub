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

`mondelez/index.html` — FreeStand × Mondelēz India story in the Freestand Studio UI. One guided flow
(← / → or the story bar) that combines this hub, the Mondelēz use-case demos and the CDP prototype:

1. Today vs proposed consumer-data flow
2. Every campaign mechanic on one platform, live in 1–2 days (12 mechanics with their demos)
3. Meena’s unified profile built from those campaigns
4. Enrichment with Paytm, Google Pay, Swiggy, Blinkit and Zepto via the KOSA clean room
5. Cohorts · 6. Insights (LTV, inferred traits, NPD, campaign ideas)
7. Push to Mondelēz Lytics and activation (Meta, Google, Amazon, CPAS, OTT) with match rates
8. Pricing: Launch / Portfolio / Scale

Live at `/mondelez/` under this site's GitHub Pages URL. Built output only; the editable React source is kept separately.
