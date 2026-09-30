// Genera el deck del PC1 (H4) desde las imágenes del vault.
// Uso, desde la raíz del repo: npm install --no-save pptxgenjs && node "07-Entregables/build/build-deck.js"
// Los textos son un resumen del documento único: si cambia un número (CU, RF, pantallas…), actualizarlo acá.
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, '07-Entregables/PC1/Rumbo — PC1 (presentación).pptx');
const IMG = p => path.join(ROOT, p);
const PROT = n => IMG('07-Entregables/Prototipo/img/' + n);

// Paleta del equipo (misma del prototipo)
const C = {
  navy: '17354C', primary: '22506F', mid: '3E7196', light: '73A5C4', pale: 'E9F1F7',
  gray: 'D9D9D9', bg: 'F6F8FA', text: '1F2A33', muted: '5B6B78', white: 'FFFFFF', amber: 'E8A93A', red: 'C0392B', green: '2E7D4F',
};
const F = 'Calibri';

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
// Ajusta una imagen dentro de una caja, centrada, sin deformarla
function fitImage(slide, file, x, y, w, h, opts = {}) {
  const s = pngSize(file);
  const r = Math.min(w / s.w, h / s.h);
  const iw = s.w * r, ih = s.h * r;
  slide.addImage({ path: file, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih, ...opts });
  return { x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih };
}

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pres.title = 'Rumbo — PC1';
pres.author = 'Francisco Luciano, Nahuel Viniegra y Paloma Patiño';
pres.company = 'Universidad de Morón';

const W = 13.333, H = 7.5, M = 0.6;
let n = 0;

