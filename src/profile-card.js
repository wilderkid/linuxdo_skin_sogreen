const PROFILE_CARD_CLASS = 'sogreen-profile-expanded-card';
const PROFILE_SOURCE_HIDDEN_CLASS = 'sogreen-profile-source-hidden';
const PROFILE_FACTS_CLASS = 'sogreen-profile-facts';
const PROFILE_SECTION_SELECTOR = 'section.about';
const PROFILE_TOGGLE_SELECTOR = '.user-profile-toggle-btn';
const PROFILE_PANEL_SELECTOR = '#collapsed-info-panel, [id^="collapsed-info-panel"]';
const PROFILE_FACTS = [
    { key: 'joined', label: '加入日期' },
    { key: 'last-post', label: '最后一个帖子' },
    { key: 'last-seen', label: '最后活动' },
    { key: 'views', label: '浏览量' },
    { key: 'trust-level', label: '信任级别' },
    { key: 'email', label: '电子邮件' },
    { key: 'groups', label: '群组' },
    { key: 'following', label: '正在关注' },
    { key: 'followers', label: '关注者' },
    { key: 'points', label: '点数' }
];
const TRUST_LEVEL_NAMES = ['新用户', '基本用户', '成员', '常规用户', '领导者'];
const PRELOADED_USERS_CACHE = { source: null, text: '', username: '', user: null };
let lastProfileKey = '';
let profileObserverReady = false;

function decodeUsername(value) {
    if (!value) return '';
    try {
        return decodeURIComponent(String(value)).toLowerCase();
    } catch {
        return String(value).toLowerCase();
    }
}

function getViewedUsername() {
    const match = window.location.pathname.match(/^\/u\/([^/]+)/i);
    return match ? decodeUsername(match[1]) : '';
}

