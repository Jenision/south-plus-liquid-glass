// ==UserScript==
// @name         South Plus Liquid Glass — 南+ Apple 液态玻璃重构
// @namespace    https://south-plus.net/liquid-glass
// @version      1.0.0
// @description  将南+ (South Plus / North Plus 等镜像站) 全面重构为符合 Apple Liquid Glass (macOS Tahoe 26 / iOS 26) 官方 HIG 分层规范的光学液态玻璃重构界面：顶层悬浮导航与弹层采用 Chromium backdrop-filter: url(#svg-filter) + Canvas SDF 位移贴图 + RGB 棱镜色散 + Schlick 菲涅尔高光，主体内容采用轻量化 Inset Grouped 分组卡片
// @author       Jenision
// @match        *://south-plus.net/*
// @match        *://*.south-plus.net/*
// @match        *://south-plus.org/*
// @match        *://*.south-plus.org/*
// @match        *://north-plus.net/*
// @match        *://*.north-plus.net/*
// @match        *://white-plus.net/*
// @match        *://*.white-plus.net/*
// @match        *://level-plus.net/*
// @match        *://*.level-plus.net/*
// @match        *://spring-plus.net/*
// @match        *://*.spring-plus.net/*
// @match        *://summer-plus.net/*
// @match        *://*.summer-plus.net/*
// @match        *://snow-plus.net/*
// @match        *://*.snow-plus.net/*
// @match        *://soul-plus.net/*
// @match        *://*.soul-plus.net/*
// @match        *://blue-plus.net/*
// @match        *://*.blue-plus.net/*
// @match        *://east-plus.net/*
// @match        *://*.east-plus.net/*
// @match        *://imoutolove.me/*
// @match        *://*.imoutolove.me/*
// @exclude      *://*/simple/*
// @exclude      *://*/rss.php*
// @exclude      *://*/pw_ajax.php*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const pageWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  /* ============================================================================
   * 1. PERSISTENT PREFERENCES & LIQUID GLASS THEME TOKENS
   * ========================================================================== */

  const STORAGE_KEY = 'sp_lg_prefs_v1';
  const FEEDS_CACHE_KEY = 'sp_lg_feeds_cache_v1';

  const DEFAULT_PREFS = {
    colorMode: 'auto', // 'auto' | 'light' | 'dark'
    accent: 'clear', // 'clear' | 'sapphire' | 'rose' | 'emerald' | 'amber'
    glassStyle: 'standard', // 'standard' | 'clear' | 'tinted'
    refractionStrength: 'standard', // 'subtle' | 'standard' | 'strong'
    sidebarOpen: true,
    cleanAds: true,
    density: 'comfortable', // 'comfortable' | 'compact'
    wallAspect: 'cover', // 'cover' | 'contain'
    fontSize: 'medium', // 'small' | 'medium' | 'large'
    wideMode: false,
    collapseNoticeByDefault: true,
    collapsePinnedByDefault: true,
    collapsedCategories: {},
    cachedForumTree: [],
    cachedUserProfile: null
  };

  const Store = {
    _cache: null,
    load() {
      if (this._cache) return this._cache;
      let parsed = {};
      try {
        if (typeof GM_getValue === 'function') {
          const raw = GM_getValue(STORAGE_KEY, '');
          if (raw) parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        }
      } catch (_) {}
      if (!parsed || Object.keys(parsed).length === 0) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) parsed = JSON.parse(raw);
        } catch (_) {}
      }
      this._cache = Object.assign({}, DEFAULT_PREFS, parsed || {});
      return this._cache;
    },
    get(key) {
      return this.load()[key];
    },
    set(key, val) {
      const data = this.load();
      data[key] = val;
      try {
        const serialized = JSON.stringify(data);
        if (typeof GM_setValue === 'function') {
          GM_setValue(STORAGE_KEY, serialized);
        }
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch (_) {}
      return val;
    }
  };

  const ACCENTS = {
    clear: {
      name: '清澈',
      swatch: '#007AFF',
      light: {
        '--lg-accent': '#007AFF',
        '--lg-accent-fg': '#FFFFFF',
        '--lg-accent-soft': 'rgba(0, 122, 255, 0.14)',
        '--lg-accent-ring': 'rgba(0, 122, 255, 0.34)',
        '--lg-orb-1': 'rgba(118, 198, 255, 0.56)',
        '--lg-orb-2': 'rgba(182, 168, 255, 0.42)',
        '--lg-orb-3': 'rgba(128, 232, 214, 0.38)',
        '--lg-canvas': '#EEF3FA'
      },
      dark: {
        '--lg-accent': '#0A84FF',
        '--lg-accent-fg': '#FFFFFF',
        '--lg-accent-soft': 'rgba(10, 132, 255, 0.22)',
        '--lg-accent-ring': 'rgba(10, 132, 255, 0.48)',
        '--lg-orb-1': 'rgba(18, 92, 196, 0.42)',
        '--lg-orb-2': 'rgba(84, 58, 168, 0.34)',
        '--lg-orb-3': 'rgba(24, 126, 136, 0.28)',
        '--lg-canvas': '#0B0D12'
      }
    },
    sapphire: {
      name: '深蓝',
      swatch: '#3B66F5',
      light: {
        '--lg-accent': '#2E5BFF',
        '--lg-accent-fg': '#FFFFFF',
        '--lg-accent-soft': 'rgba(46, 91, 255, 0.14)',
        '--lg-accent-ring': 'rgba(46, 91, 255, 0.34)',
        '--lg-orb-1': 'rgba(116, 152, 255, 0.54)',
        '--lg-orb-2': 'rgba(154, 210, 255, 0.46)',
        '--lg-orb-3': 'rgba(196, 178, 255, 0.36)',
        '--lg-canvas': '#EDF1FC'
      },
      dark: {
        '--lg-accent': '#5E8BFF',
        '--lg-accent-fg': '#06122E',
        '--lg-accent-soft': 'rgba(94, 139, 255, 0.22)',
        '--lg-accent-ring': 'rgba(94, 139, 255, 0.46)',
        '--lg-orb-1': 'rgba(32, 74, 196, 0.44)',
        '--lg-orb-2': 'rgba(42, 118, 184, 0.32)',
        '--lg-orb-3': 'rgba(86, 62, 184, 0.30)',
        '--lg-canvas': '#0A0D16'
      }
    },
    rose: {
      name: '樱雾',
      swatch: '#FF2D55',
      light: {
        '--lg-accent': '#E62E5C',
        '--lg-accent-fg': '#FFFFFF',
        '--lg-accent-soft': 'rgba(230, 46, 92, 0.13)',
        '--lg-accent-ring': 'rgba(230, 46, 92, 0.34)',
        '--lg-orb-1': 'rgba(255, 166, 196, 0.54)',
        '--lg-orb-2': 'rgba(255, 206, 178, 0.42)',
        '--lg-orb-3': 'rgba(206, 178, 255, 0.38)',
        '--lg-canvas': '#FAF1F4'
      },
      dark: {
        '--lg-accent': '#FF4F79',
        '--lg-accent-fg': '#FFFFFF',
        '--lg-accent-soft': 'rgba(255, 79, 121, 0.22)',
        '--lg-accent-ring': 'rgba(255, 79, 121, 0.45)',
        '--lg-orb-1': 'rgba(176, 36, 78, 0.42)',
        '--lg-orb-2': 'rgba(136, 52, 146, 0.32)',
        '--lg-orb-3': 'rgba(168, 86, 62, 0.26)',
        '--lg-canvas': '#130B0F'
      }
    },
    emerald: {
      name: '翡翠',
      swatch: '#28CD41',
      light: {
        '--lg-accent': '#179E4C',
        '--lg-accent-fg': '#FFFFFF',
        '--lg-accent-soft': 'rgba(23, 158, 76, 0.13)',
        '--lg-accent-ring': 'rgba(23, 158, 76, 0.32)',
        '--lg-orb-1': 'rgba(128, 232, 184, 0.52)',
        '--lg-orb-2': 'rgba(132, 214, 242, 0.44)',
        '--lg-orb-3': 'rgba(208, 242, 168, 0.36)',
        '--lg-canvas': '#EFF8F3'
      },
      dark: {
        '--lg-accent': '#32D74B',
        '--lg-accent-fg': '#04220B',
        '--lg-accent-soft': 'rgba(50, 215, 75, 0.20)',
        '--lg-accent-ring': 'rgba(50, 215, 75, 0.42)',
        '--lg-orb-1': 'rgba(20, 128, 76, 0.40)',
        '--lg-orb-2': 'rgba(22, 118, 148, 0.30)',
        '--lg-orb-3': 'rgba(72, 134, 48, 0.24)',
        '--lg-canvas': '#09120D'
      }
    },
    amber: {
      name: '暖金',
      swatch: '#FF9500',
      light: {
        '--lg-accent': '#D97706',
        '--lg-accent-fg': '#FFFFFF',
        '--lg-accent-soft': 'rgba(217, 119, 6, 0.14)',
        '--lg-accent-ring': 'rgba(217, 119, 6, 0.34)',
        '--lg-orb-1': 'rgba(255, 206, 132, 0.54)',
        '--lg-orb-2': 'rgba(255, 168, 148, 0.40)',
        '--lg-orb-3': 'rgba(186, 208, 255, 0.34)',
        '--lg-canvas': '#FAF5EE'
      },
      dark: {
        '--lg-accent': '#FF9F0A',
        '--lg-accent-fg': '#1F1100',
        '--lg-accent-soft': 'rgba(255, 159, 10, 0.21)',
        '--lg-accent-ring': 'rgba(255, 159, 10, 0.44)',
        '--lg-orb-1': 'rgba(176, 98, 16, 0.40)',
        '--lg-orb-2': 'rgba(154, 58, 52, 0.28)',
        '--lg-orb-3': 'rgba(66, 86, 158, 0.26)',
        '--lg-canvas': '#130F0A'
      }
    }
  };

  function resolveThemeMode() {
    const mode = Store.get('colorMode');
    if (mode === 'light' || mode === 'dark') return mode;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  let LiquidGlassOptics = null;

  function applyThemeTokens() {
    const root = document.documentElement;
    const accentKey = ACCENTS[Store.get('accent')] ? Store.get('accent') : 'clear';
    const glassStyle = ['standard', 'clear', 'tinted'].includes(Store.get('glassStyle')) ? Store.get('glassStyle') : 'standard';
    const refractionStrength = ['subtle', 'standard', 'strong'].includes(Store.get('refractionStrength')) ? Store.get('refractionStrength') : 'standard';
    const mode = resolveThemeMode();
    const tokens = ACCENTS[accentKey][mode];
    root.setAttribute('data-theme', mode);
    root.setAttribute('data-accent', accentKey);
    root.setAttribute('data-glass', glassStyle);
    root.setAttribute('data-refraction', refractionStrength);
    root.setAttribute('data-density', Store.get('density') || 'comfortable');
    root.setAttribute('data-fontsize', Store.get('fontSize') || 'medium');
    root.setAttribute('data-wide', Store.get('wideMode') ? 'true' : 'false');
    Object.keys(tokens).forEach((k) => {
      root.style.setProperty(k, tokens[k]);
    });
    if (LiquidGlassOptics && LiquidGlassOptics.initialized) {
      LiquidGlassOptics.onThemeOrConfigChange();
    }
  }

  /* ============================================================================
   * 2. SF SYMBOLS-STYLE STROKE ICON LIBRARY & LIQUID GLASS PRISM LOGO
   * ========================================================================== */

  const ICONS = {
    sidebar_left: '<rect x="3" y="4" width="18" height="16" rx="3"/><line x1="9" y1="4" x2="9" y2="20"/>',
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1h4v-5.5h3V21h4a1 1 0 0 0 1-1V9.5"/>',
    forum: '<path d="M21 12a8.5 8.5 0 0 1-8.5 8.5 8.8 8.8 0 0 1-4-.95L3 21l1.45-4.8A8.5 8.5 0 1 1 21 12z"/>',
    apps: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.65-3.65"/>',
    task: '<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8.5 11.5l2.5 2.5 4.8-5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 6.5l8 6 8-6"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    block: '<circle cx="12" cy="12" r="9"/><line x1="5.7" y1="5.7" x2="18.3" y2="18.3"/>',
    sliders: '<line x1="4" y1="7" x2="20" y2="7"/><circle cx="9" cy="7" r="2.2" fill="currentColor" fill-opacity="0.2"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="15" cy="17" r="2.2" fill="currentColor" fill-opacity="0.2"/>',
    control_center: '<rect x="3" y="4" width="8" height="7" rx="2.2"/><rect x="13" y="4" width="8" height="7" rx="2.2"/><rect x="3" y="13" width="18" height="7" rx="2.2"/><circle cx="7" cy="7.5" r="1.2"/><circle cx="17" cy="7.5" r="1.2"/>',
    dark_mode: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>',
    light_mode: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    reply: '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
    quote: '<path d="M10 11H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3v6a5 5 0 0 1-3 4.5"/><path d="M20 11h-4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3v6a5 5 0 0 1-3 4.5"/>',
    bookmark: '<path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17l-6-3.8L6 21V4z"/>',
    bookmark_filled: '<path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17l-6-3.8L6 21V4z" fill="currentColor"/>',
    star: '<polygon points="12 3 14.9 8.8 21.3 9.7 16.6 14.2 17.7 20.6 12 17.6 6.3 20.6 7.4 14.2 2.7 9.7 9.1 8.8 12 3"/>',
    list: '<line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
    grid: '<rect x="3.5" y="4" width="7" height="7" rx="1.5"/><rect x="13.5" y="4" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    push_pin: '<path d="M12 17v5"/><path d="M9 4h6l1 6 2 2v2H6v-2l2-2 1-6z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    campaign: '<path d="M3 11v2a2 2 0 0 0 2 2h2l5 4V5L7 9H5a2 2 0 0 0-2 2z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
    chevron_down: '<polyline points="6 9 12 15 18 9"/>',
    chevron_right: '<polyline points="9 6 15 12 9 18"/>',
    chevron_left: '<polyline points="15 6 9 12 15 18"/>',
    arrow_up: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="6 11 12 5 18 11"/>',
    more_vert: '<circle cx="12" cy="5.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="18.5" r="1.3" fill="currentColor"/>',
    close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    rss: '<circle cx="5.5" cy="18.5" r="1.5" fill="currentColor"/><path d="M4 11.5a8.5 8.5 0 0 1 8.5 8.5"/><path d="M4 5a15 15 0 0 1 15 15"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9" r="1.5"/><path d="M21 15.5l-5-4.5-6.5 6.5"/>',
    zip: '<path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z"/><path d="M12 10v6"/>',
    poll: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><line x1="8" y1="16" x2="8" y2="11"/><line x1="12" y1="16" x2="12" y2="8"/><line x1="16" y1="16" x2="16" y2="12"/>',
    bolt: '<polygon points="13 2 4 14 11.5 14 10.5 22 20 10 12.5 10 13 2"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    open_new: '<path d="M14 4h6v6"/><path d="M10 14L20 4"/><path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
    zoom_in: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.65-3.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
    coins: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2a3 3 0 0 0-5.6 1.3c0 2 5.6 1.5 5.6 4a3 3 0 0 1-5.8.8"/><line x1="12" y1="6.5" x2="12" y2="17.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/><polyline points="12 7 12 12 15.5 14"/>',
    print: '<polyline points="6 9 6 4 18 4 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="6" rx="1"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    layers: '<polygon points="12 3 2 8.5 12 14 22 8.5 12 3"/><polyline points="2 13 12 18.5 22 13"/><polyline points="2 17.5 12 22 22 17.5"/>',
    snow: '<line x1="12" y1="2" x2="12" y2="22"/><line x1="3.3" y1="7" x2="20.7" y2="17"/><line x1="20.7" y1="7" x2="3.3" y2="17"/>',
    check: '<polyline points="5 12.5 9.5 17 19 7.5"/>',
    eye: '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    send: '<path d="M21.5 3.5L10 15"/><path d="M21.5 3.5L14.5 21 10 15 3 10.5 21.5 3.5z"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.5 15a9 9 0 1 1-2.6-9.4L23 10"/>',
    sparkles: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>',
    command: '<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>'
  };

  function icon(name, cls = '') {
    const path = ICONS[name] || ICONS.apps;
    return `<svg class="lg-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }

  const BRAND_LOGO_SVG = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="sp-lg-prism-bg" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="var(--lg-accent)"/>
        <stop offset="100%" stop-color="#64D2FF"/>
      </linearGradient>
      <linearGradient id="sp-lg-prism-sheen" x1="4" y1="3" x2="26" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="rgba(255,255,255,0.68)"/>
        <stop offset="55%" stop-color="rgba(255,255,255,0.12)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0.02)"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#sp-lg-prism-bg)"/>
    <rect x="2.5" y="2.5" width="27" height="27" rx="8.5" stroke="rgba(255,255,255,0.58)" stroke-width="1"/>
    <path d="M3 10C3 5.5 5.5 3 10 3H22C26.5 3 29 5.5 29 10V13.5C22.5 16.2 10.5 16.2 3 13.5V10Z" fill="url(#sp-lg-prism-sheen)"/>
    <path d="M16 7.5L17.9 12.6L23 14.5L17.9 16.4L16 21.5L14.1 16.4L9 14.5L14.1 12.6L16 7.5Z" fill="#FFFFFF"/>
    <circle cx="23.2" cy="23.2" r="4.3" fill="rgba(255,255,255,0.92)"/>
    <path d="M23.2 21.2V25.2M21.2 23.2H25.2" stroke="var(--lg-accent)" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;

  /* ============================================================================
   * 3. APPLE LIQUID GLASS STYLESHEET (EARLY INJECTION)
   * ========================================================================== */

  const CSS_TEXT = `
/* Anti-FOUC guard */
html.sp-lg-loading body {
  opacity: 0 !important;
}
html.sp-lg-ready body {
  opacity: 1 !important;
  transition: opacity 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

:root {
  --lg-font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "HarmonyOS Sans SC", "Microsoft YaHei UI", sans-serif;
  --lg-font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
  --lg-spring: cubic-bezier(0.22, 1.18, 0.36, 1);
  --lg-ease: cubic-bezier(0.25, 0.8, 0.25, 1);

  --lg-sidebar-w: 244px;
  --lg-content-max: 1220px;
  --lg-row-pad-y: 12px;
  --lg-card-pad: 18px;

  /* Light Mode Liquid Glass Tokens */
  --lg-text: #111318;
  --lg-text-secondary: rgba(17, 19, 24, 0.64);
  --lg-text-tertiary: rgba(17, 19, 24, 0.44);
  --lg-danger: #FF3B30;
  --lg-danger-soft: rgba(255, 59, 48, 0.14);
  --lg-success: #248A3D;
  --lg-success-soft: rgba(52, 199, 89, 0.16);
  --lg-warning: #C96B00;
  --lg-warning-soft: rgba(255, 159, 10, 0.16);

  --lg-lens-bg: rgba(255, 255, 255, 0.28);
  --lg-lens-bg-strong: rgba(255, 255, 255, 0.42);
  --lg-overlay-bg: rgba(248, 250, 255, 0.72);
  --lg-glass-bg: rgba(255, 255, 255, 0.46);
  --lg-glass-bg-strong: rgba(255, 255, 255, 0.56);
  --lg-glass-bg-subtle: rgba(255, 255, 255, 0.26);
  --lg-glass-hover: rgba(255, 255, 255, 0.54);
  --lg-glass-blur: blur(26px) saturate(190%);
  --lg-glass-blur-heavy: blur(36px) saturate(210%);
  --lg-glass-border: rgba(15, 23, 42, 0.085);
  --lg-glass-divider: rgba(15, 23, 42, 0.075);
  --lg-glass-rim: inset 0 1px 0.5px rgba(255, 255, 255, 0.92), inset 0 -1px 0.5px rgba(255, 255, 255, 0.28), inset 1px 0 0.5px rgba(255, 255, 255, 0.35), inset -1px 0 0.5px rgba(255, 255, 255, 0.22);
  --lg-glass-shadow: 0 8px 30px rgba(15, 23, 42, 0.065), 0 1.5px 4px rgba(15, 23, 42, 0.045);
  --lg-glass-shadow-elev: 0 18px 48px rgba(15, 23, 42, 0.14), 0 4px 12px rgba(15, 23, 42, 0.06);
  --lg-field-bg: rgba(255, 255, 255, 0.56);
  --lg-scrim: rgba(15, 23, 42, 0.28);
  --lg-glint: rgba(255, 255, 255, 0.55);
  --lg-sidebar-sheen: linear-gradient(160deg, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.08) 38%, rgba(255, 255, 255, 0.02) 68%, rgba(255, 255, 255, 0.20) 100%);
  --lg-pill-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.36) 0%, rgba(255, 255, 255, 0.16) 100%);
  --lg-pill-bg-hover: linear-gradient(180deg, rgba(255, 255, 255, 0.56) 0%, rgba(255, 255, 255, 0.28) 100%);
  --lg-pill-border: rgba(255, 255, 255, 0.54);
  --lg-pill-shadow: inset 0 1px 0.5px rgba(255, 255, 255, 0.85), inset 0 -0.5px 0.5px rgba(15, 23, 42, 0.06), 0 2px 8px rgba(15, 23, 42, 0.06);
  --lg-pill-shadow-hover: inset 0 1px 0.5px rgba(255, 255, 255, 0.96), 0 4px 12px rgba(15, 23, 42, 0.08);
  --lg-pill-active-bg: linear-gradient(180deg, color-mix(in srgb, var(--lg-accent) 66%, rgba(255, 255, 255, 0.24)) 0%, color-mix(in srgb, var(--lg-accent) 52%, rgba(255, 255, 255, 0.08)) 100%);
  --lg-pill-active-border: color-mix(in srgb, var(--lg-accent) 60%, rgba(255, 255, 255, 0.55));
  --lg-pill-active-shadow: inset 0 1px 0.5px rgba(255, 255, 255, 0.62), 0 4px 16px var(--lg-accent-ring);

  /* Tier 2 Local Controls & Tier 3 Inset Grouped Content Surfaces */
  --lg-local-glass-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.44) 0%, rgba(255, 255, 255, 0.20) 100%);
  --lg-nav-hover-bg: rgba(255, 255, 255, 0.44);
  --lg-nav-hover-border: rgba(255, 255, 255, 0.64);
  --lg-surface-bg: rgba(255, 255, 255, 0.72);
  --lg-surface-bg-strong: rgba(255, 255, 255, 0.86);
  --lg-surface-border: rgba(15, 23, 42, 0.085);
  --lg-surface-rim: inset 0 1px 0 rgba(255, 255, 255, 0.90);
  --lg-surface-shadow: 0 4px 18px rgba(15, 23, 42, 0.045), 0 1px 3px rgba(15, 23, 42, 0.03);
}

html[data-theme="dark"] {
  --lg-text: #F5F6FA;
  --lg-text-secondary: rgba(245, 246, 250, 0.68);
  --lg-text-tertiary: rgba(245, 246, 250, 0.46);
  --lg-danger: #FF453A;
  --lg-danger-soft: rgba(255, 69, 58, 0.20);
  --lg-success: #32D74B;
  --lg-success-soft: rgba(50, 215, 75, 0.20);
  --lg-warning: #FF9F0A;
  --lg-warning-soft: rgba(255, 159, 10, 0.20);

  --lg-lens-bg: rgba(24, 27, 36, 0.34);
  --lg-lens-bg-strong: rgba(26, 29, 40, 0.50);
  --lg-overlay-bg: rgba(20, 23, 33, 0.76);
  --lg-glass-bg: rgba(26, 29, 38, 0.46);
  --lg-glass-bg-strong: rgba(32, 36, 48, 0.58);
  --lg-glass-bg-subtle: rgba(255, 255, 255, 0.055);
  --lg-glass-hover: rgba(255, 255, 255, 0.11);
  --lg-glass-blur: blur(28px) saturate(185%);
  --lg-glass-blur-heavy: blur(40px) saturate(205%);
  --lg-glass-border: rgba(255, 255, 255, 0.13);
  --lg-glass-divider: rgba(255, 255, 255, 0.09);
  --lg-glass-rim: inset 0 1px 0.5px rgba(255, 255, 255, 0.26), inset 0 -1px 0.5px rgba(255, 255, 255, 0.08), inset 1px 0 0.5px rgba(255, 255, 255, 0.12), inset -1px 0 0.5px rgba(255, 255, 255, 0.06);
  --lg-glass-shadow: 0 12px 36px rgba(0, 0, 0, 0.36), 0 2px 6px rgba(0, 0, 0, 0.22);
  --lg-glass-shadow-elev: 0 24px 64px rgba(0, 0, 0, 0.62), 0 6px 18px rgba(0, 0, 0, 0.34);
  --lg-field-bg: rgba(18, 20, 26, 0.52);
  --lg-scrim: rgba(0, 0, 0, 0.54);
  --lg-glint: rgba(255, 255, 255, 0.16);
  --lg-sidebar-sheen: linear-gradient(160deg, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.025) 34%, rgba(255, 255, 255, 0.005) 66%, rgba(255, 255, 255, 0.055) 100%);
  --lg-pill-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.075) 0%, rgba(255, 255, 255, 0.022) 100%);
  --lg-pill-bg-hover: linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.05) 100%);
  --lg-pill-border: rgba(255, 255, 255, 0.13);
  --lg-pill-shadow: inset 0 1px 0.5px rgba(255, 255, 255, 0.22), inset 0 -0.5px 0.5px rgba(0, 0, 0, 0.24), 0 2px 8px rgba(0, 0, 0, 0.22);
  --lg-pill-shadow-hover: inset 0 1px 0.5px rgba(255, 255, 255, 0.32), 0 4px 12px rgba(0, 0, 0, 0.28);
  --lg-pill-active-bg: linear-gradient(180deg, color-mix(in srgb, var(--lg-accent) 62%, rgba(255, 255, 255, 0.18)) 0%, color-mix(in srgb, var(--lg-accent) 44%, rgba(255, 255, 255, 0.04)) 100%);
  --lg-pill-active-border: color-mix(in srgb, var(--lg-accent) 68%, rgba(255, 255, 255, 0.34));
  --lg-pill-active-shadow: inset 0 1px 0.5px rgba(255, 255, 255, 0.44), 0 4px 16px var(--lg-accent-ring);

  --lg-local-glass-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.028) 100%);
  --lg-nav-hover-bg: rgba(255, 255, 255, 0.09);
  --lg-nav-hover-border: rgba(255, 255, 255, 0.17);
  --lg-surface-bg: rgba(26, 29, 38, 0.72);
  --lg-surface-bg-strong: rgba(32, 36, 48, 0.86);
  --lg-surface-border: rgba(255, 255, 255, 0.095);
  --lg-surface-rim: inset 0 1px 0 rgba(255, 255, 255, 0.10);
  --lg-surface-shadow: 0 8px 28px rgba(0, 0, 0, 0.28), 0 1.5px 4px rgba(0, 0, 0, 0.16);
}

/* Glass Material Modes */
html[data-glass="clear"][data-theme="light"] {
  --lg-lens-bg: rgba(255, 255, 255, 0.28);
  --lg-lens-bg-strong: rgba(255, 255, 255, 0.40);
  --lg-overlay-bg: rgba(248, 250, 255, 0.66);
  --lg-glass-bg: rgba(255, 255, 255, 0.32);
  --lg-glass-bg-strong: rgba(255, 255, 255, 0.46);
  --lg-glass-bg-subtle: rgba(255, 255, 255, 0.20);
  --lg-glass-blur: blur(22px) saturate(210%);
  --lg-surface-bg: rgba(255, 255, 255, 0.64);
  --lg-surface-bg-strong: rgba(255, 255, 255, 0.78);
}
html[data-glass="clear"][data-theme="dark"] {
  --lg-lens-bg: rgba(20, 23, 32, 0.34);
  --lg-lens-bg-strong: rgba(24, 28, 38, 0.46);
  --lg-overlay-bg: rgba(18, 21, 31, 0.68);
  --lg-glass-bg: rgba(22, 25, 34, 0.32);
  --lg-glass-bg-strong: rgba(28, 32, 44, 0.48);
  --lg-glass-bg-subtle: rgba(255, 255, 255, 0.045);
  --lg-glass-blur: blur(22px) saturate(205%);
  --lg-surface-bg: rgba(22, 25, 34, 0.64);
  --lg-surface-bg-strong: rgba(28, 32, 44, 0.78);
}
html[data-glass="tinted"][data-theme="light"] {
  --lg-lens-bg: rgba(255, 255, 255, 0.54);
  --lg-lens-bg-strong: rgba(255, 255, 255, 0.68);
  --lg-overlay-bg: rgba(252, 253, 255, 0.88);
  --lg-glass-bg: rgba(255, 255, 255, 0.70);
  --lg-glass-bg-strong: rgba(255, 255, 255, 0.82);
  --lg-glass-bg-subtle: rgba(255, 255, 255, 0.48);
  --lg-glass-blur: blur(34px) saturate(165%);
  --lg-surface-bg: rgba(255, 255, 255, 0.84);
  --lg-surface-bg-strong: rgba(255, 255, 255, 0.94);
}
html[data-glass="tinted"][data-theme="dark"] {
  --lg-lens-bg: rgba(26, 29, 38, 0.56);
  --lg-lens-bg-strong: rgba(32, 35, 46, 0.70);
  --lg-overlay-bg: rgba(22, 25, 36, 0.88);
  --lg-glass-bg: rgba(28, 31, 42, 0.70);
  --lg-glass-bg-strong: rgba(34, 38, 50, 0.82);
  --lg-glass-bg-subtle: rgba(255, 255, 255, 0.09);
  --lg-glass-blur: blur(36px) saturate(165%);
  --lg-surface-bg: rgba(28, 31, 42, 0.84);
  --lg-surface-bg-strong: rgba(34, 38, 50, 0.92);
}

html[data-wide="true"] {
  --lg-content-max: 1520px;
}
html[data-density="compact"] {
  --lg-row-pad-y: 8px;
  --lg-card-pad: 14px;
}

/* Global Reset & Base */
html, body {
  background: var(--lg-canvas, #EEF3FA) !important;
  background-image: none !important;
  color: var(--lg-text) !important;
  font-family: var(--lg-font-sans) !important;
  font-size: 14px !important;
  line-height: 1.55 !important;
  margin: 0 !important;
  padding: 0 !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
*, *::before, *::after {
  box-sizing: border-box;
}
a {
  color: var(--lg-accent);
  text-decoration: none;
  transition: color 160ms var(--lg-ease), opacity 160ms var(--lg-ease);
}
a:hover {
  color: var(--lg-accent);
  text-decoration: underline;
}

/* Hide legacy chrome safely while preserving DOM nodes */
html.sp-lg-ready #toptool,
html.sp-lg-ready #wrapA > #header,
html.sp-lg-ready #wrapA,
html.sp-lg-ready #footer,
html.sp-lg-ready #bottom,
html.sp-lg-ready center.hidden-md.hidden-lg {
  display: none !important;
}

/* Dark Mode Legacy Font Color Overrides */
html[data-theme="dark"] #sp-lg-shell font[color="#000000"],
html[data-theme="dark"] #sp-lg-shell font[color="black"],
html[data-theme="dark"] #sp-lg-shell [style*="color:#000000"],
html[data-theme="dark"] #sp-lg-shell [style*="color: #000000"],
html[data-theme="dark"] #sp-lg-shell [style*="color:black"] {
  color: var(--lg-text) !important;
}
html[data-theme="dark"] #sp-lg-shell font[color="#FF0000"],
html[data-theme="dark"] #sp-lg-shell font[color="red"],
html[data-theme="dark"] #sp-lg-shell [style*="color:#FF0000"],
html[data-theme="dark"] #sp-lg-shell [style*="color:#ff0000"],
html[data-theme="dark"] #sp-lg-shell [style*="color:red"] {
  color: var(--lg-danger) !important;
}
html[data-theme="dark"] #sp-lg-shell font[color="#0000FF"],
html[data-theme="dark"] #sp-lg-shell font[color="#0064FF"],
html[data-theme="dark"] #sp-lg-shell [style*="color:#0000FF"],
html[data-theme="dark"] #sp-lg-shell [style*="color:#0064FF"] {
  color: var(--lg-accent) !important;
}
html[data-theme="dark"] #sp-lg-shell font[color="#FF00FF"],
html[data-theme="dark"] #sp-lg-shell font[color="#FF1493"],
html[data-theme="dark"] #sp-lg-shell [style*="color:#FF00FF"],
html[data-theme="dark"] #sp-lg-shell [style*="color:#D200D2"],
html[data-theme="dark"] #sp-lg-shell [style*="color:#6633cc"] {
  color: #BF5AF2 !important;
}
html[data-theme="dark"] #sp-lg-shell [style*="color:#66cc00"] {
  color: #32D74B !important;
}

/* Living Ambient Refraction Backdrop */
#sp-lg-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background: var(--lg-canvas);
}
#sp-lg-backdrop::before,
#sp-lg-backdrop::after,
#sp-lg-backdrop .lg-orb-mid {
  content: "";
  position: absolute;
  border-radius: 50%;
  filter: blur(88px);
  opacity: 0.9;
  will-change: transform;
}
#sp-lg-backdrop::before {
  width: 58vw;
  height: 58vw;
  max-width: 780px;
  max-height: 780px;
  top: -18vw;
  left: -10vw;
  background: radial-gradient(circle, var(--lg-orb-1) 0%, transparent 70%);
}
#sp-lg-backdrop::after {
  width: 54vw;
  height: 54vw;
  max-width: 720px;
  max-height: 720px;
  bottom: -18vw;
  right: -8vw;
  background: radial-gradient(circle, var(--lg-orb-2) 0%, transparent 70%);
}
#sp-lg-backdrop .lg-orb-mid {
  width: 44vw;
  height: 44vw;
  max-width: 580px;
  max-height: 580px;
  top: 28vh;
  left: 44vw;
  background: radial-gradient(circle, var(--lg-orb-3) 0%, transparent 72%);
}
#sp-lg-backdrop .lg-orb-side {
  position: absolute;
  top: 8vh;
  left: -4vw;
  width: 38vw;
  height: 76vh;
  max-width: 520px;
  border-radius: 50%;
  filter: blur(72px);
  opacity: 0.94;
  background:
    radial-gradient(circle at 38% 28%, var(--lg-orb-1) 0%, transparent 56%),
    radial-gradient(circle at 60% 66%, var(--lg-orb-2) 0%, transparent 64%),
    radial-gradient(circle at 30% 84%, var(--lg-orb-3) 0%, transparent 68%);
  will-change: transform;
}
#sp-lg-backdrop .lg-caustic-ribbon {
  position: absolute;
  inset: -12% -8%;
  opacity: 0.36;
  background:
    radial-gradient(42% 28% at 22% 18%, var(--lg-orb-1) 0%, transparent 72%),
    radial-gradient(36% 24% at 78% 24%, var(--lg-orb-2) 0%, transparent 70%),
    radial-gradient(34% 26% at 62% 76%, var(--lg-orb-3) 0%, transparent 72%),
    conic-gradient(from 135deg at 46% 44%, transparent 0deg, var(--lg-accent-soft) 52deg, transparent 118deg, var(--lg-orb-2) 205deg, transparent 278deg);
  filter: blur(36px);
  transform: rotate(-4deg);
}
html[data-theme="dark"] #sp-lg-backdrop .lg-caustic-ribbon {
  opacity: 0.44;
}

/* Hidden Chromium SVG Optics Host (MUST NOT use display:none or visibility:hidden) */
#sp-lg-optics-svg {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  z-index: -1;
}

/* Sibling Glass Backdrop Layer (eliminates nested Backdrop Root blocking) */
[data-lg-refract="lens"] {
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow-elev);
}
[data-lg-refract="overlay"] {
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow-elev);
}

/* Icons & Specular Pointer Glint */
.lg-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
.lg-icon-lg {
  width: 22px;
  height: 22px;
}

.lg-glass-interactive {
  position: relative;
  overflow: hidden;
}
.lg-glass-interactive::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    220px circle at var(--lg-mx, -200px) var(--lg-my, -200px),
    var(--lg-glint),
    transparent 70%
  );
  opacity: 0;
  transition: opacity 220ms var(--lg-ease);
  pointer-events: none;
  z-index: 0;
}
.lg-glass-interactive:hover::before {
  opacity: 1;
}
.lg-glass-interactive > * {
  position: relative;
  z-index: 1;
}

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--lg-glass-border);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover { background: var(--lg-text-tertiary); }

/* ============================================================================
 * APP SHELL: DETACHED FLOATING SIDEBAR + CAPSULE TOPBAR + WORKSPACE
 * ========================================================================== */
#sp-lg-shell {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 100vh;
  color: var(--lg-text);
}

