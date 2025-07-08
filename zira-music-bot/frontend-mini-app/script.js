console.log("Zira Music Room JS loaded!");

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const audioPlayer = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const loopBtn = document.getElementById('loopBtn');
    const albumArt = document.getElementById('albumArt');
    const albumArtLarge = document.getElementById('albumArtLarge');
    const audioLoadingSpinner = document.getElementById('audioLoadingSpinner');
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    const songDuration = document.getElementById('songDuration');
    const songRequestedBy = document.getElementById('songRequestedBy');
    const queueList = document.getElementById('queueList');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchResults = document.getElementById('searchResults');
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const toast = document.getElementById('toast');
    const openWebPlayerBtn = document.getElementById('openWebPlayerBtn');

    // --- State ---
    let queue = [];
    let currentSongIndex = -1;
    let isLooping = false;
    let isPlaying = false;
    let lastKnownBackendIndex = -1;
    let isSearching = false;
    let userInteracted = false;
    let lastPlayedIndex = -1;

    // --- API Configuration ---
    const API_BASE_URL = "http://127.0.0.1:5000";

    // --- Socket.IO Real-Time Sync ---
    const socket = io('http://localhost:8080');
    socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
    });
    socket.on('queue_update', (data) => {
        console.log('Received real-time queue update:', data);
        queue = data.queue || [];
        currentSongIndex = data.current;
        isPaused = data.is_paused;
        renderQueue();
        updatePlayer();
    });

    // --- Chat & Reactions ---
    const chatLog = document.getElementById('chatLog');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const reactionBtns = document.querySelectorAll('.reaction-btn');
    let username = localStorage.getItem('ziraUsername') || '';
    if (!username) {
        username = prompt('Enter your name (for chat):') || 'Guest';
        localStorage.setItem('ziraUsername', username);
    }

    function renderChatMessage(msg, isOwn = false) {
        const div = document.createElement('div');
        div.className = 'chat-message' + (isOwn ? ' own' : '');
        div.innerHTML = `<span class="chat-user">${msg.user}</span>${msg.message} <span class="chat-time">${msg.timestamp || ''}</span>`;
        chatLog.appendChild(div);
        chatLog.scrollTop = chatLog.scrollHeight;
    }
    function renderReaction(reaction) {
        const div = document.createElement('div');
        div.className = 'chat-message';
        div.innerHTML = `<span class="chat-user">${reaction.user}</span><span>${reaction.reaction}</span> <span class="chat-time">${reaction.timestamp || ''}</span>`;
        chatLog.appendChild(div);
        chatLog.scrollTop = chatLog.scrollHeight;
    }
    socket.on('chat_message', (msg) => {
        renderChatMessage(msg, msg.user === username);
    });
    socket.on('chat_history', (history) => {
        chatLog.innerHTML = '';
        history.forEach(msg => renderChatMessage(msg, msg.user === username));
    });
    socket.on('reaction', (reaction) => {
        renderReaction(reaction);
    });
    chatForm.onsubmit = (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;
        const msg = {
            user: username,
            message,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };
        socket.emit('chat_message', msg);
        chatInput.value = '';
    };
    reactionBtns.forEach(btn => {
        btn.onclick = () => {
            const reaction = {
                user: username,
                reaction: btn.dataset.reaction,
                song_id: queue[currentSongIndex]?.video_id || '',
                timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            };
            socket.emit('reaction', reaction);
        };
    });

    // --- Core Functions ---
    async function fetchAndUpdateState() {
        console.log('Fetching queue state...'); // ADDED LOG
        try {
            const response = await fetch(`${API_BASE_URL}/api/queue`);
            if (!response.ok) {
                console.error('Fetch queue failed:', response.status, response.statusText); // ADDED LOG
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            queue = data.queue || [];
            const backendCurrentIndex = data.current;
            if (backendCurrentIndex !== lastKnownBackendIndex) {
                console.log('Backend index changed:', backendCurrentIndex, '->', currentSongIndex); // ADDED LOG
                currentSongIndex = backendCurrentIndex;
                lastKnownBackendIndex = backendCurrentIndex;
                loadSong(currentSongIndex, true);
                if (userInteracted) {
                    console.log('User interacted. Attempting auto-play after state update.'); // ADDED LOG
                    audioPlayer.load();
                    audioPlayer.play().catch(e => {
                        console.warn('Autoplay blocked after fetch/update:', e.message, e); // ADDED LOG
                        showToast('Click ▶️ Play to start playback.');
                    });
                }
            }
            renderQueue();
            updatePlayerControls();
        } catch (error) {
            console.error("Error in fetchAndUpdateState:", error); // ADDED LOG
            showToast("Error: Could not connect to the server.");
        }
    }

    function loadSong(index, animate = false) {
        console.log('loadSong called for index:', index); // ADDED LOG
        if (index < 0 || index >= queue.length) {
            songTitle.textContent = "No song playing";
            songArtist.textContent = "";
            albumArt.src = 'assets/images/default_album_art.png';
            songDuration.textContent = '0:00';
            songRequestedBy.textContent = '';
            audioPlayer.src = "";
            updateProgressBar();
            console.log('No song to load or index out of bounds. Player cleared.'); // ADDED LOG
            return;
        }
        const song = queue[index];
        if (animate) {
            albumArtLarge.classList.remove('fade-in');
            songTitle.classList.remove('fade-in');
            songArtist.classList.remove('fade-in');
            setTimeout(() => {
                albumArtLarge.classList.add('fade-in');
                songTitle.classList.add('fade-in');
                songArtist.classList.add('fade-in');
            }, 10);
        }
        songTitle.textContent = song.title;
        songArtist.textContent = song.artist;
        songDuration.textContent = song.duration || '';
        songRequestedBy.textContent = song.requested_by ? `Requested by: ${song.requested_by}` : '';
        albumArt.src = song.albumArt || 'assets/images/default_album_art.png';
        albumArt.onload = () => albumArtLarge.classList.add('fade-in');
        showAudioLoading(true);
        if (song.src) {
            const fullSongSrc = `${API_BASE_URL}/static/mp3/${song.src}`;
            audioPlayer.src = fullSongSrc;
            console.log('AudioPlayer SRC set to:', fullSongSrc); // ADDED LOG
            audioPlayer.load(); // Explicitly load the new source
            console.log('AudioPlayer.load() called.'); // ADDED LOG
            if (userInteracted) {
                console.log('User interacted. Attempting play in loadSong().'); // ADDED LOG
                audioPlayer.play().catch(e => {
                    console.warn('Autoplay blocked in loadSong():', e.message, e); // ADDED LOG
                    showToast('Click ▶️ Play to start playback.');
                });
            }
        } else {
            audioPlayer.src = "";
            console.warn('Song has no SRC in queue data. Clearing audioPlayer.src.'); // ADDED LOG
        }
        updatePlayerControls();
        renderQueue();
    }

    function showAudioLoading(show) {
        if (audioLoadingSpinner) audioLoadingSpinner.style.display = show ? 'block' : 'none';
    }

    function togglePlayPause() {
        console.log('togglePlayPause called. current paused state:', audioPlayer.paused); // ADDED LOG
        if (audioPlayer.paused) {
            if (audioPlayer.src) {
                console.log('Attempting to play from togglePlayPause. Current src:', audioPlayer.src); // ADDED LOG
                audioPlayer.play().catch(e => {
                    console.error("Playback failed via togglePlayPause:", e.message, e); // ADDED LOG
                    showToast("Playback failed: " + e.message);
                });
            } else {
                console.warn('togglePlayPause: Audio source is empty, cannot play.'); // ADDED LOG
                showToast('No song loaded to play.');
            }
        } else {
            console.log('Attempting to pause from togglePlayPause.'); // ADDED LOG
            audioPlayer.pause();
        }
    }

    async function skipTo(direction) {
        console.log(`Skipping to ${direction}...`); // ADDED LOG
        const endpoint = direction === 'next' ? '/api/next' : '/api/prev';
        try {
            await fetch(API_BASE_URL + endpoint, { method: 'POST' });
            await fetchAndUpdateState();
        } catch (error) {
            console.error(`Error skipping ${direction}:`, error); // ADDED LOG
            showToast("Server communication error.");
        }
    }

    async function playSongByIndex(index) {
        console.log(`playSongByIndex called for index: ${index}`); // ADDED LOG
        try {
            await fetch(`${API_BASE_URL}/api/play/${index}`, { method: 'POST' });
            await fetchAndUpdateState();
        } catch (error) {
            console.error(`Error playing song by index ${index}:`, error); // ADDED LOG
            showToast("Server communication error.");
        }
    }

    async function searchSongs(query) {
        console.log('Searching for:', query); // ADDED LOG
        if (!query.trim()) {
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
            console.log('Search query empty, clearing results.'); // ADDED LOG
            return;
        }
        isSearching = true;
        searchResults.innerHTML = '<div style="padding:16px; color:#b3b3e6;">Searching...</div>';
        searchResults.style.display = 'block';
        try {
            const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                console.error('Search API failed:', response.status, response.statusText); // ADDED LOG
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Search results received:', data.results); // ADDED LOG
            renderSearchResults(data.results || []);
        } catch (error) {
            console.error('Error during search:', error); // ADDED LOG
            searchResults.innerHTML = '<div style="padding:16px; color:#e25555;">Search failed.</div>';
        }
        isSearching = false;
    }

    async function addSongToQueueFromSearch(song) {
        console.log('Attempting to add song to queue:', song.title); // ADDED LOG
        try {
            const response = await fetch(`${API_BASE_URL}/api/download_and_add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(song)
            });
            const data = await response.json();
            if (data.success) {
                showToast(`"${song.title}" added to queue!`);
                await fetchAndUpdateState();
                if (queue.length > 0) {
                    markUserInteracted();
                    // Play the newly added song (which is now at the end of the queue)
                    await playSongByIndex(queue.length - 1);
                }
            } else if (data.message && data.message.includes('already in queue')) {
                showToast('Song already in queue.');
                await fetchAndUpdateState();
            } else {
                showToast(data.error || 'Error adding song.');
                console.error('Error adding song from search:', data.error); // ADDED LOG
            }
        } catch (error) {
            showToast("Error adding song.");
            console.error('Network error adding song:', error); // ADDED LOG
        }
        searchInput.value = '';
        searchResults.style.display = 'none';
    }

    function renderQueue() {
        queueList.innerHTML = '';
        if (queue.length === 0) {
            queueList.innerHTML = '<li>Queue is empty</li>';
            return;
        }
        queue.forEach((song, index) => {
            const li = document.createElement('li');
            li.className = (index === currentSongIndex) ? 'active fade-in' : 'fade-in';
            li.textContent = `${song.title} - ${song.artist}`;
            li.style.cursor = 'pointer';
            li.title = 'Click to play this song';
            li.onclick = () => {
                console.log('Queue item clicked:', index, song.title); // ADDED LOG
                markUserInteracted(); // Ensure user interaction for direct queue play
                playSongByIndex(index);
            };
            queueList.appendChild(li);
        });
        // Only update audio if the song changed
        if (queue && queue.length > 0 && currentSongIndex >= 0 && currentSongIndex !== lastPlayedIndex) {
            const song = queue[currentSongIndex];
            const audioPlayer = document.getElementById('audioPlayer');
            if (audioPlayer && song.src) {
                audioPlayer.src = `${API_BASE_URL}/static/mp3/${song.src}`;
                audioPlayer.load();
                audioPlayer.play();
                lastPlayedIndex = currentSongIndex;
            }
        }
    }

    function renderSearchResults(results) {
        searchResults.innerHTML = '';
        if (results.length === 0) {
            searchResults.innerHTML = '<div style="padding:16px; color:#b3b3e6;">No results found.</div>';
            searchResults.style.display = 'block';
            return;
        }
        results.forEach(song => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <img class="search-result-thumb" src="${song.thumbnail || 'assets/images/default_album_art.png'}" alt="thumb">
                <div class="search-result-info">
                    <div class="search-result-title">${song.title}</div>
                    <div class="search-result-artist">${song.artist || ''}</div>
                </div>
                <button class="search-result-add" style="margin-left:auto; background:#5e60ce; color:#fff; border:none; border-radius:6px; padding:6px 14px; cursor:pointer;">Add</button>
            `;
            div.querySelector('.search-result-add').onclick = (e) => {
                e.stopPropagation();
                addSongToQueueFromSearch({
                    title: song.title,
                    artist: song.artist,
                    video_id: song.video_id,
                    albumArt: song.thumbnail,
                    src: '', // This will be filled by backend after download
                });
            };
            searchResults.appendChild(div);
        });
        searchResults.style.display = 'block';
    }

    function updatePlayerControls() {
        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
        loopBtn.style.opacity = isLooping ? '1' : '0.5';
        prevBtn.disabled = queue.length < 2;
        nextBtn.disabled = queue.length < 2;
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function updateProgressBar() {
        if (!audioPlayer.duration) {
            progressBar.value = 0;
            currentTimeEl.textContent = '0:00';
            totalTimeEl.textContent = '0:00';
            return;
        }
        progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        totalTimeEl.textContent = formatTime(audioPlayer.duration);
    }

    function showToast(message) {
        toast.textContent = message;
        toast.className = 'toast show';
        setTimeout(() => { toast.className = 'toast'; }, 3000);
    }

    function markUserInteracted() {
        if (!userInteracted) {
            console.log('User interacted for the first time!'); // ADDED LOG
            userInteracted = true;
            // Optionally, try to play a silent sound on first interaction
            // to prime the audio context if needed for some browsers
            // document.getElementById('clickSound').play().catch(e => console.warn('Click sound play blocked:', e));
        }
    }

    // --- Event Listeners ---
    playPauseBtn.addEventListener('click', () => { markUserInteracted(); togglePlayPause(); console.log('playPauseBtn clicked!'); }); // ADDED LOG
    nextBtn.addEventListener('click', () => { markUserInteracted(); skipTo('next'); console.log('nextBtn clicked!'); }); // ADDED LOG
    prevBtn.addEventListener('click', () => { markUserInteracted(); skipTo('prev'); console.log('prevBtn clicked!'); }); // ADDED LOG
    loopBtn.addEventListener('click', () => { markUserInteracted(); isLooping = !isLooping; audioPlayer.loop = isLooping; updatePlayerControls(); showToast(isLooping ? "Loop enabled" : "Loop disabled"); console.log('loopBtn clicked! Looping:', isLooping); }); // ADDED LOG
    
    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        showAudioLoading(false);
        updatePlayerControls();
        console.log('audioPlayer: play event fired!'); // ADDED LOG
    });
    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayerControls();
        console.log('audioPlayer: pause event fired!'); // ADDED LOG
    });
    audioPlayer.addEventListener('waiting', () => { showAudioLoading(true); console.log('audioPlayer: waiting event fired!'); }); // ADDED LOG
    audioPlayer.addEventListener('playing', () => { showAudioLoading(false); console.log('audioPlayer: playing event fired!'); }); // ADDED LOG
    audioPlayer.addEventListener('canplay', () => { showAudioLoading(false); console.log('audioPlayer: canplay event fired! Duration:', audioPlayer.duration); }); // ADDED LOG
    audioPlayer.addEventListener('ended', () => {
        console.log('audioPlayer: ended event fired!'); // ADDED LOG
        if (!isLooping) skipTo('next');
    });
    audioPlayer.addEventListener('timeupdate', updateProgressBar);
    audioPlayer.addEventListener('error', (event) => {
        showAudioLoading(false);
        // More detailed error logging
        let errorMsg = 'Unknown audio error';
        if (audioPlayer.error) {
            switch (audioPlayer.error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    errorMsg = 'You aborted the audio playback.';
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    errorMsg = 'A network error caused the audio download to fail.';
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    errorMsg = 'The audio playback was aborted due to a corruption problem or because the media uses features the browser does not support.';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMsg = 'The audio could not be loaded, either because the server or network failed or because the format is not supported.';
                    break;
                default:
                    errorMsg = `An unknown audio error occurred (Code: ${audioPlayer.error.code}).`;
            }
        }
        console.error('audioPlayer: error event fired!', errorMsg, audioPlayer.error, event); // ADDED DETAILED LOG
        showToast(`⚠️ Failed to load or play the song: ${errorMsg}`);
        songTitle.textContent = 'Error playing song';
        songArtist.textContent = '';
        albumArt.src = 'assets/images/default_album_art.png';
    });

    progressBar.addEventListener('input', (e) => {
        if (audioPlayer.duration) {
            const seekTime = (e.target.value / 100) * audioPlayer.duration;
            audioPlayer.currentTime = seekTime;
            console.log('ProgressBar input: seeking to', seekTime); // ADDED LOG
        } else {
            console.warn('ProgressBar input: No duration available for seeking.'); // ADDED LOG
        }
    });

    // FIX: Removed the conflicting .onclick assignment
    searchInput.addEventListener('input', () => {
        console.log('searchInput input event fired. Value:', searchInput.value); // ADDED LOG
        searchSongs(searchInput.value);
    });
    searchBtn.addEventListener('click', () => {
        markUserInteracted();
        console.log('searchBtn clicked!'); // ADDED LOG
        searchSongs(searchInput.value);
    });

    document.getElementById('joinRoomBtn')?.addEventListener('click', markUserInteracted);

    if (openWebPlayerBtn) {
        openWebPlayerBtn.onclick = () => {
            window.open('https://samy-dj19.github.io/ziramusicroom/', '_blank');
        };
    }

    // --- Initialization ---
    function init() {
        console.log('Initializing app...'); // ADDED LOG
        fetchAndUpdateState();
        setInterval(fetchAndUpdateState, 2000);
    }
    init();
});

