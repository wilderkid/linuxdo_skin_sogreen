function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

const HIGHLIGHT_TARGET_SELECTOR = [
    '.topic-list',
    '.topic-post',
    '.user-summary-page .user-main',
    '.user-summary-page .user-content',
    '.user-activity-page section.collapsed-info.about',
    '.user-activity-page .user-navigation',
    '.user-activity-page .post-list.user-stream',
    '.user-notifications-page section.collapsed-info.about',
    '.user-notifications-page .user-navigation',
    '.user-notifications-page .notification-history',
    '.user-follow-page section.collapsed-info.about',
    '.user-follow-page .user-navigation',
    '.user-follow-page .user-follows-tab',
    '.user-preferences-page section.collapsed-info.about',
    '.user-preferences-page .user-navigation',
    '.user-preferences-page .user-preferences',
    '.search-page .search-container',
    '#d-sidebar .sidebar-section-header-text',
    '#d-sidebar .sidebar-section-link-content-text',
    '#d-sidebar .sidebar-theme-toggle-dropdown .name',
    '#d-sidebar .d-button-label'
].join(', ');

function highlight(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    if (element.closest('.highlight-alpha, .highlight-numeric')) return;

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
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
    }, false);
    let node;
    const nodesToProcess = [];
    while (node = walker.nextNode()) {
        nodesToProcess.push(node);
    }

    nodesToProcess.forEach(node => {
        const text = node.nodeValue;
        const regex = /([a-zA-Z]+)|([0-9\.\-]+)/g;
        if (!text.match(regex)) return;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;
        regex.lastIndex = 0;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            }

            const span = document.createElement('span');
            if (match[1]) { // English letters
                span.className = 'highlight-alpha';
                span.textContent = match[1];
            } else if (match[2]) { // Numbers
                span.className = 'highlight-numeric';
                span.textContent = match[2];
            }
            fragment.appendChild(span);
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        if (fragment.childNodes.length > 0) {
            node.parentNode.replaceChild(fragment, node);
        }
    });
}

export const runHighlight = () => {
    const targetNodes = document.querySelectorAll(HIGHLIGHT_TARGET_SELECTOR);
    targetNodes.forEach(targetNode => {
        highlight(targetNode);
    });
};

const pendingHighlightRoots = new Set();

function isGeneratedHighlightNode(node) {
    return node.nodeType === Node.ELEMENT_NODE &&
        (node.classList.contains('highlight-alpha') || node.classList.contains('highlight-numeric'));
}

function queueHighlightRoot(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;

    for (const pendingRoot of pendingHighlightRoots) {
        if (pendingRoot === root || pendingRoot.contains(root)) return;
        if (root.contains(pendingRoot)) {
            pendingHighlightRoots.delete(pendingRoot);
        }
    }

    pendingHighlightRoots.add(root);
}

function queueAddedNode(node) {
    if (isGeneratedHighlightNode(node)) return;

    if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (/[a-zA-Z0-9.\-]/.test(node.nodeValue) && parent?.closest(HIGHLIGHT_TARGET_SELECTOR)) {
            queueHighlightRoot(parent);
        }
        return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node.matches(HIGHLIGHT_TARGET_SELECTOR)) {
        queueHighlightRoot(node);
        return;
    }

    if (node.closest(HIGHLIGHT_TARGET_SELECTOR)) {
        queueHighlightRoot(node);
        return;
    }

    node.querySelectorAll(HIGHLIGHT_TARGET_SELECTOR).forEach(queueHighlightRoot);
}

const debouncedHighlightPending = debounce(() => {
    const roots = [...pendingHighlightRoots].filter(root => root.isConnected);
    pendingHighlightRoots.clear();
    roots.forEach(highlight);
}, 120);

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) {
            continue;
        }

        mutation.addedNodes.forEach(queueAddedNode);
    }

    if (pendingHighlightRoots.size > 0) {
        debouncedHighlightPending();
    }
});

export function setupObserver() {
    observer.observe(document.body, { childList: true, subtree: true });
}
