/**
 * Seed de ejemplos coherentes: guía con Transmisión Almacén COMPLETA cuyo
 * despacho queda FRENADO porque el handling no se pagó.
 *
 * Estado resultante por guía:
 *   - aduanas (Transmisión Almacén)  → COMPLETADO  (descarga + volante)
 *   - handling_pagado                → false       (gatilla alerta roja)
 *   - despacho_eseer                 → PENDIENTE, sin subeventos (bloqueado)
 *   - status                         → EN_PROCESO  (sigue físicamente en almacén)
 *
 * Con esto `determinarEstadoTracking` la ubica en FACTURACIÓN (liberación
 * comercial), que es justo donde vive el pago de handling: la guía no puede
 * continuar al despacho hasta regularizarlo.
 *
 * Idempotente: apunta a tener OBJETIVO ejemplos coherentes; si ya existen, no
 * convierte más. Corre la corrección general primero (fixHandlingTransmision).
 *
 * Uso:  node scripts/seedHandlingBloqueado.js
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data', 'courier_data.json');
const OBJETIVO = 4; // total de ejemplos coherentes deseados

function transmisionCompleta(a) {
  const subs = a.timeline?.aduanas?.subeventos || [];
  const descarga = subs.some((s) => /descarga/i.test(s.nombre) && s.estado === 'COMPLETADO');
  const volante = subs.some((s) => /volante/i.test(s.nombre) && s.estado === 'COMPLETADO');
  return descarga && volante;
}

// Ya es un ejemplo coherente de "bloqueada por handling".
function bloqueadaCoherente(a) {
  return (
    transmisionCompleta(a) &&
    a.handling_pagado === false &&
    a.timeline?.despacho_eseer?.estado !== 'COMPLETADO' &&
    (a.timeline?.despacho_eseer?.subeventos || []).length === 0
  );
}

function sinAlertasActivas(a) {
  return (a.alertas_activas_ids || []).length === 0;
}

function bloquearPorHandling(a) {
  a.handling_pagado = false;
  a.status = 'EN_PROCESO';
  a.timeline.despacho_eseer = {
    estado: 'PENDIENTE',
    fecha_inicio: null,
    fecha_fin: null,
    subeventos: [],
  };
}

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const masters = data.awb_masters || [];
const tocadas = [];

// 1. AWB-103 ya tenía handling impago pero con el despacho avanzado
//    (contradictorio). Lo dejamos coherente: despacho bloqueado.
const a103 = masters.find((a) => a.id === 'AWB-103');
if (a103 && transmisionCompleta(a103) && a103.handling_pagado === false && !bloqueadaCoherente(a103)) {
  bloquearPorHandling(a103);
  tocadas.push(`${a103.id} (${a103.awb}) · corregida (despacho avanzado → bloqueado)`);
}

// 2. Asegurar OBJETIVO ejemplos coherentes: convertir guías ya despachadas
//    (transmisión completa, sin otras alertas) en guías frenadas por handling.
let actuales = masters.filter(bloqueadaCoherente).length;
for (const a of masters) {
  if (actuales >= OBJETIVO) break;
  if (bloqueadaCoherente(a)) continue;
  if (a.status === 'DESPACHADO_A_ESEER' && transmisionCompleta(a) && sinAlertasActivas(a)) {
    bloquearPorHandling(a);
    tocadas.push(`${a.id} (${a.awb}) · ${a.vuelo} · despachada → frenada por handling`);
    actuales++;
  }
}

if (tocadas.length === 0) {
  console.log(`Sin cambios: ya existen ${actuales} ejemplo(s) coherente(s) de handling bloqueado.`);
} else {
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Ejemplos de "handling impago → despacho bloqueado" (total coherentes: ${actuales}):`);
  for (const t of tocadas) console.log('  -', t);
}
