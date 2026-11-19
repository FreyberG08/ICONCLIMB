# ICON · CLIMB PARTS

Tienda online de repuestos para ascensores de **Ascensores CLIMB**: catálogo público con búsqueda por SKU, referencia, marca y modelo; compra directa y solicitudes de cotización; panel administrativo para catálogo, fotografías, inventario, pedidos y cotizaciones.

**Stack:** Next.js 15 (App Router) + TypeScript · Tailwind CSS 4 (sistema de diseño propio *Clean Industrial*) · Supabase (PostgreSQL, Auth, Storage, RLS) · Vercel.

---

## 1. Qué incluye esta primera etapa (MVP)

| Área | Estado |
|---|---|
| Home, catálogo con filtros y paginación, ficha de producto, buscador con sugerencias | ✅ |
| Carrito (compra directa) con precios y existencias validados en el servidor | ✅ |
| Lista y solicitud de cotización (incluye piezas **no catalogadas**) | ✅ |
| Número de referencia y seguimiento público (número + correo) | ✅ |
| Panel: dashboard con métricas reales, productos (crear, editar, duplicar, publicar, despublicar, archivar) | ✅ |
| Fotografías: subida múltiple desde PC o cámara del teléfono, optimización automática, principal, orden, texto alternativo, eliminación, vista previa | ✅ |
| Documentación técnica con autorización de descarga pública | ✅ |
| Inventario: entradas, salidas, ajustes por conteo, reservas, despachos; responsable, fecha y motivo | ✅ |
| Registro de ingreso al almacén → borrador automático | ✅ |
| Bandejas separadas de pedidos y cotizaciones, con estados, notas internas e historial | ✅ |
| Categorías y marcas administrables, importación CSV, exportación CSV | ✅ |
| Usuarios con 4 roles y permisos (también aplicados en la base de datos) y auditoría | ✅ |
| Modo demostración sin credenciales | ✅ |

### Preparado pero pendiente de decisiones o credenciales

- **Pasarela de pagos:** no existe todavía. El checkout registra el pedido y **reserva** las unidades, sin simular cobros. El personal registra manualmente el pago confirmado (queda auditado) y solo esos pedidos cuentan como “Ventas confirmadas”.
- **Impuestos, envíos y facturación:** no se calculan; la interfaz lo indica (“por confirmar”). Etapa 2.
- **Notificaciones por correo / WhatsApp:** los enlaces de WhatsApp funcionan si se define `NEXT_PUBLIC_WHATSAPP_NUMBER`; el envío automático de mensajes es Etapa 2.
- **Logo y colores definitivos:** se usa un rótulo tipográfico provisional y una paleta azul provisional (ver §7).
- **Texto legal:** la página de privacidad describe el funcionamiento técnico y debe aprobarla el área legal. No hay términos y condiciones aún.
- **Dominio:** configure `NEXT_PUBLIC_SITE_URL` cuando esté registrado.

---

## 2. Ejecutar localmente

Requisitos: Node.js 20.9 o superior.

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Abra http://localhost:3000. **Sin variables de Supabase la app arranca en MODO DEMOSTRACIÓN** (banda ámbar visible): datos de ejemplo guardados en `.demo-data/` y cuentas de prueba:

| Correo | Rol |
|---|---|
| admin@icon.demo | Administrador |
| editor@icon.demo | Editor de catálogo |
| almacen@icon.demo | Almacén |
| revisor@icon.demo | Revisor comercial / técnico |

Contraseña: valor de `DEMO_PASSWORD` (por defecto `icon-demo-2026`). Panel: http://localhost:3000/admin

Para reiniciar la demo: *Usuarios y permisos › Restablecer demo*, o borre la carpeta `.demo-data/`.

> El modo demostración no es para producción: en Vercel sus datos viven en `/tmp` y se pierden. Si lo publica, cambie `DEMO_PASSWORD` y `DEMO_SESSION_SECRET`.

---

## 3. Configurar Supabase (producción)

1. Cree un proyecto en https://supabase.com (región cercana a sus clientes).
2. **SQL Editor** → ejecute en orden:
   - `supabase/migrations/20261118000000_icon_init.sql` (tablas, RLS, funciones, Storage)
   - `supabase/seed.sql` (las 9 categorías iniciales)

   Con la CLI de Supabase también puede usar `supabase link` y `supabase db push`.
