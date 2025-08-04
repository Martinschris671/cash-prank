const INSTANT_FEE_RATE = 0.013;

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
const defaultProfile = {
  fullName: "Jane Doe",
  cashtag: "waldoapp",
  accountNumber: "**2923",
  routingNumber: "**894",
  profilePic: "icons/person-circle-svgrepo-com.png",
};

const lottieSpinnerContainer = document.getElementById(
  "lottie-spinner-container"
);
let loadingSpinnerAnimation;

// Ensure bodymovin/lottie is loaded before this script runs
if (typeof bodymovin !== "undefined") {
  loadingSpinnerAnimation = bodymovin.loadAnimation({
    container: lottieSpinnerContainer,
    renderer: "svg",
    loop: true,
    autoplay: false,
    path: "loader_lm.json",
  });
}

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
    if (!el) return;
    const len = el.textContent.length;
    if (len > 18) el.style.fontSize = "26px";
    else if (len > 15) el.style.fontSize = "30px";
    else if (len > 12) el.style.fontSize = "32px";
    else el.style.fontSize = "";
  };

const adjustWithdrawFontSize = (element) => {
  if (!element || !element.parentElement) return;
  const container = element.parentElement;
  const maxFontSize = 60;
  const minFontSize = 28;
  element.style.fontSize = `${maxFontSize}px`;
  const textWidth = element.scrollWidth;
  const containerWidth = container.clientWidth;
  if (textWidth > containerWidth) {
    const scaleFactor = containerWidth / textWidth;
    const newSize = Math.floor(maxFontSize * scaleFactor);
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
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const animatedValue = startValue + (endValue - startValue) * progress;
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
  const savedProfile = localStorage.getItem(userProfileKey);
  const userProfile = savedProfile ? JSON.parse(savedProfile) : defaultProfile;
  accountInfoEl.textContent = `Account ${userProfile.accountNumber} Routing ${userProfile.routingNumber}`;
  const placeholderImageSrc = "icons/person-circle-svgrepo-com.png";
  if (userProfile.profilePic && profileIconLink) {
    profileIconLink.innerHTML = `<img src="${userProfile.profilePic}" alt="Profile" class="profile-icon">`;
  } else if (profileIconLink) {
    profileIconLink.innerHTML = `<img src="${placeholderImageSrc}" alt="Profile" class="profile-icon">`;
  }
}

function saveState() {
  localStorage.setItem(localStorageBalanceKey, currentBalance.toString());
}

function saveTransaction(type, amount) {
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

function handleAddTransaction(amount) {
  if (isAnimating || isNaN(amount) || amount <= 0) return;
  const startBalance = currentBalance;
  hideAllModals();
  spinnerOverlay.classList.add("show");
  if (loadingSpinnerAnimation) loadingSpinnerAnimation.play();
  setTimeout(() => {
    spinnerOverlay.classList.remove("show");
    if (loadingSpinnerAnimation) loadingSpinnerAnimation.stop();
    showSuccessOverlay("add", amount);
    setTimeout(() => {
      const newBalance = startBalance + amount;
      currentBalance = newBalance;
      saveState();
      saveTransaction("add", amount);
      animateBalance(startBalance, newBalance);
    }, 1500);
  }, 5000);
}

function handleWithdrawal(amount) {
  if (isAnimating || isNaN(amount) || amount <= 0) return;
  if (amount > currentBalance) {
    // This is a safeguard, the primary check is in startWithdrawalFlow
    alert("Error: Attempted to withdraw more than available balance.");
    return;
  }
  const startBalance = currentBalance;
  const newBalance = startBalance - amount;
  currentBalance = newBalance;
  saveState();
  saveTransaction("withdraw", amount);
  animateBalance(startBalance, newBalance);
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
  if (loadingSpinnerAnimation) loadingSpinnerAnimation.play();

  setTimeout(() => {
    spinnerOverlay.classList.remove("show");
    if (loadingSpinnerAnimation) loadingSpinnerAnimation.stop();
    showSuccessOverlay(type, amount);
    setTimeout(() => {
      // The amount passed to handleWithdrawal should be the total amount to be removed from the balance.
      handleWithdrawal(totalDeduction);
    }, 1500);
  }, 5000);
}

function showModal(modalEl) {
  if (!transactionOverlay || !modalEl) return;
  transactionOverlay.classList.add("show");
  allModals.forEach((m) => {
    m.style.display = "none"; // Hide all first
    m.classList.remove("show");
  });

  // Show the specific modal
  modalEl.style.display = "flex";
  modalEl.classList.add("show");

  // If it's an action sheet, its container also needs to be visible
  if (modalEl.parentElement.classList.contains("action-sheet-container")) {
    modalEl.parentElement.style.display = "flex";
    modalEl.parentElement.classList.add("show");
  }

  document.body.classList.add("modal-open");
}

function hideAllModals() {
  if (!transactionOverlay) return;
  transactionOverlay.classList.add("closing");
  setTimeout(() => {
    transactionOverlay.classList.remove("show");
    transactionOverlay.classList.remove("closing");
    allModals.forEach((m) => {
      m.classList.remove("show");
      m.style.display = "none";
    });
    document.body.classList.remove("modal-open");
  }, 300);
}

function showSuccessOverlay(type, amount) {
  const successIconEl = document.getElementById("success-icon");
  const successMessageEl = document.getElementById("success-message");
  if (!successIconEl || !successMessageEl || !successOverlay) return;
  let message;
  let iconClass;

  if (type === "add") {
    message = `You added ${formatCurrency(amount)} to your Cash App`;
    iconClass = "fas fa-check";
  } else if (type === "standard") {
    const arrivalDay = calculateArrivalDay(3);
    message = `${formatCurrency(
      amount
    )} will be available in your external bank account ${arrivalDay}`;
    iconClass = "fas fa-check";
  } else if (type === "instant") {
    message = `${formatCurrency(
      amount
    )} was transferred instantly to your bank account`;
    iconClass = "fas fa-bolt";
  }

  successIconEl.className = iconClass;
  successMessageEl.innerHTML = message;
  successOverlay.classList.add("show");
}

function hideSuccessOverlay() {
  if (successOverlay) successOverlay.classList.remove("show");
}

function showFeatureNotImplementedModal() {
  if (featureModal) showModal(featureModal);
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();

  const mainContent = document.querySelector(".main-content");
  if (mainContent) {
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
        if (e.cancelable) e.preventDefault();
        if (deltaY < 0) deltaY = 0;
        pullDistance = (deltaY - DRAG_START_THRESHOLD) * PULL_RESISTANCE;
        mainContent.style.transform = `translateY(${pullDistance}px)`;
      }
    }

    function onPullEnd() {
      if (isPulling) {
        mainContent.style.transition =
          "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
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
  }

  const addMoneyBtn = document.getElementById("add-money-btn");
  if (addMoneyBtn) {
    addMoneyBtn.addEventListener("click", () =>
      showModal(addMoneyPerfectedModal)
    );
  }

  const perfectedPresetContainer = document.getElementById(
    "perfected-preset-container"
  );
  const perfectedAddBtn = document.getElementById("perfected-add-btn");
  if (perfectedPresetContainer && perfectedAddBtn) {
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
  }

  const keypad = document.getElementById("keypad"),
    keypadAmountDisplay = document.getElementById("keypad-amount-display"),
    keypadDisplayContainer = document.querySelector(".keypad-display"),
    addKeypadBtn = document.getElementById("add-keypad-btn");
  if (keypad && keypadAmountDisplay && keypadDisplayContainer && addKeypadBtn) {
    const MAX_KEYPAD_AMOUNT = 99999;
    let keypadValue = "0";

    function triggerLimitError() {
      if (navigator.vibrate) {
        navigator.vibrate(150);
      }
      keypadDisplayContainer.classList.add("shake");
      setTimeout(() => {
        keypadDisplayContainer.classList.remove("shake");
      }, 400);
    }

    function adjustKeypadFontSize() {
      const len = keypadAmountDisplay.textContent.length;
      if (len > 13) {
        keypadAmountDisplay.style.fontSize = "3rem";
      } else if (len > 10) {
        keypadAmountDisplay.style.fontSize = "4rem";
      } else {
        keypadAmountDisplay.style.fontSize = "5rem";
      }
    }
    const updateKeypadDisplay = () => {
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
      adjustKeypadFontSize();
      const numericValue = parseFloat(keypadValue.replace(/,/g, ""));
      addKeypadBtn.disabled = numericValue <= 0 || isNaN(numericValue);
    };

    updateKeypadDisplay();

    keypad.addEventListener("click", (e) => {
      const key = e.target.closest(".keypad-btn")?.dataset.key;
      if (!key) return;
      const previousValue = keypadValue;
      let rawValue = keypadValue.replace(/,/g, "");
      if (key === "<") {
        rawValue = rawValue.length > 1 ? rawValue.slice(0, -1) : "0";
      } else if (key === "." && !rawValue.includes(".")) {
        rawValue += ".";
      } else if (key >= "0" && key <= "9") {
        if (rawValue === "0" && key !== ".") {
          rawValue = key;
        } else {
          const decimalPart = rawValue.split(".")[1];
          if (decimalPart && decimalPart.length >= 2) {
            return;
          }
          rawValue += key;
        }
      }
      const numericCheck = parseFloat(rawValue);
      if (numericCheck > MAX_KEYPAD_AMOUNT) {
        keypadValue = previousValue;
        triggerLimitError();
        return;
      }
      keypadValue = rawValue;
      updateKeypadDisplay();
    });

    addKeypadBtn.addEventListener("click", () =>
      handleAddTransaction(parseFloat(keypadValue.replace(/,/g, "")))
    );
  }

  const keypadCloseBtn = document.getElementById("keypad-close-btn");
  if (keypadCloseBtn) keypadCloseBtn.addEventListener("click", hideAllModals);

  // --- WITHDRAWAL LOGIC ---
  const withdrawBtn = document.getElementById("withdraw-btn");
  const withdrawSlider = document.getElementById("withdraw-slider");
  const withdrawAmountDisplay = document.getElementById(
    "withdraw-amount-display"
  );
  const withdrawConfirmBtn = document.getElementById("withdraw-confirm-btn");
  const withdrawAvailableDisplay =
    document.getElementById("withdraw-available");
  const withdrawalPromptAmount = document.getElementById(
    "withdrawal-prompt-amount"
  );
  const withdrawalStandardDay = document.getElementById(
    "withdrawal-standard-day"
  );
  const withdrawalInstantFee = document.getElementById(
    "withdrawal-instant-fee"
  );
  const standardWithdrawalBtn = document.getElementById(
    "standard-withdrawal-btn"
  );
  const instantWithdrawalBtn = document.getElementById(
    "instant-withdrawal-btn"
  );
  const withdrawalCancelBtn = document.getElementById("withdrawal-cancel-btn");
  let amountToWithdraw = 0;

  if (withdrawBtn) {
    withdrawBtn.addEventListener("click", () => {
      if (!withdrawSliderModal || !withdrawSlider) return;
      withdrawSlider.max = currentBalance;
      withdrawSlider.value = currentBalance;
      if (withdrawAvailableDisplay) {
        withdrawAvailableDisplay.textContent = `${formatCurrency(
          currentBalance
        )} available`;
      }
      if (withdrawAmountDisplay) {
        withdrawAmountDisplay.textContent = formatCurrencyWhole(currentBalance);
        adjustWithdrawFontSize(withdrawAmountDisplay);
      }
      if (withdrawConfirmBtn) {
        withdrawConfirmBtn.disabled = currentBalance <= 0;
      }
      withdrawSlider.style.setProperty("--progress", "100%");
      showModal(withdrawSliderModal);
    });
  }

  if (withdrawSlider) {
    withdrawSlider.addEventListener("input", () => {
      const value = parseFloat(withdrawSlider.value);
      if (withdrawAmountDisplay) {
        withdrawAmountDisplay.textContent = formatCurrencyWhole(value);
        adjustWithdrawFontSize(withdrawAmountDisplay);
      }
      if (withdrawConfirmBtn) {
        withdrawConfirmBtn.disabled = value <= 0;
      }
      const maxVal = parseFloat(withdrawSlider.max);
      const progressPercent = maxVal > 0 ? (value / maxVal) * 100 : 0;
      withdrawSlider.style.setProperty("--progress", `${progressPercent}%`);
    });
  }

  if (withdrawConfirmBtn) {
    withdrawConfirmBtn.addEventListener("click", () => {
      if (!withdrawSlider || !withdrawalActionSheet) return;
      amountToWithdraw = parseFloat(withdrawSlider.value);
      if (amountToWithdraw <= 0) return;

      const fee = amountToWithdraw * INSTANT_FEE_RATE;
      const arrivalDay = calculateArrivalDay(3);

      if (withdrawalPromptAmount)
        withdrawalPromptAmount.textContent = formatCurrency(amountToWithdraw);
      if (withdrawalStandardDay) withdrawalStandardDay.textContent = arrivalDay;
      if (withdrawalInstantFee)
        withdrawalInstantFee.textContent = `${formatCurrency(fee)} FEE`;

      // Use the specific action sheet content for showModal
      const actionSheetContent = withdrawalActionSheet.querySelector(
        ".action-sheet-content"
      );
      if (actionSheetContent) {
        showModal(withdrawalActionSheet);
      }
    });
  }

  if (standardWithdrawalBtn) {
    standardWithdrawalBtn.addEventListener("click", () => {
      startWithdrawalFlow(amountToWithdraw, "standard");
    });
  }

  if (instantWithdrawalBtn) {
    instantWithdrawalBtn.addEventListener("click", () => {
      startWithdrawalFlow(amountToWithdraw, "instant");
    });
  }

  if (withdrawalCancelBtn) {
    withdrawalCancelBtn.addEventListener("click", hideAllModals);
  }

  if (transactionOverlay) {
    transactionOverlay.addEventListener("click", (e) => {
      if (e.target === transactionOverlay) hideAllModals();
    });
  }
  const successCloseBtn = document.getElementById("success-close-btn");
  if (successCloseBtn)
    successCloseBtn.addEventListener("click", hideSuccessOverlay);

  const successDoneBtn = document.getElementById("success-done-btn");
  if (successDoneBtn)
    successDoneBtn.addEventListener("click", hideSuccessOverlay);

  const featureModalOkBtn = document.getElementById("feature-modal-ok-btn");
  if (featureModalOkBtn)
    featureModalOkBtn.addEventListener("click", hideAllModals);

  saveState();
  window.dispatchEvent(new CustomEvent("balanceUpdated"));
});
