async function callLLM(message) {
  const msg = message.toLowerCase();

  if (msg.includes("book")) {
    return { intent: "BOOK_APPOINTMENT" };
  }
  if (msg.includes("timing") || msg.includes("hour") || msg.includes("open") || msg.includes("close")) {
    return { intent: "ASK_TIMINGS" };
  }
  if (msg.includes("service") || msg.includes("offer") || msg.includes("provide") || msg.includes("treatment")) {
    return { intent: "ASK_SERVICES" };
  }
  return { intent: "GENERAL_QUERY" };
}

module.exports = { callLLM };
