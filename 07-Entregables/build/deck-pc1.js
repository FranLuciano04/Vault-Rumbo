// Genera el deck de la exposición oral del PC1 (H4): 07-Entregables/PC1/Rumbo — PC1 (presentación).pptx
// Sigue el orden del documento único. Usa los PNG ya exportados de los diagramas y del prototipo.
// Uso, desde la raíz del repo:  node "07-Entregables/build/deck-pc1.js"
// Requiere pptxgenjs (npm install pptxgenjs, o NODE_PATH apuntando a un node_modules que lo tenga).
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.env.OUT_OVERRIDE || path.join(ROOT, '07-Entregables', 'PC1', 'Rumbo — PC1 (presentación).pptx');
const P = (...r) => path.join(ROOT, ...r);
const IMG = {
  proto: (f) => P('07-Entregables', 'Prototipo', 'img', f),
  arq: (f) => P('05-Diseño', 'Arquitectura', 'img', f),
  dis: (f) => P('05-Diseño', 'img', f),
  dom: (...f) => P('03-Dominio', 'Diagramas', ...f),
};

// Paleta del prototipo (azules del equipo) + un acento cálido.
const C = {
  dark: '16384F', primary: '22506F', mid: '3E7196', light: '73A5C4', tint: 'EAF2F7',
  gray: 'D9D9D9', text: '1F2A33', muted: '5B6B78', white: 'FFFFFF', accent: 'E8A33D',
};
const HEAD = 'Cambria', BODY = 'Calibri';
const W = 13.333, H = 7.5, M = 0.6;

// Tamaño real de un PNG (cabecera IHDR), para encajar las imágenes sin deformarlas.
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
// Encaja una imagen en la caja (x, y, w, h), centrada.
function fit(slide, file, x, y, w, h, extra = {}) {
  const s = pngSize(file);
  const r = Math.min(w / s.w, h / s.h);
  const iw = s.w * r, ih = s.h * r;
  slide.addImage({ path: file, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih, ...extra });
}

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Francisco Luciano, Nahuel Viniegra y Paloma Patiño';
pres.title = 'Rumbo — Punto de Control 1';

// Encabezado de una slide de contenido: número de sección en un círculo (el motivo del deck) y título.
function header(slide, num, section, title) {
  slide.background = { color: C.white };
  slide.addShape(pres.shapes.OVAL, { x: M, y: 0.45, w: 0.62, h: 0.62, fill: { color: C.primary }, line: { color: C.primary } });
  slide.addText(String(num), { x: M, y: 0.45, w: 0.62, h: 0.62, fontFace: HEAD, fontSize: 20, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  slide.addText(section.toUpperCase(), { x: M + 0.8, y: 0.42, w: 9, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: C.mid, charSpacing: 2, margin: 0, isTextBox: true });
  slide.addText(title, { x: M + 0.8, y: 0.7, w: W - 2 * M - 0.8, h: 0.6, fontFace: HEAD, fontSize: 30, bold: true, color: C.dark, margin: 0, isTextBox: true });
}
function footer(slide, n) {
  slide.addText(`Rumbo · PC1   ${n}`, { x: W - M - 3, y: H - 0.42, w: 3, h: 0.25, fontFace: BODY, fontSize: 9, color: C.muted, align: 'right', margin: 0, isTextBox: true });
}
function bullets(slide, items, x, y, w, h, size = 15) {
  slide.addText(items.map((t, i) => {
    const parts = Array.isArray(t) ? t : [t];
    return { text: parts[0], options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 8, ...(parts[1] || {}) } };
  }), { x, y, w, h, fontFace: BODY, fontSize: size, color: C.text, valign: 'top', margin: 0, isTextBox: true });
}
// Tarjeta con fondo suave: título en negrita y texto.
function card(slide, x, y, w, h, title, body, opts = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: opts.fill || C.tint }, line: { color: opts.fill || C.tint } });
  slide.addText([
    { text: title, options: { bold: true, color: opts.titleColor || C.dark, fontSize: opts.titleSize || 16, breakLine: true } },
    { text: body, options: { color: opts.color || C.text, fontSize: opts.size || 13 } },
  ], { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: h - 0.3, fontFace: BODY, valign: 'top', margin: 0, paraSpaceAfter: 4, isTextBox: true });
}
function stat(slide, x, y, w, value, label, dark = false) {
  slide.addText(value, { x, y, w, h: 0.8, fontFace: HEAD, fontSize: 44, bold: true, color: dark ? C.white : C.primary, margin: 0, isTextBox: true });
  slide.addText(label, { x, y: y + 0.8, w, h: 0.45, fontFace: BODY, fontSize: 13, color: dark ? 'CFE0EC' : C.muted, margin: 0, isTextBox: true });
}

let n = 0;
const next = () => ++n;

