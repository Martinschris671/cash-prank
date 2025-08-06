// This is the full code for the new file: api/status.js

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

const dbPath = path.join("/tmp", "db.json");
const adapter = new FileSync(dbPath);
const db = low(adapter);

// Set default data
db.defaults({ trials: [], users: {} }).write();

module.exports = (req, res) => {
  // We only accept GET requests with a user email
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { email } = req.query; // e.g., /api/status?email=user@example.com

  if (!email) {
    return res.status(400).json({ message: "User email is required." });
  }

  try {
    // Find the user's subscription data on the server
    const userSubData = db.get(`users.${email.replace(/\./g, "_")}`).value();

    if (userSubData) {
      // User found, return their status
      return res.status(200).json(userSubData);
    } else {
      // No subscription data found for this user on the server
      return res
        .status(404)
        .json({
          status: "EXPIRED",
          endDate: null,
          message: "No subscription found.",
        });
    }
  } catch (error) {
    console.error("Status Check Crash:", error);
    return res
      .status(500)
      .json({ message: "An internal server error occurred." });
  }
};
