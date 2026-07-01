const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function getDb() {
  if (getApps().length === 0) {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;

    if (!serviceAccountBase64) {
      return null;
    }

    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountBase64, "base64").toString("utf8")
    );

    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  return getFirestore();
}

module.exports = { getDb };