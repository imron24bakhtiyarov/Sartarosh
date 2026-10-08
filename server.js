// Lokal server: `node server.js` → http://localhost:4173
const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");

const PORT = process.env.PORT || 4173;

/* ---------- Telegram sozlamalari (config.json) ---------- */
const CONFIG_FILE = path.join(__dirname, "config.json");
const loadConfig = () => {
  let cfg = {};
  try {
    cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch {}
  if (process.env.BOT_TOKEN) cfg.bot_token = process.env.BOT_TOKEN;
  if (process.env.CHAT_ID) cfg.chat_id = process.env.CHAT_ID;
  return cfg;
};

const json = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

/* ---------- Bron qilish so'rovini qayta ishlash ---------- */
const handleBooking = (raw, res) => {
  let data;
  try {
    data = JSON.parse(raw || "{}");
  } catch {
    return json(res, 400, { ok: false, error: "Noto'g'ri so'rov" });
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
    return json(res, 400, { ok: false, error: "Maydonlar noto'g'ri to'ldirilgan" });
  }

  const cfg = loadConfig();
  if (!cfg.bot_token || !cfg.chat_id) {
    return json(res, 503, {
      ok: false,
      error: "Telegram bot hali ulanmagan — config.json faylini to'ldiring.",
    });
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

  sendTelegram(cfg, text)
    .then(() => json(res, 200, { ok: true }))
    .catch((e) => {
      console.error("Telegram xatosi:", e.message);
      json(res, 502, { ok: false, error: "Telegramga yuborib bo'lmadi" });
    });
};
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);

    if (req.method === "POST" && url === "/api/booking") {
      let body = "";
      req.on("data", (c) => {
        body += c;
        if (body.length > 100000) req.destroy();
      });
      req.on("end", () => handleBooking(body, res));
      return;
    }

    let p = url;
    if (p === "/") p = "/index.html";
    const file = path.join(__dirname, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 — topilmadi");
        return;
      }
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log("SARTAROSH sayti ishga tushdi → http://localhost:" + PORT));
