/**
 * Email delivery via the Resend API.
 *
 * Uses plain `fetch` so it works in edge runtimes (Cloudflare Workers /
 * next-on-pages) without any Node-specific dependencies.
 */

export interface SendDownloadEmailParams {
  /** Recipient email address (from Stripe customer_details). */
  to: string;
  /** Stripe checkout session ID, used to build the download URL. */
  sessionId: string;
  /** Number of note pairs in the flute design. */
  noteCount: number;
  /** Nameplate text engraved on the flute. */
  nameplate: string;
  /** Origin of the request (e.g. https://panflute.design). */
  origin: string;
  /** Cloudflare env bindings (needs RESEND_API_KEY). */
  env: Pick<Env, "RESEND_API_KEY">;
}

/**
 * Send the "Your STL is ready" download email via Resend.
 *
 * Throws on network / API errors so the caller can decide whether to
 * swallow or propagate them.
 */
export async function sendDownloadEmail(
  params: SendDownloadEmailParams
): Promise<void> {
  const { to, sessionId, noteCount, nameplate, origin, env } = params;

  const downloadUrl = `${origin}/order/${sessionId}`;

  const htmlBody = buildHtml({ downloadUrl, noteCount, nameplate });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Pan Flute Designer <noreply@panflute.design>",
      to: [to],
      subject: "Your Pan Flute STL is Ready!",
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function buildHtml(params: {
  downloadUrl: string;
  noteCount: number;
  nameplate: string;
}): string {
  const { downloadUrl, noteCount, nameplate } = params;

  const nameplateSection = nameplate
    ? `<tr>
          <td style="padding:0 0 16px">
            <strong>Nameplate:</strong> ${escapeHtml(nameplate)}
          </td>
        </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:32px 0">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
          <!-- Header -->
          <tr>
            <td style="background:#2563eb;padding:24px 32px">
              <h1 style="margin:0;color:#ffffff;font-size:22px">Pan Flute Designer</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 0 16px">
                    <h2 style="margin:0 0 8px;font-size:20px;color:#111">Your STL is ready!</h2>
                    <p style="margin:0;color:#555;font-size:15px;line-height:1.5">
                      Your custom pan flute has been generated and is ready for download.
                    </p>
                  </td>
                </tr>

                <!-- Design summary -->
                <tr>
                  <td style="padding:0 0 16px">
                    <strong>Notes:</strong> ${noteCount} pipe${noteCount !== 1 ? "s" : ""}
                  </td>
                </tr>
                ${nameplateSection}

                <!-- Download button -->
                <tr>
                  <td style="padding:8px 0 24px" align="center">
                    <a href="${escapeHtml(downloadUrl)}"
                       style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600">
                      Download STL
                    </a>
                  </td>
                </tr>

                <!-- Expiry notice -->
                <tr>
                  <td style="padding:16px;background:#fef9c3;border-radius:6px;color:#854d0e;font-size:14px;line-height:1.5">
                    This download link will expire in <strong>7 days</strong>. Please save your STL file before then.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;color:#888;font-size:12px;text-align:center">
              Pan Flute Designer &mdash; Custom 3D-printable pan flutes
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Basic HTML entity escaping for user-supplied strings. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
