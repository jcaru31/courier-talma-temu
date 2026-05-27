/**
 * seedAerolineaSubeventos.js
 *
 * Pueblan los subeventos del hito Trasmisión Aerolínea para CADA AWB:
 *   1. "Numeracion de Manifiesto" — la aerolínea numera el manifiesto del
 *      vuelo. Es un evento del VUELO: la hora es la misma para TODAS las
 *      guías de un mismo manifiesto.
 *   2. "Incorporacion de guia" — la guía se incorpora al manifiesto. Por
 *      defecto comparte hora con el resto de guías del vuelo, pero 1-3 guías
 *      por vuelo se incorporan tarde (+1-3h sobre el estándar).
 *
 * Cronología: Numeración ocurre 5-7h ANTES que Incorporación. Ambos eventos
 * son anteriores a la salida del vuelo (`fecha_salida_origen`); el ancla para
 * el cálculo es:
 *     incorporacion_base = fecha_salida_origen − 2h
 *     numeracion         = incorporacion_base − random(5, 7) h
 *
 * Estado de cada subevento:
 *   - COMPLETADO si la hora calculada cae en el pasado (relativo a peruNow).
 *   - PENDIENTE si todavía no ocurrió (vuelos programados a futuro).
 *
 * El cálculo es determinístico por manifiesto (hash → seed) para que correr
 * el script varias veces produzca exactamente el mismo resultado.
 *
 * Uso:  node scripts/seedAerolineaSubeventos.js
 */
const fs = require('fs');
const path = require('path');
const { ANCHOR_DAY, REF_HOUR } = require('../src/utils/time');

const FILE = path.join(__dirname, '..', 'data', 'courier_data.json');
// "Ahora" en el frame de la data (sin shift): el archivo está anclado a
// ANCHOR_DAY, así que para decidir COMPLETADO vs PENDIENTE comparamos
// contra el ancla + REF_HOUR, no contra el reloj real.
const NOW = new Date(`${ANCHOR_DAY}T${REF_HOUR}:00-05:00`);

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function isoOffsetH(baseMs, hours) {
  return new Date(baseMs + hours * 3600000).toISOString();
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

// Agrupar por manifiesto: la numeración + base de incorporación son del vuelo.
const vuelos = new Map();
for (const a of data.awb_masters) {
  if (!vuelos.has(a.manifiesto)) vuelos.set(a.manifiesto, []);
  vuelos.get(a.manifiesto).push(a);
}

let vuelosTocados = 0;
let outliersGenerados = 0;

for (const [manifiesto, awbs] of vuelos) {
  const salida = awbs[0].fecha_salida_origen;
  if (!salida) continue;

  const rnd = makeRand(hashStr(manifiesto));
  const salidaMs = new Date(salida).getTime();

  // Incorporación base: 2h antes de la salida del vuelo.
  const incorporacionBaseMs = salidaMs - 2 * 3600000;
  // Numeración: 5-7h antes de la incorporación base.
  const numeracionGapH = 5 + rnd() * 2;
  const numeracionMs = incorporacionBaseMs - numeracionGapH * 3600000;
  const numeracionIso = new Date(numeracionMs).toISOString();
  const numeracionCompleto = numeracionMs < NOW.getTime();

  // 1-3 outliers por vuelo (siempre que haya suficientes guías).
  const outliersTarget = Math.min(awbs.length, 1 + Math.floor(rnd() * 3));
  const outliersIdx = new Set();
  while (outliersIdx.size < outliersTarget) {
    outliersIdx.add(Math.floor(rnd() * awbs.length));
  }

  awbs.forEach((awb, i) => {
    let incorpMs = incorporacionBaseMs;
    const esOutlier = outliersIdx.has(i);
    if (esOutlier) {
      // +1 a +3 h sobre la incorporación base.
      incorpMs += (1 + rnd() * 2) * 3600000;
      outliersGenerados++;
    }
    const incorpIso = new Date(incorpMs).toISOString();
    const incorpCompleto = incorpMs < NOW.getTime();

    // Estado del bucket: COMPLETADO si ambos subeventos están completos,
    // EN_CURSO si numeración sí pero incorporación no, PENDIENTE si nada.
    let estadoBucket;
    if (numeracionCompleto && incorpCompleto) estadoBucket = 'COMPLETADO';
    else if (numeracionCompleto) estadoBucket = 'EN_CURSO';
    else estadoBucket = 'PENDIENTE';

    awb.timeline = awb.timeline || {};
    awb.timeline.aerolinea = {
      estado: estadoBucket,
      ...(numeracionCompleto ? { fecha_inicio: numeracionIso } : {}),
      ...(numeracionCompleto && incorpCompleto ? { fecha_fin: incorpIso } : {}),
      subeventos: [
        {
          nombre: 'Numeracion de Manifiesto',
          estado: numeracionCompleto ? 'COMPLETADO' : 'PENDIENTE',
          ...(numeracionCompleto ? { fecha: numeracionIso } : {}),
        },
        {
          nombre: 'Incorporacion de guia',
          estado: incorpCompleto ? 'COMPLETADO' : 'PENDIENTE',
          ...(incorpCompleto ? { fecha: incorpIso } : {}),
        },
      ],
    };
  });
  vuelosTocados++;
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(`[seedAerolineaSubeventos] vuelos: ${vuelosTocados} · outliers de incorporación: ${outliersGenerados}`);
