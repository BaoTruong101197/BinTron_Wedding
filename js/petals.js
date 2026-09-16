(function () {
const PETAL_EMOJI = ["🌸", "🌺", "🌼", "🌷"];
const PETAL_INTERVAL_MS = 500;
const PETAL_LIFETIME_MS = 8500;

let active = false;
let intervalId = null;

function spawnPetal() {
  const petal = document.createElement("div");
  petal.className = "petal";
  petal.textContent = PETAL_EMOJI[Math.floor(Math.random() * PETAL_EMOJI.length)];
  petal.style.left = `${Math.random() * 100}%`;
  petal.style.fontSize = `${14 + Math.random() * 16}px`;
  petal.style.animationDuration = `${4 + Math.random() * 4}s`;
  document.body.appendChild(petal);
  setTimeout(() => petal.remove(), PETAL_LIFETIME_MS);
}

function start() {
  if (active) return;
  active = true;
  intervalId = setInterval(spawnPetal, PETAL_INTERVAL_MS);
}

window.Petals = { start };
})();
