/**
 * Agrega AWBs por vuelo y calcula metricas para Vista 1 (lista vuelos)
 * y Vista 2 (detalle vuelo con mini-trazabilidad).
 */

function pasoTraslado(awb) {
  // Todos los AWBs que existen en sistema implican llegada al terminal
  return true;
}
function pasoRecepcion(awb) {
  return awb.timeline?.recepcion?.estado === 'COMPLETADO';
}
function pasoTarjado(awb) {
  return awb.timeline?.tarja?.estado === 'COMPLETADO';
}
function pasoTransmisiones(awb) {
  const subs = awb.timeline?.aduanas?.subeventos || [];
  return subs.some((s) => /transmision/i.test(s.nombre) && s.estado === 'COMPLETADO');
}
function pasoFacturacion(awb) {
  const subs = awb.timeline?.despacho_eseer?.subeventos || [];
  return subs.some((s) => /facturacion/i.test(s.nombre) && s.estado === 'COMPLETADO');
}
function pasoDespacho(awb) {
  return awb.timeline?.despacho_eseer?.estado === 'COMPLETADO';
}

const ETAPAS = [
  { key: 'traslado', label: 'Traslado', test: pasoTraslado },
  { key: 'recepcion', label: 'Recepcion', test: pasoRecepcion },
  { key: 'tarjado', label: 'Tarjado', test: pasoTarjado },
  { key: 'transmisiones', label: 'Transmisiones', test: pasoTransmisiones },
  { key: 'facturacion', label: 'Facturacion', test: pasoFacturacion },
  { key: 'despacho', label: 'Despacho', test: pasoDespacho },
];

function calcularTrazabilidad(awbs) {
  const total = awbs.length;
  return ETAPAS.map((etapa) => ({
    key: etapa.key,
    label: etapa.label,
    completados: awbs.filter(etapa.test).length,
    total,
  }));
}

function determinarEstadoTracking(awb) {
  if (awb.timeline?.despacho_eseer?.estado === 'COMPLETADO') return 'DESPACHADO';
  if (awb.timeline?.aduanas?.estado === 'COMPLETADO' || awb.timeline?.aduanas?.estado === 'EN_CURSO') return 'ADUANAS';
  if (awb.timeline?.almacenamiento?.estado === 'COMPLETADO' || awb.timeline?.almacenamiento?.estado === 'EN_CURSO') return 'ALMACENAMIENTO';
  if (awb.timeline?.tarja?.estado === 'COMPLETADO' || awb.timeline?.tarja?.estado === 'EN_CURSO') return 'TARJA';
  return 'RECEPCION';
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
        origen: awb.origen,
        destino: awb.destino,
        eta: awb.eta,
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

    const awbsConAlertas = v.awbs.map((a) => ({
      awb: a,
      alertas: alertasPorAwb(a.id),
    }));

    const conAce = awbsConAlertas.filter((x) => x.alertas.some((al) => al.tipo === 'ACE')).length;
    const conInmov = awbsConAlertas.filter((x) => x.alertas.some((al) => al.tipo === 'INMOVILIZACION')).length;
    const conMalEstado = awbsConAlertas.filter((x) => x.alertas.some((al) => al.tipo === 'MAL_ESTADO')).length;

    // ULDs: campo no modelado explicitamente; estimo proxy ~ ceil(bultos / 50)
    const uldEstimados = bultosEsperados > 0 ? Math.max(1, Math.ceil(bultosEsperados / 50)) : 0;
    const uldRecibidos = bultosRecibidos > 0 ? Math.max(1, Math.ceil(bultosRecibidos / 50)) : 0;

    const transmisionAwbs = v.awbs.filter(pasoTransmisiones).length;
    const guiasParciales = v.awbs.filter(
      (a) => a.bultos_recibidos > 0 && a.bultos_recibidos < a.bultos_esperados
    ).length;

    return {
      manifiesto: v.manifiesto,
      vuelo: v.vuelo,
      aerolinea: v.aerolinea,
      origen: v.origen,
      destino: v.destino,
      eta: v.eta,
      fecha: v.fecha,
      tipo_vuelo: v.tipo_vuelo,
      total_awbs: totalAwbs,
      bultos_esperados: bultosEsperados,
      bultos_recibidos: bultosRecibidos,
      kgs_esperados: Math.round(kgsEsperados * 100) / 100,
      kgs_recibidos: Math.round(kgsRecibidos * 100) / 100,
      avance_bultos_pct: bultosEsperados > 0 ? Math.round((bultosRecibidos / bultosEsperados) * 100) : 0,
      transmision_pct: totalAwbs > 0 ? Math.round((transmisionAwbs / totalAwbs) * 100) : 0,
      uld_recibidos: uldRecibidos,
      uld_esperados: uldEstimados,
      guias_parciales: guiasParciales,
      guias_con_ace: conAce,
      guias_con_inmov: conInmov,
      guias_con_mal_estado: conMalEstado,
      sla_ok: guiasParciales === 0 && conInmov === 0,
    };
  });
}

function detalleVuelo(awbs, alertas, manifiesto) {
  const delVuelo = awbs.filter((a) => a.manifiesto === manifiesto);
  if (delVuelo.length === 0) return null;

  const resumen = agruparPorVuelo(delVuelo, alertas)[0];
  const trazabilidad = calcularTrazabilidad(delVuelo);

  const awbsConEstado = delVuelo.map((a) => {
    const alertasActivas = alertas.filter(
      (al) => al.awb_master_id === a.id && al.estado === 'ACTIVA'
    );
    return {
      ...a,
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