// 1 · Portada
{
  const s = pres.addSlide(); next();
  s.background = { color: C.dark };
  s.addText('Punto de Control 1 · Análisis, diseño y planificación', { x: M, y: 1.2, w: 9, h: 0.4, fontFace: BODY, fontSize: 16, color: C.light, margin: 0, isTextBox: true });
  s.addText('Rumbo', { x: M, y: 1.7, w: 8, h: 1.4, fontFace: HEAD, fontSize: 80, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText('CRM para agencias de turismo PyME', { x: M, y: 3.1, w: 8, h: 0.6, fontFace: HEAD, fontSize: 26, italic: true, color: 'CFE0EC', margin: 0, isTextBox: true });
  s.addText([
    { text: 'Francisco Luciano · Nahuel Viniegra · Paloma Patiño', options: { breakLine: true, bold: true, color: C.white } },
    { text: 'Universidad de Morón · Ingeniería Informática · Trabajo de Campo', options: { breakLine: true } },
    { text: '2.º cuatrimestre 2026 · 02/10/26' },
  ], { x: M, y: 5.2, w: 8, h: 1.3, fontFace: BODY, fontSize: 15, color: 'CFE0EC', margin: 0, paraSpaceAfter: 4, isTextBox: true });
  fit(s, IMG.proto('03-cu14-agenda.png'), 8.3, 1.3, 4.5, 3.4, { shadow: { type: 'outer', color: '000000', opacity: 0.35, blur: 8, offset: 4, angle: 90 } });
  s.addNotes('Presenta: Francisco. Saludo y presentación del equipo. Rumbo es un CRM a medida para una agencia de turismo PyME real. En esta exposición recorremos el análisis, el diseño y la planificación, en el mismo orden que el documento entregado.');
}

// 2 · Qué vamos a mostrar
{
  const s = pres.addSlide(); next();
  s.background = { color: C.white };
  s.addText('Qué vamos a mostrar', { x: M, y: 0.5, w: 10, h: 0.7, fontFace: HEAD, fontSize: 34, bold: true, color: C.dark, margin: 0, isTextBox: true });
  const items = [
    ['Presentación general', 'Antecedentes, objetivos, alcance y actores', 'Francisco'],
    ['Modelos de IA', 'El modelo del producto y su justificación', 'Francisco'],
    ['Agentes de IA', 'Cómo trabajamos con Claude Code', 'Francisco'],
    ['Modelo de datos', 'Clases, entidad-relación y SQL', 'Nahuel'],
    ['Modelo de desarrollo', 'Metodología e interfaces gráficas', 'Paloma'],
    ['Arquitectura', 'C4, MVC y contrato OpenAPI', 'Nahuel'],
  ];
  items.forEach((it, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * 4.1, y = 1.6 + row * 2.6;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.8, h: 2.3, rectRadius: 0.1, fill: { color: C.tint }, line: { color: C.tint } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.25, w: 0.62, h: 0.62, fill: { color: C.primary }, line: { color: C.primary } });
    s.addText(String(i + 1), { x: x + 0.25, y: y + 0.25, w: 0.62, h: 0.62, fontFace: HEAD, fontSize: 20, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(it[0], { x: x + 0.25, y: y + 1.0, w: 3.3, h: 0.45, fontFace: HEAD, fontSize: 19, bold: true, color: C.dark, margin: 0, isTextBox: true });
    s.addText(it[1], { x: x + 0.25, y: y + 1.45, w: 3.3, h: 0.45, fontFace: BODY, fontSize: 13, color: C.text, margin: 0, isTextBox: true });
    s.addText(it[2], { x: x + 0.25, y: y + 1.85, w: 3.3, h: 0.3, fontFace: BODY, fontSize: 11, italic: true, color: C.mid, margin: 0, isTextBox: true });
  });
  footer(s, n);
  s.addNotes('Presenta: Francisco. Recorremos las seis partes de la documentación obligatoria, en el orden de la lámina de la cátedra. Cada integrante expone su frente.');
}

// 3 · Antecedentes: cómo trabaja hoy la agencia
{
  const s = pres.addSlide(); next();
  header(s, 1, 'Presentación general', 'Cómo trabaja hoy la agencia');
  const rows = [
    ['Carpetas en papel', 'Cada viaje tiene su carpeta; no hay un lugar único con clientes y viajes.'],
    ['Consultas por Instagram y WhatsApp', 'El seguimiento depende de la memoria de quien atendió.'],
    ['Cobros anotados a mano', 'Señas, cuotas y pagos a operadores en planillas, sin avisos.'],
    ['Avisos por WhatsApp', 'Pagos, formularios migratorios y vouchers: hay que acordarse.'],
    ['Pesos, dólares y freelance', 'La ganancia varía por viaje y hay vendedores externos.'],
  ];
  rows.forEach((r, i) => card(s, M, 1.6 + i * 1.0, 7.3, 0.85, r[0], r[1], { titleSize: 15, size: 12.5 }));
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.3, y: 1.6, w: 4.43, h: 4.85, rectRadius: 0.1, fill: { color: C.dark }, line: { color: C.dark } });
  s.addText('Consecuencias', { x: 8.6, y: 1.85, w: 3.9, h: 0.5, fontFace: HEAD, fontSize: 22, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText([
    { text: 'Se pierden ventas', options: { bullet: true, breakLine: true } },
    { text: 'Se olvidan cobros y vencimientos', options: { bullet: true, breakLine: true } },
    { text: 'No queda memoria del cliente', options: { bullet: true } },
  ], { x: 8.6, y: 2.55, w: 3.9, h: 1.7, fontFace: BODY, fontSize: 17, color: C.white, paraSpaceAfter: 10, margin: 0, isTextBox: true });
  s.addText('Y el activo del negocio son los clientes fieles: llegan pocos nuevos, así que hay que volver a venderles.', { x: 8.6, y: 4.5, w: 3.9, h: 1.6, fontFace: BODY, fontSize: 14, italic: true, color: C.accent, margin: 0, isTextBox: true });
  footer(s, n);
  s.addNotes('Presenta: Francisco. Antecedentes tomados del relevamiento con la agencia (dos rondas: inicial y 17/09). Remarcar que todo se hace a mano y que eso cuesta ventas y cobros.');
}

// 4 · Qué ofrece el mercado
{
  const s = pres.addSlide(); next();
  header(s, 1, 'Presentación general', 'Por qué no alcanza con lo que ya existe');
  const head = ['Necesidad', 'Excel y WhatsApp', 'CRM genérico', 'CRM de turismo (EE. UU.)', 'Rumbo'];
  const data = [
    ['Seguir la consulta hasta la venta', 'A mano', 'Sí', 'Sí', 'Sí'],
    ['Viaje con itinerario, operador y economía', 'A mano', 'No', 'Sí', 'Sí'],
    ['Cuotas y vencimientos con alertas', 'No', 'No', 'Parcial', 'Sí'],
    ['Ganancia y comisión del freelance en ARS o USD', 'A mano', 'No', 'Parcial, USD', 'Sí'],
    ['Recordatorios por requisitos del destino', 'No', 'No', 'No se encontró', 'Sí'],
    ['Aviso para recontactar clientes fieles', 'No', 'A medida', 'No se encontró', 'Sí'],
    ['Español, pesos y costo de PyME', 'Sí', 'Parcial', 'No', 'Sí'],
  ];
  const hdr = head.map((t, i) => ({ text: t, options: { bold: true, color: C.white, fill: { color: i === 4 ? C.accent : C.primary }, align: i ? 'center' : 'left' } }));
  const body = data.map(r => r.map((t, i) => ({ text: t, options: { align: i ? 'center' : 'left', bold: i === 4, color: i === 4 ? C.dark : C.text, fill: { color: i === 4 ? 'FBEBD2' : C.white } } })));
  s.addTable([hdr, ...body], { x: M, y: 1.65, w: W - 2 * M, colW: [4.2, 1.8, 1.75, 2.6, 1.78], fontFace: BODY, fontSize: 13, rowH: 0.52, border: { type: 'solid', pt: 0.75, color: C.gray }, valign: 'middle' });
  s.addText('Referencias: HubSpot y Pipedrive (genéricos); Tern, TravelJoy y Travefy (turismo). «No se encontró» = no figura en la documentación pública consultada el 30/09/26.', { x: M, y: 6.0, w: W - 2 * M, h: 0.5, fontFace: BODY, fontSize: 11, italic: true, color: C.muted, margin: 0, isTextBox: true });
  footer(s, n);
  s.addNotes('Presenta: Francisco. Los CRM genéricos resuelven el embudo pero no el viaje ni las cuotas; los de turismo del exterior están pensados para otro mercado (idioma, moneda, sin cuotas ni WhatsApp). Los back office argentinos (p. ej. SAVIA) apuntan a administración y facturación, que está fuera del alcance de esta etapa.');
}

// 5 · Objetivos y alcance
{
  const s = pres.addSlide(); next();
  header(s, 1, 'Presentación general', 'Objetivos y alcance');
  const obj = [
    ['Digitalizar y centralizar', 'Clientes y viajes en un solo sistema.'],
    ['Fidelizar', 'Historial, preferencias y recontacto.'],
    ['Ordenar la venta', 'De la consulta al cierre, sin perder pasos.'],
    ['Controlar la economía', 'Ganancia, margen, comisión y cuotas.'],
    ['No perder vencimientos', 'Alertas de pagos, formularios y salidas.'],
    ['Decidir con datos', 'Dashboard y reportes mensuales.'],
  ];
  obj.forEach((o, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    card(s, M + col * 3.95, 1.6 + row * 1.35, 3.75, 1.15, o[0], o[1], { titleSize: 16, size: 13 });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.75, y: 1.6, w: 3.98, h: 3.85, rectRadius: 0.1, fill: { color: C.dark }, line: { color: C.dark } });
  s.addText('Fuera de alcance', { x: 9.05, y: 1.8, w: 3.4, h: 0.5, fontFace: HEAD, fontSize: 20, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText([
    { text: 'Cobros y pagos online', options: { bullet: true, breakLine: true } },
    { text: 'Publicación automática en redes', options: { bullet: true, breakLine: true } },
    { text: 'Integración con mayoristas y GDS', options: { bullet: true, breakLine: true } },
    { text: 'Facturación (fase 2)', options: { bullet: true, breakLine: true } },
    { text: 'WhatsApp automático (a futuro)', options: { bullet: true } },
  ], { x: 9.05, y: 2.45, w: 3.45, h: 2.8, fontFace: BODY, fontSize: 15, color: C.white, paraSpaceAfter: 10, margin: 0, valign: 'top', isTextBox: true });
  footer(s, n);
  s.addNotes('Presenta: Francisco. Seis objetivos del relevamiento. El alcance se acotó para llegar con un sistema completo: el sistema registra y avisa, pero no cobra, no publica y no factura.');
}

// 6 · Actores y circuito
{
  const s = pres.addSlide(); next();
  header(s, 1, 'Presentación general', 'Quiénes lo usan y el circuito que digitaliza');
  const steps = ['Cliente', 'Consulta', 'Cotización', 'Reserva y seguimiento', 'Cobros y postventa'];
  steps.forEach((t, i) => {
    const x = M + i * 2.46;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.75, w: 2.15, h: 1.1, rectRadius: 0.1, fill: { color: i === 4 ? C.accent : C.primary }, line: { color: i === 4 ? C.accent : C.primary } });
    s.addText(`${i + 1}. ${t}`, { x, y: 1.75, w: 2.15, h: 1.1, fontFace: BODY, fontSize: 15, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0.05, isTextBox: true });
    if (i < 4) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.18, y: 2.18, w: 0.25, h: 0.25, fill: { color: C.light }, line: { color: C.light } });
  });
  s.addText('La oportunidad pasa por nueva → en gestión → cotizada → ganada, y el viaje por reservado → vendido → confirmado → en curso → finalizado.', { x: M, y: 3.05, w: W - 2 * M, h: 0.5, fontFace: BODY, fontSize: 14, italic: true, color: C.muted, margin: 0, isTextBox: true });
  const actores = [
    ['Empleado', 'Usuario principal: clientes, consultas, cotizaciones, viajes, cobros y alertas.'],
    ['Administrador', 'Configuración, catálogos, usuarios y moderación de reseñas.'],
    ['Dueña', 'Dashboard y reportes de toda la agencia.'],
    ['Freelance', 'Vendedor externo: solo ve y opera lo suyo.'],
  ];
  actores.forEach((a, i) => card(s, M + i * 3.08, 3.85, 2.9, 1.55, a[0], a[1], { titleSize: 17, size: 13 }));
  s.addText('El pasajero es actor externo: no usa el sistema. El encargado de redes es una capacidad que se asigna, no un rol.', { x: M, y: 5.7, w: W - 2 * M, h: 0.4, fontFace: BODY, fontSize: 13, italic: true, color: C.muted, margin: 0, isTextBox: true });
  footer(s, n);
  s.addNotes('Presenta: Francisco. 31 casos de uso especificados; CU-01 es el circuito completo. El pasajero es actor externo: no usa el sistema. El encargado de redes es una capacidad que se asigna, no un rol.');
}

