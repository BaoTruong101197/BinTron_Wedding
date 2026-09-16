function bootstrap() {
  const heartsCanvas = document.getElementById("hearts-canvas");
  const starsCanvas = document.getElementById("stars-canvas");
  const audioEl = document.getElementById("bg-audio");
  const startGateEl = document.getElementById("start-gate");

  const heartsBackground = new HeartsBackground(heartsCanvas);
  heartsBackground.setIntensity("normal");
  heartsBackground.start();

  const starsBackground = new StarsBackground(starsCanvas);
  starsBackground.start();
  starsBackground.fadeTo(0.5);

  const audioPlayer = new AudioPlayer(audioEl, CONFIG.audio);

  const sceneManager = new SceneManager([
    { key: "intro", element: document.getElementById("scene-intro"), module: Scenes.intro },
    { key: "memories", element: document.getElementById("scene-memories"), module: Scenes.memories },
    { key: "gift", element: document.getElementById("scene-gift"), module: Scenes.gift },
    // TODO: scene "ending" (lời hứa + nút cảm ơn) cũ đã bị xóa, đang chờ scene
    // thay thế - hiện flow sẽ dừng lại (không làm gì) sau khi hết gift.
  ]);

  sceneManager.init({ heartsBackground, starsBackground, petals: Petals, audioPlayer });

  // Trình duyệt chặn tuyệt đối autoplay audio có tiếng nếu chưa có tương tác
  // người dùng, mà cả flow (intro -> memories -> gift) đều tự động theo timer
  // hoặc theo lựa chọn của người xem, không có thao tác nào để "mở khoá" nhạc.
  // 1 lần chạm ở màn start-gate này mở khoá audio VÀ bắt đầu trình chiếu cùng lúc.
  startGateEl.addEventListener(
    "click",
    () => {
      startGateEl.classList.add("is-leaving");
      startGateEl.addEventListener("transitionend", () => startGateEl.remove(), { once: true });
      audioPlayer.start();
      sceneManager.start();
    },
    { once: true }
  );
}

document.addEventListener("DOMContentLoaded", bootstrap);
