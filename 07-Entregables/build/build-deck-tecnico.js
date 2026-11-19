// Genera el deck del video técnico (stack, arquitectura y demo de la base) desde las imágenes del vault.
// Uso, desde la raíz del repo: npm install --no-save pptxgenjs && node "07-Entregables/build/build-deck-tecnico.js"
// Guion: 07-Entregables/Video IA/Guion — parte técnica de Rumbo.md. Los diagramas son los PNG que generan
// render-diagramas-diseno.sh y render-diagramas-dominio.sh: regenerarlos antes si cambió alguna nota.
// Mismo estilo que el deck del PC1 (build-deck.js).
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, '07-Entregables/Video IA/Rumbo — parte técnica (presentación).pptx');
const IMG = p => path.join(ROOT, p);
const ARQ = n => IMG('05-Diseño/Arquitectura/img/' + n);

// Paleta del equipo (misma del prototipo y del deck del PC1)
const C = {
  navy: '17354C', primary: '22506F', mid: '3E7196', light: '73A5C4', pale: 'E9F1F7',
  gray: 'D9D9D9', bg: 'F6F8FA', text: '1F2A33', muted: '5B6B78', white: 'FFFFFF', amber: 'E8A93A', green: '2E7D4F',
};
const F = 'Calibri';
const MONO = 'Courier New';

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
// Diapositiva de un diagrama a lo ancho, con una línea de lectura abajo
function diagram(title, section, presenter, file, caption, notes) {
  const s = base(title, { section, presenter });
  const capH = caption ? 0.75 : 0;
  fitImage(s, file, M, 1.5, W - 2 * M, H - 1.5 - 0.6 - capH);
  if (caption) rich(s, caption, M, H - 0.55 - capH, W - 2 * M - 0.8, capH, 14, C.text);
  if (notes) s.addNotes(notes);
  return s;
}
function code(s, text, x, y, w, h, size = 13) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: C.navy }, line: { type: 'none' }, rectRadius: 0.1 });
  s.addText(text, { x: x + 0.25, y: y + 0.2, w: w - 0.5, h: h - 0.4, fontFace: MONO, fontSize: size, color: C.white, valign: 'top', margin: 0, isTextBox: true });
}