// 7 · Modelo de IA del producto
{
  const s = pres.addSlide(); next();
  header(s, 2, 'Modelos de IA', 'Una sola función con IA, con el mejor texto');
  s.addText('CU-20 · Generar propuesta de contenido', { x: M, y: 1.6, w: 6, h: 0.45, fontFace: HEAD, fontSize: 20, bold: true, color: C.dark, margin: 0, isTextBox: true });
  bullets(s, [
    'Entra el tema, el canal y el tono; sale un borrador de posteo en español.',
    'Una persona lo revisa y lo publica a mano: el modelo no publica.',
    'No recibe datos de clientes ni del negocio.',
    'El backend lo pide con LangChain, en una sola llamada.',
  ], M, 2.2, 5.6, 2.6, 15);
  fit(s, IMG.proto('27-cu20-propuesta-ia.png'), M, 4.55, 5.6, 2.3);
  card(s, 6.75, 1.6, 2.85, 3.2, 'Claude Sonnet 5.5', 'Elegido. Mejor calidad de texto en español.\n\nUSD 2 / USD 10 por millón de tokens.', { fill: C.dark, titleColor: C.white, color: C.white, titleSize: 19, size: 14 });
  card(s, 9.88, 1.6, 2.85, 3.2, 'Claude Haiku 4.5', 'Descartado. Más rápido y barato, pero texto de menor calidad.\n\nUSD 1 / USD 5 por millón de tokens.', { titleSize: 19, size: 14 });
  s.addText('Con unas decenas de borradores por mes, la diferencia de costo es de centavos: lo que la agencia percibe es la calidad del texto.', { x: 6.75, y: 5.1, w: 5.98, h: 1.2, fontFace: BODY, fontSize: 15, italic: true, color: C.primary, margin: 0, isTextBox: true });
  footer(s, n);
  s.addNotes('Presenta: Francisco. Decisión DEC-0012, tomada por el equipo el 29/09. Precios de la API de Anthropic al 25/09/26.');
}

