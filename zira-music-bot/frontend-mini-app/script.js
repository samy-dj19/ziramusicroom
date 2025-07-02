document.addEventListener('DOMContentLoaded', () => {
    // Optional Telegram WebApp SDK
    let tg = null;
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready();
    }

    // --- DOM Elements ---
    const playPauseBtn = document.getElementById('playPauseBtn');
    const skipFwdBtn = document.getElementById('skipFwdBtn');
    const loopBtn = document.getElementById('loopBtn');
    const favBtn = document.getElementById('favBtn');
    const audioPlayer = document.getElementById('audioPlayer');
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    const albumArt = document.getElementById('albumArt');
    const queueList = document.getElementById('queueList');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const audioSource = document.getElementById('audioSource');
    const addSongForm = document.getElementById('addSongForm');
    const songTitleInput = document.getElementById('songTitleInput');
    const songArtistInput = document.getElementById('songArtistInput');
    const songSrcInput = document.getElementById('songSrcInput');
    const historyList = document.getElementById('historyList');
    const themeToggle = document.getElementById('themeToggle');
    const shareRoomBtn = document.getElementById('shareRoomBtn');
    const albumArtLarge = document.getElementById('albumArtLarge');
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const totalDurationEl = document.getElementById('totalDuration');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const menuBtn = document.getElementById('menuBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const showFavBtn = document.getElementById('showFavBtn');
    const showHistoryBtn = document.getElementById('showHistoryBtn');
    const shareMenuBtn = document.getElementById('shareMenuBtn');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const toast = document.getElementById('toast');
    const prevTooltip = document.getElementById('prevTooltip');
    const playTooltip = document.getElementById('playTooltip');
    const favTooltip = document.getElementById('favTooltip');
    const nextTooltip = document.getElementById('nextTooltip');

    // --- State ---
    let isPlaying = false;
    let isLooping = false;
    let currentSongIndex = 0;
    let queue = [];
    let lastCurrentIndex = -1;
    
    // --- API Communication ---
    let backendBase = "https://zira-music-backend.onrender.com";

    async function tryBackend(url) {
        try {
            const res = await fetch(url + '/api/queue');
            if (res.ok) return url;
        } catch (e) {}
        return null;
    }

    (async function() {
        // Try localhost first, then 127.0.0.1
        let workingBase = await tryBackend("http://localhost:5000");
        if (!workingBase) workingBase = await tryBackend("http://127.0.0.1:5000");
        if (workingBase) backendBase = workingBase;
    })();
    
    async function fetchQueue() {
        try {
            const res = await fetch(backendBase + '/api/queue');
            if (!res.ok) throw new Error('Failed to fetch queue');
            return await res.json();
        } catch (err) {
            showToast('Error fetching queue: ' + err.message);
            return { queue: [], current: 0 };
        }
    }

    async function addSong(title, artist, src = "") {
        await fetch(backendBase + '/api/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, artist, src })
        });
        await updateUI();
        // Automatically play the latest song
        await playSongByIndex(queue.length - 1);
    }

    async function playSongByIndex(index) {
        await fetch(backendBase + '/api/play/' + index, { method: 'POST' });
        await updateUI();
    }

    async function nextSongAPI() {
        await fetch(backendBase + '/api/next', { method: 'POST' });
        await updateUI();
    }

    async function prevSongAPI() {
        await fetch(backendBase + '/api/prev', { method: 'POST' });
        await updateUI();
    }

    async function fetchHistory(userId) {
        const res = await fetch(backendBase + '/api/history');
        return res.json();
    }

    // --- UI Update Function ---
    async function pollQueue() {
        try {
            const res = await fetch(backendBase + '/api/queue');
            if (!res.ok) throw new Error('Failed to fetch queue');
            const data = await res.json();
            if (data.current !== lastCurrentIndex) {
                lastCurrentIndex = data.current;
                updatePlayerUI(data);
                audioPlayer.load();
                audioPlayer.play().catch(() => {
                    showToast('Click ▶️ Play to start playback.');
                });
            }
        } catch (err) {
            showToast('Error fetching queue: ' + err.message);
        }
    }

    function updatePlayerUI(data) {
        if (!data.queue || data.queue.length === 0) {
            songTitle.textContent = 'No song playing';
            songArtist.textContent = '';
            document.getElementById('songDuration')?.remove();
            document.getElementById('songRequestedBy')?.remove();
            audioSource.src = '';
            audioPlayer.load();
            albumArtLarge.src = 'assets/images/default_album_art.png';
            return;
        }
        const nowPlaying = data.queue[data.current] || data.queue[0];
        songTitle.textContent = nowPlaying.title;
        songArtist.textContent = nowPlaying.artist;
        // Add duration and requested_by if not present
        let durationEl = document.getElementById('songDuration');
        if (!durationEl) {
            durationEl = document.createElement('div');
            durationEl.id = 'songDuration';
            durationEl.style.color = '#b3b3e6';
            durationEl.style.fontSize = '0.95rem';
            songTitle.parentNode.appendChild(durationEl);
        }
        durationEl.textContent = nowPlaying.duration ? `Duration: ${nowPlaying.duration}` : '';
        let requestedByEl = document.getElementById('songRequestedBy');
        if (!requestedByEl) {
            requestedByEl = document.createElement('div');
            requestedByEl.id = 'songRequestedBy';
            requestedByEl.style.color = '#b3b3e6';
            requestedByEl.style.fontSize = '0.95rem';
            songTitle.parentNode.appendChild(requestedByEl);
        }
        requestedByEl.textContent = nowPlaying.requested_by ? `Requested by: ${nowPlaying.requested_by}` : '';
        albumArtLarge.src = nowPlaying.albumArt || 'assets/images/default_album_art.png';
        // Always use src if present
        let srcUrl = nowPlaying.src || (nowPlaying.video_id ? backendBase + '/api/stream/' + nowPlaying.video_id : '');
        audioPlayer.pause();
        audioSource.src = srcUrl;
        audioPlayer.load();
        audioPlayer.play().catch(() => {
            showToast('Click ▶️ Play to start playback.');
        });
    }

    function renderHistory(history) {
        historyList.classList.remove('fade-in');
        void historyList.offsetWidth;
        historyList.classList.add('fade-in');
        historyList.innerHTML = '';
        if (!history || history.length === 0) {
            historyList.innerHTML = '<li>No songs played yet</li>';
            return;
        }
        history.forEach(song => {
            const li = document.createElement('li');
            li.textContent = `${song.title} - ${song.artist}`;
            historyList.appendChild(li);
        });
    }

    // --- Event Handlers ---
    async function handlePlay() {
        if (!isPlaying) {
            // Fetch the current queue and song from the backend
            const data = await fetchQueue();
            updatePlayerUI(data);

            audioPlayer.play();
            showPauseIcon();
            isPlaying = true;
            tg?.HapticFeedback.impactOccurred('light');
        } else {
            audioPlayer.pause();
            showPlayIcon();
            isPlaying = false;
            tg?.HapticFeedback.impactOccurred('light');
        }
    }

    function handleSkip() {
        // This would send a request to your backend: fetch('/api/skip')
        console.log("Requesting to skip song...");
        songTitle.textContent = "Loading next song...";
        songArtist.textContent = "";
        // After the request, the backend would provide the next song's data
        // and you would call fetchQueue() again.
        tg?.HapticFeedback.notificationOccurred('success');
    }

    function handleLoop() {
        isLooping = !isLooping;
        audioPlayer.loop = isLooping;
        loopBtn.style.opacity = isLooping ? '1' : '0.5';
        tg?.HapticFeedback.impactOccurred('rigid');
    }
    
    function handleFav() {
        // This would send a request to your backend: fetch('/api/fav', { method: 'POST' })
        favBtn.textContent = '❤️';
        console.log("Added to favorites!");
        tg?.HapticFeedback.notificationOccurred('success');
    }

    function renderQueue(filteredQueue) {
        const list = filteredQueue || queue;
        queueList.classList.remove('fade-in');
        void queueList.offsetWidth;
        queueList.classList.add('fade-in');
        queueList.innerHTML = '';
        if (list.length === 0) {
            queueList.innerHTML = '<li>No songs in queue</li>';
            return;
        }
        list.forEach((song, idx) => {
            const li = document.createElement('li');
            li.textContent = `${song.title} - ${song.artist}`;
            // Add Play Now button
            const playNowBtn = document.createElement('button');
            playNowBtn.textContent = '▶️ Play Now';
            playNowBtn.className = 'play-now-btn';
            playNowBtn.onclick = () => playSongByIndex(idx);
            li.appendChild(playNowBtn);
            if (queue.indexOf(song) === currentSongIndex) {
                li.style.fontWeight = 'bold';
                li.style.color = '#5e60ce';
            }
            queueList.appendChild(li);
        });
    }

    function loadSong(index) {
        if (queue.length === 0) {
            songTitle.textContent = 'No song playing';
            songArtist.textContent = '';
            document.getElementById('songDuration')?.remove();
            document.getElementById('songRequestedBy')?.remove();
            audioSource.src = '';
            audioPlayer.load();
            albumArtLarge.src = 'assets/images/default_album_art.png';
            return;
        }
        const song = queue[index];
        songTitle.textContent = song.title;
        songArtist.textContent = song.artist;
        // Add duration and requested_by if not present
        let durationEl = document.getElementById('songDuration');
        if (!durationEl) {
            durationEl = document.createElement('div');
            durationEl.id = 'songDuration';
            durationEl.style.color = '#b3b3e6';
            durationEl.style.fontSize = '0.95rem';
            songTitle.parentNode.appendChild(durationEl);
        }
        durationEl.textContent = song.duration ? `Duration: ${song.duration}` : '';
        let requestedByEl = document.getElementById('songRequestedBy');
        if (!requestedByEl) {
            requestedByEl = document.createElement('div');
            requestedByEl.id = 'songRequestedBy';
            requestedByEl.style.color = '#b3b3e6';
            requestedByEl.style.fontSize = '0.95rem';
            songTitle.parentNode.appendChild(requestedByEl);
        }
        requestedByEl.textContent = song.requested_by ? `Requested by: ${song.requested_by}` : '';
        audioSource.src = song.src || (song.video_id ? backendBase + '/api/stream/' + song.video_id : '');
        audioPlayer.load();
        albumArtLarge.src = song.albumArt || 'assets/images/default_album_art.png';
        audioPlayer.play().catch(() => {
            showToast('Click ▶️ Play to start playback.');
        });
    }

    function playPause() {
        if (audioPlayer.paused) {
            audioPlayer.play();
            showPauseIcon();
            playPauseBtn.innerHTML = '';
            playPauseBtn.appendChild(pauseIcon);
        } else {
            audioPlayer.pause();
            showPlayIcon();
            playPauseBtn.innerHTML = '';
            playPauseBtn.appendChild(playIcon);
        }
    }

    function nextSong() {
        if (queue.length === 0) return;
        currentSongIndex = (currentSongIndex + 1) % queue.length;
        loadSong(currentSongIndex);
        renderQueue();
    }

    function prevSong() {
        if (queue.length === 0) return;
        currentSongIndex = (currentSongIndex - 1 + queue.length) % queue.length;
        loadSong(currentSongIndex);
        renderQueue();
    }

    // --- Event Listeners ---
    if (playPauseBtn) playPauseBtn.addEventListener('click', () => {
        if (playPauseBtn.disabled) {
            if (playTooltip) showTooltip(playPauseBtn, playTooltip, 'No song to play');
            shakeButton(playPauseBtn);
            showToast('Queue is empty! Add a song to start.');
        } else {
            console.log('Play/Pause button clicked');
        }
    });
    if (skipFwdBtn) skipFwdBtn.addEventListener('click', () => {
        console.log('Skip button clicked');
        handleSkip();
    });
    if (loopBtn) loopBtn.addEventListener('click', () => {
        console.log('Loop button clicked');
        handleLoop();
    });
    if (favBtn) favBtn.addEventListener('click', () => {
        if (favBtn.disabled) {
            if (favTooltip) showTooltip(favBtn, favTooltip, 'No song to favorite');
            shakeButton(favBtn);
            showToast('No song to favorite.');
        } else {
            console.log('Favorite button clicked');
            handleFav();
        }
    });
    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (prevBtn.disabled) {
            if (prevTooltip) showTooltip(prevBtn, prevTooltip, 'No previous song');
            shakeButton(prevBtn);
            showToast('No previous song.');
        } else {
            console.log('Previous button clicked');
            prevSong();
        }
    });
    if (audioPlayer) audioPlayer.addEventListener('ended', () => {
        if (queue.length > 1 && currentSongIndex < queue.length - 1) {
            nextSong();
        } else {
            showToast('Queue is empty! Add a song to start.');
        }
    });
    
    // Initialize default states
    if (loopBtn) loopBtn.style.opacity = '0.5';

    // --- Initial Load ---
    // When the Mini App opens, you might want to immediately fetch the current state
    // fetchQueue().then(data => updatePlayerUI(data));

    // --- Initial Render ---
    async function updateUI() {
        let data;
        try {
            data = await fetchQueue();
            if (data.queue && data.queue.length > 0) {
                queue = data.queue;
                currentSongIndex = data.current;
            } else if (queue.length > 0) {
                // Use local queue if backend returns empty
                data = { queue, current: currentSongIndex };
            } else {
                // No data from backend and no local queue
                data = { queue: [], current: 0 };
            }
        } catch (e) {
            // If fetchQueue fails, use local queue
            data = { queue, current: currentSongIndex };
        }
        renderQueue();
        // Use local queue for player if backend is unreachable
        if (data.queue && data.queue.length > 0) {
            loadSong(data.current || 0);
        } else {
            loadSong(0);
        }
        // Fetch and render history (per-user if userId is set)
        const userId = userIdInput.value ? userIdInput.value.trim() : '';
        let historyData = { history: [] };
        try {
            historyData = await fetchHistory(userId);
        } catch (e) {}
        renderHistory(historyData.history);
        updateButtonStates();
    }

    // Initial render
    updateUI();

    addSongForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = songTitleInput.value.trim();
        const artist = songArtistInput.value.trim();
        const src = songSrcInput.value.trim();
        if (title && artist) {
            await addSong(title, artist, src);
            songTitleInput.value = '';
            songArtistInput.value = '';
            songSrcInput.value = '';
            showToast('Song added to queue!');
        }
    });

    // Theme toggle logic
    function setTheme(mode) {
        if (mode === 'light') {
            document.body.classList.add('light-mode');
            themeToggle.textContent = '🌞';
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-mode');
            themeToggle.textContent = '🌙';
            localStorage.setItem('theme', 'dark');
        }
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.contains('light-mode');
        setTheme(isLight ? 'dark' : 'light');
    });

    // Load theme preference
    setTheme(localStorage.getItem('theme') || 'dark');

    // Share room logic
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2100);
    }

    shareRoomBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            shareRoomBtn.textContent = '✅';
            showToast('Room link copied!');
            setTimeout(() => {
                shareRoomBtn.textContent = document.body.classList.contains('light-mode') ? '🔗' : '🔗';
            }, 1200);
        } catch (e) {
            showToast('Failed to copy room link.');
        }
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (!audioPlayer.duration) return;
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.style.width = percent + '%';
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        totalDurationEl.textContent = formatTime(audioPlayer.duration);
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        totalDurationEl.textContent = formatTime(audioPlayer.duration);
    });

    function formatTime(sec) {
        if (isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // Add ripple effect to player control buttons
    function addRippleEffect(button) {
        button.addEventListener('click', function(e) {
            const rect = button.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            button.appendChild(ripple);
            setTimeout(() => ripple.remove(), 500);
        });
    }
    [playPauseBtn, prevBtn, skipFwdBtn].forEach(btn => {
        if (btn) addRippleEffect(btn);
    });

    // Sound feedback
    const clickSound = new Audio('assets/audio/click.mp3');
    clickSound.volume = 0.18;
    [playPauseBtn, prevBtn, skipFwdBtn].forEach(btn => {
        if (btn) btn.addEventListener('mousedown', () => {
            clickSound.currentTime = 0;
            clickSound.play();
        });
    });

    function showPlayIcon() {
        playIcon.style.display = '';
        pauseIcon.style.display = 'none';
    }
    function showPauseIcon() {
        playIcon.style.display = 'none';
        pauseIcon.style.display = '';
    }

    // Dropdown menu logic
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && e.target !== menuBtn) {
            dropdownMenu.classList.remove('show');
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') dropdownMenu.classList.remove('show');
    });

    showFavBtn.addEventListener('click', () => {
        showToast('Favorites feature coming soon!');
        dropdownMenu.classList.remove('show');
    });
    showHistoryBtn.addEventListener('click', () => {
        document.getElementById('userIdInput').scrollIntoView({ behavior: 'smooth' });
        dropdownMenu.classList.remove('show');
    });
    shareMenuBtn.addEventListener('click', () => {
        shareRoomBtn.click();
        dropdownMenu.classList.remove('show');
    });

    // Search bar logic
    searchBtn.addEventListener('click', filterQueue);
    searchInput.addEventListener('input', filterQueue);

    function filterQueue() {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = queue.filter(song =>
            song.title.toLowerCase().includes(query) ||
            song.artist.toLowerCase().includes(query)
        );
        renderQueue(filtered);
    }

    // Animate favorite pulse (for future favorite button)
    function favPulse(element) {
        element.classList.remove('fav-pulse');
        void element.offsetWidth;
        element.classList.add('fav-pulse');
    }

    function updateButtonStates() {
        if (playPauseBtn) playPauseBtn.disabled = queue.length === 0;
        if (skipFwdBtn) skipFwdBtn.disabled = queue.length === 0;
        if (favBtn) favBtn.disabled = queue.length === 0;
        if (prevBtn) prevBtn.disabled = queue.length === 0;
        if (loopBtn) loopBtn.disabled = queue.length === 0;
        if (playTooltip) playTooltip.style.display = queue.length === 0 ? '' : 'none';
        if (prevTooltip) prevTooltip.style.display = (queue.length <= 1 || currentSongIndex === 0) ? '' : 'none';
        if (favTooltip) favTooltip.style.display = queue.length === 0 ? '' : 'none';
        if (nextTooltip) nextTooltip.style.display = queue.length === 0 ? '' : 'none';
    }

    function shakeButton(btn) {
        btn.classList.remove('shake');
        void btn.offsetWidth;
        btn.classList.add('shake');
    }

    function showTooltip(btn, tooltip, msg) {
        tooltip.textContent = msg;
        btn.classList.add('show-tooltip');
        setTimeout(() => btn.classList.remove('show-tooltip'), 1200);
    }

    // Only poll the backend if it is reachable
    let backendReachable = false;
    (async function() {
        try {
            const res = await fetch('http://localhost:5000/api/queue');
            if (res.ok) backendReachable = true;
        } catch (e) {}
        if (backendReachable) {
            setInterval(async () => {
                await updateUI();
            }, 5000); // Poll every 5 seconds
        }
    })();

    // --- Audio Error Handling ---
    audioPlayer.onerror = function() {
        showToast('⚠️ Failed to load or play the song. Click ▶️ Play to retry.');
        songTitle.textContent = 'Error playing song';
        songArtist.textContent = '';
        albumArtLarge.src = 'assets/images/default_album_art.png';
    };

    // Ensure a global Play button is always visible and triggers playback
    let playNowBtnGlobal = document.getElementById('playNowBtnGlobal');
    if (!playNowBtnGlobal) {
        playNowBtnGlobal = document.createElement('button');
        playNowBtnGlobal.textContent = '▶️ Play';
        playNowBtnGlobal.id = 'playNowBtnGlobal';
        playNowBtnGlobal.onclick = () => {
            audioPlayer.play().catch(err => {
                showToast('Playback failed: ' + err.message);
            });
        };
        document.querySelector('.player').appendChild(playNowBtnGlobal);
    }

    // Show current audio source URL for debugging
    const audioSrcDebug = document.createElement('div');
    audioSrcDebug.id = 'audioSrcDebug';
    audioSrcDebug.style.fontSize = '10px';
    audioSrcDebug.style.color = '#888';
    document.querySelector('.player').appendChild(audioSrcDebug);

    // Show loading spinner while audio is loading
    audioPlayer.addEventListener('waiting', () => {
        showToast('Loading audio...');
    });
    audioPlayer.addEventListener('playing', () => {
        showToast('Playing!');
    });

    setInterval(pollQueue, 2000);

    // --- Demo Song Button Handler ---
    const demoBtn = document.getElementById('addDemoSongBtn');
    if (demoBtn) {
        demoBtn.disabled = false;
        demoBtn.onclick = async function() {
            console.log('Demo Song button clicked!');
            const demoSong = {
                title: 'Ed Sheeran - Shape of You',
                artist: 'Ed Sheeran',
                albumArt: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
                src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
            };
            // Add to the front-end queue directly
            queue.push(demoSong);
            currentSongIndex = queue.length - 1;
            showToast('Demo song added (frontend only)!');
            await updateUI();
        };
        console.log('Demo Song button wired up!');
    } else {
        console.error('Demo Song button not found in DOM!');
        showToast('Demo Song button not found!');
    }

    // --- Fallback for missing elements ---
    if (!audioPlayer) console.warn('audioPlayer element not found!');
    if (!playPauseBtn) console.warn('playPauseBtn not found!');
    if (!skipFwdBtn) console.warn('skipFwdBtn not found!');
    if (!favBtn) console.warn('favBtn not found!');
    if (!prevBtn) console.warn('prevBtn not found!');
    if (!loopBtn) console.warn('loopBtn not found!');
    if (!playTooltip) console.warn('playTooltip not found!');
    if (!prevTooltip) console.warn('prevTooltip not found!');
    if (!favTooltip) console.warn('favTooltip not found!');
    if (!nextTooltip) console.warn('nextTooltip not found!');

    window.addEventListener('error', function(e) {
        console.error('Global error:', e.message, e);
        alert('An unexpected error occurred: ' + e.message);
    });

    console.log('Zira Music Room script loaded. Attaching handlers...');

});