// REMOVED THE FOLLOWING LINE:
// document.getElementById('searchBtn').onclick = () => alert('Button works!');

// Minimal, robust queue rendering and polling with click-to-play and smooth playback
const queueList = document.getElementById('queueList');
const audioPlayer = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const API_BASE_URL = "http://127.0.0.1:5000";
let lastPlayedIndex = -1;
let isPlaying = false;

async function fetchAndRenderQueue() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/queue`);
        if (!response.ok) throw new Error("Failed to fetch queue");
        const data = await response.json();
        renderQueue(data.queue, data.current);
    } catch (err) {
        queueList.innerHTML = '<li style="color:red;">Error loading queue</li>';
    }
}

function renderQueue(queue, currentIndex) {
    queueList.innerHTML = '';
    if (!queue || queue.length === 0) {
        queueList.innerHTML = '<li>Queue is empty</li>';
        return;
    }
    queue.forEach((song, idx) => {
        const li = document.createElement('li');
        li.textContent = `${song.title} - ${song.artist}`;
        if (idx === currentIndex) {
            li.style.fontWeight = 'bold';
            li.style.background = '#e0e0ff';
        }
        li.style.cursor = 'pointer';
        li.title = 'Click to play this song';
        li.onclick = () => playSongByIndex(idx);
        queueList.appendChild(li);
    });

    // Only update audio if the song changed
    if (queue && queue.length > 0 && currentIndex >= 0 && currentIndex !== lastPlayedIndex) {
        const song = queue[currentIndex];
        if (audioPlayer && song.src) {
            audioPlayer.src = `${API_BASE_URL}/static/mp3/${song.src}`;
            audioPlayer.load();
            if (isPlaying) audioPlayer.play();
            lastPlayedIndex = currentIndex;
        }
    }
}

async function playSongByIndex(index) {
    try {
        await fetch(`${API_BASE_URL}/api/play/${index}`, { method: 'POST' });
        isPlaying = true;
        fetchAndRenderQueue();
    } catch (err) {
        alert('Failed to play song');
    }
}

playPauseBtn.onclick = () => {
    if (audioPlayer.paused) {
        audioPlayer.play();
        isPlaying = true;
    } else {
        audioPlayer.pause();
        isPlaying = false;
    }
};

prevBtn.onclick = async () => {
    await fetch(`${API_BASE_URL}/api/prev`, { method: 'POST' });
    isPlaying = true;
    fetchAndRenderQueue();
};

nextBtn.onclick = async () => {
    await fetch(`${API_BASE_URL}/api/next`, { method: 'POST' });
    isPlaying = true;
    fetchAndRenderQueue();
};

audioPlayer.onended = () => {
    nextBtn.click();
};

fetchAndRenderQueue();
setInterval(fetchAndRenderQueue, 2000);

// Premium Zira Music Room JS
console.log("Zira Music Room Premium JS loaded!");

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const audioPlayer = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const loopBtn = document.getElementById('loopBtn');
    const albumArt = document.getElementById('albumArt');
    const albumArtLarge = document.querySelector('.album-art-large');
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    const songDuration = document.getElementById('songDuration');
    const songRequestedBy = document.getElementById('songRequestedBy');
    const queueList = document.getElementById('queueList');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchResults = document.getElementById('searchResults');
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const favBtn = document.getElementById('favBtn');
    const favModal = document.getElementById('favModal');
    const closeFavModal = document.getElementById('closeFavModal');
    const favList = document.getElementById('favList');
    const themePicker = document.getElementById('themePicker');
    const shareRoomBtn = document.getElementById('shareRoomBtn');
    const toast = document.getElementById('toast');
    const visualizer = document.querySelector('.visualizer');

    // --- State ---
    let queue = [];
    let currentSongIndex = -1;
    let isLooping = false;
    let isPlaying = false;
    let isPaused = false;
    let favorites = JSON.parse(localStorage.getItem('ziraFavorites') || '[]');
    let theme = localStorage.getItem('ziraTheme') || 'violet';
    let userInteracted = false;

    // --- API Configuration ---
    const API_BASE_URL = "http://localhost:8080";

    // --- Core Functions ---
    async function fetchQueueState() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/queue`);
            const data = await response.json();
            queue = data.queue || [];
            currentSongIndex = data.current;
            isPaused = data.is_paused;
            renderQueue();
            updatePlayer();
        } catch (error) {
            showToast("Error: Could not connect to the server.");
        }
    }

    function updatePlayer() {
        if (queue.length === 0 || currentSongIndex < 0 || currentSongIndex >= queue.length) {
            songTitle.textContent = "No song playing";
            songArtist.textContent = "";
            albumArt.src = 'assets/images/default_album_art.png';
            songDuration.textContent = '0:00';
            songRequestedBy.textContent = '';
            audioPlayer.src = "";
            updateProgressBar();
            setVisualizerActive(false);
            return;
        }
        const song = queue[currentSongIndex];
        songTitle.textContent = song.title;
        songArtist.textContent = song.artist;
        songDuration.textContent = song.duration || '';
        songRequestedBy.textContent = song.requested_by ? `Requested by: ${song.requested_by}` : '';
        albumArt.src = song.albumArt || 'assets/images/default_album_art.png';
        audioPlayer.src = song.src ? `${API_BASE_URL}/static/mp3/${song.src}` : "";
        updateProgressBar();
        setVisualizerActive(!isPaused);
        highlightFavorite(song);
    }

    function updateProgressBar() {
        if (!audioPlayer.duration) {
            progressBar.value = 0;
            currentTimeEl.textContent = '0:00';
            totalTimeEl.textContent = '0:00';
            return;
        }
        progressBar.max = Math.floor(audioPlayer.duration);
        progressBar.value = Math.floor(audioPlayer.currentTime);
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        totalTimeEl.textContent = formatTime(audioPlayer.duration);
    }

    function formatTime(seconds) {
        seconds = Math.floor(seconds);
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }

    function setVisualizerActive(active) {
        if (!visualizer) return;
        visualizer.style.opacity = active ? 1 : 0.3;
        visualizer.querySelectorAll('.bar').forEach((bar, i) => {
            bar.style.animationPlayState = active ? 'running' : 'paused';
        });
    }

    // --- Queue Rendering ---
    function renderQueue() {
        queueList.innerHTML = '';
        if (queue.length === 0) {
            queueList.innerHTML = '<li>Queue is empty</li>';
            return;
        }
        queue.forEach((song, index) => {
            const li = document.createElement('li');
            li.className = 'queue-item' + (index === currentSongIndex ? ' active fade-in' : ' fade-in');
            li.innerHTML = `
                <div class="queue-song-info">
                    <span class="queue-song-title">
                        <svg width="20" height="20" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        ${song.title}
                    </span>
                    <span class="queue-song-artist">${song.artist}</span>
                </div>
                <div class="queue-controls">
                    <button class="queue-play icon-btn" aria-label="Play"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
                    <button class="queue-pause icon-btn" aria-label="Pause"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></button>
                    <button class="queue-next icon-btn" aria-label="Next"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></button>
                    <button class="queue-share icon-btn" aria-label="Share Song"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M4 12v-2a4 4 0 014-4h12"/><path d="M16 16l4-4-4-4"/></svg></button>
                    <button class="queue-fav icon-btn" aria-label="Favorite Song">${isFavorite(song) ? '❤️' : '🤍'}</button>
                </div>
            `;
            // Play button
            li.querySelector('.queue-play').onclick = (e) => { e.stopPropagation(); playSongByIndex(index); };
            // Pause button
            li.querySelector('.queue-pause').onclick = (e) => { e.stopPropagation(); audioPlayer.pause(); };
            // Next button
            li.querySelector('.queue-next').onclick = (e) => { e.stopPropagation(); skipTo('next'); };
            // Share button
            li.querySelector('.queue-share').onclick = (e) => { e.stopPropagation(); shareSong(song); };
            // Favorite button
            li.querySelector('.queue-fav').onclick = (e) => { e.stopPropagation(); toggleFavorite(song); };
            // Play song on click
            li.onclick = () => playSongByIndex(index);
            queueList.appendChild(li);
        });
    }

    // --- Search ---
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 1) searchSongs(query);
        else searchResults.style.display = 'none';
    });
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query.length > 1) searchSongs(query);
    });

    async function searchSongs(query) {
        searchResults.innerHTML = '<div style="padding:16px; color:#b3b3e6;">Searching...</div>';
        searchResults.style.display = 'block';
        try {
            const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            renderSearchResults(data.results || []);
        } catch (error) {
            searchResults.innerHTML = '<div style="padding:16px; color:#e25555;">Search failed.</div>';
        }
    }

    function renderSearchResults(results) {
        if (!results.length) {
            searchResults.innerHTML = '<div style="padding:16px; color:#b3b3e6;">No results found.</div>';
            return;
        }
        searchResults.innerHTML = '';
        results.forEach(song => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <div class="search-result-thumb"><img src="${song.thumbnail || 'assets/images/default_album_art.png'}" alt="thumb"/></div>
                <div class="search-result-info">
                    <div class="search-result-title">${song.title}</div>
                    <div class="search-result-artist">${song.artist}</div>
                </div>
                <button class="icon-btn search-add-btn" title="Add to queue"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>
            `;
            item.querySelector('.search-add-btn').onclick = (e) => { e.stopPropagation(); addSongToQueueFromSearch(song); };
            item.onclick = () => addSongToQueueFromSearch(song);
            searchResults.appendChild(item);
        });
    }

    async function addSongToQueueFromSearch(song) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/download_and_add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(song)
            });
            const data = await response.json();
            if (data.success) {
                showToast(`"${song.title}" added to queue!`);
                await fetchQueueState();
            } else if (data.message && data.message.includes('already in queue')) {
                showToast('Song already in queue.');
                await fetchQueueState();
            } else {
                showToast(data.error || 'Error adding song.');
            }
        } catch (error) {
            showToast("Error adding song.");
        }
        searchInput.value = '';
        searchResults.style.display = 'none';
    }

    // --- Player Controls ---
    playPauseBtn.onclick = () => {
        if (audioPlayer.paused) audioPlayer.play();
        else audioPlayer.pause();
    };
    prevBtn.onclick = () => skipTo('prev');
    nextBtn.onclick = () => skipTo('next');
    loopBtn.onclick = () => {
        isLooping = !isLooping;
        audioPlayer.loop = isLooping;
        loopBtn.classList.toggle('active', isLooping);
    };
    audioPlayer.onplay = () => { isPlaying = true; setVisualizerActive(true); };
    audioPlayer.onpause = () => { isPlaying = false; setVisualizerActive(false); };
    audioPlayer.ontimeupdate = updateProgressBar;
    audioPlayer.onended = () => {
        if (isLooping) audioPlayer.play();
        else skipTo('next');
    };
    progressBar.oninput = (e) => {
        audioPlayer.currentTime = e.target.value;
        updateProgressBar();
    };

    async function skipTo(direction) {
        const endpoint = direction === 'next' ? '/api/next' : '/api/prev';
        await fetch(API_BASE_URL + endpoint, { method: 'POST' });
        await fetchQueueState();
    }

    async function playSongByIndex(index) {
        await fetch(`${API_BASE_URL}/api/play/${index}`, { method: 'POST' });
        await fetchQueueState();
    }

    // --- Favorites ---
    function isFavorite(song) {
        return favorites.some(fav => fav.video_id === song.video_id);
    }
    function toggleFavorite(song) {
        if (isFavorite(song)) {
            favorites = favorites.filter(fav => fav.video_id !== song.video_id);
        } else {
            favorites.push(song);
        }
        localStorage.setItem('ziraFavorites', JSON.stringify(favorites));
        renderQueue();
        renderFavorites();
    }
    function renderFavorites() {
        favList.innerHTML = '';
        if (!favorites.length) {
            favList.innerHTML = '<li class="fav-item">No favorites yet.</li>';
            return;
        }
        favorites.forEach(song => {
            const li = document.createElement('li');
            li.className = 'fav-item';
            li.innerHTML = `
                <svg width="20" height="20" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                ${song.title} - ${song.artist}
            `;
            li.onclick = () => playSongByIndex(queue.findIndex(q => q.video_id === song.video_id));
            favList.appendChild(li);
        });
    }
    favBtn.onclick = () => { favModal.style.display = 'flex'; renderFavorites(); };
    closeFavModal.onclick = () => { favModal.style.display = 'none'; };

    // --- Theme Picker ---
    themePicker.value = theme;
    themePicker.onchange = (e) => {
        theme = e.target.value;
        setTheme(theme);
        localStorage.setItem('ziraTheme', theme);
    };
    function setTheme(theme) {
        document.body.className = '';
        document.body.classList.add(`theme-${theme}`);
        // Optionally, update CSS variables for more dynamic theming
    }
    setTheme(theme);

    // --- Share Room ---
    shareRoomBtn.onclick = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        showToast('Room link copied!');
    };

    // --- Toast ---
    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // --- Init ---
    fetchQueueState();
    setTheme(theme);
});