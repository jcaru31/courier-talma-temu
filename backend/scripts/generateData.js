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
const TOTAL = 250;

const AEROLINEAS = [
  { code: 'LA', nombre: 'LATAM AIRLINES', short: 'LATAM' },
  { code: '5Y', nombre: 'ATLAS AIR INC.', short: 'ATLAS' },
  { code: 'IB', nombre: 'IBERIA LINEAS AEREAS', short: 'IBERIA' },
];

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
  const t1 = addMinutos(t0, RND.int(20, 40));
  const t2 = addMinutos(t1, RND.int(30, 90));
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
  const t1 = addMinutos(t0, RND.int(60, 120));
  const t2 = addMinutos(t1, RND.int(15, 45));
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
  const t1 = addMinutos(t0, RND.int(60, 180));
  const t2 = addMinutos(t1, RND.int(120, 480));
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
  let canalColor = RND.bool(0.7) ? 'VERDE' : (RND.bool(0.7) ? 'ROJO' : 'NARANJA');
  let conLevante = canalColor === 'VERDE';
  let canalNumero = `23526510${pad(RND.int(10000, 99999), 5)}`;

  let alertaIds = [];

  // Timeline
  const tRecepcion = buildSubeventosRecepcion(addMinutos(eta, RND.int(10, 30)));
  let tTarja, tAlmacen, tAduanas, tDespacho;

  // Diferencias en tarja para INMOVILIZACION
  const diferenciaBultos = escenario === 'INMOVILIZACION' ? RND.int(2, 8) : 0;
  if (diferenciaBultos > 0) {
    bultosRecibidos = bultosEsperados - diferenciaBultos;
    kgsRecibidos = Number((kgsEsperados * (bultosRecibidos / bultosEsperados)).toFixed(2));
  }

  tTarja = buildSubeventosTarja(addMinutos(tRecepcion.fin, RND.int(10, 30)), bultosEsperados, diferenciaBultos);

  if (escenario === 'INMOVILIZACION') {
    // Se queda en almacenamiento, sin canal
    canalColor = 'NARANJA';
    conLevante = false;
    canalNumero = null;
    tAlmacen = {
      estado: 'EN_CURSO',
      fecha_inicio: isoOffset(addMinutos(tTarja.fin, RND.int(5, 20))),
      fecha_fin: null,
      dias_estadia: RND.int(0, 2),
      subeventos: [
        { nombre: 'Estadia de carga', fecha: isoOffset(addMinutos(tTarja.fin, 10)), estado: 'COMPLETADO' },
        { nombre: 'Pesado', fecha: isoOffset(addMinutos(tTarja.fin, 60)), estado: 'COMPLETADO', detalle: { kgs: kgsRecibidos } },
        { nombre: 'Asignacion de canal', fecha: null, estado: 'PENDIENTE' },
      ],
    };
    tAduanas = pendienteEtapa();
    tDespacho = pendienteEtapa();

    const alertaId = `ALR-${pad(alertasOut.length + 1, 3, '0')}`;
    alertaIds.push(alertaId);
    alertasOut.push({
      id: alertaId,
      awb_master_id: id,
      tipo: 'INMOVILIZACION',
      estado: 'ACTIVA',
      numero_acta: `INM-2026-${pad(RND.int(1, 9999), 5)}`,
      fecha_emision: isoOffset(addMinutos(tTarja.fin, 5)),
      fecha_resolucion: null,
      motivo: `Diferencia de ${diferenciaBultos} bultos entre manifiesto (${bultosEsperados}) y carga fisica recibida (${bultosRecibidos}). Inmovilizacion preventiva hasta esclarecimiento.`,
      notificado: RND.bool(0.6),
      notificacion_ids: [],
    });

    // Marcar el subevento de diferencias con el alerta_id
    const diff = tTarja.subeventos.find((s) => s.nombre === 'Diferencias detectadas');
    if (diff && diff.detalle) diff.detalle.alerta_id = alertaId;
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

  return {
    id,
    awb: awbCode(),
    hawb: RND.bool(0.4) ? `0${pad(RND.int(1, 9), 1)}HX${pad(RND.int(10000000, 99999999), 8)}` : null,
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
    tarja_porcentaje: bultosEsperados > 0 ? Math.round((bultosRecibidos / bultosEsperados) * 100) : 0,
    status,
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

function escenarioPara(i) {
  const r = Math.random();
  if (r < 0.6) return 'DESPACHADO_A_ESEER';
  if (r < 0.78) return 'EN_PROCESO';
  if (r < 0.88) return 'ACE';
  if (r < 0.95) return 'INMOVILIZACION';
  return 'MAL_ESTADO';
}

function generarVuelos(targetTotalAwbs) {
  const vuelos = [];
  const hoy = new Date('2026-05-08T12:00:00-05:00');
  let awbsAcumulados = 0;
  let vueloIdx = 0;

  while (awbsAcumulados < targetTotalAwbs) {
    const aero = RND.pick(AEROLINEAS);
    const diasAtras = RND.int(0, 7);
    const eta = new Date(hoy.getTime() - diasAtras * 24 * 60 * 60 * 1000);
    eta.setHours(RND.int(0, 23), RND.int(0, 59), RND.int(0, 59));

    const cantidadAwbs = RND.int(5, 15);
    const restantes = targetTotalAwbs - awbsAcumulados;
    const finalCantidad = Math.min(cantidadAwbs, restantes);

    vuelos.push({
      aero,
      vuelo: `${aero.code} ${pad(RND.int(100, 9999), 4)}`,
      manifiesto: `2026-${pad(RND.int(10000, 99999), 5)}`,
      origen: RND.pick(ORIGENES),
      eta,
      tipoVuelo: RND.bool(0.7) ? 'PAX' : 'CAO',
      cantidadAwbs: finalCantidad,
    });
    awbsAcumulados += finalCantidad;
    vueloIdx++;
  }

  return vuelos;
}

function main() {
  const awbs = [];
  const alertas = [];

  const vuelos = generarVuelos(TOTAL);
  let i = 1;
  for (const v of vuelos) {
    for (let j = 0; j < v.cantidadAwbs; j++) {
      awbs.push(generarAwb(i, escenarioPara(i), alertas, v));
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
