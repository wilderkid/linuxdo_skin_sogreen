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
    '#d-sidebar .sidebar-section-header-text',
    '#d-sidebar .sidebar-section-link-content-text',
    '#d-sidebar .sidebar-theme-toggle-dropdown .name',
    '#d-sidebar .d-button-label'
].join(', ');

function highlight(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const nodesToProcess = [];
    while (node = walker.nextNode()) {
        const parent = node.parentElement;
        if (
            !parent ||
            parent.tagName.match(/^(STYLE|SCRIPT|TEXTAREA|NOSCRIPT|SVG)$/i) ||
            parent.classList.contains('highlight-alpha') ||
            parent.classList.contains('highlight-numeric')
        ) {
            continue;
        }
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

const debouncedHighlight = debounce(runHighlight, 300);

const observer = new MutationObserver((mutations) => {
    let shouldRun = false;
    for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            shouldRun = true;
            break;
        }
    }
    if (shouldRun) {
        debouncedHighlight();
    }
});

export function setupObserver() {
    observer.observe(document.body, { childList: true, subtree: true });
}
