(function () {
  const WEEKDAYS_VN = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];

  /** Ví dụ: "Thứ Ba, ngày 11 tháng 8 năm 2026" */
  function formatVietnameseDate(date = new Date()) {
    const weekday = WEEKDAYS_VN[date.getDay()];
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${weekday}, ngày ${day} tháng ${month} năm ${year}`;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** "{{ngày}}" trong 1 chuỗi text được thay bằng ngày hôm nay
   * (formatVietnameseDate()) - dùng ở nhiều nơi (intro/gift) để cho phép chèn
   * ngày vào bất kỳ dòng text tự do nào, không cố định vị trí. */
  function resolveDateToken(text) {
    return text === "{{ngày}}" ? formatVietnameseDate() : text;
  }

  /**
   * Hiện từng phần tử một theo thứ tự (hiện → giữ → mờ dần → phần tử tiếp theo),
   * giống cách kể chuyện tuần tự thay vì hiện tất cả cùng lúc. Mỗi phần tử cần có
   * sẵn CSS transition cho opacity + class "is-shown" để bật hiệu ứng (xem .seq-line).
   * lastStay=true: phần tử cuối cùng ở lại trên màn hình, không tự mờ đi.
   */
  async function revealSequential(elements, { holdMs = 2600, fadeMs = 900, lastStay = true } = {}) {
    for (let i = 0; i < elements.length; i += 1) {
      const el = elements[i];
      if (!el) continue;
      el.classList.add("is-shown");
      await wait(fadeMs + holdMs);
      const isLast = i === elements.length - 1;
      if (!(isLast && lastStay)) {
        el.classList.remove("is-shown");
        await wait(fadeMs);
      }
    }
  }

  /**
   * Hiện từng phần tử một theo thứ tự nhưng KHÔNG ẩn phần tử trước đó — dùng cho
   * tiêu đề/nhãn cần ở lại trên màn hình (vd: câu hỏi phải còn hiện trong lúc điền
   * form), khác với revealSequential (kể chuyện kiểu thay từng dòng).
   */
  function revealStagger(elements, { stepMs = 260, fadeMs = 900 } = {}) {
    elements.forEach((el, i) => {
      if (!el) return;
      setTimeout(() => el.classList.add("is-shown"), i * stepMs);
    });
    return wait((elements.length - 1) * stepMs + fadeMs);
  }

  /** Số thực ngẫu nhiên trong [min, max) - dùng chung cho mọi hiệu ứng particle. */
  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Đường viền trái tim (4 đường bezier), vẽ tại gốc tọa độ local (0,0) - để dùng
   * với ctx.translate(x, y) (kèm ctx.rotate nếu cần) trước khi gọi. Cùng 1 hình
   * dạng đang dùng ở heartsBackground.js (nền ambient) và heartsWarp.js (hiệu ứng
   * mở màn) - gộp về đây để 2 nơi đó không lặp lại cùng 1 công thức toán.
   */
  function drawHeartPath(ctx, size) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(0, -size / 2, -size, -size / 2, -size, 0);
    ctx.bezierCurveTo(-size, size / 2, 0, size * 0.8, 0, size);
    ctx.bezierCurveTo(0, size * 0.8, size, size / 2, size, 0);
    ctx.bezierCurveTo(size, -size / 2, 0, -size / 2, 0, 0);
    ctx.fill();
  }

  /** min(devicePixelRatio, 2) - trần chung để canvas không quá nặng trên máy DPR cao. */
  function getDpr() {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  /**
   * Set kích thước canvas theo devicePixelRatio + setTransform tương ứng, để vẽ
   * bằng đơn vị CSS px như bình thường mà vẫn nét trên màn hình DPR cao. Chỉ làm
   * đúng phần "kích thước nội bộ" này - style.width/height (100%, 100vw, ...) vẫn
   * do từng nơi gọi tự set, vì mỗi canvas có cách đặt style khác nhau.
   */
  function fitCanvasToDpr(canvas, ctx, width, height, dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.formatVietnameseDate = formatVietnameseDate;
  window.wait = wait;
  window.resolveDateToken = resolveDateToken;
  window.revealSequential = revealSequential;
  window.revealStagger = revealStagger;
  window.randomBetween = randomBetween;
  window.drawHeartPath = drawHeartPath;
  window.getDpr = getDpr;
  window.fitCanvasToDpr = fitCanvasToDpr;
})();
