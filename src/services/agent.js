const clinic = require("../data/clinic");
const { callLLM } = require("./llm");
const { extractService, extractDate } = require("../utils/extract");

function generateTimingsReply() {
  return `We are open Monday to Friday from 10 AM to 7 PM.`;
}

function generateServicesReply() {
  const list = clinic.services.join(", ");
  return `We provide ${list}.`;
}

function generateBookingReply(service, date) {
  const serviceName = service || "appointment";
  const dateStr = date || "the requested date";
  return `Sure! I can help you book a ${serviceName} appointment ${dateStr}.`;
}

function generateGeneralReply() {
  return "Hello! Welcome to SmileCare Dental. How can I help you today? You can ask about our services, timings, or book an appointment.";
}

async function processMessage(message) {
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return {
      reply: "Please send a valid message.",
      intent: "GENERAL_QUERY",
    };
  }

  const trimmed = message.trim();
  const llmResult = await callLLM(trimmed);
  const { intent } = llmResult;

  switch (intent) {
    case "ASK_TIMINGS":
      return {
        reply: generateTimingsReply(),
        intent,
      };

    case "ASK_SERVICES":
      return {
        reply: generateServicesReply(),
        intent,
      };

    case "BOOK_APPOINTMENT": {
      const service = extractService(trimmed);
      const date = extractDate(trimmed);
      return {
        reply: generateBookingReply(service, date),
        intent,
        service,
        date,
      };
    }

    default:
      return {
        reply: generateGeneralReply(),
        intent: "GENERAL_QUERY",
      };
  }
}

module.exports = { processMessage };
