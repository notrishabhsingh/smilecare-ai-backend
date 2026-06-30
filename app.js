require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const chatRoutes = require("./src/routes/chat");
const { errorHandler } = require("./src/middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    app: "SmileCare Dental AI Assistant",
    version: "1.0.0",
    endpoints: {
      chat: "POST /chat",
    },
  });
});

app.use("/chat", chatRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`SmileCare Dental AI Assistant running on port ${PORT}`);
});

module.exports = app;
