(function () {
const STAR_COUNT = 220;

class StarsBackground {
  constructor(canvas, count = STAR_COUNT) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.count = count;
    this.stars = [];
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
    this._initStars();
  }

  _initStars() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.stars = Array.from({ length: this.count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.4 + Math.random() * 2,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.03,
    }));
  }

  start() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this._tick.bind(this));
  }

  _tick() {
    if (!this.running) return;
    this._draw();
    requestAnimationFrame(this._tick.bind(this));
  }

  _draw() {
    const { ctx } = this;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    this.stars.forEach((s) => {
      s.twinkle += s.speed;
      ctx.globalAlpha = 0.25 + Math.abs(Math.sin(s.twinkle)) * 0.75;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /** Chuyển độ mờ của cả bầu trời sao mượt qua CSS transition (xem css/stars-bg.css). */
  fadeTo(opacity) {
    requestAnimationFrame(() => {
      this.canvas.style.opacity = String(opacity);
    });
  }

}

window.StarsBackground = StarsBackground;
})();
