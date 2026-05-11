const dataStore = require('../services/dataStore');
const { agruparPorVuelo, detalleVuelo } = require('../utils/vueloAggregations');
const { paginar } = require('../utils/aggregations');

async function list(req, res, next) {
  try {
    const data = await dataStore.read();
    let vuelos = agruparPorVuelo(data.awb_masters, data.alertas);

    if (req.query.tipo_vuelo) {
      vuelos = vuelos.filter((v) => v.tipo_vuelo === req.query.tipo_vuelo);
    }
    if (req.query.con_alertas === 'true') {
      vuelos = vuelos.filter(
        (v) => v.guias_con_ace + v.guias_con_inmov + v.guias_con_mal_estado > 0
      );
    }

    vuelos.sort((a, b) => new Date(b.eta) - new Date(a.eta));
    res.json(paginar(vuelos, req.query));
  } catch (err) {
    next(err);
  }
}

async function detail(req, res, next) {
  try {
    const data = await dataStore.read();
    const result = detalleVuelo(data.awb_masters, data.alertas, req.params.manifiesto);
    if (!result) {
      return res.status(404).json({ error: 'Vuelo no encontrado' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, detail };
