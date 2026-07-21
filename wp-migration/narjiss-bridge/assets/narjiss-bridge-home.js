(function () {
  function initSlider(slider) {
    var slides = Array.prototype.slice.call(slider.querySelectorAll('img'));
    if (slides.length < 2) return;

    var current = 0;
    window.setInterval(function () {
      slides[current].classList.remove('is-active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('is-active');
    }, 5200);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-narjiss-home-slider]').forEach(initSlider);
  });
})();
