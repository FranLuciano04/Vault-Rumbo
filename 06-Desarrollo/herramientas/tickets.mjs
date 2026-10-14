#!/usr/bin/env node
// Herramienta de tickets de Rumbo (DEC-0014). Sin dependencias: solo Node y git.
//
//   node 06-Desarrollo/herramientas/tickets.mjs <comando> [args]
//
//   validar                 Revisa los campos, las dependencias y que no haya ciclos.
//   grafo                   Regenera «06-Desarrollo/Grafo de tickets.md».
//   disponibles             Lista los tickets libres con todas sus dependencias hechas.
//   tomar <T-NNN>           Semáforo: toma el ticket con un push atómico a main.
//   liberar <T-NNN> [motivo]  Suelta un ticket propio, o uno ajeno sin actividad hace más de 48 h.
//   vencidos                Lista los tickets tomados sin actividad hace más de 48 h.
//   hecho <T-NNN>           Marca el ticket como hecho (se corre en la rama del ticket, antes del PR).
//   fase <T-NNN> <rojo|verde|refactor|fix|hecho> [mensaje] [--test "<cmd>"] [--tocar-tests]
//                           En la rama del ticket: corre los tests (fallan en el rojo, pasan en el resto),
//                           verifica que sigan como en el rojo, commitea y sube.
//   publicar-grafo          En main: regenera el grafo y lo sube (después de mergear un PR).
//   modulo <MN>             Estado de un módulo y los merges de sus tickets (para la review de Codex).

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const HORAS_VENCIMIENTO = 48;
const ESTADOS = ['libre', 'tomado', 'hecho', 'bloqueado'];
const CAPAS = ['contrato', 'backend', 'web', 'mobile', 'shared', 'e2e', 'infra'];
const TAMANOS = ['XS', 'S', 'M'];
const RIESGOS = ['normal', 'alto'];
const MODELOS = ['haiku', 'sonnet', 'opus'];
const REQUERIDOS = ['id', 'titulo', 'modulo', 'capa', 'estado', 'depende_de', 'tamaño', 'riesgo', 'modelo_tests', 'modelo_impl', 'modelo_review'];

// ---------- git ----------
function git(args, opts = {}) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, GIT_EDITOR: 'true' }, ...opts });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
function gitOk(args) {
  const r = git(args);
  if (r.code !== 0) throw new Error(`git ${args.join(' ')} falló:\n${r.err || r.out}`);
  return r.out;
}

const ROOT = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout.trim();
if (!ROOT) { console.error('No estoy dentro del repositorio.'); process.exit(1); }
const DIR_TICKETS = path.join(ROOT, '06-Desarrollo', 'Tickets');
const GRAFO_REL = '06-Desarrollo/Grafo de tickets.md';
const GRAFO = path.join(ROOT, GRAFO_REL);

