/**
 * Inyecta variantes intermedias de sub-eventos en las guías EN_PROCESO del
 * dataset, para que en la Vista 2 se vean guías en distintos puntos exactos
 * de cada hito (no solo "antes/después", sino sub-eventos parciales).
 *
 * Distribución proporcional a la realidad operativa courier (las guías se
 * acumulan al final de la cadena; Recepción se desocupa rápido):
 *
 *   Recepción              ~10%
 *     · R1: Llegada ✓ · Tarja ⊝
 *     · R2: Llegada ✓ · Tarja ⏵ (en curso)
 *
 *   Trasmisión Almacén     ~20%
 *     · T1: Descarga ✓ · Volante ⊝
 *     · T2: Descarga ✓ · Volante ⏵
 *
 *   Facturación            ~25%
 *     · F1: Handling ⊝ + Postal ⊝
 *     · F2: Handling ⏵ + Postal ⊝
 *
 *   Despacho               ~45%
 *     · D1: VCT ✓ · Camión ⊝ · Entrega ⊝
 *     · D2: VCT ✓ · Camión ⏵ · Entrega ⊝
 *     · D3: VCT ✓ · Camión ✓ · Entrega ⊝
 *
 * Para mantener coherencia con `pasoFacturacion` (un sub-evento "facturacion"
 * completado ya cuenta como hito superado), el escenario F1/F2 deja TODOS los
 * sub-eventos de despacho_eseer con "facturacion" en el nombre en estado
 * PENDIENTE o EN_CURSO. Eso garantiza que la guía siga reportando
 * estado_tracking = FACTURACION.
 *
 * Idempotente: la asignación se deriva de un hash determinístico sobre el id
 * de la guía, así que correrlo varias veces produce la misma distribución.
 * Las guías FALTANTE, PLANIFICADO y DESPACHADO_A_ESEER quedan intactas.
 *
 * Uso:  node scripts/seedEscenariosIntermedios.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'courier_data.json');

// Hash determinístico para asignar escenario reproducible por guía.
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 131 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Devuelve el bucket (RECEP / TRANSM / FACT / DESP) según pesos proporcionales.
function bucketDe(awb) {
  const v = hash(awb.id + '#bucket') % 100;
  if (v < 10) return 'RECEP';       // 10%
  if (v < 30) return 'TRANSM';      // 20%
  if (v < 55) return 'FACT';        // 25%
  return 'DESP';                    // 45%
}

// Sub-variante dentro del bucket. Pesos definidos como tramos de 0..99.
function varianteDe(awb, tramos) {
  const v = hash(awb.id + '#var') % 100;
  for (const t of tramos) {
    if (v < t.hasta) return t.key;
  }
  return tramos[tramos.length - 1].key;
}

// ---- builders de timeline por escenario ---------------------------------
// Fechas: parten de fecha de emisión y van avanzando. No es importante que
// sean reales — solo que estén ordenadas para que la UI muestre algo
// coherente.
function adelantar(iso, horas) {
  const d = new Date(iso);
  d.setHours(d.getHours() + horas);
  return d.toISOString();
}

function escenarioRecepcion(awb, variante) {
  const inicio = adelantar(awb.fecha_emision, 36);  // llegó al almacén
  awb.timeline.recepcion = {
    estado: 'EN_CURSO',
    fecha_inicio: inicio,
    fecha_fin: null,
    subeventos: [],
  };
  // Llegada al almacén ya está implícita en fecha_inicio.
  if (variante === 'R1') {
    // Tarja pendiente.
    awb.timeline.tarja = { estado: 'PENDIENTE', fecha_inicio: null, fecha_fin: null, subeventos: [] };
  } else {
    // R2: Tarja en curso.
    awb.timeline.tarja = {
      estado: 'EN_CURSO',
      fecha_inicio: adelantar(inicio, 1),
      fecha_fin: null,
      subeventos: [],
    };
  }
  awb.timeline.aduanas = { estado: 'PENDIENTE', fecha_inicio: null, fecha_fin: null, subeventos: [] };
  awb.timeline.despacho_eseer = { estado: 'PENDIENTE', fecha_inicio: null, fecha_fin: null, subeventos: [] };
}

function escenarioTransmision(awb, variante) {
  const inicio = adelantar(awb.fecha_emision, 36);
  const tarjaFin = adelantar(inicio, 4);
  awb.timeline.recepcion = {
    estado: 'COMPLETADO',
    fecha_inicio: inicio,
    fecha_fin: tarjaFin,
    subeventos: [],
  };
  awb.timeline.tarja = {
    estado: 'COMPLETADO',
    fecha_inicio: adelantar(inicio, 1),
    fecha_fin: tarjaFin,
    subeventos: [],
  };
  const descargaFecha = adelantar(tarjaFin, 1);
  // Sub-eventos del hito Trasmisión Almacén. Descarga siempre COMPLETADO;
  // volante varía según T1/T2.
  const volanteEstado = variante === 'T1' ? 'PENDIENTE' : 'EN_CURSO';
  awb.timeline.aduanas = {
    estado: 'EN_CURSO',
    fecha_inicio: descargaFecha,
    fecha_fin: null,
    subeventos: [
      { nombre: 'Transmision de descarga de mercancia', estado: 'COMPLETADO', fecha: descargaFecha },
      { nombre: 'Emision de volante', estado: volanteEstado, fecha: null },
      { nombre: 'Aviso de llegada', estado: 'PENDIENTE', fecha: null },
    ],
  };
  awb.timeline.despacho_eseer = { estado: 'PENDIENTE', fecha_inicio: null, fecha_fin: null, subeventos: [] };
}

function escenarioFacturacion(awb, variante) {
  const inicio = adelantar(awb.fecha_emision, 36);
  const tarjaFin = adelantar(inicio, 4);
  const aduanasFin = adelantar(tarjaFin, 3);
  awb.timeline.recepcion = { estado: 'COMPLETADO', fecha_inicio: inicio, fecha_fin: tarjaFin, subeventos: [] };
  awb.timeline.tarja = { estado: 'COMPLETADO', fecha_inicio: adelantar(inicio, 1), fecha_fin: tarjaFin, subeventos: [] };
  awb.timeline.aduanas = {
    estado: 'COMPLETADO',
    fecha_inicio: adelantar(tarjaFin, 1),
    fecha_fin: aduanasFin,
    subeventos: [
      { nombre: 'Transmision de descarga de mercancia', estado: 'COMPLETADO', fecha: adelantar(tarjaFin, 1) },
      { nombre: 'Emision de volante', estado: 'COMPLETADO', fecha: aduanasFin },
      { nombre: 'Aviso de llegada', estado: 'COMPLETADO', fecha: aduanasFin },
    ],
  };
  // Despacho con sub-eventos de facturación SIN completar. Ningún sub-evento
  // con "facturacion" en el nombre puede estar COMPLETADO para mantener la
  // guía en estado_tracking = FACTURACION.
  const handlingEstado = variante === 'F1' ? 'PENDIENTE' : 'EN_CURSO';
  awb.timeline.despacho_eseer = {
    estado: 'EN_CURSO',
    fecha_inicio: adelantar(aduanasFin, 1),
    fecha_fin: null,
    subeventos: [
      { nombre: 'Facturacion handling', estado: handlingEstado, fecha: null },
      { nombre: 'Facturacion traslado postal', estado: 'PENDIENTE', fecha: null },
    ],
  };
  // Handling sigue "pagado" en booleano para no agregar la alerta fucsia
  // (esa es una variante de alerta, no de hito). Se preserva si ya tenía
  // false explícito.
  if (awb.handling_pagado === undefined) awb.handling_pagado = true;
}

function escenarioDespacho(awb, variante) {
  const inicio = adelantar(awb.fecha_emision, 36);
  const tarjaFin = adelantar(inicio, 4);
  const aduanasFin = adelantar(tarjaFin, 3);
  const factFin = adelantar(aduanasFin, 4);
  const vctFecha = adelantar(factFin, 1);
  awb.timeline.recepcion = { estado: 'COMPLETADO', fecha_inicio: inicio, fecha_fin: tarjaFin, subeventos: [] };
  awb.timeline.tarja = { estado: 'COMPLETADO', fecha_inicio: adelantar(inicio, 1), fecha_fin: tarjaFin, subeventos: [] };
  awb.timeline.aduanas = {
    estado: 'COMPLETADO',
    fecha_inicio: adelantar(tarjaFin, 1),
    fecha_fin: aduanasFin,
    subeventos: [
      { nombre: 'Transmision de descarga de mercancia', estado: 'COMPLETADO', fecha: adelantar(tarjaFin, 1) },
      { nombre: 'Emision de volante', estado: 'COMPLETADO', fecha: aduanasFin },
      { nombre: 'Aviso de llegada', estado: 'COMPLETADO', fecha: aduanasFin },
    ],
  };
  // Sub-eventos del hito Despacho. VCT siempre completo; estiba y entrega
  // varían. Facturacion handling/postal completados para superar el hito
  // Facturación.
  let estibaEstado = 'PENDIENTE';
  let estibaFecha = null;
  if (variante === 'D2') { estibaEstado = 'EN_CURSO'; estibaFecha = adelantar(vctFecha, 1); }
  if (variante === 'D3') { estibaEstado = 'COMPLETADO'; estibaFecha = adelantar(vctFecha, 2); }
  awb.timeline.despacho_eseer = {
    estado: 'EN_CURSO',
    fecha_inicio: factFin,
    fecha_fin: null,
    subeventos: [
      { nombre: 'Facturacion handling', estado: 'COMPLETADO', fecha: factFin },
      { nombre: 'Facturacion traslado postal', estado: 'COMPLETADO', fecha: factFin },
      { nombre: 'Ingreso de transportista', estado: 'COMPLETADO', fecha: vctFecha },
      { nombre: 'Inicio de estiba', estado: estibaEstado, fecha: estibaFecha },
      { nombre: 'Entrega de carga', estado: 'PENDIENTE', fecha: null },
    ],
  };
}

// ---- aplicación ----------------------------------------------------------
function aplicarEscenario(awb) {
  const bucket = bucketDe(awb);
  let variante;
  if (bucket === 'RECEP') {
    variante = varianteDe(awb, [{ hasta: 50, key: 'R1' }, { hasta: 100, key: 'R2' }]);
    escenarioRecepcion(awb, variante);
  } else if (bucket === 'TRANSM') {
    variante = varianteDe(awb, [{ hasta: 50, key: 'T1' }, { hasta: 100, key: 'T2' }]);
    escenarioTransmision(awb, variante);
  } else if (bucket === 'FACT') {
    variante = varianteDe(awb, [{ hasta: 60, key: 'F1' }, { hasta: 100, key: 'F2' }]);
    escenarioFacturacion(awb, variante);
  } else {
    variante = varianteDe(awb, [{ hasta: 50, key: 'D1' }, { hasta: 80, key: 'D2' }, { hasta: 100, key: 'D3' }]);
    escenarioDespacho(awb, variante);
  }
  awb.status = 'EN_PROCESO';
  return variante;
}

function run() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  const elegibles = data.awb_masters.filter((a) => a.status === 'EN_PROCESO');
  const stats = {};
  for (const awb of elegibles) {
    const v = aplicarEscenario(awb);
    stats[v] = (stats[v] || 0) + 1;
  }
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  console.log(`Procesadas ${elegibles.length} guía(s) EN_PROCESO:`);
  for (const [k, n] of Object.entries(stats).sort()) {
    console.log(`  ${k}: ${n}`);
  }
}

run();
