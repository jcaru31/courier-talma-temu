/**
 * fixAtaEta.js
 *
 * Alinea el ATA real de cada vuelo a ETA + 10 min cuando el desfase es mayor
 * a 60 minutos. Para cada vuelo desviado calcula el delta (ETA+10min − ATA
 * actual) y lo aplica a TODAS las marcas ISO del timeline de TODAS sus guías,
 * preservando la cronología interna del proceso (tarja, transmisiones,
 * facturación, entregas).
 *
 * El ATA del vuelo se deriva del mínimo `timeline.recepcion.fecha_inicio`
 * entre las guías no-faltantes. Para los vuelos que arrancan con ETA + 10min
 * (caso correcto) no se toca nada.
 *
 * Uso:  node scripts/fixAtaEta.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'courier_data.json');
const DESFASE_MAX_MIN = 60;
const ATA_OFFSET_MIN  = 10;

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

function isISODate(v) {
  return typeof v === 'string' && ISO_RE.test(v);
}

function shiftISO(iso, deltaMin) {
  const d = new Date(iso);
  d.setUTCMinutes(d.getUTCMinutes() + deltaMin);
  return d.toISOString();
}

// Recorre el árbol y desplaza cualquier campo string que parezca ISO. Las
// fechas administrativas que no debemos mover (eta, fecha, fecha_emision,
// fecha_salida_origen) viven en propiedades del AWB y no en el timeline, así
// que solo aplicamos el shift al subárbol `timeline`.
function shiftTimeline(node, deltaMin) {
  if (!node || typeof node !== 'object') return;
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (isISODate(v)) node[k] = shiftISO(v, deltaMin);
    else if (typeof v === 'object') shiftTimeline(v, deltaMin);
  }
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

// Agrupar AWBs por manifiesto y derivar el ATA actual de cada vuelo.
const vuelos = new Map();
for (const a of data.awb_masters) {
  if (!vuelos.has(a.manifiesto)) vuelos.set(a.manifiesto, { eta: a.eta, awbs: [] });
  vuelos.get(a.manifiesto).awbs.push(a);
}

let corregidos = 0;
let intactos = 0;
const detalle = [];

for (const [manifiesto, v] of vuelos.entries()) {
  // ATA = min(recepcion.fecha_inicio) entre no-faltantes.
  let ataActual = null;
  for (const a of v.awbs) {
    if (a.status === 'GUIA_FALTANTE' || a.status === 'PLANIFICADO') continue;
    const ini = a.timeline?.recepcion?.fecha_inicio;
    if (ini && (!ataActual || new Date(ini) < new Date(ataActual))) ataActual = ini;
  }
  if (!ataActual) continue;

  const etaObjetivo = new Date(v.eta);
  etaObjetivo.setUTCMinutes(etaObjetivo.getUTCMinutes() + ATA_OFFSET_MIN);
  const deltaMin = Math.round((etaObjetivo - new Date(ataActual)) / 60000);

  if (Math.abs(deltaMin) <= DESFASE_MAX_MIN) {
    intactos++;
    continue;
  }

  // Aplicamos el shift al timeline de TODAS las guías del vuelo para preservar
  // la coherencia entre recepción, transmisiones, facturación y entregas.
  for (const a of v.awbs) {
    if (a.timeline) shiftTimeline(a.timeline, deltaMin);
  }

  corregidos++;
  detalle.push({
    manifiesto,
    vuelo: v.awbs[0]?.vuelo,
    eta: v.eta,
    ataAntes: ataActual,
    deltaMin,
  });
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(`[fixAtaEta] vuelos corregidos: ${corregidos} · ya alineados: ${intactos}`);
for (const d of detalle) {
  console.log(
    `  · ${d.vuelo} (${d.manifiesto}) ETA=${d.eta} ATA_antes=${d.ataAntes} delta=${d.deltaMin}min`
  );
}
