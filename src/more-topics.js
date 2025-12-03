export function initMoreTopicsTabs() {
    const moreTopicsContainer = document.querySelector('.more-topics__container');
    if (!moreTopicsContainer) return;

    const tabs = moreTopicsContainer.querySelectorAll('.nav-pills .btn');
    const tabContents = moreTopicsContainer.querySelectorAll('.topic-list');

    if (!tabs.length || !tabContents.length) return;

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

    // 默认显示第一个标签内容
    if (tabs[0]) tabs[0].click();
}

export function moveMoreTopicsList() {
    const container = document.querySelector('.more-topics__container');
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