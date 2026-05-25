/**
 * Corrección de datos: el pago de handling es el paso siguiente a "Transmisión
 * Almacén" (descarga de mercancía + emisión de volante). Una guía no puede
 * figurar con handling impago si ese hito todavía no cerró, porque el pago aún
 * no es exigible. Este script normaliza las guías existentes: si tienen
 * handling_pagado === false pero Transmisión Almacén no está completa, las pasa
 * a handling_pagado = true.
 *
 * Idempotente: correrlo de nuevo no cambia nada una vez normalizado.
 *
 * Uso:  node scripts/fixHandlingTransmision.js
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data', 'courier_data.json');

// Transmisión Almacén completa = subeventos de `aduanas` con descarga de
// mercancía Y emisión de volante ambos COMPLETADO.
function transmisionAlmacenCompleta(awb) {
  const subs = awb.timeline?.aduanas?.subeventos || [];
  const descarga = subs.some((s) => /descarga/i.test(s.nombre) && s.estado === 'COMPLETADO');
  const volante = subs.some((s) => /volante/i.test(s.nombre) && s.estado === 'COMPLETADO');
  return descarga && volante;
}

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const corregidas = [];

for (const awb of data.awb_masters || []) {
  if (awb.handling_pagado === false && !transmisionAlmacenCompleta(awb)) {
    awb.handling_pagado = true;
    corregidas.push(`${awb.id} (${awb.awb}) · ${awb.status} · aduanas=${awb.timeline?.aduanas?.estado || '—'}`);
  }
}

if (corregidas.length === 0) {
  console.log('Sin cambios: no hay guías con handling impago antes de cerrar Transmisión Almacén.');
} else {
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Corregidas ${corregidas.length} guía(s) (handling_pagado false → true):`);
  for (const c of corregidas) console.log('  -', c);
}
