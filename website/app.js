const siteData = {
  version: '0.9.1',
  sourceVersion: '0.9.1',
  engineVersion: '2026.08.19',
  extractorEntries: 1752,
  testCount: 32,
  auditFindings: 0,
  runtimeCount: 4,
  releaseAssetCount: 10,
  releaseUrl: 'https://github.com/YazeKT/dlME/releases',
  ...(window.DLME_SITE_DATA ?? {})
};

document.querySelectorAll('[data-version]').forEach((node) => { node.textContent = siteData.version; });
document.querySelectorAll('[data-source-version]').forEach((node) => { node.textContent = siteData.sourceVersion; });
document.querySelectorAll('[data-engine-version]').forEach((node) => { node.textContent = siteData.engineVersion; });
document.querySelectorAll('[data-extractors]').forEach((node) => { node.textContent = siteData.extractorEntries.toLocaleString('en-US'); });
document.querySelectorAll('[data-test-count]').forEach((node) => { node.textContent = siteData.testCount.toLocaleString('en-US'); });
document.querySelectorAll('[data-audit-count]').forEach((node) => { node.textContent = siteData.auditFindings.toLocaleString('en-US'); });
document.querySelectorAll('[data-runtime-count]').forEach((node) => { node.textContent = siteData.runtimeCount.toLocaleString('en-US'); });
document.querySelectorAll('[data-asset-count]').forEach((node) => { node.textContent = siteData.releaseAssetCount.toLocaleString('en-US'); });
document.querySelectorAll('[data-release-link]').forEach((node) => { node.href = siteData.releaseUrl; });

const header = document.querySelector('[data-header]');
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');
const scrollProgress = document.querySelector('[data-scroll-progress]');

const updateScrollState = () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 18);
  if (!scrollProgress) return;
  const available = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress.style.width = `${available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0}%`;
};

updateScrollState();
window.addEventListener('scroll', updateScrollState, { passive: true });

const closeNav = ({ returnFocus = false } = {}) => {
  nav?.classList.remove('is-open');
  navToggle?.setAttribute('aria-expanded', 'false');
  if (returnFocus) navToggle?.focus();
};

navToggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    closeNav();
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav?.classList.contains('is-open')) closeNav({ returnFocus: true });
});

document.addEventListener('click', (event) => {
  if (!nav?.classList.contains('is-open') || nav.contains(event.target) || navToggle?.contains(event.target)) return;
  closeNav();
});

const revealItems = document.querySelectorAll('[data-reveal]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('IntersectionObserver' in window && !reducedMotion) {
  document.body.classList.add('motion-ready');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -24px' });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const countItems = document.querySelectorAll('[data-count]');
const setFinalCounts = () => countItems.forEach((item) => { item.textContent = Number(item.dataset.count).toLocaleString('en-US'); });

if ('IntersectionObserver' in window && !reducedMotion) {
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const item = entry.target;
      const target = Number(item.dataset.count);
      if (target === 0) return countObserver.unobserve(item);
      const started = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - started) / 700);
        item.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString('en-US');
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countObserver.unobserve(item);
    });
  }, { threshold: 0.6 });
  countItems.forEach((item) => countObserver.observe(item));
} else {
  setFinalCounts();
}
