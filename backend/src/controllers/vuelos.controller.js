const dataStore = require('../services/dataStore');
const { agruparPorVuelo, detalleVuelo } = require('../utils/vueloAggregations');
const { paginar } = require('../utils/aggregations');
const { peruToday } = require('../utils/time');

function offsetDia(fechaBase, deltaDias) {
  const d = new Date(fechaBase + 'T00:00:00-05:00');
  d.setDate(d.getDate() + deltaDias);
  return d.toISOString().slice(0, 10);
}

async function list(req, res, next) {
  try {
    const HOY = peruToday();
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
    // Busqueda libre. Matchea por:
    //   - vuelo / manifiesto / aerolinea (texto)
    //   - AWB completo o ULTIMOS 4 digitos del AWB master
    //     (caso de uso: guías parciales que pueden continuar en otro vuelo)
    if (req.query.buscar) {
      const q = String(req.query.buscar).trim().toLowerCase();
      if (q) {
        const soloDigitos = q.replace(/\D/g, '');
        const awbMatcheaPorDigitos = (awb) => {
          if (!awb || soloDigitos.length < 2) return false;
          const d = awb.replace(/\D/g, '');
          return d.endsWith(soloDigitos);
        };
        // Indice AWB -> vuelos donde aparece. Util para el chip de UI.
        const vuelosPorAwb = new Map();
        for (const a of data.awb_masters) {
          const awbStr = (a.awb || '').toLowerCase();
          if (awbStr.includes(q) || awbMatcheaPorDigitos(awbStr)) {
            if (!vuelosPorAwb.has(a.awb)) vuelosPorAwb.set(a.awb, new Set());
            vuelosPorAwb.get(a.awb).add(a.manifiesto);
          }
        }
        const manifiestosMatch = new Set();
        for (const set of vuelosPorAwb.values()) for (const m of set) manifiestosMatch.add(m);

        vuelos = vuelos.filter(
          (v) =>
            (v.vuelo || '').toLowerCase().includes(q) ||
            (v.manifiesto || '').toLowerCase().includes(q) ||
            (v.aerolinea_short || '').toLowerCase().includes(q) ||
            manifiestosMatch.has(v.manifiesto)
        );

        // Devolvemos los matches AWB->vuelos para que la UI muestre un chip
        // del estilo "AWB ...0608 aparece en: 5Y 1876, LA 7542".
        res.locals.awbMatches = Array.from(vuelosPorAwb.entries()).map(
          ([awb, mans]) => ({ awb, manifiestos: Array.from(mans) })
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
    const manana = offsetDia(HOY, 1);
    const hace7 = offsetDia(HOY, -7);
    let rango = { desde: hace7, hasta: HOY };

    const fechaDesde = req.query.fecha_desde;
    const fechaHasta = req.query.fecha_hasta;
    if (fechaDesde || fechaHasta) {
      const desde = fechaDesde || '0000-01-01';
      const hasta = fechaHasta || '9999-12-31';
      vuelos = vuelos.filter((v) => v.fecha >= desde && v.fecha <= hasta);
      rango = { desde, hasta };
    } else if (dia === 'hoy') {
      vuelos = vuelos.filter((v) => v.fecha === HOY);
      rango = { desde: HOY, hasta: HOY };
    } else if (dia === 'manana') {
      vuelos = vuelos.filter((v) => v.fecha === manana);
      rango = { desde: manana, hasta: manana };
    } else if (dia === 'anteriores') {
      vuelos = vuelos.filter((v) => v.fecha < HOY && v.fecha >= hace7);
      rango = { desde: hace7, hasta: offsetDia(HOY, -1) };
    } else if (dia === 'incluir_manana') {
      vuelos = vuelos.filter((v) => v.fecha >= hace7 && v.fecha <= manana);
      rango = { desde: hace7, hasta: manana };
    } else if (dia === 'todos') {
      // sin filtro
      rango = null;
    } else {
      // ultimos7 (default): hoy + 7 atras
      vuelos = vuelos.filter((v) => v.fecha >= hace7 && v.fecha <= HOY);
    }

    vuelos.sort((a, b) => new Date(b.eta) - new Date(a.eta));
    const paginado = paginar(vuelos, req.query);
    // Enriquecemos vuelos con el resumen de cuantas guias matchearon el AWB
    // buscado (para resaltarlas en la fila expandida). El mapping completo
    // de matches va al top-level de la respuesta para el chip global.
    const matches = res.locals.awbMatches || [];
    const vueloEnriquecido = paginado.items.map((v) => {
      const awbsEnEstaPaginaQueMatchean = matches
        .filter((m) => m.manifiestos.includes(v.manifiesto))
        .map((m) => m.awb);
      return awbsEnEstaPaginaQueMatchean.length > 0
        ? { ...v, awbs_matcheados: awbsEnEstaPaginaQueMatchean }
        : v;
    });
    res.json({ ...paginado, items: vueloEnriquecido, rango, hoy: HOY, manana, awb_matches: matches });
  } catch (err) {
    next(err);
  }
}

async function detail(req, res, next) {
  try {
    const data = await dataStore.read();
    const result = detalleVuelo(data.awb_masters, data.alertas, req.params.manifiesto, data.clientes);
    if (!result) {
      return res.status(404).json({ error: 'Vuelo no encontrado' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, detail };
