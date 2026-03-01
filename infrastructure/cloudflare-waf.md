# Cloudflare WAF Rules — Pan Flute Production

Recommended Cloudflare WAF configuration for the pan flute storefront
deployed on Cloudflare Pages.

---

## 1. Rate Limiting Rules (WAF Custom Rules)

These operate at the Cloudflare edge, **before** the request reaches the
Workers runtime, so they shed abusive traffic at no compute cost.

### Checkout endpoint

| Field | Value |
|---|---|
| Rule name | `rate-limit-checkout` |
| Match | `URI Path equals /api/checkout` AND `Method equals POST` |
| Rate | 10 requests per 60 seconds |
| Counting expression | Per IP (`ip.src`) |
| Action | Block (429) |
| Duration | 60 seconds |

### Webhook endpoint

Stripe retries on failure, so avoid overly aggressive limits. The
endpoint already validates the Stripe signature; the WAF rule is a
defence-in-depth measure.

| Field | Value |
|---|---|
| Rule name | `rate-limit-webhook` |
| Match | `URI Path equals /api/webhook` AND `Method equals POST` |
| Rate | 60 requests per 60 seconds |
| Counting expression | Per IP (`ip.src`) |
| Action | Block (429) |
| Duration | 60 seconds |

### Global API catch-all

| Field | Value |
|---|---|
| Rule name | `rate-limit-api-global` |
| Match | `URI Path starts with /api/` |
| Rate | 100 requests per 60 seconds |
| Counting expression | Per IP (`ip.src`) |
| Action | Challenge (Managed Challenge) |
| Duration | 120 seconds |

---

## 2. Bot Protection

Cloudflare's **Bot Fight Mode** should be enabled (free tier) or
**Super Bot Fight Mode** (Pro+). Configure as follows:

- **Definitely automated** → Block
- **Likely automated** → Managed Challenge
- **Verified bots** (e.g., Googlebot) → Allow

Add a WAF custom rule to block requests with low bot scores on the
checkout endpoint:

| Field | Value |
|---|---|
| Rule name | `bot-block-checkout` |
| Match | `URI Path equals /api/checkout` AND `cf.bot_management.score lt 30` |
| Action | Block |

> Note: `cf.bot_management.score` requires the Enterprise plan.  On
> Pro/Business, use **Super Bot Fight Mode** toggles instead.

---

## 3. IP Reputation Filtering

Enable the built-in Cloudflare **IP Access Rules**:

- Block traffic from **Tor exit nodes** if your use case doesn't require
  Tor support (Security > WAF > Tools > IP Access Rules).
- Consider blocking known-bad ASNs that appear in your abuse logs.

For an additional layer, add a WAF rule:

| Field | Value |
|---|---|
| Rule name | `block-high-threat-score` |
| Match | `cf.threat_score gt 50` |
| Action | Managed Challenge |

---

## 4. Additional Hardening

### Stripe webhook origin restriction

Stripe publishes its webhook source IP ranges. Create an IP Access rule
or WAF rule that only allows `/api/webhook` from those ranges:

```
URI Path equals /api/webhook
AND ip.src not in {list:stripe-webhook-ips}
→ Block
```

Maintain the IP list as a Cloudflare List
(Security > WAF > Tools > Lists) and update it periodically from
https://stripe.com/docs/ips.

### HTTPS-only

Ensure the **Always Use HTTPS** setting is enabled under SSL/TLS > Edge
Certificates.  This is on by default for Cloudflare Pages custom
domains.

### Headers

Add the following security response headers via a Cloudflare Transform
Rule (or `_headers` file in Pages):

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 5. Monitoring

- Enable **Security Events** notifications (email or webhook) so you are
  alerted when rate-limit or bot rules fire at an unusual rate.
- Review the **Security > Analytics** dashboard weekly to tune
  thresholds.