/* Detached Floating Liquid Glass Sidebar (Tier 1 Chrome) */
.lg-sidebar {
  position: fixed;
  top: 14px;
  left: 14px;
  bottom: 14px;
  width: var(--lg-sidebar-w);
  background: var(--lg-sidebar-sheen), var(--lg-lens-bg);
  backdrop-filter: var(--lg-refract-filter, blur(38px) saturate(225%));
  -webkit-backdrop-filter: var(--lg-refract-filter, blur(38px) saturate(225%));
  border: none;
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow-elev);
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  padding: 14px 12px;
  z-index: 400;
  user-select: none;
  transition: transform 360ms var(--lg-spring), opacity 240ms var(--lg-ease);
}
.lg-sidebar::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.48) 0%,
    rgba(255, 255, 255, 0.08) 38%,
    rgba(255, 255, 255, 0.02) 66%,
    color-mix(in srgb, var(--lg-accent) 34%, rgba(255, 255, 255, 0.22)) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  z-index: 2;
}
#sp-lg-shell.sidebar-collapsed .lg-sidebar {
  transform: translateX(calc(-100% - 28px));
  opacity: 0;
  pointer-events: none;
}

.lg-sidebar-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 4px 12px;
}
.lg-sidebar-brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  text-decoration: none !important;
  color: var(--lg-text) !important;
  min-width: 0;
}
.lg-brand-mark {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: inline-flex;
}
.lg-brand-mark svg {
  width: 100%;
  height: 100%;
  display: block;
}
.lg-brand-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.lg-brand-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 9999px;
  background: var(--lg-accent-soft);
  color: var(--lg-accent);
  letter-spacing: 0.02em;
}

.lg-sidebar-cta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  border-radius: 9999px;
  border: 1px solid var(--lg-pill-active-border);
  background: var(--lg-pill-active-bg);
  color: #FFFFFF !important;
  font-family: var(--lg-font-sans);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none !important;
  box-shadow: var(--lg-pill-active-shadow);
  transition: filter 140ms var(--lg-ease), box-shadow 140ms var(--lg-ease), transform 140ms var(--lg-ease);
  margin-bottom: 10px;
}
.lg-sidebar-cta:hover {
  filter: brightness(1.06);
}
.lg-sidebar-cta:active {
  transform: scale(0.98);
}

.lg-sidebar-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 4px 10px 2px;
}
.lg-nav-group-card {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--lg-glass-divider);
  border-radius: 0;
  padding: 2px 2px 8px;
  box-shadow: none;
}
.lg-nav-group-card:last-child {
  border-bottom: none;
  padding-bottom: 2px;
}
.lg-nav-group-label {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--lg-text-tertiary);
  padding: 1px 10px 5px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.lg-nav-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lg-nav-item {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8.5px 12px;
  border-radius: 13px;
  border: 1px solid transparent;
  background: transparent;
  box-shadow: none;
  color: var(--lg-text) !important;
  font-family: var(--lg-font-sans);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  text-decoration: none !important;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), box-shadow 140ms var(--lg-ease), color 140ms var(--lg-ease);
}
.lg-nav-item::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    180px circle at var(--lg-mx, -200px) var(--lg-my, -200px),
    var(--lg-glint),
    transparent 70%
  );
  opacity: 0;
  transition: opacity 140ms var(--lg-ease);
  pointer-events: none;
  z-index: -1;
}
.lg-nav-item .lg-icon {
  color: var(--lg-text-secondary);
  transition: color 140ms var(--lg-ease);
}
.lg-nav-item:hover {
  background: var(--lg-nav-hover-bg);
  border-color: var(--lg-nav-hover-border);
  box-shadow: inset 0 1px 0.5px rgba(255, 255, 255, 0.26);
}
.lg-nav-item:hover::before,
.lg-nav-item.is-active:hover::before {
  opacity: 0.85;
}
.lg-nav-item:hover .lg-icon {
  color: var(--lg-text);
}
.lg-nav-item:active {
  opacity: 0.86;
}
.lg-nav-item.is-active {
  background: var(--lg-pill-active-bg);
  border-color: var(--lg-pill-active-border);
  color: #FFFFFF !important;
  font-weight: 650;
  box-shadow: var(--lg-pill-active-shadow);
}
.lg-nav-item.is-active .lg-icon {
  color: #FFFFFF;
  filter: drop-shadow(0 0 6px var(--lg-accent-ring));
}
.lg-nav-shortcut-hint {
  margin-left: auto;
  font-family: var(--lg-font-mono);
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--lg-glass-bg-subtle);
  color: var(--lg-text-tertiary);
}
.lg-unread-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--lg-danger);
  box-shadow: 0 0 8px var(--lg-danger);
  margin-left: auto;
}

.lg-sidebar-footer {
  flex-shrink: 0;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Workspace & Floating Capsule Topbar */
.lg-workspace {
  flex: 1;
  min-width: 0;
  margin-left: calc(var(--lg-sidebar-w) + 28px);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 360ms var(--lg-spring);
}
#sp-lg-shell.sidebar-collapsed .lg-workspace {
  margin-left: 0;
}

.lg-topbar {
  position: sticky;
  top: 12px;
  z-index: 350;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  max-width: var(--lg-content-max);
  margin: 14px auto 0;
  padding: 0 22px;
  pointer-events: none;
}
.lg-topbar > * {
  pointer-events: auto;
}

.lg-topbar-cluster {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  border-radius: 9999px;
  background: var(--lg-lens-bg);
  backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur));
  -webkit-backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur));
  border: 1px solid var(--lg-glass-border);
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow);
  min-width: 0;
}
.lg-topbar-left {
  max-width: 44%;
}
.lg-topbar-home-pill {
  display: none;
  align-items: center;
  gap: 7px;
  padding: 4px 10px 4px 6px;
  border-radius: 9999px;
  color: var(--lg-text) !important;
  font-weight: 700;
  font-size: 13.5px;
  text-decoration: none !important;
}
#sp-lg-shell.sidebar-collapsed .lg-topbar-home-pill {
  display: inline-flex;
}
.lg-topbar-home-pill .lg-brand-mark {
  width: 22px;
  height: 22px;
}

.lg-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  min-width: 0;
  overflow: hidden;
}
.lg-crumb {
  color: var(--lg-text-secondary) !important;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  padding: 4px 8px;
  border-radius: 9999px;
  text-decoration: none !important;
}
.lg-crumb:hover {
  background: var(--lg-glass-bg-subtle);
  color: var(--lg-text) !important;
}
.lg-crumb.is-current {
  color: var(--lg-text) !important;
  font-weight: 600;
}
.lg-crumb-sep {
  color: var(--lg-text-tertiary);
  display: inline-flex;
}
.lg-crumb-sep .lg-icon {
  width: 14px;
  height: 14px;
}

/* Spotlight Search Pill in Topbar (Tier 1 Chrome) */
.lg-search-capsule {
  flex: 1;
  max-width: 420px;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px 0 14px;
  border-radius: 9999px;
  background: var(--lg-lens-bg);
  backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur));
  -webkit-backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur));
  border: 1px solid var(--lg-glass-border);
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow);
  transition: box-shadow 140ms var(--lg-ease), border-color 140ms var(--lg-ease);
}
.lg-drawer .lg-search-capsule {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background: var(--lg-field-bg);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
}
.lg-search-capsule:focus-within {
  border-color: var(--lg-accent);
  box-shadow: var(--lg-glass-rim), 0 0 0 3px var(--lg-accent-soft), var(--lg-glass-shadow);
}
.lg-search-capsule input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--lg-text);
  font-family: var(--lg-font-sans);
  font-size: 13.5px;
}
.lg-search-capsule input::placeholder {
  color: var(--lg-text-tertiary);
}
.lg-kbd-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 26px;
  padding: 0 9px;
  border-radius: 9999px;
  border: 1px solid var(--lg-pill-border);
  background: var(--lg-pill-bg);
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text-secondary);
  font-family: var(--lg-font-mono);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease);
}
.lg-kbd-btn:hover {
  background: var(--lg-accent-soft);
  color: var(--lg-accent);
}

.lg-user-capsule {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px 0 4px;
  border-radius: 9999px;
  border: 1px solid var(--lg-pill-border);
  background: var(--lg-pill-bg);
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text);
  font-family: var(--lg-font-sans);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), box-shadow 140ms var(--lg-ease);
}
.lg-user-capsule:hover {
  background: var(--lg-pill-bg-hover);
}
.lg-user-capsule:active {
  transform: scale(0.96);
}
.lg-user-capsule img {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--lg-glass-border);
}
.lg-sp-pill {
  padding: 2px 7px;
  border-radius: 9999px;
  background: var(--lg-accent-soft);
  color: var(--lg-accent);
  font-size: 11px;
  font-weight: 700;
}

/* Main Content Area */
.lg-main {
  width: 100%;
  max-width: var(--lg-content-max);
  margin: 0 auto;
  padding: 20px 22px 104px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lg-footer {
  width: 100%;
  max-width: var(--lg-content-max);
  margin: auto auto 0;
  padding: 18px 92px 36px 22px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12.5px;
  color: var(--lg-text-secondary);
}

/* ============================================================================
 * REUSABLE LIQUID GLASS COMPONENTS
 * ========================================================================== */
.lg-card {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 24px;
  padding: var(--lg-card-pad);
}

.lg-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--lg-text-secondary);
  cursor: pointer;
  text-decoration: none !important;
  transition: background 140ms var(--lg-ease), color 140ms var(--lg-ease);
}
.lg-icon-btn:hover {
  background: var(--lg-glass-hover);
  color: var(--lg-text);
}
.lg-icon-btn:active {
  transform: scale(0.95);
}
.lg-icon-btn.is-glass {
  background: var(--lg-glass-bg-subtle);
  border: 1px solid var(--lg-glass-border);
}

.lg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 38px;
  padding: 0 16px;
  border-radius: 9999px;
  border: 1px solid var(--lg-pill-border);
  background: var(--lg-local-glass-bg);
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text) !important;
  font-family: var(--lg-font-sans);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none !important;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), box-shadow 140ms var(--lg-ease), filter 140ms var(--lg-ease);
}
.lg-btn:hover {
  background: var(--lg-pill-bg-hover);
  box-shadow: var(--lg-pill-shadow-hover);
}
.lg-btn:active {
  transform: scale(0.97);
}
.lg-btn-sm {
  height: 32px;
  padding: 0 13px;
  font-size: 12.5px;
}
.lg-btn-primary {
  background: var(--lg-pill-active-bg);
  color: #FFFFFF !important;
  border-color: var(--lg-pill-active-border);
  box-shadow: var(--lg-pill-active-shadow);
}
.lg-btn-primary:hover {
  background: var(--lg-pill-active-bg);
  filter: brightness(1.07);
}
.lg-btn-tinted {
  background: var(--lg-accent-soft);
  color: var(--lg-accent) !important;
  border-color: transparent;
}
.lg-btn-tinted:hover {
  background: var(--lg-accent-soft);
  filter: brightness(0.96);
}
.lg-btn-ghost {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  backdrop-filter: none;
}
.lg-btn-ghost:hover {
  background: var(--lg-glass-bg-subtle);
}

/* Badges */
.lg-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 9px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  text-decoration: none !important;
}
.lg-badge .lg-icon { width: 13px; height: 13px; }
.lg-badge-primary { background: var(--lg-accent-soft); color: var(--lg-accent); }
.lg-badge-secondary { background: rgba(142, 142, 147, 0.16); color: var(--lg-text); }
.lg-badge-tertiary { background: var(--lg-warning-soft); color: var(--lg-warning); }
.lg-badge-error { background: var(--lg-danger-soft); color: var(--lg-danger); }
.lg-badge-neutral { background: var(--lg-glass-bg-subtle); color: var(--lg-text-secondary); border: 1px solid var(--lg-glass-border); }

/* Apple Segmented Control (Tier 2 Restrained CSS Glass) */
.lg-segmented {
  display: inline-flex;
  align-items: center;
  padding: 4px;
  border-radius: 9999px;
  background: var(--lg-local-glass-bg);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid var(--lg-pill-border);
  box-shadow: var(--lg-glass-rim), var(--lg-pill-shadow);
  gap: 4px;
  flex-wrap: wrap;
}
.lg-seg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border-radius: 9999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--lg-text-secondary) !important;
  font-family: var(--lg-font-sans);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none !important;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease), box-shadow 140ms var(--lg-ease);
}
.lg-seg-btn:hover {
  background: var(--lg-pill-bg);
  border-color: var(--lg-pill-border);
  color: var(--lg-text) !important;
}
.lg-seg-btn.is-active {
  background: var(--lg-pill-bg-hover);
  border-color: var(--lg-pill-border);
  color: var(--lg-text) !important;
  box-shadow: var(--lg-pill-shadow-hover);
}

/* Filter Chips (Tier 2 Restrained CSS Glass) */
.lg-chip-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
}
.lg-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border-radius: 9999px;
  border: 1px solid var(--lg-pill-border);
  background: var(--lg-pill-bg);
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text-secondary) !important;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none !important;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease), box-shadow 140ms var(--lg-ease);
}
.lg-chip:hover {
  background: var(--lg-pill-bg-hover);
  box-shadow: var(--lg-pill-shadow-hover);
  color: var(--lg-text) !important;
}
.lg-chip.is-selected {
  background: var(--lg-pill-active-bg);
  color: #FFFFFF !important;
  border-color: var(--lg-pill-active-border);
  box-shadow: var(--lg-pill-active-shadow);
}

/* Disclosure Accordion (Tier 3 Content Layer) */
.lg-accordion {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 24px;
  overflow: hidden;
}
.lg-accordion-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border: none;
  background: transparent;
  color: var(--lg-text);
  font-family: var(--lg-font-sans);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  text-align: left;
}
.lg-accordion-head:hover {
  background: var(--lg-glass-bg-subtle);
}
.lg-accordion-chev {
  display: inline-flex;
  color: var(--lg-text-secondary);
  transition: transform 240ms var(--lg-spring);
}
.lg-accordion.is-collapsed .lg-accordion-chev {
  transform: rotate(-90deg);
}
.lg-accordion.is-collapsed .lg-accordion-body {
  display: none;
}
.lg-accordion-body {
  padding: 4px 18px 18px;
}
.lg-accordion-summary {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  font-size: 14.5px;
  font-weight: 700;
  cursor: pointer;
}
.lg-accordion-summary::-webkit-details-marker { display: none; }

/* Select */
.lg-select {
  height: 32px;
  padding: 0 11px;
  border-radius: 9999px;
  border: 1px solid var(--lg-glass-border);
  background: var(--lg-glass-bg);
  color: var(--lg-text);
  font-family: var(--lg-font-sans);
  font-size: 12.5px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
}

/* ============================================================================
 * INDEX PAGE (HOME)
 * ========================================================================== */
.lg-pulse-hero {
  background: linear-gradient(135deg, color-mix(in srgb, var(--lg-accent-soft) 95%, var(--lg-surface-bg)), var(--lg-surface-bg));
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 28px;
  padding: 22px 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.lg-pulse-title {
  margin: 0;
  font-size: clamp(22px, 2.5vw, 28px);
  font-weight: 800;
  letter-spacing: -0.025em;
}
.lg-pulse-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}
.lg-stat-pill {
  padding: 4px 11px;
  border-radius: 9999px;
  background: var(--lg-pill-bg);
  border: 1px solid var(--lg-pill-border);
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.lg-notice-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 20px;
  background: linear-gradient(90deg, var(--lg-accent-soft), var(--lg-surface-bg));
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
}
.lg-notice-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 13px;
}
.lg-notice-items a {
  color: var(--lg-text);
  font-weight: 500;
}

.lg-feeds-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.lg-feeds-grid[data-count="1"],
.lg-feeds-grid.is-single {
  grid-template-columns: 1fr;
}
.lg-feeds-grid[data-count="2"],
.lg-feeds-grid[data-count="4"] {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.lg-feeds-grid[data-count="3"],
.lg-feeds-grid[data-count="6"] {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
@media (max-width: 820px) {
  .lg-feeds-grid {
    grid-template-columns: 1fr !important;
  }
}
.lg-feed-box {
  background: var(--lg-glass-bg-subtle);
  border: 1px solid var(--lg-glass-border);
  border-radius: 18px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lg-feed-box-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.lg-feed-box-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
}
.lg-feed-box-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.lg-feed-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border-radius: 10px;
  color: var(--lg-text) !important;
  text-decoration: none !important;
  font-size: 13px;
  transition: background 150ms var(--lg-ease);
}
.lg-feed-item:hover {
  background: var(--lg-glass-hover);
}
.lg-feed-num {
  width: 20px;
  height: 20px;
  border-radius: 7px;
  background: var(--lg-accent-soft);
  color: var(--lg-accent);
  font-family: var(--lg-font-mono);
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.lg-feed-item-title {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lg-feed-item-meta {
  font-size: 11.5px;
  color: var(--lg-text-tertiary);
  flex-shrink: 0;
}
.lg-feed-box-foot {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}
.lg-feed-skeleton {
  height: 30px;
  border-radius: 10px;
  background: linear-gradient(90deg, var(--lg-glass-bg-subtle) 25%, var(--lg-glass-hover) 50%, var(--lg-glass-bg-subtle) 75%);
  background-size: 200% 100%;
  animation: lgShimmer 1.3s infinite linear;
}
@keyframes lgShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Board Cards Grid */
.lg-board-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 12px;
}
.lg-board-card {
  background: var(--lg-glass-bg-subtle);
  border: 1px solid var(--lg-glass-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  border-radius: 20px;
  padding: 15px 16px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  transition: transform 240ms var(--lg-spring), background 180ms var(--lg-ease), box-shadow 200ms var(--lg-ease);
}
.lg-board-card:hover {
  transform: translateY(-2px);
  background: var(--lg-glass-bg);
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow);
}
.lg-board-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.lg-board-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--lg-glass-bg);
  border: 1px solid var(--lg-glass-border);
  color: var(--lg-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.lg-board-icon.has-new {
  background: var(--lg-accent-soft);
  border-color: transparent;
  color: var(--lg-accent);
  box-shadow: 0 0 14px var(--lg-accent-soft);
}
.lg-board-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--lg-text) !important;
  display: inline-block;
}
.lg-board-desc {
  font-size: 12px;
  color: var(--lg-text-secondary);
  margin-top: 2px;
  line-height: 1.45;
}
.lg-subforum-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.lg-sub-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 9999px;
  border: 1px solid var(--lg-pill-border);
  background: var(--lg-pill-bg);
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text-secondary) !important;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none !important;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease);
}
.lg-sub-chip:hover {
  background: var(--lg-accent-soft);
  color: var(--lg-accent) !important;
}
.lg-board-foot {
  margin-top: auto;
  padding-top: 9px;
  border-top: 1px solid var(--lg-glass-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11.5px;
  color: var(--lg-text-tertiary);
}
.lg-board-last {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lg-board-last a {
  color: var(--lg-text-secondary);
}

/* ============================================================================
 * FORUM HEADER, THREAD LIST (INSET GROUPED LIST) & PAGINATION
 * ========================================================================== */
.lg-forum-hero {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 26px;
  padding: 20px 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.lg-forum-hero-title,
.lg-forum-title {
  margin: 0;
  font-size: clamp(20px, 2.2vw, 25px);
  font-weight: 800;
  letter-spacing: -0.02em;
}
.lg-forum-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--lg-text-secondary);
}
.lg-forum-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.lg-toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.lg-sort-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

/* Apple Inset Grouped List (Tier 3 Content Layer) */
.lg-inset-group {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 24px;
  overflow: hidden;
}
.lg-thread-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: var(--lg-row-pad-y) 18px;
  border-bottom: 1px solid var(--lg-glass-divider);
  transition: background 160ms var(--lg-ease);
}
.lg-thread-row:last-child {
  border-bottom: none;
}
.lg-thread-row:hover {
  background: var(--lg-glass-bg-subtle);
}
.lg-thread-status {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: var(--lg-glass-bg-subtle);
  border: 1px solid var(--lg-glass-border);
  color: var(--lg-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lg-thread-status.is-new { background: var(--lg-accent-soft); border-color: transparent; color: var(--lg-accent); }
.lg-thread-status.is-hot { background: var(--lg-warning-soft); border-color: transparent; color: var(--lg-warning); }
.lg-thread-status.is-lock { background: var(--lg-danger-soft); border-color: transparent; color: var(--lg-danger); }
.lg-thread-status.is-pin { background: var(--lg-accent-soft); border-color: transparent; color: var(--lg-accent); }
.lg-thread-status.is-digest { background: var(--lg-success-soft); border-color: transparent; color: var(--lg-success); }

.lg-thread-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lg-thread-title-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.lg-thread-link,
.lg-thread-title {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--lg-text) !important;
  line-height: 1.45;
  word-break: break-word;
}
.lg-thread-link:visited,
.lg-thread-title:visited {
  color: var(--lg-text-secondary) !important;
}
.lg-thread-submeta,
.lg-thread-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--lg-text-tertiary);
}
.lg-page-jump {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.lg-page-jump a {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--lg-glass-bg-subtle);
  color: var(--lg-text-secondary);
  font-size: 11px;
  font-weight: 600;
}
.lg-thread-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  font-size: 11.5px;
  color: var(--lg-text-tertiary);
  text-align: right;
}

/* Pagination */
.lg-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 20px;
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
}
.lg-page-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}
.lg-page-pill {
  min-width: 32px;
  height: 32px;
  padding: 0 10px;
  border-radius: 9999px;
  border: 1px solid var(--lg-pill-border);
  background: var(--lg-pill-bg);
  box-shadow: var(--lg-pill-shadow);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--lg-text-secondary) !important;
  text-decoration: none !important;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease);
}
.lg-page-pill:hover {
  background: var(--lg-pill-bg-hover);
  color: var(--lg-text) !important;
}
.lg-page-pill.is-current {
  background: var(--lg-pill-active-bg);
  border-color: var(--lg-pill-active-border);
  color: #FFFFFF !important;
  box-shadow: var(--lg-pill-active-shadow);
}
.lg-page-go {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--lg-text-secondary);
}
.lg-page-go input {
  width: 62px;
  height: 30px;
  padding: 0 8px;
  border-radius: 9999px;
  border: 1px solid var(--lg-glass-border);
  background: var(--lg-field-bg);
  color: var(--lg-text);
  font-family: var(--lg-font-mono);
  font-size: 12px;
  text-align: center;
  outline: none;
}

/* ============================================================================
 * IMAGE WALL GALLERY (thread_new.php)
 * ========================================================================== */
.lg-wall-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
  gap: 14px;
}
.lg-wall-card {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 22px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 220ms var(--lg-spring), box-shadow 180ms var(--lg-ease);
}
.lg-wall-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--lg-surface-rim), var(--lg-glass-shadow-elev);
}
.lg-wall-media {
  position: relative;
  aspect-ratio: 4 / 5;
  background: var(--lg-glass-bg-subtle);
  overflow: hidden;
}
.lg-wall-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 320ms var(--lg-ease);
}
.lg-wall-card:hover .lg-wall-media img {
  transform: scale(1.03);
}
.lg-wall-grid.is-contain .lg-wall-media img {
  object-fit: contain;
}
.lg-wall-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
}
.lg-wall-float-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.32);
  background: rgba(20, 22, 28, 0.48);
  backdrop-filter: blur(14px) saturate(180%);
  -webkit-backdrop-filter: blur(14px) saturate(180%);
  color: #FFFFFF;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 140ms var(--lg-ease), background 140ms var(--lg-ease);
}
.lg-wall-float-btn:hover {
  background: rgba(20, 22, 28, 0.72);
  transform: scale(1.08);
}
.lg-wall-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
}
.lg-wall-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.lg-wall-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--lg-text) !important;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.lg-wall-foot {
  margin-top: auto;
  padding-top: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 11.5px;
  color: var(--lg-text-tertiary);
}

/* ============================================================================
 * READ THREAD PAGE (read.php)
 * ========================================================================== */
.lg-thread-hero {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 26px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 13px;
}
.lg-thread-h1 {
  font-size: clamp(19px, 2.2vw, 23px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.38;
  margin: 0;
  word-break: break-word;
}
.lg-post-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.lg-post-card {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 24px;
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 13px;
  scroll-margin-top: 84px;
}
.lg-post-card.is-op {
  border-color: color-mix(in srgb, var(--lg-accent) 42%, var(--lg-glass-border));
}
.lg-post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--lg-glass-divider);
}
.lg-post-author-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.lg-avatar-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  padding: 0;
  border: 1px solid var(--lg-glass-border);
  background: var(--lg-glass-bg-subtle);
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: var(--lg-glass-shadow);
  transition: transform 200ms var(--lg-spring);
}
.lg-avatar-btn:hover {
  transform: scale(1.06);
}
.lg-avatar-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lg-post-author-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.lg-post-author-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.lg-post-author-name {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--lg-text) !important;
}
.lg-post-sub {
  font-size: 12px;
  color: var(--lg-text-tertiary);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.lg-post-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.lg-floor-pill {
  height: 28px;
  padding: 0 11px;
  border-radius: 9999px;
  border: 1px solid var(--lg-pill-border);
  background: var(--lg-pill-bg);
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text-secondary);
  font-family: var(--lg-font-mono);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease);
}
.lg-floor-pill:hover {
  background: var(--lg-accent-soft);
  color: var(--lg-accent);
}

/* Re-parented Post Body */
.lg-post-body {
  min-width: 0;
  overflow-x: auto;
}
.lg-post-body .tpc_content,
.lg-post-body .f14 {
  padding: 2px !important;
  margin: 0 !important;
  line-height: 1.8 !important;
  color: var(--lg-text) !important;
  font-family: var(--lg-font-sans) !important;
}
html[data-fontsize="small"] .lg-post-body .f14 { font-size: 13px !important; }
html[data-fontsize="medium"] .lg-post-body .f14 { font-size: 15px !important; }
html[data-fontsize="large"] .lg-post-body .f14 { font-size: 17px !important; }

.lg-post-body img {
  max-width: 100% !important;
  width: auto !important;
  height: auto !important;
  border-radius: 14px;
  margin: 8px 0;
  cursor: zoom-in;
  box-shadow: var(--lg-glass-shadow);
}
.lg-post-body img[src*="smile/"] {
  border-radius: 4px;
  margin: 0 2px;
  cursor: default;
  box-shadow: none;
}
.lg-post-body hr {
  border: none;
  border-top: 1px solid var(--lg-glass-divider);
  margin: 16px 0;
}
.lg-post-body .blockquote,
.lg-post-body .blockquote2,
.lg-post-body .blockquote3,
.lg-post-body .quote2 {
  width: 100% !important;
  background: var(--lg-glass-bg-subtle) !important;
  color: var(--lg-text-secondary) !important;
  border: 1px solid var(--lg-glass-border) !important;
  border-left: 3.5px solid var(--lg-accent) !important;
  border-radius: 16px !important;
  padding: 12px 15px !important;
  margin: 12px 0 !important;
  font-size: 13px !important;
}
.lg-post-body .blockquote3 .quote2,
.lg-post-body h6.quote2 {
  width: auto !important;
  background: transparent !important;
  border: none !important;
  border-left: none !important;
  border-radius: 0 !important;
  padding: 0 0 6px !important;
  margin: 0 !important;
  font-size: 11.5px !important;
  font-weight: 700 !important;
  color: var(--lg-accent) !important;
}
.lg-post-body .js-puremark-content {
  color: var(--lg-text-secondary) !important;
  font-size: 13px !important;
  padding: 6px 0 !important;
}
.lg-post-body .sigline {
  background: none !important;
  border-top: 1px dashed var(--lg-glass-divider) !important;
  margin: 14px 0 8px !important;
  height: 1px !important;
}
.lg-post-body .signature {
  color: var(--lg-text-secondary) !important;
  font-size: 12.5px !important;
  padding: 4px 0 0 !important;
}

/* Liquid Glass Purchase Card (replacing h6.quote.jumbotron) */
.lg-buy-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 14px 0;
  padding: 15px 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--lg-warning-soft), var(--lg-glass-bg-subtle));
  border: 1px solid color-mix(in srgb, var(--lg-warning) 35%, var(--lg-glass-border));
  box-shadow: var(--lg-glass-rim);
}
.lg-buy-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.lg-buy-icon {
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: var(--lg-warning);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.lg-buy-card.is-unlocked {
  background: linear-gradient(135deg, var(--lg-success-soft), var(--lg-glass-bg-subtle));
  border-color: color-mix(in srgb, var(--lg-success) 35%, var(--lg-glass-border));
}
.lg-buy-card.is-unlocked .lg-buy-icon {
  background: var(--lg-success);
}
.lg-buy-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border-radius: 9999px;
  background: var(--lg-success-soft);
  color: var(--lg-success);
  font-size: 12px;
  font-weight: 700;
}

/* Rating Marks */
.lg-marks-box {
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--lg-glass-bg-subtle);
  border: 1px solid var(--lg-glass-border);
  font-size: 12.5px;
  color: var(--lg-text-secondary);
}
.lg-marks-box .tips {
  float: none !important;
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
  color: inherit !important;
}
.lg-marks-box .tips li {
  width: auto !important;
  height: auto !important;
  float: none !important;
  display: inline-block;
  margin: 2px 10px 2px 0 !important;
}

.lg-post-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--lg-glass-divider);
}
.lg-post-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* Quick Reply Content Card (Tier 3 Content Layer) */
.lg-reply-card {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 24px;
  padding: 20px 22px;
}
.lg-reply-card form table,
.lg-reply-card form tr,
.lg-reply-card form td {
  background: transparent !important;
  border: none !important;
  color: var(--lg-text) !important;
}
.lg-reply-card input[type="text"],
.lg-reply-card textarea,
.lg-reply-card select {
  background: var(--lg-field-bg) !important;
  color: var(--lg-text) !important;
  border: 1px solid var(--lg-glass-border) !important;
  border-radius: 14px !important;
  padding: 10px 14px !important;
  font-family: var(--lg-font-sans) !important;
  font-size: 14px !important;
}
.lg-reply-card textarea {
  width: 100% !important;
  min-height: 140px;
  resize: vertical;
}
.lg-reply-card input[type="submit"],
.lg-reply-card .btn {
  height: 38px !important;
  padding: 0 22px !important;
  border-radius: 9999px !important;
  background: var(--lg-accent) !important;
  background-image: none !important;
  color: var(--lg-accent-fg) !important;
  border: none !important;
  font-weight: 600 !important;
  cursor: pointer !important;
}
.lg-reply-card .abtn {
  border-radius: 9999px !important;
  background: var(--lg-glass-bg-subtle) !important;
  color: var(--lg-text) !important;
  border: 1px solid var(--lg-glass-border) !important;
  padding: 5px 12px !important;
  font-family: var(--lg-font-sans) !important;
  text-decoration: none !important;
}

/* ============================================================================
 * FLOATING BOTTOM LIQUID GLASS ACTION PILL (Tier 1 Chrome, AUTO-CONDENSES ON SCROLL)
 * ========================================================================== */
.lg-dock {
  position: fixed;
  right: 22px;
  bottom: 20px;
  z-index: 380;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 9999px;
  background: var(--lg-lens-bg-strong);
  backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  -webkit-backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  border: 1px solid var(--lg-glass-border);
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow-elev);
  transition: transform 280ms var(--lg-spring), opacity 220ms var(--lg-ease), padding 220ms var(--lg-spring);
}
.lg-dock.is-condensed {
  transform: translateY(8px) scale(0.92);
  opacity: 0.78;
}
.lg-dock.is-condensed .lg-dock-cta-label {
  display: none;
}
.lg-dock:hover {
  transform: translateY(0) scale(1);
  opacity: 1;
}
.lg-dock:hover .lg-dock-cta-label {
  display: inline;
}
.lg-dock-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 16px;
  border-radius: 9999px;
  border: 1px solid var(--lg-pill-active-border);
  background: var(--lg-pill-active-bg);
  color: #FFFFFF !important;
  font-family: var(--lg-font-sans);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none !important;
  box-shadow: var(--lg-pill-active-shadow);
  transition: filter 140ms var(--lg-ease), box-shadow 140ms var(--lg-ease);
}

/* ============================================================================
 * OVERLAYS: SCRIM, SPOTLIGHT, CONTROL CENTER, SHEETS, POPOVERS, LIGHTBOX
 * ========================================================================== */
.lg-scrim {
  position: fixed;
  inset: 0;
  background: var(--lg-scrim);
  backdrop-filter: blur(6px);
  z-index: 500;
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms var(--lg-ease);
}
.lg-scrim.is-open {
  opacity: 1;
  pointer-events: auto;
}

/* All Boards Glass Sheet */
.lg-drawer {
  position: fixed;
  top: 14px;
  left: 14px;
  bottom: 14px;
  width: min(460px, calc(100vw - 28px));
  background: var(--lg-overlay-bg);
  backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  -webkit-backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  border: 1px solid var(--lg-glass-border);
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow-elev);
  border-radius: 28px;
  z-index: 520;
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
  transform: translateX(-115%);
  transition: transform 340ms var(--lg-spring);
}
.lg-drawer.is-open {
  transform: translateX(0);
}
.lg-drawer-body {
  flex: 1;
  overflow-y: auto;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.lg-drawer-board-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lg-drawer-subwrap {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding-left: 10px;
  margin: 2px 0 4px;
  border-left: 2px solid var(--lg-glass-border);
}
.lg-drawer-subchip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px;
  border-radius: 9999px;
  border: 1px solid var(--lg-pill-border);
  background: var(--lg-pill-bg);
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text-secondary) !important;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none !important;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease);
}
.lg-drawer-subchip:hover {
  background: var(--lg-accent-soft);
  color: var(--lg-accent) !important;
}

/* Spotlight Command Palette (Tier 1 Overlay) */
.lg-spotlight {
  position: fixed;
  top: 14vh;
  left: 50%;
  transform: translate(-50%, -12px) scale(0.96);
  width: min(620px, calc(100vw - 28px));
  max-height: 70vh;
  background: var(--lg-overlay-bg);
  backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  -webkit-backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  border: 1px solid var(--lg-glass-border);
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow-elev);
  border-radius: 26px;
  z-index: 560;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transition: transform 240ms var(--lg-spring), opacity 180ms var(--lg-ease);
}
.lg-spotlight.is-open {
  opacity: 1;
  pointer-events: auto;
  transform: translate(-50%, 0) scale(1);
}
.lg-spotlight-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  border-bottom: 1px solid var(--lg-glass-divider);
}
.lg-spotlight-input-row input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--lg-text);
  font-family: var(--lg-font-sans);
  font-size: 16px;
  font-weight: 500;
}
.lg-spotlight-input-row input::placeholder {
  color: var(--lg-text-tertiary);
}
.lg-spotlight-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.lg-spotlight-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 13px;
  border: none;
  background: transparent;
  color: var(--lg-text) !important;
  font-family: var(--lg-font-sans);
  font-size: 13.5px;
  cursor: pointer;
  text-align: left;
  text-decoration: none !important;
}
.lg-spotlight-item.is-focused,
.lg-spotlight-item:hover {
  background: var(--lg-accent-soft);
  color: var(--lg-accent) !important;
}
.lg-spotlight-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--lg-glass-divider);
  font-size: 11.5px;
  color: var(--lg-text-tertiary);
}

/* Settings Dialog & Popovers */
.lg-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -46%) scale(0.95);
  width: min(520px, calc(100vw - 28px));
  max-height: calc(100vh - 48px);
  background: var(--lg-overlay-bg);
  backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  -webkit-backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  border: 1px solid var(--lg-glass-border);
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow-elev);
  border-radius: 28px;
  padding: 22px 24px;
  z-index: 540;
  display: flex;
  flex-direction: column;
  gap: 14px;
  opacity: 0;
  pointer-events: none;
  overflow-y: auto;
  transition: opacity 180ms var(--lg-ease), transform 240ms var(--lg-spring);
}
.lg-dialog.is-open {
  opacity: 1;
  pointer-events: auto;
  transform: translate(-50%, -50%) scale(1);
}

.lg-popover {
  position: fixed;
  z-index: 550;
  min-width: 248px;
  max-width: min(360px, calc(100vw - 24px));
  background: var(--lg-overlay-bg);
  backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  -webkit-backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  color: var(--lg-text);
  border-radius: 22px;
  padding: 14px 16px;
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow-elev);
  border: 1px solid var(--lg-glass-border);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-6px) scale(0.94);
  transition: opacity 160ms var(--lg-ease), transform 220ms var(--lg-spring), visibility 0s linear 200ms;
}
.lg-popover.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0) scale(1);
  transition: opacity 160ms var(--lg-ease), transform 220ms var(--lg-spring), visibility 0s linear 0s;
}

.lg-cc-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 270px;
}
.lg-cc-block {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 12px;
  border-radius: 16px;
  background: var(--lg-glass-bg-subtle);
  border: 1px solid var(--lg-glass-border);
}
.lg-cc-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--lg-text-secondary);
}
.lg-cc-tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.lg-cc-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  border-radius: 13px;
  border: 1px solid var(--lg-pill-border);
  background: var(--lg-pill-bg);
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text-secondary);
  font-family: var(--lg-font-sans);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease), box-shadow 140ms var(--lg-ease);
}
.lg-cc-tile.is-on {
  background: var(--lg-pill-active-bg);
  color: #FFFFFF;
  border-color: var(--lg-pill-active-border);
  box-shadow: var(--lg-pill-active-shadow);
}