// 1 · Portada
{
  const s = base(null, { dark: true });
  s.addImage({ path: IMG('_adjuntos/Marca/rumbo-icono-redondeado-1024.png'), x: M, y: 1.15, w: 1.0, h: 1.0 });
  s.addText('Rumbo', { x: M, y: 2.35, w: 9, h: 1.2, fontFace: F, fontSize: 66, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText('Cómo está construido por dentro', { x: M, y: 3.5, w: 10, h: 0.6, fontFace: F, fontSize: 26, color: C.light, margin: 0, isTextBox: true });
  s.addText('Stack tecnológico · arquitectura · del clic a la base de datos', { x: M, y: 4.3, w: 10, h: 0.45, fontFace: F, fontSize: 18, color: C.white, margin: 0, isTextBox: true });
  s.addText('Francisco Luciano · Nahuel Viniegra · Paloma Patiño', { x: M, y: 5.55, w: 10, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText('Universidad de Morón · Ingeniería Informática · Trabajo de Campo', { x: M, y: 5.95, w: 11, h: 0.4, fontFace: F, fontSize: 14, color: C.light, margin: 0, isTextBox: true });
  s.addNotes('En este video mostramos cómo está construido Rumbo por dentro: con qué tecnologías, cómo se organiza la arquitectura y, al final, creamos un cliente y una consulta en la web y los seguimos hasta la base de datos.');
}

// 2 · Agenda
{
  const s = base('Qué vamos a mostrar', { section: 'Agenda' });
  const items = [
    ['Stack tecnológico', 'Clientes, contrato compartido, API, datos y calidad', 'Nahuel'],
    ['Despliegue', 'Servidor en la agencia, Cloudflare Tunnel y C4', 'Nahuel'],
    ['Arquitectura del backend', 'Tres capas más core, y sus módulos', 'Francisco'],
    ['Modelo de datos y estados', 'Entidad-relación, estados y migraciones', 'Paloma'],
    ['Demo: del clic a la base', 'Crear un cliente y una consulta y verlos en PostgreSQL', 'Paloma'],
    ['Cierre', 'Resumen de la arquitectura', 'Nahuel'],
  ];
  items.forEach(([t, d, p], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.1, y = 1.7 + row * 1.6;
    card(s, x, y, 5.9, 1.3);
    numCircle(s, x + 0.28, y + 0.37, i + 1);
    s.addText(t, { x: x + 1.05, y: y + 0.17, w: 4.7, h: 0.4, fontFace: F, fontSize: 18, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 1.05, y: y + 0.56, w: 4.7, h: 0.32, fontFace: F, fontSize: 13, color: C.muted, margin: 0, isTextBox: true });
    s.addText(p, { x: x + 1.05, y: y + 0.88, w: 4.7, h: 0.3, fontFace: F, fontSize: 12, bold: true, color: C.mid, margin: 0, isTextBox: true });
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

// 4 · Monorepo
diagram('Un monorepo dentro del vault', SEC1, 'Nahuel', ARQ('ARQ-monorepo.png'),
  [['src/apps/web', 1], [' · ', 0], ['src/apps/mobile', 1], [' · ', 0], ['src/packages/shared', 1], [' (pnpm workspaces)  ·  ', 0], ['src/backend', 1], [' (uv). El código vive en el mismo repositorio que la documentación.', 0]],
  'Web y mobile dependen del paquete compartido, y este se genera desde el contrato de la API. El backend tiene su propio entorno con uv.');

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
  rich(s, [['GitHub Actions', 1], [' corre lint → tipos → tests → seguridad en cada PR, con jobs filtrados por carpeta. El despliegue al servidor está previsto solo si el pipeline pasa en ', 0], ['main', 1], ['.', 0]], M, 4.45, 7.6, 1.2, 14, C.text);
  s.addNotes('Cada parte tiene su linter, su chequeo de tipos y sus tests. La suite completa y la cobertura corren en el CI (DEC-0022). En mobile no hay e2e automáticos: la barrera del módulo incluye una prueba manual guiada (DEC-0015).');
}

// 6 · Despliegue
const SEC2 = '2 · Despliegue';
{
  const s = base('Un servidor dentro de la agencia', { section: SEC2, presenter: 'Nahuel' });
  fitImage(s, ARQ('ARQ-despliegue.png'), M, 1.45, W - 2 * M, 3.6);
  bullets(s, ['Ubuntu Server LTS + Docker Compose + UPS', 'Contenedores: API, PostgreSQL, nginx, scheduler y cloudflared'], M, 5.35, 5.9, 1.4, 14);
  bullets(s, ['Todos entran por Cloudflare Tunnel: el router no expone puertos', 'Proceso diario a las 00:00: vence pagos y cotizaciones y genera alertas'], 6.83, 5.35, 5.9, 1.4, 14);
  s.addNotes('Según lo que necesita la agencia, el sistema corre en un servidor propio, no en la nube (DEC-0011). La conexión del túnel sale desde el servidor hacia Cloudflare. El proceso diario usa los mismos servicios que la API.');
}

// 7 · C4 contexto
diagram('C4 · Nivel 1: contexto', SEC2, 'Nahuel', ARQ('ARQ-C4-1-contexto.png'),
  [['Actores: ', 1], ['dueña, empleados, vendedores freelance y administrador. ', 0], ['Sistemas externos: ', 1], ['Firebase para la autenticación y el proveedor de IA.', 0]],
  'El freelance ve solo lo suyo; la dueña ve toda la empresa. Rumbo no se integra con mayoristas ni publica en redes: queda fuera del alcance.');

// 8 · C4 contenedores
diagram('C4 · Nivel 2: contenedores', SEC2, 'Nahuel', ARQ('ARQ-C4-2-contenedores.png'),
  [['Web y mobile', 1], [' hablan JSON con la ', 0], ['API', 1], ['; la API y el ', 0], ['proceso diario', 1], [' comparten los mismos servicios y la misma ', 0], ['base', 1], ['.', 0]],
  null);

// 9 · Tres capas
const SEC3 = '3 · Arquitectura del backend';
{
  const s = base('La API en tres capas, más core', { section: SEC3, presenter: 'Francisco' });
  fitImage(s, ARQ('ARQ-logica-capas.png'), M, 1.4, W - 2 * M, 3.85);
  const capas = [
    ['Presentación', 'Routers HTTP, esquemas Pydantic, CLI y jobs. Valida el formato.'],
    ['Negocio', 'Servicios, estados y políticas. Aplica las reglas.'],
    ['Datos', 'Modelos SQLAlchemy y repositorios. Habla con la base.'],
    ['core', 'Configuración, base, seguridad e IA. Técnico y transversal.'],
  ];
  capas.forEach(([t, d], i) => {
    const x = M + i * 3.08;
    card(s, x, 5.35, 2.9, 1.25, i === 3 ? C.pale : C.white);
    s.addText(t, { x: x + 0.2, y: 5.45, w: 2.5, h: 0.36, fontFace: i === 3 ? MONO : F, fontSize: 16, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.2, y: 5.82, w: 2.55, h: 0.72, fontFace: F, fontSize: 12, color: C.text, margin: 0, valign: 'top', isTextBox: true });
  });
  s.addText('Cada capa usa solo la de abajo: un router nunca llama a un repositorio.', { x: M, y: 6.75, w: 10, h: 0.35, fontFace: F, fontSize: 13, italic: true, color: C.primary, margin: 0, isTextBox: true });
  s.addNotes('core no usa ninguna capa y cualquier capa puede usar core. El criterio para que algo entre ahí es que sea técnico, transversal y sin reglas del negocio.');
}

// 10 · Módulos
diagram('Un archivo por módulo funcional en cada capa', SEC3, 'Francisco', ARQ('ARQ-logica-modulos.png'),
  [['Las dependencias entre servicios', 1], [' siguen el circuito del negocio: clientes → oportunidades → viajes → pagos → alertas.', 0]],
  'Cada módulo funcional del MOC de casos de uso tiene su router, su servicio y su repositorio.');

// 11 · C4 componentes
diagram('C4 · Nivel 3: componentes de la API', SEC3, 'Francisco', ARQ('ARQ-C4-3-componentes.png'), null, null);

// 12 · Ejemplo: oportunidades
{
  const s = base('Ejemplo: registrar una consulta', { section: SEC3, presenter: 'Francisco' });
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
  bullets(s, ['Auditoría: cada fila guarda created_by y updated_by, completados solos', 'Visibilidad por fila: el freelance ve solo sus clientes y oportunidades, y se aplica en las consultas, no en el front', 'Errores en formato problem+json'], 8.55, 2.35, 3.95, 3.2, 14);
  s.addText('src/backend/rumbo/', { x: M, y: 5.85, w: 7, h: 0.4, fontFace: MONO, fontSize: 13, color: C.muted, margin: 0, isTextBox: true });
  s.addNotes('Mostrar los tres archivos lado a lado en el editor. Roles y visibilidad: DEC-0005 y DEC-0008.');
}

// 13 · ER
const SEC4 = '4 · Modelo de datos y estados';
{
  const s = base('Modelo entidad-relación', { section: SEC4, presenter: 'Paloma' });
  fitImage(s, IMG('03-Dominio/Diagramas/DER/DGM-ER.png'), 4.1, 1.35, 8.63, 5.75);
  stat(s, M, 1.7, 3.2, '13', 'entidades del dominio');
  stat(s, M, 3.2, 3.2, '15', 'tablas en PostgreSQL');
  rich(s, [['Centro del circuito: ', 1], ['Cliente → Oportunidad → Cotización → Viaje → Pago', 0]], M, 4.75, 3.2, 1.2, 14, C.text);
  s.addText('Baja lógica · auditoría de autor · importes en ARS y USD', { x: M, y: 6.0, w: 3.3, h: 0.8, fontFace: F, fontSize: 12, italic: true, color: C.primary, margin: 0, isTextBox: true });
  s.addNotes('Un cliente puede tener muchas oportunidades; una oportunidad ganada se convierte en un viaje, y el viaje tiene su plan de pagos. Las tablas extra son configuracion y viaje_hotel. El diagrama completo no se lee a esta escala: para explicarlo, abrir DGM-ER en Obsidian y hacer zoom en Cliente, Oportunidad, Viaje y Pago.');
}

// 14 · Estados
{
  const s = base('Estados: el ciclo de una Oportunidad', { section: SEC4, presenter: 'Paloma' });
  fitImage(s, IMG('03-Dominio/Diagramas/Estados/img/EST-Oportunidad.png'), 4.9, 1.45, 7.83, 5.5);
  const est = [['nueva', C.light], ['en_gestion', C.mid], ['cotizada', C.primary], ['ganada / perdida', C.navy]];
  est.forEach(([e, col], i) => {
    const y = 1.7 + i * 0.85;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: M, y, w: 3.4, h: 0.6, fill: { color: col }, line: { type: 'none' }, rectRadius: 0.3 });
    s.addText(e, { x: M, y, w: 3.4, h: 0.6, fontFace: MONO, fontSize: 15, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  });
  bullets(s, ['Las transiciones las controla la capa de negocio', 'La base suma restricciones: una oportunidad perdida exige motivo'], M, 5.3, 4.0, 1.6, 13.5);
  s.addNotes('Seis entidades tienen máquina de estados: Oportunidad, Cotización, Viaje, Pago, Alerta y ContenidoRed. En la demo vamos a ver la transición nueva → en_gestion en la base.');
}

// 15 · Migraciones
{
  const s = base('El esquema evoluciona con migraciones', { section: SEC4, presenter: 'Paloma' });
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

// 16 · Demo: recorrido
const SEC5 = '5 · Demo: del clic a la base';
{
  const s = base('Seguimos un dato de punta a punta', { section: SEC5, presenter: 'Paloma', dark: true });
  const flow = [['Web', 'React'], ['POST /api/…', 'JSON'], ['Router', 'presentación'], ['Servicio', 'negocio'], ['Repositorio', 'datos'], ['PostgreSQL', 'fila nueva']];
  flow.forEach(([t, d], i) => {
    const x = M + i * 2.07;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.75, w: 1.78, h: 1.15, fill: { color: i === 0 || i === 5 ? C.primary : C.mid }, line: { type: 'none' }, rectRadius: 0.12 });
    s.addText(t, { x, y: 1.85, w: 1.78, h: 0.5, fontFace: F, fontSize: 16, bold: true, color: C.white, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    s.addText(d, { x, y: 2.33, w: 1.78, h: 0.4, fontFace: F, fontSize: 12, color: C.pale, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
    if (i < 5) s.addText('→', { x: x + 1.78, y: 1.75, w: 0.29, h: 1.15, fontFace: F, fontSize: 18, color: C.light, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
  });
  const st = [
    'Crear un Cliente en la web y ver el POST /api/clientes en las DevTools',
    'Ver la fila nueva en la tabla cliente, con created_by y created_at',
    'Registrar una consulta: fila en oportunidad unida a cliente y usuario',
    'Pasarla a «En gestión»: cambian estado, updated_by y updated_at',
  ];
  st.forEach((t, i) => {
    const y = 3.5 + i * 0.78;
    numCircle(s, M, y, i + 1, 0.5, C.primary);
    s.addText(t, { x: M + 0.75, y: y - 0.03, w: 11.3, h: 0.56, fontFace: F, fontSize: 17, color: C.white, margin: 0, valign: 'middle', isTextBox: true });
  });
  s.addNotes('Antes de grabar: entorno local con los datos de demo (datos-iniciales --demo), la web en una mitad de la pantalla y DBeaver en la otra. No mostrar la contraseña de la base ni src/.env.');
}

// 17 · Consultas SQL
{
  const s = base('Lo que vamos a mirar en la base', { section: SEC5, presenter: 'Paloma' });
  s.addText('El cliente recién creado', { x: M, y: 1.55, w: 6, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: C.navy, margin: 0, isTextBox: true });
  code(s, 'SELECT id, nombre, segmento,\n       created_by, created_at\nFROM cliente\nORDER BY created_at DESC\nLIMIT 1;', M, 2.0, 5.2, 2.3, 14);
  s.addText('La consulta, con su cliente y su responsable', { x: 6.2, y: 1.55, w: 6.5, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: C.navy, margin: 0, isTextBox: true });
  code(s, 'SELECT o.id, c.nombre AS cliente,\n       u.nombre AS responsable,\n       o.destino_consultado, o.pasajeros,\n       o.estado, o.updated_at\nFROM oportunidad o\nJOIN cliente c ON c.id = o.cliente_id\nJOIN usuario u ON u.id = o.responsable_id\nORDER BY o.created_at DESC\nLIMIT 1;', 6.2, 2.0, 6.53, 3.6, 14);
  rich(s, [['Se repite la segunda consulta', 1], [' después de pasar a «En gestión»: ', 0], ['estado', 1], [' pasa de ', 0], ['nueva', 1], [' a ', 0], ['en_gestion', 1], [', la misma transición del diagrama de estados.', 0]], M, 4.6, 5.2, 1.6, 14, C.text);
  s.addNotes('Las claves foráneas cliente_id y responsable_id son las relaciones del ER. created_by y updated_by los completa el backend solo, con el usuario de la sesión.');
}

// 18 · Cierre
{
  const s = base('En resumen', { section: 'Cierre', presenter: 'Nahuel', dark: true });
  const pts = [
    ['Dos clientes', 'Web y mobile comparten tipos generados desde el contrato de la API'],
    ['Una API en tres capas', 'Única dueña de las reglas, con permisos por fila y auditoría'],
    ['Una base relacional', 'PostgreSQL con restricciones y migraciones versionadas'],
    ['Un servidor en la agencia', 'Docker Compose, Cloudflare Tunnel y proceso diario'],
  ];
  pts.forEach(([t, d], i) => {
    const y = 1.75 + i * 1.1;
    numCircle(s, M, y + 0.05, i + 1, 0.55, C.primary);
    s.addText(t, { x: M + 0.85, y, w: 11, h: 0.42, fontFace: F, fontSize: 20, bold: true, color: C.white, margin: 0, isTextBox: true });
    s.addText(d, { x: M + 0.85, y: y + 0.42, w: 11, h: 0.4, fontFace: F, fontSize: 15, color: C.light, margin: 0, isTextBox: true });
  });
  s.addText('Gracias', { x: M, y: 6.25, w: 6, h: 0.6, fontFace: F, fontSize: 28, bold: true, color: C.white, margin: 0, isTextBox: true });
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
