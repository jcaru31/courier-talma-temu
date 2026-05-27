/**
 * Genera courier_data.json con 250 AWBs realistas para desarrollo.
 *
 * Distribucion:
 *   60% DESPACHADO_A_ESEER (timeline completo, sin alertas)
 *   18% EN_PROCESO sin alertas (timeline parcial)
 *   10% EN_PROCESO con ACE activa
 *    7% EN_PROCESO con INMOVILIZACION
 *    5% EN_PROCESO con MAL_ESTADO
 *
 * Uso:  node scripts/generateData.js
 */

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data', 'courier_data.json');
const HOY = new Date('2026-05-08T12:00:00-05:00');

const AEROLINEAS = [
  { code: 'LA', nombre: 'LATAM AIRLINES', short: 'LATAM' },
  { code: '5Y', nombre: 'ATLAS AIR INC.', short: 'ATLAS' },
];
const ATLAS = AEROLINEAS[1];
const LATAM = AEROLINEAS[0];

// Realidad operativa courier TEMU: solo 2 rutas habituales hacia LIM.
//   ATLAS  → 5Y 8102 / 5Y 8676, origen DFW (Dallas)
//   LATAM  → LA 2695 / LA 2481, origen MIA (Miami)
const VUELOS_POR_AEROLINEA = {
  '5Y': { origen: 'DFW', numeros: ['8102', '8676'] },
  LA:   { origen: 'MIA', numeros: ['2695', '2481'] },
};

// Rango de guías manifestadas por vuelo según aerolínea (tamaño operativo real).
const MANIFIESTO_POR_AEROLINEA = {
  '5Y': { min: 40, max: 45 },
  LA:   { min: 10, max: 15 },
};

const AGENTES = [
  'GAMARRA AIR CARGO Y CIA S.A.C.',
  'SCHARFF LOGISTICA INTEGRADA S.A.',
  'TRANSBER S.A.C.',
  'IFB INTERNATIONAL FREIGHT S.A.C.',
  'PERU EXPRESS CARGO S.A.C.',
  'CARGO MASTER E.I.R.L.',
];

// Shipper: embarcador en origen que figura en la guia aerea.
const SHIPPERS = [
  'WHALECO INC.',
  'TEMU FULFILLMENT CENTER - GUANGZHOU',
  'PDD EXPORT LOGISTICS CO. LTD',
  'SHENZHEN GLOBAL FORWARDING CO.',
  'YIWU INTERNATIONAL CARGO LTD',
  'HANGZHOU CROSS-BORDER SUPPLY CO.',
];

// Capitanes para el manifiesto de carga.
const CAPITANES = [
  'Watson Christopher Gerard',
  'Müller Andreas Klaus',
  'Chen Wei Lung',
  'Rodríguez Fernández Carlos',
  'Smith Jonathan Edward',
  'Tanaka Hiroshi Kenji',
];

// Prefijo de pais (ISO) por aeropuerto de origen, para el puerto de zarpe.
const PAIS_POR_ORIGEN = {
  MIA: 'US', DFW: 'US', JFK: 'US', LAX: 'US',
  MAD: 'ES', AMS: 'NL', CDG: 'FR',
  PVG: 'CN', HKG: 'HK', CAN: 'CN',
  GRU: 'BR', NRT: 'JP', ICN: 'KR',
};

const AGENCIAS_ADUANA = [
  'AGENCIA AFIANZADA DE ADUANA J. K.M. S.A.C.',
  'TLI ADUANAS S.A.C.',
  'NEPTUNIA S.A.',
  'BEAGLE AGENCIA DE ADUANA S.A.',
];

const RND = {
  int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  float: (min, max, decimals = 2) => {
    const f = Math.random() * (max - min) + min;
    return Number(f.toFixed(decimals));
  },
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  bool: (probTrue = 0.5) => Math.random() < probTrue,
};

function pad(n, size = 2) { return String(n).padStart(size, '0'); }

function awbCode() {
  const prefix = pad(RND.int(1, 999), 3);
  const num = pad(RND.int(10000000, 99999999), 8);
  return `${prefix}-${num}`;
}

function damCode() {
  // Formato Documento de Salida (master): 235-26-S6N-NNNNNN-NN-NNN
  const letra = String.fromCharCode(65 + RND.int(0, 25));
  return `235-26-S6${letra}-${pad(RND.int(1, 999999), 6)}-${pad(RND.int(1, 99))}-${pad(RND.int(1, 999), 3)}`;
}

