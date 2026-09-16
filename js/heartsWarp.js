/**
 * Hiệu ứng mở màn dùng chung: "bay xuyên qua dải trái tim" (hyperspace) - hạt
 * trái tim bay theo hình tia từ tâm màn hình ra ngoài rồi tắt dần. Hiện đang
 * dùng làm hiệu ứng mở màn cho scene đầu tiên (intro.js), trước khi vào trình
 * tự hiện tuần tự các dòng trong CONFIG.intro.texts vốn đã có.
 *
 * Module tự chứa: tự tạo canvas + overlay của riêng nó, tự chạy vòng lặp
 * requestAnimationFrame, tự dọn dẹp DOM khi xong. Không đụng vào
 * js/heartsBackground.js (engine nền dùng chung, chạy suốt vòng đời app) hay
 * bất kỳ scene khác.
 *
 * API: window.playHeartsWarp() -> Promise<void>. Promise resolve ngay tại thời
 * điểm nên bắt đầu hiệu ứng reveal tiếp theo của scene gọi nó (để 2 hiệu ứng mờ
 * chồng lên nhau êm ái). Dưới prefers-reduced-motion: reduce, hiệu ứng bị bỏ
 * qua hoàn toàn (resolve ngay, không tạo overlay) - đây thuần là hiệu ứng
 * chuyển động trang trí, không mang nội dung gì cần giữ lại.
 *
 * LƯU Ý ĐỒNG BỘ: WRAPPER_TRANSITION_MS bên dưới phải khớp với thời gian
 * transition khai báo trong css/base.css (.hearts-warp) - nếu sửa một bên thì
 * phải sửa bên kia theo.
 */
