const express = require('express');
const ctrl = require('../controllers/vuelos.controller');

const router = express.Router();

router.get('/', ctrl.list);
router.get('/:manifiesto', ctrl.detail);

module.exports = router;
