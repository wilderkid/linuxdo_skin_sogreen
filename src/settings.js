import { GM_getValue, GM_setValue, GM_registerMenuCommand } from '$';

const DEFAULT_FONT = `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "荆南麦圆体", "素材集市康康体","苍耳舒圆体 W01", "PingFang SC", "HarmonyOS Sans", "Microsoft YaHei", sans-serif`;

/**
 * 应用用户自定义字体
 */
export function applyCustomFont() {
    const savedFont = GM_getValue('customFont', DEFAULT_FONT);
    const styleId = 'custom-font-override';
    let styleElement = document.getElementById(styleId);

    // 如果样式标签不存在，则创建并添加到 head
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }

    // 更新样式标签的内容，以最高优先级覆盖字体变量
    styleElement.textContent = `:root { --my-font-stack: ${savedFont} !important; }`;
}

/**
 * 设置油猴菜单
 */
export function setupFontMenu() {
    GM_registerMenuCommand('设置自定义字体', () => {
        const currentFont = GM_getValue('customFont', DEFAULT_FONT);
        const newFont = prompt('请输入你想要的字体，用英文逗号隔开：', currentFont);

        if (newFont && newFont.trim() !== '') {
            GM_setValue('customFont', newFont.trim());
            applyCustomFont();
            alert('字体已更新！');
        }
    });

    GM_registerMenuCommand('恢复默认字体', () => {
        GM_setValue('customFont', DEFAULT_FONT);
        applyCustomFont();
        alert('已恢复默认字体！');
    });
}