// ---------- frontmatter ----------
function parsear(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const data = {};
  for (const linea of m[1].split(/\r?\n/)) {
    const kv = linea.match(/^([\wñ]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].replace(/\s+#.*$/, '').trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, '');
    }
    data[kv[1]] = v;
  }
  return data;
}

function setCampo(texto, clave, valor) {
  const re = new RegExp(`^(${clave}:)[^\\r\\n]*?([ \\t]+#[^\\r\\n]*)?(?=\\r?$)`, 'm');
  if (!re.test(texto)) throw new Error(`El ticket no tiene el campo «${clave}».`);
  return texto.replace(re, (_, k, com) => `${k}${valor === '' ? '' : ' ' + valor}${com || ''}`);
}

function cargarTickets() {
  if (!fs.existsSync(DIR_TICKETS)) return [];
  return fs.readdirSync(DIR_TICKETS)
    .filter(f => /^T-\d{3}.*\.md$/.test(f))
    .map(f => {
      const archivo = path.join(DIR_TICKETS, f);
      const texto = fs.readFileSync(archivo, 'utf8');
      const d = parsear(texto) || {};
      if (!Array.isArray(d.depende_de)) d.depende_de = d.depende_de ? [d.depende_de] : [];
      return { ...d, archivo, nombreArchivo: f, rel: path.relative(ROOT, archivo).replaceAll('\\', '/') };
    })
    .sort((a, b) => (a.id || '').localeCompare(b.id || ''));
}

// ---------- utilidades ----------
const numModulo = t => Number((t.modulo || '').match(/^M(\d+)/)?.[1] ?? 999);
const idModulo = t => (t.modulo || '').match(/^M\d+/)?.[0] ?? '¿?';
const nodo = id => id.replace('-', '');
const pad = n => String(n).padStart(2, '0');

function ahora() {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${pad(d.getFullYear() % 100)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function parsearFecha(s) {
  const m = (s || '').match(/^(\d{2})\/(\d{2})\/(\d{2})(?: (\d{2}):(\d{2}))?$/);
  if (!m) return null;
  return new Date(2000 + Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0));
}
function slug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-$/, '');
}
function situacion(t, porId) {
  if (t.estado !== 'libre') return t.estado;
  return t.depende_de.every(d => porId.get(d)?.estado === 'hecho') ? 'disponible' : 'esperando';
}
// Cuántos tickets dependen (directa o indirectamente) de cada uno: sirve para priorizar el camino crítico.
function dependientes(tickets) {
  const hijos = new Map(tickets.map(t => [t.id, []]));
  for (const t of tickets) for (const d of t.depende_de) hijos.get(d)?.push(t.id);
  const cuenta = new Map();
  for (const t of tickets) {
    const vistos = new Set(); const pila = [...(hijos.get(t.id) || [])];
    while (pila.length) { const x = pila.pop(); if (!vistos.has(x)) { vistos.add(x); pila.push(...(hijos.get(x) || [])); } }
    cuenta.set(t.id, vistos.size);
  }
  return cuenta;
}
function usuario() { return gitOk(['config', 'user.name']); }

function ultimaActividad(t) {
  let fecha = parsearFecha(t.tomado_el);
  if (t.rama) {
    const r = git(['log', '-1', '--format=%cI', `origin/${t.rama}`]);
    if (r.code === 0 && r.out) { const f = new Date(r.out); if (!fecha || f > fecha) fecha = f; }
  }
  return fecha;
}
const horasDesde = f => (Date.now() - f.getTime()) / 36e5;

// ---------- validar ----------
function validar(tickets, { silencioso = false } = {}) {
  const errores = [], avisos = [];
  const porId = new Map();
  for (const t of tickets) {
    const donde = t.nombreArchivo;
    for (const c of REQUERIDOS) if (t[c] === undefined || (c !== 'depende_de' && t[c] === '')) errores.push(`${donde}: falta «${c}».`);
    if (!/^T-\d{3}$/.test(t.id || '')) errores.push(`${donde}: id inválido «${t.id}» (formato T-NNN).`);
    else if (!t.nombreArchivo.startsWith(t.id)) errores.push(`${donde}: el nombre del archivo no empieza con ${t.id}.`);
    if (porId.has(t.id)) errores.push(`${donde}: id repetido ${t.id}.`);
    porId.set(t.id, t);
    if (!/^M\d+/.test(t.modulo || '')) errores.push(`${donde}: módulo inválido «${t.modulo}» (formato «MN — Nombre»).`);
    if (t.estado && !ESTADOS.includes(t.estado)) errores.push(`${donde}: estado inválido «${t.estado}».`);
    if (t.capa && !CAPAS.includes(t.capa)) errores.push(`${donde}: capa inválida «${t.capa}».`);
    if (t.tamaño && !TAMANOS.includes(t.tamaño)) errores.push(`${donde}: tamaño «${t.tamaño}» no permitido (máximo M; partir el ticket).`);
    if (t.riesgo && !RIESGOS.includes(t.riesgo)) errores.push(`${donde}: riesgo inválido «${t.riesgo}».`);
    for (const c of ['modelo_tests', 'modelo_impl', 'modelo_review'])
      if (t[c] && !MODELOS.includes(t[c])) errores.push(`${donde}: ${c} inválido «${t[c]}».`);
    if (t.modelo_review === 'haiku') errores.push(`${donde}: Haiku no revisa código (rúbrica de DEC-0014).`);
    if (t.modelo_review && t.modelo_review === t.modelo_impl) errores.push(`${donde}: el reviewer tiene que ser un modelo distinto del implementador.`);
    if (t.riesgo === 'alto' && t.modelo_impl !== 'opus') errores.push(`${donde}: un ticket de riesgo alto se implementa con Opus.`);
    if (t.capa === 'e2e' && t.modelo_tests === 'haiku') avisos.push(`${donde}: un e2e con tests de Haiku; revisar que no tenga lógica de negocio.`);
    if (t.modelo_tests === 'haiku' && t.riesgo === 'alto') errores.push(`${donde}: Haiku no escribe tests de un ticket de riesgo alto.`);
    if (t.estado === 'tomado' && (!t.asignado || !t.tomado_el || !t.rama)) errores.push(`${donde}: tomado sin asignado, tomado_el o rama.`);
  }
  for (const t of tickets) for (const d of t.depende_de) {
    if (d === t.id) errores.push(`${t.nombreArchivo}: depende de sí mismo.`);
    else if (!porId.has(d)) errores.push(`${t.nombreArchivo}: depende de ${d}, que no existe.`);
  }
  // ciclos
  const color = new Map();
  const visitar = (id, camino) => {
    color.set(id, 1);
    for (const d of porId.get(id)?.depende_de || []) {
      if (!porId.has(d)) continue;
      if (color.get(d) === 1) errores.push(`Ciclo de dependencias: ${[...camino, id, d].join(' → ')}.`);
      else if (!color.get(d)) visitar(d, [...camino, id]);
    }
    color.set(id, 2);
  };
  for (const t of tickets) if (!color.get(t.id)) visitar(t.id, []);
  if (!silencioso) {
    for (const a of avisos) console.log('⚠️  ' + a);
    for (const e of errores) console.log('❌ ' + e);
    console.log(errores.length ? `\n${errores.length} error(es) en ${tickets.length} tickets.` : `✅ ${tickets.length} tickets válidos.`);
  }
  return errores;
}

