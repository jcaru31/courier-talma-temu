/**
 * Agrega AWBs por vuelo y calcula metricas para Vista 1 (lista vuelos)
 * y Vista 2 (detalle vuelo con mini-trazabilidad).
 */

// === Lógica de HITO ACTUAL ===
// Una guía está EN un hito cuando la 1ra actividad de ese hito está
// COMPLETADA. No usamos el estado intermedio EN_CURSO de subeventos para
// determinar avance: la regla es binaria (completado / no completado).
// El "HITO ACTUAL" es el más profundo cuya 1ra actividad ya se completó.
function primerSubevCompletado(bucket) {
  const subs = bucket?.subeventos || [];
  return subs[0]?.estado === 'COMPLETADO';
}
function subevCompletadoPorNombre(bucket, regex) {
  const subs = bucket?.subeventos || [];
  return subs.some((s) => regex.test(s.nombre || '') && s.estado === 'COMPLETADO');
}

function inicioAerolinea() {
  // La aerolinea numera el manifiesto e incorpora las guias antes del vuelo.
  // Toda guia que existe en el sistema ya fue incorporada al manifiesto.
  return true;
}
function inicioRecepcion(awb) {
  // Entrada a Recepción = la carga llegó físicamente al almacén
  // (`recepcion.fecha_inicio` registrado). Alineado con la 1ra actividad
  // visible del hito en la vista detalle ("Llegada al almacén").
  return !!awb.timeline?.recepcion?.fecha_inicio;
}
function inicioTransmisiones(awb) {
  // Entrada a Trasmisión Almacén = se transmitió la descarga de mercancía
  // al sistema (1er subevento del bucket `aduanas`). Esto solo puede ocurrir
  // después de terminar la tarja, así que naturalmente requiere Recepción
  // completa. Alineado con la 1ra actividad visible del hito en la vista
  // detalle ("Descarga de Mercancía").
  return subevCompletadoPorNombre(
    awb.timeline?.aduanas,
    /transmision\s*de\s*descarga|descarga\s*de\s*mercancia/i,
  );
}
function inicioFacturacion(awb) {
  // 1ra actividad de Facturación = "Facturacion handling" (1er subevento de
  // `despacho_eseer`).
  return primerSubevCompletado(awb.timeline?.despacho_eseer);
}
function inicioDespacho(awb) {
  // 1ra actividad de Despacho = "Generacion de turno": cuando se genera el
  // turno del transportista (con VCT listo). El "Ingreso de transportista"
  // es la siguiente actividad, no la 1ra — un turno puede estar generado
  // horas antes de que el camión efectivamente entre al almacén.
  return subevCompletadoPorNombre(awb.timeline?.despacho_eseer, /generacion de turno/i);
}
// Última actividad del hito Despacho — entrega física de la carga al courier.
// No es un hito en sí: marca a la guía como entregada (check verde en la UI)
// pero mantiene su HITO ACTUAL = DESPACHO.
function awbEntregada(awb) {
  return subevCompletadoPorNombre(awb.timeline?.despacho_eseer, /entrega de carga/i);
}

const ETAPAS = [
  { key: 'aerolinea',     label: 'Trasmisión Aerolínea' },
  { key: 'recepcion',     label: 'Recepción' },
  { key: 'transmisiones', label: 'Trasmisión Almacén' },
  { key: 'facturacion',   label: 'Facturación' },
  { key: 'despacho',      label: 'Despacho' },
];

// Orden numérico del HITO ACTUAL (matchea el índice en ETAPAS).
const HITO_ORDEN = {
  TRASMISION_AEROLINEA: 0,
  MANIFESTADO:          1, // = en Recepción
  TRANSMISIONES:        2,
  FACTURACION:          3,
  DESPACHO:             4,
};

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

  // Conteo CUMULATIVO: en cada hito sumamos las guías cuyo HITO ACTUAL es ese
  // o uno posterior — están en el hito o ya lo superaron. La regla es la misma
  // que usa la trazabilidad del detalle, así ambos niveles cuadran exactamente.
  const ordenes = efectivos.map((a) => HITO_ORDEN[determinarEstadoTracking(a)] ?? -1);

  return ETAPAS.map((etapa, idx) => {
    if (etapa.key === 'aerolinea') {
      return {
        key: etapa.key,
        label: etapa.label,
        completados: totalManifestadas,
        total: totalManifestadas,
      };
    }
    const completados = ordenes.filter((o) => o >= idx).length;
    return {
      key: etapa.key,
      label: etapa.label,
      completados,
      total: totalEfectivos,
    };
  });
}

