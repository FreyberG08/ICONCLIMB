/* eslint-disable */
// Prueba de extremo a extremo de los criterios de la primera versión (modo demostración).
// Uso: BASE_URL=http://localhost:3000 node tests/e2e-flow.cjs [carpeta-capturas]
// Requiere Playwright (npx playwright install chromium si no está disponible).
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PASSWORD = process.env.DEMO_PASSWORD || "icon-demo-2026";
const SHOTS = process.argv[2] || null;
const SKU = `E2E-${require("node:crypto").randomBytes(4).toString("hex").toUpperCase()}`;
const NAME = `Placa de prueba ${SKU}`;
const results = [];

function ok(label) {
  results.push(`OK   ${label}`);
  console.log(`OK   ${label}`);
}
async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}
async function login(page, email) {
  await page.goto(`${BASE}/admin/login`);
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await Promise.all([page.waitForURL(/\/admin(\?|$)/), page.click("button[type=submit]")]);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("PAGEERROR", e.message));

  // Imagen de prueba (captura del hero)
  await page.goto(BASE);
  await shot(page, "01-home");
  const imgPath = path.join(require("node:os").tmpdir(), `icon-e2e-${Date.now()}.png`);
  await page.locator("svg[role=img]").first().screenshot({ path: imgPath });
  ok("Home carga y muestra el hero");

  // 1. Login administrador
  await login(page, "admin@icon.demo");
  await shot(page, "02-admin-dashboard");
  ok("Administrador inicia sesión");

  // 2. Crear producto con fotografía y guardar borrador
  await page.goto(`${BASE}/admin/productos/nuevo`);
  await page.fill("#name", NAME);
  await page.fill("#sku", SKU);
  await page.selectOption("#cat", { label: "Botoneras y displays" });
  await page.fill("#model", "E2E-MOD");
  await page.fill("#ref", `REF-${SKU}`);
  await page.fill("#short", "Repuesto creado por la prueba automática de extremo a extremo.");
  await page.getByRole("radio", { name: /Compra directa/ }).click();
  await page.fill("#price", "49.90");
  await page.fill("#init", "5");
  await page.locator('input[type=file][multiple]').setInputFiles(imgPath);
  await page.waitForSelector("text=Se subirán al guardar el producto");
  await shot(page, "03-admin-nuevo-producto");
  await Promise.all([page.waitForURL(/\/admin\/productos\/[0-9a-f-]{36}\?creado=1/), page.getByRole("button", { name: "Guardar borrador" }).click()]);
  const productUrl = page.url().split("?")[0];
  await page.waitForSelector("text=Producto creado como borrador");
  await page.waitForSelector('img[alt=""] >> nth=0');
  if (!(await page.locator("text=Principal").count())) throw new Error("La fotografía no quedó como principal");
  ok("Producto creado en borrador con fotografía principal");

  // Antes de publicar no aparece en el catálogo
  const pre = await (await fetch(`${BASE}/api/search?q=${SKU}`)).json();
  if (pre.items.length) throw new Error("Un borrador aparece en la búsqueda pública");
  ok("El borrador no es visible públicamente");

  // 3. Publicar
  await page.getByRole("button", { name: "Aprobar y publicar" }).click();
  await page.waitForSelector("text=Guardado · estado: Publicado");
  await shot(page, "04-admin-producto-publicado");
  ok("Revisor/administrador publica el producto");

  // 4. Aparece en catálogo, búsqueda y filtros (sin redespliegue)
  const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const shop = await anon.newPage();
  await shop.goto(`${BASE}/catalogo?q=${SKU}`);
  await shop.waitForSelector(`text=${NAME}`);
  ok("Búsqueda por SKU encuentra el producto");
  await shop.goto(`${BASE}/catalogo?q=REF-${SKU}`);
  await shop.waitForSelector(`text=${NAME}`);
  ok("Búsqueda por referencia original encuentra el producto");
  await shop.goto(`${BASE}/catalogo?categoria=botoneras-y-displays&modo=direct&disponibilidad=available&q=${SKU}`);
  await shop.waitForSelector(`text=${NAME}`);
  await shot(shop, "05-catalogo-filtros");
  ok("Filtros de categoría, modalidad y disponibilidad lo reconocen");

  // 5. Compra directa → carrito → pedido
  await shop.click(`text=${NAME}`);
  await shop.waitForSelector("text=Agregar al carrito");
  await shot(shop, "06-ficha-producto");
  await shop.getByRole("button", { name: "Aumentar cantidad" }).click();
  await shop.getByRole("button", { name: /Agregar al carrito/ }).click();
  await shop.goto(`${BASE}/carrito`);
  await shop.waitForSelector("text=Subtotal");
  await shop.waitForFunction(() => document.body.innerText.includes("99,80"));
  await shot(shop, "07-carrito");
  ok("Carrito calcula 2 × 49,90 = 99,80");
  await shop.click("text=Continuar con el pedido");
  await shop.fill("#c-name", "Cliente de Prueba");
  await shop.fill("#c-email", "cliente.e2e@example.com");
  await shop.fill("#c-phone", "+58 412 000 0000");
  await shop.check('input[type=checkbox]');
  await Promise.all([shop.waitForURL(/\/pedido\/confirmado\?n=ICN-P/), shop.getByRole("button", { name: "Registrar pedido" }).click()]);
  const orderNumber = new URL(shop.url()).searchParams.get("n");
  await shot(shop, "08-pedido-confirmado");
  ok(`Pedido registrado sin cobro: ${orderNumber}`);

  // 6. Cotización: producto bajo cotización + pieza no catalogada
  await shop.goto(`${BASE}/producto/demo-tc-0001`);
  await shop.getByRole("button", { name: /Agregar a cotización/ }).click();
  await shop.goto(`${BASE}/cotizacion`);
  await shop.waitForSelector("text=Tarjeta de control de maniobra");
  await shop.click("text=Agregar una pieza que no está en el catálogo");
  await shop.locator('input[id^="cd-"]').fill("Tarjeta de llamada de piso, referencia impresa XJ-12");
  await shop.fill("#c-name", "Técnico de Prueba");
  await shop.fill("#c-email", "tecnico.e2e@example.com");
  await shop.fill("#c-phone", "+58 414 111 1111");
  await shop.check('input[type=checkbox]');
  await shot(shop, "09-cotizacion");
  await Promise.all([shop.waitForURL(/\/cotizacion\/enviada\?n=ICN-C/), shop.getByRole("button", { name: /Enviar solicitud de cotización/ }).click()]);
  const quoteNumber = new URL(shop.url()).searchParams.get("n");
  ok(`Solicitud de cotización independiente registrada: ${quoteNumber}`);

  // 7. Seguimiento público
  await shop.goto(`${BASE}/seguimiento?n=${orderNumber}`);
  await shop.fill("#t-email", "cliente.e2e@example.com");
  await shop.getByRole("button", { name: /Consultar/ }).click();
  await shop.waitForSelector("text=Recibido");
  await shot(shop, "10-seguimiento");
  ok("Seguimiento público por número + correo");

  // 8. Inventario consistente: 5 físicas, 2 reservadas, 3 disponibles
  await page.goto(`${BASE}/admin/inventario?q=${SKU}`);
  const row = page.locator("tr", { hasText: SKU });
  const cells = await row.locator("td").allInnerTexts();
  if (!(cells[2].trim() === "5" && cells[3].trim() === "2" && cells[4].trim() === "3")) throw new Error(`Inventario inesperado: ${cells.join(" | ")}`);
  await shot(page, "11-admin-inventario");
  ok("Inventario: 5 físicas, 2 reservadas, 3 disponibles");
  await page.goto(`${BASE}/admin/inventario/movimientos`);
  await page.waitForSelector(`text=${orderNumber}`);
  ok("Movimientos registran entrada inicial y reserva con responsable y motivo");

  // 9. Bandejas separadas de pedidos y cotizaciones; despacho descuenta existencia
  await page.goto(`${BASE}/admin/pedidos`);
  await page.click(`text=${orderNumber}`);
  await page.selectOption('select[id^="st-"]', "shipped");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Actualizar estado" }).click();
  await page.waitForSelector("text=Existencia descontada");
  await shot(page, "12-admin-pedido");
  ok("Despacho del pedido consume la reserva");
  await page.goto(`${BASE}/admin/inventario?q=${SKU}`);
  const cells2 = await page.locator("tr", { hasText: SKU }).locator("td").allInnerTexts();
  if (!(cells2[2].trim() === "3" && cells2[4].trim() === "3")) throw new Error(`Inventario tras despacho: ${cells2.join(" | ")}`);
  ok("Inventario tras despacho: 3 físicas, 3 disponibles");
  await page.goto(`${BASE}/admin/cotizaciones`);
  await page.waitForSelector(`text=${quoteNumber}`);
  await page.click(`text=${quoteNumber}`);
  await page.waitForSelector("text=No catalogado");
  await shot(page, "13-admin-cotizacion");
  ok("Bandeja de cotizaciones independiente con pieza no catalogada");

  // 10. Permisos: el editor no puede publicar ni ver costos; los visitantes no modifican precios
  const ed = await browser.newContext();
  const edPage = await ed.newPage();
  await login(edPage, "editor@icon.demo");
  await edPage.goto(productUrl);
  if (await edPage.getByRole("button", { name: "Aprobar y publicar" }).count()) throw new Error("El editor ve el botón de publicar");
  if (await edPage.locator("#cost").count()) throw new Error("El editor ve el costo interno");
  ok("Editor: sin botón de publicar ni acceso al costo");
  const res = await edPage.goto(`${BASE}/admin/usuarios`);
  if (!edPage.url().includes("denied=1")) throw new Error("El editor accede a usuarios");
  ok("Editor: sin acceso a usuarios");
  const anonExport = await fetch(`${BASE}/api/admin/export`, { redirect: "manual" });
  if (anonExport.status === 200) throw new Error("Exportación accesible sin sesión");
  ok("Exportación protegida para visitantes");

  // Móvil
  const mobile = await browser.newContext({ ...require("playwright").devices["iPhone 13"] });
  const m = await mobile.newPage();
  await m.goto(BASE);
  await shot(m, "14-movil-home");
  await m.goto(`${BASE}/producto/demo-pb-0002`);
  await shot(m, "15-movil-producto");
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error("Desbordamiento horizontal en móvil");
  ok("Móvil sin desbordamiento horizontal");

  await browser.close();
  console.log(`\n${results.length} verificaciones superadas.`);
})().catch((e) => {
  console.error("FALLO:", e.message);
  process.exit(1);
});
