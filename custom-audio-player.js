/**
 * Custom audio player UI — matches site V2 (Noir Luxe).
 * Finds all <audio class="custom-audio-player"> and wraps them in a custom control bar.
 */
(function () {
    function formatTime(seconds) {
        if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function buildCustomUI(audio) {
        if (audio.dataset.customAudioBuilt === '1') return;
        audio.dataset.customAudioBuilt = '1';
        audio.removeAttribute('controls');

        var wrap = document.createElement('div');
        wrap.className = 'custom-audio-ui';

        var playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'custom-audio-play';
        playBtn.setAttribute('aria-label', 'Play');
        var playIcon = '<svg class="custom-audio-icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
        var pauseIcon = '<svg class="custom-audio-icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        playBtn.innerHTML = playIcon + pauseIcon;

        var progressWrap = document.createElement('div');
        progressWrap.className = 'custom-audio-progress-wrap';
        progressWrap.setAttribute('role', 'slider');
        progressWrap.setAttribute('aria-label', 'Seek');
        progressWrap.setAttribute('tabindex', '0');
        var progressFill = document.createElement('div');
        progressFill.className = 'custom-audio-progress-fill';
        progressWrap.appendChild(progressFill);

        var timeWrap = document.createElement('div');
        timeWrap.className = 'custom-audio-time';
        var timeCurrent = document.createElement('span');
        timeCurrent.className = 'custom-audio-time-current';
        timeCurrent.textContent = '0:00';
        var timeSep = document.createElement('span');
        timeSep.className = 'custom-audio-time-sep';
        timeSep.textContent = ' / ';
        var timeDuration = document.createElement('span');
        timeDuration.className = 'custom-audio-time-duration';
        timeDuration.textContent = '0:00';
        timeWrap.appendChild(timeCurrent);
        timeWrap.appendChild(timeSep);
        timeWrap.appendChild(timeDuration);

        wrap.appendChild(playBtn);
        wrap.appendChild(progressWrap);
        wrap.appendChild(timeWrap);

        audio.parentNode.insertBefore(wrap, audio);
        wrap.appendChild(audio);
        audio.classList.add('custom-audio-native');

        function updatePlayIcon() {
            var playing = !audio.paused;
            playBtn.classList.toggle('is-playing', playing);
            playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        }

        function updateProgress() {
            var d = audio.duration;
            var c = audio.currentTime;
            if (!isFinite(d) || isNaN(d) || d <= 0) {
                progressFill.style.width = '0%';
                return;
            }
            progressFill.style.width = (100 * c / d) + '%';
        }

        function updateTime() {
            timeCurrent.textContent = formatTime(audio.currentTime);
            if (isFinite(audio.duration) && !isNaN(audio.duration)) {
                timeDuration.textContent = formatTime(audio.duration);
            }
        }

        playBtn.addEventListener('click', function () {
            if (audio.paused) {
                audio.play().catch(function () {});
            } else {
                audio.pause();
            }
        });

        progressWrap.addEventListener('click', function (e) {
            var rect = progressWrap.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var pct = Math.max(0, Math.min(1, x / rect.width));
            var d = audio.duration;
            if (isFinite(d) && !isNaN(d)) {
                audio.currentTime = pct * d;
            }
        });

        progressWrap.addEventListener('keydown', function (e) {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
            e.preventDefault();
            var d = audio.duration;
            if (!isFinite(d) || isNaN(d)) return;
            var step = e.key === 'Home' ? -audio.currentTime : e.key === 'End' ? d - audio.currentTime : (e.key === 'ArrowRight' ? 5 : -5);
            audio.currentTime = Math.max(0, Math.min(d, audio.currentTime + step));
        });

        audio.addEventListener('play', updatePlayIcon);
        audio.addEventListener('pause', updatePlayIcon);
        audio.addEventListener('ended', updatePlayIcon);
        audio.addEventListener('timeupdate', function () {
            updateProgress();
            updateTime();
        });
        audio.addEventListener('loadedmetadata', function () {
            updateProgress();
            updateTime();
        });
        audio.addEventListener('durationchange', updateTime);

        updatePlayIcon();
        updateProgress();
        updateTime();
    }

    function init() {
        document.querySelectorAll('audio.custom-audio-player').forEach(buildCustomUI);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.customAudioPlayerInit = init;
})();
