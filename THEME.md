# Theme 2027 — Pop Pink + Deep Oxblood (Palette #3)

Fashion store (sizes, outfits) ke liye chuna gaya. Source of truth: `src/app/globals.css` (`:root` variables + Tailwind `@theme` tokens).

| Token (Tailwind) | Hex | Use |
|---|---|---|
| `canvas` | #FDF8F9 | page background (60%) |
| `surface` / `surface-soft` | #F8E9EE / #FBF0F4 | cards, footer, inputs (30%) |
| `line` / `line-strong` | #EBDADF / #D9C0C8 | borders |
| `ink` / `ink-soft` / `ink-mute` | #24191C / #5E4A50 / #7A5F68 | text |
| `brand` / `brand-hover` | #5C1A2B / #7A2339 | CTA, nav, links (10%) |
| `brand-deep` | #3A0F1B | flash banner, admin sidebar |
| `pop` / `pop-hover` / `pop-soft` | #F25CA2 / #FF7DB8 / #FFB3D4 | promo banner, sale badges, accents |

Rules: pop pink ke upar hamesha `text-ink` (white 3.1:1 fail). Burgundy ke upar `text-white` (12.8:1).
Sale badge = `bg-pop text-ink`. Discount price colour = `--sale-price` (#B0124F).
Theme badalna ho to sirf `:root` ke hex change karein, classes wahi rahengi.
`docs/theme-preview.html` browser mein khol kar quick mockup dekh sakte hain.
