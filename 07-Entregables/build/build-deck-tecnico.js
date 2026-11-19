// Genera el deck del video técnico (stack, arquitectura del backend y modelo de datos).
// Uso, desde la raíz del repo: npm install --no-save pptxgenjs && node "07-Entregables/build/build-deck-tecnico.js"
// Guion: 07-Entregables/Video IA/Guion — parte técnica de Rumbo.md. Mismo estilo que el deck del PC1 (build-deck.js).
// Los diagramas grandes (monorepo, capas, módulos, ER y estados) se redibujan simplificados con formas
// nativas, porque los PNG completos no se leen a escala de diapositiva. Si cambian las notas fuente
// (ARQ — Vista general, DGM-ER, EST-Oportunidad o rumbo.sql), actualizar también este script.
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, '07-Entregables/Video IA/Rumbo — parte técnica (presentación).pptx');
const IMG = p => path.join(ROOT, p);

// Paleta del equipo (misma del prototipo y del deck del PC1)
const C = {
  navy: '17354C', primary: '22506F', mid: '3E7196', light: '73A5C4', pale: 'E9F1F7',
  gray: 'D9D9D9', bg: 'F6F8FA', text: '1F2A33', muted: '5B6B78', white: 'FFFFFF',
  green: '2E7D4F', greenBg: 'E3F2E8', red: 'B03A2E', redBg: 'FBE7E5', line: '8FA3B3',
};
const F = 'Calibri';
const MONO = 'Courier New';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pres.title = 'Rumbo — parte técnica';
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
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: i < items.length - 1 } })),
    { x, y, w, h, fontFace: F, fontSize: size, color, valign: 'top', paraSpaceAfter: 8, margin: 0, isTextBox: true });
}
function rich(s, runs, x, y, w, h, size = 15, color = C.text, opts = {}) {
  s.addText(runs.map(([t, b]) => ({ text: t, options: { bold: !!b } })), { x, y, w, h, fontFace: F, fontSize: size, color, valign: 'top', margin: 0, isTextBox: true, ...opts });
}
function numCircle(s, x, y, num, d = 0.55, fill = C.primary) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: 'none' } });
  s.addText(String(num), { x, y, w: d, h: d, fontFace: F, fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
}
function stat(s, x, y, w, value, label, color = C.primary, lcolor = C.muted) {
  s.addText(value, { x, y, w, h: 0.8, fontFace: F, fontSize: 40, bold: true, color, margin: 0, isTextBox: true });
  s.addText(label, { x, y: y + 0.8, w, h: 0.5, fontFace: F, fontSize: 13, color: lcolor, margin: 0, valign: 'top', isTextBox: true });
}
function code(s, text, x, y, w, h, size = 13) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: C.navy }, line: { type: 'none' }, rectRadius: 0.1 });
  s.addText(text, { x: x + 0.25, y: y + 0.2, w: w - 0.5, h: h - 0.4, fontFace: MONO, fontSize: size, color: C.white, valign: 'top', margin: 0, isTextBox: true });
}
// Caja de diagrama: título en negrita y una línea chica debajo
function box(s, x, y, w, h, title, sub, { fill = C.white, border = C.light, color = C.navy, subColor = C.muted, mono = false, size = 16 } = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: border, width: 1.25 }, rectRadius: 0.1 });
  const runs = [{ text: title, options: { bold: true, fontSize: size, color, fontFace: mono ? MONO : F, breakLine: !!sub } }];
  if (sub) runs.push({ text: sub, options: { fontSize: 12, color: subColor, fontFace: F } });
  s.addText(runs, { x: x + 0.1, y, w: w - 0.2, h, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
}
// Flecha recta. back: punta en el origen (para flechas hacia la izquierda o hacia arriba)
function arrow(s, x1, y1, x2, y2, { color = C.line, back = false, none = false, dash } = {}) {
  const ln = { color, width: 1.75 };
  if (dash) ln.dashType = dash;
  if (!none) ln[back ? 'beginArrowType' : 'endArrowType'] = 'triangle';
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipH: x2 < x1, flipV: y2 < y1, line: ln });
}
function label(s, text, x, y, w, { color = C.muted, size = 12, align = 'center', bold = false } = {}) {
  s.addText(text, { x, y, w, h: 0.3, fontFace: F, fontSize: size, color, align, bold, margin: 0, valign: 'middle', isTextBox: true });
}

