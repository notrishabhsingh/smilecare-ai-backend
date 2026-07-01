const { getDb } = require("../config/firebase");

const SESSIONS_COLLECTION = "sessions";
const BOOKINGS_COLLECTION = "bookings";

const memSessions = new Map();
const memBookings = [];
let memCounter = 0;

async function getSession(callId) {
  const db = getDb();
  if (db) {
    const doc = await db.collection(SESSIONS_COLLECTION).doc(callId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }
  return memSessions.get(callId) || null;
}

async function saveSession(session) {
  const db = getDb();
  if (db) {
    await db
      .collection(SESSIONS_COLLECTION)
      .doc(session.callId)
      .set(session, { merge: true });
    return;
  }
  memSessions.set(session.callId, session);
}

async function createBooking(booking) {
  const db = getDb();
  if (db) {
    const docRef = db.collection(BOOKINGS_COLLECTION).doc();
    const bookingData = {
      ...booking,
      id: docRef.id,
      createdAt: new Date().toISOString(),
    };
    await docRef.set(bookingData);
    return { ...bookingData };
  }
  memCounter++;
  const bookingData = {
    ...booking,
    id: `mem_${memCounter}`,
    createdAt: new Date().toISOString(),
  };
  memBookings.push(bookingData);
  return { ...bookingData };
}

async function getAllBookings() {
  const db = getDb();
  if (db) {
    const snapshot = await db
      .collection(BOOKINGS_COLLECTION)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  return [...memBookings].reverse();
}

async function getSessionHistory(callId) {
  const db = getDb();
  if (db) {
    const doc = await db.collection(SESSIONS_COLLECTION).doc(callId).get();
    if (!doc.exists) return null;
    const data = doc.data();
    return {
      id: doc.id,
      state: data.state,
      context: data.context,
      history: data.history || [],
      booking: data.booking || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
  const session = memSessions.get(callId);
  if (!session) return null;
  return {
    id: callId,
    state: session.state,
    context: session.context,
    history: session.history || [],
    booking: session.booking || null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function getMemSessionsList() {
  const sessions = [];
  for (const [id, data] of memSessions) {
    sessions.push({
      id,
      state: data.state,
      context: data.context,
      booking: data.booking || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
  sessions.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return sessions;
}

module.exports = {
  getSession,
  saveSession,
  createBooking,
  getAllBookings,
  getSessionHistory,
  getMemSessionsList,
};
