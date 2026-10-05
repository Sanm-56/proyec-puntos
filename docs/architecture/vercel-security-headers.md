# Vercel Security Headers

## Purpose

F8.2 adds a Vercel static-route header policy that improves browser-side protection without changing application behavior, database configuration, deployment, or domains.

## Runtime Origin Inventory

| Origin | Classification | Use |
| --- | --- | --- |
| `self` | scripts, styles, images, fonts, connections | Static HTML, CSS, JavaScript, product images, and same-origin navigation. |
| `https://cdn.jsdelivr.net` | script | The `@supabase/supabase-js@2` browser SDK loaded by `index.html`. |
| `https://cyjgonlsovzfeehuqqdg.supabase.co` | connect/fetch | Supabase REST, Auth, RPC, session refresh, and account/admin/loyalty requests. |
| `https://wa.me` | navigation only | Intentional WhatsApp support and checkout links. It is not a script, image, style, font, or fetch origin. |

There are no external stylesheet/font providers, remote product images, direct Realtime channels, `WebSocket` construction, `fetch()` calls outside the Supabase SDK, or active `http://` resources. Product images and CSS/JS are local.

## Headers Added

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` as documented below.

The policy applies to `/(.*)` and does not add redirects, rewrites, domain settings, or cache behavior.

## Content Security Policy

| Directive | Value | Reason |
| --- | --- | --- |
| `default-src` | `'self'` | Safe default for local static resources. |
| `base-uri` | `'self'` | Prevents hostile base-URL injection. |
| `object-src` | `'none'` | The application uses no plugins or embedded objects. |
| `frame-ancestors` | `'none'` | GO TIENDA is not intended for third-party embedding. |
| `form-action` | `'self'` | Forms are client-handled; no external form submission exists. |
| `script-src` | `'self' https://cdn.jsdelivr.net` | Allows local application modules and the exact Supabase CDN host. |
| `style-src` | `'self' 'unsafe-inline'` | Local stylesheet plus existing JavaScript-created style properties for cart animation and variant availability. There are no inline scripts. |
| `img-src` | `'self'` | Product and logo images are local. |
| `font-src` | `'self'` | No external web font is loaded. |
| `connect-src` | `'self' https://cyjgonlsovzfeehuqqdg.supabase.co` | Exact project REST/Auth/RPC endpoint; no wildcard Supabase host. |

`unsafe-inline` is restricted to `style-src`; it is not present in `script-src`. `unsafe-eval` is absent. No CSP wildcard, `data:`, or broad `https:` source is used.

## Supabase Compatibility

The configured endpoint is `https://cyjgonlsovzfeehuqqdg.supabase.co`. Its exact HTTPS origin in `connect-src` supports the browser SDK's REST, Auth, RPC, session-refresh, checkout, account, loyalty, and admin requests. The current source does not create Supabase Realtime channels, so no WebSocket origin is permitted. If Realtime is added later, explicitly review and add only the corresponding `wss://cyjgonlsovzfeehuqqdg.supabase.co` origin.

## WhatsApp Compatibility

`wa.me` remains an intentional external navigation through anchor links and `window.open`. It needs no `script-src` or `connect-src` permission. This policy does not set `navigate-to`, so it does not block the existing user-initiated WhatsApp flow.

## Permissions Policy

Source inspection confirms no camera, microphone, or geolocation use. Those capabilities are disabled. No additional browser capabilities are restricted in this phase.

## Clickjacking Protection

`frame-ancestors 'none'` provides the CSP control and `X-Frame-Options: DENY` provides compatibility protection. No existing application behavior requires framing.

## Referrer Policy

`strict-origin-when-cross-origin` retains useful same-origin referrers while limiting cross-origin requests to origin-only information.

## HSTS

HSTS is deferred. The project has no custom-domain configuration in scope, so this phase does not add `Strict-Transport-Security`, `includeSubDomains`, or `preload`.

## Deferred Headers

`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, and `Cross-Origin-Resource-Policy` are deferred because cross-origin isolation is not required and could affect CDN/Supabase compatibility. Realtime WebSocket CSP support is deferred until source introduces Realtime.

## Production Validation Checklist

After deployment, verify the response headers and test:

- Supabase initialization, registration, login, session restoration, logout, and account updates.
- Catalog, search, cart, delivery, checkout RPC, purchase history, loyalty, admin queries, and admin RPCs.
- Local product images, Supabase CDN loading, and WhatsApp checkout/support links.
- Browser console for CSP violations.
- Frame embedding is denied and no mixed-content warning appears.