// 1 · Portada
{
  const s = base(null, { dark: true });
  s.addImage({ path: IMG('_adjuntos/Marca/rumbo-icono-redondeado-1024.png'), x: M, y: 1.15, w: 1.0, h: 1.0 });
  s.addText('Rumbo', { x: M, y: 2.35, w: 9, h: 1.2, fontFace: F, fontSize: 66, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText('Cómo está construido por dentro', { x: M, y: 3.5, w: 10, h: 0.6, fontFace: F, fontSize: 26, color: C.light, margin: 0, isTextBox: true });
  s.addText('Stack tecnológico · arquitectura del backend · modelo de datos · demo', { x: M, y: 4.3, w: 11, h: 0.45, fontFace: F, fontSize: 18, color: C.white, margin: 0, isTextBox: true });
  s.addText('Francisco Luciano · Nahuel Viniegra · Paloma Patiño', { x: M, y: 5.55, w: 10, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText('Universidad de Morón · Ingeniería Informática · Trabajo de Campo', { x: M, y: 5.95, w: 11, h: 0.4, fontFace: F, fontSize: 14, color: C.light, margin: 0, isTextBox: true });
  s.addNotes('En este video mostramos cómo está construido Rumbo por dentro: con qué tecnologías, cómo se organiza el backend y el modelo de datos y, al final, creamos un cliente y una consulta en la web y los seguimos hasta la base de datos.');
}

// 2 · Agenda
{
  const s = base('Qué vamos a mostrar', { section: 'Agenda' });
  const items = [
    ['Stack tecnológico', 'Clientes, contrato compartido, API, datos y calidad', 'Nahuel'],
    ['Arquitectura del backend', 'Tres capas más core, y sus módulos', 'Francisco'],
    ['Modelo de datos y estados', 'Entidades principales, estados y migraciones', 'Paloma'],
    ['Demo en vivo', 'Crear un cliente y una consulta y verlos en PostgreSQL', 'Paloma'],
  ];
  items.forEach(([t, d, p], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.1, y = 1.8 + row * 1.75;
    card(s, x, y, 5.9, 1.4);
    numCircle(s, x + 0.28, y + 0.42, i + 1);
    s.addText(t, { x: x + 1.05, y: y + 0.2, w: 4.7, h: 0.42, fontFace: F, fontSize: 19, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 1.05, y: y + 0.62, w: 4.7, h: 0.32, fontFace: F, fontSize: 13, color: C.muted, margin: 0, isTextBox: true });
    s.addText(p, { x: x + 1.05, y: y + 0.95, w: 4.7, h: 0.3, fontFace: F, fontSize: 12, bold: true, color: C.mid, margin: 0, isTextBox: true });
  });
  s.addNotes('Hilo conductor: seguir un dato de punta a punta, desde un clic en la web, pasando por la API y sus tres capas, hasta una fila en PostgreSQL.');
}

// 3 · Stack
const SEC1 = '1 · Stack tecnológico';
{
  const s = base('Cliente-servidor: dos clientes, una API', { section: SEC1, presenter: 'Nahuel' });
  const cols = [
    ['Web', 'React 19 · TypeScript · Vite', 'Back-office completo de la agencia', C.white],
    ['Mobile', 'React Native · Expo', 'Agenda, alertas y clientes; .apk interno', C.white],
    ['Paquete compartido', 'openapi-typescript · zod · Axios · TanStack Query', 'Tipos generados desde el contrato de la API', C.pale],
    ['API', 'Python · FastAPI', 'Única dueña de las reglas del negocio', C.white],
    ['Datos', 'PostgreSQL · SQLAlchemy 2 async · Alembic', 'Integridad con claves y restricciones', C.white],
    ['Servicios externos', 'Firebase Auth · LangChain', 'Login; borradores de contenido con IA', C.pale],
  ];
  cols.forEach(([t, tech, d, fill], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * 4.1, y = 1.65 + row * 2.2;
    card(s, x, y, 3.9, 1.95, fill);
    s.addText(t, { x: x + 0.25, y: y + 0.2, w: 3.4, h: 0.42, fontFace: F, fontSize: 19, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(tech, { x: x + 0.25, y: y + 0.66, w: 3.4, h: 0.6, fontFace: F, fontSize: 14, bold: true, color: C.mid, margin: 0, valign: 'top', isTextBox: true });
    s.addText(d, { x: x + 0.25, y: y + 1.28, w: 3.4, h: 0.55, fontFace: F, fontSize: 13, color: C.text, margin: 0, valign: 'top', isTextBox: true });
  });
  rich(s, [['Si cambia la API, el front deja de compilar', 1], [' en lugar de fallar en producción: los tipos salen del OpenAPI que genera FastAPI.', 0]], M, 6.2, 12.1, 0.6, 14, C.primary);
  s.addNotes('Dos clientes que hablan en JSON con una única API. La web es el back-office completo; la mobile, el acceso rápido. Comparten un paquete con los tipos generados del contrato OpenAPI, las validaciones con zod y el acceso a la API. Firebase resuelve la autenticación, pero los roles y permisos viven en Rumbo (DEC-0016). La IA del producto genera borradores de contenido para redes (DEC-0012).');
}

// 4 · Monorepo (redibujado de ARQ — Vista general, vista de componentes)
{
  const s = base('Un monorepo, un contrato', { section: SEC1, presenter: 'Nahuel' });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y: 1.55, w: W - 2 * M, h: 3.85, fill: { color: C.white }, line: { color: 'D5DDE4', width: 1, dashType: 'dash' }, rectRadius: 0.12 });
  label(s, 'src/  ·  el mismo repositorio que la documentación', M + 0.25, 1.68, 6, { align: 'left', color: C.mid, bold: true });
  box(s, 1.0, 2.25, 2.6, 1.1, 'apps/web', 'React + Vite', { mono: true });
  box(s, 1.0, 3.95, 2.6, 1.1, 'apps/mobile', 'React Native + Expo', { mono: true });
  box(s, 4.5, 2.25, 2.9, 2.8, 'packages/shared', 'tipos · zod · Axios · hooks', { mono: true, fill: C.pale });
  arrow(s, 3.6, 2.8, 4.5, 2.8);
  arrow(s, 3.6, 4.5, 4.5, 4.5);
  box(s, 8.3, 3.0, 1.75, 1.3, 'openapi.json', 'contrato', { mono: true, size: 14, fill: C.bg });
  arrow(s, 7.4, 3.65, 8.3, 3.65, { back: true });
  label(s, 'tipos', 7.4, 3.3, 0.9, { size: 11 });
  box(s, 10.85, 2.75, 1.6, 1.8, 'backend', 'FastAPI · uv', { mono: true, fill: C.navy, border: C.navy, color: C.white, subColor: C.pale });
  arrow(s, 10.05, 3.65, 10.85, 3.65, { back: true });
  label(s, 'exporta', 10.05, 3.3, 0.8, { size: 11 });
  const pts = [
    ['pnpm workspaces', 'para web, mobile y shared; uv para el backend'],
    ['Un solo contrato', 'si el backend cambia un endpoint, se regeneran los tipos y el front avisa al compilar'],
    ['Web y mobile', 'reusan los mismos hooks para hablar con la API'],
  ];
  pts.forEach(([t, d], i) => {
    const x = M + i * 4.1;
    rich(s, [[t + ': ', 1], [d, 0]], x, 5.7, 3.85, 1.0, 14, C.text);
  });
  s.addNotes('Simplificación del diagrama de componentes del monorepo de ARQ — Vista general. El comando que genera los tipos es pnpm --filter @rumbo/shared generar, desde el openapi.json que exporta el backend.');
}

// 5 · Calidad
{
  const s = base('Calidad y seguridad en cada pull request', { section: SEC1, presenter: 'Nahuel' });
  const rows = [
    ['Backend', 'ruff · mypy', 'pytest · pytest-asyncio · httpx · cobertura'],
    ['Web', 'ESLint · Prettier · tsc', 'Vitest · Testing Library · Playwright (e2e)'],
    ['Mobile', 'ESLint · Prettier · tsc', 'Jest · Testing Library · prueba manual guiada'],
  ];
  const hdr = ['Área', 'Calidad estática', 'Pruebas'].map(t => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.primary } } }));
  s.addTable([hdr, ...rows.map(r => r.map((t, j) => ({ text: t, options: { bold: j === 0, color: j === 0 ? C.navy : C.text } })))], {
    x: M, y: 1.65, w: 7.6, colW: [1.4, 2.6, 3.6], fontFace: F, fontSize: 14, rowH: 0.62, valign: 'middle',
    border: { type: 'solid', color: 'E3E8ED', pt: 0.75 }, fill: { color: C.white },
  });
  card(s, 8.6, 1.65, 4.13, 3.2, C.pale);
  s.addText('Seguridad en el CI', { x: 8.85, y: 1.85, w: 3.7, h: 0.4, fontFace: F, fontSize: 18, bold: true, color: C.navy, margin: 0, isTextBox: true });
  bullets(s, ['pip-audit y pnpm audit: dependencias', 'bandit: Python', 'Semgrep: reglas OWASP', 'gitleaks: secretos', 'Dependabot y auditoría semanal'], 8.85, 2.4, 3.7, 2.3, 14);
  rich(s, [['GitHub Actions', 1], [' corre lint → tipos → tests → seguridad en cada PR, con jobs filtrados por carpeta. Si algo falla, el PR no se mergea.', 0]], M, 4.45, 7.6, 1.2, 14, C.text);
  s.addNotes('Cada parte tiene su linter, su chequeo de tipos y sus tests. La suite completa y la cobertura corren en el CI (DEC-0022). En mobile no hay e2e automáticos: la barrera del módulo incluye una prueba manual guiada (DEC-0015).');
}

