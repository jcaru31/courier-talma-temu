/**
 * Agrega AWBs por vuelo y calcula metricas para Vista 1 (lista vuelos)
 * y Vista 2 (detalle vuelo con mini-trazabilidad).
 */

function pasoAerolinea() {
  // La aerolinea numera el manifiesto e incorpora las guias antes del vuelo.
  // Toda guia que existe en el sistema ya fue incorporada al manifiesto.
  return true;
}
function pasoRecepcion(awb) {
  // El hito Recepcion abarca la llegada al almacen y el termino de tarja.
  return awb.timeline?.tarja?.estado === 'COMPLETADO';
}
function pasoTransmisiones(awb) {
  // Emision de volante + transmision de descarga + aviso de llegada.
  return awb.timeline?.aduanas?.estado === 'COMPLETADO';
}
function pasoFacturacion(awb) {
  const subs = awb.timeline?.despacho_eseer?.subeventos || [];
  return subs.some((s) => /facturacion/i.test(s.nombre) && s.estado === 'COMPLETADO');
}
function pasoDespacho(awb) {
  return awb.timeline?.despacho_eseer?.estado === 'COMPLETADO';
}

const ETAPAS = [
  { key: 'aerolinea', label: 'Trasmisión Aerolínea', test: pasoAerolinea },
  { key: 'recepcion', label: 'Recepción', test: pasoRecepcion },
  { key: 'transmisiones', label: 'Trasmisión Almacén', test: pasoTransmisiones },
  { key: 'facturacion', label: 'Facturación', test: pasoFacturacion },
  { key: 'despacho', label: 'Despacho', test: pasoDespacho },
];

function calcularTrazabilidad(awbs) {
  // Trasmision Aerolinea cubre TODAS las guias manifestadas: la aerolinea las
  // incorpora al manifiesto antes del vuelo y en ese punto aun no se sabe cuales
  // arribaran. Por eso los faltantes SI cuentan aqui (11/11), y recien al
  // "cerrarse" la recepcion salen del denominador.
  const totalManifestadas = awbs.length;

  // De Recepcion en adelante los faltantes se excluyen: nunca llegaron al
  // almacen, no participan del resto del proceso y distorsionarian el avance.
  const efectivos = awbs.filter((a) => a.status !== 'GUIA_FALTANTE');
  const totalEfectivos = efectivos.length;

  return ETAPAS.map((etapa) => {
    if (etapa.key === 'aerolinea') {
      // pasoAerolinea() es true para toda guia manifestada (incluye faltantes).
      return {
        key: etapa.key,
        label: etapa.label,
        completados: awbs.filter(etapa.test).length,
        total: totalManifestadas,
      };
    }
    return {
      key: etapa.key,
      label: etapa.label,
      completados: efectivos.filter(etapa.test).length,
      total: totalEfectivos,
    };
  });
}

const SLA_THRESHOLD_MIN = 5 * 60 + 30; // 5h 30m

// Para demo: "ahora" simulado en lugar de Date.now() real. Lo dejo cercano al
// limite SLA del vuelo de hoy para que el cronometro se vea trabajando.
// "Ahora" del demo: solo el DÍA cambia con el shift; la hora-del-día se
// mantiene fija (REF_HOUR en utils/time.js) para que los countdowns sean
// estables y no dependan del reloj real del usuario.
const { peruNow } = require('./time');
const ahora = peruNow;

/**
 * SLA = fin de la ultima transmision - ATA
 *  - ATA = arribo del primer AWB (inicio de recepcion)
 *  - fin_transmisiones = ultimo subevento "Transmision manifiesto" COMPLETADO
 *  - Si todos los AWBs (excepto faltantes) tienen transmision completada -> SLA fijo
 *  - Si aun no: cronometro corriendo (frontend hace tick)
 *  - Si > 330 min -> SLA fail
 */
