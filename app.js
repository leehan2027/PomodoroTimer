// ===== Pomodoro Timer Application =====

(function() {
    'use strict';

    // ===== State =====
    const state = {
        mode: 'work', // work, shortBreak, longBreak
        isRunning: false,
        timeRemaining: 25 * 60, // seconds
        totalTime: 25 * 60,
        sessionsCompleted: 0,
        intervalId: null,
        settings: {
            work: 25,
            shortBreak: 5,
            longBreak: 15,
            longBreakInterval: 4
        },
        emojiInterval: null,
        lastDigit: '25:00'
    };

    // ===== DOM Elements =====
    const elements = {
        timerDisplay: document.getElementById('timer-display'),
        timerLabel: document.getElementById('timer-label'),
        timerProgress: document.querySelector('.timer-ring-progress'),
        timerRingContainer: document.querySelector('.timer-ring-container'),
        btnStart: document.getElementById('btn-start'),
        btnPause: document.getElementById('btn-pause'),
        btnReset: document.getElementById('btn-reset'),
        btnSkip: document.getElementById('btn-skip'),
        sessionCount: document.getElementById('session-count'),
        sessionDots: document.getElementById('session-dots'),
        modeBtns: document.querySelectorAll('.mode-btn'),
        settingsBtn: document.getElementById('settings-btn'),
        settingsPanel: document.getElementById('settings-panel'),
        settingsClose: document.getElementById('settings-close'),
        settingBtns: document.querySelectorAll('.setting-btn'),
        tomatoCharacter: document.getElementById('tomato-character'),
        particlesContainer: document.getElementById('particles-container'),
        celebrationOverlay: document.getElementById('celebration-overlay'),
        celebrationTitle: document.getElementById('celebration-title'),
        celebrationMessage: document.getElementById('celebration-message'),
        celebrationBtn: document.getElementById('celebration-btn'),
        celebrationHearts: document.getElementById('celebration-hearts'),
        progressBar: document.getElementById('progress-bar'),
        floatingEmojiContainer: document.getElementById('floating-emoji-container')
    };

    // ===== Constants =====
    const CIRCUMFERENCE = 2 * Math.PI * 140; // ~879.6

    // ===== Audio Context (Web Audio API for sounds) =====
    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playSound(type) {
        try {
            const ctx = getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            if (type === 'complete') {
                oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
                oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.6);
            } else if (type === 'click') {
                oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.1);
            } else if (type === 'tick') {
                oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
                gainNode.gain.setValueAtTime(0.02, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.05);
            }
        } catch (e) {
            // Audio not available
        }
    }

    // ===== Initialize =====
    function init() {
        loadSettings();
        updateDisplay();
        updateProgress();
        createParticles();
        updateSessionDots();
        bindEvents();
        updateTomatoState();
        updateBackgroundMode();
        startFloatingEmojis();
        setupButtonRipples();
    }

    // ===== Event Binding =====
    function bindEvents() {
        elements.btnStart.addEventListener('click', startTimer);
        elements.btnPause.addEventListener('click', pauseTimer);
        elements.btnReset.addEventListener('click', resetTimer);
        elements.btnSkip.addEventListener('click', skipSession);

        elements.modeBtns.forEach(btn => {
            btn.addEventListener('click', () => switchMode(btn.dataset.mode));
        });

        elements.settingsBtn.addEventListener('click', toggleSettings);
        elements.settingsClose.addEventListener('click', toggleSettings);

        elements.settingBtns.forEach(btn => {
            btn.addEventListener('click', () => adjustSetting(btn.dataset.target, btn.dataset.action));
        });

        elements.celebrationBtn.addEventListener('click', closeCelebration);

        // Tomato click interaction
        elements.tomatoCharacter.addEventListener('click', onTomatoClick);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                state.isRunning ? pauseTimer() : startTimer();
            } else if (e.code === 'KeyR') {
                resetTimer();
            } else if (e.code === 'KeyS') {
                skipSession();
            }
        });
    }

    // ===== Timer Controls =====
    function startTimer() {
        if (state.isRunning) return;
        state.isRunning = true;
        playSound('click');

        elements.btnStart.style.display = 'none';
        elements.btnPause.style.display = 'flex';

        updateTomatoState();
        updateLabel();
        updateTimerRingActive(true);

        state.intervalId = setInterval(() => {
            state.timeRemaining--;
            updateDisplay();
            updateProgress();
            updateProgressBar();

            // Tick sound every 5 seconds for last minute
            if (state.timeRemaining <= 60 && state.timeRemaining > 0 && state.timeRemaining % 5 === 0) {
                playSound('tick');
            }

            // Digit flip animation
            const currentTime = formatTime(state.timeRemaining);
            if (currentTime !== state.lastDigit) {
                elements.timerDisplay.classList.add('flip');
                setTimeout(() => elements.timerDisplay.classList.remove('flip'), 300);
                state.lastDigit = currentTime;
            }

            if (state.timeRemaining <= 0) {
                completeSession();
            }
        }, 1000);
    }

    function pauseTimer() {
        if (!state.isRunning) return;
        state.isRunning = false;
        clearInterval(state.intervalId);

        elements.btnStart.style.display = 'flex';
        elements.btnPause.style.display = 'none';

        updateTomatoState();
        updateLabel();
        updateTimerRingActive(false);
    }

    function resetTimer() {
        pauseTimer();
        state.timeRemaining = state.totalTime;
        state.lastDigit = formatTime(state.timeRemaining);
        updateDisplay();
        updateProgress();
        updateProgressBar();
        updateLabel();
        playSound('click');
    }

    function skipSession() {
        playSound('click');
        completeSession();
    }

    function completeSession() {
        clearInterval(state.intervalId);
        state.isRunning = false;

        elements.btnStart.style.display = 'flex';
        elements.btnPause.style.display = 'none';

        playSound('complete');
        updateTimerRingActive(false);

        // Screen shake effect
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 500);

        if (state.mode === 'work') {
            state.sessionsCompleted++;
            updateSessionCount();
            updateSessionDots();
            showCelebration();
            createConfetti();
            createHeartBurst();
        }

        // Auto-switch to next mode
        setTimeout(() => {
            if (state.mode === 'work') {
                if (state.sessionsCompleted % state.settings.longBreakInterval === 0) {
                    switchMode('longBreak');
                } else {
                    switchMode('shortBreak');
                }
            } else {
                switchMode('work');
            }
        }, state.mode === 'work' ? 2000 : 500);
    }

    // ===== Mode Switching =====
    function switchMode(mode) {
        if (state.isRunning) {
            pauseTimer();
        }

        state.mode = mode;
        const time = state.settings[mode] * 60;
        state.totalTime = time;
        state.timeRemaining = time;
        state.lastDigit = formatTime(state.timeRemaining);

        // Update active button
        elements.modeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update progress ring color
        elements.timerProgress.classList.remove('short-break', 'long-break');
        if (mode === 'shortBreak') {
            elements.timerProgress.classList.add('short-break');
        } else if (mode === 'longBreak') {
            elements.timerProgress.classList.add('long-break');
        }

        updateDisplay();
        updateProgress();
        updateProgressBar();
        updateLabel();
        updateTomatoState();
        updateBackgroundMode();
        playSound('click');
    }

    // ===== Display Updates =====
    function updateDisplay() {
        elements.timerDisplay.textContent = formatTime(state.timeRemaining);

        // Update page title
        document.title = elements.timerDisplay.textContent + ' - 🍅 番茄时钟';
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    function updateProgress() {
        const progress = state.timeRemaining / state.totalTime;
        const offset = CIRCUMFERENCE * (1 - progress);
        elements.timerProgress.style.strokeDashoffset = offset;
    }

    function updateLabel() {
        const labels = {
            work: { running: '🔥 专注中...', paused: '⏸ 已暂停', idle: '准备开始' },
            shortBreak: { running: '☕ 休息中...', paused: '⏸ 已暂停', idle: '短休息' },
            longBreak: { running: '🌴 放松中...', paused: '⏸ 已暂停', idle: '长休息' }
        };
        const status = state.isRunning ? 'running' : (state.timeRemaining < state.totalTime ? 'paused' : 'idle');
        elements.timerLabel.textContent = labels[state.mode][status];
    }

    function updateSessionCount() {
        elements.sessionCount.textContent = state.sessionsCompleted;
    }

    function updateSessionDots() {
        const container = elements.sessionDots;
        container.innerHTML = '';
        const total = state.settings.longBreakInterval;
        const completed = state.sessionsCompleted % total;

        for (let i = 0; i < total; i++) {
            const dot = document.createElement('div');
            dot.className = 'session-dot' + (i < completed ? ' completed' : '');
            container.appendChild(dot);
        }
    }

    // ===== Tomato Character =====
    function updateTomatoState() {
        const tomato = elements.tomatoCharacter;
        tomato.classList.remove('running', 'celebrating');
        if (state.isRunning) {
            tomato.classList.add('running');
        }
    }

    // ===== Settings =====
    function toggleSettings() {
        const panel = elements.settingsPanel;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    function adjustSetting(target, action) {
        const mins = { work: [1, 60], shortBreak: [1, 30], longBreak: [1, 60], longBreakInterval: [1, 10] };
        const [min, max] = mins[target];
        const current = state.settings[target];
        const delta = action === 'increase' ? 1 : -1;
        const newVal = Math.max(min, Math.min(max, current + delta));

        state.settings[target] = newVal;
        document.getElementById('setting-' + target).textContent = newVal;

        // Update mode button time display
        if (target !== 'longBreakInterval') {
            const modeBtn = document.querySelector('.mode-btn[data-mode="' + target + '"]');
            if (modeBtn) {
                modeBtn.querySelector('.mode-time').textContent = newVal + '分钟';
                modeBtn.dataset.time = newVal;
            }
        }

        // If adjusting current mode and timer is idle, update time
        if (target === state.mode && !state.isRunning && state.timeRemaining === state.totalTime) {
            state.totalTime = newVal * 60;
            state.timeRemaining = newVal * 60;
            updateDisplay();
            updateProgress();
        }

        saveSettings();
        playSound('click');
    }

    function saveSettings() {
        try {
            localStorage.setItem('pomodoro-settings', JSON.stringify(state.settings));
        } catch (e) {}
    }

    function loadSettings() {
        try {
            const saved = localStorage.getItem('pomodoro-settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(state.settings, parsed);
                state.totalTime = state.settings.work * 60;
                state.timeRemaining = state.totalTime;

                // Update setting display values
                Object.keys(state.settings).forEach(key => {
                    const el = document.getElementById('setting-' + key);
                    if (el) el.textContent = state.settings[key];
                });

                // Update mode button times
                ['work', 'shortBreak', 'longBreak'].forEach(mode => {
                    const btn = document.querySelector('.mode-btn[data-mode="' + mode + '"]');
                    if (btn) {
                        btn.querySelector('.mode-time').textContent = state.settings[mode] + '分钟';
                        btn.dataset.time = state.settings[mode];
                    }
                });
            }
        } catch (e) {}
    }

    // ===== Celebration =====
    function showCelebration() {
        const messages = [
            { title: '太棒了！🎉', msg: '你完成了一个番茄钟！继续保持！' },
            { title: '干得漂亮！💪', msg: '专注的力量，势不可挡！' },
            { title: '又完成一个！🌟', msg: '你的努力终将开花结果！' },
            { title: '真厉害！🏆', msg: '每一步都在靠近目标！' },
            { title: '完美！✨', msg: '休息一下吧，你值得！' }
        ];
        const random = messages[Math.floor(Math.random() * messages.length)];

        elements.celebrationTitle.textContent = random.title;
        elements.celebrationMessage.textContent = random.msg;
        elements.celebrationOverlay.style.display = 'flex';

        elements.tomatoCharacter.classList.add('celebrating');
    }

    function closeCelebration() {
        elements.celebrationOverlay.style.display = 'none';
        elements.tomatoCharacter.classList.remove('celebrating');
    }

    // ===== Particle Effects =====
    function createParticles() {
        const colors = ['#e74c3c', '#ff6b6b', '#f39c12', '#2ecc71', '#9b59b6', '#3498db'];
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 6 + 3;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
            particle.style.animationDelay = (Math.random() * 10) + 's';
            elements.particlesContainer.appendChild(particle);
        }
    }

    function createConfetti() {
        const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#ff9800'];
        const shapes = ['circle', 'square'];

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            const size = Math.random() * 10 + 5;
            confetti.style.width = size + 'px';
            confetti.style.height = size + 'px';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = shapes[Math.floor(Math.random() * shapes.length)] === 'circle' ? '50%' : '2px';
            confetti.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
            confetti.style.animationDelay = (Math.random() * 0.5) + 's';
            document.body.appendChild(confetti);

            // Remove after animation
            setTimeout(() => confetti.remove(), 4000);
        }
    }

    // ===== New Animation Functions =====

    function updateTimerRingActive(active) {
        if (active) {
            elements.timerRingContainer.classList.add('active');
        } else {
            elements.timerRingContainer.classList.remove('active');
        }
    }

    function updateBackgroundMode() {
        document.body.classList.remove('mode-work', 'mode-short-break', 'mode-long-break');
        document.body.classList.add('mode-' + state.mode);
    }

    function updateProgressBar() {
        const progress = ((state.totalTime - state.timeRemaining) / state.totalTime) * 100;
        elements.progressBar.style.width = progress + '%';
    }

    function onTomatoClick() {
        elements.tomatoCharacter.classList.add('click-wobble');
        setTimeout(() => elements.tomatoCharacter.classList.remove('click-wobble'), 500);
        playSound('click');
    }

    function createHeartBurst() {
        const hearts = ['❤️', '🧡', '💛', '💚', '💙', '💜', '💖', '💝'];
        const container = elements.celebrationHearts;
        container.innerHTML = '';

        for (let i = 0; i < 12; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart-particle';
            heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            heart.style.setProperty('--tx', (Math.random() * 100 - 50) + 'px');
            heart.style.setProperty('--ty', (Math.random() * -100 - 20) + 'px');
            heart.style.animationDelay = (Math.random() * 0.3) + 's';
            container.appendChild(heart);
        }

        setTimeout(() => container.innerHTML = '', 2000);
    }

    function startFloatingEmojis() {
        const emojis = ['🍅', '⏱️', '☕', '💪', '🎯', '🔥', '✨', '🌟', '💫', '🎉'];

        state.emojiInterval = setInterval(() => {
            if (!state.isRunning) return;

            if (Math.random() < 0.3) { // 30% chance every 5 seconds
                const emoji = document.createElement('div');
                emoji.className = 'floating-emoji';
                emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                emoji.style.left = Math.random() * 80 + 10 + '%';
                emoji.style.bottom = '-20px';
                elements.floatingEmojiContainer.appendChild(emoji);

                setTimeout(() => emoji.remove(), 3000);
            }
        }, 5000);
    }

    function setupButtonRipples() {
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
                ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
                this.appendChild(ripple);

                setTimeout(() => ripple.remove(), 600);
            });
        });
    }

    // ===== Start =====
    init();
})();
