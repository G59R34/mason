// global-nav.js
(() => {
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
            <div class="gn-backdrop" aria-hidden="true"></div>
            <div class="gn-announcement" aria-live="polite"></div>
        `;

        document.body.insertBefore(header, document.body.firstChild);

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

    function injectStyles() {
        if (document.getElementById('global-nav-styles')) return;
        const css = `
            .global-header{font-family:"Space Grotesk",system-ui,-apple-system,sans-serif;position:sticky;top:0;z-index:8000;background:rgba(11,15,20,0.9);backdrop-filter:blur(18px);border-bottom:1px solid rgba(148,163,184,0.18)}
            .gn-wrapper{max-width:1160px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;gap:18px}
            .gn-logo{display:inline-flex;align-items:center;gap:10px;color:#f8fafc;text-decoration:none;font-weight:700}
            .gn-logo svg{display:block}
            .gn-title{font-size:1.15rem}
            .gn-toggle{display:none;background:none;border:0;padding:8px;border-radius:8px;min-height:44px;min-width:44px}
            .gn-toggle .hamburger{width:22px;height:2px;background:currentColor;display:block;position:relative}
            .gn-toggle .hamburger:before,.gn-toggle .hamburger:after{content:"";position:absolute;left:0;width:100%;height:2px;background:currentColor}
            .gn-toggle .hamburger:before{top:-6px}.gn-toggle .hamburger:after{top:6px}
            .gn-nav{display:flex;align-items:center;justify-content:center;gap:16px;flex:1;margin:0 auto}
            .gn-list{display:flex;gap:14px;list-style:none;padding:0;margin:0}
            .gn-list a{color:#e2e8f0;text-decoration:none;padding:8px 12px;border-radius:999px;transition:all .18s}
            .gn-list a:hover{background:rgba(34,211,238,0.16);transform:translateY(-2px)}
            .gn-list a.active{background:linear-gradient(90deg,#22d3ee,#0ea5a4);color:#0b0f14}
            .gn-actions{display:flex;gap:10px;align-items:center}
            .gn-search{display:flex;align-items:center;gap:8px;background:#f8fafc;padding:6px;border-radius:999px}
            .gn-search input{border:0;background:transparent;outline:none;padding:6px 8px;width:140px}
            .gn-search button{background:transparent;border:0;padding:0;font-size:1rem}
            .gn-cta{display:inline-block;background:#22d3ee;color:#0b0f14;padding:8px 12px;border-radius:999px;text-decoration:none}
            .gn-announcement{max-width:1160px;margin:0 auto;padding:0 20px 12px}
            .gn-backdrop{position:fixed;inset:0;background:rgba(2,6,23,0.65);opacity:0;pointer-events:none;transition:opacity .25s ease;z-index:7990}
            .gn-backdrop.open{opacity:1;pointer-events:auto}
            .gn-announcement .gn-ann-bar{display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(90deg,#0f766e,#22d3ee);color:#0b0f14;border-radius:18px;padding:12px 16px;font-weight:600;letter-spacing:0.01em;box-shadow:0 12px 24px rgba(2,6,23,0.6);border:1px solid rgba(148,163,184,0.25);text-align:center}
            .gn-announcement .gn-ann-bar .gn-ann-pill{background:rgba(255,255,255,0.18);padding:4px 10px;border-radius:999px;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em}
            .gn-announcement .gn-ann-bar .gn-ann-text{line-height:1.35}
            .ms-intro-video{position:fixed;inset:0;z-index:30000;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden}
            .ms-intro-video video{width:100%;height:100%;object-fit:cover;object-position:center;display:block}
            .gravity-item{transition:transform var(--gravityDur,1.6s) cubic-bezier(0.2,0.7,0.2,1);transform:translateY(var(--gravityY,0px)) rotate(var(--gravityR,0deg));will-change:transform}
            .ms-physics-water{position:fixed;left:0;right:0;bottom:0;height:40vh;background:linear-gradient(180deg,rgba(56,189,248,0.08),rgba(14,116,144,0.5));backdrop-filter:blur(2px);z-index:12000;pointer-events:none}
            .ms-maintenance{position:fixed;inset:0;z-index:40000;background:#0b0f1a;display:flex;align-items:center;justify-content:center}
            .ms-maintenance-inner{font-family:Space Grotesk,system-ui,sans-serif;font-size:2rem;color:#f8fafc;text-align:center;padding:2rem;border:1px solid rgba(148,163,184,0.35);border-radius:16px;background:rgba(15,23,42,0.6);box-shadow:0 30px 80px rgba(2,6,23,0.6)}
            .ms-jumpscare{position:fixed;inset:0;z-index:50000;display:flex;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,0.8)}
            .ms-jumpscare img{width:100%;height:100%;object-fit:cover;object-position:center;animation:ms-jumpscare-flash 0.12s steps(2) 10}
            .ms-jumpscare.shake{animation:ms-jumpscare-shake 0.12s infinite}
            @keyframes ms-jumpscare-flash{0%{opacity:0}50%{opacity:1}100%{opacity:0}}
            @keyframes ms-jumpscare-shake{0%{transform:translate(0)}25%{transform:translate(6px,-6px)}50%{transform:translate(-6px,6px)}75%{transform:translate(6px,6px)}100%{transform:translate(0)}}

            /* Responsive */
            @media (max-width:850px){
                .gn-wrapper{padding:calc(10px + env(safe-area-inset-top)) 14px}
                .gn-title{font-size:1rem}
                .gn-toggle{display:inline-flex;margin-left:auto}
                .gn-nav{position:fixed;inset:0;right:0;top:0;height:100vh;width:100vw;background:linear-gradient(180deg,#0b0f14,#0f172a);flex-direction:column;padding:calc(72px + env(safe-area-inset-top)) 22px 32px;transform:translateX(110%);transition:transform .28s ease;box-shadow:none;z-index:8001}
                .gn-nav.open{transform:translateX(0)}
                .gn-list{flex-direction:column;gap:12px}
                .gn-list a{width:100%;text-align:left;padding:14px 16px;font-size:1.15rem;border-radius:14px;background:rgba(15,23,42,0.4)}
                .gn-list a.active{background:linear-gradient(90deg,#22d3ee,#0ea5a4);color:#0b0f14}
                .gn-actions{margin-top:auto;flex-direction:column;gap:12px;width:100%}
                .gn-search input{width:100%}
                .gn-announcement{padding:0 12px 12px}
            }

            @media (max-width:480px){
                .gn-title{display:none}
                .gn-logo svg{width:30px;height:30px}
                .gn-announcement .gn-ann-bar{padding:10px 12px;font-size:0.9rem}
            }
        `;
        const s = document.createElement('style');
        s.id = 'global-nav-styles';
        s.appendChild(document.createTextNode(css));
        document.head.appendChild(s);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { injectStyles(); createNav(); });
    } else {
        injectStyles(); createNav();
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
                const { data } = await sb.from('site_settings').select('key,value').in('key', ['physics_mode','maintenance_mode','intro_loop','jumpscare']);
                const map = new Map((data || []).map((row) => [row.key, row.value]));
                applyPhysics(Boolean(map.get('physics_mode')?.enabled));
                if (map.get('maintenance_mode')?.enabled) {
                    ensureMaintenance();
                } else {
                    clearMaintenance();
                }
                setIntroLoop(Boolean(map.get('intro_loop')?.enabled));
                const jumpscare = map.get('jumpscare');
                if (jumpscare?.nonce) {
                    const nonce = Number(jumpscare?.nonce || 0);
                    if (nonce > lastJumpscareNonce) {
                        lastJumpscareNonce = nonce;
                        sessionStorage.setItem('ms_jumpscare_nonce', String(nonce));
                    }
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
                    if (key === 'jumpscare') {
                        if (payload.new?.value?.enabled) {
                            triggerJumpscare(Number(payload.new?.value?.nonce || 0));
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
