function hidratarAwb(awb, alertas) {
  const alertasActivas = (awb.alertas_activas_ids || [])
    .map((id) => alertas.find((a) => a.id === id))
    .filter(Boolean);

  return {
    ...awb,
    alertas_activas: alertasActivas,
    alertas_count: alertasActivas.length,
    bultos_porcentaje: porcentaje(awb.bultos_recibidos, awb.bultos_esperados),
    kgs_porcentaje: porcentaje(awb.kgs_recibidos, awb.kgs_esperados),
  };
}

function porcentaje(recibido, esperado) {
  if (!esperado || esperado === 0) return 0;
  return Math.min(100, Math.round((recibido / esperado) * 100));
}

function aplicarFiltros(awbs, query) {
  let result = awbs;

  if (query.status) {
    result = result.filter((a) => a.status === query.status);
  }
  if (query.destino) {
    result = result.filter((a) => a.destino === query.destino);
  }
  if (query.con_alertas === 'true') {
    result = result.filter((a) => (a.alertas_activas_ids || []).length > 0);
  }
  if (query.tipo_alerta) {
    result = result.filter((a) =>
      (a.alertas_activas || []).some((al) => al.tipo === query.tipo_alerta)
    );
  }
  if (query.consignatario_id) {
    result = result.filter((a) => a.consignatario_id === query.consignatario_id);
  }
  if (query.canal) {
    result = result.filter((a) => a.canal_dam && a.canal_dam.color === query.canal);
  }

  return result;
}

function paginar(items, query) {
  const page = parseInt(query.page || '1', 10);
  const limit = parseInt(query.limit || '10', 10);
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
    total_pages: Math.ceil(items.length / limit),
  };
}

module.exports = { hidratarAwb, porcentaje, aplicarFiltros, paginar };
