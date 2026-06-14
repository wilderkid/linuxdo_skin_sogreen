const PAGE_CLASS = 'sogreen-community-page';
const STAGE_CLASS = 'sogreen-community-stage';
const READY_KEY = 'sogreenCommunityOrbitReady';
const TITLE_PATTERN = /where\s+possible\s+begins/i;

function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

function isCommunityPage(contentBody) {
    if (!contentBody) return false;

    const title = contentBody.querySelector('h2')?.textContent || '';
    return TITLE_PATTERN.test(title) && contentBody.querySelectorAll('.md-table table').length >= 2;
}

function getCleanTitle(contentBody) {
    const rawTitle = normalizeText(contentBody.querySelector('h2')?.textContent || 'WHERE POSSIBLE BEGINS');
    return rawTitle.replace(/[.!?]+$/g, '').toUpperCase();
}

function getHeaderText(headers, index) {
    return normalizeText(headers[index]?.textContent || '');
}

function getUrlHost(anchor) {
    const href = anchor.getAttribute('href') || '';
    try {
        const url = new URL(anchor.href || href, window.location.href);
        return url.hostname.replace(/^www\./, '');
    } catch {
        return href.replace(/^https?:\/\//, '').split('/')[0];
    }
}

function collectTableLinks(table) {
    const headers = [...table.querySelectorAll('thead th')];
    const rows = [...table.querySelectorAll('tbody tr')];
    const items = [];

    rows.forEach((row) => {
        [...row.children].forEach((cell, index) => {
            const anchor = cell.querySelector('a[href]');
            if (!anchor) return;

            const label = normalizeText(anchor.textContent);
            if (!label) return;

            items.push({
                label,
                category: getHeaderText(headers, index),
                host: getUrlHost(anchor),
                href: anchor.getAttribute('href') || anchor.href,
                source: anchor
            });
        });
    });

    return items;
}

function copyLinkAttributes(target, source) {
    ['href', 'target', 'rel', 'title', 'aria-label'].forEach((name) => {
        const value = source.getAttribute(name);
        if (value) target.setAttribute(name, value);
    });

    if (target.target === '_blank' && !target.rel) {
        target.rel = 'noopener noreferrer';
    }
}

function toneText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (
                !parent ||
                parent.closest('style, script, textarea, noscript, svg, .highlight-alpha, .highlight-numeric') ||
                !/[a-zA-Z0-9.\-]/.test(node.nodeValue)
            ) {
                return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
        }
    });

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
        nodes.push(node);
    }

    nodes.forEach((textNode) => {
        const text = textNode.nodeValue;
        const regex = /([a-zA-Z]+)|([0-9][0-9.,-]*)/g;
        let lastIndex = 0;
        let match;
        const fragment = document.createDocumentFragment();

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            const span = document.createElement('span');
            span.className = match[1] ? 'highlight-alpha' : 'highlight-numeric';
            span.textContent = match[0];
            fragment.appendChild(span);
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        textNode.parentNode.replaceChild(fragment, textNode);
    });
}

function createOrbitLink(item, index, total) {
    const link = document.createElement('a');
    const category = document.createElement('span');
    const title = document.createElement('span');
    const host = document.createElement('span');
    const useSplitOrbit = total > 12;
    const isOuterRing = !useSplitOrbit || index % 2 === 0;
    const ringIndex = useSplitOrbit ? Math.floor(index / 2) : index;
    const ringTotal = useSplitOrbit
        ? (isOuterRing ? Math.ceil(total / 2) : Math.floor(total / 2))
        : total;
    const angleStep = 360 / Math.max(ringTotal, 1);
    const angleOffset = useSplitOrbit && !isOuterRing ? 0.5 : 0;
    const angle = -90 + angleStep * (ringIndex + angleOffset);
    const radius = useSplitOrbit ? (isOuterRing ? 400 : 240) : 340;

    link.className = 'sogreen-community-link-card';
    link.dataset.orbitRing = isOuterRing ? 'outer' : 'inner';
    link.style.setProperty('--orbit-angle', `${angle}deg`);
    link.style.setProperty('--orbit-angle-reverse', `${angle * -1}deg`);
    link.style.setProperty('--orbit-radius', `${radius}px`);
    link.style.setProperty('--orbit-delay', `${(index % 9) * -0.22}s`);
    copyLinkAttributes(link, item.source);

    category.className = 'sogreen-community-link-category';
    category.textContent = item.category;

    title.className = 'sogreen-community-link-title';
    title.textContent = item.label;

    host.className = 'sogreen-community-link-host';
    host.textContent = item.host;

    if (item.category) link.appendChild(category);
    link.append(title, host);
    return link;
}

