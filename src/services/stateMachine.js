const chrono = require("chrono-node");

const CLINIC_SERVICES = [
  "Dental Cleaning",
  "Root Canal",
  "Braces",
  "Teeth Whitening",
];

const SERVICE_ALIASES = {
  "dental cleaning": "Dental Cleaning",
  cleaning: "Dental Cleaning",
  "teeth cleaning": "Dental Cleaning",
  "root canal": "Root Canal",
  canal: "Root Canal",
  braces: "Braces",
  "teeth whitening": "Teeth Whitening",
  whitening: "Teeth Whitening",
};

const STATES = {
  GREETING: "GREETING",
  AWAITING_NAME: "AWAITING_NAME",
  AWAITING_SERVICE: "AWAITING_SERVICE",
  AWAITING_DATETIME: "AWAITING_DATETIME",
  CONFIRMING: "CONFIRMING",
  BOOKED: "BOOKED",
  CANCELLED: "CANCELLED",
};

function createSession(callId) {
  return {
    callId,
    state: STATES.GREETING,
    context: {
      name: null,
      service: null,
      dateTime: null,
    },
    history: [],
    booking: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function findService(input) {
  const lower = input.toLowerCase();
  for (const [alias, service] of Object.entries(SERVICE_ALIASES)) {
    if (lower.includes(alias)) {
      return service;
    }
  }
  return null;
}

function extractDateTimeInfo(input) {
  const parsed = chrono.parseDate(input, new Date(), { forwardDate: true });
  return parsed ? parsed.toISOString() : null;
}

function getPromptForState(state, context) {
  switch (state) {
    case STATES.GREETING:
      return {
        response:
          "Welcome to SmileCare Dental! I'm your booking assistant. What's your name?",
        state,
      };
    case STATES.AWAITING_NAME:
      return {
        response: `Nice to meet you! Which service do you need? We offer: ${CLINIC_SERVICES.join(", ")}.`,
        state,
      };
    case STATES.AWAITING_SERVICE:
      return {
        response: `Great! Which service do you need? We offer: ${CLINIC_SERVICES.join(", ")}.`,
        state,
      };
    case STATES.AWAITING_DATETIME:
      return {
        response: `When would you like to come in? We're open Mon-Fri 10 AM to 7 PM.`,
        state,
      };
    case STATES.CONFIRMING:
      return {
        response: context.dateTime ? `Let me confirm: ${context.service} for ${context.name} on ${new Date(context.dateTime).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}. Does that look right? Say "yes" to confirm or "no" to cancel.` : `Perfect! Your appointment is booked. We'll send a confirmation SMS to you shortly.`,
        state: STATES.CONFIRMING,
      };
    case STATES.BOOKED:
      return {
        response: `Your appointment is already booked. If you need to make changes, please call us at 9876543210.`,
        state: STATES.BOOKED,
      };
    default:
      return {
        response: "How can I help you?",
        state: STATES.GREETING,
      };
  }
}

function transitionState(session, userMessage) {
  const { state, context } = session;
  const msg = userMessage.trim();

  session.history.push({
    role: "user",
    content: msg,
    timestamp: new Date().toISOString(),
  });

  let nextState = state;
  let updates = {};
  let responseText = "";
  let bookingComplete = false;

  switch (state) {
    case STATES.GREETING: {
      nextState = STATES.AWAITING_NAME;
      responseText = getPromptForState(STATES.GREETING, context).response;
      break;
    }

    case STATES.AWAITING_NAME: {
      const name = msg.replace(/^(my name is|i'm|i am|this is|it's|its)\s+/i, "").trim();
      updates.name = name;
      nextState = STATES.AWAITING_SERVICE;
      const prompt = getPromptForState(STATES.AWAITING_NAME, { ...context, name });
      responseText = prompt.response.replace("Nice to meet you!", `Nice to meet you, ${name}!`);
      break;
    }

    case STATES.AWAITING_SERVICE: {
      const service = findService(msg);
      if (!service) {
        responseText = `I'm sorry, I didn't recognize that service. We offer: ${CLINIC_SERVICES.join(", ")}. Which one would you like?`;
        nextState = STATES.AWAITING_SERVICE;
        break;
      }
      updates.service = service;
      nextState = STATES.AWAITING_DATETIME;
      const prompt = getPromptForState(STATES.AWAITING_DATETIME, { ...context, service });
      responseText = prompt.response;
      break;
    }

    case STATES.AWAITING_DATETIME: {
      const dateTime = extractDateTimeInfo(msg);
      if (!dateTime) {
        responseText =
          "I'm sorry, I didn't catch the date and time. Could you tell me when you'd like to come in? For example: 'Tomorrow at 2pm' or 'Friday at 11am'.";
        nextState = STATES.AWAITING_DATETIME;
        break;
      }
      updates.dateTime = dateTime;
      nextState = STATES.CONFIRMING;
      const prompt = getPromptForState(STATES.CONFIRMING, { ...context, ...updates, dateTime });
      responseText = prompt.response;
      break;
    }

    case STATES.CONFIRMING: {
      const lower = msg.toLowerCase();
      if (lower.includes("yes") || lower.includes("confirm") || lower.includes("correct") || lower.includes("sure") || lower.includes("yeah")) {
        nextState = STATES.BOOKED;
        bookingComplete = true;
        responseText = `Perfect! Your ${context.service} appointment on ${new Date(context.dateTime).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })} for ${context.name} is confirmed. A confirmation SMS will be sent shortly. Thank you for choosing SmileCare Dental!`;
      } else {
        nextState = STATES.CANCELLED;
        responseText = "No problem! Your appointment has been cancelled. Feel free to call us back when you'd like to reschedule.";
      }
      break;
    }

    case STATES.BOOKED:
      responseText = `Your appointment is already booked for ${new Date(context.dateTime).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}. If you need to change it, please call us at 9876543210.`;
      nextState = STATES.BOOKED;
      break;

    default:
      nextState = STATES.GREETING;
      responseText = "Welcome back! What's your name?";
      break;
  }

  session.state = nextState;
  session.context = { ...session.context, ...updates };
  session.updatedAt = new Date().toISOString();

  session.history.push({
    role: "assistant",
    content: responseText,
    timestamp: new Date().toISOString(),
  });

  return {
    response: responseText,
    nextState,
    context: session.context,
    bookingComplete,
  };
}

module.exports = {
  STATES,
  createSession,
  transitionState,
  CLINIC_SERVICES,
};
