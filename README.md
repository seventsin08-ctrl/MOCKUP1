# Koze Hub — Sip & Work · client demo

Interactive, mobile-first demo website prepared by BlackGate for Koze Hub.
Plain HTML/CSS/JS, no backend, ready for static hosting.

- **Live demo:** https://koze-hub-demo.netlify.app/
- **QR code:** `assets/qr/koze-hub-demo-qr.png` (points to the live demo)

## What's inside
- `index.html` – customer site (spaces, amenities, location) + Staff demo view (`#staff`)
- `assets/js/app.js` – booking flow, staff simulation, QR/share tools
- `assets/js/qrcode.js` – qrcode-generator 1.4.4 (MIT, Kazuhiko Arase)
- `assets/img/` – photo crops taken from the Koze Hub poster (no price stickers or text)
- `config.js` – `siteUrl` used for the QR code. If you host elsewhere, change it
  (the page refuses localhost, IP addresses and placeholder URLs).

## Demo rules
- Prices are the poster's advertised starting prices; staff confirm rates and availability.
- No reservation, notification or payment happens. Test requests are stored only in the
  current browser (localStorage); "Reset demo data" in the Staff demo clears them.

## Run locally
```bash
python3 -m http.server 8000
```
