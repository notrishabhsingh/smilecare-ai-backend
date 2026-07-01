const { Router } = require("express");
const firestore = require("../services/firestoreService");
const { getDb } = require("../config/firebase");

const router = Router();

router.get("/bookings", async (_req, res, next) => {
  try {
    const bookings = await firestore.getAllBookings();
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

router.get("/sessions/:callId", async (req, res, next) => {
  try {
    const { callId } = req.params;
    const session = await firestore.getSessionHistory(callId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

router.get("/sessions", async (_req, res, next) => {
  try {
    const db = getDb();
    if (db) {
      const snapshot = await db
        .collection("sessions")
        .orderBy("updatedAt", "desc")
        .limit(50)
        .get();
      const sessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        state: doc.data().state,
        context: doc.data().context,
        booking: doc.data().booking || null,
        createdAt: doc.data().createdAt,
        updatedAt: doc.data().updatedAt,
      }));
      return res.json({ sessions });
    }
    const { getMemSessionsList } = require("../services/firestoreService");
    const sessions = getMemSessionsList();
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
