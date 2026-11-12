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
  const k = e.key;
  if (/^[0-9]$/.test(k)) handle("digit", k);
  else if (k === ".") handle("decimal");
  else if ("+-*/".includes(k)) handle("op", k);
  else if (k === "Enter" || k === "=") { e.preventDefault(); handle("equals"); }
  else if (k === "Backspace") handle("back");
  else if (k === "Escape") handle("clear");
  else if (k === "%") handle("percent");
});

update();
