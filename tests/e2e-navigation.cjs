// Prueba de navegación entre páginas con las animaciones activas (escritorio y móvil).
// Uso: BASE_URL=http://localhost:3000 node tests/e2e-navigation.cjs
const { chromium, devices } = require("playwright");
(async () => {
  const b = await chromium.launch();
  for (const [label, opts] of [["escritorio", { viewport: { width: 1440, height: 900 } }], ["movil", { ...devices["iPhone 13"] }]]) {
    const p = await (await b.newContext(opts)).newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    const base = process.env.BASE_URL || "http://localhost:3000";
    const clickHref = async (sel) => { await p.evaluate((s) => { const a = document.querySelector(s); if (!a) throw new Error("no " + s); a.click(); }, sel); await p.waitForTimeout(1800); };
    const check = async (step) => {
      const t = await p.locator("body").innerText();
      const bad = t.includes("Application error") || errs.length;
      console.log(`${label} ${bad ? "FALLO" : "ok   "} ${step} -> ${new URL(p.url()).pathname}${new URL(p.url()).search}`);
      if (bad) process.exitCode = 1;
      if (errs.length) { console.log("   ", errs.join(" | ")); errs.length = 0; }
    };
    await p.goto(base + "/"); await p.waitForTimeout(4500); await check("carga portada");
    for (let k = 0; k < 30; k++) { await p.mouse.wheel(0, 250); await p.waitForTimeout(25); } await p.waitForTimeout(1200);
    await clickHref('a[href^="/catalogo?categoria="][data-cursor]'); await check("portada(recorrido) -> categoría");
    await clickHref('input[name="modo"][value="direct"]').catch(() => {});
    await p.evaluate(() => { const i = document.querySelector('input[name="modo"][value="direct"]'); if (i) { i.click(); } }); await p.waitForTimeout(1800); await check("filtro modalidad");
    await p.goto(base + "/catalogo"); await p.waitForTimeout(1500);
    await clickHref('a[href="/catalogo?categoria=sensores-y-seguridad"]'); await check("catálogo -> otra categoría (mismo título dividido)");
    await clickHref("article a"); await check("catálogo -> producto");
    await p.goBack(); await p.waitForTimeout(1800); await check("atrás");
    await p.goForward(); await p.waitForTimeout(1800); await check("adelante");
    await clickHref('a[href="/"]'); await check("producto -> portada");
    await clickHref("article a"); await check("portada -> producto");
    await p.goBack(); await p.waitForTimeout(2200); await check("atrás a portada");
    await clickHref('a[href="/carrito"]'); await check("-> carrito");
    await clickHref('a[href="/cotizacion"]'); await check("-> cotización");
    await clickHref('a[href="/seguimiento"]'); await check("-> seguimiento");
    await clickHref('a[href="/catalogo"]'); await check("-> catálogo");
    await clickHref('a[href^="/producto/"]'); await check("-> producto");
    await clickHref('a[href^="/catalogo?categoria="]'); await check("producto -> categoría (miga)");
  }
  await b.close();
  if (process.exitCode) console.log("Hubo fallos de navegación.");
})();