(function () {
  // Màu lấy đúng từ design token trong css/base.css (:root), quy đổi sẵn sang RGB
  // để khỏi phải parse hex mỗi frame.
  const HEART = { r: 255, g: 107, b: 139 }; // --color-heart
  const HEART_SOFT = { r: 255, g: 159, b: 181 }; // --color-heart-soft
  const GOLD = { r: 243, g: 201, b: 139 }; // --color-gold
  const BLUSH = { r: 255, g: 209, b: 220 }; // --color-blush
  const TEXT = { r: 255, g: 246, b: 248 }; // --color-text
  const PALETTE = [HEART, HEART_SOFT, GOLD, BLUSH, HEART, GOLD, TEXT];

  // Nhịp phim (ms). ACCEL/DECEL chỉ là 2 đoạn ngắn vào/ra êm; phần lớn thời gian
  // nằm ở PEAK ("cruise") - hạt liên tục sinh ra/tái sinh ở tâm và bay dần ra mép
  // màn hình suốt cả đoạn này, tạo cảm giác đang du hành xuyên một dải sao trái
  // tim liên tục (chứ không phải 1 cụm nhỏ đứng yên gần tâm). Tổng ACCEL+PEAK+DECEL
  // = STREAK_END_MS ~ 4s.
  const ACTIVATE_WINDOW_MS = 1450; // các hạt "mồi" xuất hiện rải rác trong khoảng này
  const ACCEL_MS = 1000; // tăng tốc dần, ngắn
  const PEAK_MS = 3000; // cruise: bay đều, liên tục sinh/tái sinh hạt
  const DECEL_MS = 3000; // giảm tốc, các vệt tim thưa dần rồi tắt
  const STREAK_END_MS = ACCEL_MS + PEAK_MS + DECEL_MS; // 4000 - hết hiệu ứng bay
  const WRAPPER_TRANSITION_MS = 400; // khớp với transition của .hearts-warp
  const HANDOFF_MS = STREAK_END_MS; // các vệt tim vừa lặng xuống là bàn giao ngay
  const CLEANUP_MS = HANDOFF_MS + WRAPPER_TRANSITION_MS;

  // Tốc độ bay ra của mỗi hạt (px/giây, ở intensity=1): SPEED_BASE là tốc độ gốc,
  // SPEED_RADIAL_GAIN là phần tăng tốc thêm theo bán kính đã bay (tim bay càng ra
  // xa tâm càng nhanh, giống cảm giác vọt qua ống hyperspace). Với 2 số này, một
  // hạt đi từ tâm ra mép màn hình mất khoảng 1.5-1.8s - đủ chậm để nhìn rõ từng
  // trái tim lướt qua, nhưng vẫn đi hết quãng đường trong lúc PEAK còn đang chạy
  // (mỗi hạt lặp lại vài "vòng" trong suốt PEAK_MS, giữ mật độ luôn dày).
  const SPEED_BASE = 55;
  const SPEED_RADIAL_GAIN = 2;

  function pickColor() {
    return PALETTE[Math.floor(Math.random() * PALETTE.length)];
  }

  function rgba(color, alpha) {
    return `rgba(${color.r},${color.g},${color.b},${alpha})`;
  }

  function removeNode(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // Hàng đợi setTimeout - after() lên lịch, clear() hủy hết 1 lượt (dùng khi
  // cancelHeartsWarp() được gọi giữa chừng).
  function createTimerQueue() {
    const timers = [];
    return {
      after(ms, fn) {
        timers.push(setTimeout(fn, ms));
      },
      clear() {
        timers.forEach(clearTimeout);
      },
    };
  }

  // Đường cong tốc độ dùng chung cho tốc độ hạt, độ dài vệt và độ sáng glow:
  // tăng tốc (ease-in) -> giữ đỉnh -> giảm tốc (ease-out ngược).
  function warpIntensity(elapsed) {
    if (elapsed < ACCEL_MS) {
      const t = elapsed / ACCEL_MS;
      return t * t;
    }
    if (elapsed < ACCEL_MS + PEAK_MS) return 1;
    if (elapsed < STREAK_END_MS) {
      const t = (elapsed - ACCEL_MS - PEAK_MS) / DECEL_MS;
      return (1 - t) * (1 - t);
    }
    return 0;
  }

  function buildWrapper() {
    const wrapperEl = document.createElement("div");
    wrapperEl.className = "hearts-warp";
    wrapperEl.setAttribute("aria-hidden", "true");
    wrapperEl.setAttribute("role", "presentation");

    const canvas = document.createElement("canvas");
    canvas.className = "hearts-warp__canvas";
    wrapperEl.appendChild(canvas);

    document.body.appendChild(wrapperEl);

    return { wrapperEl, canvas };
  }

  /**
   * Hạt trái tim bay theo hình tia từ tâm ra (hyperspace) rồi tắt dần.
   */
  function playFullWarp() {
    return new Promise((resolve) => {
      let cancelled = false;
      let rafId = null;
      const timerQueue = createTimerQueue();

      const dpr = getDpr();
      const width = window.innerWidth;
      const height = window.innerHeight;
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = (Math.hypot(width, height) / 2) * 1.15;

      const { wrapperEl, canvas } = buildWrapper();

      const ctx = canvas.getContext("2d");
      fitCanvasToDpr(canvas, ctx, width, height, dpr);

      // Mật độ dày hơn hẳn mức "ambient" bình thường (heartsBackground.js) vì đây
      // chỉ là 1 hiệu ứng bùng nổ ngắn ~4s, không phải vòng lặp chạy suốt vòng đời
      // trang - đủ ngân sách để tạo cảm giác một "dải" sao trái tim dày đặc.
      const count = Math.min(220, Math.max(70, Math.round((width * height) / 6000)));
      const particles = Array.from({ length: count }, () => ({
        activateAt: randomBetween(0, ACTIVATE_WINDOW_MS),
        active: false,
        dead: false,
        theta: 0,
        r: 0,
        baseSpeed: randomBetween(0.55, 1.35),
        color: pickColor(),
        headSizeBase: randomBetween(3, 7),
        alphaBase: randomBetween(0.65, 1),
      }));

      const startTime = performance.now();
      let lastTime = startTime;

      function update(elapsed, dtMs, intensity) {
        const ds = dtMs / 1000;
        const canRecycle = elapsed < ACCEL_MS + PEAK_MS;
        particles.forEach((p) => {
          if (p.dead || elapsed < p.activateAt) return;
          if (!p.active) {
            p.active = true;
            p.r = randomBetween(0, 30);
            p.theta = randomBetween(0, Math.PI * 2);
          }
          const v = (p.baseSpeed * SPEED_BASE + p.r * SPEED_RADIAL_GAIN) * intensity;
          p.r += v * ds;
          if (p.r > maxRadius) {
            if (canRecycle) {
              p.r = randomBetween(0, 20);
              p.theta = randomBetween(0, Math.PI * 2);
              p.color = pickColor();
            } else {
              p.dead = true;
            }
          }
        });
      }

      function draw(intensity) {
        ctx.clearRect(0, 0, width, height);
        ctx.globalAlpha = 1;

        // Quầng sáng ở tâm - điểm hội tụ mà các vệt tim bay ra từ đó.
        const glowR = 40 + 260 * intensity;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        gradient.addColorStop(0, rgba(HEART, 0.35 * intensity));
        gradient.addColorStop(1, rgba(HEART, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        particles.forEach((p) => {
          if (!p.active || p.dead) return;

          const fadeIn = Math.min(1, Math.max(0, p.r / 24));
          const fadeOut = Math.min(1, Math.max(0, (maxRadius - p.r) / 40));
          const alpha = p.alphaBase * fadeIn * fadeOut * intensity;
          if (alpha < 0.02) return;

          const headSize = Math.min(22, Math.max(2, p.headSizeBase * (0.5 + 0.9 * (p.r / maxRadius))));
          const speed = (p.baseSpeed * SPEED_BASE + p.r * SPEED_RADIAL_GAIN) * intensity;
          const trailLen = Math.min(140, Math.max(2, speed * (0.03 + 0.09 * intensity)));

          const hx = cx + Math.cos(p.theta) * p.r;
          const hy = cy + Math.sin(p.theta) * p.r;
          const tr = Math.max(0, p.r - trailLen);
          const tx = cx + Math.cos(p.theta) * tr;
          const ty = cy + Math.sin(p.theta) * tr;

          // Vệt sao chổi - 1 nét stroke đơn giản, rẻ, không dùng gradient riêng.
          ctx.globalAlpha = alpha * 0.55;
          ctx.strokeStyle = rgba(p.color, 1);
          ctx.lineWidth = Math.max(0.6, headSize * 0.34);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(hx, hy);
          ctx.stroke();

          // Đầu trái tim, quay hướng ra ngoài theo tia bay.
          ctx.save();
          ctx.translate(hx, hy);
          ctx.rotate(p.theta + Math.PI / 2);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = rgba(p.color, 1);
          drawHeartPath(ctx, headSize);
          ctx.restore();
        });

        ctx.globalAlpha = 1;
      }

      function tick(now) {
        if (cancelled) return;
        const elapsed = now - startTime;
        const dtMs = Math.min(now - lastTime, 100);
        lastTime = now;

        if (elapsed >= STREAK_END_MS) {
          ctx.clearRect(0, 0, width, height);
          rafId = null;
          return;
        }

        const intensity = warpIntensity(elapsed);
        update(elapsed, dtMs, intensity);
        draw(intensity);
        rafId = requestAnimationFrame(tick);
      }

      rafId = requestAnimationFrame(tick);

      window.cancelHeartsWarp = function cancelHeartsWarp() {
        if (cancelled) return;
        cancelled = true;
        if (rafId) cancelAnimationFrame(rafId);
        timerQueue.clear();
        removeNode(wrapperEl);
        resolve();
      };

      // HANDOFF: đúng lúc các vệt tim lặng xuống thì mờ overlay đi và resolve()
      // để scene gọi hàm này chạy hiệu ứng reveal tiếp theo - 2 hiệu ứng mờ
      // chồng lên nhau êm ái.
      timerQueue.after(HANDOFF_MS, () => {
        if (cancelled) return;
        wrapperEl.classList.add("is-leaving");
        resolve();
      });

      timerQueue.after(CLEANUP_MS, () => {
        if (cancelled) return;
        removeNode(wrapperEl);
      });
    });
  }

  function playHeartsWarp() {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return reduced ? Promise.resolve() : playFullWarp();
  }

  window.playHeartsWarp = playHeartsWarp;
})();
