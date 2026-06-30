const { processMessage } = require("../services/agent");

async function handleChat(req, res, next) {
  try {
    const { message } = req.body;
    const result = await processMessage(message);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { handleChat };
