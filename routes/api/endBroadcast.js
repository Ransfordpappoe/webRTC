const express = require('express');
const router = express.Router();
const broadcastController = require('../../controllers/broadcastController');

router.post('/', broadcastController.endBroadcast);
module.exports = router;