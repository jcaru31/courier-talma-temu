/**
 * seedVariacionesFacturacion.js
 *
 * Alinea la lógica entre el booleano `handling_pagado` y el subevento
 * "Facturacion handling" + introduce variación en el subevento "Facturacion
 * traslado postal" para las guías que terminan en hito FACTURACION.
 *
 * Reglas:
 *  1. La alerta "Pago handling pendiente" solo aplica a guías con volante
 *     emitido (el siguiente paso natural tras la emisión es el pago).
 *  2. Si `handling_pagado=true` Y volante emitido Y aún no hay Facturación en
 *     curso, ~70% de esas guías avanzan a FACTURACION (subev "Facturacion
 *     handling" → COMPLETADO). El 30% restante se mantiene en TRANSMISIONES
 *     para simular el retraso operativo (pagado pero el sistema aún no lo
 *     registró).
 *  3. Para toda guía que termina en FACTURACION (handling COMPLETADO, sin
 *     turno generado), el subevento "Facturacion traslado postal" se varía
 *     determinísticamente:
 *       · ~40% PENDIENTE (solo handling facturado)
 *       · ~30% EN_CURSO
 *       · ~30% COMPLETADO (ambos facturados, esperando turno de despacho)
 *
 * Distribución determinística por hash(awb.id) — idempotente.
 *
 * Uso:  node scripts/seedVariacionesFacturacion.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'courier_data.json');

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function shiftIso(iso, hours) {
  const d = new Date(iso);
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString();
}
function volanteSubev(a) {
  return (a.timeline?.aduanas?.subeventos || []).find((s) => /volante/i.test(s.nombre));
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

let alineadas = 0;
let stayTransm = 0;
const traslado = { PENDIENTE: 0, EN_CURSO: 0, COMPLETADO: 0 };

for (const a of data.awb_masters) {
  if (a.status === 'GUIA_FALTANTE' || a.status === 'PLANIFICADO') continue;

  const de = a.timeline?.despacho_eseer;
  if (!de || !Array.isArray(de.subeventos)) continue;

  const findIdx = (re) => de.subeventos.findIndex((s) => re.test(s.nombre || ''));
  const idxHandling = findIdx(/facturacion handling/i);
  const idxTraslado = findIdx(/traslado postal/i);
  const idxTurno    = findIdx(/generacion de turno/i);
  if (idxHandling === -1 || idxTraslado === -1) continue;

  // Solo tocamos guías ANTES de Despacho (turno todavía PENDIENTE).
  if (idxTurno !== -1 && de.subeventos[idxTurno].estado === 'COMPLETADO') continue;

  // Requiere volante emitido para cualquier movimiento de facturación.
  const vol = volanteSubev(a);
  if (!vol || vol.estado !== 'COMPLETADO') continue;

  // (2) Promoción a FACTURACION para una parte de las "pagadas pero sin
  // registrar" en el sistema.
  if (a.handling_pagado === true && de.subeventos[idxHandling].estado !== 'COMPLETADO') {
    const promueve = hash(a.id + '#promFact') % 100 < 70;
    if (promueve) {
      de.subeventos[idxHandling].estado = 'COMPLETADO';
      de.subeventos[idxHandling].fecha = shiftIso(vol.fecha, 1); // 1h post volante
      alineadas++;
    } else {
      stayTransm++;
    }
  }

  // (3) Si la guía quedó (o ya estaba) en FACTURACION, variamos traslado postal.
  const handlingOk = de.subeventos[idxHandling].estado === 'COMPLETADO';
  if (!handlingOk) continue;

  const v = hash(a.id + '#trasladoVar') % 100;
  const handlingFecha = de.subeventos[idxHandling].fecha;
  if (v < 40) {
    de.subeventos[idxTraslado].estado = 'PENDIENTE';
    delete de.subeventos[idxTraslado].fecha;
    traslado.PENDIENTE++;
  } else if (v < 70) {
    de.subeventos[idxTraslado].estado = 'EN_CURSO';
    de.subeventos[idxTraslado].fecha = shiftIso(handlingFecha, 1);
    traslado.EN_CURSO++;
  } else {
    de.subeventos[idxTraslado].estado = 'COMPLETADO';
    de.subeventos[idxTraslado].fecha = shiftIso(handlingFecha, 2);
    traslado.COMPLETADO++;
  }
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(`[seedVariacionesFacturacion]`);
console.log(`  · alineadas a FACTURACION:           ${alineadas}`);
console.log(`  · mantenidas en TRANSMISIONES:       ${stayTransm}`);
console.log(`  · guías en FACTURACION con traslado:`);
console.log(`      PENDIENTE:  ${traslado.PENDIENTE}`);
console.log(`      EN_CURSO:   ${traslado.EN_CURSO}`);
console.log(`      COMPLETADO: ${traslado.COMPLETADO}`);
