const simulacionService = require('../services/simulacion.service');

async function getTemplates(req, res, next) {
  try {
    const items = simulacionService.listarTemplates();
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
}

async function getVuelo(req, res, next) {
  try {
    res.json(simulacionService.obtenerVuelo());
  } catch (err) {
    next(err);
  }
}

async function notificar(req, res, next) {
  try {
    const { tipoAlerta, telefono, guia } = req.body || {};
    const resultado = await simulacionService.notificar({ tipoAlerta, telefono, guia });
    res.json(resultado);
  } catch (err) {
    // Si viene de Meta, devolvemos detalle ampliado.
    if (err.code === 'META_API_ERROR' && err.meta) {
      return res.status(err.status || 502).json({
        ok: false,
        error: err.message,
        code: err.code,
        meta: err.meta,
      });
    }
    next(err);
  }
}

module.exports = { getTemplates, getVuelo, notificar };
