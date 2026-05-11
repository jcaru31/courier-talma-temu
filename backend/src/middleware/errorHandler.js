function errorHandler(err, req, res, _next) {
  console.error('[ERROR]', req.method, req.url, '-', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno',
    code: err.code || 'INTERNAL_ERROR',
  });
}

module.exports = errorHandler;