// 8 · Agentes de IA
{
  const s = pres.addSlide(); next();
  header(s, 3, 'Agentes de IA', 'Cómo trabajamos con agentes de IA');
  const ag = [
    ['Claude Code', 'Agente principal de cada sesión: lee y edita el repositorio, corre comandos, genera los entregables y deja todo registrado. Opus para diseñar, Sonnet para tareas acotadas.'],
    ['Subagentes', 'Búsquedas amplias en paralelo sin llenar el contexto de la sesión principal.'],
    ['MCP de Figma', 'Conecta al agente con Figma: con él se armó el prototipo navegable.'],
  ];
  ag.forEach((a, i) => card(s, M + i * 4.11, 1.6, 3.9, 1.7, a[0], a[1], { titleSize: 18, size: 13 }));
  s.addText('Ciclo de cada sesión', { x: M, y: 3.85, w: 6, h: 0.4, fontFace: HEAD, fontSize: 18, bold: true, color: C.dark, margin: 0, isTextBox: true });
  const ciclo = ['Trae el trabajo del equipo (git pull)', 'Lee el estado y la bitácora', 'Abre solo las notas de la tarea', 'Decide con la persona o produce', 'Registra y sube (commit y push)'];
  ciclo.forEach((t, i) => {
    const x = M + i * 2.46;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 4.4, w: 2.15, h: 1.25, rectRadius: 0.1, fill: { color: i === 4 ? C.accent : C.primary }, line: { color: i === 4 ? C.accent : C.primary } });
    s.addText(t, { x: x + 0.1, y: 4.4, w: 1.95, h: 1.25, fontFace: BODY, fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    if (i < 4) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.18, y: 4.9, w: 0.25, h: 0.25, fill: { color: C.light }, line: { color: C.light } });
  });
  s.addText('El repositorio es la memoria compartida: lo que no queda escrito ahí, no pasa de una sesión a otra. La próxima sesión, de cualquier integrante, arranca desde ahí.', { x: M, y: 5.95, w: W - 2 * M, h: 0.6, fontFace: BODY, fontSize: 14, italic: true, color: C.primary, margin: 0, isTextBox: true });
  footer(s, n);
  s.addNotes('Presenta: Francisco. Límites: el agente no aprueba decisiones (las aprueba el equipo y quedan registradas), no inventa datos del negocio y respeta el alcance. Ejemplo real: al escribir el SQL detectó 12 datos que faltaban en el ER; el equipo los aprobó (DEC-0013).');
}

