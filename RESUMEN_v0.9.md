# RuDaMi — Resumen de cambios (v0.9.x)

Compilación de todo lo construido en esta sesión de trabajo.

## 1. Identidad visual y base (Dashboard v3 "Quiet Precision")
- Corregido el **modo oscuro** que invertía toda la app; ahora siempre claro/editorial.
- Fuentes: **Geist** (cuerpo) + **Newsreader** italic (saludos y nombres).
- Punto de notificación a rojo; tokens de color unificados.

## 2. Arquitectura
- **Capa de IA desacoplada** (`app/lib/ai/`): proveedor Groq por defecto, cambiable a un modelo médico tocando un archivo. Prompts y lógica fuera de los endpoints.
- **Auth SSR real** con `proxy.ts` (Next 16) + `@supabase/ssr`: protege rutas en servidor, no solo ocultando UI.

## 3. Dashboard (lógica clínica)
- KPIs reales: "Pacientes activos" = con episodio activo; "Altas del mes".
- **Banderas de alerta multifactor**: EVA sin mejora, citas canceladas seguidas, cronicidad y red flags de IA (no solo "EVA alto").
- Dashboard **por rol**: el fisio ve una versión resumida (sin gráfica ni carga del equipo).

## 4. EVA por episodio
- La evolución del dolor se calcula **dentro de cada episodio** (no se mezclan quejas distintas), con umbral clínico (MCID).

## 5. Agenda (rediseño completo, inspirado en Jane App / Cliniko)
- **Tipos de cita** con color propio (catálogo gestionable).
- Calendario FullCalendar reestilado a v3, contenido en panel (sin amarillos).
- **Interacciones**: arrastrar para reprogramar, redimensionar, click en hueco = nueva cita, panel lateral al clicar.
- Alta de cita con selector de tipo (autorrellena duración).

## 6. Ficha de paciente (2 columnas)
- Cabecera limpia + historial de sesiones (filas desplegables con el informe) + sidebar (datos, próxima cita, bono).
- **Episodios en paralelo**: un paciente puede tener varias consultas activas (p. ej. lumbalgia + pie).

## 7. Nueva sesión unificada
- Una sola pantalla con **3 modos en tarjetas** (Primera valoración · Seguimiento · Sesión rápida) que cambian el formulario al instante.
- Slider de **EVA en degradado**, "Guardar borrador" / "Guardar y generar informe".

## 8. IA clínica — el diferenciador
- **Copiloto en vivo**: panel que razona el caso mientras escribes (hipótesis, clasificación, tejidos, banderas), con **preguntas sugeridas accionables** (saltan al campo) y **alarma roja** ante red flags.
- **Escriba por voz**: graba la conversación con el paciente, la transcribe y **rellena la ficha con IA**; el copiloto remata con las conclusiones.
- **Asistente conversacional** (buscador de la topbar): chat con **texto y voz** que agenda, cancela, crea pacientes, da de alta y consulta el día por lenguaje natural (function-calling de Groq). Acciones destructivas con confirmación.
- Seguridad clínica del informe: bloque de red flags/derivación prominente, disclaimer y sello de colegiado.

## 9. Bonos
- **Catálogo por servicio** que diseña el **admin** (nombre, servicio, sesiones, precio, validez); los **fisios solo añaden** bonos del catálogo.
- Tarjeta-bono visual (anillo + cuadritos que se rellenan en azul según uso).
- KPIs accionables (Por caducar, Por agotarse) clicables como filtro.
- **Cifras de dinero solo para admin** (ingresos totales + por fisio, filtrables).

## 10. WhatsApp (MVP gratis)
- Botón **"Avisar por WhatsApp"** (wa.me) en la agenda: abre WhatsApp con el recordatorio prerredactado. Sin coste ni API. La automatización real (recordatorio 24h) requiere la API de pago (pendiente).

## 11. Responsive móvil/tablet
- Menú lateral hamburguesa, layouts apilados, paddings y tamaños adaptados.

## 12. Datos y despliegue
- 16 pacientes de ejemplo con escenarios clínicos variados (`@ejemplo.rudami`).
- Página de **Informes** y **404 con estética de la app**.
- Versión **0.9.1** (la v1.0 será cuando esté listo). Despliegue en Vercel.

## Pendiente / futuro
- Endurecer RLS de `perfiles` y `clinicas` (fuga multiclínica) antes de un 2º cliente real.
- Pasarela de pago (Stripe + Connect) con sus implicaciones fiscales (IVA por servicio, VeriFactu).
- WhatsApp automático (API de pago) y, a futuro, recordatorios.
- Descuento de bono por servicio (que una sesión descuente del bono de su tipo).
