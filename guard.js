// guard.js - The Subscription Security Guard

// This script runs on every protected page to check for a valid subscription.

const currentUserEmail = localStorage.getItem("lastAppUser");

if (!currentUserEmail) {
  // If no user is logged in at all, they have no business being on a protected page.
  // Send them straight to the authentication page.
  window.location.replace("authentication.html");
} else {
  // A user is logged in, now check their specific subscription status.
  const userSubData =
    JSON.parse(localStorage.getItem(`sub_${currentUserEmail}`)) || {};
  const { status, endDate: endDateString } = userSubData;

  let isExpired = true; // Assume expired by default for safety.

  if (status === "LIFETIME") {
    // A lifetime subscription is never expired.
    isExpired = false;
  } else if (endDateString) {
    // If an end date exists, check if it's in the future.
    const endDate = new Date(endDateString);
    if (endDate.getTime() > Date.now()) {
      isExpired = false;
    }
  }

  // THE FINAL CHECK: If the subscription is determined to be expired...
  if (isExpired) {
    // ...immediately send the user to the subscription paywall.
    // `window.location.replace` prevents the user from using the "back" button to bypass this.
    window.location.replace("subscription.html");
  }
}