.lg-menu-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lg-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 11px;
  border-radius: 11px;
  border: none;
  background: transparent;
  color: var(--lg-text) !important;
  font-family: var(--lg-font-sans);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  text-decoration: none !important;
}
.lg-menu-item:hover {
  background: var(--lg-glass-bg-subtle);
}

/* Settings Swatches & Apple Switch */
.lg-swatch-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.lg-swatch-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 9px 4px;
  border-radius: 15px;
  border: 1.5px solid var(--lg-pill-border);
  background: var(--lg-pill-bg);
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease);
}
.lg-swatch-btn.is-active {
  border-color: var(--lg-pill-active-border);
  background: var(--lg-pill-active-bg);
  color: #FFFFFF;
  box-shadow: var(--lg-pill-active-shadow);
}
.lg-swatch-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.5), 0 2px 6px rgba(0, 0, 0, 0.16);
}
.lg-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--lg-glass-divider);
}
.lg-switch {
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: 9999px;
  border: none;
  background: rgba(120, 120, 128, 0.28);
  cursor: pointer;
  transition: background 220ms var(--lg-ease);
  flex-shrink: 0;
}
.lg-switch::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #FFFFFF;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22);
  transition: transform 240ms var(--lg-spring);
}
.lg-switch.is-on {
  background: var(--lg-success);
}
.lg-switch.is-on::after {
  transform: translateX(20px);
}

/* Lightbox (Apple Preview HUD) */
.lg-lightbox {
  position: fixed;
  inset: 0;
  z-index: 620;
  background: rgba(10, 12, 16, 0.84);
  backdrop-filter: blur(24px);
  display: none;
  flex-direction: column;
}
.lg-lightbox.is-open { display: flex; }
.lg-lightbox-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 14px auto 0;
  padding: 7px 10px 7px 16px;
  width: min(560px, calc(100vw - 28px));
  border-radius: 9999px;
  background: rgba(34, 36, 44, 0.56);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #FFFFFF;
}
.lg-lightbox-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 16px 64px;
  overflow: auto;
}
.lg-lightbox-stage img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 14px;
  object-fit: contain;
  transition: transform 240ms var(--lg-spring);
}
.lg-lightbox-stage img.is-zoomed {
  max-width: none;
  max-height: none;
  cursor: zoom-out;
}
.lg-lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(34, 36, 44, 0.52);
  backdrop-filter: blur(18px) saturate(170%);
  -webkit-backdrop-filter: blur(18px) saturate(170%);
  color: #FFFFFF;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lg-lightbox-nav:hover { background: rgba(60, 64, 76, 0.85); }
.lg-lightbox-prev { left: 16px; }
.lg-lightbox-next { right: 16px; }

/* Floating Glass Toast */
.lg-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translate(-50%, 140%);
  z-index: 700;
  background: var(--lg-overlay-bg);
  backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  -webkit-backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  color: var(--lg-text);
  border: 1px solid var(--lg-glass-border);
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow-elev);
  padding: 10px 18px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  transition: transform 280ms var(--lg-spring);
  pointer-events: none;
}
.lg-toast.is-open {
  transform: translate(-50%, 0);
}

/* ============================================================================
 * POST COMPOSER, REDIRECT, USER CENTER, INBOX, TASKS, SEARCH, LEGACY HOST
 * ========================================================================== */
.lg-post-rule-banner {
  padding: 12px 18px;
  border-radius: 20px;
  background: var(--lg-warning-soft);
  border: 1px solid color-mix(in srgb, var(--lg-warning) 35%, transparent);
  color: var(--lg-text);
  font-size: 13px;
  line-height: 1.65;
}
.lg-post-rule-banner:empty,
.lg-post-rule-banner:has(#postrule:empty) {
  display: none;
}
.lg-composer-card {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 26px;
  padding: 20px 22px;
}
.lg-composer-card .t {
  background: transparent !important;
  border: none !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}
.lg-composer-card .t > div[style*="max-width:1240px"] {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
}
.lg-composer-card .lg-composer-title-host {
  margin: 0 0 12px !important;
  height: auto !important;
  width: 100% !important;
}
.lg-composer-card .lg-composer-title-box {
  float: none !important;
  width: 100% !important;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  background: var(--lg-field-bg) !important;
  border: 1px solid var(--lg-glass-border) !important;
  border-radius: 16px !important;
  padding: 8px 14px !important;
}
.lg-composer-card input[name="atc_title"] {
  flex: 1;
  min-width: 220px;
  width: 100% !important;
  border: none !important;
  background: transparent !important;
  color: var(--lg-text) !important;
  font-family: var(--lg-font-sans) !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  outline: none !important;
  padding: 4px 0 !important;
}
.lg-composer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 232px;
  gap: 16px;
  align-items: start;
}
.lg-composer-card #editor-main { padding-left: 0 !important; min-width: 0 !important; }
.lg-composer-card #editor-side { position: static !important; width: 100% !important; margin-top: 0 !important; z-index: 10 !important; }
.lg-composer-card #editor-side > div { width: 100% !important; }
.lg-composer-card #smiliebox {
  background: var(--lg-glass-bg-subtle) !important;
  border: 1px solid var(--lg-glass-border) !important;
  border-radius: 18px !important;
  padding: 10px !important;
  color: var(--lg-text) !important;
}
.lg-composer-card #smiliebox legend { font-size: 12.5px; font-weight: 700; color: var(--lg-accent); padding: 0 8px; }
.lg-composer-card #editor-content {
  margin-top: 0 !important;
  border: 1px solid var(--lg-glass-border) !important;
  border-radius: 20px !important;
  background: var(--lg-field-bg) !important;
  overflow: hidden;
}
.lg-composer-card #editor-tab { position: static !important; margin: 0 !important; display: inline-flex; gap: 4px; padding: 10px 12px 6px; }
.lg-composer-card #editor-tab span {
  float: none !important; width: auto !important; height: auto !important; line-height: 1.4 !important; margin: 0 !important;
  padding: 5px 13px !important; border-radius: 9999px !important;
  border: 1px solid var(--lg-glass-border) !important;
  background: var(--lg-glass-bg-subtle) !important;
  color: var(--lg-text-secondary) !important;
  font-family: var(--lg-font-sans) !important; font-size: 12.5px !important; font-weight: 600 !important;
}
.lg-composer-card #editor-tab span.buttonPressed {
  background: var(--lg-accent) !important; color: var(--lg-accent-fg) !important; border-color: transparent !important;
}
.lg-composer-card #editor-tool { position: static !important; margin: 0 !important; display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 10px; }
.lg-composer-card #editor-tool span {
  float: none !important; height: auto !important; line-height: 1.4 !important; margin: 0 !important;
  padding: 4px 12px !important; border-radius: 9999px !important;
  border: 1px solid var(--lg-glass-border) !important;
  background: var(--lg-glass-bg-subtle) !important; font-size: 12px !important;
}
.lg-composer-card #editor-tool span a { color: var(--lg-text) !important; text-decoration: none !important; }
.lg-composer-card #editor-button {
  float: none !important; padding: 10px 12px !important;
  background: var(--lg-glass-bg-subtle) !important;
  border-top: 1px solid var(--lg-glass-divider) !important;
  border-bottom: 1px solid var(--lg-glass-divider) !important;
}
.lg-composer-card .editor-button { display: inline-block; background: rgba(255, 255, 255, 0.85); padding: 4px 6px; border-radius: 10px; color: #222; }
.lg-composer-card .wysiwyg { padding: 0 !important; }
.lg-composer-card textarea#textarea {
  width: 100% !important; min-height: 320px; padding: 14px 16px !important; border: none !important; outline: none !important;
  background: transparent !important; color: var(--lg-text) !important;
  font-family: var(--lg-font-sans) !important; font-size: 15px !important; line-height: 1.7 !important; resize: vertical;
}
.lg-composer-card .editor-mwidth { width: 100% !important; max-width: none !important; }
.lg-composer-card .editor-mwidth > div[style*="margin-left"] { margin-left: 0 !important; }
.lg-composer-card #post-option > .editor-mwidth > div { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.lg-composer-card #post-option span {
  width: auto !important; float: none !important; display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; border-radius: 9999px; background: var(--lg-glass-bg-subtle); color: var(--lg-text); font-size: 12.5px;
}
.lg-composer-card tr.tr3 th { border-bottom: 1px solid var(--lg-glass-divider) !important; padding: 12px 4px !important; color: var(--lg-text) !important; }
.lg-composer-card .input, .lg-composer-card select {
  background: var(--lg-field-bg) !important; color: var(--lg-text) !important;
  border: 1px solid var(--lg-glass-border) !important; border-radius: 10px !important; padding: 5px 8px !important;
}
.lg-composer-card input[type="submit"], .lg-composer-card .btn {
  height: 40px !important; padding: 0 26px !important; border-radius: 9999px !important;
  background: var(--lg-accent) !important; background-image: none !important; color: var(--lg-accent-fg) !important;
  border: none !important; font-size: 14px !important; font-weight: 600 !important; cursor: pointer !important;
}
.lg-composer-card .btn3, .lg-composer-card .abtn3 {
  display: inline-flex; align-items: center; justify-content: center; height: 36px; padding: 0 16px !important;
  border-radius: 9999px !important; background: var(--lg-glass-bg-subtle) !important; color: var(--lg-text) !important;
  border: 1px solid var(--lg-glass-border) !important; text-decoration: none !important; font-weight: 600 !important; margin-left: 8px !important;
}
@media (max-width: 960px) { .lg-composer-grid { grid-template-columns: 1fr; } }

/* Redirect Status Screen */
.lg-status-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  z-index: 1;
}
.lg-status-card {
  width: min(440px, 100%);
  background: var(--lg-overlay-bg);
  backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  -webkit-backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  border: 1px solid var(--lg-glass-border);
  box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow-elev);
  border-radius: 30px;
  padding: 32px 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
}
.lg-status-icon {
  width: 60px;
  height: 60px;
  border-radius: 20px;
  background: var(--lg-accent-soft);
  color: var(--lg-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lg-status-icon .lg-icon { width: 30px; height: 30px; }
.lg-status-progress {
  width: 100%;
  height: 4px;
  border-radius: 9999px;
  background: var(--lg-glass-bg-subtle);
  overflow: hidden;
}
.lg-status-progress-bar {
  height: 100%;
  width: 45%;
  border-radius: 9999px;
  background: var(--lg-accent);
  animation: lgIndeterminate 1.2s ease-in-out infinite;
}
@keyframes lgIndeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(260%); }
}

/* User Center (u.php) */
.lg-u-hero {
  background: linear-gradient(135deg, color-mix(in srgb, var(--lg-accent-soft) 90%, var(--lg-surface-bg)), var(--lg-surface-bg));
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 26px;
  padding: 20px 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.lg-u-identity { display: flex; align-items: center; gap: 16px; min-width: 0; }
.lg-u-avatar {
  width: 74px; height: 74px; border-radius: 22px; object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.55); box-shadow: var(--lg-glass-shadow); flex-shrink: 0;
}
.lg-u-title { margin: 0; font-size: clamp(20px, 2.2vw, 25px); font-weight: 800; letter-spacing: -0.02em; }
.lg-u-honor-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 6px; font-size: 13px; color: var(--lg-text-secondary); }
.lg-u-honor-row #honor { color: var(--lg-text-secondary) !important; }
.lg-u-honor-row #sethonor img { display: none !important; }
.lg-u-tabs {
  display: flex; flex-wrap: wrap; gap: 6px; padding: 6px; border-radius: 9999px;
  background: var(--lg-local-glass-bg);
  backdrop-filter: blur(14px) saturate(170%);
  -webkit-backdrop-filter: blur(14px) saturate(170%);
  border: 1px solid var(--lg-pill-border);
  box-shadow: var(--lg-glass-rim), var(--lg-pill-shadow);
}
.lg-u-tab {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center; height: 34px; padding: 0 15px; border-radius: 9999px;
  font-size: 13px; font-weight: 600; color: var(--lg-text-secondary) !important; text-decoration: none !important;
  border: 1px solid transparent;
  background: transparent;
  box-shadow: none;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease), box-shadow 140ms var(--lg-ease);
}
.lg-u-tab:hover {
  background: var(--lg-pill-bg-hover);
  border-color: var(--lg-pill-border);
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text) !important;
}
.lg-u-tab.is-active {
  background: var(--lg-pill-active-bg);
  border-color: var(--lg-pill-active-border);
  box-shadow: var(--lg-pill-active-shadow);
  color: #FFFFFF !important;
}
.lg-u-grid { display: grid; grid-template-columns: minmax(0, 1fr) 310px; gap: 16px; align-items: start; }
.lg-u-main-host, .lg-u-side-host { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.lg-u-main-host.is-panel, .lg-u-side-host.is-panel {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 24px;
  padding: 18px 20px;
}
.lg-u-main-host #u-contentmain, .lg-u-side-host #u-contentside, .lg-u-main-host #u-content {
  width: 100% !important; float: none !important; margin: 0 !important; padding: 0 !important; display: flex; flex-direction: column; gap: 12px;
  background: transparent !important; border: none !important;
}
.lg-u-main-host .u-content-66, .lg-u-side-host .u-content-33 {
  float: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important;
}
/* Neutralize legacy PhpWind u.php subpage inline boxes, white headers, sprites & dashed dividers */
.lg-u-main-host :is(div, table, tbody, tr, th, td, ul, ol, li, dl, dt, dd, h2, h3, h4, h5, p, span, .u-h2, .u-h3, .u-h5, .u-side-box, .u-tab, .u-ul, .u-list, .t-list, .current, .bdbA, .bdbdash, #u-fav-cate, .fav, .u-table):not(.u-box):not(#minifeed):not(#new-reply):not(#new-topic):not(.lg-btn):not(.lg-badge):not(.lg-chip):not(.lg-page-pill):not(.lg-u-tab):not(.lg-seg-btn) {
  background-color: transparent !important;
  background-image: none !important;
}
.lg-u-main-host .gray, .lg-u-main-host .gray2, .lg-u-main-host .gray3, .lg-u-main-host .f9, .lg-u-main-host .f10, .lg-u-main-host .f12,
.lg-u-side-host .gray, .lg-u-side-host .gray2, .lg-u-side-host .gray3, .lg-u-side-host .f9, .lg-u-side-host .f10, .lg-u-side-host .f12 {
  color: var(--lg-text-secondary) !important;
}
.lg-u-side-host :is(div, table, tbody, tr, th, td, ul, ol, li, dl, dt, dd, h2, h3, h4, h5, p, span, .u-h2, .u-h3, .u-h5, .u-side-box, .u-tab, .u-ul, .u-list, .current, .bdbA, .bdbdash, #u-fav-cate, .fav, .u-table):not(.u-box):not(#new-topic):not(.lg-btn):not(.lg-badge):not(.lg-chip):not(.lg-u-tab):not(.lg-seg-btn) {
  background-color: transparent !important;
  background-image: none !important;
}
.lg-u-main-host .u-h2, .lg-u-side-host .u-h2,
.lg-u-side-host h2, .lg-u-side-host h3, .lg-u-side-host .u-h3,
.lg-u-main-host h5.u-h5, .lg-u-side-host h5.u-h5 {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  background: transparent !important; background-image: none !important;
  border: none !important; border-bottom: 1px solid var(--lg-glass-divider) !important;
  padding: 0 0 10px !important; margin: 0 0 12px !important;
  font-size: 15px !important; font-weight: 700 !important; color: var(--lg-text) !important;
  height: auto !important; line-height: 1.4 !important;
}
.lg-u-main-host h5.u-h5 span, .lg-u-side-host h5.u-h5 span {
  background: transparent !important; background-image: none !important;
  color: var(--lg-text) !important; padding: 0 !important; float: none !important;
}
.lg-u-main-host h5.u-h5 a, .lg-u-side-host h5.u-h5 a {
  background: var(--lg-accent-soft) !important; background-image: none !important;
  border: none !important; border-radius: 9999px !important; padding: 3px 10px !important;
  font-size: 12px !important; font-weight: 600 !important; color: var(--lg-accent) !important; float: none !important;
  text-decoration: none !important;
}
.lg-u-main-host h5.u-h5 a:hover, .lg-u-side-host h5.u-h5 a:hover {
  filter: brightness(1.08);
}
.lg-u-main-host #minifeed, .lg-u-main-host #new-reply, .lg-u-side-host #new-topic, .lg-u-main-host .u-box, .lg-u-side-host .u-box {
  background: var(--lg-surface-bg) !important;
  border: 1px solid var(--lg-surface-border) !important; box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 22px !important; padding: 18px 20px !important; margin: 0 !important;
}
.lg-u-main-host dl.feed-list, .lg-u-main-host dl.article-list, .lg-u-side-host dl.article-list {
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  color: var(--lg-text) !important;
}
.lg-u-main-host dl.feed-list dt, .lg-u-main-host dl.article-list dt, .lg-u-side-host dl.article-list dt {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 9px 10px !important; border-radius: 12px !important;
  border: none !important; border-bottom: 1px solid var(--lg-glass-divider) !important;
  transition: background 140ms var(--lg-ease);
}
.lg-u-main-host dl.feed-list:last-child dt,
.lg-u-main-host dl.article-list:last-child dt,
.lg-u-side-host dl.article-list:last-child dt {
  border-bottom: none !important;
}
.lg-u-main-host dl.feed-list dd, .lg-u-main-host dl.article-list dd, .lg-u-side-host dl.article-list dd,
.lg-u-main-host .bdbA, .lg-u-main-host .bdbdash, .lg-u-side-host .bdbA, .lg-u-side-host .bdbdash {
  border-color: var(--lg-glass-divider) !important;
  border-style: solid !important;
}
.lg-u-main-host dl.feed-list dt:last-of-type, .lg-u-main-host dl.article-list dt:last-of-type, .lg-u-side-host dl.article-list dt:last-of-type {
  border-bottom: none !important;
}
.lg-u-main-host table.u-table {
  width: 100% !important; border-collapse: separate !important; border-spacing: 0 !important; margin: 0 !important;
}
.lg-u-main-host table tr, .lg-u-main-host ul.u-ul li, .lg-u-main-host ul.u-list li,
.lg-u-side-host ul li {
  border-bottom: 1px solid var(--lg-glass-divider) !important;
  border-top: none !important;
}
.lg-u-side-host ul li {
  padding: 9px 10px !important; border-radius: 12px !important; transition: background 160ms var(--lg-ease);
}
.lg-u-main-host dl.feed-list dt:hover,
.lg-u-main-host dl.article-list dt:hover,
.lg-u-main-host table.u-table tr:hover,
.lg-u-side-host ul li:hover {
  background: var(--lg-glass-bg-subtle) !important;
}
.lg-u-main-host table.u-table td, .lg-u-main-host table.u-table th {
  padding: 10px 8px !important; color: var(--lg-text) !important; text-align: left !important;
  vertical-align: middle !important; border-bottom: 1px solid var(--lg-glass-divider) !important; font-weight: 500;
}
.lg-u-main-host table.u-table th a { font-weight: 600; }
.lg-u-main-host dl.article-list a,
.lg-u-main-host dl.feed-list a,
.lg-u-main-host table.u-table a,
.lg-u-side-host dl.article-list a {
  color: var(--lg-text) !important;
}
.lg-u-main-host dl.article-list a:hover,
.lg-u-main-host dl.feed-list a:hover,
.lg-u-main-host table.u-table a:hover {
  color: var(--lg-accent) !important;
}
.lg-u-main-host #u-profile table.u-table td, .lg-u-side-host #u-profile-s table.u-table td {
  color: var(--lg-text-secondary) !important; width: 112px; font-weight: 500 !important;
}
.lg-u-main-host #u-profile table.u-table th, .lg-u-side-host #u-profile-s table.u-table th {
  color: var(--lg-text) !important; font-weight: 600 !important;
}
.lg-u-main-host form center {
  margin-top: 14px !important; padding-top: 12px; border-top: 1px solid var(--lg-glass-divider);
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px 12px;
}
.lg-u-side-host #u-fav-cate table.u-table {
  width: 100% !important; margin-left: 0 !important; border-collapse: separate !important; border-spacing: 0 5px !important;
}
.lg-u-side-host #u-fav-cate td.fav {
  padding: 0 !important; border: none !important; background: transparent !important;
}
.lg-u-side-host #u-fav-cate td.fav a {
  display: flex; align-items: center; padding: 8px 12px !important; border-radius: 12px !important;
  background: var(--lg-pill-bg) !important;
  border: 1px solid var(--lg-pill-border) !important;
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text) !important; font-size: 13px; font-weight: 500; text-decoration: none !important;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease);
}
.lg-u-side-host #u-fav-cate td.fav a:hover {
  background: var(--lg-pill-bg-hover) !important;
}
.lg-u-side-host #u-fav-cate td.fav.current a {
  background: var(--lg-pill-active-bg) !important; border-color: var(--lg-pill-active-border) !important;
  box-shadow: var(--lg-pill-active-shadow);
  color: #FFFFFF !important; font-weight: 650;
}
.lg-u-side-host ul { list-style: none !important; padding: 0 !important; margin: 0 !important; display: flex; flex-direction: column; gap: 3px; }
.lg-u-side-host ul li { display: flex; align-items: center; gap: 8px; }
.lg-u-side-host ul li a { color: var(--lg-text) !important; font-weight: 500; }
.lg-u-main-host .pages { margin-top: 12px !important; float: none !important; }
.lg-u-main-host .pages ul { display: flex !important; flex-wrap: wrap; gap: 5px; list-style: none !important; padding: 0 !important; margin: 0 !important; }
.lg-u-main-host .pages li { display: inline-flex; align-items: center; }
.lg-u-main-host .pages li a, .lg-u-main-host .pages li b {
  display: inline-flex; align-items: center; justify-content: center; min-width: 30px; height: 30px; padding: 0 10px;
  border-radius: 9999px; font-size: 12.5px; font-weight: 600; text-decoration: none !important;
  border: 1px solid var(--lg-glass-border) !important; background: var(--lg-glass-bg-subtle) !important; color: var(--lg-text-secondary) !important;
}
.lg-u-main-host .pages li b {
  background: var(--lg-accent) !important; color: var(--lg-accent-fg) !important; border-color: transparent !important;
}

/* Auth Card (login.php / register.php, Tier 3 Content Layer) */
.lg-auth-card {
  width: min(540px, 100%);
  margin: 26px auto;
  background: var(--lg-surface-bg-strong);
  border: 1px solid var(--lg-surface-border);
  box-shadow: var(--lg-surface-rim), var(--lg-glass-shadow-elev);
  border-radius: 28px;
  padding: 26px 28px;
}
.lg-auth-head {
  display: flex; align-items: center; gap: 14px; margin-bottom: 18px; padding-bottom: 14px;
  border-bottom: 1px solid var(--lg-glass-divider);
}
.lg-auth-card .t, .lg-auth-card table {
  width: 100% !important; background: transparent !important; border: none !important; margin: 0 !important; padding: 0 !important;
}
.lg-auth-card table tr th, .lg-auth-card table tr td {
  height: auto !important; line-height: 1.55 !important; padding: 10px 8px !important;
  background: transparent !important; color: var(--lg-text) !important;
  border-bottom: 1px solid var(--lg-glass-divider) !important; vertical-align: middle !important;
}
.lg-auth-card table tr th { width: 32%; text-align: left !important; font-weight: 600 !important; color: var(--lg-text-secondary) !important; }
.lg-auth-card input[type="text"], .lg-auth-card input[type="password"] {
  width: min(260px, 100%) !important; background: var(--lg-field-bg) !important; color: var(--lg-text) !important;
  border: 1px solid var(--lg-glass-border) !important; border-radius: 12px !important; padding: 8px 12px !important; font-size: 13.5px !important;
}
.lg-auth-card input[type="submit"], .lg-auth-card .btn {
  width: auto !important; min-width: 120px; height: 38px !important; padding: 0 24px !important;
  border-radius: 9999px !important; background: var(--lg-accent) !important; color: var(--lg-accent-fg) !important;
  border: none !important; font-weight: 600 !important; cursor: pointer !important;
}

/* Settings & Userpay Center (profile.php / userpay.php, Tier 3 Content Layer) */
.lg-settings-host {
  background: var(--lg-surface-bg) !important;
  border: 1px solid var(--lg-surface-border) !important; box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 24px !important; padding: 20px 22px !important; min-width: 0; overflow-x: auto;
}
.lg-settings-host #set-content, .lg-settings-host #set-content-wrap {
  width: 100% !important; float: none !important; margin: 0 !important; padding: 0 !important;
  background: transparent !important; border: none !important; color: var(--lg-text) !important;
}
.lg-settings-host .set-content-left, .lg-settings-host .set-content-right {
  float: none !important; width: 100% !important; margin: 0 !important;
}
.lg-settings-host #set-content-wrap.lg-has-split {
  display: grid !important; grid-template-columns: minmax(0, 1fr) 300px; gap: 18px; align-items: start;
}
.lg-settings-host #set-content-wrap.lg-has-split .set-content-left { order: 1; }
.lg-settings-host #set-content-wrap.lg-has-split .set-content-right { order: 2; }
.lg-settings-host .lg-pay-overview-grid {
  display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; margin: 14px 0 0 !important;
}
.lg-settings-host .lg-pay-overview-grid > div {
  width: 100% !important; float: none !important; padding: 0 !important; margin: 0 !important;
}
.lg-settings-host .lg-pay-overview-grid > div > div {
  width: 100% !important; float: none !important;
}
.lg-settings-host .set-tab-table {
  background: transparent !important; background-image: none !important; margin-bottom: 10px;
}
.lg-settings-host .set-tab-table table { width: auto !important; border-collapse: separate !important; border-spacing: 6px 0 !important; }
.lg-settings-host .set-tab-table td {
  padding: 6px 14px !important; border-radius: 9999px !important; border: 1px solid var(--lg-pill-border) !important;
  background: var(--lg-pill-bg) !important;
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text-secondary) !important; font-weight: 600 !important; font-size: 12.5px !important;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease);
}
.lg-settings-host .set-tab-table td a { color: inherit !important; text-decoration: none !important; }
.lg-settings-host .set-tab-table td.current, .lg-settings-host .set-tab-table td[class*="current"] {
  background: var(--lg-pill-active-bg) !important; color: #FFFFFF !important; border-color: var(--lg-pill-active-border) !important;
  box-shadow: var(--lg-pill-active-shadow);
}
.lg-settings-host .set-tab-box {
  background: var(--lg-glass-bg-subtle) !important; border: 1px solid var(--lg-glass-border) !important;
  border-radius: 18px !important; padding: 14px 16px !important;
}
.lg-settings-host .set-table1 td, .lg-settings-host .set-table2 td, .lg-settings-host .set-table2 th {
  border-bottom: 1px solid var(--lg-glass-divider) !important; color: var(--lg-text) !important; padding: 8px 6px !important;
}
.lg-settings-host .bdbA, .lg-settings-host .bdbdash { border-bottom: 1px solid var(--lg-glass-divider) !important; }
.lg-settings-host .gray3, .lg-settings-host .color8, .lg-settings-host .s3 { color: var(--lg-text-secondary) !important; }
.lg-settings-host img.pic { border-radius: 20px; border: 2px solid var(--lg-glass-border); object-fit: cover; }
.lg-settings-host #sethonor img { display: none !important; }
.lg-settings-host .face { background: transparent !important; }
@media (max-width: 960px) {
  .lg-settings-host #set-content-wrap.lg-has-split,
  .lg-settings-host .lg-pay-overview-grid { grid-template-columns: 1fr !important; }
}

/* Message Inbox (message.php, Tier 3 Content + Tier 2 Nav) */
.lg-inbox-grid { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 16px; align-items: start; }
.lg-inbox-sidebar {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border); box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 22px; padding: 12px; display: flex; flex-direction: column; gap: 6px;
}
.lg-inbox-nav-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 13px; border-radius: 9999px;
  border: 1px solid transparent;
  background: transparent;
  box-shadow: none;
  color: var(--lg-text-secondary) !important; font-size: 13.5px; font-weight: 600; text-decoration: none !important;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease);
}
.lg-inbox-nav-item:hover { background: var(--lg-pill-bg-hover); border-color: var(--lg-pill-border); color: var(--lg-text) !important; }
.lg-inbox-nav-item.is-active {
  background: var(--lg-pill-active-bg);
  border-color: var(--lg-pill-active-border);
  box-shadow: var(--lg-pill-active-shadow);
  color: #FFFFFF !important;
}
.lg-inbox-host {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border); box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 24px; padding: 20px 22px; min-width: 0; overflow-x: auto;
}
.lg-inbox-host #set-content, .lg-inbox-host #set-content-wrap { width: 100% !important; float: none !important; margin: 0 !important; padding: 0 !important; background: transparent !important; border: none !important; }
.lg-inbox-host .set-tab-table td {
  padding: 7px 14px !important; border-radius: 9999px !important; cursor: pointer; font-weight: 600;
  background: var(--lg-pill-bg) !important;
  box-shadow: var(--lg-pill-shadow);
  color: var(--lg-text-secondary) !important; border: 1px solid var(--lg-pill-border) !important;
  transition: background 140ms var(--lg-ease), border-color 140ms var(--lg-ease), color 140ms var(--lg-ease);
}
.lg-inbox-host .set-tab-table td[class*="current"] {
  background: var(--lg-pill-active-bg) !important; color: #FFFFFF !important; border-color: var(--lg-pill-active-border) !important;
  box-shadow: var(--lg-pill-active-shadow);
}
.lg-inbox-host .tr3 td, .lg-inbox-host .tr2 td { background: transparent !important; color: var(--lg-text) !important; border-bottom: 1px solid var(--lg-glass-divider) !important; padding: 10px 8px !important; }

/* Tasks (plugin.php?H_name-tasks) */
.lg-task-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 14px; }
.lg-task-card {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border); box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 24px; padding: 18px 20px; display: flex; flex-direction: column; gap: 12px;
  transition: transform 180ms var(--lg-spring);
}
.lg-task-card:hover { transform: translateY(-2px); }
.lg-task-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.lg-task-icon-box {
  width: 44px; height: 44px; border-radius: 14px; background: var(--lg-accent-soft); color: var(--lg-accent);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;
}
.lg-task-icon-box img { width: 30px; height: 30px; object-fit: contain; }
.lg-task-title { margin: 0; font-size: 15.5px; font-weight: 700; }
.lg-task-desc { font-size: 13px; line-height: 1.65; color: var(--lg-text-secondary); }
.lg-task-foot {
  margin-top: auto; padding-top: 12px; border-top: 1px solid var(--lg-glass-divider);
  display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
}
.lg-task-action-host a, .lg-task-action-host input[type="button"], .lg-task-action-host input[type="submit"], .lg-task-action-host button {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 15px;
  border-radius: 9999px; background: var(--lg-accent); color: var(--lg-accent-fg) !important; font-size: 12.5px; font-weight: 600; border: none; text-decoration: none !important; cursor: pointer;
}

/* Search Form & Legacy Generic Compatibility (Tier 3 Content Layer) */
.lg-search-form-card {
  background: var(--lg-surface-bg);
  border: 1px solid var(--lg-surface-border); box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 26px; padding: 20px 22px;
}
.lg-search-form-card table, .lg-search-form-card tbody, .lg-search-form-card tr { background: transparent !important; }
.lg-search-form-card th, .lg-search-form-card td {
  background: transparent !important; color: var(--lg-text) !important;
  border-bottom: 1px solid var(--lg-glass-divider) !important; padding: 11px 10px !important;
}
.lg-search-form-card input[type="text"], .lg-search-form-card select {
  background: var(--lg-field-bg) !important; color: var(--lg-text) !important;
  border: 1px solid var(--lg-glass-border) !important; border-radius: 12px !important; padding: 7px 11px !important;
}
.lg-search-form-card input[type="submit"], .lg-search-form-card input[type="reset"] {
  height: 38px; padding: 0 20px !important; border-radius: 9999px !important; font-weight: 600 !important; border: none !important; cursor: pointer !important;
}
.lg-search-form-card input[type="submit"] { background: var(--lg-accent) !important; color: var(--lg-accent-fg) !important; }
.lg-search-form-card input[type="reset"] { background: var(--lg-glass-bg-subtle) !important; color: var(--lg-text) !important; margin-left: 8px; }

.lg-generic-host #breadcrumbs { display: none !important; }
.lg-generic-host .t, .lg-generic-host .t5 {
  background: var(--lg-surface-bg) !important;
  border: 1px solid var(--lg-surface-border) !important; box-shadow: var(--lg-surface-rim), var(--lg-surface-shadow);
  border-radius: 22px !important; padding: 12px !important; margin-bottom: 14px !important;
}
.lg-generic-host .h, .lg-generic-host .h2, .lg-generic-host .h3 {
  background: var(--lg-glass-bg-subtle) !important; background-image: none !important; color: var(--lg-text) !important;
  border-color: var(--lg-glass-divider) !important; border-radius: 12px !important; padding: 6px 14px !important;
}
.lg-generic-host .tr1, .lg-generic-host .tr2, .lg-generic-host .tr3,
.lg-generic-host .f_one, .lg-generic-host .f_two, .lg-generic-host .t_one, .lg-generic-host .t_two {
  background: transparent !important; background-image: none !important; color: var(--lg-text) !important;
}
.lg-generic-host .tr3 td, .lg-generic-host .tr3 th, .lg-generic-host .tr1 td.td1 {
  border-bottom: 1px solid var(--lg-glass-divider) !important;
}
.lg-generic-host input[type="text"], .lg-generic-host input[type="password"], .lg-generic-host textarea, .lg-generic-host select {
  background: var(--lg-field-bg) !important; color: var(--lg-text) !important;
  border: 1px solid var(--lg-glass-border) !important; border-radius: 12px !important; padding: 6px 10px !important;
}
.lg-generic-host .btn, .lg-generic-host input[type="submit"], .lg-generic-host input[type="button"] {
  background: var(--lg-accent) !important; background-image: none !important; color: var(--lg-accent-fg) !important;
  border: none !important; border-radius: 9999px !important; padding: 7px 18px !important; font-weight: 600 !important; cursor: pointer !important;
}
.lg-generic-host .abtn, .lg-generic-host .btn2 {
  background: var(--lg-glass-bg-subtle) !important; color: var(--lg-text) !important;
  border: 1px solid var(--lg-glass-border) !important; border-radius: 9999px !important; padding: 5px 12px !important;
}

/* Native pw_ajax popups & peacemaker */
#pw_box, .menu {
  background: var(--lg-overlay-bg) !important;
  backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  -webkit-backdrop-filter: var(--lg-refract-filter, var(--lg-glass-blur-heavy));
  color: var(--lg-text) !important;
  border: 1px solid var(--lg-glass-border) !important;
  border-radius: 18px !important;
  box-shadow: var(--lg-glass-shadow-elev) !important;
  padding: 8px !important;
  z-index: 650 !important;
}
#peacemakerconfig { display: inline-flex !important; align-items: center; gap: 6px; color: var(--lg-accent) !important; font-weight: 600 !important; }
#peacemakerconfig > div { position: static !important; display: flex !important; flex-direction: column; gap: 6px; background: transparent !important; border: none !important; margin-top: 8px; }
#peacemakerconfig > div > div { background: var(--lg-glass-bg-subtle) !important; color: var(--lg-text) !important; border-radius: 11px !important; padding: 8px 12px !important; cursor: pointer; }
#peacemakerconfig > div > div:hover { background: var(--lg-accent-soft) !important; }
.blackListPlan { position: static !important; width: 100% !important; margin-top: 8px; background: var(--lg-field-bg) !important; border: 1px solid var(--lg-glass-border) !important; border-radius: 14px !important; padding: 10px !important; }

