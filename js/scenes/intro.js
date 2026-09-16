(function () {
let lineEls = [];
let cancelled = false;

function buildDom(container) {
  const linesMarkup = CONFIG.intro.texts
    .map((text, i) => `<p class="love-line seq-line" id="intro-line-${i}">${resolveDateToken(text)}</p>`)
    .join("");

  container.innerHTML = `
    <div class="scene__inner intro-content">
      <div class="love-line-stack">${linesMarkup}</div>
    </div>
  `;

  lineEls = Array.from(container.querySelectorAll(".seq-line"));
}

function init(container) {
  buildDom(container);
}

async function enter(context, advance) {
  cancelled = false;
  lineEls.forEach((el) => el.classList.remove("is-shown"));
  context.petals.start();

  // Mở màn bằng hiệu ứng "bay xuyên qua dải trái tim" (js/heartsWarp.js) - đây là
  // scene đầu tiên người xem thấy (không còn màn verification làm bước đệm nữa) -
  // rồi mới hiện tuần tự từng dòng như cũ.
  await playHeartsWarp();
  if (cancelled) return;

  // Hiện từng dòng trong CONFIG.intro.texts một, theo đúng thứ tự đã khai báo,
  // thay vì cùng lúc - để cảm giác như đang đọc một lời tâm sự chứ không phải
  // xem 1 khối chữ.
  await revealSequential(lineEls, { holdMs: 3900, fadeMs: 900, lastStay: true });
  if (cancelled) return;

  await wait(3300);
  if (cancelled) return;
  advance();
}

function exit() {
  cancelled = true;
  window.cancelHeartsWarp?.();
}

window.Scenes = window.Scenes || {};
window.Scenes.intro = { init, enter, exit };
})();
