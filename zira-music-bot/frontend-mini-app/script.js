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