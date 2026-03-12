// global-nav.js
(() => {
    function injectFavicon() {
        if (document.querySelector('link[rel="icon"]')) return;
        var link = document.createElement('link');
        link.rel = 'icon';
        link.href = 'img/favicon.ico';
        link.type = 'image/x-icon';
        document.head.appendChild(link);
    }

    function createNav() {
        const header = document.createElement('header');
        header.className = 'global-header';
        header.innerHTML = `
            <div class="gn-wrapper">
                <a class="gn-logo" href="index.html" aria-label="Mason Home">
                    <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path fill="currentColor" d="M12 2L2 7v7c0 5 4 8 10 8s10-3 10-8V7l-10-5z"/>
                    </svg>
                    <span class="gn-title">Sex With Mason</span>
                </a>

                <button class="gn-toggle" aria-expanded="false" aria-controls="gn-menu" aria-label="Toggle navigation">
                    <span class="hamburger"></span>
                </button>

                <nav id="gn-menu" class="gn-nav" role="navigation">
                    <ul class="gn-list">
                        <li><a href="index.html">Home</a></li>
                       
                        <li><a href="gallery.html">Gallery</a></li>
                        <li><a href="music.html">Music</a></li>
                        <li><a href="why.html">About</a></li>
                        <li><a href="reviews.html">Reviews</a></li>
                        <li><a href="forums.html">Forums</a></li>
                        <li><a href="pricing.html">Pricing</a></li>
                        <li><a href="account.html">Account</a></li>
                    </ul>
                    <div class="gn-actions">
                        
                       
                    </div>
                </nav>
            </div>
            <div class="gn-audio-banner" aria-label="Featured track">
                <div class="gn-audio-banner-inner">
                    <div class="gn-audio-banner-title">Nut For Me — Pegger Productions</div>
                    <div class="gn-audio-banner-player">
                        <audio preload="metadata" class="custom-audio-player" aria-label="Play Nut For Me">
                            <source src="/nutforme.mp3" type="audio/mpeg">
                        </audio>
                    </div>
                    <a href="nutforme.html" class="gn-audio-banner-link">Review this track</a>
                </div>
            </div>
            <div class="gn-backdrop" aria-hidden="true"></div>
            <div class="gn-announcement" aria-live="polite"></div>
        `;

        document.body.insertBefore(header, document.body.firstChild);

        // Secret admin: 5 quick clicks on logo reveals Admin link
        (function () {
            var logo = header.querySelector('.gn-logo');
            var clicks = 0;
            var goTimer;
            if (!logo) return;
            logo.addEventListener('click', function (e) {
                e.preventDefault();
                var href = logo.getAttribute('href') || 'index.html';
                clicks += 1;
                clearTimeout(goTimer);
                goTimer = setTimeout(function () {
                    if (clicks >= 5) {
                        var existing = document.getElementById('ms-admin-secret-link');
                        if (!existing) {
                            var adminLink = document.createElement('a');
                            adminLink.id = 'ms-admin-secret-link';
                            adminLink.href = '/masonadmin';
                            adminLink.textContent = 'Admin';
                            adminLink.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9999;background:#8b5cf6;color:#0a0a0c;padding:8px 14px;border-radius:9999px;font-size:0.8rem;font-weight:700;text-decoration:none;font-family:"DM Sans",system-ui,sans-serif;box-shadow:0 4px 12px rgba(139,92,246,0.4);';
                            document.body.appendChild(adminLink);
                            setTimeout(function () {
                                if (adminLink.parentNode) adminLink.parentNode.removeChild(adminLink);
                            }, 8000);
                        }
                    } else {
                        window.location.href = href;
                    }
                    clicks = 0;
                }, 400);
            });
        })();

        // Highlight active link
        try {
            const path = location.pathname.split('/').pop() || 'index.html';
            const links = header.querySelectorAll('.gn-list a');
            links.forEach(a => {
                const href = a.getAttribute('href').split('/').pop();
                if (href === path || (href === 'index.html' && path === '')) a.classList.add('active');
            });
        } catch (e) {}

        // Toggle mobile menu
        const toggle = header.querySelector('.gn-toggle');
        const menu = header.querySelector('#gn-menu');
        const backdrop = header.querySelector('.gn-backdrop');

        function setMenu(open) {
            toggle.setAttribute('aria-expanded', String(open));
            menu.classList.toggle('open', open);
            backdrop.classList.toggle('open', open);
            document.documentElement.style.overflow = open ? 'hidden' : '';
        }

        toggle.addEventListener('click', () => {
            const opened = toggle.getAttribute('aria-expanded') === 'true';
            setMenu(!opened);
        });

        backdrop.addEventListener('click', () => {
            setMenu(false);
        });

        // Close when clicking outside on small screens
        document.addEventListener('click', (e) => {
            if (!header.contains(e.target) && menu.classList.contains('open')) {
                setMenu(false);
            }
        });

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('open')) {
                setMenu(false);
                toggle.focus();
            }
        });

        // Close menu after tap on a link (native feel)
        menu.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && menu.classList.contains('open')) {
                setMenu(false);
            }
        });
    }

    var ANNOUNCEMENT_MODAL_KEY = 'ms_announcement_modal_seen_v1';
    var ANNOUNCEMENT_MODAL_VERSION_KEY = 'ms_announcement_modal_version';

    function getLocalDateString() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    var DEFAULT_MODAL_CONFIG = {
        title: "What's New",
        bodyHtml: '<p style="margin:0">Here\'s what\'s new on the site:</p>' +
            '<ul class="ms-announcement-updates">' +
            '<li><span class="ms-announcement-dot" aria-hidden="true"></span><span><strong>V2 redesign</strong> — New look and feel: Noir Luxe theme, Syne & DM Sans typography, violet accents, and smoother animations across the site.</span></li>' +
            '<li><span class="ms-announcement-dot" aria-hidden="true"></span><span><strong>Nut For Me</strong> — New track from Pegger Productions. Listen in the banner below the nav and on the dedicated track page.</span></li>' +
            '<li><span class="ms-announcement-dot" aria-hidden="true"></span><span><strong>Custom audio player</strong> — In-site player with play/pause, seek bar, and time display that matches the new design.</span></li>' +
            '<li><span class="ms-announcement-dot" aria-hidden="true"></span><span><strong>Track reviews</strong> — Rate and review "Nut For Me" the same way you do site reviews.</span></li>' +
            '<li><span class="ms-announcement-dot" aria-hidden="true"></span><span><strong>Smoother experience</strong> — Smooth scrolling, scroll-triggered animations, and refined hover states throughout.</span></li>' +
            '</ul>',
        version: 0
    };

    function getModalConfig(cb) {
        var SUPABASE_URL = 'https://hyehyfbnskiybdspkbxe.supabase.co';
        var SUPABASE_ANON_KEY = 'sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu';
        if (typeof supabase === 'undefined') {
            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js';
            script.onload = function () {
                var sb = window.msSupabase || (window.msSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mason_auth', storage: window.localStorage } }));
                sb.from('site_settings').select('value').eq('key', 'announcement_modal').maybeSingle()
                    .then(function (res) {
                        var v = res.data && res.data.value;
                        if (v && (v.title !== undefined || v.bodyHtml !== undefined || v.version !== undefined)) {
                            cb({ title: v.title || DEFAULT_MODAL_CONFIG.title, bodyHtml: v.bodyHtml !== undefined ? v.bodyHtml : DEFAULT_MODAL_CONFIG.bodyHtml, version: Number(v.version) || 0 });
                        } else {
                            cb(DEFAULT_MODAL_CONFIG);
                        }
                    })
                    .catch(function () { cb(DEFAULT_MODAL_CONFIG); });
                sb.from('site_settings').select('value').eq('key', 'sound_effects').maybeSingle()
                    .then(function (res) {
                        var enabled = res.data && res.data.value && res.data.value.enabled !== false;
                        if (typeof window !== 'undefined') window.__soundEffectsEnabled = enabled;
                        if (typeof window.soundEffectsEnabled === 'function') window.soundEffectsEnabled(enabled);
                    })
                    .catch(function () {});
            };
            script.onerror = function () { cb(DEFAULT_MODAL_CONFIG); };
            document.head.appendChild(script);
            return;
        }
        var sb = window.msSupabase || (window.msSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mason_auth', storage: window.localStorage } }));
        sb.from('site_settings').select('value').eq('key', 'announcement_modal').maybeSingle()
            .then(function (res) {
                var v = res.data && res.data.value;
                if (v && (v.title !== undefined || v.bodyHtml !== undefined || v.version !== undefined)) {
                    cb({ title: v.title || DEFAULT_MODAL_CONFIG.title, bodyHtml: v.bodyHtml !== undefined ? v.bodyHtml : DEFAULT_MODAL_CONFIG.bodyHtml, version: Number(v.version) || 0 });
                } else {
                    cb(DEFAULT_MODAL_CONFIG);
                }
            })
            .catch(function () { cb(DEFAULT_MODAL_CONFIG); });
        sb.from('site_settings').select('value').eq('key', 'sound_effects').maybeSingle()
            .then(function (res) {
                var enabled = res.data && res.data.value && res.data.value.enabled !== false;
                if (typeof window !== 'undefined') window.__soundEffectsEnabled = enabled;
                if (typeof window.soundEffectsEnabled === 'function') window.soundEffectsEnabled(enabled);
            })
            .catch(function () {});
    }

    function showAnnouncementModal(config) {
        config = config || DEFAULT_MODAL_CONFIG;
        try {
            var lastSeenDate = localStorage.getItem(ANNOUNCEMENT_MODAL_KEY);
            var lastSeenVersion = parseInt(localStorage.getItem(ANNOUNCEMENT_MODAL_VERSION_KEY) || '0', 10);
            var today = getLocalDateString();
            var shouldShow = (lastSeenDate !== today) || (config.version > lastSeenVersion);
            if (!shouldShow) return;
        } catch (e) { return; }

        var titleEl = document.createElement('h2');
        titleEl.id = 'ms-announcement-title';
        titleEl.textContent = config.title || "What's New";

        var overlay = document.createElement('div');
        overlay.className = 'ms-announcement-modal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'ms-announcement-title');
        overlay.innerHTML = '<div class="ms-announcement-modal-backdrop"></div>' +
            '<div class="ms-announcement-modal-dialog">' +
            '<div class="ms-announcement-modal-body">' +
            '</div>' +
            '<div class="ms-announcement-modal-footer">' +
            '<button type="button" class="ms-announcement-btn">Got it</button>' +
            '</div>' +
            '</div>' +
            '</div>';
        var bodyEl = overlay.querySelector('.ms-announcement-modal-body');
        bodyEl.appendChild(titleEl);
        bodyEl.insertAdjacentHTML('beforeend', config.bodyHtml || DEFAULT_MODAL_CONFIG.bodyHtml);

        document.body.appendChild(overlay);

        function closeModal() {
            overlay.classList.remove('open');
            try {
                localStorage.setItem(ANNOUNCEMENT_MODAL_KEY, getLocalDateString());
                localStorage.setItem(ANNOUNCEMENT_MODAL_VERSION_KEY, String(config.version));
            } catch (e) {}
            setTimeout(function () {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 320);
        }

        var btn = overlay.querySelector('.ms-announcement-btn');
        var backdrop = overlay.querySelector('.ms-announcement-modal-backdrop');

        if (btn) btn.addEventListener('click', closeModal);
        if (backdrop) backdrop.addEventListener('click', closeModal);

        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                overlay.classList.add('open');
                if (btn) btn.focus();
            });
        });
    }

    function injectStyles() {
        if (document.getElementById('global-nav-styles')) return;
        const css = `
            .global-header{font-family:"DM Sans",system-ui,-apple-system,sans-serif;position:sticky;top:0;z-index:8000;background:rgba(10,10,12,0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.06);transition:background .32s ease,border-color .32s ease}
            .gn-wrapper{max-width:1200px;margin:0 auto;padding:16px 24px;display:flex;align-items:center;gap:18px}
            .gn-logo{display:inline-flex;align-items:center;gap:10px;color:#fafafa;text-decoration:none;font-weight:700;font-family:"Syne",system-ui,sans-serif;transition:transform .22s cubic-bezier(0.34,1.56,0.64,1),opacity .22s ease}
            .gn-logo:hover{transform:scale(1.02);opacity:.95}
            .gn-logo svg{display:block}
            .gn-title{font-size:1.15rem}
            .gn-toggle{display:none;background:none;border:0;padding:8px;border-radius:12px;min-height:44px;min-width:44px;cursor:pointer;transition:transform .2s cubic-bezier(0.34,1.56,0.64,1),background .2s ease;color:#fafafa}
            .gn-toggle:hover{background:rgba(255,255,255,0.06)}
            .gn-toggle .hamburger{width:22px;height:2px;background:currentColor;display:block;position:relative;transition:transform .25s cubic-bezier(0.34,1.56,0.64,1)}
            .gn-toggle .hamburger:before,.gn-toggle .hamburger:after{content:"";position:absolute;left:0;width:100%;height:2px;background:currentColor;transition:transform .25s cubic-bezier(0.34,1.56,0.64,1)}
            .gn-toggle .hamburger:before{top:-6px}.gn-toggle .hamburger:after{top:6px}
            .gn-nav{display:flex;align-items:center;justify-content:center;gap:16px;flex:1;margin:0 auto}
            .gn-list{display:flex;gap:14px;list-style:none;padding:0;margin:0}
            .gn-list a{color:#e4e4e7;text-decoration:none;padding:10px 14px;border-radius:9999px;transition:transform .22s cubic-bezier(0.34,1.56,0.64,1),background .25s ease,color .2s ease}
            .gn-list a:hover{background:rgba(167,139,250,0.15);transform:translateY(-2px);color:#fafafa}
            .gn-list a.active{background:#8b5cf6;color:#0a0a0c;font-weight:700}
            .gn-actions{display:flex;gap:10px;align-items:center}
            .gn-search{display:flex;align-items:center;gap:8px;background:#fafafa;padding:6px;border-radius:9999px}
            .gn-search input{border:0;background:transparent;outline:none;padding:6px 8px;width:140px}
            .gn-search button{background:transparent;border:0;padding:0;font-size:1rem}
            .gn-cta{display:inline-block;background:#a78bfa;color:#0a0a0c;padding:10px 16px;border-radius:9999px;text-decoration:none;font-weight:700}
            .gn-announcement{max-width:1200px;margin:0 auto;padding:0 24px 12px}
            .gn-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.6);opacity:0;pointer-events:none;transition:opacity .32s cubic-bezier(0.25,1,0.5,1);z-index:7990}
            .gn-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.6);opacity:0;pointer-events:none;transition:opacity .32s cubic-bezier(0.25,1,0.5,1);z-index:7990}
            .gn-backdrop.open{opacity:1;pointer-events:auto}
            .ms-announcement-modal{position:fixed;inset:0;z-index:25000;display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;visibility:hidden;transition:opacity .32s ease,visibility .32s ease}
            .ms-announcement-modal.open{opacity:1;visibility:visible}
            .ms-announcement-modal-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
            .ms-announcement-modal-dialog{position:relative;width:100%;max-width:480px;max-height:90vh;overflow:auto;background:#141418;border:1px solid rgba(255,255,255,0.08);border-radius:20px;box-shadow:0 32px 64px rgba(0,0,0,0.5);font-family:"DM Sans",system-ui,sans-serif;animation:ms-modal-in .35s cubic-bezier(0.25,1,0.5,1) forwards}
            @keyframes ms-modal-in{from{opacity:0;transform:scale(0.96) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
            .ms-announcement-modal-dialog h2{font-family:"Syne",system-ui,sans-serif;font-size:1.5rem;font-weight:700;margin:0 0 8px;color:#fafafa}
            .ms-announcement-modal-dialog .ms-announcement-modal-body{padding:24px 24px 20px;color:#a1a1aa;font-size:0.95rem;line-height:1.6}
            .ms-announcement-modal-dialog .ms-announcement-updates{list-style:none;padding:0;margin:16px 0 0}
            .ms-announcement-modal-dialog .ms-announcement-updates li{padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;gap:10px;align-items:flex-start}
            .ms-announcement-modal-dialog .ms-announcement-updates li:last-child{border-bottom:0}
            .ms-announcement-modal-dialog .ms-announcement-updates .ms-announcement-dot{flex-shrink:0;width:8px;height:8px;border-radius:50%;background:#a78bfa;margin-top:6px}
            .ms-announcement-modal-dialog .ms-announcement-updates strong{color:#fafafa;font-weight:600}
            .ms-announcement-modal-dialog .ms-announcement-modal-footer{padding:16px 24px 24px;display:flex;justify-content:flex-end}
            .ms-announcement-modal-dialog .ms-announcement-btn{background:#8b5cf6;color:#0a0a0c;border:0;border-radius:9999px;padding:12px 24px;font-weight:700;font-size:0.95rem;cursor:pointer;transition:transform .2s cubic-bezier(0.34,1.56,0.64,1),box-shadow .2s ease}
            .ms-announcement-modal-dialog .ms-announcement-btn:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(139,92,246,0.4)}
            .gn-announcement .gn-ann-bar{display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(90deg,#7c3aed,#a78bfa);color:#0a0a0c;border-radius:20px;padding:12px 18px;font-weight:600;letter-spacing:0.01em;box-shadow:0 12px 24px rgba(139,92,246,0.3);border:1px solid rgba(255,255,255,0.08);text-align:center}
            .gn-announcement .gn-ann-bar .gn-ann-pill{background:rgba(0,0,0,0.15);padding:4px 10px;border-radius:9999px;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em}
            .gn-announcement .gn-ann-bar .gn-ann-text{line-height:1.35}
            .gn-audio-banner{background:rgba(20,20,24,0.95);border-bottom:1px solid rgba(255,255,255,0.06);padding:14px 24px}
            .gn-audio-banner-inner{max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:16px}
            .gn-audio-banner-title{font-family:"Syne",system-ui,sans-serif;font-weight:700;font-size:1.05rem;color:#fafafa;flex-shrink:0}
            .gn-audio-banner-player{flex:1;min-width:200px;max-width:400px}
            .gn-audio-banner-player .custom-audio-ui{padding:8px 12px;min-height:44px}
            .gn-audio-banner-link{color:#a78bfa;font-weight:600;text-decoration:none;padding:8px 14px;border-radius:9999px;background:rgba(167,139,250,0.15);transition:background .2s ease,color .2s ease;flex-shrink:0}
            .gn-audio-banner-link:hover{background:rgba(167,139,250,0.25);color:#c4b5fd}
            .ms-intro-video{position:fixed;inset:0;z-index:30000;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden}
            .ms-intro-video video{width:100%;height:100%;object-fit:cover;object-position:center;display:block}
            .gravity-item{transition:transform var(--gravityDur,1.6s) cubic-bezier(0.2,0.7,0.2,1);transform:translateY(var(--gravityY,0px)) rotate(var(--gravityR,0deg));will-change:transform}
            .ms-physics-water{position:fixed;left:0;right:0;bottom:0;height:40vh;background:linear-gradient(180deg,rgba(56,189,248,0.08),rgba(14,116,144,0.5));backdrop-filter:blur(2px);z-index:12000;pointer-events:none}
            .ms-maintenance{position:fixed;inset:0;z-index:40000;background:#0b0f1a;display:flex;align-items:center;justify-content:center}
            .ms-maintenance-inner{font-family:Space Grotesk,system-ui,sans-serif;font-size:2rem;color:#f8fafc;text-align:center;padding:2rem;border:1px solid rgba(148,163,184,0.35);border-radius:16px;background:rgba(15,23,42,0.6);box-shadow:0 30px 80px rgba(2,6,23,0.6)}
            .ms-admin-block-modal{position:fixed;inset:0;z-index:45000;display:flex;align-items:center;justify-content:center;padding:24px;pointer-events:auto}
            .ms-admin-block-modal-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.88);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
            .ms-admin-block-modal-dialog{position:relative;width:100%;max-width:520px;max-height:90vh;overflow:auto;background:#141418;border:1px solid rgba(255,255,255,0.1);border-radius:20px;box-shadow:0 32px 64px rgba(0,0,0,0.6);font-family:"DM Sans",system-ui,sans-serif;padding:28px 28px 24px}
            .ms-admin-block-modal-dialog h2{font-family:"Syne",system-ui,sans-serif;font-size:1.5rem;font-weight:700;margin:0 0 12px;color:#fafafa}
            .ms-admin-block-modal-body{color:#a1a1aa;font-size:0.95rem;line-height:1.65;white-space:pre-wrap}
            .ms-admin-block-modal-cta{margin-top:20px}
            .ms-admin-block-modal-cta a{display:inline-block;background:#8b5cf6;color:#0a0a0c;padding:12px 24px;border-radius:9999px;font-weight:700;text-decoration:none;transition:transform .2s ease,box-shadow .2s ease}
            .ms-admin-block-modal-cta a:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(139,92,246,0.4)}
            .ms-jumpscare{position:fixed;inset:0;z-index:50000;display:flex;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,0.8)}
            .ms-jumpscare img{width:100%;height:100%;object-fit:cover;object-position:center;animation:ms-jumpscare-flash 0.12s steps(2) 10}
            .ms-jumpscare.shake{animation:ms-jumpscare-shake 0.12s infinite}
            @keyframes ms-jumpscare-flash{0%{opacity:0}50%{opacity:1}100%{opacity:0}}
            @keyframes ms-jumpscare-shake{0%{transform:translate(0)}25%{transform:translate(6px,-6px)}50%{transform:translate(-6px,6px)}75%{transform:translate(6px,6px)}100%{transform:translate(0)}}

            /* Responsive */
            @media (max-width:850px){
                .gn-wrapper{padding:calc(12px + env(safe-area-inset-top)) 16px}
                .gn-title{font-size:1rem}
                .gn-toggle{display:inline-flex;margin-left:auto}
                .gn-nav{position:fixed;inset:0;right:0;top:0;height:100vh;width:100vw;background:#0a0a0c;flex-direction:column;padding:calc(72px + env(safe-area-inset-top)) 24px 32px;transform:translateX(110%);transition:transform .35s cubic-bezier(0.25,1,0.5,1);box-shadow:none;z-index:8001}
                .gn-nav.open{transform:translateX(0)}
                .gn-list{flex-direction:column;gap:12px}
                .gn-list a{width:100%;text-align:left;padding:14px 18px;font-size:1.1rem;border-radius:14px;background:rgba(255,255,255,0.04);transition:transform .22s cubic-bezier(0.34,1.56,0.64,1),background .25s ease}
                .gn-list a.active{background:#8b5cf6;color:#0a0a0c}
                .gn-actions{margin-top:auto;flex-direction:column;gap:12px;width:100%}
                .gn-search input{width:100%}
                .gn-announcement{padding:0 14px 12px}
            }

            @media (max-width:480px){
                .gn-title{display:none}
                .gn-logo svg{width:30px;height:30px}
                .gn-announcement .gn-ann-bar{padding:10px 12px;font-size:0.9rem}
                .gn-audio-banner{padding:12px 16px}
                .gn-audio-banner-inner{flex-direction:column;align-items:stretch}
                .gn-audio-banner-player{max-width:none}
                .gn-audio-banner-link{text-align:center}
            }
        `;
        const s = document.createElement('style');
        s.id = 'global-nav-styles';
        s.appendChild(document.createTextNode(css));
        document.head.appendChild(s);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            injectFavicon();
            injectStyles();
            createNav();
            injectCustomAudioScript();
            injectSoundEffects();
            getModalConfig(function (config) {
                setTimeout(function () { showAnnouncementModal(config); }, 300);
            });
        });
    } else {
        injectFavicon();
        injectStyles();
        createNav();
        injectCustomAudioScript();
        injectSoundEffects();
        getModalConfig(function (config) {
            setTimeout(function () { showAnnouncementModal(config); }, 300);
        });
    }

    function injectSoundEffects() {
        if (document.getElementById('sound-effects-script')) return;
        var s = document.createElement('script');
        s.id = 'sound-effects-script';
        s.src = 'sound-effects.js';
        s.async = true;
        document.body.appendChild(s);
    }

    function injectCustomAudioScript() {
        if (document.getElementById('custom-audio-player-script')) return;
        var s = document.createElement('script');
        s.id = 'custom-audio-player-script';
        s.src = 'custom-audio-player.js';
        s.async = false;
        document.body.appendChild(s);
        s.onload = function () {
            if (window.customAudioPlayerInit) window.customAudioPlayerInit();
        };
    }

    function maybePlayIntroVideo() {
        const KEY = 'ms_intro_video_seen';
        if (localStorage.getItem(KEY) === '1') return;
        localStorage.setItem(KEY, '1');

        const overlay = document.createElement('div');
        overlay.className = 'ms-intro-video';
        overlay.innerHTML = `
          <video autoplay muted playsinline preload="auto">
            <source src="img/intro.mp4" type="video/mp4" />
          </video>
        `;
        document.body.appendChild(overlay);

        const video = overlay.querySelector('video');
        const cleanup = () => {
            overlay.remove();
        };
        video.addEventListener('ended', cleanup);
        video.addEventListener('error', cleanup);
        // Safety timeout in case autoplay is blocked
        setTimeout(() => {
            if (overlay.isConnected) cleanup();
        }, 15000);
    }

    function setIntroLoop(enabled) {
        let overlay = document.querySelector('.ms-intro-video.loop');
        let intervalId = window.__msIntroLoopInterval;
        if (!enabled) {
            if (overlay) overlay.remove();
            if (intervalId) {
                clearInterval(intervalId);
                window.__msIntroLoopInterval = null;
            }
            return;
        }
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'ms-intro-video loop';
            overlay.innerHTML = `
              <video autoplay muted playsinline loop preload="auto">
                <source src="img/intro.mp4" type="video/mp4" />
              </video>
            `;
            document.body.appendChild(overlay);
        }
        const video = overlay.querySelector('video');
        if (video) {
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.autoplay = true;
            video.onended = () => {
                video.currentTime = 0;
                video.play().catch(() => {});
            };
            video.play().catch(() => {});
            if (!intervalId) {
                intervalId = setInterval(() => {
                    if (!video.isConnected) return;
                    video.currentTime = 0;
                    video.play().catch(() => {});
                }, 15000);
                window.__msIntroLoopInterval = intervalId;
            }
        }
    }

    function setupPhysicsMode() {
        const SUPABASE_URL = 'https://hyehyfbnskiybdspkbxe.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu';

        const loadSupabase = async () => {
            if (typeof supabase !== 'undefined') return;
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js';
                s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
            }).catch(() => {});
        };

        let physicsEnabled = false;
        let rafId = null;
        let elements = [];
        const state = new WeakMap();
        let water = null;
        let waterLine = 0;
        let frameCount = 0;

        const ensureWater = () => {
            if (water) return;
            water = document.createElement('div');
            water.className = 'ms-physics-water';
            document.body.appendChild(water);
        };

        const teardownWater = () => {
            if (!water) return;
            water.remove();
            water = null;
        };

        const collectElements = () => {
            const root = document.body;
            const candidates = new Set();
            const main = document.querySelector('main');
            if (main) {
                Array.from(main.children).forEach((el) => candidates.add(el));
                Array.from(main.querySelectorAll('section, article, figure, blockquote')).forEach((el) => candidates.add(el));
            }
            Array.from(root.querySelectorAll('.card,.stat,.hero,.review-card,.shot')).forEach((el) => candidates.add(el));
            elements = Array.from(candidates).filter((el) => {
                if (el === document.documentElement || el === document.body) return false;
                if (el.closest('[data-gravity-ignore]')) return false;
                if (el.classList.contains('ms-intro-video')) return false;
                if (el.classList.contains('ms-physics-water')) return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });

            elements.forEach((el) => {
                if (!state.has(el)) {
                    const rect = el.getBoundingClientRect();
                    state.set(el, {
                        x: 0,
                        y: 0,
                        vx: (Math.random() - 0.5) * 0.6,
                        vy: (Math.random() - 0.5) * 0.6,
                        rot: (Math.random() - 0.5) * 6,
                        vrot: (Math.random() - 0.5) * 0.6,
                        w: rect.width,
                        h: rect.height,
                        baseLeft: rect.left,
                        baseTop: rect.top
                    });
                }
                el.classList.add('gravity-item');
                el.style.setProperty('--gravityDur', '0s');
            });
        };

        const resetElements = () => {
            elements.forEach((el) => {
                el.style.setProperty('--gravityY', '0px');
                el.style.setProperty('--gravityR', '0deg');
                el.style.setProperty('--gravityDur', '2.6s');
            });
            setTimeout(() => {
                elements.forEach((el) => {
                    el.classList.remove('gravity-item');
                    el.style.removeProperty('--gravityY');
                    el.style.removeProperty('--gravityR');
                    el.style.removeProperty('--gravityDur');
                });
            }, 2700);
            elements = [];
            state.clear?.();
        };

        const tick = () => {
            if (!physicsEnabled) return;
            frameCount += 1;
            const g = 0.35; // gravity
            const dragAir = 0.992;
            const dragWater = 0.92;
            const bounce = 0.55;
            const floatiness = 0.015;
            const centerX = window.innerWidth / 2;
            waterLine = Math.floor(window.innerHeight * 0.68);

            elements.forEach((el) => {
                const s = state.get(el);
                if (!s) return;
                if (frameCount % 20 === 0) {
                    const rect = el.getBoundingClientRect();
                    s.w = rect.width;
                    s.h = rect.height;
                    s.baseLeft = rect.left - s.x;
                    s.baseTop = rect.top - s.y;
                }

                const top = s.baseTop + s.y;
                const left = s.baseLeft + s.x;
                const below = top + s.h > waterLine;
                const drag = below ? dragWater : dragAir;

                s.vy += g;
                if (below) {
                    s.vy -= (top + s.h - waterLine) * floatiness;
                    s.vx += (centerX - (left + s.w / 2)) * 0.0002;
                }

                s.vx *= drag;
                s.vy *= drag;
                s.vrot *= drag;

                s.x += s.vx;
                s.y += s.vy;
                s.rot += s.vrot;

                const floor = window.innerHeight - s.h - 6;
                const ceil = 0;
                const boundLeft = 0;
                const boundRight = window.innerWidth - s.w;

                if (top > floor) {
                    s.y = floor - s.baseTop;
                    s.vy *= -bounce;
                    s.vx *= 0.95;
                }
                if (top < ceil) {
                    s.y = ceil - s.baseTop;
                    s.vy *= -bounce;
                }
                if (left < boundLeft) {
                    s.x = boundLeft - s.baseLeft;
                    s.vx *= -bounce;
                }
                if (left > boundRight) {
                    s.x = boundRight - s.baseLeft;
                    s.vx *= -bounce;
                }

                el.style.setProperty('--gravityY', `${s.y}px`);
                el.style.setProperty('--gravityR', `${s.rot}deg`);
            });

            rafId = requestAnimationFrame(tick);
        };

        const applyPhysics = (enabled) => {
            physicsEnabled = enabled;
            if (enabled) {
                ensureWater();
                collectElements();
                cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(tick);
                document.addEventListener('click', onClickImpulse);
            } else {
                cancelAnimationFrame(rafId);
                document.removeEventListener('click', onClickImpulse);
                teardownWater();
                resetElements();
            }
        };

        const onClickImpulse = (e) => {
            const target = e.target.closest('*');
            if (!target) return;
            const s = state.get(target);
            if (!s) return;
            s.vy -= 8 + Math.random() * 4;
            s.vx += (Math.random() - 0.5) * 6;
            s.vrot += (Math.random() - 0.5) * 6;
        };

        const init = async () => {
            await loadSupabase();
            if (typeof supabase === 'undefined') return;
            const sb = window.msSupabase || (window.msSupabase = supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY,
                { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'mason_auth', storage: window.localStorage } }
            ));

            const ensureMaintenance = () => {
                let overlay = document.querySelector('.ms-maintenance');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'ms-maintenance';
                    overlay.innerHTML = '<div class="ms-maintenance-inner">Mason is With a client</div>';
                    document.body.appendChild(overlay);
                }
                return overlay;
            };

            const clearMaintenance = () => {
                const overlay = document.querySelector('.ms-maintenance');
                if (overlay) overlay.remove();
            };

            const ensureAdminBlockModal = (config) => {
                if (!config || !config.enabled) {
                    const el = document.querySelector('.ms-admin-block-modal');
                    if (el) el.remove();
                    document.documentElement.style.overflow = '';
                    return;
                }
                var overlay = document.querySelector('.ms-admin-block-modal');
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'ms-admin-block-modal';
                    overlay.setAttribute('role', 'dialog');
                    overlay.setAttribute('aria-modal', 'true');
                    overlay.setAttribute('aria-labelledby', 'ms-admin-block-title');
                    overlay.innerHTML = '<div class="ms-admin-block-modal-backdrop"></div><div class="ms-admin-block-modal-dialog"><h2 id="ms-admin-block-title"></h2><div class="ms-admin-block-modal-body"></div><div class="ms-admin-block-modal-cta" style="display:none"></div></div>';
                    document.body.appendChild(overlay);
                    document.documentElement.style.overflow = 'hidden';
                }
                var titleEl = overlay.querySelector('#ms-admin-block-title');
                var bodyEl = overlay.querySelector('.ms-admin-block-modal-body');
                var ctaWrap = overlay.querySelector('.ms-admin-block-modal-cta');
                if (titleEl) titleEl.textContent = config.title || 'Notice';
                if (bodyEl) {
                    bodyEl.textContent = config.body || '';
                    bodyEl.style.display = (config.body || '').trim() ? '' : 'none';
                }
                if (ctaWrap && config.cta_label && config.cta_url) {
                    ctaWrap.style.display = '';
                    ctaWrap.innerHTML = '<a href="' + String(config.cta_url).replace(/"/g, '&quot;') + '">' + String(config.cta_label).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</a>';
                } else {
                    ctaWrap.style.display = 'none';
                    ctaWrap.innerHTML = '';
                }
            };

            const clearAdminBlockModal = () => {
                ensureAdminBlockModal({ enabled: false });
            };

            let lastJumpscareNonce = Number(sessionStorage.getItem('ms_jumpscare_nonce') || 0);
            const triggerJumpscare = (nonce) => {
                if (!nonce || nonce <= lastJumpscareNonce) return;
                lastJumpscareNonce = nonce;
                sessionStorage.setItem('ms_jumpscare_nonce', String(nonce));

                const existing = document.querySelector('.ms-jumpscare');
                if (existing) existing.remove();

                const overlay = document.createElement('div');
                overlay.className = 'ms-jumpscare shake';
                overlay.innerHTML = '<img src="img/jump.png" alt="" aria-hidden="true" />';
                document.body.appendChild(overlay);

                const audio = new Audio('img/jumpscare.mp3');
                audio.volume = 1;
                audio.play().catch(() => {});

                setTimeout(() => {
                    overlay.remove();
                }, 1500);
            };

            const fetchSetting = async () => {
                const { data } = await sb.from('site_settings').select('key,value').in('key', ['physics_mode','maintenance_mode','intro_loop','jumpscare','sound_effects','admin_block_modal']);
                const map = new Map((data || []).map((row) => [row.key, row.value]));
                applyPhysics(Boolean(map.get('physics_mode')?.enabled));
                if (map.get('maintenance_mode')?.enabled) {
                    ensureMaintenance();
                } else {
                    clearMaintenance();
                }
                setIntroLoop(Boolean(map.get('intro_loop')?.enabled));
                if (typeof window.__soundEffectsEnabled !== 'undefined' || typeof window.soundEffectsEnabled === 'function') {
                    var sfx = map.get('sound_effects');
                    var on = sfx && sfx.enabled !== false;
                    if (typeof window !== 'undefined') window.__soundEffectsEnabled = on;
                    if (typeof window.soundEffectsEnabled === 'function') window.soundEffectsEnabled(on);
                }
                const jumpscare = map.get('jumpscare');
                if (jumpscare?.nonce) {
                    const nonce = Number(jumpscare?.nonce || 0);
                    if (nonce > lastJumpscareNonce) {
                        lastJumpscareNonce = nonce;
                        sessionStorage.setItem('ms_jumpscare_nonce', String(nonce));
                    }
                }
                var blockModal = map.get('admin_block_modal');
                if (blockModal && blockModal.enabled) {
                    ensureAdminBlockModal(blockModal);
                } else {
                    clearAdminBlockModal();
                }
            };

            await fetchSetting();

            sb.channel('public:site_settings')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload) => {
                    const key = payload.new?.key || payload.old?.key;
                    if (key === 'physics_mode') {
                        applyPhysics(Boolean(payload.new?.value?.enabled));
                    }
                    if (key === 'maintenance_mode') {
                        if (payload.new?.value?.enabled) {
                            ensureMaintenance();
                        } else {
                            clearMaintenance();
                        }
                    }
                    if (key === 'intro_loop') {
                        setIntroLoop(Boolean(payload.new?.value?.enabled));
                    }
                    if (key === 'sound_effects') {
                        var on = payload.new && payload.new.value && payload.new.value.enabled !== false;
                        if (typeof window !== 'undefined') window.__soundEffectsEnabled = on;
                        if (typeof window.soundEffectsEnabled === 'function') window.soundEffectsEnabled(on);
                    }
                    if (key === 'jumpscare') {
                        if (payload.new?.value?.enabled) {
                            triggerJumpscare(Number(payload.new?.value?.nonce || 0));
                        }
                    }
                    if (key === 'admin_block_modal') {
                        if (payload.new?.value?.enabled) {
                            ensureAdminBlockModal(payload.new.value);
                        } else {
                            clearAdminBlockModal();
                        }
                    }
                })
                .subscribe();
        };

        init();
    }

    // Load site-wide announcement listener so banners appear on every page
    function loadAnnouncementScript() {
        if (document.getElementById('ms-announcement-script')) return;
        const s = document.createElement('script');
        s.id = 'ms-announcement-script';
        s.src = 'announcement.js';
        s.async = true;
        document.head.appendChild(s);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadAnnouncementScript();
            maybePlayIntroVideo();
            setupPhysicsMode();
        });
    } else {
        loadAnnouncementScript();
        maybePlayIntroVideo();
        setupPhysicsMode();
    }

})();
