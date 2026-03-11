/**
 * Random sound effects across the site.
 * Plays a random effect on button/link clicks and other interactions.
 * Uses sounds/*.mp3 if present, otherwise falls back to Web Audio generated tones.
 */
(function () {
    var base = (typeof window !== 'undefined' && window.location.pathname) ? window.location.pathname.replace(/\/[^/]*$/, '/') || '/' : '/';
    if (window.location.protocol === 'file:') base = '';

    var EFFECTS = [
        'click', 'pop', 'tap', 'hover', 'blip', 'chime', 'whoosh', 'success', 'pluck', 'ding'
    ];

    var enabled = (typeof window !== 'undefined' && window.__soundEffectsEnabled === false) ? false : true;
    var hoverThrottle = 0;
    var scrollThrottle = 0;
    var keyThrottle = 0;

    function getSoundPath(name) {
        return base + 'sounds/' + name + '.mp3';
    }

    function playGenerated(type) {
        try {
            var C = window.AudioContext || window.webkitAudioContext;
            if (!C) return;
            var ctx = new C();
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            var now = ctx.currentTime;
            var freq = type === 'click' ? 1200 : type === 'pop' ? 900 : type === 'hover' ? 1800 : 700;
            o.frequency.setValueAtTime(freq, now);
            o.frequency.exponentialRampToValueAtTime(150, now + 0.12);
            o.type = 'square';
            g.gain.setValueAtTime(0.4, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            o.start(now);
            o.stop(now + 0.25);
            if (Math.random() < 0.4) {
                var o2 = ctx.createOscillator();
                var g2 = ctx.createGain();
                o2.connect(g2);
                g2.connect(ctx.destination);
                o2.frequency.setValueAtTime(freq * 1.5, now + 0.05);
                o2.type = 'sawtooth';
                g2.gain.setValueAtTime(0.15, now + 0.05);
                g2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                o2.start(now + 0.05);
                o2.stop(now + 0.2);
            }
        } catch (e) {}
    }

    function playRandom(category) {
        if (!enabled) return;
        category = category || 'click';
        var names = EFFECTS.filter(function (n) {
            return n === category || (category === 'click' && (n === 'click' || n === 'pop' || n === 'tap' || n === 'blip'));
        });
        if (names.length === 0) names = ['click', 'pop', 'tap'];
        var name = names[Math.floor(Math.random() * names.length)];
        var path = getSoundPath(name);
        var vol = 0.75;
        var a = new Audio(path);
        a.volume = vol;
        a.onerror = function () { playGenerated(name); };
        a.play().catch(function () { playGenerated(name); });
        if (category === 'click' && Math.random() < 0.5) {
            setTimeout(function () {
                var name2 = names[Math.floor(Math.random() * names.length)];
                var a2 = new Audio(getSoundPath(name2));
                a2.volume = 0.5;
                a2.onerror = function () { playGenerated(name2); };
                a2.play().catch(function () { playGenerated(name2); });
            }, 80 + Math.random() * 120);
        }
    }

    function bind() {
        if (document.body.dataset.sfxBound === '1') return;
        document.body.dataset.sfxBound = '1';

        document.body.addEventListener('click', function (e) {
            var t = e.target.closest('a, button, [role="button"], .btn, input[type="submit"], input[type="button"], .card, .stat-card, .review-card, .shot');
            if (!t || t.closest('.custom-audio-play') || t.closest('.ms-announcement-btn')) return;
            playRandom('click');
        }, true);

        document.body.addEventListener('mouseenter', function (e) {
            var t = e.target.closest('a, button, .gn-list a, .btn, .card, .stat-card, .review-card, .shot, .music-track-btn, .list-row');
            if (!t || e.target !== t) return;
            var now = Date.now();
            if (now - hoverThrottle < 120) return;
            hoverThrottle = now;
            playRandom('hover');
        }, { capture: true, passive: true });

        window.addEventListener('scroll', function () {
            var now = Date.now();
            if (now - scrollThrottle < 400) return;
            scrollThrottle = now;
            playRandom('blip');
        }, { passive: true });

        document.body.addEventListener('keydown', function (e) {
            if (e.key === 'Tab' || e.key === 'Shift') return;
            var now = Date.now();
            if (now - keyThrottle < 100) return;
            keyThrottle = now;
            playRandom('tap');
        }, true);

        document.body.addEventListener('focusin', function (e) {
            if (e.target.closest('input, textarea, select')) playRandom('ding');
        }, true);
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bind);
        } else {
            bind();
        }
    }

    window.playSoundEffect = function (name) {
        if (!enabled) return;
        var path = getSoundPath(name);
        var a = new Audio(path);
        a.volume = 0.75;
        a.onerror = function () { playGenerated(name); };
        a.play().catch(function () { playGenerated(name); });
    };

    window.playRandomSound = playRandom;
    window.soundEffectsEnabled = function (on) {
        if (on !== undefined) {
            enabled = !!on;
            if (typeof window !== 'undefined') window.__soundEffectsEnabled = enabled;
        }
        return enabled;
    };

    init();
})();