function getLinkedSectionUsername(section) {
    if (!section) return '';

    const named = [
        '.user-profile-names__primary a[data-user-card]',
        '.user-profile-names__primary a[href*="/u/"]',
        '.username a[data-user-card]',
        '.username a[href*="/u/"]',
        '.user-profile-avatar a[data-user-card]',
        '.user-profile-avatar a[href*="/u/"]'
    ];

    for (const selector of named) {
        const el = section.querySelector(selector);
        if (!el) continue;

        const dataUser = el.getAttribute('data-user-card');
        if (dataUser) return decodeUsername(dataUser);

        const href = el.getAttribute('href') || '';
        const match = href.match(/\/u\/([^/?#]+)/i);
        if (match) return decodeUsername(match[1]);
    }

    return '';
}

function isStaleProfileSection(section) {
    const viewed = getViewedUsername();
    if (!viewed) return false;

    const linkedUser = getLinkedSectionUsername(section);
    if (!linkedUser) return false;

    return linkedUser !== viewed;
}

function isPanelOpen(panel) {
    if (!panel) return false;
    if (!panel.isConnected) return false;
    if (panel.hidden || panel.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(panel);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
}

function isProfileExpanded(section) {
    const toggle = section.querySelector(PROFILE_TOGGLE_SELECTOR);
    if (!toggle) return !section.classList.contains('collapsed-info');

    const aria = toggle.getAttribute('aria-expanded');
    if (aria === 'true') return true;
    if (aria === 'false') return false;

    const hasExpandedIcon = Boolean(toggle.querySelector('.d-icon-angles-up, use[href$="#angles-up"]'));
    const hasCollapsedIcon = Boolean(toggle.querySelector('.d-icon-angles-down, use[href$="#angles-down"]'));
    if (hasExpandedIcon) return true;
    if (hasCollapsedIcon) return false;

    const label = `${toggle.textContent || ''} ${toggle.getAttribute('aria-label') || ''}`;
    if (label.includes('\u6536\u8d77')) return true;
    if (label.includes('\u5c55\u5f00')) return false;

    const controlledPanelId = toggle.getAttribute('aria-controls');
    const panel = (controlledPanelId && document.getElementById(controlledPanelId)) || section.querySelector(PROFILE_PANEL_SELECTOR);
    return isPanelOpen(panel);
}

function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').replace(/[：:]\s*$/, '').trim();
}

function getFactByText(text) {
    const normalized = normalizeText(text).replace(/[：:]/g, '');
    return PROFILE_FACTS.find((fact) => normalized === fact.label || normalized.startsWith(fact.label));
}

function getControlledPanel(section) {
    const toggle = section.querySelector(PROFILE_TOGGLE_SELECTOR);
    const controlledPanelId = toggle?.getAttribute('aria-controls');
    if (!controlledPanelId) return null;

    const local = section.querySelector(`#${CSS.escape(controlledPanelId)}`);
    if (local) return local;

    const global = document.getElementById(controlledPanelId);
    if (global && (section.contains(global) || global.closest('.user-main')?.contains(section))) {
        return global;
    }

    return null;
}

function getProfileDataSource(section) {
    const controlledPanel = getControlledPanel(section);
    if (controlledPanel) return controlledPanel;

    const directPanel = section.querySelector(PROFILE_PANEL_SELECTOR);
    if (directPanel) return directPanel;

    const candidates = [
        '.secondary',
        '.user-profile__details',
        '.profile-details',
        '.public-user-fields',
        '.user-profile-meta',
        '.user-profile-info',
        '.user-profile-controls-outlet'
    ];

    for (const selector of candidates) {
        const candidate = section.querySelector(selector);
        if (candidate && PROFILE_FACTS.some((fact) => candidate.textContent.includes(fact.label))) {
            return candidate;
        }
    }

    return section;
}

function cloneElementChildren(element) {
    const fragment = document.createDocumentFragment();
    element.childNodes.forEach((node) => fragment.appendChild(node.cloneNode(true)));
    return fragment;
}

function getFragmentText(fragment) {
    const wrapper = document.createElement('div');
    wrapper.appendChild(fragment.cloneNode(true));
    return normalizeText(wrapper.textContent);
}

function addFact(facts, fact, fragment, text = '') {
    if (!fact || facts.has(fact.key)) return;

    const valueText = normalizeText(text || getFragmentText(fragment));
    if (!valueText && !fragment?.childNodes?.length) return;

    facts.set(fact.key, {
        ...fact,
        fragment,
        text: valueText
    });
}

function collectDefinitionFacts(source, facts) {
    source.querySelectorAll('dt').forEach((term) => {
        const fact = getFactByText(term.textContent);
        if (!fact) return;

        const value = term.nextElementSibling?.matches('dd')
            ? term.nextElementSibling
            : term.parentElement?.querySelector('dd');

        if (value) {
            addFact(facts, fact, cloneElementChildren(value));
        }
    });
}

function collectTableFacts(source, facts) {
    source.querySelectorAll('tr').forEach((row) => {
        const labelCell = row.querySelector('th, td:first-child');
        const valueCell = row.querySelector('td:last-child');
        const fact = getFactByText(labelCell?.textContent);

        if (fact && valueCell && valueCell !== labelCell) {
            addFact(facts, fact, cloneElementChildren(valueCell));
        }
    });
}

function getValueFragmentFromFallbackLinks(source, fact, text) {
    const fragment = document.createDocumentFragment();
    let anchors = [];

    if (fact.key === 'groups') {
        anchors = [...source.querySelectorAll('a[href*="/g/"], a[href*="/g?"]')];
    } else if (fact.key === 'points') {
        anchors = [...source.querySelectorAll('a[href*="leaderboard"]')];
    }

    if (anchors.length) {
        anchors.forEach((anchor) => fragment.appendChild(anchor.cloneNode(true)));
        return fragment;
    }

    fragment.appendChild(document.createTextNode(text));
    return fragment;
}

function getFallbackValueText(fact, valueLines) {
    const text = valueLines.join(' ').trim();
    if (fact.key === 'email') {
        return text.replace(/\s+/g, '').replace(/\s*([@.])\s*/g, '$1');
    }
    return text;
}

function collectTextFacts(source, facts) {
    const lines = (source.innerText || source.textContent || '')
        .split(/\n+/)
        .map((line) => normalizeText(line))
        .filter(Boolean);

    for (let index = 0; index < lines.length; index += 1) {
        const fact = getFactByText(lines[index]);
        if (!fact || facts.has(fact.key)) continue;

        const inlineValue = normalizeText(lines[index].replace(fact.label, '').replace(/^[:：]/, ''));
        const valueLines = inlineValue ? [inlineValue] : [];

        let cursor = index + 1;
        while (cursor < lines.length && !getFactByText(lines[cursor])) {
            valueLines.push(lines[cursor]);
            cursor += 1;
        }

        const valueText = getFallbackValueText(fact, valueLines);
        if (valueText) {
            addFact(facts, fact, getValueFragmentFromFallbackLinks(source, fact, valueText), valueText);
        }
    }
}

function collectProfileFacts(source) {
    const facts = new Map();
    if (!source) return [];

    collectDefinitionFacts(source, facts);
    collectTableFacts(source, facts);
    collectTextFacts(source, facts);

    return PROFILE_FACTS
        .map((fact) => facts.get(fact.key))
        .filter(Boolean);
}

function getPreloadedUser() {
    const el = document.getElementById('data-preloaded');
    const viewed = getViewedUsername();
    if (!el || !viewed) return null;

    const text = el.textContent || '';
    if (
        PRELOADED_USERS_CACHE.source === el &&
        PRELOADED_USERS_CACHE.text === text &&
        PRELOADED_USERS_CACHE.username === viewed
    ) {
        return PRELOADED_USERS_CACHE.user;
    }

    let user = null;
    try {
        const data = JSON.parse(text);
        const key = Object.keys(data).find((name) => name.toLowerCase() === `user_${viewed}`);
        if (key) {
            user = JSON.parse(data[key]).user || null;
        }
    } catch {
        user = null;
    }

    PRELOADED_USERS_CACHE.source = el;
    PRELOADED_USERS_CACHE.text = text;
    PRELOADED_USERS_CACHE.username = viewed;
    PRELOADED_USERS_CACHE.user = user;
    return user;
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getMonth() + 1}月 ${date.getDate()} 日`;
}

function formatRelativeTime(value) {
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return '';

    const diff = Date.now() - time;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return '刚刚';
    if (diff < hour) return `${Math.floor(diff / minute)} 分钟`;
    if (diff < day) return `${Math.floor(diff / hour)} 小时`;
    if (diff < 30 * day) return `${Math.floor(diff / day)} 天`;
    return formatDate(value);
}

function getActivityFacts(user) {
    if (!user) return [];

    const definitions = [
        { key: 'joined', label: '加入日期', value: formatDate(user.created_at) },
        { key: 'last-post', label: '最后一个帖子', value: formatRelativeTime(user.last_posted_at) },
        { key: 'last-seen', label: '最后活动', value: formatRelativeTime(user.last_seen_at) },
        { key: 'views', label: '浏览量', value: user.profile_view_count },
        { key: 'trust-level', label: '信任级别', value: TRUST_LEVEL_NAMES[user.trust_level] || '' },
        { key: 'points', label: '点数', value: user.gamification_score }
    ];

    return definitions
        .filter((fact) => fact.value !== undefined && fact.value !== null && fact.value !== '')
        .map((fact) => ({ ...fact, text: String(fact.value) }));
}

function buildFactsTable(facts) {
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    table.className = 'sogreen-profile-facts-table';

    facts.forEach((fact) => {
        const item = document.createElement('tr');
        const label = document.createElement('th');
        const value = document.createElement('td');

        item.className = 'sogreen-profile-fact';
        item.dataset.fact = fact.key;
        label.className = 'sogreen-profile-fact-label';
        value.className = 'sogreen-profile-fact-value';
        label.scope = 'row';
        label.textContent = fact.label;

        if (fact.fragment) {
            value.appendChild(fact.fragment.cloneNode(true));
        } else {
            value.textContent = fact.text;
        }

        item.append(label, value);
        tbody.appendChild(item);
    });

    table.appendChild(tbody);
    return table;
}

function getFactsSignature(facts) {
    return facts.map((fact) => `${fact.key}:${fact.text}`).join('|');
}

function getProfileKey() {
    return window.location.pathname.replace(/\/+$/, '').toLowerCase();
}

function getFactsMount(section) {
    return section.querySelector('.details .primary') || section.querySelector('.details') || section;
}

function unwrapIdentityHighlights(root) {
    if (!root?.querySelectorAll) return;

    root.querySelectorAll([
        '.user-profile-names .highlight-alpha',
        '.user-profile-names .highlight-numeric',
        '.username .highlight-alpha',
        '.username .highlight-numeric',
        '.user-profile-avatar .highlight-alpha',
        '.user-profile-avatar .highlight-numeric',
        'a[data-user-card] .highlight-alpha',
        'a[data-user-card] .highlight-numeric'
    ].join(', ')).forEach((span) => {
        const parent = span.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(span.textContent), span);
        parent.normalize();
    });
}

function resetInjectedProfileCards() {
    PRELOADED_USERS_CACHE.source = null;
    PRELOADED_USERS_CACHE.text = '';
    PRELOADED_USERS_CACHE.username = '';
    PRELOADED_USERS_CACHE.user = null;

    document.querySelectorAll(`.${PROFILE_FACTS_CLASS}`).forEach((card) => card.remove());
    document.querySelectorAll(`.${PROFILE_SOURCE_HIDDEN_CLASS}`).forEach((el) => {
        el.classList.remove(PROFILE_SOURCE_HIDDEN_CLASS);
    });
    document.querySelectorAll(`section.about.${PROFILE_CARD_CLASS}`).forEach((section) => {
        section.classList.remove(PROFILE_CARD_CLASS);
    });
    document.querySelectorAll('section.about').forEach(unwrapIdentityHighlights);
}

function removeProfileFacts(section) {
    section.querySelector(`.${PROFILE_FACTS_CLASS}`)?.remove();
    const source = getProfileDataSource(section);
    if (source && source !== section) {
        source.classList.remove(PROFILE_SOURCE_HIDDEN_CLASS);
    }
}

function renderProfileFacts(section) {
    if (isStaleProfileSection(section)) {
        removeProfileFacts(section);
        return;
    }

    const source = getProfileDataSource(section);
    let facts = collectProfileFacts(source);
    const viewed = getViewedUsername();

    if (!facts.length) {
        const user = getPreloadedUser();
        const matches = Boolean(user && viewed) && decodeUsername(user.username) === viewed;
        facts = matches ? getActivityFacts(user) : [];
    }

    if (!facts.length) {
        removeProfileFacts(section);
        return;
    }

    const mount = getFactsMount(section);
    let card = mount.querySelector(`:scope > .${PROFILE_FACTS_CLASS}`);
    const signature = getFactsSignature(facts);

    if (card && card.dataset.username && card.dataset.username !== viewed) {
        card.remove();
        card = null;
    }

    if (card?.dataset.signature === signature && card.dataset.username === viewed) {
        if (source && source !== section && !source.contains(card)) {
            source.classList.add(PROFILE_SOURCE_HIDDEN_CLASS);
        }
        return;
    }

    if (!card) {
        card = document.createElement('div');
        card.className = PROFILE_FACTS_CLASS;
        mount.appendChild(card);
    }

    card.dataset.signature = signature;
    card.dataset.username = viewed;
    card.replaceChildren(buildFactsTable(facts));

    if (source && source !== section && !source.contains(card)) {
        source.classList.add(PROFILE_SOURCE_HIDDEN_CLASS);
    }
}

function syncProfileSection(section) {
    if (!section) return;

    if (isStaleProfileSection(section)) {
        unwrapIdentityHighlights(section);
        removeProfileFacts(section);
        section.classList.remove(PROFILE_CARD_CLASS);
        return;
    }

    const expanded = isProfileExpanded(section);
    section.classList.toggle(PROFILE_CARD_CLASS, expanded);

    if (expanded) {
        renderProfileFacts(section);
    } else {
        removeProfileFacts(section);
    }
}

export function syncUserProfileCard() {
    const profileKey = getProfileKey();
    if (profileKey !== lastProfileKey) {
        lastProfileKey = profileKey;
        resetInjectedProfileCards();
    }

    if (!getViewedUsername()) {
        resetInjectedProfileCards();
        return;
    }

    document.querySelectorAll(PROFILE_SECTION_SELECTOR).forEach(syncProfileSection);
}

export function setupUserProfileCardObserver() {
    if (!document.body) {
        document.addEventListener('DOMContentLoaded', setupUserProfileCardObserver, { once: true });
        return;
    }
    if (profileObserverReady) {
        syncUserProfileCard();
        return;
    }
    profileObserverReady = true;

    let queued = false;
    let lastSeenUsername = getViewedUsername();

    const scheduleSync = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            syncUserProfileCard();
        });
    };

    const scheduleRouteSync = () => {
        setTimeout(scheduleSync, 0);
        setTimeout(scheduleSync, 80);
        setTimeout(scheduleSync, 200);
        setTimeout(scheduleSync, 500);
        setTimeout(scheduleSync, 900);
    };

    const onUserRouteMaybeChanged = (beforeUsername) => {
        if (getViewedUsername() !== beforeUsername) {
            lastProfileKey = getProfileKey();
            resetInjectedProfileCards();
        }
        lastSeenUsername = getViewedUsername();
        scheduleRouteSync();
    };

    lastProfileKey = getProfileKey();
    syncUserProfileCard();

    document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement;
        const toggle = target?.closest?.(PROFILE_TOGGLE_SELECTOR);
        if (!toggle) return;
        if (!toggle.closest('section.about')) return;
        scheduleRouteSync();
    }, true);

    window.addEventListener('popstate', () => onUserRouteMaybeChanged(lastSeenUsername));

    const historyMethods = ['pushState', 'replaceState'];
    historyMethods.forEach((method) => {
        const original = history[method];
        history[method] = function patchedHistory() {
            const beforeUsername = getViewedUsername();
            const result = original.apply(this, arguments);
            onUserRouteMaybeChanged(beforeUsername);
            return result;
        };
    });

    const observer = new MutationObserver((mutations) => {
        const routeChanged = getProfileKey() !== lastProfileKey;
        const relevant = routeChanged || mutations.some((mutation) => {
            if (mutation.type === 'childList') return true;
            const target = mutation.target;
            return target instanceof Element && (
                target.matches?.('section.about, .user-profile-toggle-btn, #collapsed-info-panel') ||
                target.closest?.('section.about')
            );
        });
        if (relevant) scheduleSync();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-expanded', 'hidden', 'class']
    });
}