function base(title, { section, presenter, dark = false } = {}) {
  const s = pres.addSlide();
  n++;
  s.background = { color: dark ? C.navy : C.bg };
  if (section) s.addText(section.toUpperCase(), { x: M, y: 0.35, w: 8, h: 0.3, fontFace: F, fontSize: 11, bold: true, color: dark ? C.light : C.mid, charSpacing: 2, margin: 0, isTextBox: true });
  if (title) s.addText(title, { x: M, y: 0.62, w: W - 2 * M - 2.4, h: 0.75, fontFace: F, fontSize: 30, bold: true, color: dark ? C.white : C.navy, margin: 0, valign: 'top', isTextBox: true });
  if (presenter) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: W - M - 2.1, y: 0.42, w: 2.1, h: 0.4, fill: { color: dark ? C.primary : C.pale }, line: { type: 'none' }, rectRadius: 0.2 });
    s.addText('Expone: ' + presenter, { x: W - M - 2.1, y: 0.42, w: 2.1, h: 0.4, fontFace: F, fontSize: 12, bold: true, color: dark ? C.white : C.primary, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  }
  s.addText(String(n), { x: W - M - 0.6, y: H - 0.45, w: 0.6, h: 0.3, fontFace: F, fontSize: 10, color: dark ? C.light : C.muted, align: 'right', margin: 0, isTextBox: true });
  return s;
}
function card(s, x, y, w, h, fill = C.white) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: 'E3E8ED', width: 0.75 }, rectRadius: 0.12 });
}
function bullets(s, items, x, y, w, h, size = 15, color = C.text) {
  s.addText(items.map((t, i) => {
    const parts = Array.isArray(t) ? t : [t];
    return { text: parts[0], options: { bullet: { indent: 16 }, breakLine: i < items.length - 1, bold: false } };
  }), { x, y, w, h, fontFace: F, fontSize: size, color, valign: 'top', paraSpaceAfter: 8, margin: 0, isTextBox: true });
}
function rich(s, runs, x, y, w, h, size = 15, color = C.text, opts = {}) {
  s.addText(runs.map(([t, b], i) => ({ text: t, options: { bold: !!b } })), { x, y, w, h, fontFace: F, fontSize: size, color, valign: 'top', margin: 0, isTextBox: true, ...opts });
}
function numCircle(s, x, y, num, d = 0.55, fill = C.primary) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: 'none' } });
  s.addText(String(num), { x, y, w: d, h: d, fontFace: F, fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
}
function stat(s, x, y, w, value, label, color = C.primary, lcolor = C.muted) {
  s.addText(value, { x, y, w, h: 0.8, fontFace: F, fontSize: 40, bold: true, color, margin: 0, isTextBox: true });
  s.addText(label, { x, y: y + 0.8, w, h: 0.5, fontFace: F, fontSize: 13, color: lcolor, margin: 0, valign: 'top', isTextBox: true });
}

// 1 · Portada
{
  const s = base(null, { dark: true });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.2, w: 0.9, h: 0.9, fill: { color: C.primary }, line: { type: 'none' }, rectRadius: 0.2 });
  s.addText('R', { x: M, y: 1.2, w: 0.9, h: 0.9, fontFace: F, fontSize: 36, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  s.addText('Rumbo', { x: M, y: 2.35, w: 9, h: 1.2, fontFace: F, fontSize: 66, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText('CRM para agencias de turismo PyME', { x: M, y: 3.5, w: 10, h: 0.6, fontFace: F, fontSize: 26, color: C.light, margin: 0, isTextBox: true });
  s.addText('Punto de Control 1 · Análisis, diseño y planificación', { x: M, y: 4.3, w: 10, h: 0.45, fontFace: F, fontSize: 18, color: C.white, margin: 0, isTextBox: true });
  s.addText('Francisco Luciano · Nahuel Viniegra · Paloma Patiño', { x: M, y: 5.55, w: 10, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText('Universidad de Morón · Ingeniería Informática · Trabajo de Campo · 02/10/26', { x: M, y: 5.95, w: 11, h: 0.4, fontFace: F, fontSize: 14, color: C.light, margin: 0, isTextBox: true });
  s.addNotes('Presentación del equipo y del proyecto. Rumbo es un CRM a medida para una agencia de turismo PyME real, con la que hicimos el relevamiento en dos rondas.');
}

// 2 · Agenda
{
  const s = base('Qué vamos a mostrar', { section: 'Agenda' });
  const items = [
    ['Definición del problema', 'Cómo trabaja hoy la agencia y qué ofrece el mercado', 'Francisco'],
    ['Alcance y límites', 'Objetivos, alcance, actores y casos de uso', 'Francisco'],
    ['Modelo conceptual', 'Frontend, backend y base de datos; interfaces', 'Francisco y Paloma'],
    ['Modelo de flujo', 'Diagramas UML y modelo C4', 'Francisco y Nahuel'],
    ['Modelo de datos SQL', 'Entidad-relación y script', 'Nahuel'],
    ['Comunicación V–C', 'MVC y contrato OpenAPI en JSON', 'Francisco y Nahuel'],
    ['Modelos y agentes de IA', 'El modelo del producto, los agentes y sus prompts', 'Francisco'],
    ['Modelado con Mermaid.js', 'Diagramas como código', 'Francisco'],
  ];
  items.forEach(([t, d, p], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.1, y = 1.6 + row * 1.3;
    card(s, x, y, 5.9, 1.12);
    numCircle(s, x + 0.28, y + 0.29, i + 1);
    s.addText(t, { x: x + 1.05, y: y + 0.14, w: 4.7, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 1.05, y: y + 0.5, w: 4.7, h: 0.3, fontFace: F, fontSize: 12, color: C.muted, margin: 0, isTextBox: true });
    s.addText(p, { x: x + 1.05, y: y + 0.78, w: 4.7, h: 0.28, fontFace: F, fontSize: 11, bold: true, color: C.mid, margin: 0, isTextBox: true });
  });
  s.addNotes('El orden sigue el contenido del «Documento con el MVC» que pide la cátedra, igual que el documento entregado. El material completo (anexos, todos los diagramas y pantallas) está en la carpeta de entrega.');
}

// 3 · Antecedentes
{
  const s = base('Cómo trabaja hoy la agencia', { section: '1 · Definición del problema', presenter: 'Francisco' });
  const rows = [
    ['Carpetas físicas por viaje', 'No hay un lugar único para ver clientes y viajes juntos.'],
    ['Consultas por Instagram, WhatsApp o en persona', 'El seguimiento depende de la memoria de quien atendió.'],
    ['Cobros y vencimientos en planillas', 'Señas, cuotas y pagos a operadores, sin avisos automáticos.'],
    ['Vendedores freelance y operaciones en ARS y USD', 'Hay que saber qué vendió cada uno y cuánto ganó la agencia.'],
  ];
  rows.forEach(([t, d], i) => {
    const y = 1.75 + i * 1.12;
    numCircle(s, M, y + 0.1, i + 1, 0.5, C.mid);
    s.addText(t, { x: M + 0.75, y, w: 6.6, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: M + 0.75, y: y + 0.42, w: 6.6, h: 0.4, fontFace: F, fontSize: 14, color: C.muted, margin: 0, isTextBox: true });
  });
  card(s, 8.3, 1.75, 4.43, 4.3, C.navy);
  s.addText('Consecuencias', { x: 8.6, y: 2.0, w: 3.9, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: C.light, margin: 0, isTextBox: true });
  s.addText([
    { text: 'Se pierden ventas', options: { breakLine: true } },
    { text: 'Se olvidan cobros', options: { breakLine: true } },
    { text: 'No queda memoria del cliente' },
  ], { x: 8.6, y: 2.5, w: 3.9, h: 1.8, fontFace: F, fontSize: 22, bold: true, color: C.white, margin: 0, paraSpaceAfter: 10, isTextBox: true });
  s.addText('Y el negocio se sostiene con clientes fieles: llegan pocos nuevos.', { x: 8.6, y: 4.6, w: 3.9, h: 1.1, fontFace: F, fontSize: 14, italic: true, color: C.light, margin: 0, isTextBox: true });
  s.addNotes('Situación actual tomada del relevamiento con la agencia (dos rondas: 10/09 y 17/09).');
}

// 4 · Mercado
{
  const s = base('Por qué no alcanzan las herramientas que existen', { section: '1 · Definición del problema', presenter: 'Francisco' });
  const hdr = ['Necesidad de la agencia', 'Excel y mensajería', 'CRM genérico', 'CRM turismo EE. UU.', 'Rumbo'];
  const data = [
    ['Seguir la consulta hasta la venta', 'A mano', 'Sí', 'Sí', 'Sí'],
    ['Viaje con itinerario, operador y economía', 'A mano', 'No', 'Sí', 'Sí'],
    ['Cuotas y vencimientos con avisos', 'Sin avisos', 'No', 'Parcial', 'Sí'],
    ['Ganancia y comisión freelance en ARS o USD', 'A mano', 'No', 'Parcial, USD', 'Sí'],
    ['Recordatorios por requisitos del destino', 'No', 'No', 'No se encontró', 'Sí'],
    ['Recontactar clientes fieles', 'No', 'A medida', 'No se encontró', 'Sí'],
    ['Español, pesos y costo PyME', 'Sí', 'Parcial', 'No', 'Sí'],
  ];
  const head = hdr.map((h, i) => ({ text: h, options: { bold: true, color: C.white, fill: { color: i === 4 ? C.primary : C.mid }, align: i ? 'center' : 'left' } }));
  const body = data.map(r => r.map((c, i) => ({ text: c, options: { color: i === 4 ? C.primary : C.text, bold: i === 4 || i === 0, align: i ? 'center' : 'left', fill: { color: i === 4 ? C.pale : C.white } } })));
  s.addTable([head, ...body], { x: M, y: 1.7, w: W - 2 * M, colW: [4.2, 1.9, 1.7, 2.2, 2.13], fontFace: F, fontSize: 14, border: { type: 'solid', color: 'E3E8ED', pt: 0.75 }, rowH: 0.52, valign: 'middle' });
  s.addText('Fuente: documentación pública de HubSpot, Pipedrive, Tern, TravelJoy, Travefy y SAVIA, consultada el 30/09/26. «No se encontró» = la documentación no lo menciona.', { x: M, y: 6.5, w: 11, h: 0.4, fontFace: F, fontSize: 11, color: C.muted, margin: 0, isTextBox: true });
  s.addNotes('Los back office argentinos (SAVIA) cubren administración y facturación, pero no el seguimiento comercial ni el CRM proactivo.');
}

// 5 · Objetivos
{
  const s = base('Qué busca resolver Rumbo', { section: '2 · Alcance y límites', presenter: 'Francisco' });
  const obj = [
    ['Digitalizar y centralizar', 'De las carpetas a un único sistema de clientes y viajes.'],
    ['Fidelizar clientes', 'Ficha con preferencias, historial y recontacto.'],
    ['Ordenar el circuito de venta', 'De la consulta a la cotización y el cierre, sin perder pasos.'],
    ['Controlar la economía', 'Ganancia, margen, comisión y cuotas, en ARS o USD.'],
    ['No perder vencimientos', 'Alertas de pagos, formularios por destino e insistencia.'],
    ['Decidir con datos', 'Dashboard, estadísticas y reportes mensuales.'],
  ];
  obj.forEach(([t, d], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * 4.1, y = 1.75 + row * 2.35;
    card(s, x, y, 3.9, 2.1);
    numCircle(s, x + 0.3, y + 0.3, i + 1);
    s.addText(t, { x: x + 0.3, y: y + 1.0, w: 3.4, h: 0.4, fontFace: F, fontSize: 18, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.3, y: y + 1.42, w: 3.4, h: 0.6, fontFace: F, fontSize: 13, color: C.muted, margin: 0, isTextBox: true });
  });
  s.addNotes('Justificación: el trabajo manual pierde ventas y cobros; las herramientas genéricas no entienden reservas, comisiones ni cuotas; y como proyecto integrador combina web, mobile, backend, base relacional, API REST e IA.');
}

// 6 · Alcance
{
  const s = base('Alcance y límites', { section: '2 · Alcance y límites', presenter: 'Francisco' });
  const mods = ['Clientes', 'Oportunidades y cotización', 'Viajes', 'Economía y pagos', 'Alertas y recordatorios', 'Catálogo de hoteles', 'Redes sociales', 'Dashboard y reportes', 'Calendario de viajes', 'Configuración y catálogos', 'Usuarios y seguridad'];
  s.addText('11 módulos · web y mobile', { x: M, y: 1.65, w: 7, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: C.primary, margin: 0, isTextBox: true });
  mods.forEach((m, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 3.55, y = 2.15 + row * 0.72;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.4, h: 0.56, fill: { color: C.pale }, line: { type: 'none' }, rectRadius: 0.1 });
    s.addText(m, { x: x + 0.2, y, w: 3.1, h: 0.56, fontFace: F, fontSize: 14, bold: true, color: C.navy, valign: 'middle', margin: 0, isTextBox: true });
  });
  card(s, 8.1, 1.65, 4.63, 4.95);
  s.addText('Fuera de esta etapa', { x: 8.4, y: 1.85, w: 4.1, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: C.red, margin: 0, isTextBox: true });
  bullets(s, ['Pagos online, reembolsos y penalidades', 'Publicación automática en redes', 'Integración con mayoristas y GDS', 'Cotizador y ofertas por scraping', 'Avisos automáticos al pasajero', 'Facturación (fase 2)'], 8.4, 2.35, 4.1, 3.2, 14);
  s.addText('Incluido: CRM proactivo (recontacto de clientes fieles) y vencimiento de pago al proveedor por hotel.', { x: 8.4, y: 5.55, w: 4.1, h: 0.9, fontFace: F, fontSize: 12, italic: true, color: C.green, margin: 0, isTextBox: true });
}

// 7 · Actores y casos de uso
{
  const s = base('Actores y casos de uso', { section: '2 · Alcance y límites', presenter: 'Francisco' });
  const act = [['Empleado', 'Usuario principal', 'Opera todo el circuito: clientes, consultas, cotizaciones, viajes, cobros y alertas.'], ['Admin', 'Hereda del empleado', 'Configura comisiones, destinos, operadores y usuarios, y modera reseñas.'], ['Dueña', 'Hereda del empleado', 'Mira el negocio: dashboard, reportes y alertas de toda la empresa.'], ['Freelance', 'Hereda del empleado', 'Vendedor externo: ve y opera solo lo suyo; no toca el catálogo ni las redes.'], ['Pasajero', 'Actor externo', 'Consulta, recibe cotizaciones y paga. No opera el sistema.']];
  act.forEach(([a, t, d], i) => {
    const x = M + i * 2.46;
    card(s, x, 1.75, 2.28, 3.4, i === 4 ? C.pale : C.white);
    s.addText(a, { x: x + 0.2, y: 1.95, w: 1.9, h: 0.45, fontFace: F, fontSize: 19, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(t, { x: x + 0.2, y: 2.4, w: 1.9, h: 0.35, fontFace: F, fontSize: 12, bold: true, color: C.mid, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.2, y: 2.85, w: 1.9, h: 2.1, fontFace: F, fontSize: 13, color: C.text, margin: 0, valign: 'top', isTextBox: true });
  });
  stat(s, M, 5.5, 3.5, '31', 'casos de uso en 11 módulos');
  stat(s, M + 4.1, 5.5, 3.5, '155', 'requisitos funcionales');
  stat(s, M + 8.2, 5.5, 3.5, '16', 'requisitos no funcionales');
  s.addNotes('Admin, dueña y freelance son especializaciones del empleado: heredan los casos operativos. El freelance no gestiona hoteles, no registra reseñas y no usa redes.');
}

// N1 · Modelo conceptual
{
  const s = base('Tres capas: frontend, backend y base de datos', { section: '3 · Modelo conceptual', presenter: 'Francisco' });
  fitImage(s, IMG('05-Diseño/Arquitectura/img/ARQ-capas-conceptual.png'), M, 1.55, W - 2 * M, 3.1);
  const capas = [
    ['Frontend', 'Web con los once módulos según el rol, y mobile con agenda, alertas y clientes. Muestra y valida; no decide reglas.'],
    ['Backend de negocio', 'La única puerta al dominio: permisos por rol, un caso de uso por transacción, estados y el proceso diario.'],
    ['Base de datos', 'PostgreSQL con 15 tablas: protege la integridad con claves y restricciones; todo es baja lógica.'],
  ];
  capas.forEach(([t, d], i) => {
    const x = M + i * 4.11;
    card(s, x, 4.9, 3.9, 1.75);
    s.addText(t, { x: x + 0.25, y: 5.05, w: 3.4, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.25, y: 5.47, w: 3.4, h: 1.1, fontFace: F, fontSize: 12.5, color: C.text, margin: 0, valign: 'top', isTextBox: true });
  });
  s.addNotes('Cada capa se puede cambiar sin tocar las otras mientras se respete el contrato entre ellas: OpenAPI entre frontend y backend, y el esquema SQL entre backend y base de datos.');
}

// 15 · Interfaces: cómo se diseñó
{
  const s = base('Interfaces gráficas: prototipo en Figma', { section: '3 · Modelo conceptual', presenter: 'Paloma' });
  const img = PROT('03-cu14-agenda.png');
  const r = fitImage(s, img, 6.2, 1.5, 6.53, 5.4);
  s.addShape(pres.shapes.RECTANGLE, { x: r.x, y: r.y, w: r.w, h: r.h, fill: { type: 'none' }, line: { color: 'D5DDE4', width: 1 } });
  const st = ['Validar el estilo con una pantalla: la agenda del día', 'Sistema de diseño liviano: paleta del equipo, Plus Jakarta Sans, 7 componentes y 28 íconos', 'Pantallas clave del circuito y después el resto de los casos de uso', 'Vistas por perfil y mobile', 'Navegable: cada pantalla se alcanza desde un punto de inicio'];
  st.forEach((t, i) => {
    const y = 1.65 + i * 0.95;
    numCircle(s, M, y, i + 1, 0.48, C.mid);
    s.addText(t, { x: M + 0.7, y: y - 0.02, w: 4.6, h: 0.8, fontFace: F, fontSize: 14, color: C.text, margin: 0, valign: 'top', isTextBox: true });
  });
  s.addText('Contraste AA · el color nunca es la única señal · «Deshacer» en lugar de confirmar', { x: M, y: 6.45, w: 5.3, h: 0.6, fontFace: F, fontSize: 12, italic: true, color: C.primary, margin: 0, isTextBox: true });
}

// 16 · Vista por perfil
{
  const s = base('Una vista por perfil', { section: '3 · Modelo conceptual', presenter: 'Paloma' });
  const shots = [['03-cu14-agenda.png', 'Empleado', 'Todo el circuito; su agenda y su dashboard'], ['49-admin-agenda-agencia.png', 'Admin', 'Alertas de toda la agencia y configuración'], ['28-cu21-dashboard.png', 'Dueña', 'Todo lo del admin, más el dashboard y los reportes de la empresa'], ['34-freelance-embudo.png', 'Freelance', 'Solo sus clientes, oportunidades y viajes']];
  shots.forEach(([f, t, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.15, y = 1.5 + row * 2.8;
    const r = fitImage(s, PROT(f), x, y, 3.3, 2.55);
    s.addShape(pres.shapes.RECTANGLE, { x: r.x, y: r.y, w: r.w, h: r.h, fill: { type: 'none' }, line: { color: 'D5DDE4', width: 1 } });
    s.addText(t, { x: x + 3.5, y: y + 0.5, w: 2.4, h: 0.45, fontFace: F, fontSize: 20, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 3.5, y: y + 1.0, w: 2.4, h: 1.0, fontFace: F, fontSize: 13, color: C.muted, margin: 0, isTextBox: true });
  });
}

// 17 · Mobile
{
  const s = base('Mobile: agenda, alertas y clientes', { section: '3 · Modelo conceptual', presenter: 'Paloma' });
  const ph = ['35-mobile-agenda.png', '53-mobile-detalle-alerta.png', '57-mobile-clientes.png', '36-mobile-ficha-cliente.png'];
  ph.forEach((f, i) => {
    const r = fitImage(s, PROT(f), 4.9 + i * 2.0, 1.55, 1.85, 4.0);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: r.x, y: r.y, w: r.w, h: r.h, fill: { type: 'none' }, line: { color: 'C9D3DC', width: 1 }, rectRadius: 0.1 });
  });
  bullets(s, ['Ver la agenda y atender alertas: resolver, posponer, marcar como vista', 'Crear recordatorios', 'Buscar clientes, ver su ficha y dar de alta uno nuevo', 'Cotizar, gestionar viajes y cobrar: desde la web'], M, 1.7, 3.9, 4, 15);
  s.addText('React Native + Expo · la misma API y el mismo contrato que la web', { x: M, y: 5.9, w: 12, h: 0.5, fontFace: F, fontSize: 13, italic: true, color: C.primary, margin: 0, isTextBox: true });
}

// 18 · Demo
{
  const s = base('Recorrido del prototipo', { section: '3 · Modelo conceptual', presenter: 'Paloma', dark: true });
  stat(s, M, 1.9, 3.5, '59', 'pantallas', C.white, C.light);
  stat(s, M, 3.4, 3.5, '5', 'puntos de inicio', C.white, C.light);
  const st = ['Rumbo · escritorio (empleado): inicio de sesión → agenda → cliente → consulta → cotización → viaje → cobro', 'Rumbo · mobile', 'Dueña · dashboard', 'Admin · configuración', 'Freelance · embudo'];
  st.forEach((t, i) => {
    const y = 1.9 + i * 0.8;
    numCircle(s, 4.6, y, i + 1, 0.5, C.primary);
    s.addText(t, { x: 5.3, y: y - 0.02, w: 7.4, h: 0.7, fontFace: F, fontSize: 16, color: C.white, margin: 0, valign: 'middle', isTextBox: true });
  });
  s.addText('figma.com/design/5rq8HOlZQ3uu4IUpBuhuZp · Present → Opciones → «Ajustar»', { x: M, y: 6.25, w: 12, h: 0.4, fontFace: F, fontSize: 13, color: C.light, margin: 0, hyperlink: { url: 'https://www.figma.com/design/5rq8HOlZQ3uu4IUpBuhuZp' }, isTextBox: true });
  s.addNotes('Si hay tiempo, demo en vivo desde Figma. Si no, las capturas de las diapositivas anteriores alcanzan.');
}

// 8 · Circuito
{
  const s = base('El circuito que Rumbo digitaliza', { section: '4 · Modelo de flujo: UML y C4', presenter: 'Francisco' });
  const steps = [['Cliente', 'Se registra o se busca'], ['Consulta', 'Nace la oportunidad'], ['Cotización', 'Versionable, con vigencia'], ['Reserva y seguimiento', 'Se crea el viaje'], ['Cobros y alertas', 'Cuotas, vencimientos y post-viaje']];
  steps.forEach(([t, d], i) => {
    const x = M + i * 2.46;
    card(s, x, 1.8, 2.25, 1.9, i === 3 ? C.pale : C.white);
    numCircle(s, x + 0.25, 2.0, i + 1);
    s.addText(t, { x: x + 0.25, y: 2.7, w: 1.9, h: 0.45, fontFace: F, fontSize: 16, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.25, y: 3.12, w: 1.9, h: 0.5, fontFace: F, fontSize: 12, color: C.muted, margin: 0, isTextBox: true });
  });
  s.addText('Estados del viaje', { x: M, y: 4.15, w: 5, h: 0.4, fontFace: F, fontSize: 15, bold: true, color: C.primary, margin: 0, isTextBox: true });
  const est = ['reservado', 'vendido', 'confirmado', 'en curso', 'finalizado'];
  est.forEach((e, i) => {
    const x = M + i * 2.46;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 4.65, w: 2.1, h: 0.6, fill: { color: i < 3 ? C.primary : C.mid }, line: { type: 'none' }, rectRadius: 0.3 });
    s.addText(e, { x, y: 4.65, w: 2.1, h: 0.6, fontFace: F, fontSize: 15, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    if (i < 4) s.addText('→', { x: x + 2.1, y: 4.65, w: 0.36, h: 0.6, fontFace: F, fontSize: 18, color: C.muted, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  });
  rich(s, [['El primer cobro pasa el viaje a ', 0], ['vendido', 1], ['; si salda el total, a ', 0], ['confirmado', 1], ['. Un proceso automático corre todos los días a las 00:00: vence pagos y cotizaciones y genera alertas.', 0]], M, 5.6, 12, 0.8, 14, C.text);
  s.addNotes('CU-01 De la consulta a la venta: 5 pasos. Diagramas de secuencia, actividad y estados en los anexos del documento.');
}

// 11 · Clases
{
  const s = base('Modelo de dominio: diagrama de clases', { section: '4 · Modelo de flujo: UML y C4', presenter: 'Nahuel' });
  fitImage(s, IMG('03-Dominio/Diagramas/Clases/DGM-clases.png'), 3.6, 1.45, 9.13, 5.55);
  stat(s, M, 1.8, 2.8, '13', 'entidades del dominio');
  stat(s, M, 3.3, 2.8, '20', 'enumeraciones');
  stat(s, M, 4.8, 2.8, '6', 'máquinas de estado');
  s.addNotes('Cliente, Oportunidad, Cotización, Viaje, Pago, Alerta, Hotel, Reseña, Usuario, ContenidoRed, Destino, RequisitoDestino y Operador, más la clase asociativa ViajeHotel.');
}

// 19 · Despliegue
{
  const s = base('Arquitectura: vista general y despliegue', { section: '4 · Modelo de flujo: UML y C4', presenter: 'Nahuel' });
  fitImage(s, IMG('05-Diseño/Arquitectura/img/ARQ-despliegue.png'), M, 1.45, 12.13, 3.75);
  bullets(s, ['Cliente-servidor: web y mobile hablan en JSON con una única API', 'FastAPI + PostgreSQL + LangChain', 'Servidor on-premise en la agencia con Docker Compose'], M, 5.45, 5.9, 1.6, 14);
  bullets(s, ['Proceso automático diario a las 00:00', 'Acceso externo por Cloudflare Tunnel', 'Respaldo diario con copia fuera del servidor'], 6.83, 5.45, 5.9, 1.6, 14);
}

// 20 · C4
{
  const s = base('Modelo C4: contexto y contenedores', { section: '4 · Modelo de flujo: UML y C4', presenter: 'Nahuel' });
  const a = fitImage(s, IMG('05-Diseño/Arquitectura/img/ARQ-C4-1-contexto.png'), M, 1.5, 5.9, 5.0);
  const b = fitImage(s, IMG('05-Diseño/Arquitectura/img/ARQ-C4-2-contenedores.png'), 6.83, 1.5, 5.9, 5.0);
  s.addText('Nivel 1 · Contexto', { x: M, y: 6.6, w: 5.9, h: 0.35, fontFace: F, fontSize: 13, bold: true, color: C.primary, align: 'center', margin: 0, isTextBox: true });
  s.addText('Nivel 2 · Contenedores', { x: 6.83, y: 6.6, w: 5.9, h: 0.35, fontFace: F, fontSize: 13, bold: true, color: C.primary, align: 'center', margin: 0, isTextBox: true });
}

// 21 · Componentes
{
  const s = base('Modelo C4: componentes de la API', { section: '4 · Modelo de flujo: UML y C4', presenter: 'Nahuel' });
  fitImage(s, IMG('05-Diseño/Arquitectura/img/ARQ-C4-3-componentes.png'), M, 1.45, 12.13, 4.0);
  bullets(s, ['Tres capas: presentación, negocio y datos, más core', 'Un paquete por módulo funcional'], M, 5.7, 5.9, 1.3, 14);
  bullets(s, ['Visibilidad por fila: el filtro por rol es obligatorio en toda lectura', 'Auditoría de autor y fecha en cada cambio'], 6.83, 5.7, 5.9, 1.3, 14);
}

// 12 · ER y SQL
{
  const s = base('Modelo entidad-relación y SQL', { section: '5 · Modelo de datos SQL', presenter: 'Nahuel' });
  fitImage(s, IMG('03-Dominio/Diagramas/DER/DGM-ER.png'), M, 1.45, 6.3, 5.6);
  card(s, 7.2, 1.6, 5.53, 5.2);
  s.addText('Script SQL · PostgreSQL', { x: 7.5, y: 1.85, w: 5, h: 0.4, fontFace: F, fontSize: 18, bold: true, color: C.navy, margin: 0, isTextBox: true });
  bullets(s, ['15 tablas y 20 tipos enumerados nativos', 'Claves UUID con gen_random_uuid()', 'Auditoría en todas las tablas: quién creó y modificó cada registro', 'Ganancia y margen como columnas calculadas', 'CHECK: cada alerta tiene a lo sumo un origen', 'Validado corriéndolo en PostgreSQL 18 con casos de prueba permitidos y rechazados'], 7.5, 2.4, 5, 3.6, 14);
  s.addText('En PC2, la primera migración de Alembic lo reproduce.', { x: 7.5, y: 6.1, w: 5, h: 0.5, fontFace: F, fontSize: 12, italic: true, color: C.primary, margin: 0, isTextBox: true });
}

// 22 · MVC
{
  const s = base('MVC en Rumbo', { section: '6 · Comunicación Vista–Controlador', presenter: 'Francisco' });
  fitImage(s, IMG('05-Diseño/Arquitectura/img/ARQ-MVC.png'), M, 1.45, 12.13, 3.6);
  const mvc = [['Vista', 'Web (React) y mobile (React Native)'], ['Controlador', 'Routers y esquemas de la API FastAPI'], ['Modelo', 'Servicios, estados, políticas y PostgreSQL']];
  mvc.forEach(([t, d], i) => {
    const x = M + i * 4.1;
    card(s, x, 5.25, 3.9, 1.3, i === 1 ? C.pale : C.white);
    s.addText(t, { x: x + 0.25, y: 5.37, w: 3.4, h: 0.45, fontFace: F, fontSize: 19, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.25, y: 5.85, w: 3.4, h: 0.5, fontFace: F, fontSize: 13, color: C.muted, margin: 0, isTextBox: true });
  });
  s.addText('Vista y Controlador se comunican en JSON según el contrato OpenAPI.', { x: M, y: 6.7, w: 12, h: 0.35, fontFace: F, fontSize: 12, italic: true, color: C.primary, margin: 0, isTextBox: true });
}

// 23 · OpenAPI
{
  const s = base('Comunicación Vista–Controlador: OpenAPI', { section: '6 · Comunicación Vista–Controlador', presenter: 'Nahuel' });
  stat(s, M, 1.8, 3.3, '96', 'operaciones REST');
  stat(s, M + 3.5, 1.8, 3.3, '11', 'módulos');
  stat(s, M + 7.0, 1.8, 3.3, '4', 'roles con permisos por operación');
  card(s, M, 3.55, 12.13, 3.1);
  bullets(s, ['OpenAPI 3.1 en JSON, validado con Redocly', 'Cada operación declara el rol que la puede usar y los casos de uso que realiza', 'Errores uniformes en formato application/problem+json', 'Esquemas completos del circuito central: Cliente, Oportunidad, Cotización, Viaje, Pago y Alerta', 'Web y mobile generan sus tipos desde el contrato (openapi-typescript)'], M + 0.35, 3.8, 11.5, 2.7, 15);
  s.addNotes('Contrato preliminar: en PC2, el contrato de referencia pasa a ser el que genera FastAPI a medida que se escriben los endpoints.');
}

// 9 · IA del producto
{
  const s = base('La IA dentro del producto', { section: '7 · Modelos y agentes de IA', presenter: 'Francisco' });
  card(s, M, 1.7, 5.6, 4.9, C.navy);
  s.addText('Claude Sonnet 5.5', { x: M + 0.35, y: 1.95, w: 5, h: 0.6, fontFace: F, fontSize: 28, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText('Borradores de publicaciones para redes (CU-20)', { x: M + 0.35, y: 2.6, w: 5, h: 0.4, fontFace: F, fontSize: 15, color: C.light, margin: 0, isTextBox: true });
  bullets(s, ['Entrada: tema, canal y tono', 'Un borrador por pedido, que se puede regenerar', 'Integración con LangChain desde el backend', 'No recibe datos de clientes', 'No publica: la publicación es manual'], M + 0.35, 3.25, 5, 3, 15, C.white);
  s.addText('Por qué este modelo', { x: 6.8, y: 1.7, w: 6, h: 0.4, fontFace: F, fontSize: 18, bold: true, color: C.navy, margin: 0, isTextBox: true });
  const hdr = ['', 'Sonnet 5.5', 'Haiku 4.5'].map((h, i) => ({ text: h, options: { bold: true, color: C.white, fill: { color: i === 1 ? C.primary : C.mid }, align: 'center' } }));
  const rows = [['Calidad del texto en español', 'Mejor', 'Menor'], ['Entrada (USD por millón de tokens)', '2', '1'], ['Salida (USD por millón de tokens)', '10', '5'], ['Elegido', 'Sí', 'No']];
  s.addTable([hdr, ...rows.map(r => r.map((c, i) => ({ text: c, options: { align: i ? 'center' : 'left', bold: i === 1, color: i === 1 ? C.primary : C.text } })))], { x: 6.8, y: 2.2, w: 5.93, colW: [3.13, 1.4, 1.4], fontFace: F, fontSize: 14, border: { type: 'solid', color: 'E3E8ED', pt: 0.75 }, rowH: 0.5, fill: { color: C.white } });
  s.addText('Con unas decenas de borradores por mes, la diferencia de costo es de centavos de dólar. Lo que percibe la agencia es la calidad del texto.', { x: 6.8, y: 4.9, w: 5.93, h: 1.2, fontFace: F, fontSize: 15, italic: true, color: C.text, margin: 0, isTextBox: true });
}

// 10 · Agentes
{
  const s = base('Cómo trabajamos con agentes de IA', { section: '7 · Modelos y agentes de IA', presenter: 'Francisco' });
  const cyc = [['Entrar en contexto', 'Trae lo nuevo del repositorio y lee el estado y la bitácora'], ['Trabajar', 'Edita solo las notas de la tarea y respeta las decisiones'], ['Verificar', 'Diagramas, entregables y enlaces'], ['Registrar y subir', 'Bitácora, commit con la identidad de cada uno y push']];
  cyc.forEach(([t, d], i) => {
    const y = 1.6 + i * 1.3;
    numCircle(s, 5.5, y + 0.2, i + 1, 0.6, C.primary);
    card(s, 6.3, y, 6.43, 1.05);
    s.addText(t, { x: 6.55, y: y + 0.12, w: 6, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: 6.55, y: y + 0.52, w: 6, h: 0.4, fontFace: F, fontSize: 13, color: C.muted, margin: 0, isTextBox: true });
  });
  const ag = [['Claude Code', 'Agente principal: lee el vault, edita notas y diagramas, genera entregables y hace commits.'], ['Subagentes', 'Exploran el vault en paralelo cuando la búsqueda es amplia.'], ['MCP de Figma', 'Construye el prototipo de interfaces directamente en Figma.']];
  ag.forEach(([t, d], i) => {
    const y = 1.6 + i * 1.55;
    card(s, M, y, 4.4, 1.35);
    s.addText(t, { x: M + 0.25, y: y + 0.15, w: 4, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: M + 0.25, y: y + 0.55, w: 4, h: 0.75, fontFace: F, fontSize: 12, color: C.muted, margin: 0, isTextBox: true });
  });
  s.addText('El repositorio es la memoria compartida: lo que no queda escrito no pasa de una sesión a otra.', { x: M, y: 6.3, w: 4.4, h: 0.7, fontFace: F, fontSize: 12, italic: true, color: C.primary, margin: 0, isTextBox: true });
}

// N2 · Prompts
{
  const s = base('Los prompts con que construimos Rumbo', { section: '7 · Modelos y agentes de IA', presenter: 'Francisco' });
  const cols = [
    ['1 · Prompt de sistema', 'CLAUDE.md', [
      'El agente lo lee al empezar cada sesión.',
      'Cómo entrar en contexto: identificar a la persona, traer el trabajo del equipo y leer el estado.',
      'Reglas: respetar el alcance, no inventar datos del negocio y no aprobar nada sin el equipo.',
      'Cómo cerrar: bitácora, commit con la identidad de la persona y subir.',
    ]],
    ['2 · Prompt de cada sesión', '«Hola, entrá en contexto.»', [
      'Con CLAUDE.md alcanza un pedido corto: el agente aplica el protocolo solo.',
      'Después, cada pedido describe la tarea: «revisemos y decime qué falta».',
      'Fuera de Claude Code, un prompt inicial le indica qué leer y qué no formalizar.',
    ]],
    ['3 · Prompts reutilizables', 'Skills del proyecto', [
      'Un procedimiento que se repite se escribe una vez como skill, versionada en el repositorio.',
      'Ejemplo: gestionar-skills, para incorporar una skill nueva con su origen, versión y licencia.',
      'Mismo pedido, mismo resultado, para cualquier integrante.',
    ]],
  ];
  cols.forEach(([t, sub, items], i) => {
    const x = M + i * 4.11;
    card(s, x, 1.6, 3.9, 4.3, i === 0 ? C.navy : C.white);
    s.addText(t, { x: x + 0.25, y: 1.8, w: 3.4, h: 0.35, fontFace: F, fontSize: 13, bold: true, color: i === 0 ? C.light : C.mid, margin: 0, isTextBox: true });
    s.addText(sub, { x: x + 0.25, y: 2.15, w: 3.4, h: 0.5, fontFace: i === 1 ? F : 'Courier New', fontSize: i === 1 ? 17 : 18, bold: true, italic: i === 1, color: i === 0 ? C.white : C.navy, margin: 0, isTextBox: true });
    bullets(s, items, x + 0.25, 2.85, 3.4, 3.6, 13.5, i === 0 ? C.white : C.text);
  });
  s.addNotes('El punto de control pide los prompts usados para construir el producto, que se desarrolla guiado con IA. CLAUDE.md completo y la skill van en la carpeta de entrega (08 · Agentes).');
}

// N3 · Mermaid
{
  const s = base('Diagramas como código', { section: '8 · Modelado con Mermaid.js', presenter: 'Francisco' });
  bullets(s, [
    'Los 34 diagramas del proyecto están escritos en Mermaid.js, dentro de la nota que los explica.',
    'Se versionan en Git: cada cambio queda registrado con su autor.',
    'La imagen se genera desde el código, nunca a mano, con mermaid-cli y el motor ELK.',
    'Cubre clases, secuencia, estados y entidad-relación; casos de uso, actividad y C4 con diagramas de flujo.',
  ], M, 1.65, 5.6, 4.6, 15);
  card(s, 6.3, 1.6, 6.43, 1.85, C.navy);
  s.addText([
    'flowchart LR',
    '  Push(["Cambio en el código"]) --> Lint["Estilo y análisis estático"]',
    '  Lint --> Tipos["Chequeo de tipos"]',
    '  Tipos --> Tests["Pruebas automáticas"]',
    '  Tests --> Seg["Seguridad: dependencias,<br/>código y secretos"]',
    '  Seg --> Deploy(["Despliegue en el servidor<br/>solo desde la rama principal"])',
  ].join('\n'), { x: 6.5, y: 1.8, w: 6.1, h: 2.2, fontFace: 'Courier New', fontSize: 10.5, color: C.white, margin: 0, valign: 'top', isTextBox: true });
  fitImage(s, IMG('05-Diseño/img/DES-pipeline-calidad.png'), 6.3, 3.7, 6.43, 1.6);
  s.addText('Este es el código completo del diagrama del pipeline de calidad, y la imagen que se genera a partir de él.', { x: 6.3, y: 5.45, w: 6.43, h: 0.5, fontFace: F, fontSize: 11, italic: true, color: C.muted, margin: 0, isTextBox: true });
  s.addNotes('Mermaid permite que los diagramas vivan junto al análisis y se mantengan al día: si cambia el modelo, se cambia el código y se regenera la imagen.');
}

// 13 · Modelo de desarrollo
{
  const s = base('Modelo de desarrollo: iterativo e incremental', { section: 'Anexo · Modelo de desarrollo', presenter: 'Paloma' });
  fitImage(s, IMG('05-Diseño/img/DES-iteraciones.png'), M, 1.5, 12.13, 2.9);
  const pr = [['Una sola fuente de verdad', 'Todo en un repositorio Git, en Markdown y Mermaid.'], ['Borrador → revisión → formalizado', 'Nada se formaliza sin la aprobación de los tres.'], ['Decisiones registradas', '13 decisiones con alternativas y justificación.'], ['Sync y frentes', 'Sync semanal; cada uno lleva un frente y el resto revisa.']];
  pr.forEach(([t, d], i) => {
    const x = M + i * 3.07;
    card(s, x, 4.65, 2.9, 1.95);
    s.addText(t, { x: x + 0.2, y: 4.8, w: 2.5, h: 0.7, fontFace: F, fontSize: 15, bold: true, color: C.navy, margin: 0, valign: 'top', isTextBox: true });
    s.addText(d, { x: x + 0.2, y: 5.5, w: 2.5, h: 1.0, fontFace: F, fontSize: 12, color: C.muted, margin: 0, valign: 'top', isTextBox: true });
  });
  s.addNotes('Una iteración por punto de control: PC1 análisis y diseño (02/10), PC2 código (20/11), PC3 pruebas y documentación (04/12). Cada cierre deja un tag en Git.');
}

// 14 · Calidad
{
  const s = base('Git y control de calidad', { section: 'Anexo · Modelo de desarrollo', presenter: 'Paloma' });
  fitImage(s, IMG('05-Diseño/img/DES-pipeline-calidad.png'), M, 1.55, 12.13, 1.6);
  card(s, M, 3.5, 5.8, 3.2);
  s.addText('Git y trazabilidad', { x: M + 0.3, y: 3.7, w: 5.2, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: C.navy, margin: 0, isTextBox: true });
  bullets(s, ['Documentación: commits chicos sobre la rama principal', 'Código (desde PC2): una rama por funcionalidad y pull request revisado', 'Cada commit cita la regla o decisión que implementa', 'Cada integrante con su propia identidad de Git'], M + 0.3, 4.2, 5.2, 2.4, 14);
  const hdr = ['Parte', 'Estilo y tipos', 'Pruebas'].map(h => ({ text: h, options: { bold: true, color: C.white, fill: { color: C.mid } } }));
  const rows = [['Backend', 'ruff, mypy', 'pytest'], ['Web', 'ESLint, TypeScript', 'Vitest, Playwright'], ['Mobile', 'ESLint, TypeScript', 'Jest, Maestro']];
  s.addTable([hdr, ...rows.map(r => r.map((c, i) => ({ text: c, options: { bold: i === 0 } })))], { x: 6.7, y: 3.5, w: 6.03, colW: [1.4, 2.3, 2.33], fontFace: F, fontSize: 14, border: { type: 'solid', color: 'E3E8ED', pt: 0.75 }, rowH: 0.5, fill: { color: C.white } });
  s.addText('Seguridad: pip-audit, pnpm audit, bandit, Semgrep y gitleaks. Dependabot propone las actualizaciones.', { x: 6.7, y: 5.75, w: 6.03, h: 0.8, fontFace: F, fontSize: 13, color: C.text, margin: 0, isTextBox: true });
}

// 24 · Cierre
{
  const s = base('Resumen del PC1', { section: 'Cierre', dark: true });
  const st = [['31', 'casos de uso'], ['155', 'requisitos funcionales'], ['13', 'entidades'], ['13', 'decisiones registradas'], ['59', 'pantallas prototipadas'], ['96', 'operaciones de API']];
  st.forEach(([v, l], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    stat(s, M + col * 4.1, 1.8 + row * 1.7, 3.8, v, l, C.white, C.light);
  });
  card(s, M, 5.35, 12.13, 1.3, C.primary);
  rich(s, [['Próximo: PC2 · 20/11/26 — ', 1], ['código funcional de los módulos núcleo, sobre este diseño, en ramas y pull requests.', 0]], M + 0.35, 5.65, 11.5, 0.8, 18, C.white);
  s.addNotes('Cierre y preguntas.');
}

pres.writeFile({ fileName: OUT }).then(f => console.log('OK ' + f));
