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

const ORIGENES = [
  'PVG', 'HKG', 'CAN', 'MIA', 'JFK', 'LAX',
  'MAD', 'AMS', 'CDG', 'NRT', 'ICN', 'GRU',
];

const AGENTES = [
  'GAMARRA AIR CARGO Y CIA S.A.C.',
  'SCHARFF LOGISTICA INTEGRADA S.A.',
  'TRANSBER S.A.C.',
  'IFB INTERNATIONAL FREIGHT S.A.C.',
  'PERU EXPRESS CARGO S.A.C.',
  'CARGO MASTER E.I.R.L.',
];

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
  // Formato peruano simplificado: 235-2026-10-NNNNNN
  return `235-2026-10-${pad(RND.int(100000, 999999), 6)}`;
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
  const t0 = start;
  const t1 = addMinutos(t0, RND.int(60, 240));
  return {
    estado: 'COMPLETADO',
    fecha_inicio: isoOffset(t0),
    fecha_fin: isoOffset(t1),
    subeventos: [
      { nombre: 'Transmision manifiesto', fecha: isoOffset(t0), estado: 'COMPLETADO' },
      {
        nombre: 'Emision volante',
        fecha: isoOffset(t1),
        estado: 'COMPLETADO',
        detalle: { volante: `VOL-2026-${pad(RND.int(1, 9999), 4)}` },
      },
    ],
    fin: t1,
  };
}

