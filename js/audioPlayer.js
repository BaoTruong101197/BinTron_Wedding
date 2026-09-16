(function () {
class AudioPlayer {
  constructor(audioEl, { src, volume = 0.5 } = {}) {
    this.audioEl = audioEl;
    this.src = src;
    this.baseVolume = volume;
    this.started = false;
    this._gestureBound = false;
    this._fadeRafId = null;

    this.audioEl.volume = volume;
  }

  start() {
    if (this.started || !this.src) return;
    this.started = true;

    this.audioEl.src = this.src;
    this._attemptPlay();
  }

  duck(factor = 0.035, fadeMs = 400) {
    this._fadeVolumeTo(this.baseVolume * factor, fadeMs);
  }

  unduck(fadeMs = 400) {
    this._fadeVolumeTo(this.baseVolume, fadeMs);
  }

  _fadeVolumeTo(target, durationMs) {
    if (this._fadeRafId) cancelAnimationFrame(this._fadeRafId);

    const start = this.audioEl.volume;
    const startTime = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      this.audioEl.volume = start + (target - start) * t;
      this._fadeRafId = t < 1 ? requestAnimationFrame(step) : null;
    };

    this._fadeRafId = requestAnimationFrame(step);
  }

  _attemptPlay() {
    const playPromise = this.audioEl.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => this._waitForGesture());
    }
  }

  /** Trình duyệt chặn play() vì chưa có tương tác - chờ cử chỉ đầu tiên (chạm/
   * click/phím) rồi thử lại đúng 1 lần. Nếu vẫn lỗi (vd chưa có file nhạc
   * thật) thì bỏ qua âm thanh, không làm hỏng trải nghiệm. */
  _waitForGesture() {
    if (this._gestureBound) return;
    this._gestureBound = true;

    const retry = () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      this.audioEl.play().catch(() => {});
    };

    window.addEventListener("pointerdown", retry, { once: true });
    window.addEventListener("keydown", retry, { once: true });
  }
}

window.AudioPlayer = AudioPlayer;
})();