// ---------- grafo ----------
const ESTILOS = {
  hecho: 'fill:#c8e6c9,stroke:#2e7d32,color:#1b5e20',
  tomado: 'fill:#fff3cd,stroke:#b8860b,color:#5d4300',
  disponible: 'fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a',
  esperando: 'fill:#eeeeee,stroke:#9e9e9e,color:#555555',
  bloqueado: 'fill:#fde2e2,stroke:#c62828,color:#7f1d1d',
};

function renderGrafo(tickets) {
  const porId = new Map(tickets.map(t => [t.id, t]));
  const tags = new Set(git(['tag', '-l', 'mod-*']).out.split(/\r?\n/).filter(Boolean));
  const modulos = [...new Map(tickets.map(t => [idModulo(t), t.modulo])).entries()]
    .sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)));
  const enc = [
    '---', 'tipo: referencia', 'estado: formalizado', 'responsable: equipo', 'generado: true', '---',
    '# Grafo de tickets', '',
    'tags:: #tipo/referencia', '',
    '> ⚙️ **Archivo generado.** No se edita a mano: lo regenera `node 06-Desarrollo/herramientas/tickets.mjs grafo` a partir del frontmatter de cada ticket de `06-Desarrollo/Tickets/`. El proceso está en [[Flujo de implementación]] y el tablero en vivo en [[Tablero de tickets]].', '',
  ];
  if (!tickets.length) return [...enc, '_Todavía no hay tickets: se crean en la fase 0 del [[Flujo de implementación]]._', ''].join('\n');

  const filas = ['| Módulo | Tickets | Hechos | Tomados | Disponibles | Esperando | Bloqueados | Estado del módulo |', '|---|---|---|---|---|---|---|---|'];
  for (const [mid, nombre] of modulos) {
    const ts = tickets.filter(t => idModulo(t) === mid);
    const c = s => ts.filter(t => situacion(t, porId) === s).length;
    const estado = tags.has(`mod-${mid.slice(1)}`) ? '✅ cerrado' : c('hecho') === ts.length ? '🔍 listo para la review' : '🛠️ en curso';
    filas.push(`| ${nombre} | ${ts.length} | ${c('hecho')} | ${c('tomado')} | ${c('disponible')} | ${c('esperando')} | ${c('bloqueado')} | ${estado} |`);
  }

  const m = ['```mermaid', 'flowchart LR'];
  for (const [mid, nombre] of modulos) {
    m.push(`  subgraph ${mid}["${nombre.replaceAll('"', '#quot;')}"]`);
    for (const t of tickets.filter(x => idModulo(x) === mid)) {
      let etiqueta = `${t.id} · ${t.titulo}<br/><small>${t.capa}${t.riesgo === 'alto' ? ' · ⚠️ riesgo alto' : ''}</small>`;
      if (t.estado === 'tomado') etiqueta += `<br/>👤 ${t.asignado}`;
      m.push(`    ${nodo(t.id)}["${etiqueta.replaceAll('"', '#quot;')}"]:::${situacion(t, porId)}`);
    }
    m.push('  end');
  }
  for (const t of tickets) for (const d of t.depende_de) if (porId.has(d)) m.push(`  ${nodo(d)} --> ${nodo(t.id)}`);
  for (const [k, v] of Object.entries(ESTILOS)) m.push(`  classDef ${k} ${v}`);
  m.push('```');

  return [...enc,
    '## Resumen por módulo', '', ...filas, '',
    '## Grafo', '',
    'Leyenda: 🟩 hecho · 🟨 tomado · 🟦 disponible (libre y con sus dependencias hechas) · ⬜ esperando dependencias · 🟥 bloqueado. Una flecha `A → B` significa que B depende de A.', '',
    ...m, ''].join('\n');
}
function escribirGrafo() {
  const nuevo = renderGrafo(cargarTickets());
  const viejo = fs.existsSync(GRAFO) ? fs.readFileSync(GRAFO, 'utf8') : '';
  if (nuevo !== viejo) fs.writeFileSync(GRAFO, nuevo);
  return nuevo !== viejo;
}

