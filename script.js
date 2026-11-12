// Simple calculator: keeps the first number, the chosen operator,
// and the number currently being typed.

const currentEl = document.getElementById("current");
const historyEl = document.getElementById("history");

let current = "0";      // number being typed (as text)
let previous = null;    // first number in the calculation
let operator = null;    // "+", "-", "*" or "/"
let startNew = false;   // true right after an operator or "=" is pressed

const symbols = { "+": "+", "-": "−", "*": "×", "/": "÷" };

function calculate(a, b, op) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? NaN : a / b;
  }
}

// Round off floating-point noise (e.g. 0.1 + 0.2)
function format(num) {
  if (!isFinite(num)) return "Error";
  return String(parseFloat(num.toPrecision(12)));
}

function update() {
  currentEl.textContent = current;
  historyEl.textContent =
    previous !== null && operator ? `${previous} ${symbols[operator]}` : "";
  document.querySelectorAll(".key.op").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.op === operator && startNew)
  );
  renderConversion();
}

function inputDigit(d) {
  if (current === "Error" || startNew) {
    current = d;
    startNew = false;
  } else {
    current = current === "0" ? d : current + d;
  }
}

function inputDecimal() {
  if (current === "Error" || startNew) {
    current = "0.";
    startNew = false;
  } else if (!current.includes(".")) {
    current += ".";
  }
}

function chooseOperator(op) {
  if (current === "Error") return;
  // Chain calculations: 2 + 3 + ... shows 5 before the next number
  if (operator && !startNew) {
    current = format(calculate(parseFloat(previous), parseFloat(current), operator));
  }
  previous = current;
  operator = op;
  startNew = true;
}

function equals() {
  if (!operator || current === "Error") return;
  const expr = `${previous} ${symbols[operator]} ${current} =`;
  current = format(calculate(parseFloat(previous), parseFloat(current), operator));
  previous = null;
  operator = null;
  startNew = true;
  update();
  historyEl.textContent = expr;
}

function clearAll() {
  current = "0";
  previous = null;
  operator = null;
  startNew = false;
}

function handle(action, value) {
  switch (action) {
    case "digit":   inputDigit(value); break;
    case "decimal": inputDecimal(); break;
    case "op":      chooseOperator(value); break;
    case "equals":  equals(); return;
    case "clear":   clearAll(); break;
    case "sign":    if (current !== "Error" && current !== "0") current = format(-parseFloat(current)); break;
    case "percent": if (current !== "Error") current = format(parseFloat(current) / 100); break;
    case "back":
      if (current === "Error" || startNew) break;
      current = current.length > 1 ? current.slice(0, -1) : "0";
      if (current === "-") current = "0";
      break;
  }
  update();
}

// Button clicks
document.querySelector(".keys").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.digit) handle("digit", btn.dataset.digit);
  else if (btn.dataset.op) handle("op", btn.dataset.op);
  else handle(btn.dataset.action);
});

// Keyboard support
document.addEventListener("keydown", e => {
  if (e.target.tagName === "SELECT") return;  // let currency dropdowns use the keys
  const k = e.key;
  if (/^[0-9]$/.test(k)) handle("digit", k);
  else if (k === ".") handle("decimal");
  else if ("+-*/".includes(k)) handle("op", k);
  else if (k === "Enter" || k === "=") { e.preventDefault(); handle("equals"); }
  else if (k === "Backspace") handle("back");
  else if (k === "Escape") handle("clear");
  else if (k === "%") handle("percent");
});

// ---------- Currency converter ----------
// Converts the number on the display. Rates come from the free Frankfurter API
// (European Central Bank reference rates, updated each working day).
const RATES_URL = "https://api.frankfurter.dev/v1/latest?base=EUR";
const NAMES_URL = "https://api.frankfurter.dev/v1/currencies";

const convEl     = document.getElementById("converter");
const convToggle = document.getElementById("convToggle");
const fromSel    = document.getElementById("convFrom");
const toSel      = document.getElementById("convTo");
const convResult = document.getElementById("convResult");
const convRate   = document.getElementById("convRate");
const convUse    = document.getElementById("convUse");

let rates = null;        // units of each currency per 1 EUR, e.g. { EUR: 1, USD: 1.08 }
let ratesDate = "";
let ratesState = "idle"; // "idle" | "loading" | "ready" | "error"

function loadPref(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function savePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

function money(value, code) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency", currency: code, maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${format(value)} ${code}`;
  }
}

function convertedAmount() {
  const amount = parseFloat(current);
  if (ratesState !== "ready" || !isFinite(amount)) return null;
  return amount * rates[toSel.value] / rates[fromSel.value];
}

function renderConversion() {
  if (convEl.hidden) return;
  convUse.disabled = true;
  convRate.textContent = "";
  if (ratesState === "error") {
    convResult.textContent = "Couldn't load rates";
    convRate.textContent = "Check your connection and reopen.";
    return;
  }
  if (ratesState !== "ready") {
    convResult.textContent = "Loading rates…";
    return;
  }
  const from = fromSel.value, to = toSel.value;
  const rate = rates[to] / rates[from];
  convRate.textContent = `1 ${from} = ${parseFloat(rate.toPrecision(5))} ${to} · ${ratesDate}`;
  const value = convertedAmount();
  if (value === null) {
    convResult.textContent = "—";
    return;
  }
  convResult.textContent = money(value, to);
  convUse.disabled = false;
}

function fillSelects(names) {
  const codes = Object.keys(rates).sort();
  const options = codes
    .map(c => `<option value="${c}">${c}${names[c] ? " — " + names[c] : ""}</option>`)
    .join("");
  fromSel.innerHTML = options;
  toSel.innerHTML = options;
  const from = loadPref("convFrom", "USD");
  const to = loadPref("convTo", "EUR");
  fromSel.value = codes.includes(from) ? from : "USD";
  toSel.value = codes.includes(to) ? to : "EUR";
}

async function loadRates() {
  ratesState = "loading";
  renderConversion();
  try {
    const [ratesRes, names] = await Promise.all([
      fetch(RATES_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(NAMES_URL).then(r => r.json()).catch(() => ({}))  // names are optional
    ]);
    rates = { ...ratesRes.rates, [ratesRes.base]: 1 };
    ratesDate = new Date(ratesRes.date + "T00:00:00").toLocaleDateString(undefined, {
      day: "numeric", month: "short", year: "numeric"
    });
    fillSelects(names);
    ratesState = "ready";
  } catch {
    ratesState = "error";
  }
  renderConversion();
}

convToggle.addEventListener("click", () => {
  convEl.hidden = !convEl.hidden;
  convToggle.setAttribute("aria-expanded", String(!convEl.hidden));
  if (!convEl.hidden && (ratesState === "idle" || ratesState === "error")) loadRates();
  else renderConversion();
});

fromSel.addEventListener("change", () => { savePref("convFrom", fromSel.value); renderConversion(); });
toSel.addEventListener("change", () => { savePref("convTo", toSel.value); renderConversion(); });

document.getElementById("convSwap").addEventListener("click", () => {
  [fromSel.value, toSel.value] = [toSel.value, fromSel.value];
  savePref("convFrom", fromSel.value);
  savePref("convTo", toSel.value);
  renderConversion();
});

// Put the converted amount on the display so you can keep calculating with it
convUse.addEventListener("click", () => {
  const value = convertedAmount();
  if (value === null) return;
  const expr = `${current} ${fromSel.value} → ${toSel.value}`;
  current = format(Math.round(value * 100) / 100);
  previous = null;
  operator = null;
  startNew = true;
  update();
  historyEl.textContent = expr;
});

update();