// 9 · Modelo de dominio
{
  const s = pres.addSlide(); next();
  header(s, 4, 'Modelo de datos', 'Trece entidades del dominio');
  fit(s, IMG.dom('Clases', 'DGM-clases.png'), M, 1.45, 8.3, 5.5);
  stat(s, 9.3, 1.6, 3.4, '13', 'entidades del dominio');
  stat(s, 9.3, 3.0, 3.4, '20', 'enumeraciones');
  bullets(s, [
    'Cliente, Oportunidad, Cotización, Viaje, Pago y Alerta: el circuito de venta.',
    'Hotel, Reseña, Destino, Operador y RequisitoDestino: catálogos.',
    'Usuario y ContenidoRed.',
  ], 9.3, 4.45, 3.45, 2.4, 13);
  footer(s, n);
  s.addNotes('Presenta: Nahuel. Diagrama de clases de dominio: solo atributos, sin métodos. Seis entidades tienen máquina de estados (Viaje, Oportunidad, Pago, Cotización, Alerta y ContenidoRed), documentadas en el anexo C.');
}

// 10 · ER y SQL
{
  const s = pres.addSlide(); next();
  header(s, 4, 'Modelo de datos', 'Del modelo entidad-relación al SQL');
  fit(s, IMG.dom('DER', 'DGM-ER.png'), M, 1.45, 6.2, 5.5);
  stat(s, 7.2, 1.55, 2.6, '15', 'tablas en PostgreSQL');
  stat(s, 10.1, 1.55, 2.6, '0', 'borrados en cascada');
  bullets(s, [
    'Claves UUID, enumeraciones nativas y auditoría en todas las tablas: quién y cuándo.',
    'La base controla la integridad: un viaje cancelado exige motivo; una alerta tiene a lo sumo un origen; el puntaje va de 1 a 5.',
    'Todo es baja lógica: nada se borra físicamente.',
    'Script validado en PostgreSQL 18; completo en el anexo D.',
  ], 7.2, 3.1, 5.5, 3.6, 14);
  footer(s, n);
  s.addNotes('Presenta: Nahuel. El script sale del ER y se validó corriéndolo con casos de prueba (permitidos y rechazados). Las reglas que dependen de varias filas (todo viaje tiene al menos un pago) las garantiza la API.');
}

