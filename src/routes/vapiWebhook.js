const { Router } = require("express");
const { createSession, transitionState } = require("../services/stateMachine");
const firestore = require("../services/firestoreService");
const calendar = require("../services/calendarService");
const sms = require("../services/smsService");

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { message, call } = req.body;

    if (!call || !call.id) {
      return res.status(400).json({ error: "Missing call.id in webhook payload" });
    }

    const callId = call.id;
    const messageType = message?.type;
    const transcriptContent = message?.transcript || "";
    const transcriptRole = message?.role || "";

    if (messageType === "end-of-call-report") {
      return res.json({ status: "ok" });
    }

    if (messageType !== "transcript" || transcriptRole !== "user") {
      return res.json({ status: "ok" });
    }

    let session = await firestore.getSession(callId);
    if (!session) {
      session = createSession(callId);
    }

    const result = transitionState(session, transcriptContent);

    await firestore.saveSession(session);

    if (result.bookingComplete) {
      const bookingData = {
        callId,
        patientName: result.context.name,
        service: result.context.service,
        dateTime: result.context.dateTime,
        phone: process.env.PATIENT_PHONE || "N/A",
        status: "confirmed",
      };

      const booking = await firestore.createBooking(bookingData);
      session.booking = { ...booking };

      let calResult;
      try {
        calResult = await calendar.createCalendarEvent(bookingData);
        session.booking.googleEventId = calResult.googleEventId;
        session.booking.googleEventLink = calResult.googleEventLink;
      } catch (calErr) {
        console.warn("Calendar booking skipped:", calErr.message);
      }

      try {
        const smsResult = await sms.sendConfirmationSMS(bookingData);
        if (smsResult) {
          session.booking.twilioSid = smsResult.sid;
        }
      } catch (smsErr) {
        console.warn("SMS sending skipped:", smsErr.message);
      }

      await firestore.saveSession(session);
    }

    res.json({
      response: result.response,
      state: result.nextState,
      callId,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
