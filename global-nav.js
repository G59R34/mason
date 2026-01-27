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
                        <li><a href="why.html">Why Mason</a></li>
                        <li><a href="reviews.html">Reviews</a></li>
                        <li><a href="pricing.html">Pricing</a></li>
                        <li><a href="account.html">Account</a></li>
                    </ul>
                    <div class="gn-actions">
                        
                       
                    </div>
                </nav>
            </div>
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
        toggle.addEventListener('click', () => {
            const opened = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!opened));
            menu.classList.toggle('open');
            document.documentElement.style.overflow = !opened ? 'hidden' : '';
        });

        // Close when clicking outside on small screens
        document.addEventListener('click', (e) => {
            if (!header.contains(e.target) && menu.classList.contains('open')) {
                toggle.setAttribute('aria-expanded', 'false');
                menu.classList.remove('open');
                document.documentElement.style.overflow = '';
            }
        });

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('open')) {
                toggle.setAttribute('aria-expanded', 'false');
                menu.classList.remove('open');
                document.documentElement.style.overflow = '';
                toggle.focus();
            }
        });
    }

    function injectStyles() {
        if (document.getElementById('global-nav-styles')) return;
        const css = `
            .global-header{font-family:Inter,system-ui,Segoe UI,Arial,sans-serif}
            .gn-wrapper{max-width:1100px;margin:0 auto;padding:10px 18px;display:flex;align-items:center;gap:18px}
            .gn-logo{display:inline-flex;align-items:center;gap:10px;color:#0f172a;text-decoration:none;font-weight:700}
            .gn-logo svg{display:block}
            .gn-title{font-size:1.15rem}
            .gn-toggle{display:none;background:none;border:0;padding:8px;border-radius:8px}
            .gn-toggle .hamburger{width:22px;height:2px;background:currentColor;display:block;position:relative}
            .gn-toggle .hamburger:before,.gn-toggle .hamburger:after{content:"";position:absolute;left:0;width:100%;height:2px;background:currentColor}
            .gn-toggle .hamburger:before{top:-6px}.gn-toggle .hamburger:after{top:6px}
            .gn-nav{display:flex;align-items:center;justify-content:center;gap:16px;flex:1;margin:0 auto}
            .gn-list{display:flex;gap:14px;list-style:none;padding:0;margin:0}
            .gn-list a{color:#0f172a;text-decoration:none;padding:8px 10px;border-radius:8px;transition:all .18s}
            .gn-list a:hover{background:rgba(15,23,42,0.06);transform:translateY(-2px)}
            .gn-list a.active{background:linear-gradient(90deg,#7c3aed,#06b6d4);color:white}
            .gn-actions{display:flex;gap:10px;align-items:center}
            .gn-search{display:flex;align-items:center;gap:8px;background:#f8fafc;padding:6px;border-radius:999px}
            .gn-search input{border:0;background:transparent;outline:none;padding:6px 8px;width:140px}
            .gn-search button{background:transparent;border:0;padding:0;font-size:1rem}
            .gn-cta{display:inline-block;background:#0ea5a4;color:white;padding:8px 12px;border-radius:8px;text-decoration:none}
            .gn-announcement{max-width:1100px;margin:0 auto;padding:0 18px 10px}
            .gn-announcement .gn-ann-bar{display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(90deg,#0f766e,#14b8a6);color:#fff;border-radius:16px;padding:12px 16px;font-weight:600;letter-spacing:0.01em;box-shadow:0 12px 24px rgba(15,23,42,0.14);border:1px solid rgba(255,255,255,0.35);text-align:center}
            .gn-announcement .gn-ann-bar .gn-ann-pill{background:rgba(255,255,255,0.18);padding:4px 10px;border-radius:999px;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em}
            .gn-announcement .gn-ann-bar .gn-ann-text{line-height:1.35}

            /* Responsive */
            @media (max-width:850px){
                .gn-toggle{display:inline-flex;margin-left:auto}
                .gn-nav{position:fixed;inset:0 auto 0 0;right:0;top:0;height:100vh;width:320px;background:linear-gradient(180deg,white,#f8fafc);flex-direction:column;padding:60px 18px;transform:translateX(110%);transition:transform .28s ease;box-shadow:-8px 0 30px rgba(2,6,23,0.08)}
                .gn-nav.open{transform:translateX(0)}
                .gn-list{flex-direction:column;gap:8px}
                .gn-actions{margin-top:auto;flex-direction:column;gap:12px;width:100%}
                .gn-search input{width:100%}
                .gn-announcement{padding:0 12px 12px}
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
        document.addEventListener('DOMContentLoaded', loadAnnouncementScript);
    } else {
        loadAnnouncementScript();
    }

})();