function isoOffset(date) {
  const Y = date.getFullYear();
  const M = pad(date.getMonth() + 1);
  const D = pad(date.getDate());
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${Y}-${M}-${D}T${h}:${m}:${s}-05:00`;
}

function addMinutos(date, min) {
  return new Date(date.getTime() + min * 60 * 1000);
}

function buildSubeventosRecepcion(start) {
  const t0 = start;
  const t1 = addMinutos(t0, RND.int(15, 30));
  const t2 = addMinutos(t1, RND.int(20, 60));
  return {
    estado: 'COMPLETADO',
    fecha_inicio: isoOffset(t0),
    fecha_fin: isoOffset(t2),
    subeventos: [
      { nombre: 'Generacion de turno', fecha: isoOffset(t0), estado: 'COMPLETADO' },
      { nombre: 'En dique', fecha: isoOffset(t1), estado: 'COMPLETADO' },
      { nombre: 'Inspeccion visual', fecha: isoOffset(t2), estado: 'COMPLETADO' },
    ],
    fin: t2,
  };
}

// Igual que buildSubeventosRecepcion pero con inicio y fin anclados a tiempos
// dados (se usa para que el cierre del vuelo caiga en la ventana realista
// 5h30–6h30 desde ATA).
function buildSubeventosRecepcionAnchored(t0, t2) {
  const totalMs = t2.getTime() - t0.getTime();
  const t1 = new Date(t0.getTime() + Math.floor(totalMs * 0.4));
  return {
    estado: 'COMPLETADO',
    fecha_inicio: isoOffset(t0),
    fecha_fin: isoOffset(t2),
    subeventos: [
      { nombre: 'Generacion de turno', fecha: isoOffset(t0), estado: 'COMPLETADO' },
      { nombre: 'En dique', fecha: isoOffset(t1), estado: 'COMPLETADO' },
      { nombre: 'Inspeccion visual', fecha: isoOffset(t2), estado: 'COMPLETADO' },
    ],
    fin: t2,
  };
}

function buildSubeventosTarja(start, bultos, diferencias = 0) {
  const t0 = start;
  const t1 = addMinutos(t0, RND.int(30, 75));
  const t2 = addMinutos(t1, RND.int(10, 30));
  const contados = bultos - diferencias;
  return {
    estado: 'COMPLETADO',
    fecha_inicio: isoOffset(t0),
    fecha_fin: isoOffset(t2),
    subeventos: [
      { nombre: 'Inicio tarja', fecha: isoOffset(t0), estado: 'COMPLETADO' },
      { nombre: 'Conteo de bultos', fecha: isoOffset(t1), estado: 'COMPLETADO', detalle: { contados, esperados: bultos } },
      {
        nombre: 'Diferencias detectadas',
        fecha: isoOffset(t2),
        estado: diferencias > 0 ? 'ACTIVA' : 'COMPLETADO',
        detalle: { diferencias },
      },
    ],
    fin: t2,
  };
}

// Versión anclada: la tarja termina exactamente en t2. Sirve para que el
// max(tarja.fecha_fin) del vuelo (= cierre) caiga donde queremos.
function buildSubeventosTarjaAnchored(t0, t2, bultos, diferencias = 0) {
  const totalMs = t2.getTime() - t0.getTime();
  const t1 = new Date(t0.getTime() + Math.floor(totalMs * 0.75));
  const contados = bultos - diferencias;
  return {
    estado: 'COMPLETADO',
    fecha_inicio: isoOffset(t0),
    fecha_fin: isoOffset(t2),
    subeventos: [
      { nombre: 'Inicio tarja', fecha: isoOffset(t0), estado: 'COMPLETADO' },
      { nombre: 'Conteo de bultos', fecha: isoOffset(t1), estado: 'COMPLETADO', detalle: { contados, esperados: bultos } },
      {
        nombre: 'Diferencias detectadas',
        fecha: isoOffset(t2),
        estado: diferencias > 0 ? 'ACTIVA' : 'COMPLETADO',
        detalle: { diferencias },
      },
    ],
    fin: t2,
  };
}

function buildSubeventosAlmacen(start, kgs, canal, diasEstadia = null) {
  const t0 = start;
  const t1 = addMinutos(t0, RND.int(20, 60));
  const t2 = addMinutos(t1, RND.int(30, 75));
  return {
    estado: 'COMPLETADO',
    fecha_inicio: isoOffset(t0),
    fecha_fin: isoOffset(t2),
    dias_estadia: diasEstadia ?? RND.int(1, 4),
    subeventos: [
      { nombre: 'Estadia de carga', fecha: isoOffset(t0), estado: 'COMPLETADO' },
      { nombre: 'Pesado', fecha: isoOffset(t1), estado: 'COMPLETADO', detalle: { kgs } },
      { nombre: 'Asignacion de canal', fecha: isoOffset(t2), estado: 'COMPLETADO', detalle: { canal } },
    ],
    fin: t2,
  };
}

function buildSubeventosAduanas(start) {
  // Orden cronológico real: primero se transmite la descarga de la mercancía;
  // ~1 minuto después se emite el volante, y el aviso de llegada comparte la
  // hora del volante.
  const t0 = start;                              // Transmisión de descarga
  const t1 = addMinutos(t0, RND.int(1, 2));      // Emisión de volante (~1 min)
  const t2 = t1;                                 // Aviso de llegada (misma hora)
  return {
    estado: 'COMPLETADO',
    fecha_inicio: isoOffset(t0),
    fecha_fin: isoOffset(t2),
    subeventos: [
      { nombre: 'Transmision de descarga de mercancia', fecha: isoOffset(t0), estado: 'COMPLETADO' },
      { nombre: 'Emision de volante', fecha: isoOffset(t1), estado: 'COMPLETADO' },
      { nombre: 'Aviso de llegada', fecha: isoOffset(t2), estado: 'COMPLETADO' },
    ],
    fin: t2,
  };
}

function buildSubeventosDespacho(start) {
  const t0 = start;
  const t1 = addMinutos(t0, RND.int(15, 45));
  const t2 = addMinutos(t1, RND.int(40, 120));
  const t3 = addMinutos(t2, RND.int(15, 45));
  const t4 = addMinutos(t3, RND.int(20, 60));
  return {
    estado: 'COMPLETADO',
    fecha_inicio: isoOffset(t0),
    fecha_fin: isoOffset(t4),
    subeventos: [
      { nombre: 'Facturacion handling', fecha: isoOffset(t0), estado: 'COMPLETADO' },
      { nombre: 'Facturacion traslado postal', fecha: isoOffset(t1), estado: 'COMPLETADO' },
      {
        nombre: 'Ingreso de transportista',
        fecha: isoOffset(t2),
        estado: 'COMPLETADO',
        detalle: { placa: `${String.fromCharCode(65 + RND.int(0, 25))}${String.fromCharCode(65 + RND.int(0, 25))}${String.fromCharCode(65 + RND.int(0, 25))}-${pad(RND.int(100, 999), 3)}` },
      },
      { nombre: 'Inicio de estiba', fecha: isoOffset(t3), estado: 'COMPLETADO' },
      { nombre: 'Entrega de carga', fecha: isoOffset(t4), estado: 'COMPLETADO' },
    ],
    fin: t4,
  };
}

function pendienteEtapa() {
  return { estado: 'PENDIENTE', fecha_inicio: null, fecha_fin: null, subeventos: [] };
}

function generarAwb(i, escenario, alertasOut, vueloShared) {
  const id = `AWB-${pad(i, 3, '0')}`;
  const aero = vueloShared.aero;
  const origen = vueloShared.origen;
  const agente = RND.pick(AGENTES);
  const shipper = RND.pick(SHIPPERS);
  const agenciaAduana = RND.pick(AGENCIAS_ADUANA);

  const eta = new Date(vueloShared.eta);
  // Fecha de emision de la guia aerea: entre 1 y 5 dias antes del ETA del vuelo
  // (cuando el shipper emite el AWB en origen).
  const fechaEmision = addMinutos(eta, -RND.int(24 * 60, 120 * 60));

  const bultosEsperados = RND.int(20, 250);
  const kgsEsperados = RND.float(150, 3500, 2);

  let bultosRecibidos = bultosEsperados;
  let kgsRecibidos = kgsEsperados;
  // Canal por defecto: VERDE con levante. Solo INMOVILIZACION pasa a ROJO sin
  // levante (regla del cliente: inmovilizada = canal rojo y sin levante).
  let canalColor = 'VERDE';
  let conLevante = true;
  let canalNumero = `23526510${pad(RND.int(10000, 99999), 5)}`;

  let alertaIds = [];

  // Caso GUIA_FALTANTE: la guia estaba en el manifiesto pero no llego al
  // terminal. Todas las etapas pendientes; bultos y kgs recibidos = 0.
  if (escenario === 'GUIA_FALTANTE') {
    const alertaId = `ALR-${pad(alertasOut.length + 1, 3, '0')}`;
    alertasOut.push({
      id: alertaId,
      awb_master_id: id,
      tipo: 'GUIA_FALTANTE',
      estado: 'ACTIVA',
      numero_acta: `GF-2026-${pad(RND.int(1, 9999), 5)}`,
      fecha_emision: isoOffset(addMinutos(eta, RND.int(30, 120))),
      fecha_resolucion: null,
      motivo: `Guia ${bultosEsperados} bultos / ${kgsEsperados} kg manifestada pero no recibida fisicamente en el terminal.`,
      notificado: RND.bool(0.7),
      notificacion_ids: [],
    });
    return {
      id,
      awb: awbCode(),
      vuelo: vueloShared.vuelo,
      manifiesto: vueloShared.manifiesto,
      aerolinea: aero.nombre,
      origen,
      destino: 'LIM',
      eta: isoOffset(eta),
      fecha_salida_origen: isoOffset(new Date(vueloShared.fechaSalidaOrigen)),
      matricula: vueloShared.matricula,
      fecha: isoOffset(eta).slice(0, 10),
      tipo_vuelo: vueloShared.tipoVuelo,
      tipo: 'COMERCIAL',
      consignatario_id: 'CLI-TEMU',
      agente_carga: agente,
      warehouse: `300476839${pad(RND.int(10000, 99999), 5)}`,
      tipo_almacenamiento: 'COURIER BAGS',
      shipper,
      fecha_emision: isoOffset(fechaEmision),
      manifiesto_carga: vueloShared.manifiestoCarga,
      volante: null,
      handling_pagado: true,
      bultos_esperados: bultosEsperados,
      bultos_recibidos: 0,
      kgs_esperados: kgsEsperados,
      kgs_recibidos: 0,
      bultos_mal_estado: 0,
      bultos_faltantes: bultosEsperados,
      tarja_porcentaje: 0,
      status: 'GUIA_FALTANTE',
      dam: null,
      canal_dam: { numero: null, color: null, con_levante: false, agencia_aduana: agenciaAduana },
      alertas_activas_ids: [alertaId],
      timeline: {
        recepcion: pendienteEtapa(),
        tarja: pendienteEtapa(),
        almacenamiento: pendienteEtapa(),
        aduanas: pendienteEtapa(),
        despacho_eseer: pendienteEtapa(),
      },
    };
  }

  // Caso PLANIFICADO: vuelo programado, ninguna etapa iniciada
  if (escenario === 'PLANIFICADO') {
    return {
      id,
      awb: awbCode(),
      vuelo: vueloShared.vuelo,
      manifiesto: vueloShared.manifiesto,
      aerolinea: aero.nombre,
      origen,
      destino: 'LIM',
      eta: isoOffset(eta),
      fecha_salida_origen: isoOffset(new Date(vueloShared.fechaSalidaOrigen)),
      matricula: vueloShared.matricula,
      fecha: isoOffset(eta).slice(0, 10),
      tipo_vuelo: vueloShared.tipoVuelo,
      tipo: 'COMERCIAL',
      consignatario_id: 'CLI-TEMU',
      agente_carga: agente,
      warehouse: `300476839${pad(RND.int(10000, 99999), 5)}`,
      tipo_almacenamiento: 'COURIER BAGS',
      shipper,
      fecha_emision: isoOffset(fechaEmision),
      manifiesto_carga: vueloShared.manifiestoCarga,
      volante: null,
      handling_pagado: true,
      bultos_esperados: bultosEsperados,
      bultos_recibidos: 0,
      kgs_esperados: kgsEsperados,
      kgs_recibidos: 0,
      bultos_mal_estado: 0,
      bultos_faltantes: 0,
      tarja_porcentaje: 0,
      status: 'PLANIFICADO',
      dam: null,
      canal_dam: { numero: null, color: null, con_levante: false, agencia_aduana: agenciaAduana },
      alertas_activas_ids: [],
      timeline: {
        recepcion: pendienteEtapa(),
        tarja: pendienteEtapa(),
        almacenamiento: pendienteEtapa(),
        aduanas: pendienteEtapa(),
        despacho_eseer: pendienteEtapa(),
      },
    };
  }

  // Timeline. Si el vuelo planeó su cierre (vuelos pasados), cada guía recibe
  // un tarjaEndOffsetMin desde ETA. La tarja se ancla a ese fin y recepción se
  // reconstruye hacia atrás. Así el max(tarja.fecha_fin) del vuelo cae en la
  // ventana realista 5h30–6h30 desde ATA (que es la regla del negocio).
  let tRecepcion, tTarja, tAlmacen, tAduanas, tDespacho;

  // Diferencias en tarja (faltan bultos en la guia): solo escenario PARCIAL.
  const diferenciaBultos = escenario === 'PARCIAL' ? RND.int(2, 12) : 0;
  if (diferenciaBultos > 0) {
    bultosRecibidos = bultosEsperados - diferenciaBultos;
    kgsRecibidos = Number((kgsEsperados * (bultosRecibidos / bultosEsperados)).toFixed(2));
  }

  if (vueloShared.ataAnchorOffsetMin != null && escenario !== 'EN_PROCESO') {
    // Forward anchor: recepción arranca exactamente en ETA + offset (= ATA del vuelo).
    tRecepcion = buildSubeventosRecepcion(addMinutos(eta, vueloShared.ataAnchorOffsetMin));
    tTarja = buildSubeventosTarja(addMinutos(tRecepcion.fin, RND.int(10, 30)), bultosEsperados, diferenciaBultos);
  } else if (vueloShared.tarjaEndOffsetMin != null && escenario !== 'EN_PROCESO') {
    // Backward anchor: tarja termina exactamente en ETA + offset. Recepción
    // se reconstruye hacia atrás (siempre cae después de ATA por el safeMin).
    const tarjaEnd = addMinutos(eta, vueloShared.tarjaEndOffsetMin);
    const tarjaStart = addMinutos(tarjaEnd, -RND.int(40, 105));
    const recepcionEnd = addMinutos(tarjaStart, -RND.int(10, 30));
    const recepcionStart = addMinutos(recepcionEnd, -RND.int(35, 90));
    tRecepcion = buildSubeventosRecepcionAnchored(recepcionStart, recepcionEnd);
    tTarja = buildSubeventosTarjaAnchored(tarjaStart, tarjaEnd, bultosEsperados, diferenciaBultos);
  } else {
    tRecepcion = buildSubeventosRecepcion(addMinutos(eta, RND.int(10, 30)));
    tTarja = buildSubeventosTarja(addMinutos(tRecepcion.fin, RND.int(10, 30)), bultosEsperados, diferenciaBultos);
  }

  if (escenario === 'INMOVILIZACION') {
    // Inmovilizada por aduanas: canal ROJO sin levante. Llega completa,
    // pasa almacenamiento, transmite, pero SUNAT no otorga levante.
    canalColor = 'ROJO';
    conLevante = false;
    tAlmacen = buildSubeventosAlmacen(addMinutos(tTarja.fin, RND.int(5, 20)), kgsRecibidos, canalColor);
    const aduanasStart = addMinutos(tAlmacen.fin, RND.int(10, 30));
    tAduanas = {
      estado: 'EN_CURSO',
      fecha_inicio: isoOffset(aduanasStart),
      fecha_fin: null,
      subeventos: [
        { nombre: 'Transmision manifiesto', fecha: isoOffset(aduanasStart), estado: 'COMPLETADO' },
        { nombre: 'Emision volante', fecha: null, estado: 'PENDIENTE' },
        { nombre: 'Inmovilizacion canal rojo sin levante', fecha: isoOffset(addMinutos(aduanasStart, RND.int(60, 240))), estado: 'ACTIVA' },
      ],
    };
    tDespacho = pendienteEtapa();

    const alertaId = `ALR-${pad(alertasOut.length + 1, 3, '0')}`;
    alertaIds.push(alertaId);
    alertasOut.push({
      id: alertaId,
      awb_master_id: id,
      tipo: 'INMOVILIZACION',
      estado: 'ACTIVA',
      numero_acta: `INM-2026-${pad(RND.int(1, 9999), 5)}`,
      fecha_emision: isoOffset(addMinutos(aduanasStart, 60)),
      fecha_resolucion: null,
      motivo: 'Canal rojo asignado por aduanas. SUNAT no ha otorgado levante: la carga permanece inmovilizada en almacen hasta verificacion documental y fisica.',
      notificado: RND.bool(0.6),
      notificacion_ids: [],
    });
  } else if (escenario === 'PARCIAL') {
    // Faltan bultos en la guia: pasa todo el proceso con la cantidad recibida.
    tAlmacen = buildSubeventosAlmacen(addMinutos(tTarja.fin, RND.int(5, 20)), kgsRecibidos, canalColor);
    tAduanas = buildSubeventosAduanas(addMinutos(tAlmacen.fin, RND.int(10, 30)));
    tDespacho = {
      ...buildSubeventosDespacho(addMinutos(tAduanas.fin, RND.int(10, 30))),
      estado: 'EN_CURSO',
      fecha_fin: null,
    };
    tDespacho.subeventos.pop();
  } else if (escenario === 'MAL_ESTADO') {
    // Pasa la tarja con todos los bultos pero llega un reporte de carga danada
    tAlmacen = buildSubeventosAlmacen(addMinutos(tTarja.fin, RND.int(5, 20)), kgsRecibidos, canalColor);
    tAduanas = {
      estado: 'EN_CURSO',
      fecha_inicio: isoOffset(addMinutos(tAlmacen.fin, RND.int(10, 30))),
      fecha_fin: null,
      subeventos: [
        { nombre: 'Transmision manifiesto', fecha: isoOffset(addMinutos(tAlmacen.fin, 15)), estado: 'COMPLETADO' },
        { nombre: 'Emision volante', fecha: null, estado: 'PENDIENTE' },
      ],
    };
    tDespacho = pendienteEtapa();

    const alertaId = `ALR-${pad(alertasOut.length + 1, 3, '0')}`;
    alertaIds.push(alertaId);
    alertasOut.push({
      id: alertaId,
      awb_master_id: id,
      tipo: 'MAL_ESTADO',
      estado: 'ACTIVA',
      numero_acta: `RME-2026-${pad(RND.int(1, 9999), 5)}`,
      fecha_emision: isoOffset(addMinutos(tAlmacen.fin, 20)),
      fecha_resolucion: null,
      motivo: `Reporte de mal estado: ${RND.pick([
        'Bultos con embalaje roto y signos de manipulacion previa',
        'Caja con humedad y deformacion estructural visible',
        'Mercancia con golpes y precintos violados',
        'Empaque parcialmente abierto, riesgo de mermas',
      ])}.`,
      notificado: RND.bool(0.5),
      notificacion_ids: [],
    });
  } else if (escenario === 'ACE') {
    // Canal rojo, trabado en aduanas
    canalColor = 'ROJO';
    conLevante = false;
    tAlmacen = buildSubeventosAlmacen(addMinutos(tTarja.fin, RND.int(5, 20)), kgsRecibidos, canalColor);
    const aduanasStart = addMinutos(tAlmacen.fin, RND.int(10, 30));
    tAduanas = {
      estado: 'EN_CURSO',
      fecha_inicio: isoOffset(aduanasStart),
      fecha_fin: null,
      subeventos: [
        { nombre: 'Transmision manifiesto', fecha: isoOffset(aduanasStart), estado: 'COMPLETADO' },
        { nombre: 'Emision volante', fecha: null, estado: 'PENDIENTE' },
        { nombre: 'ACE activa', fecha: isoOffset(addMinutos(aduanasStart, RND.int(60, 240))), estado: 'ACTIVA' },
      ],
    };
    tDespacho = pendienteEtapa();

    const alertaId = `ALR-${pad(alertasOut.length + 1, 3, '0')}`;
    alertaIds.push(alertaId);
    alertasOut.push({
      id: alertaId,
      awb_master_id: id,
      tipo: 'ACE',
      estado: 'ACTIVA',
      numero_acta: `ACE-2026-${pad(RND.int(1, 99999), 5)}`,
      fecha_emision: isoOffset(addMinutos(aduanasStart, 120)),
      fecha_resolucion: null,
      motivo: 'Accion de Control Extraordinario por canal rojo. Verificacion documental y fisica de mercancia declarada.',
      notificado: RND.bool(0.7),
      notificacion_ids: [],
    });

    const aceSub = tAduanas.subeventos.find((s) => s.nombre === 'ACE activa');
    if (aceSub) aceSub.detalle = { alerta_id: alertaId };
  } else if (escenario === 'EN_PROCESO') {
    // En proceso sin alertas — depende del avance
    const avance = RND.int(0, 3);
    if (avance === 0) {
      // En tarja (todavia)
      tTarja = { ...tTarja, estado: 'EN_CURSO', fecha_fin: null };
      tTarja.subeventos[2] = { nombre: 'Diferencias detectadas', fecha: null, estado: 'PENDIENTE' };
      tAlmacen = pendienteEtapa();
      tAduanas = pendienteEtapa();
      tDespacho = pendienteEtapa();
    } else if (avance === 1) {
      tAlmacen = { ...buildSubeventosAlmacen(addMinutos(tTarja.fin, 10), kgsRecibidos, canalColor), estado: 'EN_CURSO', fecha_fin: null };
      tAlmacen.subeventos[2] = { nombre: 'Asignacion de canal', fecha: null, estado: 'PENDIENTE' };
      tAduanas = pendienteEtapa();
      tDespacho = pendienteEtapa();
    } else if (avance === 2) {
      // En trasmisión almacén: la descarga ya se transmitió, pero el volante
      // (y por ende el aviso de llegada) aún están pendientes.
      tAlmacen = buildSubeventosAlmacen(addMinutos(tTarja.fin, 10), kgsRecibidos, canalColor);
      tAduanas = { ...buildSubeventosAduanas(addMinutos(tAlmacen.fin, 10)), estado: 'EN_CURSO', fecha_fin: null };
      tAduanas.subeventos[1] = { nombre: 'Emision de volante', fecha: null, estado: 'PENDIENTE' };
      tAduanas.subeventos[2] = { nombre: 'Aviso de llegada', fecha: null, estado: 'PENDIENTE' };
      tDespacho = pendienteEtapa();
    } else {
      tAlmacen = buildSubeventosAlmacen(addMinutos(tTarja.fin, 10), kgsRecibidos, canalColor);
      tAduanas = buildSubeventosAduanas(addMinutos(tAlmacen.fin, 10));
      tDespacho = { ...buildSubeventosDespacho(addMinutos(tAduanas.fin, 10)), estado: 'EN_CURSO', fecha_fin: null };
      tDespacho.subeventos.pop();
    }
  } else {
    // DESPACHADO_A_ESEER (timeline completo)
    tAlmacen = buildSubeventosAlmacen(addMinutos(tTarja.fin, 10), kgsRecibidos, canalColor);
    tAduanas = buildSubeventosAduanas(addMinutos(tAlmacen.fin, 10));
    tDespacho = buildSubeventosDespacho(addMinutos(tAduanas.fin, 10));
  }

  const status =
    escenario === 'DESPACHADO_A_ESEER'
      ? 'DESPACHADO_A_ESEER'
      : tTarja.estado === 'COMPLETADO' && tAlmacen.estado === 'COMPLETADO' && tAduanas.estado === 'PENDIENTE'
      ? 'TARJADO'
      : 'EN_PROCESO';

  // bultos_mal_estado: solo en escenario MAL_ESTADO.
  const bultosMalEstado = escenario === 'MAL_ESTADO' ? RND.int(1, Math.max(2, Math.floor(bultosRecibidos * 0.05))) : 0;
  // bultos_faltantes: diferencia entre manifestado y recibido (solo > 0 en PARCIAL).
  const bultosFaltantes = Math.max(0, bultosEsperados - bultosRecibidos);

  // DAM: se asigna desde almacenamiento en adelante (todos los escenarios actuales
  // de esta rama llegaron a almacenamiento, incluido INMOVILIZACION).
  const damAsignada = true;

  // volante: se emite en el hito de transmisiones (subevento "Emision de volante").
  // Si la guia aun no llego a ese punto no tiene volante: queda bloqueada
  // documentariamente hasta que la aerolinea/aduanas lo emita.
  const volanteEmitido = (tAduanas.subeventos || []).some(
    (s) => /volante/i.test(s.nombre) && s.estado === 'COMPLETADO'
  );
  const volante = volanteEmitido ? `VOL-2026-${pad(RND.int(1, 99999), 5)}` : null;

  // Transmision Almacen completa = descarga de mercancia transmitida + volante
  // emitido. El pago de handling es el paso siguiente del flujo, asi que la
  // falta de pago solo tiene sentido (y recien ahi frena el despacho) cuando
  // este hito ya cerro.
  const descargaTransmitida = (tAduanas.subeventos || []).some(
    (s) => /descarga/i.test(s.nombre) && s.estado === 'COMPLETADO'
  );
  const transmisionAlmacenCompleta = volanteEmitido && descargaTransmitida;

  // handling_pagado: las guias despachadas pagaron handling; las que ya cerraron
  // Transmision Almacen pueden no haberlo pagado (gatilla la alerta de handling
  // y bloquea el despacho). Si la guia aun no llego a esa etapa NO puede figurar
  // como impaga: handling todavia no es exigible.
  const handlingPagado =
    escenario === 'DESPACHADO_A_ESEER' || !transmisionAlmacenCompleta
      ? true
      : RND.bool(0.7);

  return {
    id,
    awb: awbCode(),
    vuelo: vueloShared.vuelo,
    manifiesto: vueloShared.manifiesto,
    aerolinea: aero.nombre,
    origen,
    destino: 'LIM',
    eta: isoOffset(eta),
    fecha_salida_origen: isoOffset(new Date(vueloShared.fechaSalidaOrigen)),
    matricula: vueloShared.matricula,
    fecha: isoOffset(eta).slice(0, 10),
    tipo_vuelo: vueloShared.tipoVuelo,
    tipo: 'COMERCIAL',
    consignatario_id: 'CLI-TEMU',
    agente_carga: agente,
    warehouse: `300476839${pad(RND.int(10000, 99999), 5)}`,
    tipo_almacenamiento: 'COURIER BAGS',
    shipper,
    fecha_emision: isoOffset(fechaEmision),
    manifiesto_carga: vueloShared.manifiestoCarga,
    volante,
    handling_pagado: handlingPagado,
    bultos_esperados: bultosEsperados,
    bultos_recibidos: bultosRecibidos,
    kgs_esperados: kgsEsperados,
    kgs_recibidos: kgsRecibidos,
    bultos_mal_estado: bultosMalEstado,
    bultos_faltantes: bultosFaltantes,
    tarja_porcentaje: bultosEsperados > 0 ? Math.round((bultosRecibidos / bultosEsperados) * 100) : 0,
    status,
    dam: damAsignada ? damCode() : null,
    canal_dam: {
      numero: canalNumero,
      color: canalColor,
      con_levante: conLevante,
      agencia_aduana: agenciaAduana,
    },
    alertas_activas_ids: alertaIds,
    timeline: {
      recepcion: stripFin(tRecepcion),
      tarja: stripFin(tTarja),
      almacenamiento: stripFin(tAlmacen),
      aduanas: stripFin(tAduanas),
      despacho_eseer: stripFin(tDespacho),
    },
  };
}

function stripFin(etapa) {
  const { fin, ...rest } = etapa;
  return rest;
}

function escenarioParaVuelo(vuelo) {
  if (vuelo.escenarioVuelo === 'PLANIFICADO') return 'PLANIFICADO';
  if (vuelo.escenarioVuelo === 'EN_PROCESO_HOY') {
    const r = Math.random();
    if (r < 0.30) return 'EN_PROCESO';
    if (r < 0.48) return 'DESPACHADO_A_ESEER';
    if (r < 0.62) return 'PARCIAL';
    if (r < 0.76) return 'INMOVILIZACION';
    if (r < 0.90) return 'MAL_ESTADO';
    return 'GUIA_FALTANTE';
  }
  // Vuelos pasados (AYER_MIX y anteriores): NO incluir EN_PROCESO porque sus
  // guías deben tener tarja completada para que el vuelo se considere cerrado.
  // Las alertas que sí cierran tarja (INMOV / MAL_ESTADO / PARCIAL) y los
  // FALTANTE (que se confirman implícitamente con el último tarjar) sí entran.
  if (vuelo.escenarioVuelo === 'AYER_MIX') {
    const r = Math.random();
    if (r < 0.65) return 'DESPACHADO_A_ESEER';
    if (r < 0.75) return 'PARCIAL';
    if (r < 0.85) return 'INMOVILIZACION';
    if (r < 0.93) return 'MAL_ESTADO';
    return 'GUIA_FALTANTE';
  }
  // Pasados antiguos: mayoría despachados, alertas residuales.
  const r = Math.random();
  if (r < 0.80) return 'DESPACHADO_A_ESEER';
  if (r < 0.86) return 'PARCIAL';
  if (r < 0.93) return 'INMOVILIZACION';
  if (r < 0.97) return 'MAL_ESTADO';
  return 'GUIA_FALTANTE';
}

// El vuelo debe estar "cerrado" si ya pasó (no es de hoy). Los de hoy
// (planificado o en proceso) quedan sin cierre planificado para mostrar el
// estado vivo en el tablero.
function vueloDebeCerrarse(escenarioVuelo) {
  return escenarioVuelo !== 'PLANIFICADO' && escenarioVuelo !== 'EN_PROCESO_HOY';
}

// Duracion aproximada de vuelo hacia LIM por aeropuerto de origen (horas).
const DURACION_VUELO_H = {
  MIA: 6, DFW: 7.5, JFK: 8, LAX: 8.5, GRU: 5,
  MAD: 12, AMS: 14, CDG: 13,
  PVG: 26, HKG: 25, CAN: 26, NRT: 22, ICN: 23,
};

// Matricula de aeronave segun aerolinea: ATLAS (EE.UU., prefijo N), LATAM (Chile, CC-).
function matriculaAvion(aeroCode) {
  if (aeroCode === '5Y') {
    const l1 = String.fromCharCode(65 + RND.int(0, 25));
    const l2 = String.fromCharCode(65 + RND.int(0, 25));
    return `N${pad(RND.int(100, 999), 3)}${l1}${l2}`;
  }
  const l1 = String.fromCharCode(65 + RND.int(0, 25));
  const l2 = String.fromCharCode(65 + RND.int(0, 25));
  return `CC-B${l1}${l2}`;
}

/**
 * 10 vuelos fijos: 1 programado (llega hoy en la tarde), 1 hoy ya en proceso,
 * 8 pasados. Mezcla ATLAS/LATAM en días alternos. El número de vuelo y el
 * origen vienen de VUELOS_POR_AEROLINEA — la realidad operativa courier es
 * ATLAS DFW (8102/8676) y LATAM MIA (2695/2481).
 * El primer vuelo se programa para que el cronómetro de demo lo capture a
 * mitad de ruta y se vea el tracker de posición.
 */
function generarVuelos10() {
  const PLAN = [
    { diaOffset:  0, aero: ATLAS, hora: [14, 45], esc: 'PLANIFICADO'    },
    { diaOffset:  0, aero: ATLAS, hora: [ 4, 15], esc: 'EN_PROCESO_HOY' },
    { diaOffset: -1, aero: LATAM, hora: [ 5,  0], esc: 'AYER_MIX'       },
    { diaOffset: -2, aero: ATLAS, hora: [22, 40], esc: null             },
    { diaOffset: -3, aero: LATAM, hora: [ 3, 20], esc: null             },
    { diaOffset: -4, aero: ATLAS, hora: [22, 15], esc: null             },
    { diaOffset: -5, aero: LATAM, hora: [ 4, 45], esc: null             },
    { diaOffset: -6, aero: ATLAS, hora: [22,  0], esc: null             },
    { diaOffset: -7, aero: LATAM, hora: [ 3, 50], esc: null             },
    { diaOffset: -8, aero: ATLAS, hora: [ 5, 20], esc: null             },
  ];

  // Contadores por aerolínea para rotar entre los 2 números de vuelo posibles
  // (ATLAS 8102/8676, LATAM 2695/2481) de forma determinística.
  const contador = { '5Y': 0, LA: 0 };

  return PLAN.map((p, i) => {
    const code = p.aero.code;
    const { origen, numeros } = VUELOS_POR_AEROLINEA[code];
    const numeroVueloCorto = numeros[contador[code] % numeros.length];
    contador[code]++;

    const eta = new Date(HOY.getTime() + p.diaOffset * 24 * 60 * 60 * 1000);
    eta.setHours(p.hora[0], p.hora[1], 0, 0);
    const duracionH = DURACION_VUELO_H[origen] || 8;
    const fechaSalidaOrigen = new Date(eta.getTime() - duracionH * 60 * 60 * 1000);
    // Hito Aerolinea: la numeracion del manifiesto y la incorporacion de guias
    // ocurren antes del vuelo. Numeracion primero, luego incorporacion.
    const fechaNumeracion = new Date(eta.getTime() - RND.int(4, 7) * 24 * 60 * 60 * 1000);
    const fechaIncorporacion = new Date(eta.getTime() - RND.int(1, 3) * 24 * 60 * 60 * 1000);
    const numeroVuelo = `${code} ${numeroVueloCorto}`;
    const matricula = matriculaAvion(code);
    const manifiestoCarga = {
      numero_manifiesto: `2026-${pad(20100 + i * 7, 5)}`,
      codigo_transportista: code,
      capitan: RND.pick(CAPITANES),
      identidad_capitan: `PAS-${pad(RND.int(100000, 999999), 6)}`,
      matricula,
      tipo_medio_transporte: `${pad(RND.int(100, 999), 3)}Y`,
      puerto_zarpe: `${PAIS_POR_ORIGEN[origen] || 'XX'}${origen}`,
      tipo_lugar_descarga: '88',
      lugar_descarga: '3507',
      puerto_intermedio: null,
      fecha_zarpe: isoOffset(fechaSalidaOrigen),
      fecha_zarpe_intermedio: null,
      fecha_estimada_llegada: isoOffset(eta),
      fecha_numeracion: isoOffset(fechaNumeracion),
      fecha_incorporacion_guias: isoOffset(fechaIncorporacion),
    };
    const manRange = MANIFIESTO_POR_AEROLINEA[code];
    return {
      aero: p.aero,
      vuelo: numeroVuelo,
      manifiesto: `2026-${pad(20100 + i * 7, 5)}`,
      origen,
      eta,
      fechaSalidaOrigen,
      matricula,
      manifiestoCarga,
      tipoVuelo: code === '5Y' ? 'CAO' : RND.pick(['PAX', 'CAO']),
      cantidadAwbs: RND.int(manRange.min, manRange.max),
      escenarioVuelo: p.esc,
    };
  });
}

function main() {
  const awbs = [];
  const alertas = [];

  const vuelos = generarVuelos10();
  let i = 1;
  for (const v of vuelos) {
    // Para vuelos pasados (cerrados): planeamos el cierre del vuelo en la
    // ventana realista 5h30–6h30 desde ATA. Esquema:
    //   - Una guía actúa de "ancla ATA": su recepción arranca en ETA + 10 min
    //     (ATA del vuelo). Se construye hacia adelante.
    //   - El resto se anclan por su tarjaEnd. El MAYOR de ellos define el
    //     cierre del vuelo (la "última guía tarjada que confirma faltantes").
    //   - Los offsets garantizan que ninguna recepción arranque antes que ATA.
    const escenarios = [];
    for (let j = 0; j < v.cantidadAwbs; j++) {
      escenarios.push(escenarioParaVuelo(v));
    }
    const ataAnchors = new Array(v.cantidadAwbs).fill(null);
    const tarjaOffsets = new Array(v.cantidadAwbs).fill(null);

    if (vueloDebeCerrarse(v.escenarioVuelo)) {
      const cierreFromAta = RND.int(330, 390); // 5h30 – 6h30
      const ataOffset = 10;                    // ATA = ETA + 10 min
      const cierreFromEta = ataOffset + cierreFromAta;
      // Piso para anclas por tarjaEnd: chain dur máx (35+30+105=170) + ATA.
      // 235 garantiza recepción >= ETA + 10 incluso con la mayor duración.
      const safeMin = 235;

      // Primera guía no-FALTANTE: ancla ATA (forward).
      let ataIdx = escenarios.findIndex((e) => e !== 'GUIA_FALTANTE');
      if (ataIdx < 0) ataIdx = 0;
      ataAnchors[ataIdx] = ataOffset;

      // El resto (no FALTANTE, no ancla ATA): anclados por tarjaEnd.
      const candidatos = [];
      for (let j = 0; j < v.cantidadAwbs; j++) {
        if (j === ataIdx) continue;
        if (escenarios[j] === 'GUIA_FALTANTE') continue;
        tarjaOffsets[j] = ataOffset + RND.int(safeMin, cierreFromAta);
        candidatos.push(j);
      }
      // Forzar que el MAX coincida con cierreFromEta (cierre exacto del vuelo).
      if (candidatos.length > 0) {
        let maxIdx = candidatos[0];
        for (const idx of candidatos) {
          if (tarjaOffsets[idx] > tarjaOffsets[maxIdx]) maxIdx = idx;
        }
        tarjaOffsets[maxIdx] = cierreFromEta;
      }
    }

    for (let j = 0; j < v.cantidadAwbs; j++) {
      const vueloShared = {
        ...v,
        ataAnchorOffsetMin: ataAnchors[j],
        tarjaEndOffsetMin: tarjaOffsets[j],
      };
      awbs.push(generarAwb(i, escenarios[j], alertas, vueloShared));
      i++;
    }
  }

  // Orden por ETA descendente
  awbs.sort((a, b) => new Date(b.eta) - new Date(a.eta));

  const data = {
    awb_masters: awbs,
    alertas,
    clientes: [
      {
        id: 'CLI-TEMU',
        nombre: 'PERU BOX S.A.C.',
        ruc: '20611298745',
        emails_notificaciones: ['luis.mullisaca@pucp.pe', 'operaciones.lim@perubox.com'],
        whatsapp_notificaciones: ['+51999888777'],
        contactos: [
          {
            nombre: 'Luis Mullisaca',
            rol: 'Coordinador operaciones',
            email: 'luis.mullisaca@pucp.pe',
            telefono: '+51999888777',
          },
        ],
      },
    ],
    notificaciones_log: [],
  };

  fs.writeFileSync(OUT, JSON.stringify(data, null, 2), 'utf8');

  const conteo = {
    total: awbs.length,
    vuelos_unicos: new Set(awbs.map((a) => a.manifiesto)).size,
    despachados: awbs.filter((a) => a.status === 'DESPACHADO_A_ESEER').length,
    en_proceso: awbs.filter((a) => a.status === 'EN_PROCESO').length,
    tarjados: awbs.filter((a) => a.status === 'TARJADO').length,
    ace: alertas.filter((a) => a.tipo === 'ACE').length,
    inmov: alertas.filter((a) => a.tipo === 'INMOVILIZACION').length,
    mal_estado: alertas.filter((a) => a.tipo === 'MAL_ESTADO').length,
  };
  console.log(`[generate] ${OUT}`);
  console.log(`[generate] ${conteo.total} AWBs en ${conteo.vuelos_unicos} vuelos`);
  console.log(`[generate] status -> DESPACHADO ${conteo.despachados} | EN_PROCESO ${conteo.en_proceso} | TARJADO ${conteo.tarjados}`);
  console.log(`[generate] alertas -> ACE ${conteo.ace} | INMOV ${conteo.inmov} | MAL_ESTADO ${conteo.mal_estado}`);
}

main();
