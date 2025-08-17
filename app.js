const INSTANT_FEE_RATE = 0.013;
const DEFAULT_ICON_PATH =
  "icon/avatarFill16_Normal_Normal@3x_monochrome-white.png"; // Path to your static white icon

const balanceAmountEl = document.getElementById("balance-amount"),
  footerBalanceDisplay = document.getElementById("footer-balance-display"),
  transactionOverlay = document.getElementById("transaction-modal-overlay"),
  allModals = document.querySelectorAll(
    ".transaction-modal, .action-sheet-container"
  ),
  addMoneyPerfectedModal = document.getElementById("add-money-perfected-modal"),
  addMoneyKeypadModal = document.getElementById("add-money-keypad-modal"),
  withdrawSliderModal = document.getElementById("withdraw-slider-modal"),
  withdrawalActionSheet = document.getElementById("withdrawal-action-sheet"),
  successOverlay = document.getElementById("success-overlay"),
  featureModal = document.getElementById("feature-modal"),
  accountInfoEl = document.getElementById("account-info"),
  profileIconLink = document.querySelector(".profile-icon-link"),
  spinnerOverlay = document.getElementById("spinner-overlay");
let currentBalance = 28104.77,
  isAnimating = false;
const localStorageBalanceKey = "cashAppBalance",
  localStorageTransactionsKey = "cashAppTransactions",
  userProfileKey = "cashAppUserProfile";

const lottieSpinnerContainer = document.getElementById(
  "lottie-spinner-container"
);
let loadingSpinnerAnimation;

loadingSpinnerAnimation = bodymovin.loadAnimation({
  container: lottieSpinnerContainer,
  renderer: "svg",
  loop: true,
  autoplay: false,
  path: "loader_lm.json",
});

// ========================================================================
// --- START: FINALIZED PROFILE ICON LOGIC ---
// ========================================================================

/**
 * Creates a default user profile, selects a random icon color ONCE from the new mature palette,
 * and saves the entire profile (including the color) to local storage.
 */
