const PROFILE_CARD_CLASS = 'sogreen-profile-expanded-card';
const PROFILE_CARD_STATE_KEY = 'sogreenProfileCardExpanded';
const PROFILE_SOURCE_HIDDEN_CLASS = 'sogreen-profile-source-hidden';
const PROFILE_FACTS_CLASS = 'sogreen-profile-facts';
const PROFILE_SECTION_SELECTOR = 'body.user-summary-page section.about';
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

function isPanelOpen(panel) {
    if (!panel) return false;
    if (!panel.isConnected) return false;
    if (panel.hidden || panel.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(panel);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
}

function isProfileExpanded(section) {
    if (section.classList.contains(PROFILE_CARD_CLASS)) return true;

    const toggle = section.querySelector(PROFILE_TOGGLE_SELECTOR);
    const controlledPanelId = toggle?.getAttribute('aria-controls');
    const controlledPanel = controlledPanelId ? document.getElementById(controlledPanelId) : null;
    const panel = controlledPanel || section.querySelector(PROFILE_PANEL_SELECTOR);
    const hasExpandedIcon = Boolean(toggle?.querySelector('.d-icon-angles-up, use[href$="#angles-up"]'));
    const saysCollapse = toggle?.textContent?.includes('\u6536\u8d77') || toggle?.getAttribute('aria-label')?.includes('\u6536\u8d77');
    return toggle?.getAttribute('aria-expanded') === 'true' || hasExpandedIcon || saysCollapse || isPanelOpen(panel);
}

function getManualState(section) {
    const value = section.dataset[PROFILE_CARD_STATE_KEY];
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
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
    return controlledPanelId ? document.getElementById(controlledPanelId) : null;
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

    const next = section.nextElementSibling;
    if (next && PROFILE_FACTS.some((fact) => next.textContent.includes(fact.label))) {
        return next;
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

function getFactsSignature(facts) {
    return facts.map((fact) => `${fact.key}:${fact.text}`).join('|');
}

function getFactsMount(section) {
    return section.querySelector('.details .primary') || section.querySelector('.details') || section;
}

function removeProfileFacts(section) {
    section.querySelector(`.${PROFILE_FACTS_CLASS}`)?.remove();
    const source = getProfileDataSource(section);
    if (source && source !== section) {
        source.classList.remove(PROFILE_SOURCE_HIDDEN_CLASS);
    }
}

function renderProfileFacts(section) {
    const source = getProfileDataSource(section);
    const facts = collectProfileFacts(source);

    if (!facts.length) {
        removeProfileFacts(section);
        return;
    }

    const mount = getFactsMount(section);
    let card = mount.querySelector(`:scope > .${PROFILE_FACTS_CLASS}`);
    const signature = getFactsSignature(facts);

    if (card?.dataset.signature === signature) {
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
    card.replaceChildren();

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
        value.appendChild(fact.fragment.cloneNode(true));

        item.append(label, value);
        tbody.appendChild(item);
    });

    table.appendChild(tbody);
    card.appendChild(table);

    if (source && source !== section && !source.contains(card)) {
        source.classList.add(PROFILE_SOURCE_HIDDEN_CLASS);
    }
}

function syncProfileSection(section) {
    if (!section) return;
    const manualState = getManualState(section);
    const expanded = manualState ?? isProfileExpanded(section);
    section.classList.toggle(PROFILE_CARD_CLASS, expanded);

    if (expanded) {
        renderProfileFacts(section);
    } else {
        removeProfileFacts(section);
    }
}

export function syncUserProfileCard() {
    document.querySelectorAll(PROFILE_SECTION_SELECTOR).forEach(syncProfileSection);
}

export function setupUserProfileCardObserver() {
    let queued = false;

    const scheduleSync = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            syncUserProfileCard();
        });
    };

    syncUserProfileCard();

    document.addEventListener('click', (event) => {
        const toggle = event.target.closest(PROFILE_TOGGLE_SELECTOR);
        if (!toggle) return;

        const section = toggle.closest('section.about');
        if (!section) return;

        const willExpand = !(section.classList.contains(PROFILE_CARD_CLASS) || isProfileExpanded(section));
        setTimeout(() => {
            section.dataset[PROFILE_CARD_STATE_KEY] = String(willExpand);
            section.classList.toggle(PROFILE_CARD_CLASS, willExpand);
            scheduleSync();
        }, 80);
    }, true);

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-expanded', 'hidden', 'class', 'style']
    });
}
