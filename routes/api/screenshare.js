const express = require("express");
const router = express.Router();
const broadcastController = require("../../controllers/broadcastController");

router.post("/", broadcastController.uploadScreenShareStream);
module.exports = router;