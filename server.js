require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const vapiWebhook = require("./src/routes/vapiWebhook");
const adminApi = require("./src/routes/adminApi");

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
      webhook: "POST /vapi-webhook",
      bookings: "GET /admin/bookings",
      sessions: "GET /admin/sessions",
      sessionById: "GET /admin/sessions/:callId",
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/vapi-webhook", vapiWebhook);
app.use("/admin", adminApi);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`Dental Appointment Agent running on port ${PORT}`);
});

module.exports = app;
