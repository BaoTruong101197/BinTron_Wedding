(function () {
// Bay từ xa lại gần theo phối cảnh 3D — như nhìn qua kính thiên văn vào những vì sao
// hình trái tim, thay vì trôi thẳng lên như đom đóm.
const HEART_COLORS = ["#e91e63", "#f48fb1", "#ff6b9d", "#ff4081", "#f06292", "#ff80ab", "#ff1744"];

const INTENSITY_PRESETS = {
  low: { maxHearts: 40, spawnIntervalMs: 450 },
  normal: { maxHearts: 80, spawnIntervalMs: 250 },
  high: { maxHearts: 130, spawnIntervalMs: 150 },
};

const FOV = 480;

class HeartsBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hearts = [];
    this.intensity = "normal";
    this.spawnAccumulator = 0;
    this.lastTime = null;
    this.running = false;
    this.dpr = getDpr();

    this._onResize = this.resize.bind(this);
    window.addEventListener("resize", this._onResize);
    this.resize();
  }

  resize() {
    const { canvas, dpr } = this;
    fitCanvasToDpr(canvas, this.ctx, window.innerWidth, window.innerHeight, dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
  }

  setIntensity(level) {
    this.intensity = INTENSITY_PRESETS[level] ? level : "normal";
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this._tick.bind(this));
  }

  _tick() {
    if (!this.running) return;
    const now = performance.now();
    const deltaMs = Math.min(now - this.lastTime, 100);
    this.lastTime = now;

    this._spawn(deltaMs);
    this._update();
    this._draw();

    requestAnimationFrame(this._tick.bind(this));
  }

  _spawn(deltaMs) {
    const preset = INTENSITY_PRESETS[this.intensity];
    this.spawnAccumulator += deltaMs / preset.spawnIntervalMs;

    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      if (this.hearts.length < preset.maxHearts) this.hearts.push(this._createHeart());
    }
  }

  _createHeart() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      x3: (Math.random() - 0.5) * width * 2.6,
      y3: (Math.random() - 0.5) * height * 2.6,
      z: 700 + Math.random() * 700,
      size: 5 + Math.random() * 13,
      speed: 1.8 + Math.random() * 3.2,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.008 + Math.random() * 0.022,
      alpha: 0.55 + Math.random() * 0.4,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
    };
  }

  _update() {
    for (let i = this.hearts.length - 1; i >= 0; i -= 1) {
      const h = this.hearts[i];
      h.z -= h.speed;
      h.wobble += h.wobbleSpeed;
      h.x3 += Math.sin(h.wobble) * 1.4;
      if (h.z <= 5) this.hearts.splice(i, 1);
    }
  }

  _draw() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.ctx.clearRect(0, 0, width, height);

    const ox = width / 2;
    const oy = height / 2;

    // Vẽ tim ở xa (z lớn) trước, tim ở gần (z nhỏ) sau — đúng thứ tự phối cảnh 3D.
    this.hearts
      .slice()
      .sort((a, b) => b.z - a.z)
      .forEach((h) => {
        const scale = FOV / (FOV + h.z);
        const sx = ox + h.x3 * scale;
        const sy = oy + h.y3 * scale;
        const alpha = h.alpha * Math.min(1, (1400 - h.z) / 380) * Math.min(1, (h.z - 5) / 55);

        if (alpha < 0.01 || sx < -80 || sx > width + 80 || sy < -80 || sy > height + 80) return;
        this._drawHeart(sx, sy, h.size * scale, h.color, alpha);
      });
  }

  _drawHeart(x, y, size, color, alpha) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.translate(x, y);
    drawHeartPath(ctx, size);
    ctx.restore();
  }

}

window.HeartsBackground = HeartsBackground;
})();
