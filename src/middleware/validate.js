function validateMessage(req, res, next) {
  const { message } = req.body;

  if (message === undefined || message === null) {
    return res.status(400).json({
      error: "Missing required field: message",
    });
  }

  if (typeof message !== "string") {
    return res.status(400).json({
      error: "Field 'message' must be a string",
    });
  }

  next();
}

module.exports = { validateMessage };
