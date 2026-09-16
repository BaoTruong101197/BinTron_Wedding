(function () {
const TRANSITION_MS = 900; // phải khớp với transition trong memories.css

let captionEntries = [];
let mediaWrapEl;
let mediaSlotEl;
let counterEl;
let textEntries = [];
let index = 0;
let timeoutId = null;
let cancelled = false;
let stepToken = 0;
let sceneContext = null;

function placeholderMarkup(memIndex, videoIndex, totalVideos) {
  const label =
    totalVideos > 1
      ? `Kỉ niệm ${memIndex + 1} — Video ${videoIndex + 1}/${totalVideos}`
      : `Kỉ niệm ${memIndex + 1} — Video`;
  return `
    <div class="memory-placeholder">
      <span class="memory-placeholder__icon">🎬</span>
      <span class="memory-placeholder__label">${label}</span>
    </div>
  `;
}

function buildDom(container) {
  container.innerHTML = `
    <div class="scene__inner memories-content">
      <div class="memories-stage">
        <div class="memories-caption-col" id="memories-caption-col"></div>
        <div class="memories-wrap" id="memories-wrap">
          <div class="memories-media-col">
            <div class="memories-media-frame" id="memories-media-frame">
              <div class="memories-media-slot" id="memories-media-slot"></div>
              <div class="memories-count" id="memories-count"></div>
            </div>
          </div>
          <div class="memories-text-col" id="memories-text-col"></div>
        </div>
      </div>
    </div>
  `;

  const captionColEl = container.querySelector("#memories-caption-col");
  mediaWrapEl = container.querySelector("#memories-wrap");
  mediaSlotEl = container.querySelector("#memories-media-slot");
  counterEl = container.querySelector("#memories-count");
  const textColEl = container.querySelector("#memories-text-col");

  captionEntries = [];
  textEntries = [];

  CONFIG.memories.forEach((memory, i) => {
    const captionEntry = document.createElement("p");
    captionEntry.className = "memory-caption-entry";
    captionEntry.innerHTML = memory.caption;
    captionColEl.appendChild(captionEntry);
    captionEntries.push(captionEntry);

    const num = String(i + 1).padStart(2, "0");
    const textEntry = document.createElement("div");
    textEntry.className = "memory-text-entry";
    textEntry.innerHTML = `
      <p class="memory-num">&#9825; ${num}</p>
      <h3 class="memory-heading">${memory.heading}</h3>
      <p class="memory-body">${memory.body}</p>
    `;
    textColEl.appendChild(textEntry);
    textEntries.push(textEntry);
  });
}

function showCaption(i) {
  captionEntries[i].classList.add("is-shown");
}

function hideCaption(i) {
  captionEntries[i].classList.remove("is-shown");
}

function showMediaAndText(i) {
  if (counterEl) counterEl.textContent = `${i + 1} / ${CONFIG.memories.length}`;
  mediaWrapEl.classList.add("is-active");
  textEntries[i].classList.add("is-active");
}

function hideMediaAndText(i) {
  mediaWrapEl.classList.remove("is-active");
  textEntries[i].classList.remove("is-active");
  const video = mediaSlotEl.querySelector("video");
  if (video) video.pause();
  mediaSlotEl.innerHTML = "";
}

/**
 * Phát lần lượt videos[videoIndex..] của kỉ niệm i - xong video này mới sang
 * video kế tiếp. Video/placeholder cuối cùng phát xong thì gọi onItemDone().
 * "token" dùng để bỏ qua callback đến trễ (vd video "ended" bắn ra sau khi
 * scene đã bị huỷ hoặc đã nhảy sang kỉ niệm khác).
 */
function playVideoStep(i, videoIndex, onItemDone) {
  if (cancelled) return;

  const videos = CONFIG.memories[i].videos || [];
  if (videoIndex >= videos.length) {
    onItemDone();
    return;
  }

  const token = (stepToken += 1);
  const src = videos[videoIndex];

  if (!src) {
    // Chưa có video thật - dùng khung placeholder, giả lập "phát xong" bằng
    // timer. Không có tiếng thật nào để nhường chỗ nên không cần hạ nhạc nền.
    const goNext = () => {
      if (cancelled || token !== stepToken) return;
      playVideoStep(i, videoIndex + 1, onItemDone);
    };
    mediaSlotEl.innerHTML = placeholderMarkup(i, videoIndex, videos.length);
    timeoutId = setTimeout(goNext, CONFIG.timing.memoryPlaceholderDuration);
    return;
  }

  // Video thật có tiếng riêng - hạ nhạc nền xuống để tiếng video là tiếng chủ
  // đạo, trả lại âm lượng gốc ngay khi video này phát xong.
  sceneContext.audioPlayer.duck();

  const goNext = () => {
    if (cancelled || token !== stepToken) return;
    sceneContext.audioPlayer.unduck();
    playVideoStep(i, videoIndex + 1, onItemDone);
  };

  mediaSlotEl.innerHTML = `<video class="memory-media" playsinline></video>`;
  const videoEl = mediaSlotEl.querySelector("video");
  videoEl.addEventListener("ended", goNext, { once: true });
  videoEl.src = src;

  const playPromise = videoEl.play();
  if (playPromise && typeof playPromise.catch === "function") {
    // Trình duyệt có thể chặn autoplay có tiếng dù đã qua start-gate - thử lại ở
    // chế độ tắt tiếng để video ít nhất vẫn chạy và "ended" vẫn bắn ra đúng lúc.
    playPromise.catch(() => {
      videoEl.muted = true;
      videoEl.play().catch(() => {});
    });
  }
}

/**
 * Mỗi kỉ niệm: hiện caption riêng - giữ 1 nhịp - mờ đi, rồi hiện video (hoặc
 * nhiều video chạy lần lượt) + heading/body. Chỉ chuyển sang kỉ niệm tiếp theo
 * khi video CUỐI CÙNG của kỉ niệm đó phát xong - không còn theo timer cố định
 * cho cả kỉ niệm như trước nữa.
 */
function playItem(i, advance) {
  if (cancelled) return;

  showCaption(i);

  timeoutId = setTimeout(() => {
    if (cancelled) return;
    hideCaption(i);

    timeoutId = setTimeout(() => {
      if (cancelled) return;
      showMediaAndText(i);

      playVideoStep(i, 0, () => {
        if (cancelled) return;
        hideMediaAndText(i);

        timeoutId = setTimeout(() => {
          if (cancelled) return;
          index += 1;
          if (index >= CONFIG.memories.length) {
            advance();
            return;
          }
          playItem(index, advance);
        }, TRANSITION_MS);
      });
    }, TRANSITION_MS);
  }, CONFIG.timing.memoryCaptionHold);
}

function init(container) {
  buildDom(container);
}

function enter(context, advance) {
  sceneContext = context;
  cancelled = false;
  index = 0;
  captionEntries.forEach((el) => el.classList.remove("is-shown"));
  textEntries.forEach((el) => el.classList.remove("is-active"));
  mediaWrapEl.classList.remove("is-active");
  mediaSlotEl.innerHTML = "";
  playItem(0, advance);
}

function exit() {
  cancelled = true;
  stepToken += 1;
  clearTimeout(timeoutId);
  const video = mediaSlotEl && mediaSlotEl.querySelector("video");
  if (video) video.pause();
  // Phòng khi thoát scene giữa lúc 1 video đang hạ nhạc nền dở - trả lại âm
  // lượng gốc ngay, không để nhạc bị kẹt ở mức nhỏ sang tận scene sau.
  sceneContext?.audioPlayer.unduck();
}

window.Scenes = window.Scenes || {};
window.Scenes.memories = { init, enter, exit };
})();
