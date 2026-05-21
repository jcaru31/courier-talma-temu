/**
 * Manejo de tiempo del demo: las fechas del JSON están ancladas al día del
 * snapshot (ANCHOR_DAY). En cada arranque del backend calculamos el offset
 * en días entre ese ancla y el día actual en Lima y aplicamos el shift a
 * toda la data al leerla. Esto hace que el tablero siempre se vea coherente
 * con "hoy" sin tener que regenerar el JSON.
 *
 * Reglas:
 *  - El archivo en disco se mantiene anclado a ANCHOR_DAY. Las escrituras
 *    desplazan de vuelta (unshift) antes de persistir.
 *  - Solo se desplazan strings con forma de fecha (YYYY-MM-DD o ISO). El
 *    resto se pasa tal cual.
 *  - Horario: Lima/Perú (UTC-5, sin DST). Las fechas ISO conservan su
 *    porción de hora y su offset; solo cambia la porción YYYY-MM-DD.
 */

const LIMA_TZ = 'America/Lima';

// Día del snapshot original que vive en backend/data/courier_data.json.
// Si en algún momento se regenera el JSON, actualizar este valor.
const ANCHOR_DAY = '2026-05-08';

// Hora fija de referencia (Lima) para "ahora" del demo. Solo el DÍA se
// mueve con el shift; la hora-del-día se mantiene constante para que los
// countdowns ("Llega en 6h 20m") queden estables sin importar a qué hora
// real abra el usuario el tablero.
const REF_HOUR = '08:25';

function peruNow() {
  return new Date(`${peruToday()}T${REF_HOUR}:00-05:00`);
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function peruToday() {
  // en-CA formatea como YYYY-MM-DD; timeZone Lima convierte UTC → Lima.
  return new Date().toLocaleDateString('en-CA', { timeZone: LIMA_TZ });
}

function diffDays(yyyymmddA, yyyymmddB) {
  const a = new Date(yyyymmddA + 'T00:00:00Z');
  const b = new Date(yyyymmddB + 'T00:00:00Z');
  return Math.round((a - b) / 86400000);
}

// Offset entre el día actual en Lima y el ancla. Se calcula una sola vez
// al cargar el módulo y se mantiene estable durante la vida del proceso.
const OFFSET_DAYS = diffDays(peruToday(), ANCHOR_DAY);

function addDaysToDay(yyyymmdd, days) {
  const dt = new Date(yyyymmdd + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function shiftDay(s) {
  if (!s || typeof s !== 'string' || !DAY_RE.test(s)) return s;
  return addDaysToDay(s, OFFSET_DAYS);
}
function unshiftDay(s) {
  if (!s || typeof s !== 'string' || !DAY_RE.test(s)) return s;
  return addDaysToDay(s, -OFFSET_DAYS);
}

// Para ISO con offset (ej. "2026-05-08T08:45:00-05:00") solo movemos la
// porción del día y dejamos la hora y el offset intactos.
function shiftIso(s) {
  if (!s || typeof s !== 'string' || !ISO_RE.test(s)) return s;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(.+)$/);
  if (!m) return s;
  const dayShifted = addDaysToDay(`${m[1]}-${m[2]}-${m[3]}`, OFFSET_DAYS);
  return `${dayShifted}T${m[4]}`;
}
function unshiftIso(s) {
  if (!s || typeof s !== 'string' || !ISO_RE.test(s)) return s;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(.+)$/);
  if (!m) return s;
  const dayShifted = addDaysToDay(`${m[1]}-${m[2]}-${m[3]}`, -OFFSET_DAYS);
  return `${dayShifted}T${m[4]}`;
}

function shiftValue(v) {
  if (typeof v !== 'string') return v;
  if (ISO_RE.test(v)) return shiftIso(v);
  if (DAY_RE.test(v)) return shiftDay(v);
  return v;
}
function unshiftValue(v) {
  if (typeof v !== 'string') return v;
  if (ISO_RE.test(v)) return unshiftIso(v);
  if (DAY_RE.test(v)) return unshiftDay(v);
  return v;
}

function walk(obj, fn) {
  if (Array.isArray(obj)) return obj.map((x) => walk(x, fn));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = walk(obj[k], fn);
    return out;
  }
  return fn(obj);
}

function shiftRecursive(obj) { return walk(obj, shiftValue); }
function unshiftRecursive(obj) { return walk(obj, unshiftValue); }

module.exports = {
  LIMA_TZ,
  ANCHOR_DAY,
  OFFSET_DAYS,
  REF_HOUR,
  peruToday,
  peruNow,
  shiftDay,
  unshiftDay,
  shiftIso,
  unshiftIso,
  shiftRecursive,
  unshiftRecursive,
};
