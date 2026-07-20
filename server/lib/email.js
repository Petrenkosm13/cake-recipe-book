const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const APP_URL = process.env.APP_URL || "";

async function sendVerificationEmail(to, token) {
  const verifyUrl = `${APP_URL}/api/auth/verify?token=${encodeURIComponent(token)}`;

  if (!RESEND_API_KEY) {
    // No key configured (e.g. local dev) — log the link instead of failing signup.
    console.warn("[email] RESEND_API_KEY not set. Verification link:", verifyUrl);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject: "Підтвердіть email — Кондитерська книга",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #2E2420;">
          <h2 style="color:#3F1C2B;">Підтвердження email</h2>
          <p>Дякуємо за реєстрацію в Кондитерській книзі. Підтвердіть свою email-адресу, натиснувши кнопку нижче:</p>
          <p>
            <a href="${verifyUrl}" style="display:inline-block;background:#6B2C43;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
              Підтвердити email
            </a>
          </p>
          <p style="color:#7A6C61;font-size:12px;">Якщо кнопка не працює, перейдіть за посиланням: <br>${verifyUrl}</p>
          <p style="color:#7A6C61;font-size:12px;">Посилання дійсне 24 години.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[email] Resend API error:", res.status, text);
  }
}

module.exports = { sendVerificationEmail };