function buildSubeventosDespacho(start) {
  const t0 = start;
  const t1 = addMinutos(t0, RND.int(120, 360));
  const t2 = addMinutos(t1, RND.int(30, 90));
  return {
    estado: 'COMPLETADO',
    fecha_inicio: isoOffset(t0),
    fecha_fin: isoOffset(t2),
    subeventos: [
      { nombre: 'Facturacion', fecha: isoOffset(t0), estado: 'COMPLETADO' },
      {
        nombre: 'Ingreso de unidad',
        fecha: isoOffset(t1),
        estado: 'COMPLETADO',
        detalle: { placa: `${String.fromCharCode(65 + RND.int(0, 25))}${String.fromCharCode(65 + RND.int(0, 25))}${String.fromCharCode(65 + RND.int(0, 25))}-${pad(RND.int(100, 999), 3)}` },
      },
      { nombre: 'Despacho confirmado', fecha: isoOffset(t2), estado: 'COMPLETADO' },
    ],
    fin: t2,
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
  const agenciaAduana = RND.pick(AGENCIAS_ADUANA);

  const eta = new Date(vueloShared.eta);

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
      fecha: isoOffset(eta).slice(0, 10),
      tipo_vuelo: vueloShared.tipoVuelo,
      tipo: 'COMERCIAL',
      consignatario_id: 'CLI-TEMU',
      agente_carga: agente,
      warehouse: `300476839${pad(RND.int(10000, 99999), 5)}`,
      tipo_almacenamiento: 'GENERAL',
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
      fecha: isoOffset(eta).slice(0, 10),
      tipo_vuelo: vueloShared.tipoVuelo,
      tipo: 'COMERCIAL',
      consignatario_id: 'CLI-TEMU',
      agente_carga: agente,
      warehouse: `300476839${pad(RND.int(10000, 99999), 5)}`,
      tipo_almacenamiento: 'GENERAL',
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

  // Timeline
  const tRecepcion = buildSubeventosRecepcion(addMinutos(eta, RND.int(10, 30)));
  let tTarja, tAlmacen, tAduanas, tDespacho;

  // Diferencias en tarja (faltan bultos en la guia): solo escenario PARCIAL.
  const diferenciaBultos = escenario === 'PARCIAL' ? RND.int(2, 12) : 0;
  if (diferenciaBultos > 0) {
    bultosRecibidos = bultosEsperados - diferenciaBultos;
    kgsRecibidos = Number((kgsEsperados * (bultosRecibidos / bultosEsperados)).toFixed(2));
  }

  tTarja = buildSubeventosTarja(addMinutos(tRecepcion.fin, RND.int(10, 30)), bultosEsperados, diferenciaBultos);

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
      tAlmacen = buildSubeventosAlmacen(addMinutos(tTarja.fin, 10), kgsRecibidos, canalColor);
      tAduanas = { ...buildSubeventosAduanas(addMinutos(tAlmacen.fin, 10)), estado: 'EN_CURSO', fecha_fin: null };
      tAduanas.subeventos[1] = { nombre: 'Emision volante', fecha: null, estado: 'PENDIENTE' };
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

  return {
    id,
    awb: awbCode(),
    vuelo: vueloShared.vuelo,
    manifiesto: vueloShared.manifiesto,
    aerolinea: aero.nombre,
    origen,
    destino: 'LIM',
    eta: isoOffset(eta),
    fecha: isoOffset(eta).slice(0, 10),
    tipo_vuelo: vueloShared.tipoVuelo,
    tipo: 'COMERCIAL',
    consignatario_id: 'CLI-TEMU',
    agente_carga: agente,
    warehouse: `300476839${pad(RND.int(10000, 99999), 5)}`,
    tipo_almacenamiento: 'GENERAL',
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
  if (vuelo.escenarioVuelo === 'AYER_MIX') {
    const r = Math.random();
    if (r < 0.60) return 'DESPACHADO_A_ESEER';
    if (r < 0.70) return 'EN_PROCESO';
    if (r < 0.79) return 'PARCIAL';
    if (r < 0.87) return 'INMOVILIZACION';
    if (r < 0.95) return 'MAL_ESTADO';
    return 'GUIA_FALTANTE';
  }
  // Pasados antiguos: mayoria despachados, con algunas alertas residuales
  const r = Math.random();
  if (r < 0.80) return 'DESPACHADO_A_ESEER';
  if (r < 0.86) return 'PARCIAL';
  if (r < 0.93) return 'INMOVILIZACION';
  if (r < 0.97) return 'MAL_ESTADO';
  return 'GUIA_FALTANTE';
}

/**
 * 10 vuelos fijos: 1 mañana (planificado), 1 hoy (en proceso), 8 pasados.
 * 3 LATAM en dias alternos (hace 2, 4 y 6 dias) — el resto ATLAS.
 */
function generarVuelos10() {
  const PLAN = [
    { diaOffset:  1, aero: ATLAS, hora: [10, 30], esc: 'PLANIFICADO',   origen: 'MIA' },
    { diaOffset:  0, aero: ATLAS, hora: [ 4, 15], esc: 'EN_PROCESO_HOY', origen: 'MIA' },
    { diaOffset: -1, aero: ATLAS, hora: [ 5,  0], esc: 'AYER_MIX',        origen: 'JFK' },
    { diaOffset: -2, aero: LATAM, hora: [22, 40], esc: null,             origen: 'PVG' },
    { diaOffset: -3, aero: ATLAS, hora: [ 3, 20], esc: null,             origen: 'MIA' },
    { diaOffset: -4, aero: LATAM, hora: [22, 15], esc: null,             origen: 'HKG' },
    { diaOffset: -5, aero: ATLAS, hora: [ 4, 45], esc: null,             origen: 'LAX' },
    { diaOffset: -6, aero: LATAM, hora: [22,  0], esc: null,             origen: 'PVG' },
    { diaOffset: -7, aero: ATLAS, hora: [ 3, 50], esc: null,             origen: 'MIA' },
    { diaOffset: -8, aero: ATLAS, hora: [ 5, 20], esc: null,             origen: 'JFK' },
  ];

  return PLAN.map((p, i) => {
    const eta = new Date(HOY.getTime() + p.diaOffset * 24 * 60 * 60 * 1000);
    eta.setHours(p.hora[0], p.hora[1], 0, 0);
    return {
      aero: p.aero,
      vuelo: `${p.aero.code} ${pad(RND.int(100, 9999), 4)}`,
      manifiesto: `2026-${pad(20100 + i * 7, 5)}`,
      origen: p.origen,
      eta,
      tipoVuelo: p.aero.code === '5Y' ? 'CAO' : RND.pick(['PAX', 'CAO']),
      cantidadAwbs: RND.int(8, 14),
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
    for (let j = 0; j < v.cantidadAwbs; j++) {
      awbs.push(generarAwb(i, escenarioParaVuelo(v), alertas, v));
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
