/**
 * Màn "chọn quà": hiện vài ô quà, người xem bấm chọn 1 ô. Dù chọn ô nào thì
 * cũng dẫn tới CÙNG 1 kết quả - video bí mật bên dưới (1 "cú lừa" dễ thương có
 * chủ đích). Video dùng lại đúng pattern phát video của memories.js: khung
 * đơn, tự phát có tiếng (đã qua start-gate nên không cần cử chỉ riêng), hạ
 * nhạc nền lúc phát, chỉ advance() khi video kết thúc, có fallback placeholder
 * lúc chưa có file thật để vẫn test được luồng.
 */
(function () {
const TRANSITION_MS = 900; // phải khớp với transition trong gift.css

let pickStageEl;
let boxEls = [];
let captionStageEl;
let revealStageEl;
let mediaSlotEl;
let sceneContext = null;
let cancelled = false;

function buildDom(container) {
  const boxesMarkup = Array.from({ length: CONFIG.gift.boxCount }, (_, i) => i)
    .map(
      (i) => `
        <button type="button" class="gift-box gift-box--${(i % 3) + 1}" data-index="${i}" aria-label="Món quà ${i + 1}">
          <span class="gift-box__shadow"></span>
          <span class="gift-box__body">
            <span class="gift-box__ribbon-v"></span>
            <span class="gift-box__ribbon-h"></span>
            <span class="gift-box__bow"></span>
          </span>
        </button>
      `
    )
    .join("");

  container.innerHTML = `
    <div class="scene__inner gift-content">
      <div class="gift-pick-stage" id="gift-pick-stage">
        <h2 class="gift-heading">${CONFIG.gift.heading}</h2>
        <p class="gift-subheading">${CONFIG.gift.subheading}</p>
        <div class="gift-boxes" id="gift-boxes">${boxesMarkup}</div>
      </div>
      <div class="gift-caption-stage" id="gift-caption-stage" hidden>
        <p class="gift-caption" id="gift-caption">${resolveDateToken(CONFIG.gift.caption)}</p>
      </div>
      <div class="gift-reveal-stage" id="gift-reveal-stage">
        <h2 class="gift-reveal-heading">${CONFIG.gift.revealHeading}</h2>
        <div class="gift-reveal-frame">
          <div class="gift-reveal-slot" id="gift-reveal-slot"></div>
        </div>
      </div>
    </div>
  `;

  pickStageEl = container.querySelector("#gift-pick-stage");
  boxEls = Array.from(container.querySelectorAll(".gift-box"));
  captionStageEl = container.querySelector("#gift-caption-stage");
  revealStageEl = container.querySelector("#gift-reveal-stage");
  mediaSlotEl = container.querySelector("#gift-reveal-slot");
}

function revealPlaceholderMarkup() {
  return `
    <div class="memory-placeholder gift-reveal-placeholder">
      <span class="memory-placeholder__icon">🎬</span>
      <span class="memory-placeholder__label">Video bí mật</span>
    </div>
  `;
}

/** Phát video bí mật - dùng lại đúng cơ chế duck/unduck + fallback placeholder
 * của memories.js. Chỉ gọi advance() khi video (hoặc placeholder giả lập)
 * kết thúc. */
function playRevealVideo(advance) {
  const src = CONFIG.gift.revealVideo;

  if (!src) {
    mediaSlotEl.innerHTML = revealPlaceholderMarkup();
    setTimeout(() => {
      if (cancelled) return;
      advance();
    }, CONFIG.timing.giftPlaceholderDuration);
    return;
  }

  sceneContext.audioPlayer.duck();

  mediaSlotEl.innerHTML = `<video class="gift-reveal-video" playsinline></video>`;
  const videoEl = mediaSlotEl.querySelector("video");
  videoEl.addEventListener(
    "ended",
    () => {
      if (cancelled) return;
      sceneContext.audioPlayer.unduck();
      advance();
    },
    { once: true }
  );
  videoEl.src = src;

  const playPromise = videoEl.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      videoEl.muted = true;
      videoEl.play().catch(() => {});
    });
  }
}

/** Chọn 1 ô: ô được chọn "bật lên" ăn mừng, các ô còn lại mờ đi - rồi cả màn
 * chọn quà nhường chỗ cho 1 dòng caption riêng (giống hệt kiểu caption của
 * memories.js), giữ 1 nhịp rồi mới nhường tiếp cho video bí mật. */
function chooseBox(chosenEl, advance) {
  boxEls.forEach((el) => {
    el.disabled = true;
    if (el === chosenEl) {
      el.classList.add("is-chosen");
    } else {
      el.classList.add("is-fading");
    }
  });

  setTimeout(() => {
    if (cancelled) return;
    pickStageEl.classList.add("is-leaving");

    setTimeout(() => {
      if (cancelled) return;
      pickStageEl.hidden = true;
      captionStageEl.hidden = false;

      // Chờ 1 frame để "hidden -> hiện" kịp chốt trước khi bật is-shown, nếu
      // không transition opacity sẽ không chạy (phần tử vừa đổi display, chưa
      // kịp coi là "đã có trạng thái ban đầu" để so sánh).
      requestAnimationFrame(() => {
        if (cancelled) return;
        captionStageEl.classList.add("is-shown");
      });

      setTimeout(() => {
        if (cancelled) return;
        captionStageEl.classList.remove("is-shown");

        setTimeout(() => {
          if (cancelled) return;
          captionStageEl.hidden = true;
          revealStageEl.classList.add("is-active");

          requestAnimationFrame(() => {
            if (cancelled) return;
            revealStageEl.classList.add("is-shown");
          });

          playRevealVideo(advance);
        }, TRANSITION_MS);
      }, CONFIG.timing.giftCaptionHold);
    }, TRANSITION_MS);
  }, 650);
}

function init(container) {
  // buildDom(container);
}

function enter(context, advance) {
  sceneContext = context;
  cancelled = false;

  pickStageEl.hidden = false;
  pickStageEl.classList.remove("is-leaving");
  captionStageEl.hidden = true;
  captionStageEl.classList.remove("is-shown");
  revealStageEl.classList.remove("is-active", "is-shown");
  mediaSlotEl.innerHTML = "";
  boxEls.forEach((el) => {
    el.disabled = false;
    el.classList.remove("is-chosen", "is-fading");
    el.onclick = () => chooseBox(el, advance);
  });
}

function exit() {
  cancelled = true;
  boxEls.forEach((el) => {
    el.onclick = null;
  });
  const video = mediaSlotEl && mediaSlotEl.querySelector("video");
  if (video) video.pause();
  // Phòng khi thoát scene giữa lúc video bí mật đang hạ nhạc nền dở.
  sceneContext?.audioPlayer.unduck();
}

window.Scenes = window.Scenes || {};
window.Scenes.gift = { init, enter, exit };
})();
