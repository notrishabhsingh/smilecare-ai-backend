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

  console.log("Creating Google Calendar event...");
  console.log("  Calendar ID:", calendarId || "primary (default)");
  console.log("  Booking:", JSON.stringify({
    patientName: booking.patientName,
    service: booking.service,
    dateTime: booking.dateTime,
    phone: booking.phone || "N/A",
  }));

  let response;
  try {
    response = await calendar.events.insert({
      calendarId,
      resource: event,
    });
  } catch (err) {
    console.error("Calendar event creation FAILED");
    console.error("  error.message:", err.message);
    console.error("  error.code:", err.code);
    console.error("  error.stack:", err.stack);
    if (err.response) {
      console.error("  error.response.status:", err.response.status);
      console.error("  error.response.data:", JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }

  console.log("Calendar event created successfully");
  console.log("  Google Event ID:", response.data.id);
  console.log("  Event URL:", response.data.htmlLink);

  return {
    googleEventId: response.data.id,
    googleEventLink: response.data.htmlLink,
  };
}

module.exports = { createCalendarEvent };