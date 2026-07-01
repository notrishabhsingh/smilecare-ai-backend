const { google } = require("googleapis");

function getAuthClient() {
  const serviceAccountBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;

  if (!serviceAccountBase64) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_B64 environment variable");
  }

  const credentials = JSON.parse(
    Buffer.from(serviceAccountBase64, "base64").toString("utf8")
  );

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return auth;
}

async function createCalendarEvent(booking) {
  const auth = getAuthClient();

  await auth.authorize();

  const calendar = google.calendar({
    version: "v3",
    auth,
  });

  const startTime = new Date(booking.dateTime);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  const event = {
    summary: `Dental Appointment - ${booking.service}`,
    description: `Patient: ${booking.patientName}
Service: ${booking.service}
Phone: ${booking.phone || "N/A"}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    reminders: {
      useDefault: true,
    },
  };

  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  const response = await calendar.events.insert({
    calendarId,
    resource: event,
  });

  return {
    googleEventId: response.data.id,
    googleEventLink: response.data.htmlLink,
  };
}

module.exports = { createCalendarEvent };