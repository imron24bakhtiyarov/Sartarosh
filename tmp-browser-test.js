// Vaqtinchalik test: CDP orqali sahifa oqimini tekshiradi
const run = async () => {
  const targets = [
    {
      name: "Katalog sahifasi",
      url: "http://localhost:4173/hairstyles.html",
      expr: `JSON.stringify({
        cards: document.querySelectorAll('.style-card').length,
        filters: document.querySelectorAll('.filter-btn').length,
        tanlashLinks: [...document.querySelectorAll('.style-card .btn')].filter(a => a.href.includes('#booking') && a.href.includes('style=')).length,
        title: document.title
      })`,
    },
    {
      name: "Katalog → booking (Skin fade)",
      url: "http://localhost:4173/index.html?style=Skin%20fade&service=Zamonaviy%20kesim%20(fade)&price=110%20000%20so'm#booking",
      expr: `JSON.stringify({
        style: document.querySelector('#styleInput').value,
        service: document.querySelector('select[name="service"]').value,
        noteVisible: !document.querySelector('#styleNote').hidden
      })`,
    },
    {
      name: "Katalog → booking (+ belgisi bilan)",
      url: "http://localhost:4173/index.html?style=Soch%20%2B%20saqol%20(to'liq%20paket)&service=Soch%20%2B%20saqol%20(to'liq%20paket)&price=140%20000%20so'm#booking",
      expr: `JSON.stringify({
        style: document.querySelector('#styleInput').value,
        service: document.querySelector('select[name="service"]').value
      })`,
    },
    {
      name: "Bosh sahifasiz (paramsiz) forma",
      url: "http://localhost:4173/index.html#booking",
      expr: `JSON.stringify({
        style: document.querySelector('#styleInput').value,
        noteHidden: document.querySelector('#styleNote').hidden
      })`,
    },
  ];

  // Qo'shimcha: filtr + formani brauzerda yuborish
  targets.push({
    name: "Filtr (Bolalar)",
    url: "http://localhost:4173/hairstyles.html",
    expr: `(async () => {
      document.querySelector('[data-filter="bolalar"]').click();
      await new Promise(r => setTimeout(r, 300));
      const visible = [...document.querySelectorAll('.style-card')].filter(c => !c.classList.contains('is-hidden')).length;
      const wrong = [...document.querySelectorAll('.style-card')].filter(c => !c.classList.contains('is-hidden') && c.dataset.cat !== 'bolalar').length;
      return JSON.stringify({ visible, wrong });
    })()`,
  });
  targets.push({
    name: "Brauzerda formani yuborish",
    url: "http://localhost:4173/index.html?style=Klassik%20kesim&service=Klassik%20kesim&price=90%20000%20so'm#booking",
    expr: `(async () => {
      const f = document.querySelector('#bookingForm');
      f.querySelector('[name=name]').value = 'Browser Test';
      f.querySelector('[name=phone]').value = '+998903333333';
      f.querySelector('[name=date]').value = '2026-10-10';
      f.requestSubmit();
      await new Promise(r => setTimeout(r, 2000));
      return JSON.stringify({
        toast: document.querySelector('#toast').textContent,
        toastShown: document.querySelector('#toast').classList.contains('show'),
        styleStill: f.querySelector('[name=style]').value
      });
    })()`,
  });

  for (const t of targets) {
    const res = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(t.url)}`, { method: "PUT" });
    const target = await res.json();
    await new Promise((r) => setTimeout(r, 2500));
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    const out = await new Promise((resolve, reject) => {
      ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: t.expr, returnByValue: true, awaitPromise: true } }));
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.id === 1) {
          if (m.result?.result?.value) resolve(m.result.result.value);
          else reject(new Error(JSON.stringify(m.result?.exceptionDetails || m.result)));
        }
      };
      setTimeout(() => reject(new Error("timeout")), 8000);
    });
    ws.close();
    await fetch(`http://127.0.0.1:9222/json/close/${target.id}`);
    console.log(`${t.name}: ${out}`);
  }
  process.exit(0);
};

run().catch((e) => { console.error("XATO:", e.message); process.exit(1); });