3. **Authentication › Providers › Email:** deje activo el acceso por correo y **desactive “Allow new users to sign up”** (solo el personal tiene cuentas).
4. **Authentication › URL Configuration:** *Site URL* = su dominio; agregue `https://SU-DOMINIO/auth/callback` en *Redirect URLs*.
5. **Primer administrador:** *Authentication › Users › Add user* (correo y contraseña). Luego, en SQL Editor:

   ```sql
   update public.profiles set role = 'admin', active = true, full_name = 'Nombre Apellido'
   where email = 'correo@empresa.com';
   ```

   Las cuentas nuevas nacen **inactivas**; desde el panel (*Usuarios y permisos*) el administrador asigna rol y las activa.
6. Copie `Project URL` y `anon public key` (*Project Settings › API*) a `.env.local`.

Los buckets `product-images` (público) y `product-documents` (privado) los crea la migración.

### Seguridad aplicada

- Los visitantes (`anon`) **no tienen acceso a ninguna tabla**. Solo leen vistas de productos publicados que excluyen costo, ubicación y cantidades exactas (solo exponen “disponible / últimas unidades / agotado”).
- Precios y existencias se validan en la base de datos (`create_order`): el precio enviado por el navegador se ignora.
- Las existencias solo cambian mediante funciones que bloquean filas (`SELECT … FOR UPDATE`) y restricciones `CHECK` impiden negativos o reservas mayores a la existencia. Probado con 20 compras simultáneas de la última unidad: se confirma un solo pedido.
- Publicar o despublicar, y marcar compatibilidades como verificadas, requiere rol revisor o administrador (trigger en la base de datos, no solo en la interfaz).
- El costo interno está en una tabla aparte con permiso propio; la auditoría registra que cambió sin guardar su valor.
- La clave `service_role` es opcional y solo se usa en el servidor para invitar usuarios.
- Archivos subidos: validación de firma real (no solo extensión), límites de tamaño, exportación CSV protegida contra inyección de fórmulas.

### Roles

| Permiso | Admin | Editor | Almacén | Revisor |
|---|:-:|:-:|:-:|:-:|
| Ver catálogo e inventario | ● | ● | ● | ● |
| Crear / editar productos, fotos, documentos | ● | ● |  | ● |
| Publicar, despublicar, verificar compatibilidades | ● |  |  | ● |
| Ver / editar costo | ● |  |  | ● |
| Movimientos de inventario | ● |  | ● |  |
| Ver pedidos | ● |  | ● | ● |
| Gestionar pedidos, pagos y cotizaciones | ● |  |  | ● |
| Categorías y marcas, importar CSV | ● | ● |  |  |
| Exportar CSV | ● | ● | ● | ● |
| Usuarios | ● |  |  |  |
| Auditoría | ● |  |  | ● |

La matriz está en la tabla `role_permissions` y en `src/lib/permissions.ts` (mantener sincronizadas).

---

## 4. Desplegar en Vercel

