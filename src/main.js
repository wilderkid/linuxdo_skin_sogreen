import './style.css';
import { runHighlight, setupObserver } from './observer';
import { initMoreTopicsTabs, moveMoreTopicsList, setupMoreTopicsObserver } from './more-topics';
import { applyCustomFont, setupFontMenu } from './settings';

(function() {
    'use strict';

    // 立即应用字体，避免闪烁
    applyCustomFont();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            runHighlight();
            setupObserver();
            initMoreTopicsTabs();
            moveMoreTopicsList();
            setupMoreTopicsObserver();
            setupFontMenu(); // 设置菜单
        });
    } else {
        runHighlight();
        setupObserver();
        initMoreTopicsTabs();
        moveMoreTopicsList();
        setupMoreTopicsObserver();
        setupFontMenu(); // 设置菜单
    }
})();