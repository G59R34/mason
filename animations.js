/**
 * Lightweight scroll-triggered animations.
 * Adds .in-view to .animate-on-scroll when they enter the viewport.
 * Call window.masonAnimateObserve(el) to observe dynamically added elements.
 */
(function () {
  const selector = '.animate-on-scroll';
  const rootMargin = '0px 0px -8% 0px';
  const threshold = 0.05;

  var observer = null;

  function observe(el) {
    if (!el || el.classList.contains('in-view')) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('in-view');
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: rootMargin, threshold: threshold }
      );
    }
    observer.observe(el);
  }

  window.masonAnimateObserve = observe;

  function run() {
    document.querySelectorAll(selector).forEach(observe);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();