/* Responsive Breakpoints */
@media (max-width: 960px) {
  .lg-u-grid, .lg-inbox-grid, .lg-task-grid { grid-template-columns: 1fr; }
  .lg-sidebar {
    transform: translateX(-115%);
    opacity: 0;
    pointer-events: none;
  }
  #sp-lg-shell.mobile-sidebar-open .lg-sidebar {
    transform: translateX(0);
    opacity: 1;
    pointer-events: auto;
    box-shadow: var(--lg-glass-rim), var(--lg-glass-shadow-elev);
  }
  .lg-workspace { margin-left: 0 !important; }
  .lg-topbar { padding: 0 12px; gap: 8px; }
  .lg-breadcrumbs, .lg-kbd-btn { display: none; }
  .lg-topbar-home-pill { display: inline-flex; }
  .lg-main { padding: 14px 12px 92px; }
  .lg-board-grid { grid-template-columns: 1fr; }
  .lg-thread-row { grid-template-columns: 34px minmax(0, 1fr); }
  .lg-thread-stats { grid-column: 2; flex-direction: row; align-items: center; justify-content: flex-start; gap: 10px; }
  .lg-dock { right: 12px; bottom: 14px; }
}
`;

  function injectStyles() {
    document.documentElement.classList.add('sp-lg-loading');
    applyThemeTokens();
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(CSS_TEXT);
    } else {
      const style = document.createElement('style');
      style.id = 'sp-lg-styles';
      style.textContent = CSS_TEXT;
      (document.head || document.documentElement).appendChild(style);
    }
  }

  injectStyles();

  // Failsafe so body never remains invisible
  setTimeout(() => {
    document.documentElement.classList.remove('sp-lg-loading');
    document.documentElement.classList.add('sp-lg-ready');
  }, 1200);

  /* ============================================================================
   * 3.5. CHROMIUM LIQUID GLASS OPTICS ENGINE
   *      (Canvas SDF Displacement Map + RGB Prism Dispersion + Schlick Fresnel)
   * ========================================================================== */

  LiquidGlassOptics = (() => {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const XLINK_NS = 'http://www.w3.org/1999/xlink';

    // Tier 1 Floating Chrome & Overlay Selectors (strictly single-digit active SVG <filter>s)
    const LENS_SELECTORS = [
      '.lg-sidebar',
      '.lg-topbar > .lg-topbar-cluster',
      '.lg-topbar > .lg-search-capsule',
      '.lg-dock'
    ].join(',');

    const OVERLAY_SELECTORS = [
      '.lg-popover',
      '.lg-spotlight',
      '.lg-dialog',
      '.lg-drawer',
      '.lg-toast',
      '.lg-status-card',
      '#pw_box',
      '.menu'
    ].join(',');

    const STRENGTH_MULT = { subtle: 0.65, standard: 1.0, strong: 1.38 };
    const PREBLUR_TABLE = {
      clear: { lens: 1.6, overlay: 8.0 },
      standard: { lens: 2.5, overlay: 12.0 },
      tinted: { lens: 4.6, overlay: 16.5 }
    };
    const SCALE_TABLE = {
      clear: { lens: 28, overlay: 26 },
      standard: { lens: 24, overlay: 22 },
      tinted: { lens: 16, overlay: 16 }
    };
    const IOR_TABLE = { clear: 1.56, standard: 1.50, tinted: 1.42 };
    const SAT_TABLE = { clear: 1.55, standard: 1.42, tinted: 1.25 };

    let svgRoot = null;
    let defsEl = null;
    let resizeObs = null;
    let mutObs = null;
    let filterSeq = 0;
    let rafPending = false;
    let supportedCache = null;

    const trackedSet = new Set();
    const pendingSet = new Set();
    const elemMeta = new WeakMap(); // el -> { preset, lastKey, filterId }
    const pngCache = new Map(); // shapeKey -> { dispUrl, fresnelUrl }
    const filterCache = new Map(); // exactKey -> { id, node }

    function supportsSvgBackdropFilter() {
      if (supportedCache !== null) return supportedCache;
      try {
        const cssOk = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('backdrop-filter', 'url(#sp-lg-test)');
        const isChromium = /Chrome|Chromium|Edg|OPR|Brave|Vivaldi/i.test(navigator.userAgent || '') || typeof window.chrome !== 'undefined';
        supportedCache = Boolean(cssOk && isChromium);
      } catch (_) {
        supportedCache = false;
      }
      return supportedCache;
    }

    function buildFilterUrl(filterId) {
      if (document.querySelector('base[href]')) {
        const docBase = window.location.href.split('#')[0].replace(/["\\]/g, '\\$&');
        return `url("${docBase}#${filterId}")`;
      }
      return `url("#${filterId}")`;
    }

    function ensureSvgHost() {
      if (svgRoot && document.body.contains(svgRoot)) return true;
      const existing = document.getElementById('sp-lg-optics-svg');
      if (existing) {
        svgRoot = existing;
        defsEl = existing.querySelector('defs');
        return Boolean(defsEl);
      }
      svgRoot = document.createElementNS(SVG_NS, 'svg');
      svgRoot.setAttribute('id', 'sp-lg-optics-svg');
      svgRoot.setAttribute('aria-hidden', 'true');
      defsEl = document.createElementNS(SVG_NS, 'defs');
      svgRoot.appendChild(defsEl);
      document.body.appendChild(svgRoot);
      return true;
    }

    function svgEl(tag, attrs = {}) {
      const node = document.createElementNS(SVG_NS, tag);
      Object.keys(attrs).forEach((k) => {
        if (k === 'href') {
          node.setAttribute('href', attrs[k]);
          node.setAttributeNS(XLINK_NS, 'xlink:href', attrs[k]);
        } else {
          node.setAttribute(k, String(attrs[k]));
        }
      });
      return node;
    }

    function getEffectiveConfig() {
      const theme = resolveThemeMode();
      const glassStyle = ['standard', 'clear', 'tinted'].includes(Store.get('glassStyle')) ? Store.get('glassStyle') : 'standard';
      const strength = ['subtle', 'standard', 'strong'].includes(Store.get('refractionStrength')) ? Store.get('refractionStrength') : 'standard';
      return { theme, glassStyle, strength };
    }

    function quantizeDim(v) {
      if (v <= 80) return Math.max(16, Math.round(v / 4) * 4);
      if (v <= 320) return Math.round(v / 8) * 8;
      return Math.round(v / 16) * 16;
    }

    function quantizeRadius(r, w, h) {
      const clamped = Math.min(Math.max(0, r), w * 0.5, h * 0.5);
      return Math.round(clamped / 2) * 2;
    }

    function readCornerRadius(el, w, h) {
      try {
        const cs = getComputedStyle(el);
        const tl = parseFloat(cs.borderTopLeftRadius) || 0;
        const tr = parseFloat(cs.borderTopRightRadius) || 0;
        const br = parseFloat(cs.borderBottomRightRadius) || 0;
        const bl = parseFloat(cs.borderBottomLeftRadius) || 0;
        const avg = (tl + tr + br + bl) / 4;
        return Math.min(Math.max(0, avg), w * 0.5, h * 0.5);
      } catch (_) {
        return Math.min(18, w * 0.5, h * 0.5);
      }
    }

    /**
     * Computes rounded-rectangle / capsule SDF displacement & Schlick Fresnel rim maps.
     */
    function computeSdfMaps(w, h, radius, preset, theme, glassStyle, strength) {
      const halfW = w * 0.5;
      const halfH = h * 0.5;
      const r = Math.min(Math.max(0, radius), halfW, halfH);
      const bx = Math.max(0, halfW - r);
      const by = Math.max(0, halfH - r);

      const targetBezel = preset === 'pill'
        ? Math.min(11, Math.max(5.5, Math.min(w, h) * 0.28))
        : preset === 'overlay'
          ? Math.min(28, Math.max(14, Math.min(w, h) * 0.16))
          : preset === 'lens'
            ? Math.min(28, Math.max(12, Math.min(w, h) * 0.42))
            : Math.min(26, Math.max(14, Math.min(w, h) * 0.28));
      const bezelCap = preset === 'pill'
        ? Math.min(r > 4 ? r * 0.90 : 8, halfW * 0.78, halfH * 0.78)
        : Math.min(r > 6 ? r * 0.94 : 14, halfW * 0.88, halfH * 0.88);
      const bezelPx = Math.max(4, Math.min(targetBezel, bezelCap));

      const ior = IOR_TABLE[glassStyle] || 1.50;
      const mult = STRENGTH_MULT[strength] || 1.0;
      const maxAngle = 0.92;
      const maxDefl = Math.tan(Math.asin(maxAngle) - Math.asin(maxAngle / ior)) || 0.35;
      const centerDome = (preset === 'pill' ? 0.02 : preset === 'overlay' ? 0.014 : preset === 'lens' ? 0.032 : 0.012) * Math.min(1.2, mult);

      const evalSdf = (x, y) => {
        const qx = Math.abs(x) - bx;
        const qy = Math.abs(y) - by;
        const ox = Math.max(qx, 0);
        const oy = Math.max(qy, 0);
        const outLen = Math.hypot(ox, oy);
        const sd = outLen + Math.min(Math.max(qx, qy), 0) - r;
        const distFromEdge = Math.max(0, -sd);

        let nx = 0;
        let ny = 0;
        if (outLen > 1e-5) {
          nx = (ox / outLen) * (x < 0 ? -1 : 1);
          ny = (oy / outLen) * (y < 0 ? -1 : 1);
        } else if (qx > qy) {
          nx = x < 0 ? -1 : 1;
        } else {
          ny = y < 0 ? -1 : 1;
        }
        return { distFromEdge, nx, ny };
      };

      // 1. Displacement Map (Red = X, Green = Y; 128 = neutral)
      const dispScaleFactor = Math.min(1, 180 / Math.max(w, h));
      const dw = Math.max(36, Math.min(180, Math.round(w * dispScaleFactor)));
      const dh = Math.max(36, Math.min(180, Math.round(h * dispScaleFactor)));
      const dispCanvas = document.createElement('canvas');
      dispCanvas.width = dw;
      dispCanvas.height = dh;
      const dCtx = dispCanvas.getContext('2d');
      const dImg = dCtx.createImageData(dw, dh);
      const dData = dImg.data;

      for (let py = 0; py < dh; py++) {
        const y = ((py + 0.5) / dh) * h - halfH;
        const nyNorm = halfH > 0 ? y / halfH : 0;
        for (let px = 0; px < dw; px++) {
          const x = ((px + 0.5) / dw) * w - halfW;
          const nxNorm = halfW > 0 ? x / halfW : 0;
          const { distFromEdge, nx, ny } = evalSdf(x, y);

          const t = Math.min(1, distFromEdge / bezelPx);
          const om = 1 - t;
          const profile = om * om * (1.35 - 0.35 * om);
          const sinT1 = Math.min(maxAngle, profile * maxAngle);
          const t1 = Math.asin(sinT1);
          const t2 = Math.asin(sinT1 / ior);
          const mag = Math.tan(t1 - t2) / maxDefl;

          // Inward refraction (-nx, -ny) plus ultra-gentle center dome
          const domeBlend = (1 - mag) * centerDome;
          const dx = -nx * mag - nxNorm * domeBlend;
          const dy = -ny * mag - nyNorm * domeBlend;

          const idx = (py * dw + px) * 4;
          dData[idx] = Math.max(0, Math.min(255, Math.round(128 + dx * 127)));
          dData[idx + 1] = Math.max(0, Math.min(255, Math.round(128 + dy * 127)));
          dData[idx + 2] = 128;
          dData[idx + 3] = 255;
        }
      }
      dCtx.putImageData(dImg, 0, 0);
      const dispUrl = dispCanvas.toDataURL('image/png');

      // 2. Schlick Fresnel Rim Map (RGBA specular + directional caustic rim)
      const rimScaleFactor = Math.min(1, 220 / Math.max(w, h));
      const rw = Math.max(40, Math.min(220, Math.round(w * rimScaleFactor)));
      const rh = Math.max(40, Math.min(220, Math.round(h * rimScaleFactor)));
      const rimCanvas = document.createElement('canvas');
      rimCanvas.width = rw;
      rimCanvas.height = rh;
      const rCtx = rimCanvas.getContext('2d');
      const rImg = rCtx.createImageData(rw, rh);
      const rData = rImg.data;

      const isDark = theme === 'dark';
      const rimIntensity = (preset === 'pill' ? 0.78 : preset === 'overlay' ? 0.92 : preset === 'lens' ? 1.0 : 0.72) * (0.78 + 0.22 * mult);
      const fresnelExp = preset === 'pill' ? 5.2 : preset === 'overlay' ? 3.8 : preset === 'lens' ? 3.8 : 3.4;
      const rimWidth = preset === 'pill' ? 1.45 : preset === 'overlay' ? 1.9 : preset === 'lens' ? 1.85 : 2.1;

      for (let py = 0; py < rh; py++) {
        const y = ((py + 0.5) / rh) * h - halfH;
        for (let px = 0; px < rw; px++) {
          const x = ((px + 0.5) / rw) * w - halfW;
          const { distFromEdge, nx, ny } = evalSdf(x, y);

          const idx = (py * rw + px) * 4;
          if (distFromEdge > Math.max(bezelPx, 10)) {
            rData[idx] = 0;
            rData[idx + 1] = 0;
            rData[idx + 2] = 0;
            rData[idx + 3] = 0;
            continue;
          }

          const t = Math.min(1, distFromEdge / bezelPx);
          const om = 1 - t;
          const profile = om * om * (1.35 - 0.35 * om);
          const sinT1 = Math.min(maxAngle, profile * maxAngle);
          const cosTheta = Math.sqrt(Math.max(0, 1 - sinT1 * sinT1));

          // Schlick grazing Fresnel + tight outer specular ring
          const fresnel = Math.pow(1 - cosTheta, fresnelExp);
          const rimBand = Math.exp(-Math.pow(distFromEdge / rimWidth, 2));

          // Dual-angle studio lighting (key top-left, bounce bottom-right)
          const l1 = Math.max(0, nx * -0.62 + ny * -0.78);
          const l2 = Math.max(0, nx * 0.58 + ny * 0.81);
          const k1 = Math.pow(l1, 1.55);
          const k2 = Math.pow(l2, 1.95);
          const dir = 0.20 + 0.80 * k1 + 0.44 * k2;

          let alpha = Math.min(1, (fresnel * (preset === 'pill' ? 0.42 : 0.52) + rimBand * 0.56) * dir * rimIntensity);
          if (isDark) alpha *= (preset === 'pill' ? 0.62 : 0.72);
          else alpha *= (preset === 'pill' ? 0.84 : 0.88);

          // Subtle chromatic rim tint (cool ice-cyan top-left, warm rose-violet bottom-right)
          let cr = Math.min(255, Math.round(244 + 11 * k2 - 14 * k1));
          let cg = Math.min(255, Math.round(248 + 7 * k1 - 6 * k2));
          let cb = 255;

          // Gentle inner dark refraction bevel in light mode for physical glass thickness
          if (!isDark && distFromEdge > 2.4 && distFromEdge < 6.5 && l2 > 0.25) {
            const depthEnv = Math.sin(((distFromEdge - 2.4) / 4.1) * Math.PI);
            const darkAmt = depthEnv * l2 * 0.14;
            if (darkAmt > alpha * 0.35) {
              cr = 18;
              cg = 28;
              cb = 48;
              alpha = Math.min(0.22, darkAmt);
            }
          }

          rData[idx] = cr;
          rData[idx + 1] = cg;
          rData[idx + 2] = cb;
          rData[idx + 3] = Math.max(0, Math.min(255, Math.round(alpha * 255)));
        }
      }
      rCtx.putImageData(rImg, 0, 0);
      const fresnelUrl = rimCanvas.toDataURL('image/png');

      return { dispUrl, fresnelUrl };
    }

    function getPngMaps(qW, qH, qR, preset, theme, glassStyle, strength) {
      const key = `${qW}x${qH}:r${qR}:${preset}:${theme}:${glassStyle}:${strength}`;
      if (pngCache.has(key)) {
        const val = pngCache.get(key);
        pngCache.delete(key);
        pngCache.set(key, val);
        return val;
      }
      const maps = computeSdfMaps(qW, qH, qR, preset, theme, glassStyle, strength);
      if (pngCache.size >= 24) {
        const oldest = pngCache.keys().next().value;
        pngCache.delete(oldest);
      }
      pngCache.set(key, maps);
      return maps;
    }

    function getOrCreateFilter(exactW, exactH, qR, preset, theme, glassStyle, strength) {
      const exactKey = `${exactW}x${exactH}:r${qR}:${preset}:${theme}:${glassStyle}:${strength}`;
      if (filterCache.has(exactKey)) {
        const entry = filterCache.get(exactKey);
        filterCache.delete(exactKey);
        filterCache.set(exactKey, entry);
        return entry.id;
      }

      ensureSvgHost();
      const qW = quantizeDim(exactW);
      const qH = quantizeDim(exactH);
      const { dispUrl, fresnelUrl } = getPngMaps(qW, qH, qR, preset, theme, glassStyle, strength);

      const mult = STRENGTH_MULT[strength] || 1.0;
      const rawScale = (SCALE_TABLE[glassStyle]?.[preset] || 20) * mult;
      const maxSafeScale = preset === 'pill'
        ? Math.max(3, Math.min(exactW, exactH) * 0.36)
        : Math.max(4, Math.min(exactW, exactH) * 0.45);
      const baseScale = Math.min(rawScale, maxSafeScale);
      const dispersion = (preset === 'pill' ? 0.095 : preset === 'lens' ? 0.085 : 0.055) * Math.min(1.35, mult);
      const scaleR = (baseScale * (1 - dispersion)).toFixed(2);
      const scaleG = baseScale.toFixed(2);
      const scaleB = (baseScale * (1 + dispersion)).toFixed(2);
      const blurStd = PREBLUR_TABLE[glassStyle]?.[preset] ?? 1.35;
      const satVal = SAT_TABLE[glassStyle] ?? 1.42;

      const id = `sp-lg-f-${++filterSeq}`;
      const filterNode = svgEl('filter', {
        id,
        x: '0%',
        y: '0%',
        width: '100%',
        height: '100%',
        filterUnits: 'objectBoundingBox',
        primitiveUnits: 'userSpaceOnUse',
        'color-interpolation-filters': 'sRGB'
      });

      const srcName = blurStd > 0.05 ? 'bgSrc' : 'SourceGraphic';
      if (blurStd > 0.05) {
        filterNode.appendChild(svgEl('feGaussianBlur', {
          in: 'SourceGraphic',
          stdDeviation: blurStd.toFixed(2),
          edgeMode: 'duplicate',
          result: 'bgSrc'
        }));
      }

      // Displacement map in exact CSS pixels matching the element
      filterNode.appendChild(svgEl('feImage', {
        href: dispUrl,
        x: 0,
        y: 0,
        width: exactW,
        height: exactH,
        preserveAspectRatio: 'none',
        result: 'dispMap'
      }));

      // Red channel displacement + isolation
      filterNode.appendChild(svgEl('feDisplacementMap', {
        in: srcName,
        in2: 'dispMap',
        scale: scaleR,
        xChannelSelector: 'R',
        yChannelSelector: 'G',
        result: 'dispR'
      }));
      filterNode.appendChild(svgEl('feColorMatrix', {
        in: 'dispR',
        type: 'matrix',
        values: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
        result: 'rOnly'
      }));

      // Green channel displacement + isolation
      filterNode.appendChild(svgEl('feDisplacementMap', {
        in: srcName,
        in2: 'dispMap',
        scale: scaleG,
        xChannelSelector: 'R',
        yChannelSelector: 'G',
        result: 'dispG'
      }));
      filterNode.appendChild(svgEl('feColorMatrix', {
        in: 'dispG',
        type: 'matrix',
        values: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
        result: 'gOnly'
      }));

      // Blue channel displacement + isolation
      filterNode.appendChild(svgEl('feDisplacementMap', {
        in: srcName,
        in2: 'dispMap',
        scale: scaleB,
        xChannelSelector: 'R',
        yChannelSelector: 'G',
        result: 'dispB'
      }));
      filterNode.appendChild(svgEl('feColorMatrix', {
        in: 'dispB',
        type: 'matrix',
        values: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
        result: 'bOnly'
      }));

      // Recombine dispersed R + G + B
      filterNode.appendChild(svgEl('feBlend', {
        in: 'rOnly',
        in2: 'gOnly',
        mode: 'screen',
        result: 'rg'
      }));
      filterNode.appendChild(svgEl('feBlend', {
        in: 'rg',
        in2: 'bOnly',
        mode: 'screen',
        result: 'rgbDispersed'
      }));

      // Vibrancy boost
      filterNode.appendChild(svgEl('feColorMatrix', {
        in: 'rgbDispersed',
        type: 'saturate',
        values: satVal.toFixed(2),
        result: 'vibrant'
      }));

      // Schlick Fresnel Rim overlay
      filterNode.appendChild(svgEl('feImage', {
        href: fresnelUrl,
        x: 0,
        y: 0,
        width: exactW,
        height: exactH,
        preserveAspectRatio: 'none',
        result: 'fresnelRim'
      }));
      filterNode.appendChild(svgEl('feComposite', {
        in: 'fresnelRim',
        in2: 'vibrant',
        operator: 'over',
        result: 'final'
      }));

      defsEl.appendChild(filterNode);

      if (filterCache.size >= 24) {
        const oldestKey = filterCache.keys().next().value;
        const oldestEntry = filterCache.get(oldestKey);
        filterCache.delete(oldestKey);
        if (oldestEntry?.node && oldestEntry.node.parentNode) {
          oldestEntry.node.remove();
        }
      }
      filterCache.set(exactKey, { id, node: filterNode });
      return id;
    }

    function applyToElement(el) {
      if (!supportsSvgBackdropFilter() || !el || !el.isConnected) return;
      const meta = elemMeta.get(el);
      if (!meta) return;
      if (meta.preset === 'overlay') {
        if (!el.classList.contains('is-open') && el.id !== 'pw_box' && !el.classList.contains('menu') && !el.classList.contains('lg-status-card')) {
          return;
        }
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
      }

      const rect = el.getBoundingClientRect();
      const exactW = Math.round(el.offsetWidth || rect.width);
      const exactH = Math.round(el.offsetHeight || rect.height);
      if (exactW < 10 || exactH < 10) return;

      const radius = readCornerRadius(el, exactW, exactH);
      const qR = quantizeRadius(radius, exactW, exactH);
      const { theme, glassStyle, strength } = getEffectiveConfig();
      const exactKey = `${exactW}x${exactH}:r${qR}:${meta.preset}:${theme}:${glassStyle}:${strength}`;

      if (meta.lastKey === exactKey && el.style.getPropertyValue('--lg-refract-filter')) {
        return;
      }

      const prevFilterId = meta.filterId;
      const filterId = getOrCreateFilter(exactW, exactH, qR, meta.preset, theme, glassStyle, strength);
      el.style.setProperty('--lg-refract-filter', buildFilterUrl(filterId));
      el.setAttribute('data-lg-refract', meta.preset);
      meta.lastKey = exactKey;
      meta.filterId = filterId;

      if (prevFilterId && prevFilterId !== filterId) {
        let stillUsed = false;
        trackedSet.forEach((node) => {
          if (node !== el && node.isConnected && elemMeta.get(node)?.filterId === prevFilterId) {
            stillUsed = true;
          }
        });
        if (!stillUsed) {
          for (const [k, entry] of filterCache.entries()) {
            if (entry?.id === prevFilterId) {
              filterCache.delete(k);
              if (entry.node?.parentNode) entry.node.remove();
              break;
            }
          }
        }
      }
    }

    function scheduleFlush() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const batch = Array.from(pendingSet);
        pendingSet.clear();
        batch.forEach((el) => applyToElement(el));
      });
    }

    function registerElement(el, preset) {
      if (!el || el.nodeType !== 1) return;
      const existing = elemMeta.get(el);
      if (existing) {
        if (preset === 'lens' && existing.preset !== 'lens') {
          existing.preset = 'lens';
          existing.lastKey = '';
          pendingSet.add(el);
          scheduleFlush();
        }
        return;
      }
      elemMeta.set(el, {
        preset,
        lastKey: '',
        filterId: ''
      });
      trackedSet.add(el);
      if (resizeObs) resizeObs.observe(el);
      pendingSet.add(el);
      scheduleFlush();
    }

    function scan(root = document.body) {
      if (!supportsSvgBackdropFilter() || !root || root.nodeType !== 1) return;
      if (root.matches?.(OVERLAY_SELECTORS)) {
        registerElement(root, 'overlay');
      } else if (root.matches?.(LENS_SELECTORS)) {
        registerElement(root, 'lens');
      }
      root.querySelectorAll?.(OVERLAY_SELECTORS).forEach((node) => registerElement(node, 'overlay'));
      root.querySelectorAll?.(LENS_SELECTORS).forEach((node) => registerElement(node, 'lens'));
    }

    function refreshElement(el) {
      if (!supportsSvgBackdropFilter() || !el || el.nodeType !== 1) return;
      const preset = el.matches?.(OVERLAY_SELECTORS)
        ? 'overlay'
        : el.matches?.(LENS_SELECTORS)
          ? 'lens'
          : null;
      if (!preset) return;
      if (!elemMeta.has(el)) registerElement(el, preset);
      const meta = elemMeta.get(el);
      if (meta) meta.lastKey = '';
      applyToElement(el);
    }

    function onThemeOrConfigChange() {
      if (!this.initialized || !supportsSvgBackdropFilter()) return;
      filterCache.forEach((entry) => {
        if (entry?.node && entry.node.parentNode) entry.node.remove();
      });
      filterCache.clear();
      trackedSet.forEach((el) => {
        if (!el.isConnected) {
          trackedSet.delete(el);
          return;
        }
        const meta = elemMeta.get(el);
        if (meta) {
          meta.lastKey = '';
          meta.filterId = '';
        }
        pendingSet.add(el);
      });
      scheduleFlush();
    }

    function init() {
      if (!supportsSvgBackdropFilter()) return;
      ensureSvgHost();
      if (!this.initialized) {
        this.initialized = true;
        if (typeof ResizeObserver === 'function') {
          resizeObs = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
              pendingSet.add(entry.target);
            });
            scheduleFlush();
          });
        }
        if (typeof MutationObserver === 'function') {
          mutObs = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
              m.addedNodes.forEach((n) => {
                if (n.nodeType === 1) scan(n);
              });
            });
          });
          mutObs.observe(document.body, { childList: true, subtree: false });
        }
      }
      scan(document.body);
    }

    return {
      initialized: false,
      init,
      scan,
      refreshElement,
      onThemeOrConfigChange,
      computeSdfMaps,
      buildFilterUrl,
      supportsSvgBackdropFilter
    };
  })();

  /* ============================================================================
   * 4. DOM HELPERS & PAGE PARSERS
   * ========================================================================== */

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.keys(attrs).forEach((k) => {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'className') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset' && typeof v === 'object') Object.assign(node.dataset, v);
      else node.setAttribute(k, v);
    });
    const list = Array.isArray(children) ? children : [children];
    list.forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isAdElement(node) {
    if (!node) return false;
    const html = node.innerHTML || '';
    return /segucrwj|equity\.tmall\.com|dwz\.cn|onclick="ga\([^"]*'(ad|newmoe|moe80|sswg|menggongfang)'/i.test(html);
  }

  const SUBFORUM_FALLBACK = {
    '229': [{ name: '同人志&CG', href: 'thread.php?fid-230.html', fid: '230' }, { name: '同人志&CG (图墙模式)', href: 'thread.php?fid-231.html', fid: '231' }],
    '226': [{ name: '同人志&CG', href: 'thread.php?fid-227.html', fid: '227' }, { name: '同人志&CG (图墙模式)', href: 'thread.php?fid-228.html', fid: '228' }],
    '223': [{ name: '同人志&CG', href: 'thread.php?fid-224.html', fid: '224' }, { name: '同人志&CG (图墙模式)', href: 'thread.php?fid-225.html', fid: '225' }],
    '136': [{ name: '同人志&CG', href: 'thread.php?fid-219.html', fid: '219' }, { name: '同人志&CG (图墙模式)', href: 'thread.php?fid-220.html', fid: '220' }],
    '107': [{ name: '同人志&CG', href: 'thread.php?fid-216.html', fid: '216' }, { name: '同人志&CG (图墙模式)', href: 'thread.php?fid-217.html', fid: '217' }],
    '44': [{ name: '图墙模式', href: 'thread.php?fid-103.html', fid: '103' }],
    '46': [{ name: '图墙模式', href: 'thread.php?fid-104.html', fid: '104' }],
    '47': [{ name: '图墙模式', href: 'thread.php?fid-105.html', fid: '105' }],
    '16': [{ name: '原版交流', href: 'thread.php?fid-20.html', fid: '20' }],
    '45': [{ name: '图墙模式', href: 'thread.php?fid-106.html', fid: '106' }],
    '36': [{ name: '图墙模式', href: 'thread.php?fid-102.html', fid: '102' }],
    '43': [
      '218:C103', '215:C102', '212:C101', '209:C100', '205:C99', '202:C98', '196:C97',
      '189:C96', '182:C95', '176:C94', '164:C93', '158:C92', '152:C91', '144:C90',
      '143:C89', '129:C88', '116:C87', '97:C86', '78:C85', '89:C84', '30:C83',
      '67:C82', '62:C81', '55:C80', '53:C79', '54:C78'
    ].map((s) => {
      const [id, name] = s.split(':');
      return { name, href: `thread.php?fid-${id}.html`, fid: id };
    }),
    '12': [{ name: '自扫小说图源区', href: 'thread.php?fid-83.html', fid: '83' }],
    '9': [{ name: '茶楼', href: 'thread.php?fid-188.html', fid: '188' }],
    '13': [
      { name: 'CG资源', href: 'thread.php?fid-14.html', fid: '14' },
      { name: '同人音声', href: 'thread.php?fid-128.html', fid: '128' },
      { name: '实用动画', href: 'thread.php?fid-4.html', fid: '4' },
      { name: '高清里番', href: 'thread.php?fid-73.html', fid: '73' },
      { name: '实用漫画', href: 'thread.php?fid-5.html', fid: '5' },
      { name: '图墙模式', href: 'thread.php?fid-109.html', fid: '109' },
      { name: '游戏资源', href: 'thread.php?fid-6.html', fid: '6' },
      { name: 'COSPLAY', href: 'thread.php?fid-201.html', fid: '201' },
      { name: 'GALGAME汉化区', href: 'thread.php?fid-221.html', fid: '221' },
      { name: 'GALGAME汉化区 (图墙模式)', href: 'thread.php?fid-222.html', fid: '222' }
    ],
    '170': [
      { name: 'CG资源', href: 'thread.php?fid-171.html', fid: '171' },
      { name: '实用动画', href: 'thread.php?fid-172.html', fid: '172' },
      { name: '实用漫画', href: 'thread.php?fid-173.html', fid: '173' },
      { name: '游戏资源', href: 'thread.php?fid-174.html', fid: '174' }
    ]
  };

  function htmlToLines(node) {
    if (!node) return [];
    const text = (node.innerHTML || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:div|p|li|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, '');
    const tmp = document.createElement('textarea');
    tmp.innerHTML = text;
    return tmp.value.split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }

  function parseFidFromHref(href) {
    const m = (href || '').match(/fid[-=](\d+)/i);
    return m ? m[1] : '';
  }

  function detectPageType() {
    const file = (location.pathname.split('/').pop() || '').toLowerCase();
    const hasShell = !!(qs('#wrapA') || qs('#main') || qs('#u-wrap') || qs('#set-wrap'));
    if (!hasShell && (qs('meta[http-equiv="refresh"]') || /提示信息/.test(document.body?.textContent || ''))) {
      return 'redirect';
    }
    if (file === 'login.php' || qs('form[name="login"]')) return 'login';
    if (file === 'register.php' || qs('form[name="register"]')) return 'register';
    if (file === 'post.php' || qs('form[name="FORM"] #editor-content')) return 'post';
    if (file === 'read.php' || qs('table.js-post')) return 'read';
    if (file === 'thread_new.php' || qs('#wall .stream li.dcsns-li')) return 'thread_wall';
    if (file === 'thread.php' || (qs('#ajaxtable') && !qs('#wall'))) return 'thread_list';
    if (file === 'u.php' || qs('#u-wrap')) return 'user';
    if (file === 'userpay.php' || qs('#pay_begin') || qs('#set-menu li.current a[href*="userpay.php"]')) return 'userpay';
    if (file === 'profile.php' || qs('#pro_modify') || qs('#set-menu a[href*="profile.php?action-modify"]')) return 'profile';
    if (file === 'message.php' || qs('#set-wrap #infolist') || qs('#set-menu a[href*="message.php"]')) return 'message';
    if (/H_name[-=]tasks/i.test(location.href) || (qs('#main a[href*="H_name-tasks"]') && /任务/.test(document.title))) {
      return 'tasks';
    }
    const searchTable = qs('#main .t table');
    const searchHeaderText = searchTable ? (qs('tr.tr2', searchTable)?.textContent || '') : '';
    const isSearchResultsTable = !!(
      searchTable
      && /主题列表/.test(searchTable.textContent)
      && /状态/.test(searchHeaderText)
      && /标题/.test(searchHeaderText)
    );
    if (file === 'search2.php' || isSearchResultsTable) return 'search_results';
    if (file === 'search.php' || qs('form[name="sF"]')) return 'search';
    if (file === '' || file === 'index.php' || qs('tbody[id^="cate_"] tr[id^="fid_"]')) return 'index';
    return 'other';
  }

  function parseSmartTitle(raw) {
    const text = (raw || '').trim();
    const tags = [];
    let remaining = text;

    const prefixes = [
      { re: /【新汉化作品】/g, label: '新汉化', tone: 'error' },
      { re: /\[自购\]/g, label: '自购', tone: 'primary' },
      { re: /\[原创\]/g, label: '原创', tone: 'primary' },
      { re: /\[无码\]/g, label: '无码', tone: 'tertiary' },
      { re: /\[合集\]/g, label: '合集', tone: 'secondary' },
      { re: /\[公告\]/g, label: '公告', tone: 'error' }
    ];

    prefixes.forEach((p) => {
      if (p.re.test(remaining)) {
        tags.push({ label: p.label, tone: p.tone });
        remaining = remaining.replace(p.re, '');
      }
    });

    const sizeMatch = remaining.match(/\[(\d+(?:\.\d+)?\s*(?:GB|MB|TB|G|M))\]/i);
    if (sizeMatch) {
      tags.push({ label: sizeMatch[1].toUpperCase(), tone: 'neutral' });
    }

    const driveMatch = remaining.match(/\[((?:BD|GF|TR|OD|GD|MEGA|PikPak|115|123|度娘|秒传)[^\]]{0,18})\]/i);
    if (driveMatch) {
      tags.push({ label: driveMatch[1], tone: 'neutral' });
    }

    return {
      raw: text,
      clean: remaining.replace(/\s{2,}/g, ' ').trim() || text,
      tags
    };
  }

  function extractUserContext() {
    const loginEl = qs('#user-login');
    const infoBox = qs('#infobox');
    const ctx = {
      loggedIn: false,
      username: '游客',
      userHref: 'login.php',
      hasUnreadMsg: false,
      avatar: '',
      uid: '',
      hp: '',
      sp: '',
      po: '',
      lastLogin: '',
      levelText: '',
      honorText: '您还没有设置个性签名',
      shortcuts: [],
      statsToday: '',
      statsYesterday: '',
      statsMax: '',
      statsTotal: '',
      quitHref: '',
      myTopicHref: 'u.php?action-topic.html',
      myPostHref: 'u.php?action-post.html'
    };

    if (loginEl) {
      const links = qsa('a', loginEl);
      const userLink = links.find((a) => /u\.php/i.test(a.getAttribute('href') || ''));
      if (userLink) {
        ctx.loggedIn = true;
        ctx.username = userLink.textContent.trim() || '用户';
        ctx.userHref = userLink.getAttribute('href') || 'u.php';
      }
      const quitLink = links.find((a) => /action-quit/i.test(a.getAttribute('href') || ''));
      if (quitLink) ctx.quitHref = quitLink.getAttribute('href') || '';
      const msgImg = qs('#td_msg img', loginEl);
      if (msgImg) {
        const src = msgImg.getAttribute('src') || '';
        ctx.hasUnreadMsg = !/no-shortmail/i.test(src);
      }
    }

    if (infoBox) {
      const avatarImg = qs('#user_info img', infoBox);
      if (avatarImg) ctx.avatar = avatarImg.getAttribute('src') || '';
      const showFace = qs('#showface', infoBox);
      if (showFace) {
        const lines = htmlToLines(showFace);
        lines.forEach((line) => {
          let m;
          if ((m = line.match(/^UID:\s*(\d+)/i))) ctx.uid = m[1].trim();
          else if ((m = line.match(/^HP:\s*(.+)$/i))) ctx.hp = m[1].trim();
          else if ((m = line.match(/^SP币:\s*(.+)$/i))) ctx.sp = m[1].trim();
          else if ((m = line.match(/^魄:\s*(.+)$/i))) ctx.po = m[1].trim();
          else if ((m = line.match(/^最后登录:\s*(.+)$/i))) ctx.lastLogin = m[1].trim();
        });
      }
      const honorEl = qs('#honor', infoBox);
      if (honorEl) ctx.honorText = honorEl.textContent.trim();
      const levelSpan = qs('#user_info .gray2 > span.fl', infoBox);
      if (levelSpan) {
        ctx.levelText = levelSpan.textContent.replace(/我的主题.*$/, '').trim().replace(/,\s*$/, '');
      }
      qsa('#shortcutforum li a', infoBox).forEach((a) => {
        ctx.shortcuts.push({ name: a.textContent.trim(), href: a.getAttribute('href') || '#' });
      });
      const rightStats = qs('td:last-child', infoBox);
      if (rightStats && !qs('#shortcutforum', rightStats)) {
        const statText = rightStats.textContent.replace(/\s+/g, ' ').trim();
        const tM = statText.match(/今日:(\d+)/);
        const yM = statText.match(/昨日:(\d+)/);
        const mM = statText.match(/最高日:(\d+)/);
        const thM = statText.match(/主题:(\d+)/);
        const poTotalM = statText.match(/帖子:(\d+)/);
        const memM = statText.match(/会员:(\d+)/);
        if (tM) ctx.statsToday = tM[1];
        if (yM) ctx.statsYesterday = yM[1];
        if (mM) ctx.statsMax = mM[1];
        if (thM && poTotalM && memM) {
          ctx.statsTotal = `主题 ${thM[1]} · 帖子 ${poTotalM[1]} · 会员 ${memM[1]}`;
        }
      }
    }

    if (ctx.loggedIn) {
      if (infoBox && (ctx.sp || ctx.uid)) {
        Store.set('cachedUserProfile', {
          username: ctx.username,
          avatar: ctx.avatar,
          uid: ctx.uid,
          hp: ctx.hp,
          sp: ctx.sp,
          po: ctx.po,
          lastLogin: ctx.lastLogin,
          levelText: ctx.levelText,
          honorText: ctx.honorText
        });
      } else {
        const cached = Store.get('cachedUserProfile');
        if (cached && cached.username === ctx.username) {
          ctx.avatar = ctx.avatar || cached.avatar || '';
          ctx.uid = ctx.uid || cached.uid || '';
          ctx.hp = ctx.hp || cached.hp || '';
          ctx.sp = ctx.sp || cached.sp || '';
          ctx.po = ctx.po || cached.po || '';
          ctx.lastLogin = ctx.lastLogin || cached.lastLogin || '';
          ctx.levelText = ctx.levelText || cached.levelText || '';
          if (!infoBox && cached.honorText) ctx.honorText = cached.honorText;
        }
      }
    }

    return ctx;
  }

  function extractForumTree() {
    const prevTree = Store.get('cachedForumTree') || [];
    const prevSubsByFid = {};
    prevTree.forEach((cat) => {
      (cat.boards || []).forEach((b) => {
        const fid = b.fid || parseFidFromHref(b.href);
        if (fid && Array.isArray(b.subs) && b.subs.length) {
          prevSubsByFid[fid] = b.subs;
        }
      });
    });

    const categories = [];
    const indexBoxes = qsa('.contentwrap .t[id^="t_"]');
    if (indexBoxes.length) {
      indexBoxes.forEach((box) => {
        const h2a = qs('th.h h2 a', box);
        if (!h2a) return;
        const boards = qsa('tr[id^="fid_"]', box).map((tr) => {
          const fid = tr.id.replace('fid_', '');
          const link = qs(`#fn_${fid}`, tr) || qs('h3 a', tr);
          if (!link) return null;
          const subs = qsa('th > div h3 a', tr).map((sa) => {
            const href = sa.getAttribute('href') || '#';
            return { name: sa.textContent.trim(), href, fid: parseFidFromHref(href) };
          }).filter((s) => s.name);
          return {
            fid,
            name: link.textContent.trim(),
            href: link.getAttribute('href') || '#',
            subs
          };
        }).filter(Boolean);
        categories.push({
          title: h2a.textContent.trim(),
          href: h2a.getAttribute('href') || '#',
          boards
        });
      });
    } else if (qs('#menu_cate')) {
      qsa('ul.ul3', qs('#menu_cate')).forEach((ul) => {
        const h2a = qs('h2 a', ul);
        if (!h2a) return;
        const boards = qsa('li a', ul).map((a) => {
          const href = a.getAttribute('href') || '#';
          const fid = parseFidFromHref(href);
          const subs = prevSubsByFid[fid] || SUBFORUM_FALLBACK[fid] || [];
          return {
            fid,
            name: a.textContent.trim(),
            href,
            subs
          };
        }).filter((b) => b.name);
        categories.push({
          title: h2a.textContent.trim(),
          href: h2a.getAttribute('href') || '#',
          boards
        });
      });
    }

    if (categories.length > 0) {
      Store.set('cachedForumTree', categories);
      return categories;
    }
    return prevTree;
  }

  function extractBreadcrumbs() {
    const main = qs('#main');
    const first = main ? qs('#breadcrumbs', main) : qs('#breadcrumbs');
    const info = {
      crumbs: [],
      rssHref: '',
      shortcutNode: null,
      modeLink: null,
      rawEl: first
    };
    if (!first) return info;

    qsa('.crumbs-item', first).forEach((item) => {
      if (qs('#td_cate', item)) return;
      if (item.tagName === 'A') {
        info.crumbs.push({
          text: item.textContent.trim(),
          href: item.getAttribute('href') || '#',
          isCurrent: item.classList.contains('current')
        });
      } else {
        const strongA = qs('strong a', item) || qs('a', item);
        if (strongA) {
          info.crumbs.push({
            text: strongA.textContent.trim(),
            href: strongA.getAttribute('href') || '#',
            isCurrent: true
          });
        }
        const rssA = qs('a[href*="rss.php"]', item);
        if (rssA) info.rssHref = rssA.getAttribute('href') || '';
        const sc = qs('#shortcut', item);
        if (sc) info.shortcutNode = sc;
      }
    });

    const modeA = qs('span.fr a', first);
    if (modeA) {
      info.modeLink = {
        text: modeA.textContent.trim(),
        href: modeA.getAttribute('href') || '#'
      };
    }

    return info;
  }

  function extractPagination(root = document) {
    const pagesBox = qs('.t3 .pages', root) || qs('.pages', root);
    if (!pagesBox) return null;
    const ul = qs('ul', pagesBox);
    if (!ul) return null;
    const items = [];
    let summary = '';
    let goTemplate = '';
    qsa('li', ul).forEach((li) => {
      if (li.classList.contains('pagesone')) {
        const m = li.textContent.match(/Pages:\s*(\d+\s*\/\s*\d+)/i);
        if (m) summary = m[1].replace(/\s+/g, '');
        const inp = qs('input', li);
        if (inp) {
          const kd = inp.getAttribute('onkeydown') || '';
          const locM = kd.match(/location\s*=\s*'([^']+)'/);
          if (locM) goTemplate = locM[1];
        }
        return;
      }
      const b = qs('b', li);
      if (b) {
        items.push({ label: b.textContent.trim(), href: '', current: true });
        return;
      }
      const a = qs('a', li);
      if (a) {
        items.push({ label: a.textContent.trim(), href: a.getAttribute('href') || '#', current: false });
      }
    });
    if (items.length === 0) return null;
    return { items, summary, goTemplate };
  }

  /* ============================================================================
   * 5. OVERLAYS: TOAST, LIGHTBOX, POPOVERS, PAGINATION, FAVORITE
   * ========================================================================== */

  let toastTimer = null;
  function showToast(msg) {
    let bar = qs('#sp-lg-toast');
    if (!bar) {
      bar = el('div', { id: 'sp-lg-toast', className: 'lg-toast' });
      document.body.appendChild(bar);
    }
    bar.textContent = msg;
    bar.classList.add('is-open');
    LiquidGlassOptics.refreshElement(bar);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => bar.classList.remove('is-open'), 2600);
  }

  const Lightbox = {
    images: [],
    index: 0,
    root: null,
    imgEl: null,
    counterEl: null,
    openLink: null,
    init() {
      if (this.root) return;
      this.imgEl = el('img', { referrerpolicy: 'no-referrer', alt: 'Preview' });
      this.imgEl.addEventListener('click', () => this.imgEl.classList.toggle('is-zoomed'));
      this.counterEl = el('span', { style: 'font-size:13px;font-weight:600;font-family:var(--lg-font-mono);' });
      this.openLink = el('a', {
        className: 'lg-icon-btn',
        target: '_blank',
        rel: 'noopener noreferrer',
        title: '新标签页打开原图',
        style: 'color:#fff;',
        html: icon('open_new')
      });
      this.root = el('div', { className: 'lg-lightbox', id: 'sp-lg-lightbox' }, [
        el('div', { className: 'lg-lightbox-bar' }, [
          this.counterEl,
          el('div', { style: 'display:flex;gap:6px;align-items:center;' }, [
            el('button', {
              className: 'lg-icon-btn',
              type: 'button',
              title: '缩放',
              style: 'color:#fff;',
              html: icon('zoom_in'),
              onClick: () => this.imgEl.classList.toggle('is-zoomed')
            }),
            this.openLink,
            el('button', {
              className: 'lg-icon-btn',
              type: 'button',
              title: '关闭 (Esc)',
              style: 'color:#fff;',
              html: icon('close'),
              onClick: () => this.close()
            })
          ])
        ]),
        el('div', {
          className: 'lg-lightbox-stage',
          onClick: (e) => {
            if (e.target === e.currentTarget) this.close();
          }
        }, [
          el('button', {
            className: 'lg-lightbox-nav lg-lightbox-prev',
            type: 'button',
            html: icon('chevron_left'),
            onClick: () => this.step(-1)
          }),
          this.imgEl,
          el('button', {
            className: 'lg-lightbox-nav lg-lightbox-next',
            type: 'button',
            html: icon('chevron_right'),
            onClick: () => this.step(1)
          })
        ])
      ]);
      document.body.appendChild(this.root);
    },
    open(images, startIndex = 0) {
      this.init();
      this.images = images && images.length ? images : [];
      if (!this.images.length) return;
      this.index = Math.max(0, Math.min(startIndex, this.images.length - 1));
      this.render();
      this.root.classList.add('is-open');
    },
    step(delta) {
      if (!this.images.length) return;
      this.index = (this.index + delta + this.images.length) % this.images.length;
      this.imgEl.classList.remove('is-zoomed');
      this.render();
    },
    render() {
      const src = this.images[this.index];
      this.imgEl.src = src;
      this.openLink.href = src;
      this.counterEl.textContent = `${this.index + 1} / ${this.images.length}`;
    },
    close() {
      if (this.root) this.root.classList.remove('is-open');
    }
  };

  function closeAllPopovers() {
    qsa('.lg-popover.is-open').forEach((p) => p.classList.remove('is-open'));
  }

  function openPopoverNear(popover, anchorEl) {
    const wasOpen = popover.classList.contains('is-open');
    closeAllPopovers();
    if (wasOpen) return;
    popover.classList.add('is-open');
    const rect = anchorEl.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    let top = rect.bottom + 8;
    let originY = 'top';
    let left = rect.right - popRect.width;
    let originX = 'right';
    if (top + popRect.height > window.innerHeight - 12) {
      top = Math.max(12, rect.top - popRect.height - 8);
      originY = 'bottom';
    }
    if (left < 12) {
      left = Math.min(rect.left, window.innerWidth - popRect.width - 12);
      originX = 'left';
    }
    popover.style.top = `${Math.round(top)}px`;
    popover.style.left = `${Math.round(left)}px`;
    popover.style.transformOrigin = `${originY} ${originX}`;
    LiquidGlassOptics.refreshElement(popover);
  }

  function buildPaginationNode(pag) {
    if (!pag) return null;
    const pills = el('div', { className: 'lg-page-pills' });
    pag.items.forEach((it) => {
      if (it.current) {
        pills.appendChild(el('span', { className: 'lg-page-pill is-current', text: it.label }));
      } else {
        pills.appendChild(el('a', { className: 'lg-page-pill', href: it.href, text: it.label }));
      }
    });

    const right = el('div', { className: 'lg-page-go' });
    if (pag.summary) {
      right.appendChild(el('span', { text: `第 ${pag.summary} 页` }));
    }
    if (pag.goTemplate) {
      const inp = el('input', { type: 'number', min: '1', placeholder: '页码' });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && inp.value.trim()) {
          location.href = pag.goTemplate + encodeURIComponent(inp.value.trim());
        }
      });
      right.appendChild(inp);
      right.appendChild(el('button', {
        type: 'button',
        className: 'lg-btn lg-btn-sm lg-btn-tinted',
        text: '跳转',
        onClick: () => {
          if (inp.value.trim()) location.href = pag.goTemplate + encodeURIComponent(inp.value.trim());
        }
      }));
    }

    return el('div', { className: 'lg-pagination' }, [pills, right]);
  }

  function renderTagBadges(tags) {
    return tags.map((t) => el('span', { className: `lg-badge lg-badge-${t.tone}`, text: t.label }));
  }

  function getVerifyHash() {
    if (typeof pageWin.verifyhash === 'string' && pageWin.verifyhash) return pageWin.verifyhash;
    const inputVerify = qs('input[name="verify"]')?.value;
    if (inputVerify) return inputVerify;
    for (const sc of Array.from(document.scripts || [])) {
      const m = (sc.textContent || '').match(/\bverifyhash\s*=\s*['"]([a-zA-Z0-9]+)['"]/);
      if (m) return m[1];
    }
    return '';
  }

  function parseAjaxText(raw) {
    const text = String(raw || '');
    const cdataM = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
    const ajaxM = !cdataM ? text.match(/<ajax[^>]*>([\s\S]*?)<\/ajax>/i) : null;
    const html = (cdataM ? cdataM[1] : ajaxM ? ajaxM[1] : text).trim();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const plain = tmp.textContent.replace(/\s+/g, ' ').trim();
    return { raw: text, html, plain, doc: tmp };
  }

  function markFavoritedBtn(btnEl) {
    if (!btnEl) return;
    btnEl.classList.add('is-favorited');
    const hasLabel = !!qs('span', btnEl);
    if (!hasLabel) {
      btnEl.innerHTML = icon('bookmark_filled');
    } else {
      const svg = qs('svg', btnEl);
      if (svg) svg.outerHTML = icon('bookmark_filled');
      const lbl = qs('span', btnEl);
      if (lbl && /收藏/.test(lbl.textContent)) lbl.textContent = '已收藏';
    }
  }

  async function favorThread(tid, btnEl) {
    if (!tid) return;
    const verify = getVerifyHash();
    const qsParams = new URLSearchParams({ action: 'favor', tid: String(tid), nowtime: String(Date.now()) });
    if (verify) qsParams.set('verify', verify);

    const bodyParams = new URLSearchParams({ action: 'favor', tid: String(tid), type: '0' });
    if (verify) bodyParams.set('verify', verify);

    try {
      const res = await fetch(`pw_ajax.php?${qsParams.toString()}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: bodyParams.toString()
      });
      let parsed = parseAjaxText(await res.text());

      // Handle PhpWind 2-step favor folder confirmation form if returned
      const formEl = qs('form', parsed.doc);
      if (formEl || (/name=["']type["']|job=add|step=2/i.test(parsed.html) && !/收藏成功|已经收藏|已收藏/i.test(parsed.plain))) {
        const step2Params = new URLSearchParams();
        if (formEl) {
          qsa('input, select', formEl).forEach((inp) => {
            const name = inp.getAttribute('name');
            if (!name) return;
            if ((inp.type === 'checkbox' || inp.type === 'radio') && !inp.checked) return;
            step2Params.set(name, inp.value || '');
          });
        }
        if (!step2Params.has('action')) step2Params.set('action', 'favor');
        if (!step2Params.has('tid')) step2Params.set('tid', String(tid));
        if (!step2Params.get('type')) step2Params.set('type', '0');
        if (!step2Params.has('job')) step2Params.set('job', 'add');
        if (!step2Params.has('step')) step2Params.set('step', '2');
        if (verify && !step2Params.has('verify')) step2Params.set('verify', verify);

        const rawAction = formEl?.getAttribute('action') || `pw_ajax.php?action=favor&tid=${encodeURIComponent(tid)}&nowtime=${Date.now()}`;
        const res2 = await fetch(rawAction, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: step2Params.toString()
        });
        parsed = parseAjaxText(await res2.text());
      }

      if (/收藏成功|成功收藏|添加成功|已加入收藏|success/i.test(parsed.plain)) {
        markFavoritedBtn(btnEl);
        showToast('收藏成功，已加入个人收藏夹');
      } else if (/已经收藏|重复收藏|已存在|已收藏/i.test(parsed.plain)) {
        markFavoritedBtn(btnEl);
        showToast('该主题已在你的收藏夹中');
      } else if (/登录|游客|权限/i.test(parsed.plain)) {
        showToast(parsed.plain.slice(0, 48) || '请先登录后再收藏');
      } else if (typeof pageWin.sendmsg === 'function') {
        if (btnEl && !btnEl.id) btnEl.id = `sp_lg_favor_${tid}`;
        pageWin.sendmsg(`pw_ajax.php?action=favor&tid=${encodeURIComponent(tid)}`, '', btnEl ? btnEl.id : '');
      } else {
        showToast(parsed.plain.slice(0, 60) || '收藏请求未成功，请重试');
      }
    } catch (_) {
      if (typeof pageWin.sendmsg === 'function') {
        if (btnEl && !btnEl.id) btnEl.id = `sp_lg_favor_${tid}`;
        try {
          pageWin.sendmsg(`pw_ajax.php?action=favor&tid=${encodeURIComponent(tid)}`, '', btnEl ? btnEl.id : '');
          return;
        } catch (__) {}
      }
      showToast('收藏失败，请检查网络连接');
    }
  }

  async function toggleForumShortcut(fid, origA, btnEl) {
    const verify = getVerifyHash();
    if (!fid) {
      if (origA) origA.click();
      return;
    }
    const qsParams = new URLSearchParams({ action: 'shortcut', fid: String(fid), nowtime: String(Date.now()) });
    if (verify) qsParams.set('verify', verify);
    try {
      const res = await fetch(`pw_ajax.php?${qsParams.toString()}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: qsParams.toString()
      });
      const parsed = parseAjaxText(await res.text());
      if (parsed.plain) {
        showToast(parsed.plain.slice(0, 48));
      } else if (typeof pageWin.sendmsg === 'function') {
        if (btnEl && !btnEl.id) btnEl.id = `sp_lg_sc_${fid}`;
        pageWin.sendmsg(`pw_ajax.php?action=shortcut&fid=${encodeURIComponent(fid)}`, '', btnEl ? btnEl.id : '');
      } else if (origA) {
        origA.click();
      }
    } catch (_) {
      if (origA) origA.click();
      showToast('版块收藏请求已发送');
    }
  }

  /* ============================================================================
   * 6. PAGE BUILDERS
   * ========================================================================== */

  function buildIndexPage(mainMount, userCtx) {
    const containers = [];

    // 1. Site Pulse Hero
    const heroStats = [];
    if (userCtx.statsToday) heroStats.push(el('span', { className: 'lg-stat-pill', text: `今日 ${userCtx.statsToday}` }));
    if (userCtx.statsYesterday) heroStats.push(el('span', { className: 'lg-stat-pill', text: `昨日 ${userCtx.statsYesterday}` }));
    if (userCtx.statsMax) heroStats.push(el('span', { className: 'lg-stat-pill', text: `最高日 ${userCtx.statsMax}` }));
    if (userCtx.statsTotal) heroStats.push(el('span', { className: 'lg-stat-pill', text: userCtx.statsTotal }));

    const onlineTd = qs('#cate_info .tr2 td');
    if (onlineTd) {
      const onlineM = onlineTd.textContent.match(/共\s*\d+\s*人在线/);
      if (onlineM) heroStats.push(el('span', { className: 'lg-stat-pill', text: onlineM[0] }));
    }

    containers.push(el('section', { className: 'lg-pulse-hero lg-glass-interactive' }, [
      el('div', {}, [
        el('h1', { className: 'lg-pulse-title', text: '南+ South Plus' }),
        el('div', { className: 'lg-pulse-stats' }, heroStats)
      ]),
      el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;' }, [
        el('a', { className: 'lg-btn lg-btn-sm lg-btn-primary lg-glass-interactive', href: 'search2.php?orderway-postdate-asc-desc-newatc-1.html', target: '_blank', html: `${icon('bolt')}<span>最新帖子</span>` }),
        el('a', { className: 'lg-btn lg-btn-sm lg-btn-tinted', href: 'job.php?action-sign.html', html: `${icon('check')}<span>标记已读</span>` }),
        el('a', { className: 'lg-btn lg-btn-sm', href: 'plugin.php?H_name-tasks.html', html: `${icon('task')}<span>社区任务</span>` })
      ])
    ]));

    // 2. Site Announcements Banner
    const noticeItems = qsa('#notice0 ul li a');
    if (noticeItems.length > 0) {
      containers.push(el('div', { className: 'lg-notice-strip' }, [
        el('span', { html: icon('campaign'), style: 'display:inline-flex;color:var(--lg-accent);' }),
        el('strong', { text: '站点公告', style: 'font-size:13px;' }),
        el('div', { className: 'lg-notice-items' }, noticeItems.map((a) => el('a', {
          href: a.getAttribute('href') || '#',
          text: a.textContent.trim()
        })))
      ]));
    }

    // 3. Top Feeds Bento Widget
    const feedTable = qs('#main > .t table');
    if (feedTable && !feedTable.closest('.contentwrap')) {
      const titles = qsa('tr.tr2 td', feedTable).map((td) => td.textContent.trim());
      const cells = qsa('tr.tr3 td', feedTable);
      if (titles.length && cells.length) {
        const segBar = el('div', { className: 'lg-segmented' });
        const feedGrid = el('div', { className: 'lg-feeds-grid' });
        const feedStates = [];
        let currentTab = 'all';

        const FEEDS_CACHE_TTL = 120000;
        const readFeedsCache = () => {
          try {
            const raw = sessionStorage.getItem(FEEDS_CACHE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (!parsed || Date.now() - (parsed.ts || 0) > FEEDS_CACHE_TTL) return {};
            return parsed.data || {};
          } catch (_) {
            return {};
          }
        };

        const writeFeedsCache = () => {
          try {
            const data = {};
            feedStates.forEach((st, idx) => {
              if (st.expandedLoaded && st.expandedItems.length) {
                data[String(idx)] = { title: st.title, items: st.expandedItems };
              }
            });
            sessionStorage.setItem(FEEDS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
          } catch (_) {}
        };

        const parseTidFromHref = (href) => {
          const m = (href || '').match(/tid[-=](\d+)/i);
          return m ? m[1] : '';
        };

        const cleanFeedTitle = (txt) => (txt || '').replace(/^[\s●•·]+/, '').trim();

        const getFallbackFeedUrl = (scriptSrc, title) => {
          if (/fidin=221/i.test(scriptSrc) || /GALGAME/i.test(title)) return 'thread.php?fid-221.html';
          if (/fidin=48/i.test(scriptSrc) || /求物/.test(title)) return 'thread.php?fid-48.html';
          if (/order=1/.test(scriptSrc) || /最新回复/.test(title)) return 'thread.php?fid-9.html';
          return 'search2.php?orderway-postdate-asc-desc-newatc-1.html';
        };

        const parseInitialFeedItems = (cell) => {
          if (!cell) return [];
          const items = [];
          const seen = new Set();
          qsa('a[href]', cell).forEach((a) => {
            const href = a.getAttribute('href') || '#';
            const title = cleanFeedTitle(a.getAttribute('title') || a.textContent);
            if (!title) return;
            const key = parseTidFromHref(href) || href;
            if (seen.has(key)) return;
            seen.add(key);
            items.push({ title, href, meta: '' });
          });
          return items;
        };

        const loadMoreFeedItems = async (state, force = false) => {
          if (state.loading) return;
          if (state.expandedLoaded && !force) return;
          state.loading = true;
          if (currentTab !== 'all' && feedStates[Number(currentTab)] === state) renderFeedBoxes();

          const merged = [];
          const byKey = new Map();
          const upsertItem = (item) => {
            const key = parseTidFromHref(item.href) || item.href;
            if (!item.title) return;
            const existing = byKey.get(key);
            if (!existing) {
              const entry = { title: item.title, href: item.href, meta: item.meta || '' };
              byKey.set(key, entry);
              merged.push(entry);
            } else {
              const existingTruncated = /\.\.$/.test(existing.title);
              const incomingLonger = item.title.length > existing.title.length && !/\.\.$/.test(item.title);
              if (existingTruncated && incomingLonger) existing.title = item.title;
              if (!existing.meta && item.meta) existing.meta = item.meta;
            }
          };

          state.initialItems.forEach(upsertItem);

          try {
            if (state.scriptSrc) {
              const expandedSrc = state.scriptSrc
                .replace(/num=\d+/i, 'num=18')
                .replace(/length=\d+/i, 'length=96');
              const res = await fetch(expandedSrc, { credentials: 'include' });
              if (res.ok) {
                const text = await res.text();
                const tmp = document.createElement('div');
                const matches = [...text.matchAll(/<a\s+[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi)];
                matches.forEach((m) => {
                  tmp.innerHTML = m[2];
                  const t = cleanFeedTitle(tmp.textContent);
                  if (t) upsertItem({ title: t, href: m[1], meta: '' });
                });
              }
            }
          } catch (_) {}

          try {
            if (merged.length < 18 && state.boardHref) {
              const res = await fetch(state.boardHref, { credentials: 'include' });
              if (res.ok) {
                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const rows = qsa('#ajaxtable tr', doc);
                let inNormal = !rows.some((r) => r.classList.contains('tr2') && /普通主题/.test(r.textContent));
                for (const tr of rows) {
                  if (tr.classList.contains('tr2')) {
                    if (/普通主题/.test(tr.textContent)) inNormal = true;
                    continue;
                  }
                  if (!tr.classList.contains('tr3') || !inNormal) continue;
                  if (isAdElement(tr)) continue;
                  const cellsTr = qsa(':scope > td, :scope > th', tr);
                  if (cellsTr.length < 4) continue;
                  const titleA = qs('h3 a', cellsTr[1]) || qs('a', cellsTr[1]);
                  if (!titleA) continue;
                  const authorA = qs('a', cellsTr[2]);
                  const statTxt = cellsTr[3].textContent.replace(/\s+/g, ' ').trim();
                  const fullTitle = cleanFeedTitle(titleA.textContent);
                  const href = titleA.getAttribute('href') || '#';
                  const tid = parseTidFromHref(href);
                  if (tid && byKey.has(tid)) {
                    upsertItem({ title: fullTitle, href, meta: [authorA ? authorA.textContent.trim() : '', statTxt].filter(Boolean).join(' · ') });
                  } else if (merged.length < 18) {
                    upsertItem({
                      title: fullTitle,
                      href,
                      meta: [authorA ? authorA.textContent.trim() : '', statTxt].filter(Boolean).join(' · ')
                    });
                  }
                }
              }
            }
          } catch (_) {}

          state.expandedItems = merged.slice(0, 18);
          state.expandedLoaded = true;
          state.loading = false;
          writeFeedsCache();
          if (currentTab === 'all' || feedStates[Number(currentTab)] === state) renderFeedBoxes();
        };

        const renderFeedBoxes = () => {
          const isSingle = currentTab !== 'all';
          feedGrid.classList.toggle('is-single', isSingle);
          feedGrid.dataset.count = isSingle ? '1' : String(feedStates.length);
          feedGrid.innerHTML = '';

          feedStates.forEach((st, idx) => {
            if (isSingle && String(idx) !== String(currentTab)) return;
            const list = isSingle
              ? (st.expandedItems.length ? st.expandedItems : st.initialItems)
              : (st.expandedItems.length ? st.expandedItems.slice(0, 6) : st.initialItems.slice(0, 6));

            const headLeft = el('div', { className: 'lg-feed-box-title' }, [
              el('span', { text: st.title }),
              isSingle ? el('span', { className: 'lg-badge lg-badge-primary', text: `${list.length} 条` }) : null,
              isSingle && st.loading ? el('span', { className: 'lg-badge lg-badge-neutral', text: '同步最新列表中...' }) : null
            ]);

            const headRight = isSingle
              ? el('div', { style: 'display:flex;align-items:center;gap:6px;' }, [
                  el('button', {
                    type: 'button',
                    className: 'lg-btn lg-btn-sm',
                    html: `${icon('refresh')}<span>刷新</span>`,
                    onClick: () => loadMoreFeedItems(st, true)
                  }),
                  el('a', {
                    className: 'lg-btn lg-btn-sm lg-btn-tinted',
                    href: st.boardHref,
                    html: `<span>进入版块</span>${icon('chevron_right')}`
                  })
                ])
              : null;

            const body = el('div', { className: 'lg-feed-box-body' });
            if (list.length) {
              list.forEach((item, i) => {
                body.appendChild(el('a', {
                  className: 'lg-feed-item',
                  href: item.href,
                  target: '_blank',
                  title: item.title
                }, [
                  el('span', { className: 'lg-feed-num', text: String(i + 1) }),
                  el('span', { className: 'lg-feed-item-title', text: item.title }),
                  isSingle && item.meta ? el('span', { className: 'lg-feed-item-meta', text: item.meta }) : null
                ]));
              });
              if (isSingle && st.loading && list.length < 14) {
                for (let s = list.length; s < 14; s++) {
                  body.appendChild(el('div', { className: 'lg-feed-skeleton', 'aria-hidden': 'true' }));
                }
              }
            } else {
              body.appendChild(el('span', {
                style: 'opacity:.65;font-size:12.5px;',
                text: '动态排行由站内脚本实时加载（离线快照无实时数据）'
              }));
            }

            const foot = !isSingle
              ? el('div', { className: 'lg-feed-box-foot' }, [
                  el('button', {
                    type: 'button',
                    className: 'lg-btn lg-btn-sm lg-btn-ghost',
                    html: `<span>展开更多</span>${icon('chevron_right')}`,
                    onClick: () => applyFeedTab(idx)
                  })
                ])
              : null;

            feedGrid.appendChild(el('div', { className: 'lg-feed-box' }, [
              el('div', { className: 'lg-feed-box-head' }, [headLeft, headRight]),
              body,
              foot
            ]));
          });
        };

        const applyFeedTab = (activeIdx) => {
          currentTab = activeIdx;
          qsa('.lg-seg-btn', segBar).forEach((b) => {
            b.classList.toggle('is-active', b.dataset.idx === String(activeIdx));
          });
          renderFeedBoxes();
          if (activeIdx !== 'all') {
            const st = feedStates[Number(activeIdx)];
            if (st && !st.expandedLoaded) loadMoreFeedItems(st);
          }
        };

        const cachedFeeds = readFeedsCache();
        titles.forEach((title, idx) => {
          const cell = cells[idx];
          const scriptEl = cell ? qs('script[src*="new.php"]', cell) : null;
          const scriptSrc = scriptEl ? scriptEl.getAttribute('src') || '' : '';
          const initialItems = parseInitialFeedItems(cell);
          const cached = cachedFeeds[String(idx)];
          const hasCache = !!(cached && cached.title === title && Array.isArray(cached.items) && cached.items.length >= initialItems.length);
          feedStates.push({
            title,
            scriptSrc,
            boardHref: getFallbackFeedUrl(scriptSrc, title),
            initialItems,
            expandedItems: hasCache ? cached.items : initialItems.slice(),
            expandedLoaded: hasCache,
            loading: false
          });
        });

        setTimeout(() => {
          feedStates.forEach((st) => {
            if (!st.expandedLoaded && !st.loading) loadMoreFeedItems(st);
          });
        }, 120);

        segBar.appendChild(el('button', {
          type: 'button',
          className: 'lg-seg-btn is-active',
          text: '全部看板',
          dataset: { idx: 'all' },
          onClick: () => applyFeedTab('all')
        }));
        titles.forEach((t, idx) => {
          segBar.appendChild(el('button', {
            type: 'button',
            className: 'lg-seg-btn',
            text: t,
            dataset: { idx: String(idx) },
            onClick: () => applyFeedTab(idx)
          }));
        });

        renderFeedBoxes();

        containers.push(el('section', { className: 'lg-card' }, [
          el('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;' }, [
            el('strong', { text: '实时动态聚合', style: 'font-size:15px;' }),
            segBar
          ]),
          feedGrid
        ]));
      }
    }

    // 4. Forum Categories & Board Cards
    const collapsedMap = Store.get('collapsedCategories') || {};
    qsa('.contentwrap .t[id^="t_"]').forEach((catBox) => {
      const cid = catBox.id.replace('t_', '');
      const h2a = qs('th.h h2 a', catBox);
      if (!h2a) return;
      const grid = el('div', { className: 'lg-board-grid' });

      qsa('tr[id^="fid_"]', catBox).forEach((tr) => {
        const fid = tr.id.replace('fid_', '');
        const titleA = qs(`#fn_${fid}`, tr) || qs('h3 a', tr);
        if (!titleA) return;
        const iconImg = qs('td.icon img', tr);
        const iconSrc = iconImg ? iconImg.getAttribute('src') || '' : '';
        const hasNew = /new\.gif/i.test(iconSrc);
        const isLocked = /lock\.gif/i.test(iconSrc);
        const todaySpan = qs('th span.s3', tr);
        const todayCount = todaySpan ? todaySpan.textContent.replace(/[()]/g, '').trim() : '0';
        const descEl = qs(`#desc_${fid}`, tr);
        const subLinks = qsa('th > div h3 a', tr);
        const statsTd = qs('td.tal.y-style.f10.e', tr);
        const lastTh = qsa('th', tr)[1];
        const lastA = lastTh ? qs('a.a2', lastTh) : null;
        const lastMeta = lastTh ? qs('span.gray2', lastTh) : null;

        const subWrap = el('div', { className: 'lg-subforum-wrap' });
        const MAX_SUB = 6;
        subLinks.forEach((sa, idx) => {
          const chip = el('a', {
            className: 'lg-sub-chip',
            href: sa.getAttribute('href') || '#',
            text: sa.textContent.trim(),
            style: idx >= MAX_SUB ? 'display:none;' : ''
          });
          subWrap.appendChild(chip);
        });
        if (subLinks.length > MAX_SUB) {
          const expandBtn = el('button', {
            type: 'button',
            className: 'lg-sub-chip',
            text: `+${subLinks.length - MAX_SUB} 展开`,
            style: 'background:var(--lg-accent-soft);color:var(--lg-accent);font-weight:600;border-color:transparent;',
            onClick: () => {
              qsa('.lg-sub-chip', subWrap).forEach((c) => { c.style.display = ''; });
              expandBtn.remove();
            }
          });
          subWrap.appendChild(expandBtn);
        }

        const card = el('article', {
          className: 'lg-board-card lg-glass-interactive',
          dataset: { filterText: `${titleA.textContent} ${descEl ? descEl.textContent : ''} ${subLinks.map((s) => s.textContent).join(' ')}`.toLowerCase() }
        }, [
          el('div', { className: 'lg-board-head' }, [
            el('div', { style: 'display:flex;align-items:center;gap:12px;min-width:0;' }, [
              el('div', {
                className: `lg-board-icon ${hasNew ? 'has-new' : ''}`,
                html: icon(isLocked ? 'lock' : 'forum')
              }),
              el('div', { style: 'min-width:0;' }, [
                el('a', { className: 'lg-board-title', href: titleA.getAttribute('href') || '#', text: titleA.textContent.trim() }),
                descEl && descEl.innerHTML.trim()
                  ? el('div', { className: 'lg-board-desc', html: descEl.innerHTML })
                  : null
              ])
            ]),
            todayCount !== '0'
              ? el('span', { className: 'lg-badge lg-badge-primary', text: `今日 +${todayCount}` })
              : el('span', { className: 'lg-badge lg-badge-neutral', text: '0' })
          ]),
          subLinks.length ? subWrap : null,
          el('div', { className: 'lg-board-foot' }, [
            el('span', { text: statsTd ? statsTd.textContent.replace(/\s+/g, ' ').trim() : '', style: 'flex-shrink:0;' }),
            lastA
              ? el('div', { className: 'lg-board-last', title: lastA.textContent.trim() }, [
                  el('a', { href: lastA.getAttribute('href') || '#', text: lastA.textContent.trim() }),
                  lastMeta ? el('span', { text: ` · ${lastMeta.textContent.trim()}`, style: 'opacity:.75;' }) : null
                ])
              : null
          ])
        ]);

        grid.appendChild(card);
      });

      const acc = el('section', {
        className: `lg-accordion ${collapsedMap[cid] ? 'is-collapsed' : ''}`
      }, [
        el('button', {
          type: 'button',
          className: 'lg-accordion-head',
          onClick: () => {
            const next = !acc.classList.contains('is-collapsed');
            acc.classList.toggle('is-collapsed', next);
            const map = Object.assign({}, Store.get('collapsedCategories') || {});
            map[cid] = next;
            Store.set('collapsedCategories', map);
          }
        }, [
          el('span', { text: h2a.textContent.trim() }),
          el('span', { className: 'lg-accordion-chev', html: icon('chevron_down') })
        ]),
        el('div', { className: 'lg-accordion-body' }, [grid])
      ]);
      containers.push(acc);
    });

    // 5. Forum Links & Online Info
    const cateInfo = qs('#cate_info');
    if (cateInfo) {
      const linkChips = qsa('a', cateInfo).filter((a) => !a.getAttribute('name')).map((a) => el('a', {
        className: 'lg-sub-chip',
        href: a.getAttribute('href') || '#',
        target: '_blank',
        rel: 'noopener noreferrer',
        text: a.textContent.replace(/[\[\]]/g, '').trim()
      })).filter((a) => a.textContent);

      if (linkChips.length) {
        const infoAcc = el('section', { className: 'lg-accordion is-collapsed' }, [
          el('button', {
            type: 'button',
            className: 'lg-accordion-head',
            onClick: () => infoAcc.classList.toggle('is-collapsed')
          }, [
            el('span', { text: '友情链接与在线统计' }),
            el('span', { className: 'lg-accordion-chev', html: icon('chevron_down') })
          ]),
          el('div', { className: 'lg-accordion-body' }, [
            el('div', { className: 'lg-subforum-wrap' }, linkChips)
          ])
        ]);
        containers.push(infoAcc);
      }
    }

    containers.forEach((c) => mainMount.appendChild(c));
  }

  function buildForumSharedHeader(crumbsInfo) {
    const nodes = [];
    const forumCrumb = crumbsInfo.crumbs[crumbsInfo.crumbs.length - 1];
    const forumTitle = forumCrumb ? forumCrumb.text : document.title.split('-')[0].trim();
    const postBtnA = qs('#td_post') ? qs('#td_post').closest('a') : qs('a[href^="post.php?fid-"]');
    const isWall = detectPageType() === 'thread_wall';

    let listHref = '';
    let wallHref = '';
    if (crumbsInfo.modeLink) {
      if (isWall) {
        wallHref = location.href;
        listHref = crumbsInfo.modeLink.href;
      } else {
        listHref = location.href;
        wallHref = crumbsInfo.modeLink.href;
      }
    }

    const heroActions = el('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;' });
    if (listHref && wallHref) {
      heroActions.appendChild(el('div', { className: 'lg-segmented' }, [
        el('a', { className: `lg-seg-btn ${!isWall ? 'is-active' : ''}`, href: listHref, html: `${icon('list')}<span>列表</span>` }),
        el('a', { className: `lg-seg-btn ${isWall ? 'is-active' : ''}`, href: wallHref, html: `${icon('grid')}<span>图墙</span>` })
      ]));
    }
    if (crumbsInfo.shortcutNode) {
      const origA = qs('a', crumbsInfo.shortcutNode);
      const onclickAttr = origA ? (origA.getAttribute('onclick') || '') : '';
      const fidFromOnclick = (onclickAttr.match(/fid=(\d+)/i) || [])[1];
      const scFid = fidFromOnclick || parseFidFromHref(location.href);
      heroActions.appendChild(el('button', {
        type: 'button',
        id: scFid ? `sp_lg_sc_${scFid}` : 'sp_lg_sc_btn',
        className: 'lg-btn lg-btn-sm lg-btn-tinted',
        html: `${icon('star')}<span>收藏版块</span>`,
        onClick: (e) => toggleForumShortcut(scFid, origA, e.currentTarget)
      }));
    }
    if (crumbsInfo.rssHref) {
      heroActions.appendChild(el('a', {
        className: 'lg-icon-btn is-glass',
        href: crumbsInfo.rssHref,
        target: '_blank',
        title: 'RSS 订阅',
        html: icon('rss')
      }));
    }
    if (postBtnA) {
      heroActions.appendChild(el('a', {
        className: 'lg-btn lg-btn-primary lg-glass-interactive',
        href: postBtnA.getAttribute('href') || '#',
        html: `${icon('edit')}<span>发布新帖</span>`
      }));
    }

    nodes.push(el('section', { className: 'lg-forum-hero lg-glass-interactive' }, [
      el('div', {}, [
        el('h1', { className: 'lg-forum-hero-title', text: forumTitle }),
        el('div', { style: 'font-size:12.5px;color:var(--lg-text-secondary);margin-top:4px;' }, [
          el('span', { text: isWall ? '图墙画廊视图' : '主题列表视图' })
        ])
      ]),
      heroActions
    ]));

    // Announcement Accordion (#tab_1)
    const noticeTab = qs('#cate_thread #tab_1') || qs('#tab_1');
    if (noticeTab && noticeTab.innerHTML.trim()) {
      const noticeBody = el('div', { className: 'lg-accordion-body lg-post-body' });
      noticeBody.appendChild(noticeTab);
      const noticeAcc = el('section', {
        className: `lg-accordion ${Store.get('collapseNoticeByDefault') ? 'is-collapsed' : ''}`
      }, [
        el('button', {
          type: 'button',
          className: 'lg-accordion-head',
          onClick: () => noticeAcc.classList.toggle('is-collapsed')
        }, [
          el('span', { style: 'display:inline-flex;align-items:center;gap:8px;', html: `${icon('campaign')}<span>版块公告与发帖规范</span>` }),
          el('span', { className: 'lg-accordion-chev', html: icon('chevron_down') })
        ]),
        noticeBody
      ]);
      nodes.push(noticeAcc);
    }

    // Sub-forums Strip (#cate_children)
    const childTbody = qs('#cate_children');
    if (childTbody) {
      const subRow = el('div', { className: 'lg-card', style: 'padding:13px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;' }, [
        el('strong', { text: '子版块', style: 'font-size:12.5px;color:var(--lg-text-secondary);' })
      ]);
      qsa('tr.tr3', childTbody).forEach((tr) => {
        const a = qs('h2 a', tr);
        if (!a) return;
        const countTd = qs('td.f10', tr);
        subRow.appendChild(el('a', {
          className: 'lg-chip',
          href: a.getAttribute('href') || '#',
          html: `${icon('forum')}<span>${escapeHtml(a.textContent.trim())}</span>${countTd ? `<span style="opacity:.7;font-size:11px;">(${escapeHtml(countTd.textContent.trim())})</span>` : ''}`
        }));
      });
      nodes.push(subRow);
    }

    // Filter Chips + Sort Form
    const filterRow = el('div', { className: 'lg-toolbar-row' });
    const chipStrip = el('div', { className: 'lg-chip-strip' });
    qsa('.threadlist li').forEach((li) => {
      const a = qs('a', li);
      if (!a) return;
      chipStrip.appendChild(el('a', {
        className: `lg-chip ${li.classList.contains('current') ? 'is-selected' : ''}`,
        href: a.getAttribute('href') || '#',
        text: a.textContent.trim()
      }));
    });
    filterRow.appendChild(chipStrip);

    const nativeSortForm = qs('form[action*="thread.php"]');
    if (nativeSortForm) {
      const sortBar = el('div', { className: 'lg-sort-bar' });
      qsa('select', nativeSortForm).forEach((origSel) => {
        const cloneSel = el('select', { className: 'lg-select', name: origSel.name });
        qsa('option', origSel).forEach((opt) => {
          const o = el('option', { value: opt.value, text: opt.textContent });
          if (opt.selected) o.selected = true;
          cloneSel.appendChild(o);
        });
        cloneSel.addEventListener('change', () => {
          origSel.value = cloneSel.value;
          nativeSortForm.submit();
        });
        sortBar.appendChild(cloneSel);
      });
      const readlogBtn = qs('#readlog');
      if (readlogBtn) {
        sortBar.appendChild(el('button', {
          type: 'button',
          className: 'lg-btn lg-btn-sm',
          html: `${icon('history')}<span>浏览记录</span>`,
          onClick: () => readlogBtn.click()
        }));
      }
      filterRow.appendChild(sortBar);
    }
    nodes.push(filterRow);

    return nodes;
  }

  function buildThreadRow(tr) {
    const cells = qsa(':scope > td, :scope > th', tr);
    if (cells.length < 5) return null;
    if (Store.get('cleanAds') && isAdElement(tr)) return null;

    const statusImg = qs('img', cells[0]);
    const statusSrc = statusImg ? statusImg.getAttribute('src') || '' : '';
    const isAnc = /anc\.gif/i.test(statusSrc);
    const isPinned = !!qs('img[src*="headtopic_"]', cells[1]);
    const isDigest = !!qs('img[src*="digest_"]', cells[1]);
    const hasImg = !!qs('img[src*="file/img.gif"]', cells[1]);
    const hasZip = !!qs('img[src*="file/zip.gif"]', cells[1]);
    const isNew = /topicnew\.gif/i.test(statusSrc) || !!qs('img[src*="file/new.gif"]', cells[1]);
    const isHot = /topichot\.gif/i.test(statusSrc);
    const isLock = /topiclock\.gif|topicclose\.gif/i.test(statusSrc);
    const isVote = /vote/i.test(statusSrc);

    const h3 = qs('h3', cells[1]);
    const titleA = h3 ? qs('a', h3) : qs('a', cells[1]);
    if (!titleA) return null;

    const typeA = qs('a.s8', cells[1]);
    const authorA = qs('a', cells[2]);
    const postDateEl = qs('.f10', cells[2]);
    const statText = cells[3].textContent.replace(/\s+/g, ' ').trim();
    const lastA = qs('a', cells[4]);
    const lastByEl = qs('.gray2', cells[4]);
    const multiPageLinks = qsa('.tpage a', cells[1]);

    const statusClass = isLock ? 'is-lock' : isNew ? 'is-new' : isHot ? 'is-hot' : isPinned ? 'is-pin' : isDigest ? 'is-digest' : '';
    const statusIconName = isAnc ? 'campaign' : isPinned ? 'push_pin' : isVote ? 'poll' : isLock ? 'lock' : isHot ? 'bolt' : 'forum';

    const titleLine = el('div', { className: 'lg-thread-title-line' });
    if (isPinned) titleLine.appendChild(el('span', { className: 'lg-badge lg-badge-primary', text: '置顶' }));
    if (isDigest) titleLine.appendChild(el('span', { className: 'lg-badge lg-badge-tertiary', text: '精华' }));
    if (typeA) {
      titleLine.appendChild(el('a', {
        className: 'lg-badge lg-badge-secondary',
        href: typeA.getAttribute('href') || '#',
        text: typeA.textContent.replace(/[\[\]]/g, '').trim()
      }));
    }
    titleLine.appendChild(el('a', {
      className: 'lg-thread-link',
      href: titleA.getAttribute('href') || '#',
      text: titleA.textContent.trim()
    }));
    if (hasImg) titleLine.appendChild(el('span', { className: 'lg-badge lg-badge-neutral', html: icon('image'), title: '含图片' }));
    if (hasZip) titleLine.appendChild(el('span', { className: 'lg-badge lg-badge-neutral', html: icon('zip'), title: '含附件' }));
    if (isNew) titleLine.appendChild(el('span', { className: 'lg-badge lg-badge-error', text: 'NEW' }));

    const subMeta = el('div', { className: 'lg-thread-submeta' });
    if (authorA) {
      subMeta.appendChild(el('a', {
        href: authorA.getAttribute('href') || '#',
        text: authorA.textContent.trim(),
        style: 'color:var(--lg-text-secondary);font-weight:600;'
      }));
    }
    if (postDateEl) {
      subMeta.appendChild(el('span', { text: `发表于 ${postDateEl.textContent.trim()}` }));
    }
    if (multiPageLinks.length) {
      const jump = el('div', { className: 'lg-page-jump' });
      multiPageLinks.forEach((pa) => {
        jump.appendChild(el('a', { href: pa.getAttribute('href') || '#', text: pa.textContent.trim() }));
      });
      subMeta.appendChild(jump);
    }

    const statsCol = el('div', { className: 'lg-thread-stats' }, [
      el('span', { className: 'lg-badge lg-badge-neutral', text: `回复/人气 ${statText}` }),
      lastA
        ? el('div', {}, [
            el('a', { href: lastA.getAttribute('href') || '#', text: lastA.textContent.trim(), style: 'color:var(--lg-text-secondary);' }),
            lastByEl ? el('span', { text: ` · ${lastByEl.textContent.replace(/^by:\s*/i, '').trim()}` }) : null
          ])
        : null
    ]);

    return {
      isPinnedOrAnc: isAnc || isPinned,
      node: el('article', {
        className: 'lg-thread-row',
        dataset: { filterText: `${titleA.textContent} ${authorA ? authorA.textContent : ''}`.toLowerCase() }
      }, [
        el('div', { className: `lg-thread-status ${statusClass}`, html: icon(statusIconName) }),
        el('div', { className: 'lg-thread-main' }, [titleLine, subMeta]),
        statsCol
      ])
    };
  }

  function buildPinnedSection(pinnedNodes) {
    if (!pinnedNodes.length) return null;
    const list = el('div', { className: 'lg-inset-group' }, pinnedNodes);
    const acc = el('section', {
      className: `lg-accordion ${Store.get('collapsePinnedByDefault') ? 'is-collapsed' : ''}`
    }, [
      el('button', {
        type: 'button',
        className: 'lg-accordion-head',
        onClick: () => acc.classList.toggle('is-collapsed')
      }, [
        el('span', { style: 'display:inline-flex;align-items:center;gap:8px;', html: `${icon('push_pin')}<span>置顶与版块公告帖 (${pinnedNodes.length})</span>` }),
        el('span', { className: 'lg-accordion-chev', html: icon('chevron_down') })
      ]),
      el('div', { className: 'lg-accordion-body' }, [list])
    ]);
    return acc;
  }

  function buildThreadListPage(mainMount, crumbsInfo) {
    buildForumSharedHeader(crumbsInfo).forEach((n) => mainMount.appendChild(n));

    const topPag = buildPaginationNode(extractPagination());
    if (topPag) mainMount.appendChild(topPag);

    const pinnedNodes = [];
    const normalNodes = [];
    let passedNormalSplit = false;

    qsa('#ajaxtable tr').forEach((tr) => {
      if (tr.classList.contains('tr2')) {
        if (/普通主题/.test(tr.textContent)) passedNormalSplit = true;
        return;
      }
      if (!tr.classList.contains('tr3')) return;
      const built = buildThreadRow(tr);
      if (!built) return;
      if (!passedNormalSplit && built.isPinnedOrAnc) pinnedNodes.push(built.node);
      else normalNodes.push(built.node);
    });

    const pinnedAcc = buildPinnedSection(pinnedNodes);
    if (pinnedAcc) mainMount.appendChild(pinnedAcc);

    if (normalNodes.length) {
      mainMount.appendChild(el('section', { className: 'lg-inset-group' }, normalNodes));
    } else {
      mainMount.appendChild(el('div', { className: 'lg-card', text: '当前筛选下暂无主题帖。' }));
    }

    const botPag = buildPaginationNode(extractPagination());
    if (botPag) mainMount.appendChild(botPag);
  }

  function buildThreadWallPage(mainMount, crumbsInfo) {
    buildForumSharedHeader(crumbsInfo).forEach((n) => mainMount.appendChild(n));

    const pinnedNodes = [];
    qsa('#ajaxtable tr.tr3').forEach((tr) => {
      const built = buildThreadRow(tr);
      if (built) pinnedNodes.push(built.node);
    });
    const pinnedAcc = buildPinnedSection(pinnedNodes);
    if (pinnedAcc) mainMount.appendChild(pinnedAcc);

    const wallGrid = el('section', {
      className: `lg-wall-grid ${Store.get('wallAspect') === 'contain' ? 'is-contain' : ''}`
    });

    const wallToolbar = el('div', { className: 'lg-toolbar-row' }, [
      el('span', { style: 'font-size:13px;font-weight:700;color:var(--lg-text-secondary);', text: '资源图墙' }),
      el('div', { className: 'lg-segmented' }, [
        el('button', {
          type: 'button',
          className: `lg-seg-btn ${Store.get('wallAspect') === 'cover' ? 'is-active' : ''}`,
          text: '裁剪填充',
          onClick: (e) => {
            Store.set('wallAspect', 'cover');
            wallGrid.classList.remove('is-contain');
            const seg = e.currentTarget.parentElement;
            qsa('.lg-seg-btn', seg).forEach((b, i) => b.classList.toggle('is-active', i === 0));
          }
        }),
        el('button', {
          type: 'button',
          className: `lg-seg-btn ${Store.get('wallAspect') === 'contain' ? 'is-active' : ''}`,
          text: '完整比例',
          onClick: (e) => {
            Store.set('wallAspect', 'contain');
            wallGrid.classList.add('is-contain');
            const seg = e.currentTarget.parentElement;
            qsa('.lg-seg-btn', seg).forEach((b, i) => b.classList.toggle('is-active', i === 1));
          }
        })
      ])
    ]);
    mainMount.appendChild(wallToolbar);

    const topPag = buildPaginationNode(extractPagination());
    if (topPag) mainMount.appendChild(topPag);

    const wallImages = [];
    qsa('#wall .stream li.dcsns-li').forEach((li) => {
      const titleA = qs('.section-title a', li);
      if (!titleA) return;
      const href = titleA.getAttribute('href') || '#';
      const tidM = href.match(/tid[-=](\d+)/i);
      const tid = tidM ? tidM[1] : '';
      const img = qs('.section-text img', li);
      const imgSrc = img ? img.getAttribute('src') || '' : '';
      const isNoImg = !imgSrc || /noimageavailble/i.test(imgSrc);
      if (!isNoImg) wallImages.push(imgSrc);
      const imgIndex = wallImages.length - 1;

      const parsed = parseSmartTitle(titleA.textContent);
      const textWrap = qs('.section-text', li);
      const statsMatch = textWrap ? textWrap.textContent.match(/回复\/人气：\s*([\d]+\s*\/\s*[\d]+)/) : null;
      const statsStr = statsMatch ? statsMatch[1].replace(/\s+/g, '') : '';
      const authorA = qs('.section-intro a', li);
      const dateTd = qsa('.section-intro td', li)[1];

      const mediaEl = el('div', { className: 'lg-wall-media' }, [
        isNoImg
          ? el('div', {
              style: 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--lg-text-tertiary);',
              html: `${icon('image', 'lg-icon-lg')}<span style="font-size:12px;">暂无封面图</span>`
            })
          : el('a', { href, target: '_blank' }, [
              el('img', { src: imgSrc, loading: 'lazy', referrerpolicy: 'no-referrer', alt: parsed.clean })
            ]),
        el('div', { className: 'lg-wall-overlay' }, [
          !isNoImg
            ? el('button', {
                type: 'button',
                className: 'lg-wall-float-btn',
                title: '放大预览',
                html: icon('zoom_in'),
                onClick: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  Lightbox.open(wallImages, imgIndex);
                }
              })
            : null,
          tid
            ? el('button', {
                type: 'button',
                id: `sp_favor_${tid}`,
                className: 'lg-wall-float-btn',
                title: '收藏该主题',
                html: icon('bookmark'),
                onClick: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  favorThread(tid, e.currentTarget);
                }
              })
            : null
        ])
      ]);

      wallGrid.appendChild(el('article', {
        className: 'lg-wall-card',
        dataset: { filterText: `${parsed.raw} ${authorA ? authorA.textContent : ''}`.toLowerCase() }
      }, [
        mediaEl,
        el('div', { className: 'lg-wall-body' }, [
          parsed.tags.length ? el('div', { className: 'lg-wall-tags' }, renderTagBadges(parsed.tags.slice(0, 4))) : null,
          el('a', { className: 'lg-wall-title', href, target: '_blank', title: parsed.raw, text: parsed.clean }),
          el('div', { className: 'lg-wall-foot' }, [
            authorA
              ? el('a', { href: authorA.getAttribute('href') || '#', target: '_blank', text: authorA.textContent.trim(), style: 'color:var(--lg-text-secondary);font-weight:600;' })
              : el('span', { text: '' }),
            el('span', { text: `${statsStr ? `${statsStr} · ` : ''}${dateTd ? dateTd.textContent.trim() : ''}` })
          ])
        ])
      ]));
    });

    mainMount.appendChild(wallGrid);
    const botPag = buildPaginationNode(extractPagination());
    if (botPag) mainMount.appendChild(botPag);
  }

  function buildReadPage(mainMount) {
    const subjectH1 = qs('#subject_tpc');
    const rawTitle = subjectH1 ? subjectH1.textContent.trim() : document.title.split('|')[0].trim();
    const parsedTitle = parseSmartTitle(rawTitle);

    const prevThreadA = qs('a[href*="goto-previous"]');
    const nextThreadA = qs('a[href*="goto-next"]');
    const newPostA = qs('#td_post') ? qs('#td_post').closest('a') : qs('a[href^="post.php?fid-"]');
    const replyPageA = qs('a[href*="post.php?action-reply"]');
    const printA = qs('.h2 a[href*="/simple/"]');
    const opOnlyA = qs('.tiptop a[href*="read.php?tid-"][href*="-uid-"]');
    const tidMatch = location.href.match(/tid[-=](\d+)/i) || (qs('input[name="tid"]') ? [null, qs('input[name="tid"]').value] : null);
    const tid = tidMatch ? tidMatch[1] : '';

    // 1. Thread Hero Card
    const fontSeg = el('div', { className: 'lg-segmented' });
    [
      { key: 'small', label: '小' },
      { key: 'medium', label: '中' },
      { key: 'large', label: '大' }
    ].forEach((f) => {
      const btn = el('button', {
        type: 'button',
        className: `lg-seg-btn ${Store.get('fontSize') === f.key ? 'is-active' : ''}`,
        text: f.label,
        onClick: () => {
          Store.set('fontSize', f.key);
          applyThemeTokens();
          qsa('.lg-seg-btn', fontSeg).forEach((b) => b.classList.toggle('is-active', b === btn));
        }
      });
      fontSeg.appendChild(btn);
    });

    const heroActions = el('div', { style: 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;' }, [
      el('div', { style: 'display:flex;flex-wrap:wrap;gap:7px;align-items:center;' }, [
        prevThreadA ? el('a', { className: 'lg-btn lg-btn-sm', href: prevThreadA.getAttribute('href'), html: `${icon('chevron_left')}<span>上一主题</span>` }) : null,
        nextThreadA ? el('a', { className: 'lg-btn lg-btn-sm', href: nextThreadA.getAttribute('href'), html: `<span>下一主题</span>${icon('chevron_right')}` }) : null,
        opOnlyA ? el('a', { className: 'lg-btn lg-btn-sm lg-btn-tinted', href: opOnlyA.getAttribute('href'), html: `${icon('eye')}<span>只看楼主</span>` }) : null,
        tid ? el('button', {
          type: 'button',
          className: 'lg-btn lg-btn-sm lg-btn-tinted',
          html: `${icon('bookmark')}<span>收藏主题</span>`,
          onClick: (e) => favorThread(tid, e.currentTarget)
        }) : null,
        el('button', {
          type: 'button',
          className: 'lg-btn lg-btn-sm lg-btn-ghost',
          html: `${icon('copy')}<span>复制链接</span>`,
          onClick: () => {
            navigator.clipboard?.writeText(location.href).catch(() => {});
            showToast('已复制本帖链接');
          }
        }),
        printA ? el('a', { className: 'lg-icon-btn is-glass', href: printA.getAttribute('href'), title: '打印 / 无图版', html: icon('print') }) : null
      ]),
      el('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;' }, [
        fontSeg,
        replyPageA ? el('a', { className: 'lg-btn lg-btn-sm lg-btn-primary', href: replyPageA.getAttribute('href'), html: `${icon('reply')}<span>高级回复</span>` }) : null,
        newPostA ? el('a', { className: 'lg-btn lg-btn-sm lg-btn-tinted', href: newPostA.getAttribute('href'), html: `${icon('edit')}<span>发新帖</span>` }) : null
      ])
    ]);

    mainMount.appendChild(el('section', { className: 'lg-thread-hero lg-glass-interactive' }, [
      parsedTitle.tags.length ? el('div', { className: 'lg-wall-tags' }, renderTagBadges(parsedTitle.tags)) : null,
      el('h1', { className: 'lg-thread-h1', text: rawTitle }),
      heroActions
    ]));

    const topPag = buildPaginationNode(extractPagination());
    if (topPag) mainMount.appendChild(topPag);

    // 2. Collect content images for Lightbox & build post cards
    const allPostImages = [];
    const postListEl = el('div', { className: 'lg-post-list' });
    const floorEntries = [];
    let opAuthorName = '';

    const userPopover = el('div', { className: 'lg-popover', id: 'sp-lg-author-pop' });
    document.body.appendChild(userPopover);

    const postMenuPop = el('div', { className: 'lg-popover', id: 'sp-lg-post-menu' });
    document.body.appendChild(postMenuPop);

    const postTables = qsa('table.js-post');
    postTables.forEach((tbl, idx) => {
      const tpcContent = qs('.tpc_content [id^="read_"]', tbl);
      if (!tpcContent) return;
      const pid = tpcContent.id.replace('read_', '');
      const isOP = pid === 'tpc' || idx === 0;

      const prevAnchor = tbl.parentElement && tbl.parentElement.previousElementSibling;
      const anchorName = (prevAnchor && prevAnchor.tagName === 'A' && prevAnchor.getAttribute('name')) || pid;

      const authorLink = qs('th.r_two div[align="center"] a', tbl);
      const authorName = authorLink ? authorLink.textContent.trim() : '匿名用户';
      if (isOP) opAuthorName = authorName;

      const avatarImg = qs('.user-pic img', tbl);
      const avatarSrc = avatarImg ? avatarImg.getAttribute('src') || '' : '';
      const showFace = qs('[id^="showface_"]', tbl);

      const floorA = qs('.tiptop a.s3', tbl);
      const floorText = floorA ? floorA.textContent.trim() : (isOP ? 'GF' : `B${idx}F`);
      const timeSpan = qs('.tiptop span.fl.gray', tbl);
      const timeText = timeSpan ? timeSpan.textContent.trim() : '';
      const bianjiEl = qs('.tiptop .bianji', tbl);
      const bianjiText = bianjiEl ? bianjiEl.textContent.trim() : '';
      const onlyAuthorA = qs('.tiptop .fr a[href*="-uid-"]', tbl);
      const peacemakers = qsa('.apeacemaker', tbl);

      // Re-parent post content intact
      const bodyWrap = el('div', { className: 'lg-post-body' });
      const contentBox = qs(`#td_${pid} .tpc_content`, tbl) || tpcContent.parentElement;
      if (contentBox) {
        qsa('img', contentBox).forEach((img) => {
          const src = img.getAttribute('data-original-src') || img.getAttribute('src') || '';
          if (!src || /smile\//i.test(src)) return;
          img.removeAttribute('width');
          img.removeAttribute('height');
          img.removeAttribute('onload');
          img.removeAttribute('onclick');
          const imgIdx = allPostImages.length;
          allPostImages.push(src);
          img.addEventListener('click', (e) => {
            e.preventDefault();
            Lightbox.open(allPostImages, imgIdx);
          });
        });

        // Upgrade h6.quote.jumbotron purchase box to Liquid Glass Buy / Unlocked Card
        qsa('h6.quote.jumbotron', contentBox).forEach((hq) => {
          const spanText = qs('span', hq)?.textContent.trim() || hq.textContent.trim();
          const origBtn = qs('input[type="button"], button', hq);
          const onclickCode = origBtn ? origBtn.getAttribute('onclick') || '' : '';
          const hasBuyAction = !!(origBtn || /location\.href\s*=/.test(hq.innerHTML));

          if (!hasBuyAction) {
            const unlockedCard = el('div', { className: 'lg-buy-card is-unlocked' }, [
              el('div', { className: 'lg-buy-info' }, [
                el('div', { className: 'lg-buy-icon', html: icon('check') }),
                el('div', {}, [
                  el('div', { text: '资源已解锁 · 已购买', style: 'font-weight:700;font-size:14px;' }),
                  el('div', { text: spanText, style: 'font-size:12.5px;opacity:.85;' })
                ])
              ]),
              el('span', {
                className: 'lg-buy-status-pill',
                html: `${icon('check')}<span>已购买</span>`
              })
            ]);
            hq.replaceWith(unlockedCard);
            return;
          }

          const buyBtn = el('button', {
            type: 'button',
            className: 'lg-btn lg-btn-primary',
            html: `${icon('coins')}<span>${escapeHtml(origBtn?.value || '购买主题')}</span>`,
            onClick: () => {
              const locMatch = onclickCode.match(/location\.href\s*=\s*['"]([^'"]+)['"]/);
              if (locMatch) {
                location.href = locMatch[1];
                return;
              }
              if (origBtn && typeof origBtn.onclick === 'function') {
                origBtn.onclick();
              } else if (origBtn) {
                origBtn.click();
              }
            }
          });
          const buyCard = el('div', { className: 'lg-buy-card' }, [
            el('div', { className: 'lg-buy-info' }, [
              el('div', { className: 'lg-buy-icon', html: icon('lock') }),
              el('div', {}, [
                el('div', { text: '付费资源内容', style: 'font-weight:700;font-size:14px;' }),
                el('div', { text: spanText, style: 'font-size:12.5px;opacity:.85;' })
              ])
            ]),
            buyBtn
          ]);
          hq.replaceWith(buyCard);
        });

        bodyWrap.appendChild(contentBox);
      }

      const markEl = qs(`#mark_${pid}`, tbl);
      let markWrap = null;
      if (markEl && markEl.textContent.trim()) {
        markWrap = el('div', { className: 'lg-marks-box' });
        markWrap.appendChild(markEl);
      }

      const replyOrigA = qs('.readbot .huifu a', tbl);
      const quoteOrigA = qs('.readbot .yinyong a', tbl);
      const favorOrigA = qs('.readbot .shou a', tbl);
      const shareOrigA = qs(`#recommend_${pid}`);

      const avatarBtn = el('button', {
        type: 'button',
        className: 'lg-avatar-btn',
        title: '查看作者信息与操作',
        onClick: (e) => {
          e.stopPropagation();
          userPopover.innerHTML = '';
          userPopover.appendChild(el('div', { style: 'font-weight:700;font-size:15px;margin-bottom:8px;', text: authorName }));
          if (showFace) {
            const lines = htmlToLines(showFace);
            const badges = [];
            lines.forEach((line) => {
              if (/^(UID|发帖|SP币|注册时间):/i.test(line)) {
                badges.push(line);
              }
            });
            const statsGrid = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;' });
            badges.forEach((s) => {
              statsGrid.appendChild(el('span', { className: 'lg-badge lg-badge-neutral', text: s }));
            });
            userPopover.appendChild(statsGrid);

            const menuList = el('div', { className: 'lg-menu-list' });
            qsa('.listread li a', showFace).forEach((actA) => {
              const title = actA.parentElement?.getAttribute('title') || actA.textContent.trim() || '操作';
              menuList.appendChild(el('button', {
                type: 'button',
                className: 'lg-menu-item',
                text: title,
                onClick: () => {
                  closeAllPopovers();
                  const href = actA.getAttribute('href');
                  if (href && !href.startsWith('javascript:')) window.open(href, '_blank');
                  else actA.click();
                }
              }));
            });
            userPopover.appendChild(menuList);
          } else if (authorLink) {
            userPopover.appendChild(el('a', {
              className: 'lg-menu-item',
              href: authorLink.getAttribute('href'),
              target: '_blank',
              text: '查看个人主页'
            }));
          }
          openPopoverNear(userPopover, avatarBtn);
        }
      }, [
        el('img', { src: avatarSrc || 'images/face/none.gif', referrerpolicy: 'no-referrer', alt: authorName })
      ]);

      const moreBtn = el('button', {
        type: 'button',
        className: 'lg-icon-btn',
        title: '更多操作',
        html: icon('more_vert'),
        onClick: (e) => {
          e.stopPropagation();
          postMenuPop.innerHTML = '';
          const list = el('div', { className: 'lg-menu-list' });
          if (onlyAuthorA) {
            list.appendChild(el('a', {
              className: 'lg-menu-item',
              href: onlyAuthorA.getAttribute('href') || '#',
              html: `${icon('eye')}<span>${escapeHtml(onlyAuthorA.textContent.trim())}</span>`
            }));
          }
          if (shareOrigA) {
            list.appendChild(el('button', {
              type: 'button',
              className: 'lg-menu-item',
              html: `${icon('open_new')}<span>分享此帖</span>`,
              onClick: () => {
                closeAllPopovers();
                shareOrigA.click();
              }
            }));
          }
          peacemakers.forEach((pm) => {
            pm.classList.add('lg-menu-item');
            pm.style.display = 'flex';
            list.appendChild(pm);
          });
          postMenuPop.appendChild(list);
          openPopoverNear(postMenuPop, moreBtn);
        }
      });

      const floorPill = el('button', {
        type: 'button',
        className: 'lg-floor-pill',
        text: floorText,
        title: '复制此楼直达链接',
        onClick: () => {
          if (typeof pageWin.copyUrl === 'function') {
            try { pageWin.copyUrl(pid); } catch (_) {}
          } else {
            navigator.clipboard?.writeText(`${location.href.split('#')[0]}#${anchorName}`).catch(() => {});
          }
          showToast(`已复制 ${floorText} 楼层链接`);
        }
      });

      const cardId = `sp-post-${anchorName}`;
      floorEntries.push({ id: cardId, floor: floorText, author: authorName });

      const postCard = el('article', {
        id: cardId,
        className: `lg-post-card ${isOP ? 'is-op' : ''}`,
        dataset: { filterText: `${authorName} ${tpcContent.textContent}`.toLowerCase() }
      }, [
        el('a', { name: anchorName, id: `anchor_${anchorName}` }),
        el('header', { className: 'lg-post-header' }, [
          el('div', { className: 'lg-post-author-wrap' }, [
            avatarBtn,
            el('div', { className: 'lg-post-author-meta' }, [
              el('div', { className: 'lg-post-author-row' }, [
                el('a', {
                  className: 'lg-post-author-name',
                  href: authorLink ? authorLink.getAttribute('href') : '#',
                  target: '_blank',
                  text: authorName
                }),
                isOP ? el('span', { className: 'lg-badge lg-badge-primary', text: '楼主' }) : null,
                !isOP && authorName === opAuthorName ? el('span', { className: 'lg-badge lg-badge-secondary', text: '楼主' }) : null
              ]),
              el('div', { className: 'lg-post-sub' }, [
                timeText ? el('span', { text: timeText }) : null,
                bianjiText ? el('span', { text: bianjiText }) : null
              ])
            ])
          ]),
          el('div', { className: 'lg-post-header-right' }, [floorPill, moreBtn])
        ]),
        bodyWrap,
        markWrap,
        el('footer', { className: 'lg-post-footer' }, [
          el('div', { className: 'lg-post-actions' }, [
            replyOrigA ? el('button', {
              type: 'button',
              className: 'lg-btn lg-btn-sm lg-btn-tinted',
              html: `${icon('reply')}<span>回复</span>`,
              onClick: () => {
                replyOrigA.click();
                const rc = qs('#sp-lg-reply-card');
                if (rc) rc.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }) : null,
            quoteOrigA ? el('button', {
              type: 'button',
              className: 'lg-btn lg-btn-sm',
              html: `${icon('quote')}<span>引用</span>`,
              onClick: () => quoteOrigA.click()
            }) : null,
            favorOrigA ? el('button', {
              type: 'button',
              id: tid ? `sp_lg_post_favor_${pid}` : undefined,
              className: 'lg-btn lg-btn-sm lg-btn-ghost',
              html: `${icon('bookmark')}<span>收藏</span>`,
              onClick: (e) => {
                if (tid) {
                  favorThread(tid, e.currentTarget);
                } else {
                  favorOrigA.click();
                  showToast('已发送收藏请求');
                }
              }
            }) : null
          ]),
          el('button', {
            type: 'button',
            className: 'lg-btn lg-btn-sm lg-btn-ghost',
            html: `${icon('arrow_up')}<span>顶部</span>`,
            onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
          })
        ])
      ]);

      postListEl.appendChild(postCard);
    });

    mainMount.appendChild(postListEl);

    const botPag = buildPaginationNode(extractPagination());
    if (botPag) mainMount.appendChild(botPag);

    // 3. Re-parent Quick Reply Form (form[name="FORM"]) intact
    const replyForm = qs('form[name="FORM"]');
    if (replyForm) {
      const replyCard = el('section', { id: 'sp-lg-reply-card', className: 'lg-reply-card' }, [
        el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;' }, [
          el('div', { style: 'display:flex;align-items:center;gap:10px;' }, [
            el('span', { html: icon('edit', 'lg-icon-lg'), style: 'color:var(--lg-accent);display:inline-flex;' }),
            el('strong', { text: '快速回复', style: 'font-size:16.5px;' })
          ]),
          el('span', { text: 'Ctrl / ⌘ + Enter 直接提交', style: 'font-size:12px;color:var(--lg-text-tertiary);' })
        ])
      ]);
      const nativeHead = qs('tr:first-child', replyForm);
      if (nativeHead && /快速发帖/.test(nativeHead.textContent)) nativeHead.style.display = 'none';
      const replyTa = qs('textarea[name="atc_content"]', replyForm);
      if (replyTa) {
        replyTa.addEventListener('keydown', (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (typeof replyForm.requestSubmit === 'function') replyForm.requestSubmit();
            else qs('input[type="submit"]', replyForm)?.click() || replyForm.submit();
          }
        });
      }
      replyCard.appendChild(replyForm);
      mainMount.appendChild(replyCard);
    }

    return { floorEntries, tid };
  }

  function buildPostPage(mainMount, crumbsInfo) {
    const form = qs('form[name="FORM"]');
    if (!form) {
      buildGenericPage(mainMount);
      return;
    }

    const actionVal = qs('input[name="action"]', form)?.value || 'new';
    const modeTitle = actionVal === 'reply' ? '发表回复' : actionVal === 'modify' ? '编辑帖子' : '发表新主题';
    const forumCrumb = crumbsInfo.crumbs[crumbsInfo.crumbs.length - 1];
    const forumName = forumCrumb ? forumCrumb.text : '';
    const backHref = forumCrumb ? forumCrumb.href : 'index.php';

    mainMount.appendChild(el('section', { className: 'lg-forum-hero' }, [
      el('div', {}, [
        el('h1', { className: 'lg-forum-hero-title', text: forumName ? `${modeTitle} · ${forumName}` : modeTitle }),
        el('div', { style: 'font-size:12.5px;color:var(--lg-text-secondary);margin-top:4px;', text: 'Liquid Glass 富文本编辑器（支持 WindCode 与所见即所得切换）' })
      ]),
      el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;' }, [
        el('a', { className: 'lg-btn lg-btn-sm', href: backHref, html: `${icon('chevron_left')}<span>返回版块</span>` })
      ])
    ]));

    const postRuleEl = qs('#postrule', form);
    if (postRuleEl) {
      const ruleBanner = el('div', { className: 'lg-post-rule-banner' });
      ruleBanner.appendChild(postRuleEl);
      mainMount.appendChild(ruleBanner);
    }

    const card = el('section', { className: 'lg-composer-card' });

    const legacyTitleTbl = qs('.t > table', form);
    if (legacyTitleTbl && /发表帖子/.test(legacyTitleTbl.textContent)) {
      legacyTitleTbl.style.display = 'none';
    }

    const titleInp = qs('input[name="atc_title"]', form);
    if (titleInp) {
      titleInp.placeholder = '请输入主题标题...';
      const innerBox = titleInp.parentElement;
      if (innerBox) {
        innerBox.classList.add('lg-composer-title-box');
        if (innerBox.parentElement) innerBox.parentElement.classList.add('lg-composer-title-host');
      }
    }

    const editorMain = qs('#editor-main', form);
    const editorSide = qs('#editor-side', form);
    if (editorMain && editorSide && editorMain.parentElement) {
      const grid = el('div', { className: 'lg-composer-grid' });
      editorMain.parentElement.insertBefore(grid, editorSide);
      grid.appendChild(editorMain);
      grid.appendChild(editorSide);
    }

    const attModeTable = qs('tbody#att_mode')?.closest('table');
    if (attModeTable) {
      attModeTable.style.display = 'none';
      card.appendChild(attModeTable);
    }
    card.appendChild(form);
    const previewForm = qs('form[name="preview"]');
    if (previewForm) card.appendChild(previewForm);

    mainMount.appendChild(card);
  }

  function buildRedirectPage() {
    if (qs('#sp-lg-redirect-root')) return;
    const refreshMeta = qs('meta[http-equiv="refresh"]')?.getAttribute('content') || '';
    const metaUrlMatch = refreshMeta.match(/url\s*=\s*([^;\s]+)/i);
    const links = qsa('a[href]');
    const targetLink = links.find((a) => /跳转|点击这里|返回/.test(a.textContent || ''))
      || links.find((a) => /(?:read|thread|u|message|profile|userpay|plugin)\.php/i.test(a.getAttribute('href') || ''))
      || links.find((a) => {
        const href = a.getAttribute('href') || '';
        return href && !/^index\.php$/i.test(href) && !/^javascript:/i.test(href) && !/^\/\/(www\.)?south-plus\./i.test(href);
      });
    const targetHref = (metaUrlMatch && metaUrlMatch[1]) || targetLink?.getAttribute('href') || 'index.php';

    const rawBox = qs('center div') || qs('center');
    const lines = htmlToLines(rawBox).filter((line) => (
      line && !/提示信息/.test(line) && !/如果您的浏览器/.test(line)
    ));
    const statusTitle = lines[0] || '操作已完成';
    const statusSub = lines.slice(1).join(' · ') || '正在为您跳转到目标页面...';

    Array.from(document.body.children).forEach((child) => {
      if (child.tagName !== 'SCRIPT') child.style.display = 'none';
    });

    if (!qs('#sp-lg-backdrop')) {
      document.body.appendChild(el('div', { id: 'sp-lg-backdrop' }, [
        el('div', { className: 'lg-caustic-ribbon' }),
        el('div', { className: 'lg-orb-side' }),
        el('div', { className: 'lg-orb-mid' })
      ]));
    }

    const root = el('main', { id: 'sp-lg-redirect-root', className: 'lg-status-screen' }, [
      el('div', { className: 'lg-status-card' }, [
        el('div', { className: 'lg-status-icon', html: icon('check') }),
        el('h1', { text: statusTitle, style: 'margin:0;font-size:21px;font-weight:700;color:var(--lg-text);' }),
        el('p', { text: statusSub, style: 'margin:0;font-size:13.5px;color:var(--lg-text-secondary);line-height:1.6;' }),
        el('div', { className: 'lg-status-progress' }, [
          el('div', { className: 'lg-status-progress-bar' })
        ]),
        el('div', { style: 'display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:6px;' }, [
          el('a', {
            className: 'lg-btn lg-btn-primary',
            href: targetHref,
            html: `<span>立即前往</span>${icon('chevron_right')}`
          }),
          el('a', {
            className: 'lg-btn lg-btn-tinted',
            href: 'index.php',
            html: `${icon('home')}<span>返回首页</span>`
          })
        ])
      ])
    ]);
    document.body.appendChild(root);
    LiquidGlassOptics.init();
  }

  function buildUserPage(mainMount, userCtx) {
    const h1El = qs('#u-top h1.u-h1') || qs('h1.u-h1');
    const profileName = (h1El?.textContent || '').replace(/\s+/g, ' ').trim() || userCtx.username || '个人中心';
    const avatarSrc = qs('#u-portrait img.pic')?.getAttribute('src')
      || qs('#u-portrait img')?.getAttribute('src')
      || userCtx.avatar
      || 'images/face/none.gif';

    const honorEl = qs('#honor');
    const setHonorEl = qs('#sethonor');
    const honorRow = el('div', { className: 'lg-u-honor-row' });
    if (honorEl) honorRow.appendChild(honorEl);
    if (setHonorEl) {
      setHonorEl.classList.add('lg-chip');
      honorRow.appendChild(setHonorEl);
    }

    const actionWrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;' });
    const seenAct = new Set();
    qsa('#u-sidebar a[href]').forEach((a) => {
      const text = a.textContent.replace(/\s+/g, ' ').trim();
      const href = a.getAttribute('href') || '#';
      if (!text || seenAct.has(href) || /u\.php$/i.test(href)) return;
      seenAct.add(href);
      actionWrap.appendChild(el('a', {
        className: 'lg-btn lg-btn-sm lg-btn-tinted',
        href,
        text
      }));
    });

    const statBadges = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;' });
    const sidebarLines = htmlToLines(qs('#u-sidebar')).filter((l) => (
      /(UID|等级|级别|发帖|威望|SP币|HP|注册|最后登录)/i.test(l)
    ));
    sidebarLines.slice(0, 6).forEach((l) => {
      statBadges.appendChild(el('span', { className: 'lg-badge lg-badge-neutral', text: l }));
    });
    if (!sidebarLines.length && userCtx.sp) {
      statBadges.appendChild(el('span', { className: 'lg-badge lg-badge-primary', text: `SP币 ${userCtx.sp}` }));
    }

    mainMount.appendChild(el('section', { className: 'lg-u-hero' }, [
      el('div', { className: 'lg-u-identity' }, [
        el('img', { className: 'lg-u-avatar', src: avatarSrc, alt: profileName, referrerpolicy: 'no-referrer' }),
        el('div', { style: 'min-width:0;' }, [
          el('h1', { className: 'lg-u-title', text: profileName }),
          honorRow,
          statBadges
        ])
      ]),
      actionWrap
    ]));

    const tabLinks = qsa('#u-top-nav ul li a');
    if (tabLinks.length) {
      const tabBar = el('nav', { className: 'lg-u-tabs', 'aria-label': '个人中心导航' });
      tabLinks.forEach((a) => {
        const li = a.closest('li');
        const isActive = !!(li && (li.classList.contains('current') || li.id === 'current'));
        tabBar.appendChild(el('a', {
          className: `lg-u-tab ${isActive ? 'is-active' : ''}`,
          href: a.getAttribute('href') || '#',
          text: a.textContent.trim()
        }));
      });
      mainMount.appendChild(tabBar);
    }

    const uMain = qs('#u-contentmain');
    const uSide = qs('#u-contentside');
    const uProfileMain = qs('#u-profile') || qs('.u-content-66');
    const uProfileSide = qs('#u-profile-s') || qs('.u-content-33');

    const cleanUTable = (root) => {
      if (!root) return;
      qsa('table.u-table tr', root).forEach((tr) => {
        if (!tr.textContent.trim() && !qs('input, select, a, img', tr)) {
          tr.style.display = 'none';
        }
      });
    };

    if (uMain && uSide) {
      cleanUTable(uMain);
      const mainHasBoxes = !!qs('.u-box, #minifeed, #new-reply', uMain);
      const sideHasBoxes = !!qs('.u-box, #new-topic', uSide);
      const sideHasContent = sideHasBoxes || qsa('a[href], form, tr', uSide).length > 0;
      const mainHost = el('div', { className: `lg-u-main-host lg-generic-host ${mainHasBoxes ? '' : 'is-panel'}` });
      mainHost.appendChild(uMain);
      if (sideHasContent) {
        const sideHost = el('div', { className: `lg-u-side-host lg-generic-host ${sideHasBoxes ? '' : 'is-panel'}` });
        sideHost.appendChild(uSide);
        mainMount.appendChild(el('div', { className: 'lg-u-grid' }, [mainHost, sideHost]));
      } else {
        mainMount.appendChild(mainHost);
      }
    } else if (!uMain && (uProfileMain || uProfileSide)) {
      const mainHost = el('div', { className: 'lg-u-main-host lg-generic-host is-panel' });
      if (uProfileMain) mainHost.appendChild(uProfileMain);
      if (uProfileSide) {
        const sideHost = el('div', { className: 'lg-u-side-host lg-generic-host is-panel' });
        sideHost.appendChild(uProfileSide);
        mainMount.appendChild(el('div', { className: 'lg-u-grid' }, [mainHost, sideHost]));
      } else {
        mainMount.appendChild(mainHost);
      }
    } else if (uMain || qs('#u-content')) {
      const targetNode = uMain || qs('#u-content');
      cleanUTable(targetNode);
      const dupTop = qs('#u-top', targetNode);
      if (dupTop) dupTop.style.display = 'none';
      const hasBoxes = !!qs('.u-box, #minifeed, #new-reply', targetNode);
      const singleHost = el('div', { className: `lg-u-main-host lg-generic-host ${hasBoxes ? '' : 'is-panel'}` });
      singleHost.appendChild(targetNode);
      mainMount.appendChild(singleHost);
    } else {
      buildGenericPage(mainMount);
    }
  }

  function buildSettingsCenterLayout(mainMount, { title, desc, iconName, headerAction = null, hostClass = 'lg-settings-host' }) {
    mainMount.appendChild(el('section', { className: 'lg-forum-hero lg-glass-interactive' }, [
      el('div', {}, [
        el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:4px;' }, [
          el('span', { html: icon(iconName), style: 'display:inline-flex;color:var(--lg-accent);' }),
          el('h1', { className: 'lg-forum-title', text: title })
        ]),
        desc ? el('p', { className: 'lg-forum-desc', text: desc }) : null
      ]),
      headerAction ? el('div', { className: 'lg-forum-actions' }, [headerAction]) : null
    ]));

    const sidebar = el('aside', { className: 'lg-inbox-sidebar' });
    const menuLinks = qsa('#set-menu a[href]');
    menuLinks.forEach((a) => {
      const li = a.closest('li');
      const href = a.getAttribute('href') || '#';
      const isActive = !!(
        (li && li.classList.contains('current'))
        || a.classList.contains('current')
        || (location.search && href.includes(location.search))
      );
      sidebar.appendChild(el('a', {
        className: `lg-inbox-nav-item ${isActive ? 'is-active' : ''}`,
        href,
        text: a.textContent.trim()
      }));
    });

    const contentHost = el('section', { className: `${hostClass} lg-generic-host` });
    const liveWrap = qs('#set-content-wrap') || qs('#set-content');
    if (liveWrap) {
      contentHost.appendChild(liveWrap);
    } else {
      buildGenericPage(contentHost);
    }

    if (menuLinks.length) {
      mainMount.appendChild(el('div', { className: 'lg-inbox-grid' }, [sidebar, contentHost]));
    } else {
      mainMount.appendChild(contentHost);
    }
    return contentHost;
  }

  function buildMessagePage(mainMount) {
    const writeHref = qs('#set-menu a[href*="write"], #set-menu a[href*="post"]')?.getAttribute('href') || 'message.php?action-write.html';
    buildSettingsCenterLayout(mainMount, {
      title: '短消息中心',
      desc: '收发站内私信、系统通知与消息管理',
      iconName: 'mail',
      hostClass: 'lg-inbox-host',
      headerAction: el('a', {
        className: 'lg-btn lg-btn-sm lg-btn-primary',
        href: writeHref,
        html: `${icon('edit')}<span>发送短消息</span>`
      })
    });
  }

  function buildProfilePage(mainMount, crumbsInfo) {
    const currentNav = qs('#set-menu li.current a')?.textContent.trim();
    const crumbTitle = crumbsInfo?.crumbs?.[crumbsInfo.crumbs.length - 1]?.text;
    const sectionTitle = currentNav || (crumbTitle && crumbTitle !== '设置首页' ? crumbTitle : '账号与设置中心');

    const host = buildSettingsCenterLayout(mainMount, {
      title: sectionTitle,
      desc: '管理个人资料、签名头像、论坛偏好、权限与积分转换',
      iconName: 'settings',
      headerAction: el('a', {
        className: 'lg-btn lg-btn-sm lg-btn-tinted',
        href: 'u.php',
        html: `${icon('person')}<span>个人中心</span>`
      })
    });

    const wrap = qs('#set-content-wrap', host);
    if (wrap && qs('.set-content-left', wrap) && qs('.set-content-right', wrap)) {
      wrap.classList.add('lg-has-split');
    }
  }

  function buildUserPayPage(mainMount) {
    const host = buildSettingsCenterLayout(mainMount, {
      title: '积分与钱包管理',
      desc: '查看 SP币 / HP / 魄 / LP 余额、充值转账与订单积分日志',
      iconName: 'coins',
      headerAction: el('a', {
        className: 'lg-btn lg-btn-sm lg-btn-tinted',
        href: 'profile.php',
        html: `${icon('settings')}<span>返回设置中心</span>`
      })
    });

    const overviewBox = qs('.set-tab-box > div', host);
    if (overviewBox && qs('div[style*="float:right"]', overviewBox)) {
      overviewBox.classList.add('lg-pay-overview-grid');
    }
  }

  function buildLoginPage(mainMount) {
    const form = qs('form[name="login"]') || qs('form[name="register"]');
    const isReg = !!(form && form.getAttribute('name') === 'register');
    const card = el('section', { className: 'lg-auth-card lg-glass-interactive' }, [
      el('div', { className: 'lg-auth-head' }, [
        el('span', { className: 'lg-brand-mark', style: 'width:38px;height:38px;', html: BRAND_LOGO_SVG }),
        el('div', {}, [
          el('h1', { text: isReg ? '注册 南+ South Plus' : '登录 南+ South Plus', style: 'margin:0;font-size:20px;font-weight:800;letter-spacing:-0.02em;' }),
          el('div', { text: isReg ? '创建您的社区账号' : '使用用户名、UID 或邮箱安全登录', style: 'font-size:12.5px;color:var(--lg-text-secondary);margin-top:2px;' })
        ])
      ])
    ]);

    if (form) {
      const legacyHeaderRow = qs('tr:first-child', form);
      if (legacyHeaderRow && qs('th.h', legacyHeaderRow)) {
        legacyHeaderRow.style.display = 'none';
      }
      card.appendChild(form);
    } else {
      buildGenericPage(card);
    }
    mainMount.appendChild(card);
  }

  function buildTasksPage(mainMount) {
    const outerTable = qs('#main table');
    const sideBoxes = outerTable ? qsa('td[width="20%"] .t', outerTable) : [];
    const introBox = sideBoxes.find((b) => /功能简介/.test(b.textContent));
    const opsBox = sideBoxes.find((b) => /操作/.test(b.textContent));
    const copyBox = sideBoxes.find((b) => /版权/.test(b.textContent));

    const introLines = introBox ? htmlToLines(qs('tr:last-child, .f_one', introBox) || introBox).filter((l) => l !== '功能简介') : [];
    const opsLinks = opsBox ? qsa('a[href]', opsBox) : [];

    const tabsBar = opsLinks.length ? el('nav', { className: 'lg-segmented' }) : null;
    if (tabsBar) {
      opsLinks.forEach((a) => {
        const href = a.getAttribute('href') || '#';
        const isBold = !!qs('b, strong', a) || a.closest('b, strong');
        const matchesUrl = href && location.href.includes(href);
        tabsBar.appendChild(el('a', {
          className: `lg-seg-btn ${(isBold || matchesUrl) ? 'is-active' : ''}`,
          href,
          text: a.textContent.trim()
        }));
      });
    }

    mainMount.appendChild(el('section', { className: 'lg-forum-hero' }, [
      el('div', {}, [
        el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:4px;' }, [
          el('span', { html: icon('task'), style: 'display:inline-flex;color:var(--lg-accent);' }),
          el('h1', { className: 'lg-forum-title', text: '社区论坛任务' })
        ]),
        el('p', { className: 'lg-forum-desc', text: introLines[0] || '完成社区指定任务即可领取 SP 币与积分奖励' })
      ]),
      tabsBar
    ]));

    const rightTd = outerTable ? qsa(':scope > tbody > tr > td, :scope > tr > td', outerTable).find((td) => td.getAttribute('width') !== '20%') : null;
    const taskBox = rightTd ? qs('.t', rightTd) : null;
    const taskRows = taskBox ? qsa('tr.f_one, tr.tr3', taskBox) : [];
    const taskCards = [];

    for (let i = 0; i < taskRows.length; i++) {
      const row = taskRows[i];
      const cells = qsa(':scope > td, :scope > th', row);
      if (cells.length < 3) continue;

      const iconImg = qs('img', cells[0]);
      const infoCell = cells[1];
      const rewardCell = cells[2];
      const actionCell = cells[3] || cells[cells.length - 1];

      const rawInfoText = infoCell.textContent.replace(/\s+/g, ' ').trim();
      const titleEl = qs('b, strong, a', infoCell);
      const taskTitle = titleEl ? titleEl.textContent.trim() : rawInfoText.split(/\s+/)[0];
      if (!taskTitle) continue;

      const popMatch = rawInfoText.match(/人气[:：]\s*\S+/);
      const validEl = qs('font', infoCell);
      const validText = validEl ? validEl.textContent.trim() : '';

      let descText = '';
      const nextRow = taskRows[i + 1];
      if (nextRow) {
        const nextCells = qsa(':scope > td, :scope > th', nextRow);
        if (nextCells.length <= 2) {
          descText = nextRow.textContent.replace(/\s+/g, ' ').trim();
          i++;
        }
      }

      const rewardText = rewardCell ? rewardCell.textContent.replace(/\s+/g, ' ').trim() : '';
      const actionHost = el('div', { className: 'lg-task-action-host' });
      if (actionCell) {
        while (actionCell.firstChild) {
          actionHost.appendChild(actionCell.firstChild);
        }
      }

      taskCards.push(el('article', {
        className: 'lg-task-card',
        dataset: { filterText: `${taskTitle} ${descText} ${rewardText}`.toLowerCase() }
      }, [
        el('div', { className: 'lg-task-head' }, [
          el('div', { style: 'display:flex;align-items:flex-start;gap:12px;min-width:0;' }, [
            el('div', {
              className: 'lg-task-icon-box',
              html: iconImg ? `<img src="${escapeHtml(iconImg.getAttribute('src') || '')}" alt="">` : icon('task')
            }),
            el('div', { style: 'min-width:0;' }, [
              el('h3', { className: 'lg-task-title', text: taskTitle }),
              el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;' }, [
                popMatch ? el('span', { className: 'lg-badge lg-badge-neutral', text: popMatch[0] }) : null,
                validText ? el('span', { className: 'lg-badge lg-badge-primary', text: validText }) : null
              ])
            ])
          ])
        ]),
        descText ? el('div', { className: 'lg-task-desc', text: descText }) : null,
        el('div', { className: 'lg-task-foot' }, [
          rewardText ? el('span', {
            className: 'lg-badge lg-badge-tertiary',
            html: `${icon('coins')}<span>${escapeHtml(rewardText)}</span>`
          }) : el('span'),
          actionHost
        ])
      ]));
    }

    if (taskCards.length) {
      mainMount.appendChild(el('section', { className: 'lg-task-grid' }, taskCards));
    } else if (rightTd) {
      mainMount.appendChild(el('div', { className: 'lg-card', text: rightTd.textContent.replace(/\s+/g, ' ').trim() || '当前分类暂无任务。' }));
    } else {
      buildGenericPage(mainMount);
    }

    if (introLines.length > 1 || copyBox) {
      const acc = el('details', { className: 'lg-accordion' });
      acc.appendChild(el('summary', {
        className: 'lg-accordion-summary',
        html: `<span>任务说明与插件信息</span>${icon('chevron_down')}`
      }));
      const body = el('div', { style: 'padding:0 18px 16px;font-size:13px;line-height:1.7;color:var(--lg-text-secondary);' });
      introLines.forEach((l) => body.appendChild(el('div', { text: l })));
      if (copyBox) {
        htmlToLines(copyBox).filter((l) => l !== '版权').forEach((l) => body.appendChild(el('div', { text: l, style: 'opacity:.8;margin-top:4px;' })));
      }
      acc.appendChild(body);
      mainMount.appendChild(acc);
    }
  }

  function buildSearchPage(mainMount) {
    mainMount.appendChild(el('section', { className: 'lg-forum-hero' }, [
      el('div', {}, [
        el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:4px;' }, [
          el('span', { html: icon('search'), style: 'display:inline-flex;color:var(--lg-accent);' }),
          el('h1', { className: 'lg-forum-title', text: '全站高级搜索' })
        ]),
        el('p', { className: 'lg-forum-desc', text: '按关键词、发布作者、所属版块、时间跨度与排序方式精准检索社区帖子' })
      ])
    ]));

    const form = qs('form[name="sF"]');
    if (form) {
      const urlKw = new URLSearchParams(location.search).get('keyword');
      const kwInput = qs('input[name="keyword"]', form);
      if (urlKw && kwInput && !kwInput.value) kwInput.value = urlKw;

      const host = el('section', { className: 'lg-search-form-card lg-generic-host' });
      host.appendChild(form);
      mainMount.appendChild(host);
    } else {
      buildGenericPage(mainMount);
    }
  }

  function buildSearchResultsPage(mainMount, crumbsInfo) {
    const searchTable = qs('#main .t table') || qs('#main table');
    const pagInfo = extractPagination();
    const resultRows = [];

    if (searchTable) {
      qsa('tr', searchTable).forEach((tr) => {
        if (tr.classList.contains('tr2') || tr.classList.contains('h') || qs('th.h', tr)) return;
        if (isAdElement(tr)) return;
        const cells = qsa(':scope > td, :scope > th', tr);
        if (cells.length < 5) return;

        const statusImgSrc = (qs('img', cells[0])?.getAttribute('src') || '').toLowerCase();
        const titleA = qs('a[href*="read.php"]', cells[1]) || qs('h3 a', cells[1]) || qs('a', cells[1]);
        if (!titleA) return;

        const rawTitle = titleA.textContent.replace(/\s+/g, ' ').trim();
        const parsed = parseSmartTitle(rawTitle);
        const forumA = qs('a', cells[2]);
        const forumName = forumA ? forumA.textContent.trim() : cells[2].textContent.trim();
        const forumHref = forumA ? forumA.getAttribute('href') || '#' : '';

        const authorA = qs('a', cells[3]);
        const authorName = authorA ? authorA.textContent.trim() : cells[3].textContent.replace(/\s+/g, ' ').trim();
        const replies = parseInt(cells[4].textContent.trim(), 10) || 0;
        const views = cells[5] ? (parseInt(cells[5].textContent.trim(), 10) || 0) : 0;
        const lastInfo = cells[6] ? cells[6].textContent.replace(/\s+/g, ' ').trim() : '';

        let statusTone = '';
        let statusIcon = 'forum';
        if (/lock/.test(statusImgSrc)) {
          statusTone = 'is-lock';
          statusIcon = 'lock';
        } else if (/top|head/.test(statusImgSrc)) {
          statusTone = 'is-pin';
          statusIcon = 'push_pin';
        } else if (/digest/.test(statusImgSrc)) {
          statusTone = 'is-digest';
          statusIcon = 'star';
        } else if (/hot/.test(statusImgSrc) || replies >= 20) {
          statusTone = 'is-hot';
          statusIcon = 'bolt';
        }

        const badgeNodes = parsed.tags.map((t) => el('span', { className: `lg-badge lg-badge-${t.tone}`, text: t.label }));
        if (forumName) {
          badgeNodes.unshift(forumHref
            ? el('a', {
                className: 'lg-badge lg-badge-secondary',
                href: forumHref,
                text: forumName
              })
            : el('span', { className: 'lg-badge lg-badge-secondary', text: forumName }));
        }

        resultRows.push(el('article', {
          className: 'lg-thread-row',
          dataset: { filterText: `${rawTitle} ${forumName} ${authorName}`.toLowerCase() }
        }, [
          el('div', { className: `lg-thread-status ${statusTone}`, html: icon(statusIcon) }),
          el('div', { className: 'lg-thread-main' }, [
            el('div', { className: 'lg-thread-title-line' }, [
              el('a', {
                className: 'lg-thread-title',
                href: titleA.getAttribute('href') || '#',
                target: '_blank',
                text: parsed.clean
              }),
              ...badgeNodes
            ]),
            el('div', { className: 'lg-thread-meta' }, [
              authorName ? el('span', { text: `作者: ${authorName}` }) : null,
              lastInfo ? el('span', { text: `· ${lastInfo}` }) : null
            ])
          ]),
          el('div', { className: 'lg-thread-stats' }, [
            el('span', { className: 'lg-badge lg-badge-primary', text: `回复 ${replies}` }),
            views ? el('span', { className: 'lg-badge lg-badge-neutral', text: `人气 ${views}` }) : null
          ])
        ]));
      });
    }

    const pageTitle = crumbsInfo.crumbs[crumbsInfo.crumbs.length - 1]?.text || '搜索结果';
    mainMount.appendChild(el('section', { className: 'lg-forum-hero' }, [
      el('div', {}, [
        el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:4px;' }, [
          el('span', { html: icon('search'), style: 'display:inline-flex;color:var(--lg-accent);' }),
          el('h1', { className: 'lg-forum-title', text: pageTitle }),
          el('span', { className: 'lg-badge lg-badge-primary', text: `本页 ${resultRows.length} 条` })
        ]),
        el('p', { className: 'lg-forum-desc', text: '已重构为 Liquid Glass 分组列表，可使用顶部搜索栏或 ⌘K 继续检索' })
      ]),
      el('div', { className: 'lg-forum-actions' }, [
        el('a', {
          className: 'lg-btn lg-btn-sm lg-btn-tinted',
          href: 'search.php',
          html: `${icon('search')}<span>高级搜索</span>`
        })
      ])
    ]));

    const topPag = buildPaginationNode(pagInfo);
    if (topPag) mainMount.appendChild(topPag);

    if (resultRows.length) {
      mainMount.appendChild(el('section', { className: 'lg-inset-group' }, resultRows));
    } else {
      mainMount.appendChild(el('div', { className: 'lg-card', text: '未找到符合条件的主题帖。' }));
    }

    const botPag = buildPaginationNode(pagInfo);
    if (botPag) mainMount.appendChild(botPag);
  }

  function buildGenericPage(mainMount) {
    const legacyMain = qs('#main');
    if (!legacyMain) return;
    const host = el('div', { className: 'lg-generic-host' });
    while (legacyMain.firstChild) {
      host.appendChild(legacyMain.firstChild);
    }
    mainMount.appendChild(host);
  }

  /* ============================================================================
   * 7. LIQUID GLASS APP SHELL: FLOATING SIDEBAR, CAPSULE TOPBAR,
   *    SPOTLIGHT (Cmd+K), CONTROL CENTER, AUTO-CONDENSING DOCK
   * ========================================================================== */

  function mountShell() {
    if (qs('#sp-lg-shell')) return;

    const pageType = detectPageType();
    if (pageType === 'redirect') {
      buildRedirectPage();
      document.documentElement.classList.remove('sp-lg-loading');
      document.documentElement.classList.add('sp-lg-ready');
      return;
    }

    const userCtx = extractUserContext();
    const forumTree = extractForumTree();
    const crumbsInfo = extractBreadcrumbs();

    // Living Ambient Refraction Backdrop
    if (!qs('#sp-lg-backdrop')) {
      document.body.appendChild(el('div', { id: 'sp-lg-backdrop' }, [
        el('div', { className: 'lg-caustic-ribbon' }),
        el('div', { className: 'lg-orb-side' }),
        el('div', { className: 'lg-orb-mid' })
      ]));
    }

    const shell = el('div', {
      id: 'sp-lg-shell',
      className: Store.get('sidebarOpen') ? '' : 'sidebar-collapsed'
    });

    const scrim = el('div', { className: 'lg-scrim' });

    // --- All Boards Directory Sheet ---
    const drawerSearch = el('input', {
      type: 'search',
      placeholder: '检索主版块或子版块（如 GALGAME、同人音声、茶楼）...'
    });
    const drawerBody = el('div', { className: 'lg-drawer-body' });

    const renderDrawerList = (kw = '') => {
      drawerBody.innerHTML = '';
      const q = kw.trim().toLowerCase();
      if (userCtx.shortcuts.length && !q) {
        drawerBody.appendChild(el('div', {}, [
          el('div', { text: '常用 / 收藏版块', style: 'font-size:12px;font-weight:700;color:var(--lg-accent);margin-bottom:8px;' }),
          el('div', { className: 'lg-subforum-wrap' }, userCtx.shortcuts.map((sc) => el('a', {
            className: 'lg-chip',
            href: sc.href,
            text: sc.name
          })))
        ]));
      }
      if (!forumTree.length) {
        drawerBody.appendChild(el('div', {
          className: 'lg-card',
          text: '请先访问论坛首页以缓存完整的版块导航目录。'
        }));
        return;
      }
      let totalMatches = 0;
      forumTree.forEach((cat) => {
        const catMatches = q && cat.title.toLowerCase().includes(q);
        const matchedEntries = [];

        (cat.boards || []).forEach((b) => {
          const subs = b.subs || SUBFORUM_FALLBACK[b.fid || parseFidFromHref(b.href)] || [];
          const boardMatch = !q || catMatches || b.name.toLowerCase().includes(q);
          const matchedSubs = q
            ? subs.filter((s) => s.name.toLowerCase().includes(q) || boardMatch)
            : subs;

          if (boardMatch || matchedSubs.length > 0) {
            matchedEntries.push({ board: b, boardMatch, subs: matchedSubs });
          }
        });

        if (!matchedEntries.length) return;
        totalMatches += matchedEntries.length;

        const catSection = el('div', { className: 'lg-drawer-board-group' }, [
          el('a', {
            href: cat.href,
            text: cat.title,
            style: 'display:block;font-size:13px;font-weight:700;color:var(--lg-text-secondary);'
          })
        ]);

        if (!q) {
          const boardWrap = el('div', { className: 'lg-drawer-board-group' });
          matchedEntries.forEach(({ board, subs }) => {
            boardWrap.appendChild(el('a', {
              className: 'lg-chip',
              href: board.href,
              text: board.name,
              style: 'align-self:flex-start;font-weight:600;'
            }));
            if (subs.length) {
              const subWrap = el('div', { className: 'lg-drawer-subwrap' });
              const MAX_DRAWER_SUB = 8;
              subs.forEach((s, idx) => {
                subWrap.appendChild(el('a', {
                  className: 'lg-drawer-subchip',
                  href: s.href,
                  text: s.name,
                  style: idx >= MAX_DRAWER_SUB ? 'display:none;' : ''
                }));
              });
              if (subs.length > MAX_DRAWER_SUB) {
                const moreSub = el('button', {
                  type: 'button',
                  className: 'lg-drawer-subchip',
                  text: `+${subs.length - MAX_DRAWER_SUB} 展开`,
                  style: 'background:var(--lg-accent-soft);color:var(--lg-accent);font-weight:600;border-color:transparent;',
                  onClick: () => {
                    qsa('.lg-drawer-subchip', subWrap).forEach((c) => { c.style.display = ''; });
                    moreSub.remove();
                  }
                });
                subWrap.appendChild(moreSub);
              }
              boardWrap.appendChild(subWrap);
            }
          });
          catSection.appendChild(boardWrap);
        } else {
          const resultWrap = el('div', { className: 'lg-subforum-wrap' });
          matchedEntries.forEach(({ board, boardMatch, subs }) => {
            if (boardMatch) {
              resultWrap.appendChild(el('a', {
                className: 'lg-chip is-selected',
                href: board.href,
                text: board.name
              }));
            }
            subs.forEach((s) => {
              resultWrap.appendChild(el('a', {
                className: 'lg-chip',
                href: s.href,
                html: `<span>${escapeHtml(s.name)}</span><span style="opacity:.65;font-size:11px;">· ${escapeHtml(board.name)}</span>`
              }));
            });
          });
          catSection.appendChild(resultWrap);
        }

        drawerBody.appendChild(catSection);
      });

      if (q && totalMatches === 0) {
        drawerBody.appendChild(el('div', {
          className: 'lg-card',
          text: `未找到包含 “${kw.trim()}” 的版块或子版块。`
        }));
      }
    };
    drawerSearch.addEventListener('input', () => renderDrawerList(drawerSearch.value));

    const forumDrawer = el('aside', { className: 'lg-drawer', id: 'sp-lg-forum-drawer' }, [
      el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:10px;' }, [
        el('strong', { text: '全部版块目录', style: 'font-size:18px;' }),
        el('button', { type: 'button', className: 'lg-icon-btn is-glass', html: icon('close'), onClick: () => closeOverlays() })
      ]),
      el('div', { className: 'lg-search-capsule', style: 'margin:12px 0 0;max-width:none;flex:none;height:38px;' }, [
        el('span', { html: icon('search'), style: 'display:inline-flex;color:var(--lg-text-secondary);' }),
        drawerSearch
      ]),
      drawerBody
    ]);

    // --- Settings Glass Sheet (Built once + synced in-place for fluid capsule morphing) ---
    const settingsDialog = el('div', { className: 'lg-dialog', id: 'sp-lg-settings' });
    let settingsSyncFns = [];
    let settingsBuilt = false;
    const renderSettings = () => {
      if (settingsBuilt) {
        settingsSyncFns.forEach((fn) => fn(true));
        return;
      }
      settingsBuilt = true;
      settingsSyncFns = [];

      settingsDialog.appendChild(el('div', { style: 'display:flex;align-items:center;justify-content:space-between;' }, [
        el('strong', { text: 'Liquid Glass 外观与偏好设置', style: 'font-size:18px;' }),
        el('button', { type: 'button', className: 'lg-icon-btn is-glass', html: icon('close'), onClick: () => closeOverlays() })
      ]));

      const makeSettingsSeg = (label, prefKey, options) => {
        const seg = el('div', { className: 'lg-segmented' });
        const btns = options.map((opt) => {
          const btn = el('button', {
            type: 'button',
            className: `lg-seg-btn ${Store.get(prefKey) === opt.k ? 'is-active' : ''}`,
            text: opt.label,
            onClick: () => {
              Store.set(prefKey, opt.k);
              applyThemeTokens();
              renderSettings();
            }
          });
          seg.appendChild(btn);
          return { key: opt.k, btn };
        });
        settingsSyncFns.push(() => {
          const cur = Store.get(prefKey);
          btns.forEach((it) => it.btn.classList.toggle('is-active', it.key === cur));
        });
        settingsDialog.appendChild(el('div', { className: 'lg-setting-row' }, [
          el('span', { text: label, style: 'font-weight:600;' }),
          seg
        ]));
      };

      makeSettingsSeg('外观模式', 'colorMode', [
        { k: 'auto', label: '跟随系统' },
        { k: 'light', label: '浅色' },
        { k: 'dark', label: '深色' }
      ]);
      makeSettingsSeg('玻璃材质通透度', 'glassStyle', [
        { k: 'standard', label: '标准玻璃' },
        { k: 'clear', label: '高透水晶' },
        { k: 'tinted', label: '高对比磨砂' }
      ]);
      makeSettingsSeg('折射与色散强度', 'refractionStrength', [
        { k: 'subtle', label: '柔和' },
        { k: 'standard', label: '标准' },
        { k: 'strong', label: '强烈' }
      ]);

      const swatchRow = el('div', { className: 'lg-swatch-row' });
      const swatchBtns = Object.keys(ACCENTS).map((key) => {
        const p = ACCENTS[key];
        const btn = el('button', {
          type: 'button',
          className: `lg-swatch-btn ${Store.get('accent') === key ? 'is-active' : ''}`,
          onClick: () => {
            Store.set('accent', key);
            applyThemeTokens();
            renderSettings();
          }
        }, [
          el('span', { className: 'lg-swatch-dot', style: `background:${p.swatch};` }),
          el('span', { text: p.name })
        ]);
        swatchRow.appendChild(btn);
        return { key, btn };
      });
      settingsSyncFns.push(() => {
        const cur = Store.get('accent');
        swatchBtns.forEach((it) => it.btn.classList.toggle('is-active', it.key === cur));
      });
      settingsDialog.appendChild(el('div', { style: 'display:flex;flex-direction:column;gap:8px;' }, [
        el('span', { text: '光影折射强调色', style: 'font-weight:600;' }),
        swatchRow
      ]));

      makeSettingsSeg('列表信息密度', 'density', [
        { k: 'comfortable', label: '舒适' },
        { k: 'compact', label: '紧凑' }
      ]);

      const addToggle = (key, label, hint) => {
        const sw = el('button', {
          type: 'button',
          className: `lg-switch ${Store.get(key) ? 'is-on' : ''}`,
          onClick: () => {
            const next = !Store.get(key);
            Store.set(key, next);
            applyThemeTokens();
            sw.classList.toggle('is-on', next);
            if (key === 'cleanAds' || key === 'collapseNoticeByDefault' || key === 'collapsePinnedByDefault') {
              showToast('设置已保存，刷新页面后完整生效');
            }
          }
        });
        settingsSyncFns.push(() => sw.classList.toggle('is-on', Boolean(Store.get(key))));
        settingsDialog.appendChild(el('div', { className: 'lg-setting-row' }, [
          el('div', {}, [
            el('div', { text: label, style: 'font-weight:600;' }),
            hint ? el('div', { text: hint, style: 'font-size:12px;color:var(--lg-text-secondary);' }) : null
          ]),
          sw
        ]));
      };

      addToggle('wideMode', '宽屏阅读布局', '将主内容最大宽度扩展至 1520px');
      addToggle('cleanAds', '自动净化横幅与置顶推广', '隐藏老旧广告位，保留版块与帖子正文');
      addToggle('collapseNoticeByDefault', '默认折叠版块公告', '减少进入版块时的首屏滚动距离');
      addToggle('collapsePinnedByDefault', '默认折叠置顶帖组', '优先展示最新普通主题');
    };

    // --- Spotlight Command Palette (Cmd/Ctrl + K) ---
    const spotlightEl = el('div', { className: 'lg-spotlight', id: 'sp-lg-spotlight', role: 'dialog', 'aria-label': 'Spotlight 快速跳转' });
    const spotlightInput = el('input', { type: 'search', placeholder: '输入版块名称、快捷指令或全站搜索关键词...' });
    const spotlightList = el('div', { className: 'lg-spotlight-results' });
    let spotlightItems = [];
    let spotlightFocusIdx = 0;

    const buildSpotlightEntries = (kw) => {
      const q = kw.trim().toLowerCase();
      const entries = [];

      const quickCmds = [
        { title: '切换浅色 / 深色模式', sub: '外观', iconName: resolveThemeMode() === 'dark' ? 'light_mode' : 'dark_mode', run: () => {
          const next = resolveThemeMode() === 'dark' ? 'light' : 'dark';
          Store.set('colorMode', next);
          applyThemeTokens();
          showToast(next === 'dark' ? '已切换为深色外观' : '已切换为浅色外观');
        }},
        { title: '切换玻璃通透材质（标准 / 水晶 / 磨砂）', sub: 'Liquid Glass', iconName: 'sparkles', run: () => {
          const order = ['standard', 'clear', 'tinted'];
          const next = order[(order.indexOf(Store.get('glassStyle')) + 1) % order.length];
          Store.set('glassStyle', next);
          applyThemeTokens();
          showToast(`已切换玻璃材质：${next === 'clear' ? '高透水晶' : next === 'tinted' ? '高对比磨砂' : '标准玻璃'}`);
        }},
        { title: '切换液态玻璃折射强度（柔和 / 标准 / 强烈）', sub: '光学引擎', iconName: 'sparkles', run: () => {
          const order = ['subtle', 'standard', 'strong'];
          const next = order[(order.indexOf(Store.get('refractionStrength')) + 1) % order.length];
          Store.set('refractionStrength', next);
          applyThemeTokens();
          showToast(`已切换折射与色散强度：${next === 'subtle' ? '柔和' : next === 'strong' ? '强烈' : '标准'}`);
        }},
        { title: '切换宽屏阅读布局', sub: '布局', iconName: 'sidebar_left', run: () => {
          const next = !Store.get('wideMode');
          Store.set('wideMode', next);
          applyThemeTokens();
          showToast(next ? '已开启宽屏布局' : '已恢复标准宽度');
        }},
        { title: '打开全部版块目录', sub: '导航 (g)', iconName: 'apps', run: () => openDrawer() },
        { title: '打开偏好设置面板', sub: '设置', iconName: 'settings', run: () => openSettings() },
        { title: '回到页面顶部', sub: '动作 (t)', iconName: 'arrow_up', run: () => window.scrollTo({ top: 0, behavior: 'smooth' }) }
      ];

      quickCmds.forEach((cmd) => {
        if (!q || cmd.title.toLowerCase().includes(q) || cmd.sub.toLowerCase().includes(q)) {
          entries.push(cmd);
        }
      });

      forumTree.forEach((cat) => {
        (cat.boards || []).forEach((b) => {
          if (!q || b.name.toLowerCase().includes(q) || cat.title.toLowerCase().includes(q)) {
            entries.push({ title: b.name, sub: cat.title, iconName: 'forum', href: b.href });
          }
          const subs = b.subs || SUBFORUM_FALLBACK[b.fid || parseFidFromHref(b.href)] || [];
          subs.forEach((s) => {
            if (q && s.name.toLowerCase().includes(q)) {
              entries.push({ title: s.name, sub: `${b.name} · 子版块`, iconName: 'forum', href: s.href });
            }
          });
        });
      });

      if (kw.trim()) {
        entries.push({
          title: `全站搜索 “${kw.trim()}”`,
          sub: 'Enter 直达 search.php',
          iconName: 'search',
          href: `search.php?keyword=${encodeURIComponent(kw.trim())}`
        });
      }

      return entries.slice(0, 14);
    };

    const renderSpotlight = (kw = '') => {
      spotlightItems = buildSpotlightEntries(kw);
      spotlightFocusIdx = 0;
      spotlightList.innerHTML = '';
      if (!spotlightItems.length) {
        spotlightList.appendChild(el('div', { style: 'padding:18px;text-align:center;color:var(--lg-text-secondary);font-size:13px;', text: '暂无匹配结果' }));
        return;
      }
      spotlightItems.forEach((it, idx) => {
        const node = el(it.href ? 'a' : 'button', {
          className: `lg-spotlight-item ${idx === 0 ? 'is-focused' : ''}`,
          ...(it.href ? { href: it.href } : { type: 'button' }),
          onClick: () => {
            closeOverlays();
            if (it.run) it.run();
          }
        }, [
          el('span', { style: 'display:inline-flex;align-items:center;gap:10px;min-width:0;' }, [
            el('span', { html: icon(it.iconName), style: 'display:inline-flex;opacity:.8;' }),
            el('span', { text: it.title, style: 'font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' })
          ]),
          el('span', { text: it.sub, style: 'font-size:11.5px;opacity:.68;flex-shrink:0;' })
        ]);
        spotlightList.appendChild(node);
      });
    };

    spotlightInput.addEventListener('input', () => renderSpotlight(spotlightInput.value));
    spotlightInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!spotlightItems.length) return;
        spotlightFocusIdx = (spotlightFocusIdx + (e.key === 'ArrowDown' ? 1 : -1) + spotlightItems.length) % spotlightItems.length;
        qsa('.lg-spotlight-item', spotlightList).forEach((elItem, i) => {
          elItem.classList.toggle('is-focused', i === spotlightFocusIdx);
          if (i === spotlightFocusIdx) elItem.scrollIntoView({ block: 'nearest' });
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = qsa('.lg-spotlight-item', spotlightList)[spotlightFocusIdx];
        if (chosen) chosen.click();
      }
    });

    spotlightEl.appendChild(el('div', { className: 'lg-spotlight-input-row' }, [
      el('span', { html: icon('search', 'lg-icon-lg'), style: 'display:inline-flex;color:var(--lg-accent);' }),
      spotlightInput,
      el('button', { type: 'button', className: 'lg-kbd-btn', text: 'ESC', onClick: () => closeOverlays() })
    ]));
    spotlightEl.appendChild(spotlightList);
    spotlightEl.appendChild(el('div', { className: 'lg-spotlight-foot' }, [
      el('span', { text: '↑↓ 选择 · Enter 打开 · Esc 关闭' }),
      el('span', { text: 'Spotlight ⌘K' })
    ]));

    // --- Control Center Popover ---
    const ccPop = el('div', { className: 'lg-popover', id: 'sp-lg-control-center' });
    ccPop.addEventListener('click', (e) => e.stopPropagation());
    let ccSyncFns = [];
    let ccBuilt = false;
    const renderControlCenter = () => {
      if (ccBuilt) {
        ccSyncFns.forEach((fn) => fn());
        return;
      }
      ccBuilt = true;
      ccSyncFns = [];

      const makeCcSeg = (prefKey, options) => {
        const seg = el('div', { className: 'lg-segmented', style: 'width:100%;justify-content:space-between;' });
        const btns = options.map((opt) => {
          const btn = el('button', {
            type: 'button',
            style: 'flex:1;',
            className: `lg-seg-btn ${Store.get(prefKey) === opt.k ? 'is-active' : ''}`,
            text: opt.l,
            onClick: () => {
              Store.set(prefKey, opt.k);
              applyThemeTokens();
              renderControlCenter();
            }
          });
          seg.appendChild(btn);
          return { key: opt.k, btn };
        });
        ccSyncFns.push(() => {
          const cur = Store.get(prefKey);
          btns.forEach((it) => it.btn.classList.toggle('is-active', it.key === cur));
        });
        return seg;
      };

      const modeSeg = makeCcSeg('colorMode', [{ k: 'auto', l: '自动' }, { k: 'light', l: '浅色' }, { k: 'dark', l: '深色' }]);
      const glassSeg = makeCcSeg('glassStyle', [{ k: 'standard', l: '标准' }, { k: 'clear', l: '水晶' }, { k: 'tinted', l: '磨砂' }]);
      const refractSeg = makeCcSeg('refractionStrength', [{ k: 'subtle', l: '柔和' }, { k: 'standard', l: '标准' }, { k: 'strong', l: '强烈' }]);

      const dotsRow = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:2px;' });
      const dotBtns = Object.keys(ACCENTS).map((k) => {
        const a = ACCENTS[k];
        const active = Store.get('accent') === k;
        const btn = el('button', {
          type: 'button',
          title: a.name,
          style: `width:32px;height:32px;border-radius:50%;border:2px solid ${active ? 'var(--lg-text)' : 'transparent'};background:${a.swatch};cursor:pointer;box-shadow:inset 0 1px 2px rgba(255,255,255,0.5),0 2px 6px rgba(0,0,0,0.18);`,
          onClick: () => {
            Store.set('accent', k);
            applyThemeTokens();
            renderControlCenter();
          }
        });
        dotsRow.appendChild(btn);
        return { key: k, btn };
      });
      ccSyncFns.push(() => {
        const cur = Store.get('accent');
        dotBtns.forEach((it) => { it.btn.style.borderColor = it.key === cur ? 'var(--lg-text)' : 'transparent'; });
      });

      const wideTile = el('button', {
        type: 'button',
        className: `lg-cc-tile ${Store.get('wideMode') ? 'is-on' : ''}`,
        text: '宽屏布局',
        onClick: () => {
          Store.set('wideMode', !Store.get('wideMode'));
          applyThemeTokens();
          renderControlCenter();
        }
      });
      const densTile = el('button', {
        type: 'button',
        className: `lg-cc-tile ${Store.get('density') === 'compact' ? 'is-on' : ''}`,
        text: '紧凑密度',
        onClick: () => {
          Store.set('density', Store.get('density') === 'compact' ? 'comfortable' : 'compact');
          applyThemeTokens();
          renderControlCenter();
        }
      });
      ccSyncFns.push(() => {
        wideTile.classList.toggle('is-on', Boolean(Store.get('wideMode')));
        densTile.classList.toggle('is-on', Store.get('density') === 'compact');
      });

      ccPop.appendChild(el('div', { className: 'lg-cc-grid' }, [
        el('div', { style: 'display:flex;align-items:center;justify-content:space-between;' }, [
          el('strong', { text: '控制中心', style: 'font-size:14px;' }),
          el('button', {
            type: 'button',
            className: 'lg-btn lg-btn-sm lg-btn-ghost',
            text: '完整设置…',
            onClick: () => {
              closeAllPopovers();
              openSettings();
            }
          })
        ]),
        el('div', { className: 'lg-cc-block' }, [
          el('span', { className: 'lg-cc-label', text: '外观模式' }),
          modeSeg
        ]),
        el('div', { className: 'lg-cc-block' }, [
          el('span', { className: 'lg-cc-label', text: 'Liquid Glass 材质' }),
          glassSeg
        ]),
        el('div', { className: 'lg-cc-block' }, [
          el('span', { className: 'lg-cc-label', text: '光学折射与色散' }),
          refractSeg
        ]),
        el('div', { className: 'lg-cc-block' }, [
          el('span', { className: 'lg-cc-label', text: '折射强调色' }),
          dotsRow
        ]),
        el('div', { className: 'lg-cc-tiles' }, [wideTile, densTile])
      ]));
    };
    document.body.appendChild(ccPop);

    const openDrawer = () => {
      closeOverlays();
      renderDrawerList(drawerSearch.value);
      scrim.classList.add('is-open');
      forumDrawer.classList.add('is-open');
      LiquidGlassOptics.refreshElement(forumDrawer);
      setTimeout(() => drawerSearch.focus(), 80);
    };
    const openSettings = () => {
      closeOverlays();
      renderSettings();
      scrim.classList.add('is-open');
      settingsDialog.classList.add('is-open');
      LiquidGlassOptics.refreshElement(settingsDialog);
    };
    const openSpotlight = () => {
      closeOverlays();
      renderSpotlight(spotlightInput.value);
      scrim.classList.add('is-open');
      spotlightEl.classList.add('is-open');
      LiquidGlassOptics.refreshElement(spotlightEl);
      setTimeout(() => {
        spotlightInput.focus();
        spotlightInput.select();
      }, 60);
    };
    const closeOverlays = () => {
      scrim.classList.remove('is-open');
      forumDrawer.classList.remove('is-open');
      settingsDialog.classList.remove('is-open');
      spotlightEl.classList.remove('is-open');
      shell.classList.remove('mobile-sidebar-open');
      closeAllPopovers();
    };
    scrim.addEventListener('click', closeOverlays);

    // --- Peacemaker Popover ---
    const peacemakerPop = el('div', { className: 'lg-popover', id: 'sp-lg-peacemaker-pop' });
    const nativePeacemaker = qs('#peacemakerconfig');
    if (nativePeacemaker) {
      peacemakerPop.appendChild(nativePeacemaker);
      const innerMenu = qs('div', nativePeacemaker);
      if (innerMenu) innerMenu.hidden = false;
    } else {
      peacemakerPop.appendChild(el('div', { text: '当前页面未加载屏蔽插件。', style: 'font-size:13px;' }));
    }
    document.body.appendChild(peacemakerPop);

    // --- Floating Liquid Glass Sidebar ---
    const postBtnA = qs('#td_post') ? qs('#td_post').closest('a') : qs('a[href^="post.php?fid-"]');
    const primaryCta = pageType === 'post'
      ? el('button', {
          type: 'button',
          className: 'lg-sidebar-cta lg-glass-interactive',
          html: `${icon('send')}<span>聚焦编辑</span>`,
          onClick: () => qs('#textarea')?.focus()
        })
      : pageType === 'read' && qs('form[name="FORM"]')
      ? el('button', {
          type: 'button',
          className: 'lg-sidebar-cta lg-glass-interactive',
          html: `${icon('edit')}<span>快速回复</span>`,
          onClick: () => {
            const rc = qs('#sp-lg-reply-card');
            if (rc) {
              rc.scrollIntoView({ behavior: 'smooth', block: 'center' });
              qs('textarea[name="atc_content"]', rc)?.focus();
            }
          }
        })
      : postBtnA
        ? el('a', {
            className: 'lg-sidebar-cta lg-glass-interactive',
            href: postBtnA.getAttribute('href') || '#',
            html: `${icon('edit')}<span>发表新帖</span>`
          })
        : el('button', {
            type: 'button',
            className: 'lg-sidebar-cta lg-glass-interactive',
            html: `${icon('apps')}<span>探索版块</span>`,
            onClick: openDrawer
          });

    const allBoards = forumTree.flatMap((c) => c.boards || []);
    const hotBoards = allBoards.filter((b) => /茶馆|GALGAME|免空|同人音声|询问|求物|动画|漫画/i.test(b.name));
    const fallbackBoards = (hotBoards.length ? hotBoards : allBoards.filter((b) => !/Comic Market/i.test(b.name))).slice(0, 5);
    const shortcutNavItems = userCtx.shortcuts.length
      ? userCtx.shortcuts.slice(0, 8)
      : fallbackBoards.map((b) => ({ name: b.name, href: b.href }));

    const sidebar = el('aside', { className: 'lg-sidebar' }, [
      el('div', { className: 'lg-sidebar-head' }, [
        el('a', {
          className: 'lg-sidebar-brand',
          href: 'index.php',
          html: `<span class="lg-brand-mark">${BRAND_LOGO_SVG}</span><span class="lg-brand-title">South Plus</span><span class="lg-brand-badge">Glass</span>`
        }),
        el('button', {
          type: 'button',
          className: 'lg-icon-btn',
          title: '收起侧边栏',
          html: icon('sidebar_left'),
          onClick: () => {
            if (window.innerWidth <= 960) {
              closeOverlays();
            } else {
              shell.classList.add('sidebar-collapsed');
              Store.set('sidebarOpen', false);
            }
          }
        })
      ]),
      primaryCta,
      el('div', { className: 'lg-sidebar-scroll' }, [
        el('div', { className: 'lg-nav-group-card' }, [
          el('div', { className: 'lg-nav-group-label', text: '探索' }),
          el('nav', { className: 'lg-nav-list' }, [
            el('a', {
              className: `lg-nav-item lg-glass-interactive ${pageType === 'index' ? 'is-active' : ''}`,
              href: 'index.php',
              html: `${icon('home')}<span>讨论区</span>`
            }),
            el('button', {
              type: 'button',
              className: `lg-nav-item lg-glass-interactive ${pageType === 'thread_list' || pageType === 'thread_wall' ? 'is-active' : ''}`,
              html: `${icon('apps')}<span>全部版块</span><span class="lg-nav-shortcut-hint">G</span>`,
              onClick: openDrawer
            }),
            el('a', {
              className: `lg-nav-item lg-glass-interactive ${pageType === 'search' || pageType === 'search_results' || location.pathname.includes('search') ? 'is-active' : ''}`,
              href: 'search.php',
              html: `${icon('search')}<span>全站搜索</span>`
            }),
            el('a', {
              className: `lg-nav-item lg-glass-interactive ${pageType === 'tasks' || location.href.includes('tasks') ? 'is-active' : ''}`,
              href: 'plugin.php?H_name-tasks.html',
              html: `${icon('task')}<span>社区任务</span>`
            })
          ])
        ]),
        el('div', { className: 'lg-nav-group-card' }, [
          el('div', { className: 'lg-nav-group-label', text: '个人' }),
          el('nav', { className: 'lg-nav-list' }, [
            el('a', {
              className: `lg-nav-item lg-glass-interactive ${pageType === 'message' || location.pathname.includes('message') ? 'is-active' : ''}`,
              href: 'message.php',
              html: `${icon('mail')}<span>短消息</span>${userCtx.hasUnreadMsg ? '<span class="lg-unread-dot"></span>' : ''}`
            }),
            el('a', {
              className: `lg-nav-item lg-glass-interactive ${pageType === 'user' || pageType === 'profile' || pageType === 'userpay' || location.pathname.includes('u.php') ? 'is-active' : ''}`,
              href: userCtx.userHref,
              html: `${icon('person')}<span>个人中心</span>`
            })
          ])
        ]),
        shortcutNavItems.length
          ? el('div', { className: 'lg-nav-group-card' }, [
              el('div', { className: 'lg-nav-group-label', text: userCtx.shortcuts.length ? '收藏版块' : '常用版块' }),
              el('nav', { className: 'lg-nav-list' }, shortcutNavItems.map((sc) => el('a', {
                className: 'lg-nav-item lg-glass-interactive',
                href: sc.href,
                html: `${icon('star')}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(sc.name)}</span>`
              })))
            ])
          : null
      ]),
      el('div', { className: 'lg-sidebar-footer lg-nav-group-card' }, [
        el('button', {
          type: 'button',
          className: 'lg-nav-item lg-glass-interactive',
          html: `${icon('block')}<span>屏蔽配置</span>`,
          onClick: (e) => {
            e.stopPropagation();
            openPopoverNear(peacemakerPop, e.currentTarget);
          }
        }),
        el('button', {
          type: 'button',
          className: 'lg-nav-item lg-glass-interactive',
          html: `${icon('settings')}<span>主题与玻璃设置</span>`,
          onClick: openSettings
        })
      ])
    ]);

    // --- User Profile Popover ---
    const profilePop = el('div', { className: 'lg-popover', id: 'sp-lg-profile-pop' });
    if (userCtx.loggedIn) {
      profilePop.appendChild(el('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:8px;' }, [
        el('img', {
          src: userCtx.avatar || 'images/face/none.gif',
          style: 'width:42px;height:42px;border-radius:14px;object-fit:cover;'
        }),
        el('div', {}, [
          el('div', { text: userCtx.username, style: 'font-weight:700;font-size:15px;' }),
          el('div', { text: `${userCtx.uid ? `UID ${userCtx.uid} · ` : ''}${userCtx.levelText}`, style: 'font-size:12px;color:var(--lg-text-secondary);' })
        ])
      ]));
      profilePop.appendChild(el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;' }, [
        userCtx.sp ? el('span', { className: 'lg-badge lg-badge-primary', text: `SP币 ${userCtx.sp}` }) : null,
        userCtx.hp ? el('span', { className: 'lg-badge lg-badge-neutral', text: `HP ${userCtx.hp}` }) : null,
        userCtx.po ? el('span', { className: 'lg-badge lg-badge-neutral', text: `魄 ${userCtx.po}` }) : null
      ]));
      if (userCtx.lastLogin) {
        profilePop.appendChild(el('div', {
          text: `最后登录: ${userCtx.lastLogin}`,
          style: 'font-size:11.5px;color:var(--lg-text-tertiary);margin-bottom:4px;'
        }));
      }
      profilePop.appendChild(el('div', {
        text: userCtx.honorText,
        style: 'font-size:12px;color:var(--lg-text-secondary);margin:4px 0 8px;'
      }));
      profilePop.appendChild(el('div', { className: 'lg-menu-list' }, [
        qs('#sethonor') ? el('button', {
          type: 'button',
          className: 'lg-menu-item',
          html: `${icon('edit')}<span>编辑个性签名</span>`,
          onClick: () => {
            closeAllPopovers();
            qs('#sethonor')?.click();
          }
        }) : null,
        el('a', { className: 'lg-menu-item', href: userCtx.myTopicHref, html: `${icon('list')}<span>我的主题</span>` }),
        el('a', { className: 'lg-menu-item', href: userCtx.myPostHref, html: `${icon('forum')}<span>我的回复</span>` }),
        el('a', { className: 'lg-menu-item', href: 'u.php?action-favor.html', html: `${icon('bookmark')}<span>我的收藏夹</span>` }),
        el('a', { className: 'lg-menu-item', href: 'userpay.php', html: `${icon('coins')}<span>积分管理</span>` }),
        el('a', { className: 'lg-menu-item', href: 'profile.php', html: `${icon('settings')}<span>账号设置</span>` }),
        userCtx.quitHref ? el('a', { className: 'lg-menu-item', href: userCtx.quitHref, style: 'color:var(--lg-danger);', html: `${icon('logout')}<span>退出登录</span>` }) : null
      ]));
    } else {
      profilePop.appendChild(el('div', { className: 'lg-menu-list' }, [
        el('a', { className: 'lg-menu-item', href: 'login.php', html: `${icon('person')}<span>登录账号</span>` }),
        el('a', { className: 'lg-menu-item', href: 'register.php', html: `${icon('edit')}<span>注册新账号</span>` })
      ]));
    }
    document.body.appendChild(profilePop);

    // --- Floating Capsule Topbar ---
    const searchInput = el('input', {
      type: 'search',
      id: 'sp-lg-filter-input',
      placeholder: pageType === 'index' ? '过滤版块，或按 Enter 站内搜索...'
        : pageType === 'read' ? '筛选楼层内容，或按 Enter 站内搜索...'
        : pageType === 'post' ? '输入关键词按 Enter 站内搜索...'
        : '过滤当前页面主题，或按 Enter 站内搜索...'
    });
    const runPageFilter = () => {
      const q = searchInput.value.trim().toLowerCase();
      qsa('[data-filter-text]', shell).forEach((node) => {
        const match = !q || node.dataset.filterText.includes(q);
        node.style.display = match ? '' : 'none';
        if (q && match && node.classList.contains('lg-board-card')) {
          qsa('.lg-sub-chip', node).forEach((chip) => { chip.style.display = ''; });
        }
      });
    };
    searchInput.addEventListener('input', runPageFilter);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        location.href = `search.php?keyword=${encodeURIComponent(searchInput.value.trim())}`;
      }
    });

    const breadEl = el('nav', { className: 'lg-breadcrumbs', 'aria-label': '面包屑导航' });
    if (pageType !== 'index') {
      crumbsInfo.crumbs.forEach((c, idx) => {
        if (idx > 0) breadEl.appendChild(el('span', { className: 'lg-crumb-sep', html: icon('chevron_right') }));
        breadEl.appendChild(el('a', {
          className: `lg-crumb ${c.isCurrent ? 'is-current' : ''}`,
          href: c.href,
          text: c.text,
          title: c.text
        }));
      });
    }

    const leftCluster = el('div', { className: 'lg-topbar-cluster lg-topbar-left' }, [
      el('button', {
        type: 'button',
        className: 'lg-icon-btn',
        title: '切换侧边栏',
        html: icon('sidebar_left'),
        onClick: () => {
          if (window.innerWidth <= 960) {
            const open = !shell.classList.contains('mobile-sidebar-open');
            scrim.classList.toggle('is-open', open);
            shell.classList.toggle('mobile-sidebar-open', open);
            if (open) setTimeout(() => LiquidGlassOptics.refreshElement(sidebar), 60);
          } else {
            const collapsed = !shell.classList.contains('sidebar-collapsed');
            shell.classList.toggle('sidebar-collapsed', collapsed);
            Store.set('sidebarOpen', !collapsed);
            if (!collapsed) setTimeout(() => LiquidGlassOptics.refreshElement(sidebar), 60);
          }
        }
      }),
      el('a', {
        className: 'lg-topbar-home-pill',
        href: 'index.php',
        title: '返回 南+ 首页',
        html: `<span class="lg-brand-mark">${BRAND_LOGO_SVG}</span><span>南+</span>`
      }),
      pageType !== 'index' && crumbsInfo.crumbs.length ? breadEl : null
    ]);

    const searchCapsule = el('div', { className: 'lg-search-capsule' }, [
      el('span', { html: icon('search'), style: 'display:inline-flex;color:var(--lg-text-secondary);' }),
      searchInput,
      el('button', {
        type: 'button',
        className: 'lg-kbd-btn',
        title: '打开 Spotlight 快速跳转 (Ctrl/⌘ + K)',
        text: '⌘K',
        onClick: openSpotlight
      })
    ]);

    const rightCluster = el('div', { className: 'lg-topbar-cluster' }, [
      typeof pageWin.isSnowSeason === 'function' && pageWin.isSnowSeason()
        ? el('button', {
            type: 'button',
            className: 'lg-icon-btn',
            title: '冬季飘雪彩蛋',
            html: icon('snow'),
            onClick: () => { if (typeof pageWin.wa2 === 'function') pageWin.wa2(); }
          })
        : null,
      el('button', {
        type: 'button',
        className: 'lg-icon-btn',
        title: '切换浅色 / 深色外观',
        html: icon(resolveThemeMode() === 'dark' ? 'light_mode' : 'dark_mode'),
        onClick: (e) => {
          const next = resolveThemeMode() === 'dark' ? 'light' : 'dark';
          Store.set('colorMode', next);
          applyThemeTokens();
          e.currentTarget.innerHTML = icon(next === 'dark' ? 'light_mode' : 'dark_mode');
          showToast(next === 'dark' ? '已切换为深色外观' : '已切换为浅色外观');
        }
      }),
      el('button', {
        type: 'button',
        className: 'lg-icon-btn',
        title: '控制中心',
        html: icon('control_center'),
        onClick: (e) => {
          e.stopPropagation();
          renderControlCenter();
          openPopoverNear(ccPop, e.currentTarget);
        }
      }),
      el('button', {
        type: 'button',
        className: 'lg-user-capsule',
        onClick: (e) => {
          e.stopPropagation();
          openPopoverNear(profilePop, e.currentTarget);
        }
      }, [
        userCtx.avatar ? el('img', { src: userCtx.avatar, alt: userCtx.username }) : null,
        el('span', { text: userCtx.username }),
        userCtx.sp ? el('span', { className: 'lg-sp-pill', text: userCtx.sp }) : null
      ])
    ]);

    const topbar = el('header', { className: 'lg-topbar' }, [leftCluster, searchCapsule, rightCluster]);

    // --- Main Content Mount ---
    const mainMount = el('main', { className: 'lg-main' });
    let readMeta = null;

    if (pageType === 'index') buildIndexPage(mainMount, userCtx);
    else if (pageType === 'thread_list') buildThreadListPage(mainMount, crumbsInfo);
    else if (pageType === 'thread_wall') buildThreadWallPage(mainMount, crumbsInfo);
    else if (pageType === 'read') readMeta = buildReadPage(mainMount);
    else if (pageType === 'post') buildPostPage(mainMount, crumbsInfo);
    else if (pageType === 'user') buildUserPage(mainMount, userCtx);
    else if (pageType === 'profile') buildProfilePage(mainMount, crumbsInfo);
    else if (pageType === 'userpay') buildUserPayPage(mainMount);
    else if (pageType === 'login' || pageType === 'register') buildLoginPage(mainMount);
    else if (pageType === 'message') buildMessagePage(mainMount);
    else if (pageType === 'tasks') buildTasksPage(mainMount);
    else if (pageType === 'search') buildSearchPage(mainMount);
    else if (pageType === 'search_results') buildSearchResultsPage(mainMount, crumbsInfo);
    else buildGenericPage(mainMount);

    // --- Footer ---
    const footer = el('footer', { className: 'lg-footer' }, [
      el('span', { text: 'South Plus · Apple Liquid Glass 重构界面 (保留原生脚本与请求交互)' }),
      el('div', { style: 'display:flex;gap:14px;' }, [
        el('a', { href: 'simple/', target: '_blank', text: '无图移动版' }),
        el('a', { href: 'faq.php', text: '帮助' }),
        el('a', { href: 'job.php?action-erasecookie-verify-95940903.html', text: '清除 Cookies' })
      ])
    ]);

    const workspace = el('div', { className: 'lg-workspace' }, [topbar, mainMount, footer]);

    shell.appendChild(sidebar);
    shell.appendChild(workspace);
    shell.appendChild(scrim);
    shell.appendChild(forumDrawer);
    shell.appendChild(settingsDialog);
    shell.appendChild(spotlightEl);

    // --- Floating Bottom Liquid Glass Action Pill (Auto-condenses on scroll down) ---
    const dock = el('div', { className: 'lg-dock' });

    if (pageType === 'read' && readMeta) {
      const floorPop = el('div', { className: 'lg-popover', id: 'sp-lg-floor-pop' });
      const list = el('div', { className: 'lg-menu-list', style: 'max-height:300px;overflow-y:auto;' });
      readMeta.floorEntries.forEach((fe) => {
        list.appendChild(el('button', {
          type: 'button',
          className: 'lg-menu-item',
          text: `${fe.floor} · ${fe.author}`,
          onClick: () => {
            closeAllPopovers();
            qs(`#${fe.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }));
      });
      floorPop.appendChild(list);
      document.body.appendChild(floorPop);

      dock.appendChild(el('button', {
        type: 'button',
        className: 'lg-icon-btn',
        title: '楼层电梯',
        html: icon('layers'),
        onClick: (e) => {
          e.stopPropagation();
          openPopoverNear(floorPop, e.currentTarget);
        }
      }));
    }

    dock.appendChild(el('button', {
      type: 'button',
      className: 'lg-icon-btn',
      title: '回到顶部 (t)',
      html: icon('arrow_up'),
      onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' })
    }));

    if (pageType === 'read' && qs('form[name="FORM"]')) {
      dock.appendChild(el('button', {
        type: 'button',
        className: 'lg-dock-cta lg-glass-interactive',
        html: `${icon('edit')}<span class="lg-dock-cta-label">回复</span>`,
        onClick: () => {
          const rc = qs('#sp-lg-reply-card');
          if (rc) {
            rc.scrollIntoView({ behavior: 'smooth', block: 'center' });
            qs('textarea[name="atc_content"]', rc)?.focus();
          }
        }
      }));
    } else if (postBtnA) {
      dock.appendChild(el('a', {
        className: 'lg-dock-cta lg-glass-interactive',
        href: postBtnA.getAttribute('href') || '#',
        html: `${icon('edit')}<span class="lg-dock-cta-label">发帖</span>`
      }));
    }

    shell.appendChild(dock);
    document.body.appendChild(shell);
    LiquidGlassOptics.init();

    // Reveal body smoothly
    document.documentElement.classList.remove('sp-lg-loading');
    document.documentElement.classList.add('sp-lg-ready');

    // Auto-condense dock on downward scroll (iOS 26 Liquid Glass behavior)
    let lastScrollY = window.scrollY || 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY || 0;
      if (y > 160 && y > lastScrollY + 10) {
        dock.classList.add('is-condensed');
      } else if (y < lastScrollY - 10 || y < 80) {
        dock.classList.remove('is-condensed');
      }
      lastScrollY = y;
    }, { passive: true });

    // Specular pointer-tracking glint on .lg-glass-interactive & .lg-nav-item surfaces
    document.addEventListener('pointermove', (e) => {
      const host = e.target.closest?.('.lg-glass-interactive, .lg-nav-item');
      if (!host) return;
      const rect = host.getBoundingClientRect();
      host.style.setProperty('--lg-mx', `${Math.round(e.clientX - rect.left)}px`);
      host.style.setProperty('--lg-my', `${Math.round(e.clientY - rect.top)}px`);
    }, { passive: true });

    // Global click to dismiss popovers
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.lg-popover')) {
        closeAllPopovers();
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (spotlightEl.classList.contains('is-open')) closeOverlays();
        else openSpotlight();
        return;
      }
      if (Lightbox.root && Lightbox.root.classList.contains('is-open')) {
        if (e.key === 'Escape') Lightbox.close();
        else if (e.key === 'ArrowLeft') Lightbox.step(-1);
        else if (e.key === 'ArrowRight') Lightbox.step(1);
        return;
      }
      if (e.key === 'Escape') {
        closeOverlays();
        return;
      }
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchInput.focus();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        if (forumDrawer.classList.contains('is-open')) closeOverlays();
        else openDrawer();
      } else if ((e.key === 'r' || e.key === 'R') && pageType === 'read') {
        const rc = qs('#sp-lg-reply-card');
        if (rc) {
          e.preventDefault();
          rc.scrollIntoView({ behavior: 'smooth', block: 'center' });
          qs('textarea[name="atc_content"]', rc)?.focus();
        }
      } else if (e.key === 't' || e.key === 'T') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (e.key === '[' || e.key === ']') {
        const cur = qs('.lg-page-pill.is-current');
        if (cur) {
          const target = e.key === '[' ? cur.previousElementSibling : cur.nextElementSibling;
          if (target && target.tagName === 'A' && target.href) location.href = target.href;
        }
      }
    });

    // Tampermonkey Menu Commands
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('⌘K 打开 Spotlight 快速跳转', openSpotlight);
      GM_registerMenuCommand('⚙️ 打开 Liquid Glass 外观与偏好设置', openSettings);
      GM_registerMenuCommand('📂 打开全部版块目录', openDrawer);
    }
  }

  // Watch system dark/light preference changes when colorMode === 'auto'
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (Store.get('colorMode') === 'auto') applyThemeTokens();
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountShell, { once: true });
  } else {
    mountShell();
  }
})();
