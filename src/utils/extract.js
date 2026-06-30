const clinic = require("../data/clinic");

const serviceAliases = {
  "dental cleaning": "Dental Cleaning",
  "cleaning": "Dental Cleaning",
  "teeth cleaning": "Dental Cleaning",
  "root canal": "Root Canal",
  "canal": "Root Canal",
  "braces": "Braces",
  "teeth whitening": "Teeth Whitening",
  "whitening": "Teeth Whitening",
};

const datePatterns = [
  { regex: /\btoday\b/, value: "Today" },
  { regex: /\btomorrow\b/, value: "Tomorrow" },
  { regex: /\bnext\s+week\b/, value: "Next Week" },
  { regex: /\bmonday\b/, value: "Monday" },
  { regex: /\btuesday\b/, value: "Tuesday" },
  { regex: /\bwednesday\b/, value: "Wednesday" },
  { regex: /\bthursday\b/, value: "Thursday" },
  { regex: /\bfriday\b/, value: "Friday" },
];

function extractService(message) {
  const msg = message.toLowerCase();
  for (const [alias, service] of Object.entries(serviceAliases)) {
    if (msg.includes(alias)) {
      return service;
    }
  }
  return null;
}

function extractDate(message) {
  const msg = message.toLowerCase();
  for (const { regex, value } of datePatterns) {
    if (regex.test(msg)) {
      return value;
    }
  }
  return null;
}

module.exports = { extractService, extractDate };
