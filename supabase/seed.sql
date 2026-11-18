-- Categorías iniciales propuestas (ajustables desde el panel: Catálogo › Categorías).
-- No se crean productos ni marcas: el catálogo real se carga desde el panel o por CSV.
insert into public.categories (name, slug, description, position) values
  ('Tarjetas y electrónica', 'tarjetas-y-electronica', 'Tarjetas de control, maniobra, comunicación y módulos electrónicos.', 10),
  ('Variadores y componentes eléctricos', 'variadores-y-componentes-electricos', 'Variadores de frecuencia, contactores, relés, fuentes y protecciones.', 20),
  ('Botoneras y displays', 'botoneras-y-displays', 'Pulsadores, botoneras de cabina y piso, indicadores y displays.', 30),
  ('Puertas y operadores', 'puertas-y-operadores', 'Operadores de puerta, patines, poleas, cerraduras y accesorios.', 40),
  ('Sensores y dispositivos de seguridad', 'sensores-y-seguridad', 'Cortinas de luz, finales de carrera, sensores y dispositivos de seguridad.', 50),
  ('Motores y frenos', 'motores-y-frenos', 'Máquinas de tracción, motores, frenos y encoders.', 60),
  ('Componentes mecánicos', 'componentes-mecanicos', 'Guiadores, rodamientos, poleas, amortiguadores y piezas de tracción.', 70),
  ('Accesorios y consumibles', 'accesorios-y-consumibles', 'Lubricantes, herramientas, cableado y consumibles de mantenimiento.', 80),
  ('Repuestos especiales y bajo pedido', 'repuestos-especiales', 'Piezas que requieren validación técnica o importación bajo pedido.', 90)
on conflict (slug) do nothing;