// SLA de TALMA: 6h 30min desde ATA para "cerrar" el vuelo (todas las guías
// tarjadas o confirmadas faltantes). Mientras está corriendo la responsabilidad
// es de TALMA; al cerrarse pasa al Courier (gestión documental aguas abajo).
const SLA_THRESHOLD_MIN = 6 * 60 + 30; // 6h 30m
// Si el exceso supera esta ventana, el SLA se da por INCUMPLIDO: el contador
// se congela en +EXCESO_MAX_MIN y deja de acumular, para que vuelos abandonados
// no muestren contadores de +78h o más en el tablero.
const EXCESO_MAX_MIN = 8 * 60; // 8h de exceso

// Para demo: "ahora" simulado en lugar de Date.now() real. La hora-del-día se
// mantiene fija (REF_HOUR en utils/time.js) para que los countdowns sean
// estables y no dependan del reloj real del usuario.
const { peruNow } = require('./time');
const ahora = peruNow;

/**
 * SLA / cierre del vuelo.
 *  - ATA              = arribo del primer AWB no-faltante (inicio de recepción)
 *  - vuelo_cerrado    = todas las guías están tarjadas (timeline.tarja COMPLETADO)
 *                       o son FALTANTE (confirmadas como no recibidas)
 *  - cierre_iso       = max(tarja.fecha_fin) entre las no-faltantes — el momento
 *                       en que TALMA terminó de procesar la última guía
 *  - minutos_transcurridos = (cierre o ahora) − ATA, en minutos
 *  - minutos_restantes = threshold − transcurridos (negativo = excedido)
 *  - responsabilidad  = 'TALMA' mientras no esté cerrado; 'COURIER' al cerrar
 *  - status           = NA | OK | WARN | FAIL
 */