// 6 · Tres capas (redibujado de ARQ — Vista general, vista lógica: capas)
const SEC2 = '2 · Arquitectura del backend';
{
  const s = base('La API en tres capas, más core', { section: SEC2, presenter: 'Francisco' });
  const X = M, BW = 7.0;
  box(s, X + 1.5, 1.5, BW - 3.0, 0.55, 'Web y mobile', null, { fill: C.bg, size: 14 });
  label(s, 'JSON / HTTPS', X + BW / 2 + 0.1, 2.05, 1.6, { size: 11, align: 'left' });
  arrow(s, X + BW / 2, 2.05, X + BW / 2, 2.35);
  const capas = [
    ['1 · Presentación', 'routers REST · esquemas Pydantic · CLI · jobs', C.white],
    ['2 · Negocio', 'servicios · máquinas de estado · políticas de permisos', C.pale],
    ['3 · Datos', 'modelos SQLAlchemy · repositorios', C.white],
  ];
  capas.forEach(([t, d, fill], i) => {
    const y = 2.35 + i * 1.15;
    box(s, X, y, BW, 0.85, t, d, { fill, border: C.mid });
    arrow(s, X + BW / 2, y + 0.85, X + BW / 2, y + 1.15);
  });
  box(s, X + 2.0, 5.8, BW - 4.0, 0.6, 'PostgreSQL', null, { fill: C.navy, border: C.navy, color: C.white, size: 14 });
  // core, al costado y fuera de las capas
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.1, y: 2.35, w: 4.63, h: 3.15, fill: { color: C.white }, line: { color: C.light, width: 1.25, dashType: 'dash' }, rectRadius: 0.12 });
  s.addText('core', { x: 8.35, y: 2.5, w: 3, h: 0.4, fontFace: MONO, fontSize: 18, bold: true, color: C.navy, margin: 0, isTextBox: true });
  label(s, 'transversal: lo usa cualquier capa', 8.35, 2.9, 4.2, { align: 'left', size: 12 });
  bullets(s, ['config: variables de entorno', 'db: motor y sesión async', 'seguridad: verifica los tokens de Firebase', 'ia: cliente de LangChain'], 8.35, 3.35, 4.2, 2.0, 14);
  arrow(s, X + BW, 3.92, 8.1, 3.92, { dash: 'dash', none: true });
  rich(s, [['Regla: ', 1], ['cada capa usa solo la de abajo. Un router nunca llama a un repositorio, y core no usa ninguna capa.', 0]], 8.1, 5.75, 4.63, 0.9, 13, C.primary);
  s.addNotes('Simplificación de la vista lógica del backend de ARQ — Vista general. Mostrar en el editor las carpetas src/backend/rumbo/presentacion, negocio, datos y core.');
}

