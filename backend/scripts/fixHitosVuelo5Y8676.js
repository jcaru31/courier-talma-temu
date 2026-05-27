/**
 * fixHitosVuelo5Y8676.js
 *
 * Corrige inconsistencias puntuales del vuelo 2026-20107 (5Y 8676 del 27/05)
 * para que la clasificación de hito Trasmisión Almacén vs Facturación cuadre
 * con la regla operativa:
 *
 *   (A) Binarización del subevento `Facturacion handling` (no debe estar
 *       EN_CURSO; o se hizo o no se hizo).
 *         · Si handling_pagado === true  → COMPLETADO con fecha
 *         · Si handling_pagado === false → PENDIENTE sin fecha
 *
 *   (B) `handling_pagado` solo tiene sentido post-volante. Las guías que
 *       digan handling_pagado=true sin tener el volante emitido (Aviso de
 *       llegada y/o Emision de volante no COMPLETADO) pasan a
 *       handling_pagado=false.
 *
 * El script aplica los fixes solo al manifiesto 2026-20107 para no alterar
 * el resto de la data. Idempotente: correrlo varias veces no agrega ruido.
 *
 * Uso:  node scripts/fixHitosVuelo5Y8676.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'courier_data.json');
const MANIFIESTO = '2026-20107';

function shiftIso(iso, hours) {
  const d = new Date(iso);
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString();
}
function volanteEmitido(a) {
  const subs = a.timeline?.aduanas?.subeventos || [];
  return subs.some((s) => /emision de volante/i.test(s.nombre || '') && s.estado === 'COMPLETADO');
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

let binarizadasCompletado = 0;
let binarizadasPendiente = 0;
let handlingForzadoFalse = 0;

for (const a of data.awb_masters) {
  if (a.manifiesto !== MANIFIESTO) continue;

  // (B) handling_pagado=true requiere volante emitido. Si no, se baja a false.
  if (a.handling_pagado === true && !volanteEmitido(a)) {
    a.handling_pagado = false;
    handlingForzadoFalse++;
  }

  // (A) Binarizar Facturacion handling según handling_pagado actualizado.
  const de = a.timeline?.despacho_eseer;
  if (!de || !Array.isArray(de.subeventos)) continue;
  const handlingSub = de.subeventos.find((s) => /facturacion handling/i.test(s.nombre || ''));
  if (!handlingSub || handlingSub.estado !== 'EN_CURSO') continue;

  if (a.handling_pagado === true) {
    // Marcamos COMPLETADO con fecha cercana al volante (1h después).
    const volanteSub = (a.timeline?.aduanas?.subeventos || []).find((s) => /emision de volante/i.test(s.nombre || ''));
    handlingSub.estado = 'COMPLETADO';
    handlingSub.fecha = volanteSub?.fecha ? shiftIso(volanteSub.fecha, 1) : new Date().toISOString();
    binarizadasCompletado++;
  } else {
    handlingSub.estado = 'PENDIENTE';
    delete handlingSub.fecha;
    binarizadasPendiente++;
  }
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(`[fixHitosVuelo5Y8676] manifiesto ${MANIFIESTO}:`);
console.log(`  · handling_pagado true → false (sin volante): ${handlingForzadoFalse}`);
console.log(`  · Facturacion handling EN_CURSO → COMPLETADO: ${binarizadasCompletado}`);
console.log(`  · Facturacion handling EN_CURSO → PENDIENTE: ${binarizadasPendiente}`);