function initializeUserProfile() {
  // --- NEW: A curated palette of mature, deep colors. Light colors have been removed. ---
  const colors = [
    "#C62828", // Deep Red
    "#1565C0", // Strong Blue
    "#2E7D32", // Forest Green
    "#5E35B1", // Deep Purple
    "#00695C", // Dark Teal
    "#E65100", // Burnt Orange
    "#546E7A", // Slate Gray
    "#8B572A", // Brown
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const newProfile = {
    fullName: "Jane Doe",
    cashtag: "waldoapp",
    accountNumber: "**2923",
    routingNumber: "**894",
    profilePic: null,
    defaultIconColor: randomColor, // The chosen color is saved permanently
  };

  localStorage.setItem(userProfileKey, JSON.stringify(newProfile));
  return newProfile;
}

/**
 * Generates the HTML for the profile icon.
 * It uses the real profile picture if it exists.
 * Otherwise, it uses the SAVED background color and perfected alignment for the icon.
 */
function generateProfileIcon(profile) {
  if (profile && profile.profilePic) {
    return `<img src="${profile.profilePic}" alt="Profile" class="profile-icon">`;
  }

  const backgroundColor = profile.defaultIconColor || "#546E7A"; // Fallback to Slate Gray

  // --- UPDATED: Inner icon size is now 55% for better visual centering and alignment. ---
  return `
        <div style="
            background-color: ${backgroundColor};
           width: 25px;
            height: 25px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        ">
            <img src="${DEFAULT_ICON_PATH}" alt="Profile" style="width: 65%; height: 65%; object-fit: contain;">
        </div>
    `;
}
// ========================================================================
// --- END: FINALIZED PROFILE ICON LOGIC ---
// ========================================================================

const formatCurrency = (amount) =>
    `$${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  formatCurrencyWhole = (amount) =>
    `$${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`,
  formatBalanceForFooter = (amount) =>
    amount >= 1e9
      ? `$${(amount / 1e9).toFixed(1)}B`
      : amount >= 1e6
      ? `$${(amount / 1e6).toFixed(1)}M`
      : amount >= 1e3
      ? `$${(amount / 1e3).toFixed(0)}K`
      : `$${Math.floor(amount)}`,
  adjustBalanceFontSize = (el) => {
    const len = el.textContent.length;
    if (len > 18) el.style.fontSize = "26px";
    else if (len > 15) el.style.fontSize = "30px";
    else if (len > 12) el.style.fontSize = "32px";
    else el.style.fontSize = "";
  };

const adjustWithdrawFontSize = (element) => {
  const container = element.parentElement;
  const baseFontSize = 80;
  const minFontSize = 32;
  element.style.fontSize = `${baseFontSize}px`;
  const textWidth = element.scrollWidth;
  const containerWidth = container.clientWidth;
  if (textWidth > containerWidth) {
    const scaleFactor = containerWidth / textWidth;
    const newSize = Math.floor(baseFontSize * scaleFactor);
    element.style.fontSize = `${Math.max(newSize, minFontSize)}px`;
  }
};

function calculateArrivalDay(daysToAdd) {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  let date = new Date();
  let businessDaysAdded = 0;
  while (businessDaysAdded < daysToAdd) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) businessDaysAdded++;
  }
  return dayNames[date.getDay()];
}

function animateBalance(startValue, endValue) {
  if (isAnimating) return;
  isAnimating = true;
  const duration = 700;
  let startTime = null;
  const step = (currentTime) => {
    if (!startTime) startTime = currentTime;
    const progress = Math.min((currentTime - startTime) / duration, 1),
      animatedValue = startValue + (endValue - startValue) * progress;
    balanceAmountEl.textContent = formatCurrency(animatedValue);
    footerBalanceDisplay.textContent = formatBalanceForFooter(animatedValue);
    adjustBalanceFontSize(balanceAmountEl);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      balanceAmountEl.textContent = formatCurrency(endValue);
      footerBalanceDisplay.textContent = formatBalanceForFooter(endValue);
      adjustBalanceFontSize(balanceAmountEl);
      isAnimating = false;
    }
  };
  requestAnimationFrame(step);
}

function loadState() {
  const savedBalance = localStorage.getItem(localStorageBalanceKey);
  currentBalance = parseFloat(savedBalance) || 28104.77;
  balanceAmountEl.textContent = formatCurrency(currentBalance);
  footerBalanceDisplay.textContent = formatBalanceForFooter(currentBalance);
  adjustBalanceFontSize(balanceAmountEl);

  const savedProfileJSON = localStorage.getItem(userProfileKey);
  const userProfile = savedProfileJSON
    ? JSON.parse(savedProfileJSON)
    : initializeUserProfile();

  accountInfoEl.textContent = `Account ${userProfile.accountNumber} Routing ${userProfile.routingNumber}`;
  profileIconLink.innerHTML = generateProfileIcon(userProfile);
}

function saveState() {
  localStorage.setItem(localStorageBalanceKey, currentBalance.toString());
}

function saveAddTransaction(type, amount) {
  const transactions =
    JSON.parse(localStorage.getItem(localStorageTransactionsKey)) || [];
  transactions.push({
    type,
    amount,
    date: new Date().toISOString(),
  });
  localStorage.setItem(
    localStorageTransactionsKey,
    JSON.stringify(transactions)
  );
}

function saveWithdrawalTransaction(amount, fee, totalDeduction) {
  const transactions =
    JSON.parse(localStorage.getItem(localStorageTransactionsKey)) || [];

  const newTransaction = {
    type: "withdraw",
    amount: amount,
    fee: fee,
    totalDeducted: totalDeduction,
    balanceAfter: currentBalance - totalDeduction,
    date: new Date().toISOString(),
  };

  transactions.push(newTransaction);
  localStorage.setItem(
    localStorageTransactionsKey,
    JSON.stringify(transactions)
  );
}

function handleAddTransaction(amount) {
  if (isAnimating || isNaN(amount) || amount <= 0) return;
  const startBalance = currentBalance;
  hideAllModals();
  spinnerOverlay.classList.add("show");
  loadingSpinnerAnimation.play();
  setTimeout(() => {
    spinnerOverlay.classList.remove("show");
    loadingSpinnerAnimation.stop();
    showSuccessOverlay("add", amount);
    setTimeout(() => {
      const newBalance = startBalance + amount;
      currentBalance = newBalance;
      saveState();
      saveAddTransaction("add", amount);
      animateBalance(startBalance, newBalance);
    }, 1500);
  }, 5000);
}

function handleWithdrawal(totalDeduction) {
  if (isAnimating || isNaN(totalDeduction) || totalDeduction <= 0) return;
  if (totalDeduction > currentBalance) return;
  const startBalance = currentBalance;
  currentBalance -= totalDeduction;
  saveState();
  animateBalance(startBalance, currentBalance);
}

function startWithdrawalFlow(amount, type) {
  const fee = type === "instant" ? amount * INSTANT_FEE_RATE : 0;
  const totalDeduction = amount + fee;

  if (totalDeduction > currentBalance) {
    alert("Insufficient funds for this withdrawal and its fee.");
    return;
  }

  hideAllModals();
  spinnerOverlay.classList.add("show");
  loadingSpinnerAnimation.play();

  setTimeout(() => {
    spinnerOverlay.classList.remove("show");
    loadingSpinnerAnimation.stop();
    showSuccessOverlay(type, amount);
    setTimeout(() => {
      saveWithdrawalTransaction(amount, fee, totalDeduction);
      handleWithdrawal(totalDeduction);
    }, 1500);
  }, 5000);
}

function showModal(modalEl) {
  transactionOverlay.classList.add("show");
  allModals.forEach((m) => {
    const isActionSheet = m.classList.contains("action-sheet-container");
    const shouldDisplayFlex = modalEl.parentElement === m || modalEl === m;
    m.style.display = shouldDisplayFlex ? "flex" : "none";
    if (shouldDisplayFlex) {
      m.classList.add("show");
    }
  });
  document.body.classList.add("modal-open");
}

function hideAllModals() {
  transactionOverlay.classList.add("closing");
  setTimeout(() => {
    transactionOverlay.classList.remove("show");
    transactionOverlay.classList.remove("closing");
    allModals.forEach((m) => m.classList.remove("show"));
    document.body.classList.remove("modal-open");
  }, 300);
}

function showSuccessOverlay(type, amount) {
  const successIconContainer = document.querySelector(".success-checkmark");
  const successMessageEl = document.getElementById("success-message");
  let message;
  let iconHTML;

  if (type === "add" || type === "standard") {
    iconHTML =
      '<img src="icon/check32_Normal_Normal@3x_monochrome-white.png" alt="Success" />';

    if (type === "add") {
      message = `You added ${formatCurrency(amount)} to your Cash App`;
    } else {
      const arrivalDay = calculateArrivalDay(3);
      message = `${formatCurrency(
        amount
      )} will be available in your external bank account ${arrivalDay}`;
    }
  } else if (type === "instant") {
    iconHTML = '<i class="fa-solid fa-bolt"></i>';
    message = `${formatCurrency(
      amount
    )} was transferred instantly to your bank account`;
  }

  successIconContainer.innerHTML = iconHTML;
  successMessageEl.innerHTML = message;
  successOverlay.classList.add("show");
}

function hideSuccessOverlay() {
  successOverlay.classList.remove("show");
}

function showFeatureNotImplementedModal() {
  showModal(featureModal);
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();

  const mainContent = document.querySelector(".main-content");
  const PULL_TO_REFRESH_THRESHOLD = 80;
  const PULL_RESISTANCE = 0.5;
  const DRAG_START_THRESHOLD = 10;
  let isPulling = false;
  let isDragPotential = false;
  let startPullY = 0;
  let pullDistance = 0;

  function getEventY(e) {
    return e.touches ? e.touches[0].clientY : e.clientY;
  }

  function onPullStart(e) {
    if (mainContent.scrollTop === 0 && !isAnimating) {
      isDragPotential = true;
      startPullY = getEventY(e);
    }
  }

  function onPullMove(e) {
    if (!isDragPotential) return;
    const currentY = getEventY(e);
    let deltaY = currentY - startPullY;
    if (!isPulling && deltaY > DRAG_START_THRESHOLD) {
      isPulling = true;
      mainContent.style.transition = "none";
    }
    if (isPulling) {
      e.preventDefault();
      if (deltaY < 0) deltaY = 0;
      pullDistance = (deltaY - DRAG_START_THRESHOLD) * PULL_RESISTANCE;
      mainContent.style.transform = `translateY(${pullDistance}px)`;
    }
  }

  function onPullEnd() {
    if (isPulling) {
      mainContent.style.transition =
        "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 1.1)";
      if (pullDistance >= PULL_TO_REFRESH_THRESHOLD) {
        loadState();
      }
      mainContent.style.transform = "translateY(0)";
    }
    isDragPotential = false;
    isPulling = false;
  }
  mainContent.addEventListener("mousedown", onPullStart);
  mainContent.addEventListener("touchstart", onPullStart, {
    passive: true,
  });
  document.addEventListener("mousemove", onPullMove, {
    passive: false,
  });
  document.addEventListener("mouseup", onPullEnd);
  document.addEventListener("touchmove", onPullMove, {
    passive: false,
  });
  document.addEventListener("touchend", onPullEnd);

  document
    .getElementById("add-money-btn")
    .addEventListener("click", () => showModal(addMoneyPerfectedModal));

  const perfectedPresetContainer = document.getElementById(
    "perfected-preset-container"
  );
  const perfectedAddBtn = document.getElementById("perfected-add-btn");
  let selectedPerfectedAmount = 0;

  perfectedPresetContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".perfected-preset-btn");
    if (!btn) return;
    if (btn.id === "perfected-other-btn") {
      keypadValue = "0";
      updateKeypadDisplay();
      showModal(addMoneyKeypadModal);
      return;
    }
    perfectedPresetContainer
      .querySelectorAll(".active")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedPerfectedAmount = parseFloat(btn.dataset.amount);
    perfectedAddBtn.disabled = false;
  });

  perfectedAddBtn.addEventListener("click", () => {
    if (selectedPerfectedAmount > 0) {
      handleAddTransaction(selectedPerfectedAmount);
    }
  });

  const keypad = document.getElementById("keypad");
  const keypadAmountDisplay = document.getElementById("keypad-amount-display");
  const keypadDisplayContainer = document.querySelector(".keypad-display");
  const addKeypadBtn = document.getElementById("add-keypad-btn");

  const MAX_KEYPAD_AMOUNT = 99999.99;
  let keypadValue = "0";

  function triggerKeypadLimitError() {
    if (navigator.vibrate) {
      navigator.vibrate(150);
    }
    keypadDisplayContainer.classList.add("shake");
    setTimeout(() => {
      keypadDisplayContainer.classList.remove("shake");
    }, 400);
  }

  function updateKeypadDisplay() {
    let displayValue;
    if (keypadValue === "0" || keypadValue === "") {
      displayValue = "$0";
    } else {
      const parts = keypadValue.split(".");
      const integerPart = Number(parts[0].replace(/,/g, "")).toLocaleString(
        "en-US"
      );
      displayValue =
        parts.length > 1 ? `$${integerPart}.${parts[1]}` : `$${integerPart}`;
    }
    keypadAmountDisplay.innerHTML = displayValue;

    const parent = keypadDisplayContainer;
    const maxTextWidth = parent.clientWidth * 0.9;
    keypadAmountDisplay.style.fontSize = "";

    if (keypadAmountDisplay.scrollWidth > maxTextWidth) {
      let currentFontSize = parseFloat(
        window.getComputedStyle(keypadAmountDisplay).fontSize
      );
      while (
        keypadAmountDisplay.scrollWidth > maxTextWidth &&
        currentFontSize > 10
      ) {
        currentFontSize--;
        keypadAmountDisplay.style.fontSize = `${currentFontSize}px`;
      }
    }
    const numericValue = parseFloat(keypadValue.replace(/,/g, ""));
    addKeypadBtn.disabled = !(numericValue > 0);
  }

  function handleKeypadKeyPress(key) {
    if (
      (key === "<" && keypadValue === "0") ||
      (key === "0" && keypadValue === "0")
    ) {
      triggerKeypadLimitError();
      return;
    }

    const decimalPart = keypadValue.split(".")[1];
    if (decimalPart && decimalPart.length >= 2 && key !== "<") {
      triggerKeypadLimitError();
      return;
    }

    let potentialAmount = keypadValue;

    if (key === "<") {
      potentialAmount =
        potentialAmount.length > 1 ? potentialAmount.slice(0, -1) : "0";
    } else if (key === ".") {
      if (!potentialAmount.includes(".")) {
        potentialAmount += ".";
      } else {
        triggerKeypadLimitError();
        return;
      }
    } else {
      if (potentialAmount === "0") {
        potentialAmount = key;
      } else {
        potentialAmount += key;
      }
    }

    if (parseFloat(potentialAmount.replace(/,/g, "")) > MAX_KEYPAD_AMOUNT) {
      triggerKeypadLimitError();
      return;
    }

    keypadValue = potentialAmount;
    updateKeypadDisplay();
  }

  keypad.addEventListener("click", (e) => {
    const btn = e.target.closest(".keypad-btn");
    if (btn && btn.dataset.key) {
      handleKeypadKeyPress(btn.dataset.key);
    }
  });

  addKeypadBtn.addEventListener("click", () =>
    handleAddTransaction(parseFloat(keypadValue.replace(/,/g, "")))
  );

  document
    .getElementById("keypad-close-btn")
    .addEventListener("click", hideAllModals);

  const withdrawSlider = document.getElementById("withdraw-slider"),
    withdrawAmountDisplay = document.getElementById("withdraw-amount-display"),
    withdrawConfirmBtn = document.getElementById("withdraw-confirm-btn"),
    withdrawAvailableDisplay = document.getElementById("withdraw-available");

  const withdrawalPromptAmount = document.getElementById(
      "withdrawal-prompt-amount"
    ),
    withdrawalStandardDay = document.getElementById("withdrawal-standard-day"),
    withdrawalInstantFee = document.getElementById("withdrawal-instant-fee"),
    standardWithdrawalBtn = document.getElementById("standard-withdrawal-btn"),
    instantWithdrawalBtn = document.getElementById("instant-withdrawal-btn"),
    withdrawalCancelBtn = document.getElementById("withdrawal-cancel-btn");
  let amountToWithdraw = 0;

  document.getElementById("withdraw-btn").addEventListener("click", () => {
    withdrawSlider.max = currentBalance;
    withdrawSlider.value = currentBalance;
    withdrawAvailableDisplay.textContent = `${formatCurrency(
      currentBalance
    )} available`;
    withdrawAmountDisplay.textContent = formatCurrencyWhole(currentBalance);
    adjustWithdrawFontSize(withdrawAmountDisplay);
    withdrawConfirmBtn.disabled = currentBalance <= 0;
    withdrawSlider.style.setProperty("--progress", "100%");
    showModal(withdrawSliderModal);
  });

  withdrawSlider.addEventListener("input", () => {
    const value = parseFloat(withdrawSlider.value);
    withdrawAmountDisplay.textContent = formatCurrencyWhole(value);
    adjustWithdrawFontSize(withdrawAmountDisplay);
    withdrawConfirmBtn.disabled = value <= 0;
    const maxVal = parseFloat(withdrawSlider.max);
    const progressPercent = maxVal > 0 ? (value / maxVal) * 100 : 0;
    withdrawSlider.style.setProperty("--progress", `${progressPercent}%`);
  });

  withdrawConfirmBtn.addEventListener("click", () => {
    amountToWithdraw = parseFloat(withdrawSlider.value);
    const fee = amountToWithdraw * INSTANT_FEE_RATE;
    const arrivalDay = calculateArrivalDay(3);
    withdrawalPromptAmount.textContent = formatCurrency(amountToWithdraw);
    withdrawalStandardDay.textContent = arrivalDay;
    withdrawalInstantFee.textContent = `${formatCurrency(fee)} FEE`;
    showModal(withdrawalActionSheet);
  });

  standardWithdrawalBtn.addEventListener("click", () => {
    startWithdrawalFlow(amountToWithdraw, "standard");
  });

  instantWithdrawalBtn.addEventListener("click", () => {
    startWithdrawalFlow(amountToWithdraw, "instant");
  });

  withdrawalCancelBtn.addEventListener("click", hideAllModals);

  transactionOverlay.addEventListener("click", (e) => {
    if (e.target === transactionOverlay) {
      hideAllModals();
    }
  });

  document
    .getElementById("success-close-btn")
    .addEventListener("click", hideSuccessOverlay);
  document
    .getElementById("success-done-btn")
    .addEventListener("click", hideSuccessOverlay);
  document
    .getElementById("feature-modal-ok-btn")
    .addEventListener("click", hideAllModals);

  saveState();
  window.dispatchEvent(new CustomEvent("balanceUpdated"));
});
