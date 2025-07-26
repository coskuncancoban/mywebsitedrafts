document.addEventListener('DOMContentLoaded', () => {
    // DOM Elementleri
    const timeDisplay = document.getElementById('time-display');
    const modeDisplay = document.getElementById('mode-display');
    const startPauseBtn = document.getElementById('start-pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const progressDots = document.getElementById('progress-dots');
    const resetCycleBtn = document.getElementById('reset-cycle-btn');
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const pomodoroTimeInput = document.getElementById('pomodoro-time');
    const shortBreakTimeInput = document.getElementById('short-break-time');
    const longBreakTimeInput = document.getElementById('long-break-time');
    const longBreakIntervalInput = document.getElementById('long-break-interval');
    const autoStartToggle = document.getElementById('auto-start-toggle');
    const fullscreenOverlay = document.getElementById('fullscreen-overlay');
    const overlayMessage = document.getElementById('overlay-message');
    const notificationSound = document.getElementById('notification-sound');
    const colorPaletteContainer = document.getElementById('color-palette-container'); // Yeni
    const root = document.documentElement; // Yeni

    // Durum ve Ayarlar
    let state = {
        timerId: null,
        isRunning: false,
        mode: 'pomodoro',
        pomodorosCompleted: 0,
        timeLeft: 25 * 60,
    };

    let settings = {
        pomodoroTime: 25,
        shortBreakTime: 5,
        longBreakTime: 15,
        longBreakInterval: 4,
        autoStart: false
    };

    let tasks = [];

// YENİ: Renk Seçenekleri
    const colorOptions = [
        { name: 'Dingin Yeşil', color: '#4E9C81', hover: '#62b99c' },
        { name: 'Antik Altın', color: '#e8a87c', hover: '#f0b98d' },
        { name: 'Sakin Mavi', color: '#5a9bbf', hover: '#73b3d4' },
        { name: 'Odak Kırmızısı', color: '#c97571', hover: '#d98f8c' },
        { name: 'Lavanta Moru', color: '#8e7cc3', hover: '#a494d4' },
    ];

    // --- RENK PALETİ FONKSİYONLARI ---
    
    const changeAccentColor = (color, hoverColor) => {
        root.style.setProperty('--accent-color', color);
        root.style.setProperty('--accent-hover', hoverColor);
        localStorage.setItem('pomodoroAccentColor', color);
        localStorage.setItem('pomodoroAccentHoverColor', hoverColor);
    };

    const createColorPalette = () => {
        colorOptions.forEach(option => {
            const swatch = document.createElement('div');
            swatch.classList.add('color-swatch');
            swatch.style.backgroundColor = option.color;
            swatch.title = option.name;
            swatch.addEventListener('click', () => {
                changeAccentColor(option.color, option.hover);
                // Aktif olan rengi işaretle
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
            });
            colorPaletteContainer.appendChild(swatch);
        });
    };
    
    const loadAccentColor = () => {
        const savedColor = localStorage.getItem('pomodoroAccentColor');
        const savedHoverColor = localStorage.getItem('pomodoroAccentHoverColor');
        if (savedColor && savedHoverColor) {
            changeAccentColor(savedColor, savedHoverColor);
        }
        // Aktif rengi işaretle
        const currentActiveColor = root.style.getPropertyValue('--accent-color').trim();
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            if (swatch.style.backgroundColor === currentActiveColor) {
                swatch.classList.add('active');
            }
        });
    };

    // --- OTURUM YÖNETİMİ FONKSİYONLARI ---

    const saveState = () => {
        const stateToSave = {
            mode: state.mode,
            pomodorosCompleted: state.pomodorosCompleted,
            timeLeft: state.timeLeft,
        };
        localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
    };

    const loadState = () => {
        const savedState = localStorage.getItem('pomodoroState');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            state = { ...state, ...parsedState };
        }
    };

    window.addEventListener('beforeunload', () => {
        if (state.isRunning) {
            saveState();
        }
    });

    // --- TEMEL FONKSİYONLAR ---

    const updateTimeDisplay = () => {
        const minutes = Math.floor(state.timeLeft / 60).toString().padStart(2, '0');
        const seconds = (state.timeLeft % 60).toString().padStart(2, '0');
        const timeString = `${minutes}:${seconds}`;
        timeDisplay.textContent = timeString;
        document.title = `${timeString} - ${modeDisplay.textContent}`;
    };

    const switchMode = (newMode) => {
        state.mode = newMode;
        state.isRunning = false;
        clearInterval(state.timerId);
        startPauseBtn.textContent = 'Başlat';
        startPauseBtn.dataset.state = 'paused';

        switch (newMode) {
            case 'pomodoro':
                state.timeLeft = settings.pomodoroTime * 60;
                modeDisplay.textContent = 'Çalışma Zamanı';
                break;
            case 'shortBreak':
                state.timeLeft = settings.shortBreakTime * 60;
                modeDisplay.textContent = 'Kısa Mola';
                break;
            case 'longBreak':
                state.timeLeft = settings.longBreakTime * 60;
                modeDisplay.textContent = 'Uzun Mola';
                break;
        }

        saveState();
        updateTimeDisplay();
        updateProgressDots();
    };

    const startTimer = () => {
        if (state.isRunning) return;
        state.isRunning = true;
        startPauseBtn.textContent = 'Durdur';
        startPauseBtn.dataset.state = 'running';

        state.timerId = setInterval(() => {
            state.timeLeft--;
            updateTimeDisplay();

            if (state.timeLeft <= 0) {
                clearInterval(state.timerId);
                notificationSound.play().catch(e => console.error("Ses çalınamadı:", e));
                
                let nextMode;
                if (state.mode === 'pomodoro') {
                    state.pomodorosCompleted++;
                    if (state.pomodorosCompleted % settings.longBreakInterval === 0) {
                        showNotification('Uzun mola zamanı!');
                        nextMode = 'longBreak';
                    } else {
                        showNotification('Kısa bir mola verin!');
                        nextMode = 'shortBreak';
                    }
                } else {
                    showNotification('Çalışmaya geri dönme zamanı!');
                    nextMode = 'pomodoro';
                }
                
                switchMode(nextMode);
                if (settings.autoStart) {
                    startTimer();
                }
            }
        }, 1000);
    };

    const pauseTimer = () => {
        state.isRunning = false;
        clearInterval(state.timerId);
        startPauseBtn.textContent = 'Başlat';
        startPauseBtn.dataset.state = 'paused';
        saveState();
    };

    const resetTimer = () => {
        pauseTimer();
        switch (state.mode) {
            case 'pomodoro': state.timeLeft = settings.pomodoroTime * 60; break;
            case 'shortBreak': state.timeLeft = settings.shortBreakTime * 60; break;
            case 'longBreak': state.timeLeft = settings.longBreakTime * 60; break;
        }
        saveState();
        updateTimeDisplay();
    };

    const updateProgressDots = () => {
        progressDots.innerHTML = '';
        for (let i = 0; i < settings.longBreakInterval; i++) {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (i < state.pomodorosCompleted) {
                dot.classList.add('completed');
            }
            dot.dataset.index = i;
            dot.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                pauseTimer();
                state.pomodorosCompleted = index;
                switchMode('pomodoro');
            });
            progressDots.appendChild(dot);
        }
    };
    
    const resetCycle = () => {
        pauseTimer();
        state.pomodorosCompleted = 0;
        switchMode('pomodoro');
    };

    const showNotification = (message) => {
        overlayMessage.textContent = message;
        fullscreenOverlay.classList.add('visible');
        setTimeout(() => {
            fullscreenOverlay.classList.remove('visible');
        }, 3000);
    };

    const saveSettings = () => {
        settings.pomodoroTime = parseInt(pomodoroTimeInput.value) || 25;
        settings.shortBreakTime = parseInt(shortBreakTimeInput.value) || 5;
        settings.longBreakTime = parseInt(longBreakTimeInput.value) || 15;
        settings.longBreakInterval = parseInt(longBreakIntervalInput.value) || 4;
        settings.autoStart = autoStartToggle.checked;
        
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
        settingsModal.classList.remove('visible');
        
        if (!state.isRunning) {
            state.pomodorosCompleted = 0; // Ayarlar değişince döngüyü sıfırla
            switchMode('pomodoro');
            updateProgressDots();
        }
    };

    const loadSettings = () => {
        const savedSettings = localStorage.getItem('pomodoroSettings');
        if (savedSettings) {
            settings = JSON.parse(savedSettings);
        }
        pomodoroTimeInput.value = settings.pomodoroTime;
        shortBreakTimeInput.value = settings.shortBreakTime;
        longBreakTimeInput.value = settings.longBreakTime;
        longBreakIntervalInput.value = settings.longBreakInterval;
        autoStartToggle.checked = settings.autoStart;
    };

    const renderTasks = () => {
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.textContent = task.text;
            if (task.completed) { li.classList.add('completed'); }
            li.dataset.index = index;
            li.addEventListener('click', () => toggleTask(index));
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteTask(index); });
            li.appendChild(deleteBtn);
            taskList.appendChild(li);
        });
    };

    const addTask = () => {
        const taskText = taskInput.value.trim();
        if (taskText) {
            tasks.push({ text: taskText, completed: false });
            taskInput.value = '';
            saveTasks();
            renderTasks();
        }
    };
    
    const toggleTask = (index) => {
        tasks[index].completed = !tasks[index].completed;
        saveTasks();
        renderTasks();
    };
    
    const deleteTask = (index) => {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    };

    const saveTasks = () => localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));

    const loadTasks = () => {
        const savedTasks = localStorage.getItem('pomodoroTasks');
        if (savedTasks) { tasks = JSON.parse(savedTasks); }
        renderTasks();
    };

    const initializeApp = () => {
        createColorPalette(); // Renk paletini oluştur
        loadSettings();
        loadTasks();
        loadState();
        loadAccentColor(); // Kayıtlı rengi yükle
        
        modeDisplay.textContent = {
            pomodoro: 'Çalışma Zamanı',
            shortBreak: 'Kısa Mola',
            longBreak: 'Uzun Mola'
        }[state.mode] || 'Çalışma Zamanı';

        updateTimeDisplay();
        updateProgressDots();
    };
    
    // --- OLAY DİNLEYİCİLERİ ---
    startPauseBtn.addEventListener('click', () => { state.isRunning ? pauseTimer() : startTimer(); });
    resetBtn.addEventListener('click', resetTimer);
    resetCycleBtn.addEventListener('click', resetCycle);
    settingsBtn.addEventListener('click', () => settingsModal.classList.add('visible'));
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) { settingsModal.classList.remove('visible'); }});
    saveSettingsBtn.addEventListener('click', saveSettings);
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { addTask(); }});

    initializeApp();
});