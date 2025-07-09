// --- three.js 3D background ---
let scene, camera, renderer, shapes = [];
    let isPlaying = false;
function initThreeBG() {
  const canvas = document.getElementById('three-bg');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 16;
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Add floating glowing spheres
  for (let i = 0; i < 7; i++) {
    const color = new THREE.Color(`hsl(${180 + i*30}, 80%, 60%)`);
    const geometry = new THREE.SphereGeometry(1.1 + Math.random()*0.7, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.7 + Math.random()*0.5,
      transparent: true,
      opacity: 0.7,
      roughness: 0.3,
      metalness: 0.7
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (Math.random()-0.5)*12,
      (Math.random()-0.5)*8,
      (Math.random()-0.5)*8
    );
    mesh.userData = {
      speed: 0.2 + Math.random()*0.3,
      phase: Math.random()*Math.PI*2
    };
    scene.add(mesh);
    shapes.push(mesh);
  }
  // Soft ambient light
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  // Directional light for glow
  const dirLight = new THREE.DirectionalLight(0xa78bfa, 1.2);
  dirLight.position.set(0, 8, 12);
  scene.add(dirLight);
}
function animateThreeBG(time) {
  if (!renderer) return;
  for (let i = 0; i < shapes.length; i++) {
    const mesh = shapes[i];
    mesh.position.y += Math.sin(time*0.0005 + mesh.userData.phase) * mesh.userData.speed * 0.02;
    mesh.position.x += Math.cos(time*0.0003 + mesh.userData.phase) * mesh.userData.speed * 0.01;
    mesh.rotation.y += 0.002 * mesh.userData.speed;
    mesh.rotation.x += 0.001 * mesh.userData.speed;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animateThreeBG);
}
function resizeThreeBG() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resizeThreeBG);
window.addEventListener('DOMContentLoaded', () => {
  initThreeBG();
  animateThreeBG();
  startFloatingShapes();
});

// --- Floating SVG shapes ---
const SHAPE_SVGS = [
  // Music note
  '<svg width="32" height="32" viewBox="0 0 40 40" fill="none" stroke="#f472b6" stroke-width="2.5" xmlns="http://www.w3.org/2000/svg"><path d="M30 10V28a6 6 0 1 1-2-4.47V10z" fill="#f472b6"/><circle cx="28" cy="32" r="4" fill="#fff" opacity="0.5"/></svg>',
  // Star
  '<svg width="30" height="30" viewBox="0 0 36 36" fill="none" stroke="#a78bfa" stroke-width="2.5" xmlns="http://www.w3.org/2000/svg"><polygon points="18,3 22,14 34,14 24,21 28,33 18,26 8,33 12,21 2,14 14,14" fill="#a78bfa"/></svg>',
  // Circle
  '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#818cf8" stroke-width="2.5" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14" r="12" fill="#818cf8" opacity="0.7"/></svg>',
  // Triangle
  '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#f472b6" stroke-width="2.5" xmlns="http://www.w3.org/2000/svg"><polygon points="14,4 26,24 2,24" fill="#f472b6" opacity="0.7"/></svg>'
];
function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}
function startFloatingShapes() {
  const container = document.querySelector('.floating-shapes');
  function spawnShape() {
    const shape = document.createElement('div');
    shape.className = 'floating-shape';
    shape.innerHTML = SHAPE_SVGS[Math.floor(Math.random() * SHAPE_SVGS.length)];
    // Random start position (any edge)
    const edge = Math.floor(Math.random() * 4); // 0: left, 1: right, 2: top, 3: bottom
    let x, y, dx, dy;
    const vw = window.innerWidth, vh = window.innerHeight;
    const size = randomBetween(24, 44);
    shape.style.width = size + 'px';
    shape.style.height = size + 'px';
    if (edge === 0) { // left
      x = -size; y = randomBetween(0, vh - size); dx = randomBetween(0.5, 2); dy = randomBetween(-0.5, 0.5);
    } else if (edge === 1) { // right
      x = vw; y = randomBetween(0, vh - size); dx = -randomBetween(0.5, 2); dy = randomBetween(-0.5, 0.5);
    } else if (edge === 2) { // top
      x = randomBetween(0, vw - size); y = -size; dx = randomBetween(-0.5, 0.5); dy = randomBetween(0.5, 2);
    } else { // bottom
      x = randomBetween(0, vw - size); y = vh; dx = randomBetween(-0.5, 0.5); dy = -randomBetween(0.5, 2);
    }
    shape.style.left = x + 'px';
    shape.style.top = y + 'px';
    container.appendChild(shape);
    // Animate
    let frame = 0;
    function animate() {
      x += dx;
      y += dy;
      shape.style.left = x + 'px';
      shape.style.top = y + 'px';
      frame++;
      if (
        x < -60 || x > window.innerWidth + 60 ||
        y < -60 || y > window.innerHeight + 60
      ) {
        shape.remove();
        return;
    }
      requestAnimationFrame(animate);
    }
    animate();
    // On click: burst/fade out
    shape.addEventListener('click', () => {
      shape.style.transition = 'opacity 0.5s, transform 0.5s';
      shape.style.opacity = 0;
      shape.style.transform += ' scale(1.7)';
      setTimeout(() => shape.remove(), 500);
    });
  }
  setInterval(spawnShape, 1200);
}

