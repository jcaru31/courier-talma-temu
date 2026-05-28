const dataStore = require('../services/dataStore');
const { agruparPorVuelo, detalleVuelo } = require('../utils/vueloAggregations');
const { paginar } = require('../utils/aggregations');
const { peruToday } = require('../utils/time');

function offsetDia(fechaBase, deltaDias) {
  const d = new Date(fechaBase + 'T00:00:00-05:00');
  d.setDate(d.getDate() + deltaDias);
  return d.toISOString().slice(0, 10);
}

// Fecha operativa del vuelo para filtros de día: ATA (real) si ya arribó,
// ETA (programada) si todavía no. Así "Hoy" coincide con lo que se ve en la
// tarjeta del vuelo (ETA o ATA según corresponda).
function fechaOperativa(v) {
  const ata = v.sla?.ata;
  if (ata) return new Date(ata).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  return v.fecha;
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
    // Busqueda libre. Acepta opcional `buscar_tipo` ('vuelo' | 'manifiesto' |
    // 'guia') para restringir la categoría. Si no se especifica, hace fuzzy
    // sobre todo. Guía matchea por AWB completo o últimos N dígitos.
    if (req.query.buscar) {
      const q = String(req.query.buscar).trim().toLowerCase();
      const tipo = String(req.query.buscar_tipo || '').toLowerCase();
      if (q) {
        const soloDigitos = q.replace(/\D/g, '');
        const awbMatcheaPorDigitos = (awb) => {
          if (!awb || soloDigitos.length < 2) return false;
          const d = awb.replace(/\D/g, '');
          return d.endsWith(soloDigitos);
        };

        // Indice AWB -> vuelos. Útil cuando se busca por guía para resaltarla.
        const vuelosPorAwb = new Map();
        const debeBuscarGuia = !tipo || tipo === 'guia';
        if (debeBuscarGuia) {
          for (const a of data.awb_masters) {
            const awbStr = (a.awb || '').toLowerCase();
            if (awbStr.includes(q) || awbMatcheaPorDigitos(awbStr)) {
              if (!vuelosPorAwb.has(a.awb)) vuelosPorAwb.set(a.awb, new Set());
              vuelosPorAwb.get(a.awb).add(a.manifiesto);
            }
          }
        }
        const manifiestosMatch = new Set();
        for (const set of vuelosPorAwb.values()) for (const m of set) manifiestosMatch.add(m);

        const matchVuelo      = (v) => (v.vuelo || '').toLowerCase().includes(q);
        const matchManifiesto = (v) => (v.manifiesto || '').toLowerCase().includes(q);
        const matchGuia       = (v) => manifiestosMatch.has(v.manifiesto);

        if (tipo === 'vuelo') {
          vuelos = vuelos.filter(matchVuelo);
        } else if (tipo === 'manifiesto') {
          vuelos = vuelos.filter(matchManifiesto);
        } else if (tipo === 'guia') {
          vuelos = vuelos.filter(matchGuia);
        } else {
          vuelos = vuelos.filter(
            (v) =>
              matchVuelo(v) ||
              matchManifiesto(v) ||
              (v.aerolinea_short || '').toLowerCase().includes(q) ||
              matchGuia(v)
          );
        }

        // Devolvemos los matches AWB->vuelos para que la UI muestre un chip
        // del estilo "AWB ...0608 aparece en: 5Y 1876, LA 7542" (solo si la
        // búsqueda incluye guías).
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
    // Filtro de dia. Por defecto: ayer + hoy (vista compacta para no saturar).
    // fecha_desde / fecha_hasta tienen prioridad sobre 'dia'.
    const dia = req.query.dia || 'hoy_ayer';
    const manana = offsetDia(HOY, 1);
    const ayer = offsetDia(HOY, -1);
    const hace7 = offsetDia(HOY, -7);
    let rango = { desde: ayer, hasta: HOY };

    const fechaDesde = req.query.fecha_desde;
    const fechaHasta = req.query.fecha_hasta;
    if (fechaDesde || fechaHasta) {
      const desde = fechaDesde || '0000-01-01';
      const hasta = fechaHasta || '9999-12-31';
      vuelos = vuelos.filter((v) => {
        const f = fechaOperativa(v);
        return f >= desde && f <= hasta;
      });
      rango = { desde, hasta };
    } else if (dia === 'hoy') {
      vuelos = vuelos.filter((v) => fechaOperativa(v) === HOY);
      rango = { desde: HOY, hasta: HOY };
    } else if (dia === 'manana') {
      vuelos = vuelos.filter((v) => fechaOperativa(v) === manana);
      rango = { desde: manana, hasta: manana };
    } else if (dia === 'anteriores') {
      vuelos = vuelos.filter((v) => {
        const f = fechaOperativa(v);
        return f < HOY && f >= hace7;
      });
      rango = { desde: hace7, hasta: offsetDia(HOY, -1) };
    } else if (dia === 'ultimos7') {
      vuelos = vuelos.filter((v) => {
        const f = fechaOperativa(v);
        return f >= hace7 && f <= HOY;
      });
      rango = { desde: hace7, hasta: HOY };
    } else if (dia === 'incluir_manana') {
      vuelos = vuelos.filter((v) => {
        const f = fechaOperativa(v);
        return f >= hace7 && f <= manana;
      });
      rango = { desde: hace7, hasta: manana };
    } else if (dia === 'todos') {
      // sin filtro
      rango = null;
    } else {
      // hoy_ayer (default): ayer + hoy
      vuelos = vuelos.filter((v) => {
        const f = fechaOperativa(v);
        return f >= ayer && f <= HOY;
      });
    }

    // Orden descendente por la fecha que muestra la UI: ATA si el vuelo ya
    // arribó, ETA si aún no. Antes ordenaba solo por ETA y se veía desfasado
    // cuando un vuelo aterrizaba antes/después de lo programado.
    vuelos.sort((a, b) => {
      const fechaA = a.sla?.ata || a.eta;
      const fechaB = b.sla?.ata || b.eta;
      return new Date(fechaB) - new Date(fechaA);
    });
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
