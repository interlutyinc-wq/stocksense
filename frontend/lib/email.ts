import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");

// Sender — switches to custom domain once DNS is configured
const FROM = "StockSense <onboarding@resend.dev>";

// ── Purchase Order email ───────────────────────────────────────────────────────

interface SendPOEmailParams {
  to: string;
  supplierName: string;
  merchantEmail: string;
  productName: string;
  sku: string;
  plan?: string; // used to control branding visibility
  quantity: number;
  estimatedCost: number | null;
  reasoning: string;
  poId: string;
}

export async function sendPOEmail(params: SendPOEmailParams) {
  const {
    to, supplierName, merchantEmail, productName,
    sku, quantity, estimatedCost, reasoning, poId,
  } = params;

  const costLine = estimatedCost
    ? `<tr><td style="padding:8px 0;color:#6b7280">Estimated cost</td><td style="padding:8px 0;font-weight:600">$${estimatedCost.toFixed(2)}</td></tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">

        <!-- Header -->
        <tr>
          <td style="background:#080808;padding:24px 32px">
            <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">
              Stock<span style="color:#ff4d1c">Sense</span>
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280">Purchase Order · PO-${poId.slice(-8).toUpperCase()}</p>
            <h1 style="margin:0 0 24px;font-size:24px;font-weight:800;color:#111827">Reorder request from ${merchantEmail}</h1>

            <p style="margin:0 0 24px;color:#374151;line-height:1.6">
              Dear <strong>${supplierName}</strong>,<br><br>
              StockSense has generated the following purchase order based on current inventory analysis.
              Please confirm availability and provide a quote at your earliest convenience.
            </p>

            <!-- PO Table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px">
              <tr style="background:#f9fafb">
                <td style="padding:12px 16px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#6b7280">Detail</td>
                <td style="padding:12px 16px;font-size:12px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#6b7280">Value</td>
              </tr>
              <tr style="border-top:1px solid #e5e7eb">
                <td style="padding:12px 16px;color:#6b7280">Product</td>
                <td style="padding:12px 16px;font-weight:600;color:#111827">${productName}</td>
              </tr>
              <tr style="border-top:1px solid #e5e7eb;background:#f9fafb">
                <td style="padding:12px 16px;color:#6b7280">SKU</td>
                <td style="padding:12px 16px;font-weight:600;color:#111827;font-family:monospace">${sku}</td>
              </tr>
              <tr style="border-top:1px solid #e5e7eb">
                <td style="padding:12px 16px;color:#6b7280">Quantity requested</td>
                <td style="padding:12px 16px;font-weight:700;color:#ff4d1c;font-size:18px">${quantity} units</td>
              </tr>
              ${costLine}
            </table>

            <!-- AI Reasoning -->
            <div style="background:#f9fafb;border-left:3px solid #ff4d1c;padding:16px;margin-bottom:24px;border-radius:0 6px 6px 0">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#6b7280">Agent reasoning</p>
              <p style="margin:0;color:#374151;line-height:1.6;font-size:14px">${reasoning}</p>
            </div>

            <p style="margin:0 0 24px;color:#374151;line-height:1.6">
              Please reply to this email with:<br>
              • Availability confirmation<br>
              • Lead time estimate<br>
              • Unit price / total quote
            </p>

            <a href="mailto:${merchantEmail}?subject=Re: PO-${poId.slice(-8).toUpperCase()} — ${productName}"
               style="display:inline-block;background:#ff4d1c;color:#ffffff;font-weight:700;padding:12px 24px;text-decoration:none;border-radius:4px">
              Reply to merchant →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
              This PO was approved by ${merchantEmail}
            </p>
            ${!params.plan || params.plan === "free" ? `
            <p style="margin:8px 0 0;text-align:center">
              <a href="https://stocksense-interlutyinc-wqs-projects.vercel.app?ref=po-email"
                 style="display:inline-block;margin-top:4px;background:#080808;color:#ffffff;font-size:11px;font-weight:700;padding:6px 14px;text-decoration:none;border-radius:3px;letter-spacing:0.05em">
                ⚡ Powered by <span style="color:#ff4d1c">StockSense</span> — AI supply chain agent
              </a>
            </p>` : `
            <p style="margin:6px 0 0;font-size:10px;color:#d1d5db;text-align:center">
              Sent via <a href="https://stocksense-interlutyinc-wqs-projects.vercel.app?ref=po-email" style="color:#d1d5db">StockSense</a>
            </p>`}
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from: FROM,
    to,
    replyTo: merchantEmail,
    subject: `PO-${poId.slice(-8).toUpperCase()} — Reorder request: ${quantity}x ${productName} (${sku})`,
    html,
  });
}