// --- UI Interactivity (demo only) ---
// Play/Pause toggle
const playPauseBtn = document.getElementById('play-pause-btn');
const playPauseIcon = document.getElementById('play-pause-icon');
playPauseBtn.addEventListener('click', () => {
  isPlaying = !isPlaying;
  if (isPlaying) {
    playPauseBtn.classList.add('active');
    // Pause SVG
    playPauseIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    } else {
    playPauseBtn.classList.remove('active');
    // Play SVG
    playPauseIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
  }
});
// Progress bar demo
const progressBar = document.getElementById('progress-bar');
const progressBarInner = document.getElementById('progress-bar-inner');
progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  progressBarInner.style.width = (percent*100).toFixed(1) + '%';
});
// Playlist active item
Array.from(document.querySelectorAll('.playlist-item')).forEach(item => {
  item.addEventListener('click', () => {
    Array.from(document.querySelectorAll('.playlist-item')).forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});
// Search bar focus effect
const searchBar = document.getElementById('search-bar');
searchBar.addEventListener('focus', () => {
  document.querySelector('.search-bar-container').classList.add('focus');
});
searchBar.addEventListener('blur', () => {
  document.querySelector('.search-bar-container').classList.remove('focus');
});

// --- Music Player Logic ---
const audioPlayer = document.getElementById('audio-player');
const playlistEl = document.getElementById('playlist');
const playPauseBtn2 = document.getElementById('play-pause-btn');
const playPauseIcon2 = document.getElementById('play-pause-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const loopBtn = document.getElementById('loop-btn');
const volumeSlider = document.getElementById('volume-slider');
const progressBar2 = document.getElementById('progress-bar');
const progressBarInner2 = document.getElementById('progress-bar-inner');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const albumArt = document.getElementById('album-art');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');

// Example song list (should be fetched from backend or static for demo)
// Use absolute paths for Flask static serving
const songs = [
  { title: 'Track 1', artist: 'Artist 1', src: '/static/mp3/58xKTGxmeHI.mp3', albumArt: 'assets/images/default_album_art.png' },
  { title: 'Track 2', artist: 'Artist 2', src: '/static/mp3/7JDX250dGNs.mp3', albumArt: 'assets/images/default_album_art.png' },
  { title: 'Track 3', artist: 'Artist 3', src: '/static/mp3/a0goLSCAcBw.mp3', albumArt: 'assets/images/default_album_art.png' }
];
let currentSongIndex = 0;
let isUserSeeking = false;

function renderPlaylist() {
  playlistEl.innerHTML = '';
  songs.forEach((song, idx) => {
    const li = document.createElement('li');
    li.className = 'playlist-item' + (idx === currentSongIndex ? ' active' : '');
    li.innerHTML = `<span>${song.title}</span>`;
    li.addEventListener('click', () => playSong(idx));
    playlistEl.appendChild(li);
  });
}

function playSong(idx) {
  currentSongIndex = idx;
  const song = songs[idx];
  audioPlayer.src = song.src;
  trackTitle.textContent = song.title;
  trackArtist.textContent = song.artist;
  albumArt.src = song.albumArt;
  renderPlaylist();
  audioPlayer.play();
  isPlaying = true;
  updatePlayPauseIcon();
}

function updatePlayPauseIcon() {
  if (isPlaying) {
    playPauseBtn2.classList.add('active');
    playPauseIcon2.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  } else {
    playPauseBtn2.classList.remove('active');
    playPauseIcon2.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
  }
}

playPauseBtn2.addEventListener('click', () => {
  if (audioPlayer.paused) {
    audioPlayer.play();
    isPlaying = true;
  } else {
    audioPlayer.pause();
    isPlaying = false;
  }
  updatePlayPauseIcon();
});

audioPlayer.addEventListener('play', () => { isPlaying = true; updatePlayPauseIcon(); });
audioPlayer.addEventListener('pause', () => { isPlaying = false; updatePlayPauseIcon(); });
audioPlayer.addEventListener('ended', () => {
  if (audioPlayer.loop) return;
  nextSong();
});

function nextSong() {
  let nextIdx = (currentSongIndex + 1) % songs.length;
  playSong(nextIdx);
}
function prevSong() {
  let prevIdx = (currentSongIndex - 1 + songs.length) % songs.length;
  playSong(prevIdx);
}
nextBtn.addEventListener('click', nextSong);
prevBtn.addEventListener('click', prevSong);

loopBtn.addEventListener('click', () => {
  audioPlayer.loop = !audioPlayer.loop;
  loopBtn.classList.toggle('active', audioPlayer.loop);
});

volumeSlider.addEventListener('input', () => {
  audioPlayer.volume = volumeSlider.value / 100;
});

audioPlayer.addEventListener('timeupdate', () => {
  if (!isUserSeeking) {
    const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressBarInner2.style.width = percent + '%';
    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    durationEl.textContent = formatTime(audioPlayer.duration);
  }
});
progressBar2.addEventListener('click', (e) => {
  const rect = progressBar2.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audioPlayer.currentTime = percent * audioPlayer.duration;
});
function formatTime(sec) {
  if (isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// Handle /play <song name> command in search bar
const searchBar2 = document.getElementById('search-bar');
searchBar2.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const val = searchBar2.value.trim();
    if (val.toLowerCase().startsWith('/play ')) {
      const name = val.slice(6).toLowerCase();
      const idx = songs.findIndex(s => s.title.toLowerCase().includes(name));
      if (idx !== -1) {
        playSong(idx);
      } else {
        alert('Song not found!');
      }
      searchBar2.value = '';
    }
  }
});

// Initial render
renderPlaylist();
playSong(0);

// --- Room Control Panel Logic ---
document.getElementById('panel-play-btn').addEventListener('click', () => {
  audioPlayer.play();
});
document.getElementById('panel-pause-btn').addEventListener('click', () => {
  audioPlayer.pause();
});
document.getElementById('panel-next-btn').addEventListener('click', nextSong);
document.getElementById('panel-prev-btn').addEventListener('click', prevSong);
document.getElementById('panel-loop-btn').addEventListener('click', () => {
  audioPlayer.loop = !audioPlayer.loop;
  document.getElementById('panel-loop-btn').classList.toggle('active', audioPlayer.loop);
  loopBtn.classList.toggle('active', audioPlayer.loop);
});

document.getElementById('launch-room-btn').addEventListener('click', () => {
  // TODO: Implement backend call to launch room
  alert('Launch Room: This will connect to the backend to launch a room.');
});
document.getElementById('close-room-btn').addEventListener('click', () => {
  // TODO: Implement backend call to close room
  alert('Close Room: This will connect to the backend to close the room.');
});