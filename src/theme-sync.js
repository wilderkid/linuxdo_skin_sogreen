const SOGREEN_DARK_CLASS = 'sogreen-dark';
const SOGREEN_SWITCHING_CLASS = 'sogreen-theme-switching';
const THEME_MENU_SELECTOR = [
    '.sidebar-theme-toggle',
    '.sidebar-theme-toggle-dropdown',
    '.color-scheme-selector',
    '.interface-color-selector',
    '.select-kit.color-scheme-selector'
].join(', ');
const THEME_ROW_SELECTOR = [
    '.select-kit-row',
    '.dropdown-menu__item',
    '[data-name]',
    '[data-value]'
].join(', ');

let heldGuess = null;
let chaseRaf = 0;
let chaseTimeouts = [];
let isSetup = false;

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

    try {
        return window.matchMedia(media).matches;
    } catch {
        return false;
    }
}

function getActiveSchemeFromLinks() {
    const lightLink = document.querySelector('link.light-scheme');
    const darkLink = document.querySelector('link.dark-scheme');
    if (!lightLink && !darkLink) return null;

    const darkEnabled = Boolean(darkLink) && !darkLink.disabled && linkMediaMatches(darkLink);
    const lightEnabled = Boolean(lightLink) && !lightLink.disabled && linkMediaMatches(lightLink);

    if (darkEnabled === lightEnabled) return null;
    return darkEnabled;
}

