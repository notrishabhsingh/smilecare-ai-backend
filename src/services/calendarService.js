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

  // booking.dateTime comes from chrono.toISOString() as "YYYY-MM-DDTHH:MM:SS.000Z".
  // chrono interprets times in the server's local timezone. On Railway (UTC),
  // "3 PM" becomes 15:00 UTC — the same numerical hour as the intended IST time.
  // To tell Google Calendar the correct local time, we replace the "Z" (UTC)
  // with "+05:30" (Asia/Kolkata offset), so the time components are received
  // directly as IST local time rather than being converted from UTC.
  const startDateTime = booking.dateTime.replace(/\.\d{3}Z$/, "+05:30");

  const [startDatePart, rest] = startDateTime.split("T");
  const timePart = rest.split("+")[0];
  const [h, m, s] = timePart.split(":").map(Number);

  // End time: 1 hour later (appointments are 10 AM–7 PM, no midnight crossover)
  const endDateTime = `${startDatePart}T${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}+05:30`;

  const event = {
    summary: `Dental Appointment - ${booking.service}`,
    description: `Patient: ${booking.patientName}
Service: ${booking.service}
Phone: ${booking.phone || "N/A"}`,
    start: {
      dateTime: startDateTime,
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: endDateTime,
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