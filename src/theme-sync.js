const SOGREEN_DARK_CLASS = 'sogreen-dark';
const THEME_TOGGLE_SELECTOR = [
    '.sidebar-footer-actions-button',
    '.sidebar-theme-toggle',
    '.sidebar-theme-toggle-dropdown',
    'button[aria-label*="color"]',
    'button[title*="color"]',
    'button[aria-label*="theme"]',
    'button[title*="theme"]',
    'button[aria-label*="暗"]',
    'button[aria-label*="浅"]',
    'button[aria-label*="Dark"]',
    'button[aria-label*="Light"]'
].join(', ');

function getSchemeType() {
    return getComputedStyle(document.documentElement)
        .getPropertyValue('--scheme-type')
        .trim()
        .replace(/['"]/g, '');
}

function linkMediaMatches(link) {
    if (!link || link.disabled) return false;

    const media = link.getAttribute('media');
    if (!media || media === 'all') return true;
    if (media === 'none') return false;

    return window.matchMedia(media).matches;
}

function getActiveSchemeFromLinks() {
    const lightLink = document.querySelector('link.light-scheme');
    const darkLink = document.querySelector('link.dark-scheme');
    const lightMatches = linkMediaMatches(lightLink);
    const darkMatches = linkMediaMatches(darkLink);

    if (darkMatches && !lightMatches) return true;
    if (lightMatches && !darkMatches) return false;

    const darkMedia = darkLink?.getAttribute('media');
    const lightMedia = lightLink?.getAttribute('media');
    if (darkMedia === 'all' && lightMedia === 'none') return true;
    if (lightMedia === 'all' && darkMedia === 'none') return false;

    return null;
}

function isDarkModeActive() {
    const html = document.documentElement;
    const body = document.body;

    if (html.classList.contains('dark') || body?.classList.contains('dark')) return true;

    const schemeType = getSchemeType();
    if (schemeType === 'dark') return true;
    if (schemeType === 'light') return false;

    const setup = document.getElementById('data-discourse-setup');
    const setupFlag = setup?.dataset?.colorSchemeIsDark;
    if (setupFlag === 'true') return true;
    if (setupFlag === 'false') return false;

    const colorScheme = `${html.style.colorScheme || ''} ${getComputedStyle(html).colorScheme || ''}`;
    if (/\bdark\b/i.test(colorScheme) && !/\blight\b/i.test(colorScheme)) return true;
    if (/\blight\b/i.test(colorScheme) && !/\bdark\b/i.test(colorScheme)) return false;

    const linkScheme = getActiveSchemeFromLinks();
    if (linkScheme !== null) return linkScheme;

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function syncDarkClass() {
    document.documentElement.classList.toggle(SOGREEN_DARK_CLASS, isDarkModeActive());
}

function scheduleThemeSync() {
    syncDarkClass();
    requestAnimationFrame(syncDarkClass);
    [50, 150, 300, 600, 1000].forEach((delay) => setTimeout(syncDarkClass, delay));
}

let isSetup = false;

export function setupDarkModeSync() {
    if (isSetup) return;
    isSetup = true;

    syncDarkClass();

    const observer = new MutationObserver(syncDarkClass);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme']
    });

    if (document.body) {
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme']
        });
    }

    if (document.head) {
        observer.observe(document.head, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['media', 'disabled', 'data-color-scheme-is-dark', 'class']
        });
    }

    const setup = document.getElementById('data-discourse-setup');
    if (setup) {
        observer.observe(setup, {
            attributes: true,
            attributeFilter: ['data-color-scheme-is-dark']
        });
    }

    document.addEventListener('click', (event) => {
        if (event.target.closest(THEME_TOGGLE_SELECTOR)) {
            scheduleThemeSync();
        }
    }, true);

    const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkMedia.addEventListener) {
        darkMedia.addEventListener('change', syncDarkClass);
    } else {
        darkMedia.addListener(syncDarkClass);
    }
}
