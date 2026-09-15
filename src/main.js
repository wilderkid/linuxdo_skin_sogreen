import './style.css';
import './preferences-relaxed.css';
import './community-orbit.css';
import './search-page.css';
import './about-page.css';
import './dark-mode.css';
import { runHighlight, setupObserver } from './observer';
import { initMoreTopicsTabs, moveMoreTopicsList, setupMoreTopicsObserver } from './more-topics';
import { setupUserProfileCardObserver, syncUserProfileCard } from './profile-card';
import { applyCustomFont, setupFontMenu } from './settings';
import { setupCommunityOrbitObserver, syncCommunityOrbitPage } from './community-orbit';
import { setupDarkModeSync } from './theme-sync';

let uiReady = false;

function initSogreenUI() {
    if (uiReady) return;
    uiReady = true;

    runHighlight();
    setupObserver();
    initMoreTopicsTabs();
    moveMoreTopicsList();
    setupMoreTopicsObserver();
    syncUserProfileCard();
    setupUserProfileCardObserver();
    syncCommunityOrbitPage();
    setupCommunityOrbitObserver();
    setupFontMenu();
}

(function() {
    'use strict';

    applyCustomFont();
    setupDarkModeSync();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSogreenUI, { once: true });
    } else {
        initSogreenUI();
    }
})();
