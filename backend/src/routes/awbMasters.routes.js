const express = require('express');
const ctrl = require('../controllers/awbMasters.controller');

const router = express.Router();

router.get('/stats', ctrl.stats);
router.get('/', ctrl.list);
router.get('/:id', ctrl.detail);

module.exports = router;