function calcularSlaVuelo(awbs) {
  const efectivos = awbs.filter(
    (a) => a.status !== 'PLANIFICADO' && a.status !== 'GUIA_FALTANTE'
  );

  if (efectivos.length === 0) {
    return {
      ata: null,
      fin_transmisiones: null,
      sla_minutos: null,
      threshold_minutos: SLA_THRESHOLD_MIN,
      status: 'NA',
      corriendo: false,
    };
  }

  let ata = null;
  for (const awb of efectivos) {
    const inicio = awb.timeline?.recepcion?.fecha_inicio;
    if (inicio && (!ata || new Date(inicio) < new Date(ata))) ata = inicio;
  }
  if (!ata) {
    return {
      ata: null,
      fin_transmisiones: null,
      sla_minutos: null,
      threshold_minutos: SLA_THRESHOLD_MIN,
      status: 'NA',
      corriendo: false,
    };
  }

  let conTransmision = 0;
  let finTransmisiones = null;
  for (const awb of efectivos) {
    const subs = awb.timeline?.aduanas?.subeventos || [];
    const trans = subs.find(
      (s) => /transmision/i.test(s.nombre) && s.estado === 'COMPLETADO' && s.fecha
    );
    if (trans) {
      conTransmision++;
      if (!finTransmisiones || new Date(trans.fecha) > new Date(finTransmisiones)) {
        finTransmisiones = trans.fecha;
      }
    }
  }

  const completo = conTransmision === efectivos.length;
  const minutosEntre = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
  const sla_minutos = completo
    ? minutosEntre(ata, finTransmisiones)
    : minutosEntre(ata, ahora().toISOString());

  let status;
  if (completo) {
    status = sla_minutos <= SLA_THRESHOLD_MIN ? 'OK' : 'FAIL';
  } else {
    if (sla_minutos > SLA_THRESHOLD_MIN) status = 'FAIL';
    else if (sla_minutos > SLA_THRESHOLD_MIN * 0.85) status = 'WARN';
    else status = 'OK';
  }

  return {
    ata,
    fin_transmisiones: completo ? finTransmisiones : null,
    sla_minutos,
    threshold_minutos: SLA_THRESHOLD_MIN,
    status,
    corriendo: !completo,
  };
}

/**
 * Estado de la guía = el hito que está trabajando AHORA (el primero que aún
 * no termina). La guía se considera MANIFESTADO hasta el fin de tarja
 * (recepción). Al completar el último hito (Despacho / entrega de carga) el
 * estado terminal es ENTREGADA — distinto de "en Despacho". Caso especial:
 * FALTANTE.
 */
function determinarEstadoTracking(awb) {
  if (awb.status === 'GUIA_FALTANTE') return 'FALTANTE';
  if (!pasoRecepcion(awb)) return 'MANIFESTADO';
  if (!pasoTransmisiones(awb)) return 'TRANSMISIONES';
  if (!pasoFacturacion(awb)) return 'FACTURACION';
  if (!pasoDespacho(awb)) return 'DESPACHO';
  return 'ENTREGADA';
}

const AEROLINEA_SHORT = {
  'LATAM AIRLINES': 'LATAM',
  'ATLAS AIR INC.': 'ATLAS',
  'IBERIA LINEAS AEREAS': 'IBERIA',
};

function shortName(aerolinea) {
  return AEROLINEA_SHORT[aerolinea] || (aerolinea ? aerolinea.split(' ')[0] : '—');
}

/**
 * Estado de la aeronave en ruta hacia LIM, calculado contra el reloj real:
 *   PROGRAMADO  — aun no despega del origen
 *   EN_VUELO    — despego pero no ha aterrizado (incluye progreso 0-100)
 *   ATERRIZADO  — ya arribo a LIM
 */
