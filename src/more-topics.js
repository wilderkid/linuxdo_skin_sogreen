const CONTAINER_SELECTOR = '.more-topics__container';
const NATIVE_TABS_SELECTOR = '.topic-list-header.--has-tabs';
const TABS_READY_KEY = 'sogreenMoreTopicsTabsReady';

function hasNativeTabs(container) {
    return Boolean(container.querySelector(NATIVE_TABS_SELECTOR));
}

export function initMoreTopicsTabs() {
    const moreTopicsContainer = document.querySelector(CONTAINER_SELECTOR);
    if (!moreTopicsContainer) return;

    // 新版 Discourse 的 推荐/相关 标签由站点原生渲染与切换，脚本不再接管
    if (hasNativeTabs(moreTopicsContainer)) return;
    if (moreTopicsContainer.dataset[TABS_READY_KEY] === 'true') return;

    const tabs = moreTopicsContainer.querySelectorAll('.nav-pills .btn');
    const tabContents = moreTopicsContainer.querySelectorAll('.topic-list');

    // 旧版布局：多个 topic-list 表格对应多个标签，才需要脚本切换
    if (tabs.length < 2 || tabContents.length < 2) return;

    moreTopicsContainer.dataset[TABS_READY_KEY] = 'true';

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            // 移除所有活动状态
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');

            // 设置当前活动状态
            tab.classList.add('active');
            if (tabContents[index]) {
                tabContents[index].style.display = '';
            }
        });
    });
}

export function moveMoreTopicsList() {
    const container = document.querySelector(CONTAINER_SELECTOR);
    if (container) {
        const row = container.querySelector('.row');
        if (row) {
            container.parentNode.insertBefore(row, container);
        }
    }
}

export function setupMoreTopicsObserver() {
    const moreTopicsObserver = new MutationObserver((mutations) => {
        let shouldInit = false;
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE &&
                        (node.classList.contains('more-topics__container') ||
                         node.querySelector && node.querySelector('.more-topics__container'))) {
                        shouldInit = true;
                        break;
                    }
                }
            }
            if (shouldInit) break;
        }
        if (shouldInit) {
            setTimeout(() => {
                initMoreTopicsTabs();
                moveMoreTopicsList();
            }, 100); // 延迟一点时间确保DOM完全加载
        }
    });

    moreTopicsObserver.observe(document.body, { childList: true, subtree: true });
}
