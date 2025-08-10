// This is the full, corrected, and final code for api/signup.js

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

const dbPath = path.join("/tmp", "db.json");
const adapter = new FileSync(dbPath);
const db = low(adapter);

// Set default data structure if the database file is new
db.defaults({ trials: [] }).write();

module.exports = (req, res) => {
  // We only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { email, fingerprint, action } = req.body; // We now get an 'action'

    if (!fingerprint || !action) {
      return res
        .status(400)
        .json({ message: "Fingerprint and action are required." });
    }

    // Find if a trial with this fingerprint already exists in our database
    const existingTrial = db
      .get("trials")
      .find({ fingerprint: fingerprint })
      .value();

    // --- LOGIC FOR THE 'check' ACTION ---
    if (action === "check") {
      if (existingTrial) {
        // If the device exists, tell the front-end it's a returning user.
        return res.status(200).json({ status: "device_exists" });
      } else {
        // If the device is new, tell the front-end it can create an account.
        return res.status(200).json({ status: "device_is_new" });
      }
    }

    // --- LOGIC FOR THE 'create' ACTION ---
    if (action === "create") {
      if (existingTrial) {
        // This is a safety check. A user should never be able to call 'create'
        // if their device already exists, but we block it on the server just in case.
        return res
          .status(403)
          .json({
            message: "This device is not eligible for a new free trial.",
          });
      } else {
        // The device is new, so we create the permanent trial record.
        if (!email) {
          return res
            .status(400)
            .json({ message: "Email is required to create a trial." });
        }
        db.get("trials")
          .push({
            email: email,
            fingerprint: fingerprint,
            signup_date: new Date().toISOString(),
          })
          .write(); // Save the new record to the file

        // Send a success response
        return res.status(201).json({ status: "trial_created" });
      }
    }

    // If the action is not 'check' or 'create', it's an invalid request.
    return res.status(400).json({ message: "Invalid action specified." });
  } catch (error) {
    console.error("Function Crash:", error);
    return res
      .status(500)
      .json({ message: "An internal server error occurred." });
  }
};