// ---------- semáforo ----------
function exigirMainLimpio() {
  const rama = gitOk(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (rama !== 'main') throw new Error(`Hay que estar en main (estás en ${rama}).`);
  if (git(['status', '--porcelain', '--untracked-files=no']).out) throw new Error('Hay cambios sin commitear en main: commitealos o guardalos antes de usar el semáforo.');
  const r = git(['pull', '--ff-only', 'origin', 'main']);
  if (r.code !== 0) throw new Error('No se pudo hacer pull --ff-only de main:\n' + r.err);
}

// Sube el último commit a main. Devuelve false si otro tocó el mismo ticket antes (perdimos la carrera).
function publicar() {
  for (let intento = 0; intento < 5; intento++) {
    if (git(['push', 'origin', 'HEAD:main']).code === 0) return true;
    gitOk(['fetch', 'origin', 'main']);
    const r = git(['rebase', 'origin/main']);
    if (r.code !== 0) {
      const conflictos = git(['diff', '--name-only', '--diff-filter=U']).out.split(/\r?\n/).filter(Boolean);
      if (conflictos.length && conflictos.every(f => f === GRAFO_REL)) {
        escribirGrafo();
        gitOk(['add', GRAFO_REL]);
        if (git(['rebase', '--continue']).code !== 0) { git(['rebase', '--abort']); throw new Error('No se pudo resolver el conflicto del grafo.'); }
      } else {
        git(['rebase', '--abort']);
        gitOk(['reset', '--keep', 'HEAD~1']);
        git(['pull', '--ff-only', 'origin', 'main']);
        return false;
      }
    }
    if (escribirGrafo()) { gitOk(['add', GRAFO_REL]); gitOk(['commit', '--amend', '--no-edit']); }
  }
  throw new Error('No se pudo subir a main después de varios intentos. Revisar la conexión y volver a probar.');
}

function buscar(tickets, id) {
  const t = tickets.find(x => x.id === id);
  if (!t) throw new Error(`No existe el ticket ${id}.`);
  return t;
}

function tomar(id) {
  exigirMainLimpio();
  const tickets = cargarTickets();
  const porId = new Map(tickets.map(t => [t.id, t]));
  const t = buscar(tickets, id);
  const yo = usuario();
  const mio = tickets.find(x => x.estado === 'tomado' && x.asignado === yo);
  if (mio) throw new Error(`Ya tenés tomado ${mio.id}: se trabaja un ticket por persona.`);
  if (t.estado !== 'libre') throw new Error(`${id} está «${t.estado}»${t.asignado ? ' (' + t.asignado + ')' : ''}. Elegí otro.`);
  const faltan = t.depende_de.filter(d => porId.get(d)?.estado !== 'hecho');
  if (faltan.length) throw new Error(`${id} todavía depende de: ${faltan.join(', ')}.`);
  const rama = `feature/${id}-${slug(t.titulo)}`;
  let texto = fs.readFileSync(t.archivo, 'utf8');
  texto = setCampo(texto, 'estado', 'tomado');
  texto = setCampo(texto, 'asignado', yo);
  texto = setCampo(texto, 'tomado_el', ahora());
  texto = setCampo(texto, 'rama', rama);
  fs.writeFileSync(t.archivo, texto);
  escribirGrafo();
  gitOk(['add', t.rel, GRAFO_REL]);
  gitOk(['commit', '-m', `tickets: ${id} tomado por ${yo}`]);
  if (!publicar()) {
    console.log(`🔴 PERDIDO: otra persona tomó o cambió ${id} antes. Tu claim se descartó; elegí otro ticket con «disponibles».`);
    process.exit(3);
  }
  console.log(`🟢 TOMADO: ${id} es tuyo. Rama: ${rama}`);
}

function liberar(id, motivo) {
  exigirMainLimpio();
  git(['fetch', 'origin', '--prune']);
  const tickets = cargarTickets();
  const t = buscar(tickets, id);
  const yo = usuario();
  if (t.estado !== 'tomado') throw new Error(`${id} no está tomado (está «${t.estado}»).`);
  if (t.asignado !== yo) {
    const f = ultimaActividad(t);
    const h = f ? horasDesde(f) : Infinity;
    if (h < HORAS_VENCIMIENTO) throw new Error(`${id} es de ${t.asignado} y tuvo actividad hace ${h.toFixed(0)} h (el vencimiento es a las ${HORAS_VENCIMIENTO} h).`);
    if (!motivo) motivo = `sin actividad de ${t.asignado} hace ${h === Infinity ? 'más de 48' : h.toFixed(0)} h`;
  }
  let texto = fs.readFileSync(t.archivo, 'utf8');
  for (const c of ['asignado', 'tomado_el', 'rama']) texto = setCampo(texto, c, '');
  texto = setCampo(texto, 'estado', 'libre');
  fs.writeFileSync(t.archivo, texto);
  escribirGrafo();
  gitOk(['add', t.rel, GRAFO_REL]);
  gitOk(['commit', '-m', `tickets: ${id} liberado por ${yo}${motivo ? ' (' + motivo + ')' : ''}`]);
  if (!publicar()) { console.log(`🔴 ${id} cambió en main mientras lo liberabas. Revisalo con «disponibles».`); process.exit(3); }
  console.log(`🟢 ${id} quedó libre.`);
}

function hecho(id) {
  const t = buscar(cargarTickets(), id);
  const rama = gitOk(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (rama !== t.rama) throw new Error(`Esto se corre en la rama del ticket (${t.rama}); estás en ${rama}.`);
  fs.writeFileSync(t.archivo, setCampo(fs.readFileSync(t.archivo, 'utf8'), 'estado', 'hecho'));
  console.log(`${id} marcado como hecho en ${t.rel}. Commitealo junto con el PR.`);
}

// Una fase del TDD en una sola llamada: verificar que los tests sigan intactos, commitear y subir la rama.
const ES_TEST = /(^|\/)(tests?|__tests__|e2e)\/|\.(test|spec)\.[jt]sx?$|(^|\/)test_[^/]*\.py$/;
const FASES = { rojo: 'test', verde: 'feat', refactor: 'refactor', fix: 'fix', hecho: 'tickets' };

// Corre los tests desde la raíz del repo (con bash, para que anden `env -u` y `cd … &&` también en Windows).
// En el rojo tienen que fallar; en las demás fases, pasar. Si no, sale sin commitear.
function correrTests(comando, nombre) {
  let r = spawnSync('bash', ['-c', comando], { cwd: ROOT, encoding: 'utf8' });
  if (r.error) r = spawnSync(comando, { cwd: ROOT, encoding: 'utf8', shell: true });
  const salida = `${r.stdout || ''}${r.stderr || ''}`.trimEnd().split(/\r?\n/);
  const cola = salida.slice(-25).join('\n');
  const pasan = r.status === 0;
  console.log(`🧪 ${comando}\n${salida.length > 25 ? '…\n' : ''}${cola}\n`);
  if (nombre === 'rojo' && pasan) {
    console.error('❌ Los tests pasan antes de implementar: en el rojo tienen que fallar. No se commiteó.');
    process.exit(3);
  }
  if (nombre !== 'rojo' && !pasan) {
    console.error(`❌ Los tests fallan (código ${r.status}): la fase ${nombre} necesita verde. No se commiteó.`);
    process.exit(4);
  }
}

function fase(id, nombre, resto) {
  if (!FASES[nombre]) throw new Error(`Fase desconocida: ${nombre}. Usá ${Object.keys(FASES).join(', ')}.`);
  const iTest = resto.indexOf('--test');
  const comandoTest = iTest >= 0 ? resto[iTest + 1] : null;
  if (iTest >= 0 && !comandoTest) throw new Error('--test necesita el comando entre comillas.');
  const resto2 = iTest >= 0 ? [...resto.slice(0, iTest), ...resto.slice(iTest + 2)] : resto;
  const tocarTests = resto2.includes('--tocar-tests');
  const mensaje = resto2.filter(a => a !== '--tocar-tests').join(' ').trim();
  const t = buscar(cargarTickets(), id);
  const rama = gitOk(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (rama !== t.rama) throw new Error(`Esto se corre en la rama del ticket (${t.rama}); estás en ${rama}.`);

  if (nombre === 'hecho') {
    fs.writeFileSync(t.archivo, setCampo(fs.readFileSync(t.archivo, 'utf8'), 'estado', 'hecho'));
    gitOk(['add', '-A']);
    gitOk(['commit', '-m', `tickets: ${id} hecho`]);
  } else {
    if (!mensaje) throw new Error('Falta el mensaje del commit.');
    if (comandoTest) correrTests(comandoTest, nombre);
    if (nombre !== 'rojo') {
      // La base es el último commit que fijó los tests: el rojo o un fix autorizado a tocarlos.
      const rojo = git(['log', '--format=%H', `--grep=^test(${id}):`, '--grep=^Tests-autorizados: sí', 'origin/main..HEAD']).out.split(/\r?\n/)[0];
      if (rojo) {
        const cambiados = new Set([
          ...git(['diff', '--name-only', rojo, 'HEAD']).out.split(/\r?\n/),
          ...git(['status', '--porcelain']).out.split(/\r?\n/).map(l => l.slice(3).replace(/^.* -> /, '')),
        ].filter(f => f && ES_TEST.test(f)));
        if (cambiados.size && !(nombre === 'fix' && tocarTests)) {
          console.error(`❌ Cambiaron archivos de test desde el rojo (${rojo.slice(0, 7)}):\n  ${[...cambiados].join('\n  ')}\nRestauralos con «git checkout ${rojo.slice(0, 7)} -- <archivo>». Solo un fix autorizado usa --tocar-tests.`);
          process.exit(2);
        }
      }
    }
    gitOk(['add', '-A']);
    if (!git(['diff', '--cached', '--quiet']).code) { console.log(`Sin cambios en la fase ${nombre}: no hay commit.`); return; }
    const tipo = nombre === 'verde' && t.capa === 'infra' ? 'chore' : FASES[nombre];
    gitOk(['commit', '-m', `${tipo}(${id}): ${mensaje}`, ...(tocarTests ? ['-m', 'Tests-autorizados: sí'] : [])]);
  }
  const push = git(['push', '-u', 'origin', rama]);
  if (push.code !== 0) throw new Error(`El commit quedó local, pero el push falló:\n${push.err}`);
  console.log(`🟢 ${gitOk(['log', '-1', '--format=%h %s'])} — subido a ${rama}.\n${gitOk(['show', '--stat', '--format=', 'HEAD'])}`);
}

function publicarGrafo() {
  exigirMainLimpio();
  if (!escribirGrafo()) { console.log('El grafo ya estaba al día.'); return; }
  gitOk(['add', GRAFO_REL]);
  gitOk(['commit', '-m', 'tickets: grafo actualizado']);
  if (!publicar()) throw new Error('No se pudo subir el grafo.');
  console.log('🟢 Grafo actualizado y subido.');
}

// ---------- consultas ----------
function disponibles() {
  const tickets = cargarTickets();
  const porId = new Map(tickets.map(t => [t.id, t]));
  const cuenta = dependientes(tickets);
  const yo = git(['config', 'user.name']).out;
  const mio = tickets.find(x => x.estado === 'tomado' && x.asignado === yo);
  if (mio) console.log(`👤 Tenés tomado ${mio.id} · ${mio.titulo} (rama ${mio.rama}).\n`);
  const lista = tickets.filter(t => situacion(t, porId) === 'disponible')
    .sort((a, b) => numModulo(a) - numModulo(b) || cuenta.get(b.id) - cuenta.get(a.id) || a.id.localeCompare(b.id));
  if (!lista.length) { console.log('No hay tickets disponibles ahora.'); return; }
  console.log('Disponibles (orden sugerido: módulo más bajo y, dentro de él, los que destraban más tickets):');
  for (const t of lista) console.log(`  ${t.id}  ${idModulo(t)}  ${t.capa.padEnd(7)} ${t.tamaño.padEnd(2)} ${t.riesgo === 'alto' ? '⚠️ ' : '   '} destraba ${String(cuenta.get(t.id)).padStart(2)}  ${t.titulo}`);
}

function vencidos() {
  git(['fetch', 'origin', '--prune']);
  const lista = cargarTickets().filter(t => t.estado === 'tomado').map(t => ({ t, f: ultimaActividad(t) }))
    .filter(({ f }) => !f || horasDesde(f) >= HORAS_VENCIMIENTO);
  if (!lista.length) { console.log('No hay tickets vencidos.'); return; }
  for (const { t, f } of lista) console.log(`  ${t.id}  ${t.asignado}  sin actividad hace ${f ? horasDesde(f).toFixed(0) + ' h' : '¿?'}  ${t.titulo}`);
}

function modulo(mid) {
  if (!/^M\d+$/.test(mid || '')) throw new Error('Uso: modulo MN (por ejemplo, modulo M3).');
  git(['fetch', 'origin', '--tags']);
  const tickets = cargarTickets().filter(t => idModulo(t) === mid);
  if (!tickets.length) throw new Error(`No hay tickets del módulo ${mid}.`);
  console.log(`${tickets[0].modulo} · tag de cierre: mod-${mid.slice(1)}`);
  let completos = true;
  for (const t of tickets) {
    if (t.estado !== 'hecho') completos = false;
    const merges = t.rama ? git(['log', 'origin/main', '--merges', '--format=%h %s', `--grep=${t.rama}`]).out : '';
    console.log(`  ${t.id}  ${t.estado.padEnd(9)} ${t.titulo}${merges ? '\n      merge: ' + merges.split(/\r?\n/).join('\n      merge: ') : ''}`);
  }
  console.log(completos ? '\n✅ Todos los tickets están hechos: el módulo está listo para la review.' : '\n🛠️ El módulo todavía tiene tickets sin terminar.');
}

// ---------- main ----------
const [cmd, ...args] = process.argv.slice(2);
try {
  switch (cmd) {
    case 'validar': process.exit(validar(cargarTickets()).length ? 1 : 0);
    case 'grafo': {
      const errs = validar(cargarTickets(), { silencioso: true });
      if (errs.length) { validar(cargarTickets()); process.exit(1); }
      console.log(escribirGrafo() ? `Grafo regenerado en ${GRAFO_REL}.` : 'El grafo ya estaba al día.');
      break;
    }
    case 'disponibles': disponibles(); break;
    case 'tomar': tomar(args[0]); break;
    case 'liberar': liberar(args[0], args.slice(1).join(' ')); break;
    case 'vencidos': vencidos(); break;
    case 'hecho': hecho(args[0]); break;
    case 'fase': fase(args[0], args[1], args.slice(2)); break;
    case 'publicar-grafo': publicarGrafo(); break;
    case 'modulo': modulo(args[0]); break;
    default:
      console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 17).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
      process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  console.error('❌ ' + e.message);
  process.exit(1);
}