function calcularSlaVuelo(awbs) {
  const noFaltantes = awbs.filter(
    (a) => a.status !== 'PLANIFICADO' && a.status !== 'GUIA_FALTANTE'
  );

  if (noFaltantes.length === 0) {
    return {
      ata: null,
      cierre_iso: null,
      vuelo_cerrado: false,
      responsabilidad: null,
      minutos_transcurridos: null,
      minutos_restantes: null,
      threshold_minutos: SLA_THRESHOLD_MIN,
      status: 'NA',
      corriendo: false,
    };
  }

  let ata = null;
  for (const awb of noFaltantes) {
    const inicio = awb.timeline?.recepcion?.fecha_inicio;
    if (inicio && (!ata || new Date(inicio) < new Date(ata))) ata = inicio;
  }
  if (!ata) {
    return {
      ata: null,
      cierre_iso: null,
      vuelo_cerrado: false,
      responsabilidad: null,
      minutos_transcurridos: null,
      minutos_restantes: null,
      threshold_minutos: SLA_THRESHOLD_MIN,
      status: 'NA',
      corriendo: false,
    };
  }

  // Cierre = todas las no-faltantes terminaron tarja. Para faltantes no se
  // espera tarja: la confirmación es implícita (TALMA reportó que no llegaron).
  let tarjadas = 0;
  let cierreCalc = null;
  for (const awb of noFaltantes) {
    const tarja = awb.timeline?.tarja;
    if (tarja?.estado === 'COMPLETADO' && tarja.fecha_fin) {
      tarjadas++;
      if (!cierreCalc || new Date(tarja.fecha_fin) > new Date(cierreCalc)) {
        cierreCalc = tarja.fecha_fin;
      }
    }
  }
  const vuelo_cerrado = tarjadas === noFaltantes.length;

  const minutosEntre = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
  const minutos_transcurridos = vuelo_cerrado
    ? minutosEntre(ata, cierreCalc)
    : minutosEntre(ata, ahora().toISOString());
  const minutos_restantes = SLA_THRESHOLD_MIN - minutos_transcurridos;
  const minutos_excedidos = Math.max(0, minutos_transcurridos - SLA_THRESHOLD_MIN);

  // INCUMPLIDO: vuelo no cerrado y con más de 8h de exceso. Se da por
  // abandonado en términos de SLA: el contador se congela y la UI debe
  // mostrar el estado terminal "INCUMPLIDO" sin seguir sumando horas.
  const incumplido = !vuelo_cerrado && minutos_excedidos >= EXCESO_MAX_MIN;

  let status;
  if (vuelo_cerrado) {
    status = minutos_transcurridos <= SLA_THRESHOLD_MIN ? 'OK' : 'FAIL';
  } else if (incumplido) {
    status = 'INCUMPLIDO';
  } else if (minutos_transcurridos > SLA_THRESHOLD_MIN) {
    status = 'FAIL';
  } else if (minutos_transcurridos > SLA_THRESHOLD_MIN * 0.85) {
    status = 'WARN';
  } else {
    status = 'OK';
  }

  return {
    ata,
    cierre_iso: vuelo_cerrado ? cierreCalc : null,
    vuelo_cerrado,
    responsabilidad: vuelo_cerrado ? 'COURIER' : 'TALMA',
    minutos_transcurridos,
    minutos_restantes,
    minutos_excedidos,
    threshold_minutos: SLA_THRESHOLD_MIN,
    exceso_max_minutos: EXCESO_MAX_MIN,
    incumplido,
    status,
    // Cronómetro: se detiene si el vuelo cerró o quedó incumplido.
    corriendo: !vuelo_cerrado && !incumplido,
  };
}

/**
 * Estado de la guía = el hito que está trabajando AHORA (el primero que aún
 * no termina). La guía se considera MANIFESTADO hasta el fin de tarja
 * (recepción). Al completar el último hito (Despacho / entrega de carga) el
 * estado terminal es ENTREGADA — distinto de "en Despacho". Caso especial:
 * FALTANTE.
 */
// HITO ACTUAL de la guía: el más profundo cuya 1ra actividad ya se completó.
// La guía entra a un hito en cuanto su 1ra actividad pasa a COMPLETADA — no
// se requiere que el hito anterior esté íntegramente terminado, así como no
// se distingue "en curso" vs "completado" dentro del hito (esa granularidad
// vive en la vista 3 de subeventos). El estado terminal ENTREGADA se eliminó:
// una guía con despacho cerrado sigue teniendo HITO ACTUAL = DESPACHO y se
// marca con el flag `entregada` para mostrar el check verde en la UI.
function determinarEstadoTracking(awb) {
  if (awb.status === 'GUIA_FALTANTE') return 'FALTANTE';
  // Una guía inmovilizada (canal rojo sin levante) no puede pasar a Despacho
  // aunque tenga turno generado: el transportista no la retira hasta que
  // SUNAT libere. Queda anclada en Facturación.
  const inmovilizada =
    awb.canal_dam?.color === 'ROJO' && awb.canal_dam?.con_levante === false;
  if (!inmovilizada && inicioDespacho(awb)) return 'DESPACHO';
  if (inicioFacturacion(awb)) return 'FACTURACION';
  if (inicioTransmisiones(awb)) return 'TRANSMISIONES';
  if (inicioRecepcion(awb)) return 'MANIFESTADO';
  return 'TRASMISION_AEROLINEA';
}

const AEROLINEA_SHORT = {
  'LATAM AIRLINES': 'LATAM',
  'ATLAS AIR INC.': 'ATLAS',
  'IBERIA LINEAS AEREAS': 'IBERIA',
  'COPA AIRLINES': 'COPA',
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
      entregada: awbEntregada(a),
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
