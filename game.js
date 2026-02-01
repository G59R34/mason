import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b1220, 12, 80);
scene.background = new THREE.Color(0x0b1220);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(8, 14, 6);
scene.add(dir);

const groundGeo = new THREE.PlaneGeometry(160, 160);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9, metalness: 0.1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const cityGroup = new THREE.Group();
const buildingColors = [0x223046, 0x1a2a3a, 0x2a3b4d, 0x18202c];
for (let i = 0; i < 80; i += 1) {
  const w = 2 + Math.random() * 3;
  const h = 3 + Math.random() * 10;
  const d = 2 + Math.random() * 3;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color: buildingColors[i % buildingColors.length], roughness: 0.85 });
  const b = new THREE.Mesh(geo, mat);
  b.position.set((Math.random() - 0.5) * 90, h / 2, (Math.random() - 0.5) * 90);
  if (Math.abs(b.position.x) < 12 && Math.abs(b.position.z) < 12) {
    b.position.x += 16;
  }
  cityGroup.add(b);
}
scene.add(cityGroup);

const loader = new THREE.TextureLoader();
const masonTexture = loader.load('img/mason.png');
const masonMat = new THREE.MeshStandardMaterial({ map: masonTexture, transparent: true });
const masonBillboard = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), masonMat);
masonBillboard.position.set(-8, 4, -6);
scene.add(masonBillboard);

const jumpTexture = loader.load('img/jump.png');
const jumpSpriteMat = new THREE.SpriteMaterial({ map: jumpTexture });

const screenVideo = document.createElement('video');
screenVideo.src = 'img/intro.mp4';
screenVideo.loop = true;
screenVideo.muted = true;
screenVideo.playsInline = true;
screenVideo.play().catch(() => {});
const screenTex = new THREE.VideoTexture(screenVideo);
const screenMat = new THREE.MeshStandardMaterial({ map: screenTex });
const screen = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), screenMat);
screen.position.set(10, 4, -8);
scene.add(screen);

const player = new THREE.Object3D();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.7, 1.4, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0xff7a59 })
);
body.position.y = 1.4;
player.add(body);
player.position.set(0, 0, 0);
scene.add(player);

const state = {
  day: 1,
  slot: 1,
  maxSlots: 4,
  energy: 100,
  rep: 50,
  cash: 0,
  shiftActive: false,
  log: [],
  soundOn: false,
  keys: { w: false, a: false, s: false, d: false },
  yaw: 0,
  pitch: 0,
  velocity: new THREE.Vector3(),
  activeClientId: null
};

const els = {
  day: document.getElementById('hudDay'),
  energy: document.getElementById('hudEnergy'),
  rep: document.getElementById('hudRep'),
  cash: document.getElementById('hudCash'),
  log: document.getElementById('logEntries'),
  prompt: document.getElementById('servePrompt'),
  overlay: document.getElementById('serviceOverlay'),
  serviceVideo: document.getElementById('serviceVideo'),
  soundToggle: document.getElementById('soundToggle')
};

const clientNames = [
  'Jordan', 'Avery', 'Kai', 'Riley', 'Morgan', 'Quinn',
  'Skyler', 'Dakota', 'Casey', 'Parker', 'Rowan', 'Emerson'
];

const neighborhoods = [
  'Harborline', 'Old Town', 'Midnight Market',
  'Skyline Row', 'Rivergate', 'Rose District'
];

const services = [
  { id: 'basic', name: 'Basic Session', payout: 18, energy: 12, rep: 3, time: 1 },
  { id: 'standard', name: 'Rush Service', payout: 32, energy: 20, rep: 6, time: 1 },
  { id: 'premium', name: 'Signature Night', payout: 60, energy: 32, rep: 10, time: 2 }
];

const clients = [];

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num));
}

function log(message) {
  const entry = { message, time: new Date().toLocaleTimeString() };
  state.log.unshift(entry);
  if (state.log.length > 8) state.log.pop();
  renderLog();
}

