document.addEventListener('DOMContentLoaded', () => {
    // Initialize the Telegram Web App SDK
    const tg = window.Telegram.WebApp;
    tg.ready();

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
    
    // --- API Communication ---
    async function fetchQueue() {
        const res = await fetch('http://localhost:5000/api/queue');
        return res.json();
    }

    async function addSong(title, artist, src = "") {
        await fetch('http://localhost:5000/api/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, artist, src })
        });
        await updateUI();
    }

    async function nextSongAPI() {
        await fetch('http://localhost:5000/api/next', { method: 'POST' });
        await updateUI();
    }

    async function prevSongAPI() {
        await fetch('http://localhost:5000/api/prev', { method: 'POST' });
        await updateUI();
    }

    async function fetchHistory() {
        const res = await fetch('http://localhost:5000/api/history');
        return res.json();
    }

    // --- UI Update Function ---
    function updatePlayerUI(data) {
        songTitle.textContent = data.nowPlaying.title;
        songArtist.textContent = data.nowPlaying.artist;
        albumArt.src = data.nowPlaying.albumArt;
        audioSource.src = data.nowPlaying.audioUrl;

        queueList.innerHTML = ''; // Clear previous queue
        data.upNext.forEach(song => {
            const li = document.createElement('li');
            li.textContent = song;
            queueList.appendChild(li);
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
            tg.HapticFeedback.impactOccurred('light');
        } else {
            audioPlayer.pause();
            showPlayIcon();
            isPlaying = false;
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    function handleSkip() {
        // This would send a request to your backend: fetch('/api/skip')
        console.log("Requesting to skip song...");
        songTitle.textContent = "Loading next song...";
        songArtist.textContent = "";
        // After the request, the backend would provide the next song's data
        // and you would call fetchQueue() again.
        tg.HapticFeedback.notificationOccurred('success');
    }

    function handleLoop() {
        isLooping = !isLooping;
        audioPlayer.loop = isLooping;
        loopBtn.style.opacity = isLooping ? '1' : '0.5';
        tg.HapticFeedback.impactOccurred('rigid');
    }
    
    function handleFav() {
        // This would send a request to your backend: fetch('/api/fav', { method: 'POST' })
        favBtn.textContent = '❤️';
        console.log("Added to favorites!");
        tg.HapticFeedback.notificationOccurred('success');
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
            audioSource.src = '';
            audioPlayer.load();
            albumArtLarge.src = 'assets/images/default_album_art.png';
            return;
        }
        const song = queue[index];
        songTitle.textContent = song.title;
        songArtist.textContent = song.artist;
        audioSource.src = song.src;
        audioPlayer.load();
        albumArtLarge.src = song.albumArt || 'assets/images/default_album_art.png';
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
    playPauseBtn.addEventListener('click', () => {
        if (playPauseBtn.disabled) {
            showTooltip(playPauseBtn, playTooltip, 'No song to play');
            shakeButton(playPauseBtn);
            showToast('Queue is empty! Add a song to start.');
        }
    });
    skipFwdBtn.addEventListener('click', handleSkip);
    loopBtn.addEventListener('click', handleLoop);
    favBtn.addEventListener('click', () => {
        if (favBtn.disabled) {
            showTooltip(favBtn, favTooltip, 'No song to favorite');
            shakeButton(favBtn);
            showToast('No song to favorite.');
        }
    });
    nextBtn.addEventListener('click', () => {
        if (nextBtn.disabled) {
            showTooltip(nextBtn, nextTooltip, 'No next song');
            shakeButton(nextBtn);
            showToast('No next song.');
        }
    });
    prevBtn.addEventListener('click', () => {
        if (prevBtn.disabled) {
            showTooltip(prevBtn, prevTooltip, 'No previous song');
            shakeButton(prevBtn);
            showToast('No previous song.');
        }
    });
    
    audioPlayer.addEventListener('ended', () => {
        if (queue.length > 1 && currentSongIndex < queue.length - 1) {
            nextSong();
        } else {
            showToast('Queue is empty! Add a song to start.');
        }
    });
    
    // Initialize default states
    loopBtn.style.opacity = '0.5';

    // --- Initial Load ---
    // When the Mini App opens, you might want to immediately fetch the current state
    // fetchQueue().then(data => updatePlayerUI(data));

    // --- Initial Render ---
    async function updateUI() {
        const data = await fetchQueue();
        queue = data.queue;
        currentSongIndex = data.current;
        renderQueue();
        loadSong(currentSongIndex);
        // Fetch and render history (per-user if userId is set)
        const userId = userIdInput.value.trim();
        const historyData = await fetchHistory(userId);
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
    [playPauseBtn, prevBtn, nextBtn].forEach(addRippleEffect);

    // Sound feedback
    const clickSound = new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae2b2.mp3');
    clickSound.volume = 0.18;
    [playPauseBtn, prevBtn, nextBtn].forEach(btn => {
        btn.addEventListener('mousedown', () => {
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
        // Play/Pause
        if (queue.length === 0) {
            playPauseBtn.disabled = true;
            playTooltip.style.display = '';
        } else {
            playPauseBtn.disabled = false;
            playTooltip.style.display = 'none';
        }
        // Prev
        if (queue.length <= 1 || currentSongIndex === 0) {
            prevBtn.disabled = true;
            prevTooltip.style.display = '';
        } else {
            prevBtn.disabled = false;
            prevTooltip.style.display = 'none';
        }
        // Next
        if (queue.length <= 1 || currentSongIndex === queue.length - 1) {
            nextBtn.disabled = true;
            nextTooltip.style.display = '';
        } else {
            nextBtn.disabled = false;
            nextTooltip.style.display = 'none';
        }
        // Favorite
        if (queue.length === 0) {
            favBtn.disabled = true;
            favTooltip.style.display = '';
        } else {
            favBtn.disabled = false;
            favTooltip.style.display = 'none';
        }
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

});