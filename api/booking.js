const https = require("https");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sendTelegram = (cfg, text) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      chat_id: cfg.chat_id,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${cfg.bot_token}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 10000,
      },
      (resp) => {
        let data = "";
        resp.on("data", (c) => (data += c));
        resp.on("end", () => {
          try {
            const out = JSON.parse(data);
            out.ok ? resolve(out) : reject(new Error(out.description || "Telegram xatosi"));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Telegram javob bermadi")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  let data;
  try {
    data = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    res.status(400).json({ ok: false, error: "Noto'g'ri so'rov" });
    return;
  }

  const get = (k) => String(data[k] || "").trim();
  const name = get("name");
  const phone = get("phone");
  const date = get("date");
  const service = get("service");
  const barber = get("barber");
  const time = get("time");
  const style = get("style");

  if (name.length < 2 || phone.replace(/\D/g, "").length < 9 || !date) {
    res.status(400).json({ ok: false, error: "Maydonlar noto'g'ri to'ldirilgan" });
    return;
  }

  const cfg = {
    bot_token: process.env.BOT_TOKEN,
    chat_id: process.env.CHAT_ID,
  };
  if (!cfg.bot_token || !cfg.chat_id) {
    res.status(503).json({
      ok: false,
      error: "Telegram bot hali ulanmagan — Vercel'da BOT_TOKEN va CHAT_ID o'rnating.",
    });
    return;
  }

  const text = [
    "<b>🆕 Yangi bron (SARTAROSH sayti)</b>",
    "",
    `👤 Ism: <b>${esc(name)}</b>`,
    `📞 Telefon: <b>${esc(phone)}</b>`,
    ...(style ? [`💇 Tanlangan turmak: <b>${esc(style)}</b>`] : []),
    `✂️ Xizmat: ${esc(service) || "—"}`,
    `💈 Usta: ${esc(barber) || "—"}`,
    `📅 Sana: <b>${esc(date)}</b>`,
    `⏰ Vaqt: ${esc(time) || "—"}`,
  ].join("\n");

  try {
    await sendTelegram(cfg, text);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Telegram xatosi:", e.message);
    res.status(502).json({ ok: false, error: "Telegramga yuborib bo'lmadi" });
  }
};
