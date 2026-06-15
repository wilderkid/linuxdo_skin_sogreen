const SOGREEN_DARK_CLASS = 'sogreen-dark';

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
    const setup = document.getElementById('data-discourse-setup');
    const setupFlag = setup?.dataset?.colorSchemeIsDark;
    const schemeType = getSchemeType();
    const linkScheme = getActiveSchemeFromLinks();

    if (linkScheme !== null) return linkScheme;
    if (document.documentElement.classList.contains('dark')) return true;
    if (setupFlag === 'true' || schemeType === 'dark') return true;
    if (setupFlag === 'false' || schemeType === 'light') return false;

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function syncDarkClass() {
    document.documentElement.classList.toggle(SOGREEN_DARK_CLASS, isDarkModeActive());
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

    if (document.head) {
        observer.observe(document.head, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['media', 'disabled', 'data-color-scheme-is-dark']
        });
    }

    const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkMedia.addEventListener) {
        darkMedia.addEventListener('change', syncDarkClass);
    } else {
        darkMedia.addListener(syncDarkClass);
    }
}
