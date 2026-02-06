(() => {
    // --- State & Config ---
    const state = {
        themes: [],
        activeThemeIndex: -1,
        builtinManifest: null,
        builtinGroups: new Map(),
        fileCache: new Map(), // relativePath/name -> File object
        lang: 'zh' // Default Language
    };

    const TRANSLATIONS = {
        en: {
            new_theme: "New Theme",
            import_project: "Import Project",
            load_assets: "📂 Load Assets (Fix Export)",
            load_assets_tooltip: "Load 'assets' folder to bypass browser blocking",
            export_package: "Export Package",
            welcome_title: "Select or Create a Theme to start",
            welcome_desc: "You can import an existing project or start from scratch.",
            theme_name_en: "Theme Name (EN)",
            theme_name_zh: "Theme Name (ZH)",
            visible: "Visible",
            delete: "Delete",
            id_key: "ID / Key",
            type: "Type",
            extend_builtin: "Extend Builtin",
            new_custom_theme: "New Custom Theme",
            pages: "Pages",
            drag_hint: "Drag images to reorder or add new ones",
            add_pages: "Add Pages",
            drag_images_here: "Drag Images Here",
            opt_resume: "1. Resume Editing",
            opt_resume_desc: "Save this file to continue editing later. Contains <b>project.json</b> and assets.",
            download_source_zip: "Download Source Code (.zip)",
            opt_publish: "2. Publish to App (OTA)",
            opt_publish_desc: "Upload contents to server for App update. Contains <b>manifest.json</b> and assets.",
            download_ota_zip: "Download OTA Package (.zip)",
            close: "Close",
            
            // Dynamic
            untitled_theme: "Untitled Theme",
            extend: "Extend",
            custom: "Custom",
            pages_count: "pages",
            confirm_delete: "Are you sure you want to delete this theme?",
            cached_files: "Cached {0} files. Export should now work.",
            export_ready: "Export Ready",
            processing: "Processing...",
            done: "Done",
            generating_package: "Generating Package...",
            loading_project: "Loading Project...",
            import_failed: "Import Failed: ",
            show: "Show",
            hide: "Hide",
            remove: "Remove"
        },
        zh: {
            new_theme: "新增主題",
            import_project: "匯入專案",
            load_assets: "📂 載入資源 (修復匯出)",
            load_assets_tooltip: "載入 'assets' 資料夾以繞過瀏覽器限制",
            export_package: "匯出打包",
            welcome_title: "選擇或建立一個主題以開始",
            welcome_desc: "您可以匯入現有專案或從頭開始。",
            theme_name_en: "主題名稱 (英文)",
            theme_name_zh: "主題名稱 (中文)",
            visible: "可見",
            delete: "刪除",
            id_key: "ID / 關鍵字",
            type: "類型",
            extend_builtin: "擴充內建 (Extend)",
            new_custom_theme: "新建自訂主題 (Custom)",
            pages: "頁面",
            drag_hint: "拖曳圖片以重新排序或新增",
            add_pages: "新增頁面",
            drag_images_here: "拖曳圖片至此",
            opt_resume: "1. 繼續編輯 (來源檔)",
            opt_resume_desc: "儲存此檔案以便日後繼續編輯。包含 <b>project.json</b> 與資源檔。",
            download_source_zip: "下載原始碼 (.zip)",
            opt_publish: "2. 發布至 App (OTA)",
            opt_publish_desc: "上傳至伺服器供 App 更新使用。包含 <b>manifest.json</b> 與資源檔。",
            download_ota_zip: "下載 OTA 更新包 (.zip)",
            close: "關閉",

            // Dynamic
            untitled_theme: "未命名主題",
            extend: "擴充",
            custom: "自訂",
            pages_count: "頁",
            confirm_delete: "您確定要刪除此主題嗎？",
            cached_files: "已快取 {0} 個檔案。匯出功能現在應可正常運作。",
            export_ready: "匯出準備就緒",
            processing: "處理中...",
            done: "完成",
            generating_package: "正在產生打包...",
            loading_project: "載入專案中...",
            import_failed: "匯入失敗: ",
            show: "顯示",
            hide: "隱藏",
            remove: "移除"
        }
    };

    function t(key, ...args) {
        const dict = TRANSLATIONS[state.lang] || TRANSLATIONS['en'];
        let val = dict[key] || key;
        args.forEach((arg, idx) => {
            val = val.replace(`{${idx}}`, arg);
        });
        return val;
    }

    // --- DOM Elements ---
    const dom = {
        themeList: document.getElementById('themeList'),
        btnLang: document.getElementById('btnLang'), // New
        btnNewTheme: document.getElementById('btnNewTheme'),
        welcomeScreen: document.getElementById('welcomeState'),
        editorContent: document.getElementById('editorContent'),

        // Editor Fields
        titleEn: document.getElementById('themeTitleEn'),
        titleZh: document.getElementById('themeTitleZh'),
        key: document.getElementById('themeKey'),
        kind: document.getElementById('themeKind'),
        suggestions: document.getElementById('builtinKeySuggestions'),

        // Pages
        pageCount: document.getElementById('pageCount'),
        pagesGrid: document.getElementById('pagesGrid'),
        dropZone: document.getElementById('dropZone'),
        fileAddPages: document.getElementById('fileAddPages'),

        // Global Actions
        btnImport: document.getElementById('btnImportProject'),
        btnExport: document.getElementById('btnExport'),
        fileImport: document.getElementById('fileImport'),

        // Overlay
        overlay: document.getElementById('statusOverlay'),
        statusTitle: document.getElementById('statusTitle'),
        statusMsg: document.getElementById('statusMsg'),
        exportActions: document.getElementById('exportActions'),
        btnCloseOverlay: document.getElementById('btnCloseOverlay'),
        dlZip: document.getElementById('dlZip'),
        dlJson: document.getElementById('dlJson'),

        // Manual Asset Loader
        btnLoadAssets: document.getElementById('btnLoadAssets'),
        fileLoadAssets: document.getElementById('fileLoadAssets')
    };

    // --- Init ---
    async function init() {
        bindEvents();
        // Skip fetch, use inlined data
        loadBuiltinManifest();
        setLanguage('zh'); // Default to Chinese
        renderThemeList();
        updateEditorState();
    }

    function setLanguage(lang) {
        state.lang = lang;
        // dom.btnLang.textContent = lang === 'zh' ? '中' : 'EN'; // Don't overwrite icon
        dom.btnLang.title = lang === 'zh' ? 'Switch to English' : '切換至中文';
        
        // Update Static Elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (TRANSLATIONS[lang][key]) {
                el.innerHTML = TRANSLATIONS[lang][key]; // innerHTML to support <b>
            }
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.dataset.i18nTitle;
            if (TRANSLATIONS[lang][key]) {
                el.title = TRANSLATIONS[lang][key];
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            if (TRANSLATIONS[lang][key]) {
                el.placeholder = TRANSLATIONS[lang][key];
            }
        });

        // Re-render components that include text
        renderThemeList();
        if (state.activeThemeIndex >= 0) {
             renderPages(); // Actions buttons have text/tooltip
        }
    }

    function loadBuiltinManifest() {
        const json = {
  "schema_version": "1.0",
  "updated_at": "2024-01-01T00:00:00Z",
  "assets": {
    "zip_url": "",
    "sha256": "",
    "files_base_url": "",
    "files": {}
  },
  "groups": [
    {
      "group_key": "mascot",
      "group_kind": "builtin_extend",
      "type": "PAGE",
      "title": { "en": "Mascot", "zh": "吉祥物" },
      "items": [
        { "id": "16_waving", "title": {"en": "Waving"}, "files": {"portrait": "coloring/mascot/16_waving.png"} },
        { "id": "17_surfing_net", "title": {"en": "Surfing"}, "files": {"portrait": "coloring/mascot/17_surfing_net.png"} },
        { "id": "18_okapi", "title": {"en": "Okapi"}, "files": {"portrait": "coloring/mascot/18_okapi.png"} },
        { "id": "19_reading_half", "title": {"en": "Reading"}, "files": {"portrait": "coloring/mascot/19_reading_half.png"} },
        { "id": "20_reading_side", "title": {"en": "Reading (Side)"}, "files": {"portrait": "coloring/mascot/20_reading_side.png"} }
      ]
    },
    {
      "group_key": "princess",
      "group_kind": "builtin_extend",
      "type": "PAGE",
      "title": { "en": "Princess", "zh": "公主系列" },
      "items": [
        { "id": "10_elephant", "title": {"en": "Elephant"}, "files": {"portrait": "coloring/princess/10_elephant.png"} },
        { "id": "11_unicorn", "title": {"en": "Unicorn"}, "files": {"portrait": "coloring/princess/11_unicorn.png"} },
        { "id": "12_fairy", "title": {"en": "Fairy"}, "files": {"portrait": "coloring/princess/12_fairy.png"} },
        { "id": "13_princess", "title": {"en": "Princess 1"}, "files": {"portrait": "coloring/princess/13_princess.png"} },
        { "id": "14_princess", "title": {"en": "Princess 2"}, "files": {"portrait": "coloring/princess/14_princess.png"} },
        { "id": "15_princess", "title": {"en": "Princess 3"}, "files": {"portrait": "coloring/princess/15_princess.png"} }
      ]
    },
    {
      "group_key": "animals",
      "group_kind": "builtin_extend",
      "type": "PAGE",
      "title": { "en": "Animals", "zh": "可愛動物" },
      "items": [
        { "id": "03_dog", "title": {"en": "Dog"}, "files": {"portrait": "coloring/animals/03_dog.png"} },
        { "id": "05_mouse", "title": {"en": "Mouse"}, "files": {"portrait": "coloring/animals/05_mouse.png"} },
        { "id": "06_deer", "title": {"en": "Deer"}, "files": {"portrait": "coloring/animals/06_deer.png"} },
        { "id": "07_hedgehog", "title": {"en": "Hedgehog"}, "files": {"portrait": "coloring/animals/07_hedgehog.png"} },
        { "id": "08_monkey", "title": {"en": "Monkey"}, "files": {"portrait": "coloring/animals/08_monkey.png"} },
        { "id": "09_wolf", "title": {"en": "Wolf"}, "files": {"portrait": "coloring/animals/09_wolf.png"} }
      ]
    },
    {
      "group_key": "bookfair",
      "group_kind": "builtin_extend",
      "type": "PAGE",
      "title": { "en": "Bookfair", "zh": "國際書展" },
      "items": [
        { "id": "21_ufo", "title": {"en": "UFO"}, "files": {"portrait": "coloring/bookfair/21_ufo.png"} },
        { "id": "22_astronaut", "title": {"en": "Astronaut"}, "files": {"portrait": "coloring/bookfair/22_astronaut.png"} },
        { "id": "23_camping", "title": {"en": "Camping"}, "files": {"portrait": "coloring/bookfair/23_camping.png"} },
        { "id": "24_capybara", "title": {"en": "Capybara"}, "files": {"portrait": "coloring/bookfair/24_capybara.png"} },
        { "id": "25_nemo", "title": {"en": "Nemo"}, "files": {"portrait": "coloring/bookfair/25_nemo.png"} },
        { "id": "26_underwater_world", "title": {"en": "Underwater"}, "files": {"portrait": "coloring/bookfair/26_underwater_world.png"} }
      ]
    }
  ]
};
        state.builtinManifest = json;
        if (json.groups) {
             json.groups.forEach(g => state.builtinGroups.set(g.group_key, g));
        }
        console.log('Loaded builtin manifest (Inline):', state.builtinGroups.keys());
    }

    function bindEvents() {
        // Sidebar
        dom.btnNewTheme.addEventListener('click', createNewTheme);
        dom.btnLang.addEventListener('click', () => {
             setLanguage(state.lang === 'zh' ? 'en' : 'zh');
        });

        // Image Import
        dom.dropZone.addEventListener('click', () => dom.fileAddPages.click());
        dom.fileAddPages.addEventListener('change', (e) => addPagesFromFiles(e.target.files));
        setupDropZone(dom.dropZone, (files) => addPagesFromFiles(files));

        // Editor Binding
        dom.titleEn.addEventListener('input', (e) => updateActiveTheme('titleEn', e.target.value));
        dom.titleZh.addEventListener('input', (e) => updateActiveTheme('titleZh', e.target.value));

        // Key Change -> Trigger Sync
        dom.key.addEventListener('input', (e) => {
             updateActiveTheme('key', e.target.value);
             syncBuiltinItems();
        });
        dom.key.addEventListener('change', () => syncBuiltinItems()); // Ensure final sync

        dom.kind.addEventListener('change', (e) => {
            const val = e.target.value;
            // Clear pages and key if switching to Custom
            if (val === 'dynamic_new') {
                const theme = state.themes[state.activeThemeIndex];
                if (theme) {
                     theme.key = '';
                     theme.items = [];
                     theme.title = { en: '', zh: '' };
                     
                     // Also clear inputs
                     dom.key.value = '';
                     dom.titleEn.value = '';
                     dom.titleZh.value = '';

                     renderPages();
                     renderThemeList(); // Force sidebar text update
                }
            }
            updateActiveTheme('kind', val);
            updateSuggestionsVisibility();
            updateSuggestionsState(); // Refresh chip states
            syncBuiltinItems();
        });

        // Suggestions
        dom.suggestions.querySelectorAll('.chip').forEach(btn => {
            btn.addEventListener('click', () => {
                // If disabled, ignore (though pointer-events:none handles it CSS-wise, good to be safe)
                if (btn.classList.contains('disabled')) return;

                dom.key.value = btn.dataset.val;
                updateActiveTheme('key', btn.dataset.val);
                syncBuiltinItems(); // Trigger sync
            });
        });

        // Delete - Removed from header
        // dom.btnDelete.addEventListener('click', deleteActiveTheme);

        // Global
        dom.btnExport.addEventListener('click', exportProject);
        dom.btnImport.addEventListener('click', () => dom.fileImport.click());
        dom.fileImport.addEventListener('change', importProject);
        dom.btnCloseOverlay.addEventListener('click', () => dom.overlay.classList.add('hidden'));

        // Manual Asset Loader
        dom.btnLoadAssets.addEventListener('click', () => dom.fileLoadAssets.click());
        dom.fileLoadAssets.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            let count = 0;
            for (let i=0; i<files.length; i++) {
                const file = files[i];
                // Store full path if available (webkitRelativePath)
                const p = file.webkitRelativePath || file.name;
                state.fileCache.set(p, file);

                // Also store by simple name for fallback
                state.fileCache.set(file.name, file);

                // Normalize "assets/coloring/..." to just "coloring/..."
                if (p.includes('assets/')) {
                     const sub = p.substring(p.indexOf('assets/') + 7); // remove "assets/"
                     if (sub) state.fileCache.set(sub, file);
                }
                count++;
            }
            showStatus(t('cached_files', count), true);
            dom.btnLoadAssets.classList.add('success');
            setTimeout(() => dom.overlay.classList.add('hidden'), 2000);
        });

        // Test if fetch works, if not show button
        testFetch();
    }

    async function testFetch() {
        // Try to fetch a known asset
        try {
            // Pick first asset from builtin manifest if available, or just a dummy
            // We know 'assets/coloring/mascot/16_waving.png' exists in default
            const res = await fetch('assets/coloring/mascot/16_waving.png');
            if (!res.ok) throw new Error('Fetch failed');
        } catch(e) {
            console.warn('Backend fetch failed, showing manual loader', e);
            dom.btnLoadAssets.classList.remove('hidden');
        }
    }

    // --- Logic: Themes ---

    function createNewTheme() {
        const newTheme = {
            kind: 'builtin_extend', // default
            key: '',
            title: { en: '', zh: '' },
            visibility: 'VISIBLE', // default visible
            items: [] // Pages
        };
        state.themes.push(newTheme);
        state.activeThemeIndex = state.themes.length - 1;
        renderThemeList();
        updateEditorState();
    }

    function updateActiveTheme(field, value) {
        const theme = state.themes[state.activeThemeIndex];
        if (!theme) return;

        if (field === 'titleEn') theme.title.en = value;
        if (field === 'titleZh') theme.title.zh = value;
        if (field === 'key') theme.key = value;
        if (field === 'kind') theme.kind = value;

        // Debounce list re-render for titles
        if (field.startsWith('title') || field === 'visible') {
             renderThemeList(); // Refresh sidebar titles/styles
        }
        
        if (field === 'key') {
            updateSuggestionsState();
        }
    }

    // Merge builtin items if key matches key in builtin manifest
    function syncBuiltinItems() {
        const theme = state.themes[state.activeThemeIndex];
        if (!theme || theme.kind !== 'builtin_extend') return;

        const bGroup = state.builtinGroups.get(theme.key);
        // If not a known builtin, we should probably clear any phantom items to be safe?
        // But maybe user typed a key that doesn't exist yet but will?
        // Let's assume if invalid key, we clear existing builtins.

        let changed = false;

        // 1. Remove obsoleted builtins (those not in the current group)
        const validIds = bGroup ? new Set(bGroup.items.map(i => i.id)) : new Set();

        // Filter in place
        const newItems = [];
        for (const item of theme.items) {
             if (item._isBuiltin) {
                 if (validIds.has(item.id)) {
                     newItems.push(item);
                 } else {
                     changed = true; // Dropping a stale builtin
                 }
             } else {
                 newItems.push(item);
             }
        }
        theme.items = newItems;

        if (!bGroup) {
            if (changed) {
                renderPages();
                renderThemeList();
            }
            return;
        }

        // 2. Add missing builtins
        bGroup.items.forEach(bi => {
            const exists = theme.items.find(it => it.id === bi.id);
            if (!exists) {
                theme.items.push({
                    id: bi.id,
                    title: { en: bi.title.en, zh: bi.title.zh || '' },
                    visibility: 'VISIBLE',
                    _isBuiltin: true,
                    file: { url: 'assets/' + bi.files.portrait, name: basename(bi.files.portrait) }
                });
                changed = true;
            } else {
                if (!exists._isBuiltin) exists._isBuiltin = true;
            }
        });

        if (changed) {
            renderPages(); // Re-render grid
            renderThemeList(); // Update count
        }
    }

    function deleteActiveTheme() {
        // Obsolete, keeping for compatibility if needed, but UI button removed
        if (state.activeThemeIndex < 0) return;
        deleteTheme(state.activeThemeIndex);
    }

    function deleteTheme(idx) {
        if (!confirm(t('confirm_delete'))) return;
        state.themes.splice(idx, 1);
        
        // Adjust active index
        if (state.activeThemeIndex === idx) {
            state.activeThemeIndex = -1;
        } else if (state.activeThemeIndex > idx) {
            state.activeThemeIndex--;
        }

        renderThemeList();
        updateEditorState();
    }

    function toggleThemeVisibility(idx) {
        const theme = state.themes[idx];
        if (!theme) return;
        theme.visibility = (theme.visibility === 'HIDDEN') ? 'VISIBLE' : 'HIDDEN';
        renderThemeList();
        if (state.activeThemeIndex === idx) {
            updateEditorState(); // Update main view if active
        }
    }

    // --- Rendering ---

    function renderThemeList() {
        dom.themeList.innerHTML = '';
        state.themes.forEach((theme, idx) => {
            const el = document.createElement('div');
            el.className = `theme-item ${idx === state.activeThemeIndex ? 'active' : ''} ${theme.visibility === 'HIDDEN' ? 'hidden-theme' : ''}`;

            const title = theme.title[state.lang] || theme.title.en || theme.title.zh || (theme.key ? theme.key : t('untitled_theme'));
            const sub = theme.kind === 'builtin_extend' ? t('extend') : t('custom');

            // Icons
            const visIcon = theme.visibility === 'HIDDEN' ? 'visibility_off' : 'visibility';
            
            el.innerHTML = `
                <div style="flex:1">
                    <div class="t-title">${escapeHtml(title)}</div>
                    <div class="t-sub">
                        <span>${sub}</span>
                        <span>${theme.items.length} ${t('pages_count')}</span>
                    </div>
                </div>
                <div class="theme-actions">
                    <button class="theme-btn btn-vis" title="${t('visible')}"><span class="material-symbols-outlined" style="font-size:18px">${visIcon}</span></button>
                    <button class="theme-btn btn-del danger" title="${t('delete')}"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button>
                </div>
            `;
            
            // Item Click (Selection)
            el.addEventListener('click', (e) => {
                // Ignore if clicked on actions
                if (e.target.closest('.theme-actions')) return;
                state.activeThemeIndex = idx;
                renderThemeList();
                updateEditorState();
            });

            // Action Buttons
            const btnVis = el.querySelector('.btn-vis');
            const btnDel = el.querySelector('.btn-del');

            btnVis.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleThemeVisibility(idx);
            });

            btnDel.addEventListener('click', (e) => {
                 e.stopPropagation();
                 deleteTheme(idx);
            });

            dom.themeList.appendChild(el);
        });
    }

    function updateEditorState() {
        const active = state.activeThemeIndex >= 0;
        dom.welcomeScreen.classList.toggle('hidden', active);
        dom.editorContent.classList.toggle('hidden', !active);

        if (active) {
            const theme = state.themes[state.activeThemeIndex];
            // Populate inputs
            dom.titleEn.value = theme.title.en || '';
            dom.titleZh.value = theme.title.zh || '';
            // Visibility control moved to sidebar, so this is obsolete
            // if (dom.visibility) {
            //    dom.visibility.checked = (theme.visibility !== 'HIDDEN');
            //    const icon = dom.visibility.nextElementSibling;
            //    if (icon && icon.classList.contains('toggle-icon')) {
            //         icon.textContent = (theme.visibility !== 'HIDDEN') ? 'visibility' : 'visibility_off';
            //    }
            // }

            dom.key.value = theme.key || '';
            dom.kind.value = theme.kind || 'builtin_extend';

            updateSuggestionsVisibility();
            renderPages();
        }
    }

    function updateSuggestionsVisibility() {
        const isExtend = dom.kind.value === 'builtin_extend';
        dom.suggestions.style.display = isExtend ? 'flex' : 'none';
        
        // Lock ID input if Extend Builtin
        if (isExtend) {
            dom.key.setAttribute('readonly', 'true');
            dom.key.style.opacity = '0.6';
            dom.key.style.cursor = 'not-allowed';
            updateSuggestionsState(); // Ensure states are correct
        } else {
            dom.key.removeAttribute('readonly');
            dom.key.style.opacity = '1';
            dom.key.style.cursor = 'text';
        }
    }
    
    function updateSuggestionsState() {
        if (dom.kind.value !== 'builtin_extend' || state.activeThemeIndex < 0) return;

        const currentTheme = state.themes[state.activeThemeIndex];
        const currentKey = currentTheme.key;
        
        // Find used keys by OTHER themes
        const usedKeys = new Set();
        state.themes.forEach((t, idx) => {
            if (idx !== state.activeThemeIndex && t.kind === 'builtin_extend' && t.key) {
                usedKeys.add(t.key);
            }
        });

        dom.suggestions.querySelectorAll('.chip').forEach(btn => {
            const val = btn.dataset.val;
            
            // 1. Check Used
            const isUsed = usedKeys.has(val);
            if (isUsed) {
                btn.classList.add('disabled');
                btn.classList.remove('active');
            } else {
                btn.classList.remove('disabled');
                // 2. Check Active
                if (val === currentKey) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }

    function renderPages() {
        const theme = state.themes[state.activeThemeIndex];
        if (!theme) return;

        dom.pageCount.textContent = theme.items.length;

        // Reset grid (keeping reference to dom.pagesGrid)
        dom.pagesGrid.innerHTML = '';

        theme.items.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'page-card';
            if (item.visibility === 'HIDDEN') card.style.opacity = '0.6';
            card.draggable = true;

            // Drag Sorting
            card.addEventListener('dragstart', e => {
                 e.dataTransfer.effectAllowed = 'move';
                 e.dataTransfer.setData('text/plain', idx);
                 card.classList.add('dragging');
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
            card.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            card.addEventListener('drop', e => {
                e.preventDefault();
                const fromIdxStr = e.dataTransfer.getData('text/plain');
                if (!fromIdxStr) return; // files drop?
                const fromIdx = parseInt(fromIdxStr);

                if (fromIdx !== idx && fromIdx >= 0 && fromIdx < theme.items.length) {
                    const movedItem = theme.items.splice(fromIdx, 1)[0];
                    theme.items.splice(idx, 0, movedItem);
                    renderPages(); // Re-render to update order
                }
            });

            // Image Preview
            let imgSrc = '';
            // If item has a Blob/File
            if (item.file) {
                 if (item.file.url) imgSrc = item.file.url; // Builtin URL
                 else if (item.file instanceof File || item.file instanceof Blob) {
                     imgSrc = URL.createObjectURL(item.file);
                 } else if (item.file.data) {
                     // From import (bytes)
                     const blob = new Blob([item.file.data], {type: 'image/png'});
                     imgSrc = URL.createObjectURL(blob);
                     item.file = blob; // Upgrade to blob
                 }
            }

            // Action Button
            const deleteTitle = item._isBuiltin ? (item.visibility === 'HIDDEN' ? t('show') : t('hide')) : t('remove');
            const deleteIconCode = item._isBuiltin ? (item.visibility === 'HIDDEN' ? 'visibility_off' : 'visibility') : 'delete';

            // Badge for builtin
            const badge = item._isBuiltin ? '<span style="position:absolute;top:6px;left:6px;background:rgba(255,255,255,0.9);padding:2px 6px;font-size:10px;border-radius:10px;box-shadow:0 1px 2px rgba(0,0,0,0.1);">' + t('builtin', 'Builtin') + '</span>' : '';

            card.innerHTML = `
                <div class="card-img-container">
                    ${badge}
                    <img src="${imgSrc}" class="card-img" draggable="false" />
                    <div class="card-actions" style="opacity:1">
                        <button class="btn-mini btn-del" title="${deleteTitle}"><span class="material-symbols-outlined">${deleteIconCode}</span></button>
                    </div>
                </div>
                <div class="card-form">
                    <input type="text" class="card-input zh" placeholder="${t('theme_name_zh')}" value="${escapeHtml(item.title.zh||'')}" />
                    <input type="text" class="card-input en" placeholder="${t('theme_name_en')}" value="${escapeHtml(item.title.en||'')}" />
                    ${ item._isBuiltin ? `<div style="font-size:10px;color:gray;text-align:right">${item.id}</div>` : '' }
                </div>
            `;

            // Bind inputs
            const inputs = card.querySelectorAll('input');
            inputs[0].addEventListener('input', e => item.title.zh = e.target.value);
            inputs[1].addEventListener('input', e => item.title.en = e.target.value);

            // Delete / Hide Logic
            card.querySelector('.btn-del').addEventListener('click', (e) => {
                e.stopPropagation();
                if (item._isBuiltin) {
                    // Toggle visibility
                    item.visibility = (item.visibility === 'HIDDEN') ? 'VISIBLE' : 'HIDDEN';
                    renderPages();
                } else {
                    theme.items.splice(idx, 1);
                    renderPages();
                    renderThemeList();
                }
            });

            dom.pagesGrid.appendChild(card);
        });

        // Append Drop Zone at the end
        dom.pagesGrid.appendChild(dom.dropZone);
    }

    // --- Logic: Asset Handling ---

    async function addPagesFromFiles(fileList) {
        if (!fileList || fileList.length === 0) return;
        const theme = state.themes[state.activeThemeIndex];
        if (!theme) return;

        for (const file of fileList) {
            // Check type?
            const item = {
                id: '',
                title: { en: sanitizeFilename(file.name), zh: '' },
                visibility: 'VISIBLE',
                file: file
            };
            theme.items.push(item);
        }
        renderThemeList(); // update count
        renderPages();
        dom.fileAddPages.value = '';
    }

    // --- Export Logic ---
    async function exportProject() {
        showStatus(t('generating_package'), false);
        dom.exportActions.classList.add('hidden');

        try {
            // Need a bit of time for UI to update
            await new Promise(r => setTimeout(r, 100));

            const zwSource = new ZipWriter();
            const zwOta = new ZipWriter();
            const projectJson = {
                project_version: '2.0',
                schema_version: '2.0',
                updated_at: new Date().toISOString(),
                groups: []
            };

            const manifest = {
                schema_version: '2.0',
                updated_at: new Date().toISOString(),
                assets: {
                    zip_url: 'https://ota.mobiscribe.com/eNote/templates_update/templates-current.zip',
                    files_base_url: 'https://ota.mobiscribe.com/eNote/templates_update/',
                    files: {},
                    sha256: ''
                },
                groups: []
            };

            for (const theme of state.themes) {
                // Project JSON Group
                const pGroup = {
                    group_key: theme.key || 'unknown',
                    group_kind: theme.kind,
                    type: 'PAGE',
                    visibility: theme.visibility,
                    title: { zh_TW: theme.title.zh, en_US: theme.title.en },
                    items: []
                };

                // Manifest Group
                const mGroup = {
                    group_key: theme.key,
                    group_kind: theme.kind,
                    type: 'PAGE',
                    visibility: theme.visibility,
                    title: { zh_TW: theme.title.zh, en_US: theme.title.en },
                    items: []
                };

                const base = `coloring/${theme.key || 'unknown'}`;

                for (const item of theme.items) {
                    if (!item.file) continue;

                    let fileBytes = null;
                    let fileName = 'image.png';

                    if (item.file instanceof File) {
                        fileBytes = new Uint8Array(await item.file.arrayBuffer());
                        fileName = item.file.name;
                    } else if (item.file instanceof Blob) {
                         fileBytes = new Uint8Array(await item.file.arrayBuffer());
                         // Blob might not have name, use generated
                    } else if (item.file instanceof Uint8Array) {
                         fileBytes = item.file;
                    } else if (item.file.data) {
                        fileBytes = item.file.data;
                        fileName = item.file.name || 'image.png';
                    } else if (item.file.url) {
                        // Built-in asset? Fetch it.
                        // Try Cache first (Drag and drop)
                        // item.file.url is like "assets/coloring/mascot/16_waving.png"
                        let file = state.fileCache ? (state.fileCache.get(item.file.url) || state.fileCache.get(basename(item.file.url))) : null;

                        if (file) {
                             // Found in cache!
                             fileBytes = new Uint8Array(await file.arrayBuffer());
                             fileName = item.file.name || file.name;
                        } else {
                            // Try fetch (will fail on file:// usually)
                            try {
                                const res = await fetch(item.file.url);
                                if (res.ok) {
                                    const blob = await res.blob();
                                    fileBytes = new Uint8Array(await blob.arrayBuffer());
                                    fileName = item.file.name || basename(item.file.url);
                                } else {
                                    console.warn('Failed to fetch builtin asset', item.file.url);
                                }
                            } catch(e) {
                                console.warn('Error fetching builtin asset', e);
                            }
                        }
                    }

                    if (!fileBytes) {
                        console.warn('Missing bytes for', item.id);
                        // If we are exporting and missing bytes, user needs to drop assets.
                        // We should probably count this as error?
                        // But let's verify if we can proceed without it? No, manifest needs it.
                        continue;
                    }

                    // Hash
                    const md5 = md5Hex(fileBytes);
                    const sha = await sha256Hex(fileBytes);

                    let relPath, projectPath, finalName;
                    let isOptimizedBuiltin = false;

                    if (item._isBuiltin) {
                         // Try to determine the original built-in path
                         let builtinUrl = item.file.url;

                         // Fallback for Imported projects (missing url): Look up in manifest
                         if (!builtinUrl) {
                              const bGroup = state.builtinGroups.get(theme.key);
                              const bi = bGroup ? bGroup.items.find(i => i.id === item.id) : null;
                              if (bi && bi.files && bi.files.portrait) {
                                   builtinUrl = 'assets/' + bi.files.portrait;
                              }
                         }

                         if (builtinUrl) {
                              // Ensure clean relative path (no assets/ prefix)
                              relPath = builtinUrl.startsWith('assets/') ? builtinUrl.substring(7) : builtinUrl;
                              projectPath = builtinUrl.startsWith('assets/') ? builtinUrl : `assets/${builtinUrl}`;
                              isOptimizedBuiltin = true;
                         }
                    }

                    if (isOptimizedBuiltin) {
                         // Add to SOURCE ZIP (self contained)
                         zwSource.addFile(projectPath, fileBytes);

                         // SKIP ADDING TO OTA ZIP (App will restore from APK)
                    } else {
                         // NEW / CUSTOM FILE
                         const safeName = fileName.replace(/[^a-z0-9\._-]/gi, '-').toLowerCase();
                         finalName = `${md5.substring(0,8)}-${safeName}`;
                         relPath = `${base}/${finalName}`;
                         projectPath = `assets/${relPath}`;

                         // Add to BOTH ZIPs
                         zwSource.addFile(projectPath, fileBytes);
                         zwOta.addFile(projectPath, fileBytes);
                    }

                    // ID Generation (if empty)
                    let id = item.id;
                    if (!id) {
                         // Generate 10 char ID from hash
                         const rawId = await sha256Hex(new TextEncoder().encode((theme.key||'')+md5));
                         id = rawId.substring(0, 10);
                    }

                    // Add to Project JSON
                    pGroup.items.push({
                        id: id,
                        title: { zh_TW: item.title.zh, en_US: item.title.en },
                        visibility: item.visibility,
                        files: { portrait: projectPath }
                    });

                    // Add to Manifest
                    mGroup.items.push({
                        id: id,
                        title: { zh_TW: item.title.zh, en_US: item.title.en },
                        visibility: item.visibility,
                        files: { portrait: relPath }
                    });

                    // Add to Manifest Assets (Files list)
                    manifest.assets.files[relPath] = {
                        sha256: sha,
                        size: fileBytes.length
                    };
                }

                projectJson.groups.push(pGroup);
                // Include in manifest if it has items OR if it is masking a builtin (HIDDEN)
                // For Builtin Extend, we MUST output the group if we want to override order.
                // Our logic is: if items.length > 0, we output.
                if (theme.visibility === 'HIDDEN' || mGroup.items.length > 0) {
                     manifest.groups.push(mGroup);
                }
            }

            // --- Finish Source ZIP ---
            zwSource.addFile('project.json', new TextEncoder().encode(JSON.stringify(projectJson, null, 2)));
            const blobSource = zwSource.finish();
            dom.dlZip.href = URL.createObjectURL(blobSource);
            dom.dlZip.download = `project-source-${new Date().toISOString().slice(0,10)}.zip`;
            dom.dlZip.classList.remove('disabled');

            // --- Finish OTA ZIP ---
            zwOta.addFile('templates-manifest.json', new TextEncoder().encode(JSON.stringify(manifest, null, 2)));
            const blobOta = zwOta.finish();

            const btnOta = document.getElementById('dlOta');
            if (btnOta) {
                btnOta.href = URL.createObjectURL(blobOta);
                btnOta.download = `ota-release-${new Date().toISOString().slice(0,10)}.zip`;
                btnOta.classList.remove('disabled');
            }

            showStatus(t('export_ready'), true, true);

        } catch(e) {
            console.error(e);
            showStatus('Error: ' + e.message, false);
        }
    }

    // --- Import Logic ---
    async function importProject(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        showStatus(t('loading_project'), false);
        dom.overlay.classList.remove('hidden');
        dom.exportActions.classList.add('hidden');

        try {
            const zr = new ZipReader(await file.arrayBuffer());
            const entries = zr.read();

            let project = null;
            let isOta = false;

            if (entries.has('project.json')) {
                const pText = new TextDecoder().decode(entries.get('project.json'));
                project = JSON.parse(pText);
            } else if (entries.has('templates-manifest.json')) {
                const mText = new TextDecoder().decode(entries.get('templates-manifest.json'));
                project = JSON.parse(mText);
                isOta = true;
            } else {
                throw new Error('Invalid project file (missing project.json or templates-manifest.json)');
            }

            state.themes = [];

            for (const g of (project.groups || [])) {
                // Determine Title (Source vs OTA Manifest)
                // Manifest uses zh_TW/en_US, Source uses zh/en typically but let's handle both
                const tEn = g.title?.en || g.title?.en_US || '';
                const tZh = g.title?.zh || g.title?.zh_TW || '';

                const theme = {
                    kind: g.group_kind || 'builtin_extend',
                    key: g.group_key || '',
                    title: { en: tEn, zh: tZh },
                    visibility: g.visibility || 'VISIBLE',
                    items: []
                };

                // Look up local builtin group for fallback
                const bGroup = state.builtinGroups.get(theme.key);

                for (const it of (g.items || [])) {
                    const path = it.files?.portrait;
                    // In project.json, path is 'assets/coloring/...' due to export logic
                    
                    let fileObj = null;

                    // 1. Check ZIP first (Optimization: O(1) lookup)
                    // Manifest path might be "coloring/..." but zip has "assets/coloring/..."
                    let fileData = null;
                    if (path) {
                        if (entries.has(path)) {
                            fileData = entries.get(path);
                        } else if (entries.has('assets/' + path)) {
                            fileData = entries.get('assets/' + path);
                        }
                    }

                    if (fileData) {
                        fileObj = { data: fileData, name: basename(path) };
                    } 
                    // 2. OTA Fallback: Check Local Builtin Lib 
                    // 2. OTA Fallback: Check Local Builtin Lib
                    else if (isOta && it.id && bGroup) {
                         // Find matching ID (case sensitive? usually yes)
                         const bi = bGroup.items.find(i => i.id === it.id);
                         if (bi && bi.files && bi.files.portrait) {
                             // RESTORED! Link to local asset
                             fileObj = { 
                                 url: 'assets/' + bi.files.portrait, 
                                 name: basename(bi.files.portrait) 
                             };
                         } else {
                             // ID NOT FOUND -> SKIP (User Policy)
                             console.warn('OTA Import: Local builtin not found, skipping', it.id);
                             continue; 
                         }
                    }
                    
                    // If still no file, do we skip? 
                    // Custom items with missing files will be skipped here unless we allow empty files.
                    // Current logic: skipped if no fileObj
                    if (!fileObj) {
                         continue;
                    }

                    const itEn = it.title?.en || it.title?.en_US || '';
                    const itZh = it.title?.zh || it.title?.zh_TW || '';

                    theme.items.push({
                        id: it.id || '',
                        title: { en: itEn, zh: itZh },
                        visibility: it.visibility || 'VISIBLE',
                        file: fileObj,
                        _isBuiltin: !!fileObj.url // Mark as builtin if we used URL
                    });
                }
                state.themes.push(theme);
            }

            state.activeThemeIndex = state.themes.length > 0 ? 0 : -1;
            renderThemeList();
            updateEditorState();

            setTimeout(() => {
                dom.overlay.classList.add('hidden');
            }, 500);

        } catch(e) {
            console.error(e);
            showStatus(t('import_failed') + ': ' + e.message, false);
            dom.exportActions.classList.remove('hidden'); // Show actions so user can close
        }
        dom.fileImport.value = '';
    }

    // --- Helpers ---
    function showStatus(msg, done, showActions = false) {
        dom.overlay.classList.remove('hidden');
        dom.statusTitle.textContent = done ? t('done') : t('processing');
        dom.statusMsg.textContent = msg;
        dom.exportActions.classList.toggle('hidden', !showActions);
    }

    function sanitizeFilename(name) {
        return name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9 ]/g, " ");
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function basename(path) {
        return path ? path.split('/').pop() : '';
    }


    // ... (rest of init/dom/bindEvents same) ...

    // Update Drop Zone to handle folders
    function setupDropZone(el, callback) {
        el.addEventListener('dragover', e => {
            e.preventDefault();
            el.classList.add('drop-zone-active');
        });
        el.addEventListener('dragleave', () => el.classList.remove('drop-zone-active'));
        el.addEventListener('drop', async e => {
            e.preventDefault();
            el.classList.remove('drop-zone-active');

            const items = e.dataTransfer.items;
            if (!items) return;

            const files = [];

            // Modern Directory scanning
            const queue = [];
            for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
                if (entry) queue.push(entry);
                else if (items[i].kind === 'file') files.push(items[i].getAsFile());
            }

            // Process entries
            while (queue.length > 0) {
                const entry = queue.shift();
                if (entry.isFile) {
                    const file = await new Promise(resolve => entry.file(resolve));
                    // Store full path if possible, or just build valid map
                    // entry.fullPath is usually /assets/coloring/...
                    files.push(file);

                    // Cache it for export lookup
                    // Normalize path: remove leading /  => assets/coloring/...
                    const p = entry.fullPath.startsWith('/') ? entry.fullPath.substring(1) : entry.fullPath;
                    state.fileCache.set(p, file);
                    state.fileCache.set(file.name, file); // Fallback by name
                } else if (entry.isDirectory) {
                    const reader = entry.createReader();
                    const entries = await new Promise(resolve => {
                        reader.readEntries(resolve, err => resolve([]));
                    });
                    queue.push(...entries);
                }
            }

            // Heuristic: If we have > 0 files and they are mainly "assets" related?
            const hasAssetsColoring = Array.from(state.fileCache.keys()).some(k => k.includes('coloring/') || k.endsWith('.png'));

            // If we cached a bunch of assets, show toast
            if (hasAssetsColoring && files.length > 5 && !files.some(f => f.name === 'project.json')) {
                showStatus(`Cached ${files.length} asset files. Ready to Export.`, true);
                setTimeout(() => dom.overlay.classList.add('hidden'), 2500);
            } else {
                if (files.length > 0) callback(files);
            }
        });
    }

    // --- Libs: ZipReader, ZipWriter, MD5 ---

    class ZipWriter {
        constructor(){ this.files = []; }
        addFile(path, bytes) {
            const utf8 = new TextEncoder();
            const nameBytes = utf8.encode(path);
            const crc = crc32(bytes);
            const localHeader = new Uint8Array(30 + nameBytes.length);
            const dv = new DataView(localHeader.buffer);
            let o = 0;
            dv.setUint32(o, 0x04034b50, true); o += 4;
            dv.setUint16(o, 20, true); o += 2;
            dv.setUint16(o, 0, true); o += 2;
            dv.setUint16(o, 0, true); o += 2;
            dv.setUint16(o, 0, true); o += 2;
            dv.setUint16(o, 0, true); o += 2;
            dv.setUint32(o, crc >>> 0, true); o += 4;
            dv.setUint32(o, bytes.length, true); o += 4;
            dv.setUint32(o, bytes.length, true); o += 4;
            dv.setUint16(o, nameBytes.length, true); o += 2;
            dv.setUint16(o, 0, true); o += 2;
            localHeader.set(nameBytes, o);
            const offset = this._size();
            this.files.push({ path, nameBytes, bytes, crc, offset, localHeader });
        }
        _size(){ return this.files.reduce((n,f)=> n + f.localHeader.length + f.bytes.length, 0); }
        finish(){
            let sizeLocal = this._size();
            const cds = [];
            for (const f of this.files) {
                const cd = new Uint8Array(46 + f.nameBytes.length);
                const dv = new DataView(cd.buffer);
                let o=0;
                dv.setUint32(o, 0x02014b50, true); o+=4;
                dv.setUint16(o, 20, true); o+=2;
                dv.setUint16(o, 20, true); o+=2;
                dv.setUint16(o, 0, true); o+=2;
                dv.setUint16(o, 0, true); o+=2;
                dv.setUint16(o, 0, true); o+=2;
                dv.setUint16(o, 0, true); o+=2;
                dv.setUint32(o, f.crc >>> 0, true); o+=4;
                dv.setUint32(o, f.bytes.length, true); o+=4;
                dv.setUint32(o, f.bytes.length, true); o+=4;
                dv.setUint16(o, f.nameBytes.length, true); o+=2;
                dv.setUint16(o, 0, true); o+=2;
                dv.setUint16(o, 0, true); o+=2;
                dv.setUint16(o, 0, true); o+=2;
                dv.setUint16(o, 0, true); o+=2;
                dv.setUint32(o, 0, true); o+=4;
                dv.setUint32(o, f.offset, true); o+=4;
                cd.set(f.nameBytes, o);
                cds.push(cd);
            }
            const cdSize = cds.reduce((n,cd)=>n+cd.length,0);
            const cdOffset = sizeLocal;
            const eocd = new Uint8Array(22);
            const dv = new DataView(eocd.buffer);
            let o=0;
            dv.setUint32(o, 0x06054b50, true); o+=4;
            dv.setUint16(o, 0, true); o+=2;
            dv.setUint16(o, 0, true); o+=2;
            dv.setUint16(o, this.files.length, true); o+=2;
            dv.setUint16(o, this.files.length, true); o+=2;
            dv.setUint32(o, cdSize, true); o+=4;
            dv.setUint32(o, cdOffset, true); o+=4;
            dv.setUint16(o, 0, true); o+=2;

            const parts = [];
            for (const f of this.files) { parts.push(f.localHeader, f.bytes); }
            parts.push(...cds, eocd);
            const total = parts.reduce((n,a)=> n + a.length, 0);
            const out = new Uint8Array(total);
            let p=0; parts.forEach(a=>{ out.set(a,p); p+=a.length; });
            return new Blob([out], { type: 'application/zip' });
        }
    }

    class ZipReader {
        constructor(buf){ this.buf = new Uint8Array(buf); this.dv = new DataView(this.buf.buffer); }
        read(){
          const eocd = this._findEOCD();
          if (!eocd) throw new Error('ZIP EOCD not found');
          const cdSize = this.dv.getUint32(eocd+12, true);
          const cdOffset = this.dv.getUint32(eocd+16, true);
          let p = cdOffset;
          const out = new Map();
          while (p < cdOffset + cdSize) {
            if (this.dv.getUint32(p, true) !== 0x02014b50) break;
            const method = this.dv.getUint16(p+10, true);
            const compSize = this.dv.getUint32(p+20, true);
            const nameLen = this.dv.getUint16(p+28, true);
            const extraLen = this.dv.getUint16(p+30, true);
            const commentLen = this.dv.getUint16(p+32, true);
            const localOff = this.dv.getUint32(p+42, true);
            const name = new TextDecoder().decode(this.buf.subarray(p+46, p+46+nameLen));
            p += 46 + nameLen + extraLen + commentLen;
            if (method !== 0) continue; // Store only

            let lp = localOff;
            if (this.dv.getUint32(lp, true) !== 0x04034b50) continue;
            const lNameLen = this.dv.getUint16(lp+26, true);
            const lExtraLen = this.dv.getUint16(lp+28, true);
            const dataStart = lp + 30 + lNameLen + lExtraLen;
            const data = this.buf.subarray(dataStart, dataStart + compSize);
            out.set(name, new Uint8Array(data));
          }
          return out;
        }
        _findEOCD(){
          const sig = 0x06054b50;
          const max = Math.max(0, this.buf.length - 66000);
          for (let p=this.buf.length-22; p>=max; p--) {
            if (this.dv.getUint32(p, true) === sig) return p;
          }
          return null;
        }
    }

    function crc32(bytes){
        let c = ~0; for (let i=0;i<bytes.length;i++){ c = (c>>>8) ^ CRC_TABLE[(c ^ bytes[i]) & 0xFF]; }
        return ~c;
    }
    const CRC_TABLE = (()=>{
        const t = new Int32Array(256);
        for (let n=0; n<256; n++){
            let c=n; for(let k=0;k<8;k++){ c = (c & 1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1); }
            t[n]=c;
        }
        return t;
    })();

    async function sha256Hex(buffer) {
        const hash = await crypto.subtle.digest('SHA-256', buffer);
        const arr = Array.from(new Uint8Array(hash));
        return arr.map(b => b.toString(16).padStart(2,'0')).join('');
    }

    function md5Hex(input) {
        // Simple SparkMD5-like implementation (compact)
        function rotateLeft(lValue, iShiftBits) { return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits)); }
        function addUnsigned(lX,lY) {
            var lX4,lY4,lX8,lY8,lResult;
            lX8 = (lX & 0x80000000); lY8 = (lY & 0x80000000);
            lX4 = (lX & 0x40000000); lY4 = (lY & 0x40000000);
            lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
            if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
            if (lX4 | lY4) {
                if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            } else return (lResult ^ lX8 ^ lY8);
        }
        function F(x,y,z) { return (x & y) | ((~x) & z); }
        function G(x,y,z) { return (x & z) | (y & (~z)); }
        function H(x,y,z) { return (x ^ y ^ z); }
        function I(x,y,z) { return (y ^ (x | (~z))); }
        function FF(a,b,c,d,x,s,ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function GG(a,b,c,d,x,s,ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function HH(a,b,c,d,x,s,ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function II(a,b,c,d,x,s,ac) {
            a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
            return addUnsigned(rotateLeft(a, s), b);
        }
        function convertToWordArray(string) {
            var lWordCount;
            var lMessageLength = string.length;
            var lNumberOfWords_temp1=lMessageLength + 8;
            var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
            var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
            var lWordArray=Array(lNumberOfWords-1);
            var lBytePosition = 0;
            var lByteCount = 0;
            while ( lByteCount < lMessageLength ) {
                lWordCount = (lByteCount-(lByteCount % 4))/4;
                lBytePosition = (lByteCount % 4)*8;
                lWordArray[lWordCount] = (lWordArray[lWordCount] | (string[lByteCount]<<lBytePosition));
                lByteCount++;
            }
            lWordCount = (lByteCount-(lByteCount % 4))/4;
            lBytePosition = (lByteCount % 4)*8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
            lWordArray[lNumberOfWords-2] = lMessageLength<<3;
            lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
            return lWordArray;
        }
        // Patch for Uint8Array input
        function convertUint8ArrayToWordArray(u8) {
            var lMessageLength = u8.length;
            var lNumberOfWords_temp1 = lMessageLength + 8;
            var lNumberOfWords_temp2 = (lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
            var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
            var lWordArray=Array(lNumberOfWords-1);
            var lBytePosition = 0;
            var lByteCount = 0;
            while ( lByteCount < lMessageLength ) {
                var lWordCount = (lByteCount-(lByteCount % 4))/4;
                lBytePosition = (lByteCount % 4)*8;
                lWordArray[lWordCount] = (lWordArray[lWordCount] | (u8[lByteCount]<<lBytePosition));
                lByteCount++;
            }
            var lWordCount0 = (lByteCount-(lByteCount % 4))/4;
            var lBytePosition0 = (lByteCount % 4)*8;
            lWordArray[lWordCount0] = lWordArray[lWordCount0] | (0x80<<lBytePosition0);
            lWordArray[lNumberOfWords-2] = lMessageLength<<3;
            lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
            return lWordArray;
        }

        function wordToHex(lValue) {
            var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
            for (lCount = 0;lCount<=3;lCount++) {
                lByte = (lValue>>>(lCount*8)) & 255;
                WordToHexValue_temp = "0" + lByte.toString(16);
                WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
            }
            return WordToHexValue;
        }

        var x;
        if (input instanceof Uint8Array) x = convertUint8ArrayToWordArray(input);
        else x = convertToWordArray(typeof input === 'string' ? input : '');

        var k,AA,BB,CC,DD,a,b,c,d;
        var S11=7, S12=12, S13=17, S14=22;
        var S21=5, S22=9 , S23=14, S24=20;
        var S31=4, S32=11, S33=16, S34=23;
        var S41=6, S42=10, S43=15, S44=21;
        a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
        for (k=0;k<x.length;k+=16) {
            AA=a; BB=b; CC=c; DD=d;
            a=FF(a,b,c,d,x[k+0], S11,0xD76AA478); d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756); c=FF(c,d,a,b,x[k+2], S13,0x242070DB); b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
            a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF); d=FF(d,a,b,c,x[k+5], S12,0x4787C62A); c=FF(c,d,a,b,x[k+6], S13,0xA8304613); b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
            a=FF(a,b,c,d,x[k+8], S11,0x698098D8); d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF); c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1); b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
            a=FF(a,b,c,d,x[k+12],S11,0x6B901122); d=FF(d,a,b,c,x[k+13],S12,0xFD987193); c=FF(c,d,a,b,x[k+14],S13,0xA679438E); b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
            a=GG(a,b,c,d,x[k+1], S21,0xF61E2562); d=GG(d,a,b,c,x[k+6], S22,0xC040B340); c=GG(c,d,a,b,x[k+11],S23,0x265E5A51); b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
            a=GG(a,b,c,d,x[k+5], S21,0xD62F105D); d=GG(d,a,b,c,x[k+10],S22,0x02441453); c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681); b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
            a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6); d=GG(d,a,b,c,x[k+14],S22,0xC33707D6); c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87); b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
            a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905); d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8); c=GG(c,d,a,b,x[k+7], S23,0x676F02D9); b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
            a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942); d=HH(d,a,b,c,x[k+8], S32,0x8771F681); c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122); b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
            a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44); d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9); c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60); b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
            a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6); d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA); c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085); b=HH(b,c,d,a,x[k+6], S34,0x04881D05);
            a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039); d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5); c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8); b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
            a=II(a,b,c,d,x[k+0], S41,0xF4292244); d=II(d,a,b,c,x[k+7], S42,0x432AFF97); c=II(c,d,a,b,x[k+14],S43,0xAB9423A7); b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
            a=II(a,b,c,d,x[k+12],S41,0x655B59C3); d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92); c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D); b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
            a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F); d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0); c=II(c,d,a,b,x[k+6], S43,0xA3014314); b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
            a=II(a,b,c,d,x[k+4], S41,0xF7537E82); d=II(d,a,b,c,x[k+11],S42,0xBD3AF235); c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB); b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
            a=addUnsigned(a,AA); b=addUnsigned(b,BB); c=addUnsigned(c,CC); d=addUnsigned(d,DD);
        }
        return (wordToHex(a)+wordToHex(b)+wordToHex(c)+wordToHex(d)).toLowerCase();
    }

    init();

})();
