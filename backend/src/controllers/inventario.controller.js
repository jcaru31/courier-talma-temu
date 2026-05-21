const dataStore = require('../services/dataStore');
const { peruToday, peruNow } = require('../utils/time');

/**
 * Inventario fisico de guias TEMU en almacen.
 *
 * Criterio: guias que han ingresado fisicamente (no FALTANTE ni PLANIFICADO)
 * y que aun no han salido (no DESPACHO completado). Solo interesan dos motivos
 * operativos de retencion, derivados de las alertas ACTIVAS reales (misma
 * fuente que Vista 1):
 *   - INMOVILIZADA : alerta tipo INMOVILIZACION activa.
 * El resto de guias se marca como EN_PROCESO normal.
 */
function clasificarMotivos(tiposRetencion) {
  const motivos = [];
  if (tiposRetencion.includes('INMOVILIZACION')) {
    motivos.push({ key: 'INMOVILIZADA', label: 'Inmovilizada (canal rojo sin levante)', severity: 'orange' });
  }
  if (motivos.length === 0) {
    motivos.push({ key: 'EN_PROCESO', label: 'En proceso normal', severity: 'emerald' });
  }
  return motivos;
}

function diasEnAlmacen(awb, ahora) {
  const ingreso = awb.timeline?.recepcion?.fecha_inicio;
  if (!ingreso) return null;
  const ms = ahora - new Date(ingreso);
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

async function list(req, res, next) {
  try {
    const AHORA = peruNow();
    const data = await dataStore.read();

    // Indice de alertas ACTIVAS por AWB master. Solo nos interesa el tipo que
    // justifica retencion fisica: INMOVILIZACION. Los iconos al inicio de la
    // fila se derivan de aqui (misma fuente que Vista 1).
    const alertasActivas = (data.alertas || []).filter((al) => al.estado === 'ACTIVA');
    const tiposRetencionPorAwb = alertasActivas.reduce((acc, al) => {
      if (al.tipo === 'INMOVILIZACION') {
        (acc[al.awb_master_id] = acc[al.awb_master_id] || new Set()).add(al.tipo);
      }
      return acc;
    }, {});

    // Nombre del consignatario por id (TEMU / SERHAFEN / FEDEX).
    const nombrePorCli = new Map((data.clientes || []).map((c) => [c.id, c.nombre]));

    // Guia en almacen = arribada y no entregada todavia
    let items = data.awb_masters
      .filter((a) => a.status !== 'PLANIFICADO' && a.status !== 'GUIA_FALTANTE')
      .filter((a) => a.timeline?.despacho_eseer?.estado !== 'COMPLETADO')
      .map((a) => {
        const tipos = Array.from(tiposRetencionPorAwb[a.id] || []);
        return {
          id: a.id,
          awb: a.awb,
          manifiesto: a.manifiesto,
          vuelo: a.vuelo,
          origen: a.origen,
          fecha_ingreso: a.timeline?.recepcion?.fecha_inicio || null,
          dias_almacen: diasEnAlmacen(a, AHORA),
          bultos_recibidos: a.bultos_recibidos,
          bultos_esperados: a.bultos_esperados,
          bultos_mal_estado: a.bultos_mal_estado || 0,
          bultos_faltantes: a.bultos_faltantes || 0,
          kgs_recibidos: a.kgs_recibidos,
          kgs_esperados: a.kgs_esperados,
          volante: a.volante || null,
          motivos: clasificarMotivos(tipos),
          tipos_retencion: tipos,
          acta_mal_estado: a.acta_mal_estado || null,
          handling_pagado: a.handling_pagado !== false,
          consignatario_nombre: nombrePorCli.get(a.consignatario_id) || null,
        };
      });

    // Filtro opcional por motivo
    if (req.query.motivo) {
      const m = String(req.query.motivo).toUpperCase();
      items = items.filter((it) => it.motivos.some((x) => x.key === m));
    }

    // Busqueda libre por AWB / manifiesto
    if (req.query.buscar) {
      const q = String(req.query.buscar).trim().toLowerCase();
      if (q) {
        items = items.filter(
          (it) =>
            (it.awb || '').toLowerCase().includes(q) ||
            (it.manifiesto || '').toLowerCase().includes(q) ||
            (it.vuelo || '').toLowerCase().includes(q)
        );
      }
    }

    // Mas antigua primero (la que mas tiempo lleva en almacen)
    items.sort((a, b) => (b.dias_almacen ?? 0) - (a.dias_almacen ?? 0));

    // Conteos por motivo
    const conteoMotivos = items.reduce((acc, it) => {
      for (const m of it.motivos) acc[m.key] = (acc[m.key] || 0) + 1;
      return acc;
    }, {});

    res.json({
      items,
      total: items.length,
      hoy: peruToday(),
      conteo_motivos: conteoMotivos,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
