import './style.css';
import './preferences-relaxed.css';
import { runHighlight, setupObserver } from './observer';
import { initMoreTopicsTabs, moveMoreTopicsList, setupMoreTopicsObserver } from './more-topics';
import { setupUserProfileCardObserver, syncUserProfileCard } from './profile-card';
import { applyCustomFont, setupFontMenu } from './settings';

function initSogreenUI() {
    runHighlight();
    setupObserver();
    initMoreTopicsTabs();
    moveMoreTopicsList();
    setupMoreTopicsObserver();
    syncUserProfileCard();
    setupUserProfileCardObserver();
    setupFontMenu();
}

(function() {
    'use strict';

    applyCustomFont();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSogreenUI, { once: true });
    } else {
        initSogreenUI();
    }
})();
