const dataStore = require('../services/dataStore');
const { agruparPorVuelo, detalleVuelo } = require('../utils/vueloAggregations');
const { paginar } = require('../utils/aggregations');

const HOY_DEMO = '2026-05-08';

function offsetDia(fechaBase, deltaDias) {
  const d = new Date(fechaBase + 'T00:00:00-05:00');
  d.setDate(d.getDate() + deltaDias);
  return d.toISOString().slice(0, 10);
}

async function list(req, res, next) {
  try {
    const data = await dataStore.read();
    let vuelos = agruparPorVuelo(data.awb_masters, data.alertas);

    if (req.query.tipo_vuelo) {
      vuelos = vuelos.filter((v) => v.tipo_vuelo === req.query.tipo_vuelo);
    }
    if (req.query.con_alertas === 'true') {
      vuelos = vuelos.filter(
        (v) => v.guias_faltantes + v.guias_parciales + v.guias_con_inmov + v.guias_con_mal_estado > 0
      );
    }
    if (req.query.aerolinea) {
      vuelos = vuelos.filter((v) => v.aerolinea_short === req.query.aerolinea);
    }
    // Busqueda libre por vuelo o manifiesto (case-insensitive)
    if (req.query.buscar) {
      const q = String(req.query.buscar).trim().toLowerCase();
      if (q) {
        vuelos = vuelos.filter(
          (v) =>
            (v.vuelo || '').toLowerCase().includes(q) ||
            (v.manifiesto || '').toLowerCase().includes(q) ||
            (v.aerolinea_short || '').toLowerCase().includes(q)
        );
      }
    }
    // Filtro por tipo de alerta (faltantes / parciales / inmov / mal_estado).
    // Muestra solo vuelos cuya categoria correspondiente sea > 0.
    if (req.query.tipo_alerta) {
      const t = String(req.query.tipo_alerta).toLowerCase();
      if (t === 'faltantes') vuelos = vuelos.filter((v) => v.guias_faltantes > 0);
      else if (t === 'parciales') vuelos = vuelos.filter((v) => v.guias_parciales > 0);
      else if (t === 'inmov') vuelos = vuelos.filter((v) => v.guias_con_inmov > 0);
      else if (t === 'mal_estado') vuelos = vuelos.filter((v) => v.guias_con_mal_estado > 0);
    }
    // Filtro de dia. Por defecto: ultimos 7 dias incluyendo hoy.
    // fecha_desde / fecha_hasta tienen prioridad sobre 'dia'.
    const dia = req.query.dia || 'ultimos7';
    const manana = offsetDia(HOY_DEMO, 1);
    const hace7 = offsetDia(HOY_DEMO, -7);
    let rango = { desde: hace7, hasta: HOY_DEMO };

    const fechaDesde = req.query.fecha_desde;
    const fechaHasta = req.query.fecha_hasta;
    if (fechaDesde || fechaHasta) {
      const desde = fechaDesde || '0000-01-01';
      const hasta = fechaHasta || '9999-12-31';
      vuelos = vuelos.filter((v) => v.fecha >= desde && v.fecha <= hasta);
      rango = { desde, hasta };
    } else if (dia === 'hoy') {
      vuelos = vuelos.filter((v) => v.fecha === HOY_DEMO);
      rango = { desde: HOY_DEMO, hasta: HOY_DEMO };
    } else if (dia === 'manana') {
      vuelos = vuelos.filter((v) => v.fecha === manana);
      rango = { desde: manana, hasta: manana };
    } else if (dia === 'anteriores') {
      vuelos = vuelos.filter((v) => v.fecha < HOY_DEMO && v.fecha >= hace7);
      rango = { desde: hace7, hasta: offsetDia(HOY_DEMO, -1) };
    } else if (dia === 'incluir_manana') {
      vuelos = vuelos.filter((v) => v.fecha >= hace7 && v.fecha <= manana);
      rango = { desde: hace7, hasta: manana };
    } else if (dia === 'todos') {
      // sin filtro
      rango = null;
    } else {
      // ultimos7 (default): hoy + 7 atras
      vuelos = vuelos.filter((v) => v.fecha >= hace7 && v.fecha <= HOY_DEMO);
    }

    vuelos.sort((a, b) => new Date(b.eta) - new Date(a.eta));
    const paginado = paginar(vuelos, req.query);
    res.json({ ...paginado, rango, hoy: HOY_DEMO, manana });
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
