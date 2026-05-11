const dataStore = require('../services/dataStore');
const { hidratarAwb, aplicarFiltros, paginar } = require('../utils/aggregations');

async function stats(req, res, next) {
  try {
    const data = await dataStore.read();
    const awbs = data.awb_masters;
    const alertasActivas = data.alertas.filter((a) => a.estado === 'ACTIVA');

    const porStatus = awbs.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    const porCanal = awbs.reduce((acc, a) => {
      const c = a.canal_dam?.color || 'SIN_CANAL';
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});

    const porTipoAlerta = alertasActivas.reduce((acc, a) => {
      acc[a.tipo] = (acc[a.tipo] || 0) + 1;
      return acc;
    }, {});

    const guiasConAlertas = new Set(alertasActivas.map((a) => a.awb_master_id)).size;

    res.json({
      total: awbs.length,
      por_status: porStatus,
      por_canal: porCanal,
      alertas: {
        total_activas: alertasActivas.length,
        guias_con_alertas: guiasConAlertas,
        ACE: porTipoAlerta.ACE || 0,
        INMOVILIZACION: porTipoAlerta.INMOVILIZACION || 0,
        MAL_ESTADO: porTipoAlerta.MAL_ESTADO || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const data = await dataStore.read();
    const hidratados = data.awb_masters.map((a) => hidratarAwb(a, data.alertas));
    const filtrados = aplicarFiltros(hidratados, req.query);
    const ordenados = filtrados.sort((a, b) => new Date(b.eta) - new Date(a.eta));
    const resultado = paginar(ordenados, req.query);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function detail(req, res, next) {
  try {
    const data = await dataStore.read();
    const awb = data.awb_masters.find((a) => a.id === req.params.id);
    if (!awb) {
      return res.status(404).json({ error: 'AWB no encontrado' });
    }
    const hidratado = hidratarAwb(awb, data.alertas);
    const consignatario = data.clientes.find((c) => c.id === awb.consignatario_id) || null;
    res.json({ ...hidratado, consignatario });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, detail, stats };