// 11 · Estados del viaje
{
  const s = pres.addSlide(); next();
  header(s, 4, 'Modelo de datos', 'Las reglas viven en los estados');
  fit(s, IMG.dom('Estados', 'img', 'EST-Viaje.png'), M, 1.45, 7.6, 5.5);
  card(s, 8.6, 1.6, 4.13, 1.5, 'El primer cobro vende', 'Cualquier primer cobro pasa el viaje a vendido; si salda el total, a confirmado.', { titleSize: 16, size: 13 });
  card(s, 8.6, 3.3, 4.13, 1.5, 'El pago es indivisible', 'Para cobrar una parte, se divide la cuota.', { titleSize: 16, size: 13 });
  card(s, 8.6, 5.0, 4.13, 1.5, 'Cancelar se puede revertir', 'El viaje vuelve a su estado previo y se reabren solo sus alertas.', { titleSize: 16, size: 13 });
  footer(s, n);
  s.addNotes('Presenta: Nahuel. Diagrama de estados del Viaje. Las transiciones automáticas las aplica el proceso diario de las 00:00. Los otros cinco diagramas de estado, los de actividad y los de secuencia están en el anexo C.');
}

// 12 · Modelo de desarrollo
{
  const s = pres.addSlide(); next();
  header(s, 5, 'Modelo de desarrollo', 'Iterativo e incremental, una iteración por PC');
  fit(s, IMG.dis('DES-iteraciones.png'), M, 1.45, W - 2 * M, 2.8);
  const pr = [
    ['Una sola fuente de verdad', 'Repositorio Git con todo en Markdown; los Word se generan.'],
    ['Borrador → revisión → formalizado', 'Nada se aprueba sin los tres.'],
    ['Decisiones registradas', 'Contexto, alternativas y justificación.'],
    ['Sync semanal y frentes', 'Cada uno lleva una parte; el resto la revisa.'],
  ];
  pr.forEach((p, i) => card(s, M + i * 3.08, 4.5, 2.9, 1.45, p[0], p[1], { titleSize: 15, size: 12.5 }));
  footer(s, n);
  s.addNotes('Presenta: Paloma. Supuesto adoptado: «modelo de desarrollo» = metodología de trabajo. Desde el PC2 el código va en ramas y pull requests, con un pipeline de calidad (estilo, tipos, pruebas y seguridad) antes de integrar.');
}

// 13 · Interfaces: escritorio
{
  const s = pres.addSlide(); next();
  header(s, 5, 'Interfaces gráficas', 'Un prototipo navegable sobre el modelo aprobado');
  const shots = [['03-cu14-agenda.png', 'Agenda de alertas del día · CU-14'], ['15-cu07-10-11-ficha-viaje.png', 'Ficha del viaje · CU-07, 10 y 11'], ['28-cu21-dashboard.png', 'Dashboard de la dueña · CU-21']];
  shots.forEach((sh, i) => {
    const x = M + i * 4.11;
    fit(s, IMG.proto(sh[0]), x, 1.55, 3.9, 2.8, { shadow: { type: 'outer', color: '000000', opacity: 0.2, blur: 4, offset: 2, angle: 90 } });
    s.addText(sh[1], { x, y: 4.4, w: 3.9, h: 0.3, fontFace: BODY, fontSize: 12, color: C.muted, align: 'center', margin: 0, isTextBox: true });
  });
  const ds = [
    ['Sistema de diseño propio', 'Paleta del equipo, tipografía, espaciados, íconos y componentes reutilizables.'],
    ['Usabilidad', 'Contraste AA, la acción principal según el tipo de alerta, estados vacíos y deshacer.'],
    ['Lenguaje del negocio', 'Los nombres y estados reales del modelo, con datos de ejemplo coherentes.'],
  ];
  ds.forEach((d, i) => card(s, M + i * 4.11, 5.0, 3.9, 1.5, d[0], d[1], { titleSize: 15, size: 12.5 }));
  footer(s, n);
  s.addNotes('Presenta: Paloma. Sistema de diseño propio (paleta del equipo, tipografía, componentes) y buenas prácticas de usabilidad: contraste AA, acción principal según el tipo de alerta, estados vacíos y deshacer. Si hay internet, mostrarlo en vivo desde Figma (Present → «Ajustar»).');
}

