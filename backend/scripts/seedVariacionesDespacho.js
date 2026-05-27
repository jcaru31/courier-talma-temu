/**
 * seedVariacionesDespacho.js
 *
 * Agrega granularidad al hito Despacho:
 *  1. Inserta el subevento "Generacion de turno" como entrada al hito (entre
 *     "Facturacion traslado postal" e "Ingreso de transportista"). Esto se
 *     alinea con el flujo operativo real: primero se genera el turno con su
 *     VCT, después llega el camión, luego se carga y finalmente se entrega.
 *  2. Para guías que actualmente están totalmente entregadas, regresa a una
 *     parte a estados intermedios para que la tabla muestre variedad:
 *       · 50% entregadas (sin cambio)
 *       · 20% Inicio de estiba completo · Entrega de carga pendiente
 *       · 15% Ingreso de transportista completo · resto pendiente
 *       · 15% Solo Generacion de turno · resto pendiente
 *
 * Distribución determinística por hash(awb.id) — correr varias veces produce
 * la misma asignación.
 *
 * Uso:  node scripts/seedVariacionesDespacho.js
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

const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

let turnosInsertados = 0;
let regresadas = 0;
const niveles = { 4: 0, 3: 0, 2: 0, 1: 0 };

for (const a of data.awb_masters) {
  const de = a.timeline?.despacho_eseer;
  if (!de || !Array.isArray(de.subeventos)) continue;
  const subs = de.subeventos;
  const findIdx = (re) => subs.findIndex((s) => re.test(s.nombre || ''));

  const idxIngreso = findIdx(/ingreso de transportista/i);
  if (idxIngreso === -1) continue;

  // 1. Insertar "Generacion de turno" si no existe.
  const yaTieneTurno = findIdx(/generacion de turno/i) !== -1;
  if (!yaTieneTurno) {
    const ingreso = subs[idxIngreso];
    const turnoFecha =
      ingreso.estado === 'COMPLETADO' && ingreso.fecha
        ? shiftIso(ingreso.fecha, -2) // turno generado 2h antes del ingreso
        : null;
    subs.splice(idxIngreso, 0, {
      nombre: 'Generacion de turno',
      // Si Ingreso ya estaba completado, Turno tuvo que ocurrir antes.
      estado: ingreso.estado === 'COMPLETADO' ? 'COMPLETADO' : 'PENDIENTE',
      ...(turnoFecha ? { fecha: turnoFecha } : {}),
    });
    turnosInsertados++;
  }

  // 2. Si toda la cadena Despacho está COMPLETADA, regresar a un nivel
  //    intermedio según hash determinístico.
  const idxTurno   = findIdx(/generacion de turno/i);
  const idxIng     = findIdx(/ingreso de transportista/i);
  const idxEstiba  = findIdx(/inicio de estiba/i);
  const idxEntrega = findIdx(/entrega de carga/i);
  const indicesDespacho = [idxTurno, idxIng, idxEstiba, idxEntrega];
  if (indicesDespacho.some((i) => i === -1)) continue;
  const todoCompleto = indicesDespacho.every((i) => subs[i].estado === 'COMPLETADO');
  if (!todoCompleto) continue;

  const v = hash(a.id + '#despVar') % 100;
  // Nivel 4 = entregada, 3 = estiba sin entrega, 2 = ingreso sin estiba,
  // 1 = solo turno generado.
  const nivel = v < 50 ? 4 : v < 70 ? 3 : v < 85 ? 2 : 1;
  niveles[nivel]++;
  if (nivel === 4) continue;

  // Regresión: marcar los pasos posteriores al nivel objetivo como PENDIENTE.
  if (nivel <= 3) {
    subs[idxEntrega].estado = 'PENDIENTE';
    delete subs[idxEntrega].fecha;
  }
  if (nivel <= 2) {
    subs[idxEstiba].estado = 'PENDIENTE';
    delete subs[idxEstiba].fecha;
  }
  if (nivel <= 1) {
    subs[idxIng].estado = 'PENDIENTE';
    delete subs[idxIng].fecha;
  }
  // El bucket queda EN_CURSO porque hay pasos pendientes.
  de.estado = 'EN_CURSO';
  delete de.fecha_fin;
  regresadas++;
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(`[seedVariacionesDespacho] turnos insertados: ${turnosInsertados} · regresadas: ${regresadas}`);
console.log(`  · nivel 4 (entregada):   ${niveles[4]}`);
console.log(`  · nivel 3 (estiba):      ${niveles[3]}`);
console.log(`  · nivel 2 (ingreso):     ${niveles[2]}`);
console.log(`  · nivel 1 (solo turno):  ${niveles[1]}`);