1. Suba el repositorio a GitHub y en https://vercel.com elija **Add New › Project** → importe el repositorio (framework detectado: Next.js).
2. **Environment Variables** (Production y Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (p. ej. `https://icon.ejemplo.com`)
   - Opcionales: `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_CONTACT_*`, `NEXT_PUBLIC_LOGO_URL`, `NEXT_PUBLIC_HERO_IMAGE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. **Deploy.**
4. **Domains:** agregue el dominio de ICON y configure los DNS que indique Vercel. Actualice `NEXT_PUBLIC_SITE_URL` y la configuración de URLs de Supabase Auth.

Los productos nuevos, fotos, precios y existencias se gestionan desde el panel: **no requieren volver a desplegar**. Las páginas públicas se refrescan al instante al guardar (revalidación bajo demanda) y cada 60 s como respaldo.

**Límite de archivos:** las fotografías se optimizan en el navegador (máx. 2400 px, WebP) antes de subirse, por lo que las fotos de teléfono quedan muy por debajo del límite. Los documentos admiten hasta 4 MB por el límite de cuerpo de las funciones de Vercel; para manuales más grandes, comprímalos o súbalos directamente al bucket `product-documents` y registre el documento (mejora prevista: subida directa con URL firmada).

---

## 5. Flujo operativo de ingreso de repuestos

1. **Almacén** → *Inventario › Registrar ingreso*: SKU, nombre provisional, cantidad, ubicación y motivo. Se crea un **borrador** y un movimiento de entrada.
2. **Editor** → completa la ficha, carga fotografías (desde el teléfono con “Tomar foto”) y documentos → *Enviar a revisión*.
3. **Revisor** → verifica compatibilidades, precio y modalidad → *Aprobar y publicar*. La lista de verificación del panel exige categoría y, para compra directa, precio.
4. El producto aparece de inmediato en catálogo, búsqueda y filtros.

Alternativa masiva: *Importar / exportar* con la plantilla CSV (los productos importados quedan en borrador).

---

## 6. Verificación

```bash
npm run typecheck
```

```bash
npm run build
```

Prueba de extremo a extremo (con la app corriendo en modo demostración):

```bash
BASE_URL=http://localhost:3000 node tests/e2e-flow.cjs
```

Navegación entre páginas con animaciones (escritorio y móvil):

```bash
BASE_URL=http://localhost:3000 node tests/e2e-navigation.cjs
```

La prueba funcional cubre: login, creación con fotografía, borrador invisible al público, publicación, búsqueda por SKU y referencia, filtros, carrito y pedido, cotización con pieza no catalogada, seguimiento, inventario (reservas y despacho), bandejas, restricciones del editor, protección de la exportación y ausencia de desbordamiento en móvil.

Pruebas de la base de datos (requieren PostgreSQL ≥ 15; en local se emulan los objetos de Supabase con `supabase/tests/supabase_stub.sql`):

```bash
psql -d icon_test -f supabase/tests/supabase_stub.sql -f supabase/migrations/20261118000000_icon_init.sql -f supabase/seed.sql -f supabase/tests/security_and_inventory.sql
```

```bash
PSQL="psql -d icon_test" ./supabase/tests/concurrency.sh
```

---

## 7. Identidad visual (Clean Industrial)

Tokens en `src/app/globals.css` (`@theme`): azules `climb-*`, grises fríos `steel-*`, señales `ok/warn/err`. **Los azules son provisionales**: al recibir el manual de marca basta con reemplazar los valores `--color-climb-*`. Tipografía Geist / Geist Mono (incluida en el proyecto, sin dependencias externas).

El logo original se coloca en `public/brand/` y se activa con `NEXT_PUBLIC_LOGO_URL`. Mientras tanto se muestra un rótulo tipográfico “ICON”, que no pretende ser el logo. El hero usa una ilustración técnica animada hasta disponer de fotografía industrial (`NEXT_PUBLIC_HERO_IMAGE_URL`). Los productos sin foto muestran un marcador técnico “Fotografía pendiente”.

---

## 8. Experiencia animada

La tienda está concebida como un **recorrido en ascensor** (GSAP + ScrollTrigger + SplitText y desplazamiento suave con Lenis):

- **Intro de puertas** en la primera visita de cada sesión (display de piso que cuenta y puertas que se abren) y apertura de puertas al cambiar de página.
- **Portada**: titular que se arma letra por letra, ilustración con profundidad 3D que sigue al mouse, etiquetas flotantes, foco de luz sobre la retícula y salida con el scroll.
- **El recorrido**: sección fija donde la cabina baja por el hueco y cada piso presenta una categoría.
- **Indicador de piso** lateral (pantallas anchas), cintas infinitas que reaccionan a la velocidad del scroll, tarjetas con inclinación 3D y brillo, botones magnéticos, cursor con etiquetas, zoom tipo lupa en la ficha y producto que "vuela" al carrito.

Los efectos se declaran con atributos `data-*` (ver `src/components/motion/effects.ts`). Con "reducir movimiento" activado en el sistema, todo se muestra estático; si el motor no arranca, el contenido aparece igualmente a los 4 s.

## 9. Estructura

```
src/
  app/(store)/          tienda pública (home, catálogo, producto, carrito, cotización, seguimiento)
  app/admin/            login y panel (panel)/…
  app/api/              búsqueda, descargas, subidas, exportación
  components/store|admin|ui
  lib/data/             repositorio: interfaz + Supabase + modo demostración
  lib/validation.ts     validación con zod (servidor)
supabase/
  migrations/           esquema, RLS, funciones, Storage
  seed.sql              categorías iniciales
  tests/                pruebas SQL y de concurrencia
tests/e2e-flow.cjs      prueba de extremo a extremo
```

## 10. Próximas etapas

- **Etapa 2:** pasarela de pago, impuestos, facturación, envíos, correos transaccionales, WhatsApp, subida directa de archivos grandes, CAPTCHA (Turnstile) en formularios.
- **Etapa 3:** cuentas empresariales y precios especiales, historial y repetición de pedidos, cotización con fotografías e identificación asistida con revisión humana, integración con ClickUp/CRM, analítica comercial y campañas.

La capa `src/lib/data/repository.ts` aísla la lógica de datos para incorporar estas funciones sin rehacer las pantallas.