function renderLog() {
  if (!els.log) return;
  els.log.innerHTML = '';
  state.log.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'log-entry';
    row.textContent = `${entry.time} - ${entry.message}`;
    els.log.appendChild(row);
  });
}

function updateHud() {
  els.day.textContent = `${state.day} (Slot ${Math.min(state.slot, state.maxSlots)}/${state.maxSlots})`;
  els.energy.textContent = `${state.energy}`;
  els.rep.textContent = `${state.rep}`;
  els.cash.textContent = `$${state.cash}`;
}

function playAlert() {
  if (!state.soundOn) return;
  const audio = new Audio('img/jumpscare.mp3');
  audio.volume = 0.18;
  audio.play().catch(() => {});
}

function playServiceOverlay() {
  if (!els.overlay || !els.serviceVideo) return;
  els.overlay.classList.add('open');
  els.serviceVideo.currentTime = 0;
  els.serviceVideo.play().catch(() => {});
  setTimeout(() => {
    els.overlay.classList.remove('open');
  }, 2200);
}

function spawnClient() {
  const name = clientNames[Math.floor(Math.random() * clientNames.length)];
  const zone = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
  const service = services[Math.floor(Math.random() * services.length)];
  const tip = Math.floor(Math.random() * 8);

  const marker = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 2.4, 12),
    new THREE.MeshStandardMaterial({ color: 0x0ea5a4 })
  );
  pole.position.y = 1.2;
  marker.add(pole);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.18, 12, 24),
    new THREE.MeshStandardMaterial({ color: 0xffc857 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.2;
  marker.add(ring);

  const sprite = new THREE.Sprite(jumpSpriteMat);
  sprite.scale.set(1.8, 1.2, 1);
  sprite.position.y = 2.7;
  marker.add(sprite);

  const x = (Math.random() - 0.5) * 70;
  const z = (Math.random() - 0.5) * 70;
  marker.position.set(x, 0, z);
  scene.add(marker);

  const client = {
    id: crypto.randomUUID(),
    name,
    zone,
    service,
    payout: service.payout + tip,
    energy: service.energy,
    rep: service.rep + Math.floor(Math.random() * 3),
    time: service.time,
    object: marker
  };
  clients.push(client);
}

function ensureClients() {
  while (clients.length < 5) spawnClient();
}

function startShift() {
  if (state.shiftActive) {
    log('Shift already active.');
    return;
  }
  state.shiftActive = true;
  state.slot = 1;
  ensureClients();
  log(`Day ${state.day} started. Clients are waiting.`);
  updateHud();
}

function endShift() {
  state.shiftActive = false;
  state.day += 1;
  state.energy = clamp(state.energy + 20, 0, 100);
  log('Shift ended. New day unlocked.');
  updateHud();
}

function rest() {
  state.energy = clamp(state.energy + 18, 0, 100);
  state.slot += 1;
  log('Took a break and recovered energy.');
  if (state.slot > state.maxSlots) endShift();
  updateHud();
}

function serveClient(client) {
  if (!state.shiftActive) {
    log('Start a shift before serving clients.');
    return;
  }
  if (state.energy < client.energy) {
    log('Not enough energy to serve. Take a break.');
    return;
  }
  state.energy = clamp(state.energy - client.energy, 0, 100);
  state.cash += client.payout;
  state.rep = clamp(state.rep + client.rep, 0, 100);
  state.slot += client.time;

  scene.remove(client.object);
  const index = clients.findIndex((c) => c.id === client.id);
  if (index >= 0) clients.splice(index, 1);

  playServiceOverlay();
  log(`Served ${client.name} in ${client.zone}. +$${client.payout}`);

  if (Math.random() < 0.18) {
    playAlert();
    state.rep = clamp(state.rep + 3, 0, 100);
    log('VIP shoutout! Reputation boosted.');
  }

  if (state.slot > state.maxSlots) endShift();
  ensureClients();
  updateHud();
}

function resetRun() {
  state.day = 1;
  state.slot = 1;
  state.energy = 100;
  state.rep = 50;
  state.cash = 0;
  state.shiftActive = false;
  state.log = [];
  state.activeClientId = null;
  clients.forEach((client) => scene.remove(client.object));
  clients.length = 0;
  log('Run reset. Ready when you are.');
  updateHud();
}

function updateActiveClient() {
  state.activeClientId = null;
  let closest = null;
  let minDist = 3.2;
  clients.forEach((client) => {
    const dist = player.position.distanceTo(client.object.position);
    if (dist < minDist) {
      minDist = dist;
      closest = client;
    }
  });
  if (closest) state.activeClientId = closest.id;
  if (els.prompt) {
    els.prompt.style.display = state.activeClientId ? 'block' : 'none';
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

const canvasElement = renderer.domElement;
canvasElement.addEventListener('click', () => {
  if (document.pointerLockElement !== canvasElement) {
    canvasElement.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvasElement) {
    log('Pointer locked.');
  } else {
    log('Pointer unlocked.');
  }
});

window.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== canvasElement) return;
  state.yaw -= event.movementX * 0.002;
  state.pitch -= event.movementY * 0.002;
  state.pitch = clamp(state.pitch, -0.4, 0.6);
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'w') state.keys.w = true;
  if (event.key === 'a') state.keys.a = true;
  if (event.key === 's') state.keys.s = true;
  if (event.key === 'd') state.keys.d = true;
  if (event.key === 'e') {
    const client = clients.find((c) => c.id === state.activeClientId);
    if (client) serveClient(client);
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'w') state.keys.w = false;
  if (event.key === 'a') state.keys.a = false;
  if (event.key === 's') state.keys.s = false;
  if (event.key === 'd') state.keys.d = false;
});

