// This is the upgraded code for api/signup.js

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

const dbPath = path.join("/tmp", "db.json");
const adapter = new FileSync(dbPath);
const db = low(adapter);

// Set default data if the database file doesn't exist
db.defaults({ trials: [], users: {} }).write(); // We add a 'users' object now

module.exports = (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { email, fingerprint } = req.body;

    if (!email || !fingerprint) {
      return res
        .status(400)
        .json({ message: "Email and fingerprint are required." });
    }

    const existingTrial = db
      .get("trials")
      .find({ fingerprint: fingerprint })
      .value();

    if (existingTrial) {
      return res
        .status(403)
        .json({ message: "This device is not eligible for a new free trial." });
    } else {
      // -- UPGRADE --
      // We now also create the user's subscription record on the server
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 2); // 2-day trial

      // Save the user's subscription status, keyed by their email
      db.set(`users.${email.replace(/\./g, "_")}`, {
        // Replace dots in email for a safe key
        status: "TRIAL",
        endDate: trialEndDate.toISOString(),
      }).write();

      // Save the device fingerprint to prevent re-use
      db.get("trials")
        .push({
          email: email,
          fingerprint: fingerprint,
          signup_date: new Date().toISOString(),
        })
        .write();

      return res.status(201).json({ message: "Trial approved by server." });
    }
  } catch (error) {
    console.error("Function Crash:", error);
    return res
      .status(500)
      .json({ message: "An internal server error occurred." });
  }
};