// 7 · Módulos (redibujado de ARQ — Vista general, vista lógica: módulos)
{
  const s = base('Un archivo por módulo funcional en cada capa', { section: SEC2, presenter: 'Francisco' });
  const grupos = [
    ['Operación', M, 4.5, C.pale, [['oportunidades', 'CU-04 · 05 · 06 · 30'], ['viajes', 'CU-07 · 08 · 09 · 27'], ['economia', 'CU-10 · 11 · 12'], ['clientes', 'CU-02 · 03'], ['alertas', 'CU-14 · 28']]],
    ['Catálogos y apoyo', M + 4.75, 3.9, C.white, [['hoteles', 'CU-16 · 17 · 18 · 29'], ['configuracion', 'CU-13 · 15 · 26 · 31'], ['seguridad', 'CU-24 · 25'], ['redes', 'CU-19 · 20 · usa core.ia']]],
    ['Consulta y automático', M + 8.9, 3.23, C.white, [['dashboard', 'CU-21 · 22'], ['calendario', 'CU-23'], ['jobs.diario', 'todos los días a las 00:00']]],
  ];
  grupos.forEach(([t, x, w, fill, mods]) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.5, w, h: 4.55, fill: { color: fill }, line: { color: 'D5DDE4', width: 1 }, rectRadius: 0.12 });
    s.addText(t, { x: x + 0.2, y: 1.6, w: w - 0.4, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: C.navy, margin: 0, isTextBox: true });
    mods.forEach(([m, cu], j) => {
      const y = 2.1 + j * 0.78;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.2, y, w: w - 0.4, h: 0.64, fill: { color: C.white }, line: { color: C.light, width: 1 }, rectRadius: 0.08 });
      s.addText(m, { x: x + 0.35, y, w: 2.0, h: 0.64, fontFace: MONO, fontSize: 13, bold: true, color: C.primary, valign: 'middle', margin: 0, isTextBox: true });
      s.addText(cu, { x: x + 2.0, y, w: w - 2.3, h: 0.64, fontFace: F, fontSize: 11, color: C.muted, align: 'right', valign: 'middle', margin: 0, isTextBox: true });
    });
  });
  rich(s, [['Cada módulo = ', 0], ['router + servicio + repositorio', 1], ['. Las dependencias siguen el negocio: viajes usa oportunidades, economía, hoteles y alertas; el proceso diario usa economía, oportunidades y alertas.', 0]], M, 6.25, W - 2 * M - 0.8, 0.8, 14, C.text);
  s.addNotes('Simplificación del diagrama de módulos de ARQ — Vista general: los módulos salen del MOC de casos de uso, y al lado de cada uno están los CU que implementa.');
}

