const twilio = require("twilio");

function sendConfirmationSMS(booking) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const toNumber = process.env.TWILIO_TO_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    console.warn(
      "Twilio credentials not fully configured. Skipping SMS."
    );
    return Promise.resolve(null);
  }

  const client = twilio(accountSid, authToken);

  const dateStr = new Date(booking.dateTime).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const message = `Hi ${booking.patientName}, your ${booking.service} appointment at SmileCare Dental is confirmed for ${dateStr}. See you soon!`;

  return client.messages.create({
    body: message,
    from: fromNumber,
    to: toNumber,
  });
}

module.exports = { sendConfirmationSMS };