function updatePlayer(delta) {
  const speed = state.shiftActive ? 8 : 5;
  const forward = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  const dir = new THREE.Vector3();
  if (state.keys.w) dir.add(forward);
  if (state.keys.s) dir.add(forward.clone().multiplyScalar(-1));
  if (state.keys.a) dir.add(right.clone().multiplyScalar(-1));
  if (state.keys.d) dir.add(right);
  if (dir.lengthSq() > 0) dir.normalize();

  const targetVel = dir.multiplyScalar(speed);
  state.velocity.lerp(targetVel, 0.1);
  player.position.add(state.velocity.clone().multiplyScalar(delta));

  const bounds = 70;
  player.position.x = clamp(player.position.x, -bounds, bounds);
  player.position.z = clamp(player.position.z, -bounds, bounds);
  player.position.y = 0;

  player.rotation.y = state.yaw;
}

function updateCamera() {
  const offset = new THREE.Vector3(0, 4.5, 10);
  const rot = new THREE.Euler(state.pitch, state.yaw, 0, 'YXZ');
  const rotatedOffset = offset.clone().applyEuler(rot);
  const targetPos = player.position.clone().add(rotatedOffset);
  camera.position.lerp(targetPos, 0.08);
  const lookAt = player.position.clone().add(new THREE.Vector3(0, 2, 0));
  camera.lookAt(lookAt);
}

function animate() {
  const now = performance.now();
  animate.last = animate.last || now;
  const delta = (now - animate.last) / 1000;
  animate.last = now;

  updatePlayer(delta);
  updateCamera();
  masonBillboard.lookAt(camera.position);
  updateActiveClient();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

masonBillboard.lookAt(camera.position);

function setupUi() {
  document.getElementById('startShift').addEventListener('click', startShift);
  document.getElementById('restBtn').addEventListener('click', rest);
  document.getElementById('resetBtn').addEventListener('click', resetRun);
  els.soundToggle.addEventListener('click', () => {
    state.soundOn = !state.soundOn;
    els.soundToggle.textContent = `Sound: ${state.soundOn ? 'On' : 'Off'}`;
    if (state.soundOn) playAlert();
  });
}

log('Welcome to Mason\'s Life 3D. Click the scene to start.');
updateHud();
setupUi();
ensureClients();
animate();
