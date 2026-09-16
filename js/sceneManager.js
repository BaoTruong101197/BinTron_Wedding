/**
 * Điều phối thứ tự các scene: chuyển active class (fade qua CSS) và gọi
 * enter()/exit() của từng scene. Mỗi scene tự quyết định khi nào gọi advance()
 * (tự động qua timer; scene cuối cùng trong mảng thì không bao giờ gọi vì đã
 * hết flow).
 */
(function () {
class SceneManager {
  constructor(scenes) {
    this.scenes = scenes; // [{ key, element, module }]
    this.currentIndex = -1;
    this.context = null;
  }

  init(context) {
    this.context = context;
    this.scenes.forEach(({ element, module }) => module.init(element, context));
  }

  start() {
    this._goTo(0);
  }

  advance() {
    this._goTo(this.currentIndex + 1);
  }

  _goTo(index) {
    if (index < 0 || index >= this.scenes.length) return;

    const previous = this.scenes[this.currentIndex];
    if (previous) {
      previous.element.classList.remove("is-active");
      previous.module.exit?.();
    }

    this.currentIndex = index;
    const next = this.scenes[index];
    next.element.classList.add("is-active");
    next.module.enter(this.context, () => this.advance());
  }
}

window.SceneManager = SceneManager;
})();