function calcularEstadoRuta(salidaIso, etaIso) {
  if (!salidaIso || !etaIso) {
    return { estado: 'ATERRIZADO', progreso: 100, minutos_para_arribo: 0 };
  }
  const salida = new Date(salidaIso);
  const eta = new Date(etaIso);
  const now = ahora();
  if (now < salida) {
    return { estado: 'PROGRAMADO', progreso: 0, minutos_para_arribo: Math.round((eta - now) / 60000) };
  }
  if (now >= eta) {
    return { estado: 'ATERRIZADO', progreso: 100, minutos_para_arribo: 0 };
  }
  const progreso = Math.round(((now - salida) / (eta - salida)) * 100);
  return {
    estado: 'EN_VUELO',
    progreso: Math.min(100, Math.max(0, progreso)),
    minutos_para_arribo: Math.round((eta - now) / 60000),
  };
}

function agruparPorVuelo(awbs, alertas) {
  const mapa = new Map();
  for (const awb of awbs) {
    const key = awb.manifiesto;
    if (!mapa.has(key)) {
      mapa.set(key, {
        manifiesto: awb.manifiesto,
        vuelo: awb.vuelo,
        aerolinea: awb.aerolinea,
        aerolinea_short: shortName(awb.aerolinea),
        origen: awb.origen,
        destino: awb.destino,
        eta: awb.eta,
        fecha_salida_origen: awb.fecha_salida_origen || null,
        matricula: awb.matricula || null,
        manifiesto_carga: awb.manifiesto_carga || null,
        fecha: awb.fecha,
        tipo_vuelo: awb.tipo_vuelo || 'PAX',
        awbs: [],
      });
    }
    mapa.get(key).awbs.push(awb);
  }

  const alertasPorAwb = (awbId) =>
    alertas.filter((a) => a.awb_master_id === awbId && a.estado === 'ACTIVA');

  return Array.from(mapa.values()).map((v) => {
    const totalAwbs = v.awbs.length;
    const bultosEsperados = v.awbs.reduce((s, a) => s + (a.bultos_esperados || 0), 0);
    const bultosRecibidos = v.awbs.reduce((s, a) => s + (a.bultos_recibidos || 0), 0);
    const kgsEsperados = v.awbs.reduce((s, a) => s + (a.kgs_esperados || 0), 0);
    const kgsRecibidos = v.awbs.reduce((s, a) => s + (a.kgs_recibidos || 0), 0);
    const bultosMalEstadoTotal = v.awbs.reduce((s, a) => s + (a.bultos_mal_estado || 0), 0);
    const bultosFaltantesTotal = v.awbs.reduce((s, a) => s + (a.bultos_faltantes || 0), 0);

    // Reglas de clasificacion (alineadas con la UI):
    //  faltante  : status === 'GUIA_FALTANTE'
    //  parcial   : bultos_faltantes > 0 y NO es faltante (parcial != totalmente faltante)
    //  inmov     : canal_dam.color === 'ROJO' && !canal_dam.con_levante
    //  mal_estado: bultos_mal_estado > 0
    const esFaltante = (a) => a.status === 'GUIA_FALTANTE';
    const esParcial  = (a) => !esFaltante(a) && (a.bultos_faltantes || 0) > 0;
    const esInmov    = (a) => a.canal_dam?.color === 'ROJO' && a.canal_dam?.con_levante === false;
    const esMalEst   = (a) => (a.bultos_mal_estado || 0) > 0;

    const guiasFaltantes  = v.awbs.filter(esFaltante).length;
    const guiasParciales  = v.awbs.filter(esParcial).length;
    const conInmov        = v.awbs.filter(esInmov).length;
    const conMalEstado    = v.awbs.filter(esMalEst).length;

    // ULDs: proxy ~ ceil(bultos / 200) — un ULD courier promedio
    const uldEstimados = bultosEsperados > 0 ? Math.max(1, Math.ceil(bultosEsperados / 200)) : 0;
    const uldRecibidos = bultosRecibidos > 0 ? Math.max(1, Math.ceil(bultosRecibidos / 200)) : 0;

    const transmisionAwbs = v.awbs.filter(pasoTransmisiones).length;

    // Status agregado del vuelo (ignora faltantes que no participan del proceso)
    const statuses = new Set(v.awbs.filter((a) => a.status !== 'GUIA_FALTANTE').map((a) => a.status));
    let status_vuelo;
    if (statuses.size === 0 || (statuses.size === 1 && statuses.has('PLANIFICADO'))) {
      status_vuelo = 'PLANIFICADO';
    } else if (statuses.size === 1 && statuses.has('DESPACHADO_A_ESEER')) {
      status_vuelo = 'DESPACHADO';
    } else {
      status_vuelo = 'EN_PROCESO';
    }
    const esPlanificado = status_vuelo === 'PLANIFICADO';

    return {
      status_vuelo,
      manifiesto: v.manifiesto,
      vuelo: v.vuelo,
      aerolinea: v.aerolinea,
      aerolinea_short: v.aerolinea_short,
      origen: v.origen,
      destino: v.destino,
      eta: v.eta,
      fecha_salida_origen: v.fecha_salida_origen,
      matricula: v.matricula,
      manifiesto_carga: v.manifiesto_carga,
      estado_ruta: calcularEstadoRuta(v.fecha_salida_origen, v.eta),
      fecha: v.fecha,
      tipo_vuelo: v.tipo_vuelo,
      trazabilidad: calcularTrazabilidad(v.awbs),
      total_awbs: totalAwbs,
      bultos_esperados: bultosEsperados,
      bultos_recibidos: bultosRecibidos,
      bultos_mal_estado: bultosMalEstadoTotal,
      bultos_faltantes: bultosFaltantesTotal,
      kgs_esperados: Math.round(kgsEsperados * 100) / 100,
      kgs_recibidos: Math.round(kgsRecibidos * 100) / 100,
      avance_bultos_pct: bultosEsperados > 0 ? Math.round((bultosRecibidos / bultosEsperados) * 100) : 0,
      transmision_pct: totalAwbs > 0 ? Math.round((transmisionAwbs / totalAwbs) * 100) : 0,
      uld_recibidos: uldRecibidos,
      uld_esperados: uldEstimados,
      guias_parciales: guiasParciales,
      guias_con_inmov: conInmov,
      guias_con_mal_estado: conMalEstado,
      guias_faltantes: guiasFaltantes,
      sla_ok: esPlanificado ? null : (guiasParciales === 0 && conInmov === 0 && guiasFaltantes === 0),
      sla: calcularSlaVuelo(v.awbs),
    };
  });
}