// 14 · Interfaces: por rol y mobile
{
  const s = pres.addSlide(); next();
  header(s, 5, 'Interfaces gráficas', 'Cada rol ve lo suyo, también en el teléfono');
  stat(s, M, 1.6, 3.2, '59', 'pantallas');
  stat(s, M, 2.95, 3.2, '5', 'puntos de inicio por perfil');
  bullets(s, [
    'El freelance ve solo su cartera y consulta el catálogo sin modificarlo.',
    'La dueña y el administrador ven toda la agencia.',
    'Mobile: agenda, alertas y clientes para la calle.',
  ], M, 4.4, 3.6, 2.4, 14);
  fit(s, IMG.proto('46-freelance-dashboard.png'), 4.45, 1.55, 5.0, 2.55);
  s.addText('Dashboard del freelance: sus ventas y comisiones', { x: 4.45, y: 4.12, w: 5.0, h: 0.3, fontFace: BODY, fontSize: 11, color: C.muted, align: 'center', margin: 0, isTextBox: true });
  fit(s, IMG.proto('44-freelance-catalogo-hoteles.png'), 4.45, 4.5, 5.0, 2.1);
  s.addText('Catálogo de hoteles en solo consulta', { x: 4.45, y: 6.62, w: 5.0, h: 0.3, fontFace: BODY, fontSize: 11, color: C.muted, align: 'center', margin: 0, isTextBox: true });
  fit(s, IMG.proto('35-mobile-agenda.png'), 9.75, 1.55, 1.45, 5.0);
  fit(s, IMG.proto('57-mobile-clientes.png'), 11.28, 1.55, 1.45, 5.0);
  s.addText('Mobile · agenda y clientes', { x: 9.75, y: 6.62, w: 2.98, h: 0.3, fontFace: BODY, fontSize: 11, color: C.muted, align: 'center', margin: 0, isTextBox: true });
  footer(s, n);
  s.addNotes('Presenta: Paloma. Las vistas por rol siguen DEC-0005 y DEC-0008: el freelance no carga hoteles, no registra reseñas y no usa el módulo de redes. Las 59 pantallas están en el documento, cada una con su caso de uso.');
}

// 15 · C4
{
  const s = pres.addSlide(); next();
  header(s, 6, 'Arquitectura', 'Modelo C4: contexto y contenedores');
  s.addText('Nivel 1\ncontexto', { x: M, y: 1.5, w: 1.75, h: 2.45, fontFace: HEAD, fontSize: 15, bold: true, color: C.mid, valign: 'middle', margin: 0, isTextBox: true });
  fit(s, IMG.arq('ARQ-C4-1-contexto.png'), M + 1.85, 1.5, W - 2 * M - 1.85, 2.45);
  s.addText('Nivel 2\ncontenedores', { x: M, y: 4.15, w: 1.75, h: 2.6, fontFace: HEAD, fontSize: 15, bold: true, color: C.mid, valign: 'middle', margin: 0, isTextBox: true });
  fit(s, IMG.arq('ARQ-C4-2-contenedores.png'), M + 1.85, 4.15, W - 2 * M - 1.85, 2.6);
  footer(s, n);
  s.addNotes('Presenta: Nahuel. Cliente-servidor: web y mobile hablan en JSON con una única API, dueña de las reglas y de la base. La única integración externa en uso es la API de Claude (CU-20). WhatsApp e Instagram se usan a mano. El nivel 3 (componentes de la API) está en el documento. Se dibujó con Mermaid y la notación estándar de C4.');
}

// 16 · MVC
{
  const s = pres.addSlide(); next();
  header(s, 6, 'Arquitectura', 'MVC: Vista, Controlador y Modelo');
  fit(s, IMG.arq('ARQ-MVC.png'), M, 1.45, W - 2 * M, 2.95);
  card(s, M, 4.65, 3.9, 1.5, 'Vista', 'Web (React) y mobile (React Native). Muestran y capturan; no guardan datos ni deciden reglas.', { titleSize: 18, size: 13 });
  card(s, M + 4.07, 4.65, 3.9, 1.5, 'Controlador', 'Routers de FastAPI: validan el JSON, identifican al usuario y delegan el caso de uso.', { titleSize: 18, size: 13 });
  card(s, M + 8.14, 4.65, 3.99, 1.5, 'Modelo', 'Servicios, estados, permisos, repositorios y PostgreSQL: el dominio y sus reglas.', { fill: C.dark, titleColor: C.white, color: C.white, titleSize: 18, size: 13 });
  footer(s, n);
  s.addNotes('Presenta: Nahuel. Controlador delgado: la lógica de negocio es parte del Modelo. El proceso automático diario usa los mismos servicios que la API, así aplica las mismas reglas que una persona.');
}

