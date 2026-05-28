/**
 * Agrega 2 vuelos de COPA AIRLINES con carga ligera (<2000kg) y 5-7 guías
 * cada uno. Ambos en la ventana "ayer y hoy" para que aparezcan en el
 * filtro por defecto del tablero.
 *
 *   CM 0145 — manifiesto 2026-20300 — hoy (anchor 2026-05-08), en proceso
 *   CM 0125 — manifiesto 2026-20301 — ayer (anchor 2026-05-07), despachado
 *
 * Ruta: PTY (Panama) → LIM. Pesos individuales 200-400kg por guía.
 *
 * Idempotente: borra AWBs previos con id "AWB-COPA-*" antes de agregar.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'courier_data.json');

const SHIPPERS = [
  'WHALECO INC.',
  'TEMU FULFILLMENT CENTER - GUANGZHOU',
  'PDD EXPORT LOGISTICS CO. LTD',
  'SHENZHEN GLOBAL FORWARDING CO.',
];
const AGENTES = [
  'GAMARRA AIR CARGO Y CIA S.A.C.',
  'SCHARFF LOGISTICA INTEGRADA S.A.',
  'TRANSBER S.A.C.',
  'IFB INTERNATIONAL FREIGHT S.A.C.',
];
const CONSIGNATARIOS = ['CLI-SERHAFEN', 'CLI-FEDEX', 'CLI-TEMU'];

const VUELOS = [
  {
    manifiesto: '2026-20300',
    vuelo: 'CM 0145',
    fecha: '2026-05-08',
    etaIso: '2026-05-08T04:30:00-05:00',
    ataIso: '2026-05-08T04:25:00-05:00',
    salidaIso: '2026-05-07T23:10:00-05:00',
    matricula: 'HP-1854CMP',
    capitan: 'Ricardo Vargas Saenz',
    identidad: 'PAS-440182',
    fechaNumeracion: '2026-05-04T05:30:00-05:00',
    fechaIncorporacion: '2026-05-07T11:30:00-05:00',
    fechaEmision: '2026-05-05T06:20:00-05:00',
    guias: [
      { peso: 285.3, bultos: 18, status: 'FACTURACION'        },
      { peso: 320.7, bultos: 22, status: 'FACTURACION'        },
      { peso: 240.4, bultos: 14, status: 'DESPACHO_CON_TURNO' },
      { peso: 195.2, bultos: 12, status: 'DESPACHO_CON_TURNO' },
      { peso: 310.1, bultos: 19, status: 'DESPACHADO'         },
      { peso: 270.8, bultos: 16, status: 'DESPACHADO'         },
    ],
  },
  {
    manifiesto: '2026-20301',
    vuelo: 'CM 0125',
    fecha: '2026-05-07',
    etaIso: '2026-05-07T03:15:00-05:00',
    ataIso: '2026-05-07T03:20:00-05:00',
    salidaIso: '2026-05-06T21:50:00-05:00',
    matricula: 'HP-1729CMP',
    capitan: 'Fernando Quispe Tito',
    identidad: 'PAS-380721',
    fechaNumeracion: '2026-05-03T04:10:00-05:00',
    fechaIncorporacion: '2026-05-06T09:45:00-05:00',
    fechaEmision: '2026-05-04T05:40:00-05:00',
    guias: [
      { peso: 220.5, bultos: 14, status: 'DESPACHADO' },
      { peso: 380.2, bultos: 25, status: 'DESPACHADO' },
      { peso: 290.6, bultos: 18, status: 'DESPACHADO' },
      { peso: 195.0, bultos: 12, status: 'DESPACHADO' },
      { peso: 410.7, bultos: 28, status: 'DESPACHADO' },
    ],
  },
];

function awbNumero(seq) {
  // Prefijo IATA real de COPA: 230. Sufijo 8 dígitos.
  const sufijo = String(70000000 + seq).padStart(8, '0');
  return `230-${sufijo}`;
}

function tIso(dia, h, m) {
  return `${dia}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-05:00`;
}

function shiftMin(iso, mins) {
  const d = new Date(iso);
  d.setUTCMinutes(d.getUTCMinutes() + mins);
  return d.toISOString();
}

function buildTimeline(g, vuelo, idx) {
  // Pivot horario: las primeras 3 actividades (aerolinea -> recepcion -> tarja
  // -> almacenamiento -> aduanas) corren entre el ATA del vuelo y +4h aprox.
  // Cada guía se desfasa ~6min entre sí para que no queden hits idénticos.
  const desfaseMin = idx * 6;
  const recIni  = shiftMin(vuelo.ataIso, 10 + desfaseMin);
  const recFin  = shiftMin(recIni, 25);
  const tarIni  = shiftMin(recFin, 10);
  const tarFin  = shiftMin(tarIni, 60);
  const alIni   = shiftMin(tarFin, 5);
  const alFin   = shiftMin(alIni, 100);
  const adIni   = shiftMin(alFin, 6);
  const adVol   = shiftMin(adIni, 3);
  const adAviso = shiftMin(adVol, 1);
  const fac1    = shiftMin(adAviso, 12);
  const fac2    = shiftMin(fac1, 25);
  const desTurno = shiftMin(fac2, 40);
  const desIngreso = shiftMin(desTurno, 90);
  const desEstiba = shiftMin(desIngreso, 30);
  const desEntrega = shiftMin(desEstiba, 70);

  const completarHasta = {
    FACTURACION:         'facturacion',
    DESPACHO_CON_TURNO:  'turno',
    DESPACHADO:          'entrega',
  }[g.status];

  const f = {
    aerolinea: {
      estado: 'COMPLETADO',
      fecha_inicio: vuelo.fechaNumeracion,
      fecha_fin:    vuelo.fechaIncorporacion,
      subeventos: [
        { nombre: 'Numeracion de Manifiesto', estado: 'COMPLETADO', fecha: vuelo.fechaNumeracion },
        { nombre: 'Incorporacion de guia',    estado: 'COMPLETADO', fecha: vuelo.fechaIncorporacion },
      ],
    },
    recepcion: {
      estado: 'COMPLETADO',
      fecha_inicio: recIni,
      fecha_fin: recFin,
      subeventos: [
        { nombre: 'Generacion de turno', fecha: recIni, estado: 'COMPLETADO' },
        { nombre: 'En dique',            fecha: shiftMin(recIni, 10), estado: 'COMPLETADO' },
        { nombre: 'Inspeccion visual',   fecha: recFin, estado: 'COMPLETADO' },
      ],
    },
    tarja: {
      estado: 'COMPLETADO',
      fecha_inicio: tarIni,
      fecha_fin: tarFin,
      subeventos: [
        { nombre: 'Inicio tarja',           fecha: tarIni, estado: 'COMPLETADO' },
        { nombre: 'Conteo de bultos',       fecha: shiftMin(tarIni, 35), estado: 'COMPLETADO', detalle: { contados: g.bultos, esperados: g.bultos } },
        { nombre: 'Diferencias detectadas', fecha: tarFin, estado: 'COMPLETADO', detalle: { diferencias: 0 } },
      ],
    },
    almacenamiento: {
      estado: 'COMPLETADO',
      fecha_inicio: alIni,
      fecha_fin: alFin,
      dias_estadia: 0,
      subeventos: [
        { nombre: 'Estadia de carga',    fecha: alIni, estado: 'COMPLETADO' },
        { nombre: 'Pesado',              fecha: shiftMin(alIni, 50), estado: 'COMPLETADO', detalle: { kgs: g.peso } },
        { nombre: 'Asignacion de canal', fecha: alFin, estado: 'COMPLETADO', detalle: { canal: 'VERDE' } },
      ],
    },
    aduanas: {
      estado: 'COMPLETADO',
      fecha_inicio: adIni,
      fecha_fin: adAviso,
      subeventos: [
        { nombre: 'Transmision de descarga de mercancia', fecha: adIni,   estado: 'COMPLETADO' },
        { nombre: 'Emision de volante',                   fecha: adVol,   estado: 'COMPLETADO' },
        { nombre: 'Aviso de llegada',                     fecha: adAviso, estado: 'COMPLETADO' },
      ],
    },
    despacho_eseer: {
      estado: completarHasta === 'entrega' ? 'COMPLETADO' : 'EN_CURSO',
      fecha_inicio: fac1,
      subeventos: [
        { nombre: 'Facturacion handling',         fecha: fac1, estado: 'COMPLETADO' },
        { nombre: 'Facturacion traslado postal',  fecha: fac2, estado: 'COMPLETADO' },
        completarHasta === 'facturacion'
          ? { nombre: 'Generacion de turno',      estado: 'PENDIENTE' }
          : { nombre: 'Generacion de turno',      fecha: desTurno, estado: 'COMPLETADO' },
        completarHasta === 'facturacion' || completarHasta === 'turno'
          ? { nombre: 'Ingreso de transportista', estado: 'PENDIENTE' }
          : { nombre: 'Ingreso de transportista', fecha: desIngreso, estado: 'COMPLETADO', detalle: { placa: 'B7K-921' } },
        completarHasta === 'entrega'
          ? { nombre: 'Inicio de estiba',         fecha: desEstiba, estado: 'COMPLETADO' }
          : { nombre: 'Inicio de estiba',         estado: 'PENDIENTE' },
        completarHasta === 'entrega'
          ? { nombre: 'Entrega de carga',         fecha: desEntrega, estado: 'COMPLETADO' }
          : { nombre: 'Entrega de carga',         estado: 'PENDIENTE' },
      ],
    },
  };

  if (completarHasta === 'entrega') {
    f.despacho_eseer.fecha_fin = desEntrega;
  }
  return f;
}

function buildAwb(vuelo, g, idx, seq) {
  const consignatarioId = CONSIGNATARIOS[idx % CONSIGNATARIOS.length];
  const agente = AGENTES[idx % AGENTES.length];
  const shipper = SHIPPERS[idx % SHIPPERS.length];
  const status = g.status === 'DESPACHADO'
    ? 'DESPACHADO_A_ESEER'
    : 'EN_PROCESO';

  return {
    id: `AWB-COPA-${seq}`,
    awb: awbNumero(seq * 13 + idx * 7),
    vuelo: vuelo.vuelo,
    manifiesto: vuelo.manifiesto,
    aerolinea: 'COPA AIRLINES',
    origen: 'PTY',
    destino: 'LIM',
    eta: vuelo.etaIso,
    fecha_salida_origen: vuelo.salidaIso,
    matricula: vuelo.matricula,
    fecha: vuelo.fecha,
    tipo_vuelo: 'PAX',
    tipo: 'COMERCIAL',
    consignatario_id: consignatarioId,
    agente_carga: agente,
    warehouse: `30047${String(700000 + seq * 31 + idx).padStart(9, '0')}`,
    tipo_almacenamiento: 'COURIER BAGS',
    shipper,
    fecha_emision: vuelo.fechaEmision,
    manifiesto_carga: {
      numero_manifiesto: vuelo.manifiesto,
      codigo_transportista: 'CM',
      capitan: vuelo.capitan,
      identidad_capitan: vuelo.identidad,
      matricula: vuelo.matricula,
      tipo_medio_transporte: '251Y',
      puerto_zarpe: 'PAPTY',
      tipo_lugar_descarga: '88',
      lugar_descarga: '3507',
      puerto_intermedio: null,
      fecha_zarpe: vuelo.salidaIso,
      fecha_zarpe_intermedio: null,
      fecha_estimada_llegada: vuelo.etaIso,
      fecha_numeracion: vuelo.fechaNumeracion,
      fecha_incorporacion_guias: vuelo.fechaIncorporacion,
    },
    volante: `VOL-2026-${30000 + seq * 17 + idx}`,
    handling_pagado: true,
    bultos_esperados: g.bultos,
    bultos_recibidos: g.bultos,
    kgs_esperados: g.peso,
    kgs_recibidos: g.peso,
    bultos_mal_estado: 0,
    bultos_faltantes: 0,
    tarja_porcentaje: 100,
    status,
    dam: `230-26-S6I-0${String(20000 + seq * 7 + idx).padStart(5, '0')}-54-617`,
    canal_dam: {
      numero: `2302651${String(80000 + seq * 11 + idx).padStart(6, '0')}`,
      color: 'VERDE',
      con_levante: true,
      agencia_aduana: 'BEAGLE AGENCIA DE ADUANA S.A.',
    },
    alertas_activas_ids: [],
    timeline: buildTimeline(g, vuelo, idx),
  };
}

function run() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  // Idempotencia: limpia corridas previas.
  const previos = data.awb_masters.filter((a) => (a.id || '').startsWith('AWB-COPA-')).length;
  data.awb_masters = data.awb_masters.filter((a) => !(a.id || '').startsWith('AWB-COPA-'));

  let seq = 0;
  let creados = 0;
  for (const vuelo of VUELOS) {
    vuelo.guias.forEach((g, idx) => {
      seq++;
      data.awb_masters.push(buildAwb(vuelo, g, idx, seq));
      creados++;
    });
  }

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  const totalKgs = VUELOS.map((v) =>
    v.guias.reduce((s, g) => s + g.peso, 0).toFixed(1),
  );
  console.log(`COPA AWBs: borrados ${previos}, creados ${creados}.`);
  VUELOS.forEach((v, i) => {
    console.log(`  ${v.vuelo} (${v.manifiesto}) — ${v.fecha} — ${v.guias.length} guías · ${totalKgs[i]} kg`);
  });
}

run();
