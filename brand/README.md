# Marque DôniPay

Sources SVG + générateur PNG.

## Couleurs

| Token | Hex |
| --- | --- |
| Violet primaire | `#6D28D9` |
| Violet profond | `#5B21B6` |
| Blanc | `#FFFFFF` |
| Violet soft | `#EDE9FE` |

## Régénérer les assets

```bash
node brand/generate-assets.mjs
```

Sorties :
- `mobile/assets/` (icon, splash, favicon, adaptive)
- `mobile/assets/brand/` (mark + full, fond transparent)
- `admin/public/brand/` + `admin/public/favicon.png`