function isDarkModeActive() {
    const html = document.documentElement;
    if (html.classList.contains('dark') || document.body?.classList.contains('dark')) return true;
    if (html.classList.contains('light') || document.body?.classList.contains('light')) return false;

    const linkScheme = getActiveSchemeFromLinks();
    if (linkScheme !== null) return linkScheme;

    const setup = document.getElementById('data-discourse-setup');
    const setupFlag = setup?.dataset?.colorSchemeIsDark;
    if (setupFlag === 'true') return true;
    if (setupFlag === 'false') return false;

    const schemeType = getSchemeType();
    if (schemeType === 'dark') return true;
    if (schemeType === 'light') return false;

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

let switchTimer = 0;

function markThemeSwitching() {
    const html = document.documentElement;
    html.classList.add(SOGREEN_SWITCHING_CLASS);
    clearTimeout(switchTimer);
    switchTimer = setTimeout(() => html.classList.remove(SOGREEN_SWITCHING_CLASS), 320);
}

function applyDarkClass(dark) {
    const html = document.documentElement;
    if (html.classList.contains(SOGREEN_DARK_CLASS) === dark) return;

    markThemeSwitching();
    html.classList.toggle(SOGREEN_DARK_CLASS, dark);
}

function syncDarkClass() {
    if (heldGuess && Date.now() < heldGuess.until) {
        applyDarkClass(heldGuess.dark);
        if (isDarkModeActive() === heldGuess.dark) heldGuess = null;
        return;
    }

    heldGuess = null;
    applyDarkClass(isDarkModeActive());
}

function guessDarkFromLabel(text) {
    const value = (text || '').trim().toLowerCase();
    if (!value) return null;
    if (/(auto|system|自动|跟随)/.test(value)) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    if (/(dark|暗|黑|夜间)/.test(value) && !/(light|浅|亮)/.test(value)) return true;
    if (/(light|浅|亮|日间)/.test(value) && !/(dark|暗|黑)/.test(value)) return false;
    return null;
}

function stopChase() {
    cancelAnimationFrame(chaseRaf);
    chaseRaf = 0;
    chaseTimeouts.forEach(clearTimeout);
    chaseTimeouts = [];
}

function chaseThemeSync(durationMs = 1200) {
    stopChase();
    const started = Date.now();
    const tick = () => {
        syncDarkClass();
        if (Date.now() - started < durationMs) {
            chaseRaf = requestAnimationFrame(tick);
        }
    };
    chaseRaf = requestAnimationFrame(tick);
    [50, 120, 250, 450, 800, 1200].forEach((ms) => {
        chaseTimeouts.push(setTimeout(syncDarkClass, ms));
    });
}

function holdThemeGuess(dark) {
    heldGuess = { dark, until: Date.now() + 400 };
    applyDarkClass(dark);
    chaseThemeSync();
}

function clickTarget(event) {
    const target = event.target;
    if (target instanceof Element) return target;
    return target?.parentElement || null;
}

function normalizeClass(value) {
    return String(value || '')
        .split(/\s+/)
        .filter((name) => name && name !== SOGREEN_DARK_CLASS && name !== SOGREEN_SWITCHING_CLASS)
        .sort()
        .join(' ');
}

function onThemeMutations(mutations) {
    const meaningful = mutations.some((mutation) => {
        if (
            mutation.type === 'attributes' &&
            mutation.target === document.documentElement &&
            mutation.attributeName === 'class'
        ) {
            return normalizeClass(mutation.oldValue) !== normalizeClass(document.documentElement.className);
        }
        return true;
    });

    if (meaningful) syncDarkClass();
}

export function setupDarkModeSync() {
    if (isSetup) return;
    isSetup = true;

    syncDarkClass();

    const observer = new MutationObserver(onThemeMutations);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme']
    });

    const observeBody = () => {
        if (!document.body) return;
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme']
        });
    };

    const observeHead = () => {
        if (!document.head) return;
        observer.observe(document.head, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['media', 'disabled', 'data-color-scheme-is-dark', 'class', 'href']
        });
    };

    const observeSchemeLinks = () => {
        ['link.light-scheme', 'link.dark-scheme'].forEach((selector) => {
            const link = document.querySelector(selector);
            if (!link) return;
            observer.observe(link, {
                attributes: true,
                attributeFilter: ['media', 'disabled', 'href', 'class', 'data-color-scheme-is-dark']
            });
        });
    };

    const observeSetup = () => {
        const setup = document.getElementById('data-discourse-setup');
        if (!setup) return;
        observer.observe(setup, {
            attributes: true,
            attributeFilter: ['data-color-scheme-is-dark']
        });
    };

    const observeAll = () => {
        observeBody();
        observeHead();
        observeSchemeLinks();
        observeSetup();
    };

    observeAll();
    syncDarkClass();

    if (!document.body || !document.head || !document.getElementById('data-discourse-setup') || !document.querySelector('link.light-scheme, link.dark-scheme')) {
        document.addEventListener('DOMContentLoaded', () => {
            observeAll();
            syncDarkClass();
        }, { once: true });
    }

    document.addEventListener('click', (event) => {
        const target = clickTarget(event);
        if (!target?.closest) return;

        const themeMenu = target.closest(THEME_MENU_SELECTOR);
        if (!themeMenu) return;

        const row = target.closest(THEME_ROW_SELECTOR);
        if (!row || !themeMenu.contains(row)) {
            chaseThemeSync(400);
            return;
        }

        const label = [
            row.getAttribute('data-name'),
            row.getAttribute('data-value'),
            row.getAttribute('title'),
            row.getAttribute('aria-label'),
            row.textContent
        ].filter(Boolean).join(' ');
        const guessed = guessDarkFromLabel(label);
        if (guessed !== null) {
            holdThemeGuess(guessed);
            return;
        }

        chaseThemeSync();
    }, true);

    const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkMedia.addEventListener) {
        darkMedia.addEventListener('change', syncDarkClass);
    } else {
        darkMedia.addListener(syncDarkClass);
    }

    // Safety net: reconcile on a slow interval and whenever the page becomes
    // active again, so a missed signal can never strand the skin on the old scheme.
    setInterval(syncDarkClass, 1000);
    document.addEventListener('visibilitychange', syncDarkClass);
    window.addEventListener('pageshow', syncDarkClass);
    window.addEventListener('focus', syncDarkClass);
}
