import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: 'LINUX DO - Modern Clean Card (极简清爽版)',
        namespace: 'http://tampermonkey.net/',
        version: '12.0',
        description: 'LINUX DO 论坛美化：严格的扁平化卡片布局 + 极简白底 + [青/粉]微点缀 + 强制“花枝丸”字体。',
        author: 'YourName',
        match: 'https://linux.do/*',
        icon: 'https://linux.do/uploads/default/optimized/4X/c/c/d/ccd8c210609d498cbeb3d5201d4c259348447562_2_32x32.png',
        grant: [
          'GM_addStyle',
          'GM_getValue',
          'GM_setValue',
          'GM_registerMenuCommand'
        ],
        'run-at': 'document-start',
        license: 'MIT',
        downloadURL: 'https://update.greasyfork.org/scripts/557640/LINUX%20DO%20-%20Modern%20Clean%20Card%20%28%E6%9E%81%E7%AE%80%E6%B8%85%E7%88%BD%E7%89%88%29.user.js',
        updateURL: 'https://update.greasyfork.org/scripts/557640/LINUX%20DO%20-%20Modern%20Clean%20Card%20%28%E6%9E%81%E7%AE%80%E6%B8%85%E7%88%BD%E7%89%88%29.meta.js'
      },
    }),
  ],
});