function detalleVuelo(awbs, alertas, manifiesto, clientes = []) {
  const delVuelo = awbs.filter((a) => a.manifiesto === manifiesto);
  if (delVuelo.length === 0) return null;

  const resumen = agruparPorVuelo(delVuelo, alertas)[0];
  const trazabilidad = calcularTrazabilidad(delVuelo);

  // Indice de clientes para resolver el nombre del consignatario por AWB.
  const nombrePorCli = new Map(clientes.map((c) => [c.id, c.nombre]));

  const awbsConEstado = delVuelo.map((a) => {
    const alertasActivas = alertas.filter(
      (al) => al.awb_master_id === a.id && al.estado === 'ACTIVA'
    );
    return {
      ...a,
      consignatario_nombre: nombrePorCli.get(a.consignatario_id) || null,
      alertas_activas: alertasActivas,
      alertas_count: alertasActivas.length,
      estado_tracking: determinarEstadoTracking(a),
      estado_inventario: alertasActivas.find((al) => al.tipo === 'INMOVILIZACION')
        ? 'INMOVILIZADO'
        : alertasActivas.find((al) => al.tipo === 'MAL_ESTADO')
        ? 'MAL_ESTADO'
        : 'OK',
    };
  });

  return {
    ...resumen,
    trazabilidad,
    awbs: awbsConEstado,
  };
}

module.exports = { agruparPorVuelo, detalleVuelo, calcularTrazabilidad, determinarEstadoTracking };