function createOrbitSection(title, items) {
    const orbit = document.createElement('section');
    const rings = document.createElement('div');
    const core = document.createElement('div');
    const coreTitle = document.createElement('h2');
    const links = document.createElement('div');

    orbit.className = 'sogreen-community-orbit';
    rings.className = 'sogreen-community-rings';
    core.className = 'sogreen-community-core';
    coreTitle.className = 'sogreen-community-core-title';
    links.className = 'sogreen-community-links';

    coreTitle.textContent = title;
    core.appendChild(coreTitle);

    items.forEach((item, index) => {
        links.appendChild(createOrbitLink(item, index, items.length));
    });

    orbit.append(rings, core, links);
    return orbit;
}

function collectKnowledgeGroups(table) {
    const headers = [...table.querySelectorAll('thead th')].map((header) => normalizeText(header.textContent));
    const groups = headers
        .map((title, index) => ({ title, index, items: [] }))
        .filter((group) => group.title);

    table.querySelectorAll('tbody tr').forEach((row) => {
        [...row.children].forEach((cell, index) => {
            const anchor = cell.querySelector('a[href]');
            if (!anchor) return;

            const group = groups.find((item) => item.index === index);
            const label = normalizeText(anchor.textContent);
            if (!group || !label) return;

            group.items.push({
                label,
                host: getUrlHost(anchor),
                source: anchor
            });
        });
    });

    return groups.filter((group) => group.items.length);
}

function createKnowledgeSection(table) {
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    const grid = document.createElement('div');
    const sourceHeading = table.closest('.md-table')?.previousElementSibling;
    const groups = collectKnowledgeGroups(table);

    section.className = 'sogreen-community-knowledge';
    heading.className = 'sogreen-community-knowledge-title';
    heading.textContent = normalizeText(sourceHeading?.textContent || '\u793e\u533a\u5fc5\u77e5\u5185\u5bb9');
    grid.className = 'sogreen-community-knowledge-grid';

    groups.forEach((group) => {
        const card = document.createElement('section');
        const title = document.createElement('h4');
        const list = document.createElement('div');

        card.className = 'sogreen-community-knowledge-card';
        title.className = 'sogreen-community-knowledge-card-title';
        title.textContent = group.title;
        list.className = 'sogreen-community-knowledge-list';

        group.items.forEach((item) => {
            const link = document.createElement('a');
            const label = document.createElement('span');
            const host = document.createElement('span');

            link.className = 'sogreen-community-knowledge-link';
            copyLinkAttributes(link, item.source);

            label.className = 'sogreen-community-knowledge-link-label';
            label.textContent = item.label;

            host.className = 'sogreen-community-knowledge-link-host';
            host.textContent = item.host;

            link.append(label, host);
            list.appendChild(link);
        });

        card.append(title, list);
        grid.appendChild(card);
    });

    section.append(heading, grid);
    return section;
}

function buildStage(contentBody) {
    const tables = [...contentBody.querySelectorAll('.md-table table')];
    const orbitItems = collectTableLinks(tables[0]);
    if (!orbitItems.length || !tables[1]) return null;

    const stage = document.createElement('div');
    stage.className = STAGE_CLASS;
    stage.append(
        createOrbitSection(getCleanTitle(contentBody), orbitItems),
        createKnowledgeSection(tables[1])
    );

    toneText(stage);
    return stage;
}

export function syncCommunityOrbitPage() {
    const contentBody = document.querySelector('.published-page-content-body');
    const matches = isCommunityPage(contentBody);

    document.body.classList.toggle(PAGE_CLASS, matches);

    if (!matches || !contentBody) return;
    if (contentBody.dataset[READY_KEY] === 'true') return;

    const stage = buildStage(contentBody);
    if (!stage) return;

    contentBody.dataset[READY_KEY] = 'true';
    contentBody.prepend(stage);
}

export function setupCommunityOrbitObserver() {
    let queued = false;

    const scheduleSync = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            syncCommunityOrbitPage();
        });
    };

    syncCommunityOrbitPage();

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList: true, subtree: true });
}