// 17 · OpenAPI
{
  const s = pres.addSlide(); next();
  header(s, 6, 'Arquitectura', 'Vista y Controlador se hablan por OpenAPI');
  stat(s, M, 1.6, 2.6, '96', 'operaciones');
  stat(s, M + 2.8, 1.6, 2.6, '11', 'módulos');
  bullets(s, [
    'JSON sobre HTTPS, con token por usuario.',
    'Cada cambio de estado es una acción: POST /pagos/{id}/cobrar.',
    'Errores uniformes: 401, 403, 404, 409 y 422.',
    'La Vista genera sus tipos desde el contrato: si cambia, no compila.',
  ], M, 3.1, 5.5, 3.5, 15);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.5, y: 1.55, w: 6.23, h: 4.4, rectRadius: 0.08, fill: { color: C.dark }, line: { color: C.dark } });
  s.addText('POST /api/pagos/{pago_id}/cobrar', { x: 6.8, y: 1.75, w: 5.7, h: 0.4, fontFace: 'Courier New', fontSize: 14, bold: true, color: C.accent, margin: 0, isTextBox: true });
  s.addText('{\n  "fecha_cobro": "2026-10-02",\n  "forma_pago": "transferencia",\n  "moneda_pago": "ARS",\n  "tipo_cambio": null\n}', { x: 6.8, y: 2.3, w: 5.7, h: 2.0, fontFace: 'Courier New', fontSize: 14, color: C.white, margin: 0, isTextBox: true });
  s.addText([
    { text: '200 ', options: { bold: true, color: C.accent } }, { text: 'pago pagado y viaje actualizado', options: { breakLine: true } },
    { text: '409 ', options: { bold: true, color: C.accent } }, { text: 'el pago ya estaba pagado o anulado', options: { breakLine: true } },
    { text: '422 ', options: { bold: true, color: C.accent } }, { text: 'falta el tipo de cambio' },
  ], { x: 6.8, y: 4.4, w: 5.7, h: 1.3, fontFace: BODY, fontSize: 14, color: 'CFE0EC', paraSpaceAfter: 6, margin: 0, valign: 'top', isTextBox: true });
  footer(s, n);
  s.addNotes('Presenta: Nahuel. Contrato OpenAPI 3.1 preliminar, validado con Redocly. Esquemas completos para el circuito de CU-01; en el PC2 el contrato de referencia lo genera FastAPI. El JSON completo se entrega aparte (openapi.json).');
}

// 18 · Despliegue
{
  const s = pres.addSlide(); next();
  header(s, 6, 'Arquitectura', 'Dónde corre: un servidor en la agencia');
  fit(s, IMG.arq('ARQ-despliegue.png'), M, 1.45, W - 2 * M, 3.5);
  const dp = [
    ['Servidor', 'Mini PC con Ubuntu Server, UPS y Docker Compose.'],
    ['Cinco contenedores', 'nginx, API, PostgreSQL, proceso diario de las 00:00 y túnel.'],
    ['Acceso seguro', 'Por Cloudflare Tunnel, sin abrir puertos en el router.'],
    ['Sin hosting mensual', 'Se puede mover a un VPS sin reescribir nada.'],
  ];
  dp.forEach((d, i) => card(s, M + i * 3.08, 5.15, 2.9, 1.4, d[0], d[1], { titleSize: 15, size: 12.5 }));
  footer(s, n);
  s.addNotes('Presenta: Nahuel. DEC-0011. Riesgos aceptados: cortes de luz o de internet del local (mitigados con la UPS) y que Cloudflare vea el tráfico descifrado. El respaldo diario con copia externa se implementa en el PC2.');
}

// 19 · Cierre
{
  const s = pres.addSlide(); next();
  s.background = { color: C.dark };
  s.addText('PC1 completo', { x: M, y: 0.7, w: 8, h: 0.9, fontFace: HEAD, fontSize: 40, bold: true, color: C.white, margin: 0, isTextBox: true });
  const st = [['31', 'casos de uso'], ['155', 'requisitos funcionales'], ['16', 'no funcionales'], ['13', 'entidades'], ['96', 'operaciones de API'], ['59', 'pantallas']];
  st.forEach((v, i) => stat(s, M + (i % 3) * 4.1, 2.0 + Math.floor(i / 3) * 1.65, 3.8, v[0], v[1], true));
  s.addText([
    { text: 'Próximo: PC2 · 20/11/26', options: { bold: true, color: C.accent, breakLine: true } },
    { text: 'Código de los módulos núcleo, en ramas y pull requests, con el pipeline de calidad.' },
  ], { x: M, y: 5.5, w: 8.5, h: 0.9, fontFace: BODY, fontSize: 16, color: 'CFE0EC', margin: 0, paraSpaceAfter: 4, isTextBox: true });
  s.addText('Gracias', { x: 9.2, y: 5.5, w: 3.53, h: 0.9, fontFace: HEAD, fontSize: 34, italic: true, color: C.white, align: 'right', margin: 0, isTextBox: true });
  s.addNotes('Presenta: Francisco. Cierre con los números del PC1 y el próximo paso. Abrir preguntas.');
}

pres.writeFile({ fileName: OUT }).then(() => console.log('OK -> ' + OUT));