// 8 · Ejemplo: oportunidades
{
  const s = base('Ejemplo: registrar una consulta', { section: SEC2, presenter: 'Francisco' });
  const files = [
    ['Presentación', 'presentacion/routers/oportunidades.py', 'POST /api/oportunidades → valida el JSON con Pydantic y responde 201'],
    ['Negocio', 'negocio/servicios/oportunidades.py', 'registrar_consulta(): el Cliente tiene que existir y ser visible; el responsable es quien la carga'],
    ['Datos', 'datos/repositorios/oportunidades.py', 'Consultas con la visibilidad por fila aplicada'],
  ];
  files.forEach(([capa, f, d], i) => {
    const y = 1.6 + i * 1.35;
    numCircle(s, M, y + 0.27, i + 1);
    s.addText(capa, { x: M + 0.8, y, w: 3, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(f, { x: M + 0.8, y: y + 0.4, w: 6.5, h: 0.35, fontFace: MONO, fontSize: 13, bold: true, color: C.mid, margin: 0, isTextBox: true });
    s.addText(d, { x: M + 0.8, y: y + 0.76, w: 6.6, h: 0.5, fontFace: F, fontSize: 13, color: C.text, margin: 0, valign: 'top', isTextBox: true });
  });
  card(s, 8.3, 1.6, 4.43, 3.35, C.pale);
  s.addText('Transversal a todo', { x: 8.55, y: 1.8, w: 4, h: 0.4, fontFace: F, fontSize: 18, bold: true, color: C.navy, margin: 0, isTextBox: true });
  bullets(s, ['Auditoría: cada fila guarda created_by y updated_by, completados solos', 'Visibilidad por fila: el freelance ve solo sus clientes y oportunidades, y se aplica en las consultas, no en el front', 'Errores en formato problem+json'], 8.55, 2.35, 3.95, 2.5, 14);
  s.addText('src/backend/rumbo/', { x: M, y: 5.85, w: 7, h: 0.4, fontFace: MONO, fontSize: 13, color: C.muted, margin: 0, isTextBox: true });
  s.addNotes('Mostrar los tres archivos lado a lado en el editor. Roles y visibilidad: DEC-0005 y DEC-0008.');
}

// 9 · ER simplificado (de DGM-ER y rumbo.sql)
const SEC3 = '3 · Modelo de datos y estados';
{
  const s = base('Las entidades del circuito de venta', { section: SEC3, presenter: 'Paloma' });
  const BW = 2.5, BH = 1.0;
  const ent = (x, y, t, sub, opts) => box(s, x, y, BW, BH, t, sub, { border: C.mid, ...opts });
  const y1 = 1.75, y2 = 4.05;
  const xs = [M, 4.0, 7.4];
  ent(xs[0], y1, 'Cliente', 'contacto · segmento · etiquetas');
  ent(xs[1], y1, 'Oportunidad', 'canal · destino · estado', { fill: C.pale });
  ent(xs[2], y1, 'Cotización', 'ítems · total · validez · estado');
  ent(xs[0], y2, 'Hotel', 'destino · categoría');
  ent(xs[1], y2, 'Viaje', 'fechas · precio · moneda · estado', { fill: C.pale });
  ent(xs[2], y2, 'Pago', 'monto · vencimiento · estado');
  // relaciones (líneas sin punta, con la cardinalidad encima)
  const rel = (x1, y1_, x2, y2_, txt, lx, ly, lw = 1.0) => { arrow(s, x1, y1_, x2, y2_, { none: true, color: C.mid }); label(s, txt, lx, ly, lw, { color: C.primary, bold: true }); };
  rel(xs[0] + BW, y1 + BH / 2, xs[1], y1 + BH / 2, '1 — N', xs[0] + BW, y1 + 0.12, xs[1] - xs[0] - BW);
  rel(xs[1] + BW, y1 + BH / 2, xs[2], y1 + BH / 2, '1 — N', xs[1] + BW, y1 + 0.12, xs[2] - xs[1] - BW);
  arrow(s, xs[1] + BW / 2, y1 + BH, xs[1] + BW / 2, y2, { none: true, color: C.mid });
  label(s, '1 — 0..1', xs[1] + BW / 2 + 0.12, (y1 + BH + y2) / 2 - 0.3, 1.2, { color: C.primary, bold: true, align: 'left' });
  label(s, 'se deriva al ganarla', xs[1] + BW / 2 + 0.12, (y1 + BH + y2) / 2, 2.0, { size: 11, align: 'left' });
  rel(xs[1] + BW, y2 + BH / 2, xs[2], y2 + BH / 2, '1 — N', xs[1] + BW, y2 + 0.12, xs[2] - xs[1] - BW);
  rel(xs[0] + BW, y2 + BH / 2, xs[1], y2 + BH / 2, 'N — N', xs[0] + BW, y2 + 0.12, xs[1] - xs[0] - BW);
  label(s, 'viaje_hotel', xs[0] + BW, y2 + BH / 2 + 0.08, xs[1] - xs[0] - BW, { size: 10, color: C.muted });
  // columna de apoyo
  card(s, 10.3, 1.75, 2.43, 3.3, C.white);
  s.addText('También', { x: 10.5, y: 1.9, w: 2.1, h: 0.35, fontFace: F, fontSize: 15, bold: true, color: C.navy, margin: 0, isTextBox: true });
  bullets(s, ['Usuario: responsable y autor de cada fila', 'Alerta: apunta a un cliente, oportunidad, viaje o pago', 'Reseña, Destino, Operador, ContenidoRed'], 10.5, 2.35, 2.1, 2.65, 12.5);
  rich(s, [['13 entidades · 15 tablas. ', 1], ['Baja lógica, auditoría de autor e importes en ARS o USD en todo el modelo.', 0]], M, 5.55, 9.4, 0.5, 14, C.text);
  s.addNotes('Simplificación del DGM-ER: solo las entidades del circuito de venta. Un cliente puede tener muchas oportunidades; cada oportunidad, varias cotizaciones alternativas; al ganarla se deriva a lo sumo un viaje (oportunidad_id es UNIQUE en viaje), y el viaje tiene su plan de pagos y sus hoteles. En la demo se ve la relación Cliente → Oportunidad en la base.');
}

// 10 · Estados de la Oportunidad (de EST-Oportunidad)
{
  const s = base('Estados: el ciclo de una Oportunidad', { section: SEC3, presenter: 'Paloma' });
  const y = 2.6, BH = 0.8, BW = 2.0;
  const X1 = M, X2 = 4.0, X3 = 7.4, X4 = W - M - BW;
  const st = (x, yy, t, opts = {}) => box(s, x, yy, BW, BH, t, null, { mono: true, size: 15, border: C.mid, ...opts });
  st(X1, y, 'nueva');
  st(X2, y, 'en_gestion', { fill: C.pale });
  st(X3, y, 'cotizada', { fill: C.pale });
  st(X4, 1.65, 'ganada', { fill: C.greenBg, border: C.green, color: C.green });
  st(X4, 3.55, 'perdida', { fill: C.redBg, border: C.red, color: C.red });
  arrow(s, X1 + BW, y + BH / 2, X2, y + BH / 2);
  label(s, 'T2 · se atiende', X1 + BW, y + 0.05, X2 - X1 - BW, { size: 11 });
  arrow(s, X2 + BW, y + BH / 2, X3, y + BH / 2);
  label(s, 'T3 · se cotiza', X2 + BW, y + 0.05, X3 - X2 - BW, { size: 11 });
  arrow(s, X3 + BW, y + 0.25, X4, 1.65 + BH / 2);
  label(s, 'T4 · compra', X3 + BW - 0.1, 1.75, 1.3, { size: 11, color: C.green, bold: true });
  arrow(s, X3 + BW, y + 0.55, X4, 3.55 + BH / 2);
  label(s, 'T5 · desiste', X3 + BW - 0.1, 3.75, 1.3, { size: 11, color: C.red, bold: true });
  label(s, 'T1 · se registra la consulta', M, y - 0.4, 3.0, { size: 11, align: 'left' });
  const reglas = [
    ['Atajos: ', 'una consulta nueva se puede cotizar directo (T3), y se gana o se pierde desde cualquier estado abierto (T4 y T5).'],
    ['Reactivación: ', 'una oportunidad perdida vuelve a en_gestion (T8).'],
    ['Doble control: ', 'las transiciones las valida la capa de negocio, y la base exige el motivo de una oportunidad perdida.'],
  ];
  reglas.forEach(([t, d], i) => rich(s, [[t, 1], [d, 0]], M + i * 4.1, 4.95, 3.85, 1.4, 14, C.text));
  s.addNotes('Simplificación de EST-Oportunidad. Falta la T7 (insistencia vencida), que deja la oportunidad en el mismo estado. Seis entidades tienen máquina de estados: Oportunidad, Cotización, Viaje, Pago, Alerta y ContenidoRed. En la demo se ve la transición nueva → en_gestion en la base.');
}

// 11 · Migraciones
{
  const s = base('El esquema evoluciona con migraciones', { section: SEC3, presenter: 'Paloma' });
  const steps = [['rumbo.sql', 'Diseño del esquema desde el ER (PC1)'], ['0001_esquema_inicial', 'La primera migración de Alembic lo reproduce'], ['0002 … 0009', 'Cada cambio del modelo es una migración nueva y versionada']];
  steps.forEach(([t, d], i) => {
    const x = M + i * 4.1;
    card(s, x, 1.75, 3.9, 2.0, i === 1 ? C.pale : C.white);
    numCircle(s, x + 0.25, 1.95, i + 1);
    s.addText(t, { x: x + 0.25, y: 2.65, w: 3.5, h: 0.4, fontFace: MONO, fontSize: 15, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.25, y: 3.08, w: 3.5, h: 0.6, fontFace: F, fontSize: 13, color: C.text, margin: 0, valign: 'top', isTextBox: true });
  });
  code(s, '$ uv run alembic upgrade head\n\n0003_cliente_instagram\n0005_cliente_contacto_clave\n0007_oportunidad_destino_pasajeros_opcionales\n0009_pago_anulado_por_cancelacion', M, 4.15, 7.4, 2.1, 13);
  bullets(s, ['Cada migración nace de una decisión o de un ajuste del equipo', 'Un test verifica que la migración deja el esquema esperado', 'La base de tests arranca limpia en cada corrida'], 8.3, 4.25, 4.43, 2.6, 14);
  s.addNotes('Los nombres de las migraciones cuentan la historia del modelo: por ejemplo, la 0003 suma el Instagram del cliente y la 0009 agrega los pagos anulados por la cancelación de un viaje (DEC-0025).');
}

// 12 · Demo en vivo
{
  const s = base('Demo en vivo: del clic a la base', { section: '4 · Demo', presenter: 'Paloma', dark: true });
  const flow = [['Web', 'React'], ['POST /api/…', 'JSON'], ['Router', 'presentación'], ['Servicio', 'negocio'], ['Repositorio', 'datos'], ['PostgreSQL', 'fila nueva']];
  flow.forEach(([t, d], i) => {
    const x = M + i * 2.07;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.6, w: 1.78, h: 1.15, fill: { color: i === 0 || i === 5 ? C.primary : C.mid }, line: { type: 'none' }, rectRadius: 0.12 });
    s.addText(t, { x, y: 2.7, w: 1.78, h: 0.5, fontFace: F, fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(d, { x, y: 3.18, w: 1.78, h: 0.4, fontFace: F, fontSize: 12, color: C.pale, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    if (i < 5) s.addText('→', { x: x + 1.78, y: 2.6, w: 0.29, h: 1.15, fontFace: F, fontSize: 18, color: C.light, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  });
  s.addText('Creamos un Cliente y una consulta en la web y los seguimos hasta la base de datos.', { x: M, y: 4.4, w: 12, h: 0.5, fontFace: F, fontSize: 18, color: C.white, margin: 0, isTextBox: true });
  s.addNotes('El recorrido y las consultas SQL están en el guion (bloque 5). Antes de grabar: entorno local con los datos de demo y DBeaver abierto. No mostrar la contraseña de la base ni src/.env.');
}

// 13 · Cierre
{
  const s = base('En resumen', { section: 'Cierre', presenter: 'Nahuel', dark: true });
  const pts = [
    ['Dos clientes', 'Web y mobile comparten tipos generados desde el contrato de la API'],
    ['Una API en tres capas', 'Única dueña de las reglas, con permisos por fila y auditoría'],
    ['Una base relacional', 'PostgreSQL con restricciones y migraciones versionadas'],
  ];
  pts.forEach(([t, d], i) => {
    const y = 1.85 + i * 1.25;
    numCircle(s, M, y + 0.05, i + 1, 0.55, C.primary);
    s.addText(t, { x: M + 0.85, y, w: 11, h: 0.42, fontFace: F, fontSize: 20, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText(d, { x: M + 0.85, y: y + 0.42, w: 11, h: 0.4, fontFace: F, fontSize: 15, color: C.light, margin: 0, isTextBox: true });
  });
  s.addText('Gracias', { x: M, y: 6.0, w: 6, h: 0.6, fontFace: F, fontSize: 28, bold: true, color: C.white, margin: 0, isTextBox: true });
}

// pptxgenjs deja entradas de carpeta en el ZIP, que fallan al abrir el archivo desde una nube: se sacan.
pres.write({ outputType: 'nodebuffer' })
  .then(buf => require('jszip').loadAsync(buf))
  .then(async zip => {
    // Se copia archivo por archivo a un ZIP nuevo: JSZip.remove() de una carpeta borra también su contenido.
    const JSZip = require('jszip');
    const limpio = new JSZip();
    for (const [k, f] of Object.entries(zip.files)) {
      if (!f.dir) limpio.file(k, await f.async('nodebuffer'), { createFolders: false });
    }
    return limpio.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  })
  .then(buf => { fs.writeFileSync(OUT, buf); console.log('OK  ' + path.relative(ROOT, OUT)); });
