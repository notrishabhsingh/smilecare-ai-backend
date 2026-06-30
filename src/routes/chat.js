const { Router } = require("express");
const { handleChat } = require("../controllers/chatController");
const { validateMessage } = require("../middleware/validate");

const router = Router();

router.post("/", validateMessage, handleChat);

module.exports = router;
