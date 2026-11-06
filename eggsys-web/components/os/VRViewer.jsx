import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { X, Loader2, AlertCircle, Move } from 'lucide-react';
import { buildDormRoom, createCase, SHELF_SLOT_COUNT } from '@/lib/vrRoomBuilder';
import { makeStoreTexture } from '@/lib/vrTextures';
import { makeHandModel } from '@/lib/vrHandModel';
import { base44 } from '@/api/base44Client';
import { getRatingMeta } from '@/lib/contentRatings';

// VR-only app: wraps the external Sandbox world. Loads inside EggetSystem
// instead of letting the sandbox take over its own XR session.
const SANDBOX_APP = {
  app_id: '__sandbox__',
  name: 'The Sandbox',
  version: 'VR',
  icon: '🌍',
  description: 'Owner-exclusive VR world',
  _sandbox_url: 'https://100010101110sandbox.base44.app',
  _vr_only: true,
  // Custom user-loaded models are not individually rated, so the world itself
  // carries a Mature rating for potential blood and violence.
  content_rating: 'mature',
};

/**
 * EggetSystem VR — a walkable dorm room.
 * - VR: thumbstick locomotion + controller ray to pick games off the shelf.
 * - Desktop: WASD to walk, mouse-drag to look, click a cartridge to play.
 * Selecting a cartridge streams its HTML content onto the desk monitor.
 */
export default function VRViewer({ installedApps = [], isOwner = false, ownerUsername = '', onClose }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sessionRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const dollyRef = useRef(null);
  const casesRef = useRef([]);
  const monitorRef = useRef(null);
  const homeButtonRef = useRef(null);
  const controllersRef = useRef([]);
  const gripsRef = useRef([]);
  const groupRef = useRef(null);
  const discsRef = useRef([]);
  const consoleRef = useRef(null);
  const consoleLedRef = useRef(null);
  const interactRef = useRef({ hands: [{ held: null, aWasDown: false }, { held: null, aWasDown: false }] });
  const handSidesRef = useRef([1, 1]);
  const runningAppRef = useRef(null);
  const goHomeRef = useRef(null);
  const ownedAppIdsRef = useRef([]);
  const availableAppsRef = useRef([]);
  const openedAppRef = useRef(null);
  const downloadAppRef = useRef(null);
  const storeButtonsRef = useRef([]);
  const raycaster = useRef(new THREE.Raycaster());
  const tempMatrix = useRef(new THREE.Matrix4());
  const iframeRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const keysRef = useRef({});

  const [xrSupported, setXrSupported] = useState(null);
  const [xrActive, setXrActive] = useState(false);
  const [openedApp, setOpenedApp] = useState(null);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [error, setError] = useState(null);
  const [hint, setHint] = useState(true);
  const [ownedApps, setOwnedApps] = useState([]);

  // ── WebXR support check ─────────────────────────────────────
  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr')
        .then(s => setXrSupported(s))
        .catch(() => setXrSupported(false));
    } else {
      setXrSupported(false);
    }
  }, []);

  // ── Three.js scene ──────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.xr.enabled = true;
    renderer.setClearColor(0x0a0a12, 1);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.05, 200);
    camera.position.set(0, 1.6, 0);
    cameraRef.current = camera;

    // Dolly holds the camera so we can move the player around the room.
    const dolly = new THREE.Group();
    dolly.position.set(0, 0, 3);
    dolly.add(camera);
    scene.add(dolly);
    dollyRef.current = dolly;

    const { group, monitor, homeButton, console: consoleMesh, consoleLed } = buildDormRoom(scene, []);
    monitorRef.current = monitor;
    homeButtonRef.current = homeButton;
    consoleRef.current = consoleMesh;
    consoleLedRef.current = consoleLed;
    groupRef.current = group;

    // ── VR Store: available apps (sandbox is owner-only) ────
    const availableApps = [...(isOwner ? [SANDBOX_APP] : []), ...installedApps];
    availableAppsRef.current = availableApps;

    // Monitor shows the store when idle (owned apps load async from account)
    monitor.material.map = makeStoreTexture(availableApps, []);
    monitor.material.needsUpdate = true;

    // Load owned apps from the user's EggetSystem account (VROwnedApp entity)
    const loadOwned = async () => {
      let ownedRecords = [];
      try { ownedRecords = await base44.entities.VROwnedApp.list(); } catch (_) {}
      // The owner always has The Sandbox on their shelf
      if (isOwner && !ownedRecords.some(r => r.app_id === '__sandbox__')) {
        try {
          const rec = await base44.entities.VROwnedApp.create({ app_id: '__sandbox__', app_name: 'The Sandbox', owner_username: ownerUsername });
          ownedRecords.push(rec);
        } catch (_) {}
      }
      const ownedIds = ownedRecords.map(r => r.app_id);
      ownedAppIdsRef.current = ownedIds;
      const owned = availableApps.filter(a => ownedIds.includes(a.app_id || '__sandbox__'));
      owned.forEach((app, i) => {
        if (i >= SHELF_SLOT_COUNT) return;
        const { case: caseMesh, disc } = createCase(app, i, group);
        casesRef.current.push(caseMesh);
        discsRef.current.push(disc);
      });
      setOwnedApps(owned);
      if (monitorRef.current && !openedAppRef.current && !runningAppRef.current) {
        monitorRef.current.material.map = makeStoreTexture(availableAppsRef.current, ownedIds);
        monitorRef.current.material.needsUpdate = true;
      }
    };
    loadOwned();

    // ── Store buttons: invisible hit planes on the monitor surface ──
    const storeButtons = [];
    {
      const cols = 4, rows = 3;
      const monW = 2.2, monH = 1.24;
      const headerH = monH * (72 / 720);
      const gridH = monH - headerH;
      const tileW = monW / cols, tileH = gridH / rows;
      for (let i = 0; i < cols * rows; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        const bz = 0.4 - monW / 2 + tileW / 2 + c * tileW;
        const by = 1.85 + monH / 2 - headerH - tileH / 2 - r * tileH;
        const btn = new THREE.Mesh(
          new THREE.PlaneGeometry(tileW * 0.9, tileH * 0.9),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
        );
        btn.position.set(4.12, by, bz);
        btn.rotation.y = -Math.PI / 2;
        btn.userData.isStoreButton = true;
        btn.userData.storeIndex = i;
        group.add(btn);
        storeButtons.push(btn);
      }
    }
    storeButtonsRef.current = storeButtons;

    // ── Capture canvas for app playback on the monitor ───────
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 1280; screenCanvas.height = 720;
    captureCanvasRef.current = screenCanvas;

    // ── Controllers (VR) ──────────────────────────────────────
    // Parented to the dolly so they ride along with locomotion and
    // actually track the player's hands through the room.
    for (let i = 0; i < 2; i++) {
      const ctrl = renderer.xr.getController(i);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -6)
      ]);
      ctrl.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 })));
      ctrl.visible = false;
      dolly.add(ctrl);
      controllersRef.current.push(ctrl);

      const grip = renderer.xr.getControllerGrip(i);
      grip.add(makeHandModel(i === 0 ? 'left' : 'right'));
      grip.visible = false;
      dolly.add(grip);
      gripsRef.current.push(grip);

      // Learn this controller's handedness so we can mirror the hand model and
      // map input sources to the correct grip (array order is NOT reliable).
      const slot = i;
      ctrl.addEventListener('connected', (e) => {
        ctrl.userData.handedness = e.data.handedness;
        const g = gripsRef.current[slot];
        if (g && g.children[0]) {
          g.children[0].scale.x = (e.data.handedness === 'left' ? -1.3 : 1.3);
        }
        handSidesRef.current[slot] = (e.data.handedness === 'left' ? -1 : 1);
      });
    }

    // ── Desktop interaction: click to select ─────────────────
    const onClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(ndc, camera);
      const targets = [...casesRef.current, homeButtonRef.current, ...storeButtonsRef.current].filter(Boolean);
      const hits = raycaster.current.intersectObjects(targets, false);
      if (!hits.length) return;
      const hit = hits[0];
      if (hit.object.userData.isStoreButton) handleStoreButtonClick(hit.object.userData.storeIndex);
      else handleHit(hit.object);
    };
    renderer.domElement.addEventListener('click', onClick);

    // ── Desktop look: drag to rotate ──────────────────────────
    let dragging = false, lastX = 0;
    const onDown = (e) => { dragging = true; lastX = e.clientX; };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      dolly.rotation.y -= dx * 0.005;
    };
    const onUp = () => { dragging = false; };
    renderer.domElement.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // ── Keyboard locomotion (desktop) ─────────────────────────
    const onKeyDown = (e) => { keysRef.current[e.key.toLowerCase()] = true; };
    const onKeyUp = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ── Animation loop ────────────────────────────────────────
    const speed = 0.05;
    const yaw = new THREE.Vector3();
    renderer.setAnimationLoop((time) => {
      // VR thumbstick locomotion
      const session = renderer.xr.getSession();
      if (session) {
        for (const source of session.inputSources) {
          if (!source.gamepad) continue;
          const axes = source.gamepad.axes;
          const x = axes[2] ?? axes[0] ?? 0;
          const y = axes[3] ?? axes[1] ?? 0;
          if (source.handedness === 'left') {
            if (Math.abs(x) > 0.08 || Math.abs(y) > 0.08) {
              moveDolly(x * speed, y * speed);
            }
          } else if (source.handedness === 'right') {
            // Right stick X = smooth turn (rotate the play space)
            if (Math.abs(x) > 0.08) {
              dollyRef.current.rotation.y -= x * 0.04;
            }
          }
        }
      } else {
        // Desktop WASD
        const k = keysRef.current;
        let mx = 0, mz = 0;
        if (k['w']) mz -= 1;
        if (k['s']) mz += 1;
        if (k['a']) mx -= 1;
        if (k['d']) mx += 1;
        if (mx || mz) moveDolly(mx * speed, mz * speed);
      }

      // VR controller input — polled every frame, matched to the correct hand
      // by handedness (the inputSources array order is NOT reliable, so indexing
      // grips by it grabs with the wrong hand and the proximity check never hits).
      if (session) {
        for (const source of session.inputSources) {
          const h = source.handedness;
          if (!h || h === 'none') continue;
          const slot = controllersRef.current.findIndex(c => c && c.userData.handedness === h);
          if (slot < 0) continue;
          const hs = interactRef.current.hands[slot];
          if (!source.gamepad) continue;
          const buttons = source.gamepad.buttons;
          // Any button press attempts a grab; releasing all buttons drops it.
          let anyDown = false;
          for (let b = 0; b < buttons.length; b++) anyDown = anyDown || (buttons[b] && buttons[b].pressed);
          if (anyDown && !hs.anyWasDown) onGripStart(slot);
          if (!anyDown && hs.anyWasDown) onGripEnd(slot);
          hs.anyWasDown = anyDown;
          // Trigger also clicks UI (store tiles / home button)
          const trigDown = !!(buttons[0] && buttons[0].pressed);
          if (trigDown && !hs.trigWasDown) {
            const ctrl = controllersRef.current[slot];
            if (ctrl) {
              rayFromController(ctrl);
              const targets = [homeButtonRef.current, ...storeButtonsRef.current].filter(Boolean);
              const hits = raycaster.current.intersectObjects(targets, false);
              if (hits.length) {
                const hit = hits[0];
                if (hit.object.userData.isStoreButton) handleStoreButtonClick(hit.object.userData.storeIndex);
                else if (hit.object.userData.isHomeBtn) goHome();
              }
            }
          }
          hs.trigWasDown = trigDown;
        }
      }

      // Auto-start: holding a disc and bringing it to the console starts the game
      if (session) {
        for (let i = 0; i < interactRef.current.hands.length; i++) {
          const hs = interactRef.current.hands[i];
          if (!hs.held || hs.held.kind !== 'disc') continue;
          const grip = gripsRef.current[i];
          if (!grip) continue;
          grip.updateWorldMatrix(true, false);
          const gp = new THREE.Vector3();
          grip.getWorldPosition(gp);
          const cpos = consoleRef.current ? consoleRef.current.position : null;
          if (cpos && gp.distanceTo(cpos) < 0.5) {
            insertDisc(hs.held.app, hs.held.caseMesh, hs.held.discMesh);
            hs.held = null;
            if (grip.children[0]) grip.children[0].visible = true;
          }
        }
      }

      // Hover highlight on cases
      let hovered = null;
      if (session) {
        for (const ctrl of controllersRef.current) {
          tempMatrix.current.identity().extractRotation(ctrl.matrixWorld);
          raycaster.current.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
          raycaster.current.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix.current);
          const hits = raycaster.current.intersectObjects(casesRef.current, false);
          if (hits.length) { hovered = hits[0].object; break; }
        }
      }
      casesRef.current.forEach((m) => {
        const isHov = m === hovered;
        m.material[4].emissive = isHov ? new THREE.Color(0x3b82f6) : new THREE.Color(0x000000);
        m.material[4].emissiveIntensity = isHov ? 0.5 : 0;
        m.scale.lerp(new THREE.Vector3().setScalar(isHov ? 1.12 : 1), 0.2);
      });

      // Store button hover — subtle highlight
      let hoveredBtn = null;
      if (session) {
        for (const ctrl of controllersRef.current) {
          tempMatrix.current.identity().extractRotation(ctrl.matrixWorld);
          raycaster.current.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
          raycaster.current.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix.current);
          const hits = raycaster.current.intersectObjects(storeButtonsRef.current.filter(b => b.visible), false);
          if (hits.length) { hoveredBtn = hits[0].object; break; }
        }
      }
      storeButtonsRef.current.forEach((b) => {
        b.material.opacity = b === hoveredBtn ? 0.18 : 0;
      });

      // Update monitor texture if app open
      if (monitorRef.current?.visible && monitorRef.current.material.map) {
        monitorRef.current.material.map.needsUpdate = true;
      }

      renderer.render(scene, camera);
    });

    // Keep player inside the room
    function moveDolly(x, z) {
      const d = dollyRef.current;
      const cam = cameraRef.current;
      // Walk in the direction the camera is facing (headset yaw in VR, dolly yaw on desktop)
      const camQuat = new THREE.Quaternion();
      cam.getWorldQuaternion(camQuat);
      const camYaw = new THREE.Euler().setFromQuaternion(camQuat, 'YXZ').y;
      const dir = new THREE.Vector3(x, 0, z);
      dir.applyEuler(new THREE.Euler(0, camYaw, 0));
      d.position.add(dir);
      d.position.x = Math.max(-4.2, Math.min(4.2, d.position.x));
      d.position.z = Math.max(-4.2, Math.min(4.2, d.position.z));
    }

    // ── VR disc / console interaction ─────────────────────────
    function setHeldTransform(mesh, kind, i) {
      // Hold the item in the palm (palm faces -X for right, +X for left)
      const side = handSidesRef.current[i] || 1;
      const x = -0.05 * side;
      if (kind === 'case') {
        mesh.position.set(x, 0, 0);
        mesh.rotation.set(0, Math.PI / 2, 0);
      } else {
        mesh.position.set(x, 0, 0);
        mesh.rotation.set(0, 0, Math.PI / 2);
      }
    }

    function rayFromController(ctrl) {
      ctrl.updateWorldMatrix(true, false);
      tempMatrix.current.identity().extractRotation(ctrl.matrixWorld);
      raycaster.current.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      raycaster.current.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix.current);
      return raycaster.current;
    }

    function onGripStart(i) {
      const hs = interactRef.current.hands[i];
      if (hs.held) return;
      const grip = gripsRef.current[i];
      if (!grip) return;
      // Grab the nearest visible case/disc within reach of the hand
      grip.updateWorldMatrix(true, false);
      const gp = new THREE.Vector3();
      grip.getWorldPosition(gp);
      const grabbables = [...casesRef.current, ...discsRef.current].filter(m => m.visible);
      let best = null, bestD = 0.8;
      for (const m of grabbables) {
        const mp = new THREE.Vector3();
        m.getWorldPosition(mp);
        const d = mp.distanceTo(gp);
        if (d < bestD) { bestD = d; best = m; }
      }
      if (!best) return;
      grab(i, best);
    }

    function grab(i, mesh) {
      const grip = gripsRef.current[i];
      const hs = interactRef.current.hands[i];
      let caseMesh, discMesh, app;
      if (mesh.userData.isCase) {
        // Auto-open: grab the case, hold its disc directly (no extra button)
        caseMesh = mesh; discMesh = mesh.userData.discMesh; app = mesh.userData.app;
        caseMesh.visible = false;
        groupRef.current.attach(caseMesh);
      } else if (mesh.userData.isDisc) {
        discMesh = mesh; caseMesh = mesh.userData.caseMesh; app = mesh.userData.app;
      } else {
        return;
      }
      grip.attach(discMesh);
      discMesh.visible = true;
      setHeldTransform(discMesh, 'disc', i);
      hs.held = { kind: 'disc', app, caseMesh, discMesh };
      // Hide the hand model — the held disc becomes your hand
      if (grip.children[0]) grip.children[0].visible = false;
    }

    function onGripEnd(i) {
      const hs = interactRef.current.hands[i];
      if (!hs.held) return;
      const grip = gripsRef.current[i];
      const { kind, caseMesh, discMesh } = hs.held;
      // Release always returns the item to its shelf slot
      if (kind === 'case') {
        groupRef.current.attach(caseMesh);
        const slot = caseMesh.userData.shelfPos;
        if (slot) { caseMesh.position.copy(slot); caseMesh.quaternion.identity(); }
      } else {
        discMesh.visible = false;
        groupRef.current.attach(discMesh);
        caseMesh.visible = true;
        groupRef.current.attach(caseMesh);
        const slot = caseMesh.userData.shelfPos;
        if (slot) { caseMesh.position.copy(slot); caseMesh.quaternion.identity(); }
      }
      hs.held = null;
      if (grip && grip.children[0]) grip.children[0].visible = true;
    }

    function toggleCase(i) {
      const hs = interactRef.current.hands[i];
      const grip = gripsRef.current[i];
      if (!hs.held || !grip) return;
      if (hs.held.kind === 'case') {
        const { caseMesh, discMesh } = hs.held;
        caseMesh.visible = false;
        groupRef.current.attach(caseMesh);
        grip.attach(discMesh);
        discMesh.visible = true;
        setHeldTransform(discMesh, 'disc', i);
        hs.held = { kind: 'disc', app: hs.held.app, caseMesh, discMesh };
      } else {
        const { caseMesh, discMesh } = hs.held;
        discMesh.visible = false;
        groupRef.current.attach(discMesh);
        grip.attach(caseMesh);
        caseMesh.visible = true;
        setHeldTransform(caseMesh, 'case', i);
        hs.held = { kind: 'case', app: hs.held.app, caseMesh, discMesh };
      }
    }

    function insertDisc(app, caseMesh, discMesh) {
      discMesh.visible = false;
      groupRef.current.attach(discMesh);
      caseMesh.visible = false;
      groupRef.current.attach(caseMesh);
      // return any previously-running app's case to the shelf first
      if (runningAppRef.current && runningAppRef.current.caseMesh !== caseMesh) {
        const prev = runningAppRef.current;
        prev.caseMesh.visible = true;
        groupRef.current.attach(prev.caseMesh);
        prev.caseMesh.position.copy(prev.caseMesh.userData.shelfPos);
        prev.caseMesh.quaternion.identity();
        prev.discMesh.visible = false;
      }
      runningAppRef.current = { app, caseMesh, discMesh };
      if (consoleLedRef.current) {
        consoleLedRef.current.material.emissive = new THREE.Color(0x22c55e);
        consoleLedRef.current.material.emissiveIntensity = 1;
      }
      if (app._sandbox_url) openSandbox();
      else openApp(app);
    }

    function handleHit(obj) {
      if (obj.userData.isCase) {
        const app = obj.userData.app;
        if (app._sandbox_url) {
          openSandbox();
        } else {
          openApp(app);
        }
      } else if (obj.userData.isHomeBtn) {
        goHome();
      }
    }

    function openApp(app) {
      setOpenedApp(app);
      openedAppRef.current = app;
      homeButtonRef.current.visible = true;
      setStoreActive(false);
      setHint(false);
    }
    function openSandbox() {
      if (sessionRef.current) { try { sessionRef.current.end(); } catch (_) {} }
      setSandboxOpen(true);
      openedAppRef.current = SANDBOX_APP;
      setStoreActive(false);
      setHint(false);
    }
    function goHome() {
      setOpenedApp(null);
      setSandboxOpen(false);
      openedAppRef.current = null;
      if (homeButtonRef.current) homeButtonRef.current.visible = false;
      setStoreActive(true);
      if (monitorRef.current) {
        monitorRef.current.material.map = makeStoreTexture(availableAppsRef.current, ownedAppIdsRef.current);
        monitorRef.current.material.needsUpdate = true;
      }
      // eject the running disc and put its case back on the shelf
      if (runningAppRef.current) {
        const { caseMesh, discMesh } = runningAppRef.current;
        caseMesh.visible = true;
        groupRef.current.attach(caseMesh);
        caseMesh.position.copy(caseMesh.userData.shelfPos);
        caseMesh.quaternion.identity();
        discMesh.visible = false;
        groupRef.current.attach(discMesh);
        runningAppRef.current = null;
      }
      if (consoleLedRef.current) {
        consoleLedRef.current.material.emissive = new THREE.Color(0x000000);
        consoleLedRef.current.material.emissiveIntensity = 0;
      }
    }
    goHomeRef.current = goHome;

    function downloadApp(app) {
      const appId = app.app_id || '__sandbox__';
      if (ownedAppIdsRef.current.includes(appId)) return;
      const slot = ownedAppIdsRef.current.length;
      if (slot >= SHELF_SLOT_COUNT) return;
      const { case: caseMesh, disc } = createCase(app, slot, groupRef.current);
      casesRef.current.push(caseMesh);
      discsRef.current.push(disc);
      const newOwned = [...ownedAppIdsRef.current, appId];
      ownedAppIdsRef.current = newOwned;
      base44.entities.VROwnedApp.create({ app_id: appId, app_name: app.name, owner_username: ownerUsername }).catch(() => {});
      setOwnedApps(prev => [...prev, app]);
      if (monitorRef.current && !openedAppRef.current && !runningAppRef.current) {
        monitorRef.current.material.map = makeStoreTexture(availableAppsRef.current, newOwned);
        monitorRef.current.material.needsUpdate = true;
      }
    }
    downloadAppRef.current = downloadApp;

    function handleStoreButtonClick(index) {
      if (openedAppRef.current || runningAppRef.current) return;
      const apps = availableAppsRef.current.slice(0, 12);
      if (index < 0 || index >= apps.length) return;
      const app = apps[index];
      const appId = app.app_id || '__sandbox__';
      if (ownedAppIdsRef.current.includes(appId)) return;
      downloadApp(app);
    }

    function setStoreActive(active) {
      storeButtonsRef.current.forEach(b => { b.visible = active; });
    }

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('mousedown', onDown);
      renderer.setAnimationLoop(null);
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [installedApps, isOwner]);

  // ── Stream opened app's HTML onto the monitor ───────────────
  useEffect(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (!openedApp) return;

    if (!openedApp.html_content) {
      // No HTML — show the cartridge art on the monitor
      import('@/lib/vrTextures').then(({ makeCaseTexture }) => {
        const tex = makeCaseTexture(openedApp);
        if (monitorRef.current) {
          monitorRef.current.material.map = tex;
          monitorRef.current.material.needsUpdate = true;
        }
      });
      return;
    }

    const capture = async () => {
      if (!iframeRef.current || !captureCanvasRef.current) return;
      try {
        const html2canvas = (await import('html2canvas')).default;
        const doc = iframeRef.current.contentDocument;
        if (!doc?.body) return;
        await html2canvas(doc.body, {
          canvas: captureCanvasRef.current,
          scale: 1, useCORS: true, allowTaint: true, logging: false,
          width: 1280, height: 720
        });
        if (monitorRef.current) {
          monitorRef.current.material.map.needsUpdate = true;
        }
      } catch (_) {}
    };

    // Point monitor at the capture canvas
    const tex = new THREE.CanvasTexture(captureCanvasRef.current);
    if (monitorRef.current) {
      monitorRef.current.material.map = tex;
      monitorRef.current.material.needsUpdate = true;
    }
    const t = setTimeout(() => {
      capture();
      captureIntervalRef.current = setInterval(capture, 500);
    }, 1500);
    return () => clearTimeout(t);
  }, [openedApp]);

  // ── Enter / exit VR ──────────────────────────────────────────
  const enterVR = async () => {
    if (!rendererRef.current) return;
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
      });
      rendererRef.current.xr.setSession(session);
      sessionRef.current = session;
      // Start the player standing in the room, facing the back wall.
      if (dollyRef.current) {
        dollyRef.current.rotation.y = 0;
        dollyRef.current.position.set(0, 0, 3);
      }
      setXrActive(true);
      session.addEventListener('end', () => { setXrActive(false); sessionRef.current = null; });
    } catch (e) {
      setError('Could not start VR: ' + e.message);
    }
  };
  const exitVR = () => sessionRef.current?.end();

  // Show the hands only while an XR session is active.
  useEffect(() => {
    controllersRef.current.forEach(c => { c.visible = xrActive; });
    gripsRef.current.forEach(g => { g.visible = xrActive; });
  }, [xrActive]);

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      {openedApp?.html_content && (
        <iframe
          ref={iframeRef}
          srcDoc={openedApp.html_content}
          className="absolute opacity-0 pointer-events-none"
          style={{ width: 1280, height: 720, left: -9999, top: -9999 }}
          sandbox="allow-scripts allow-same-origin"
          title="vr-app"
        />
      )}

      <div ref={mountRef} className="flex-1" />

      {/* The Sandbox — loads the external world inside EggetSystem */}
      {sandboxOpen && (
        <div className="absolute inset-0 z-[310] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-black/90 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌍</span>
              <div>
                <p className="text-white font-bold text-sm">The Sandbox</p>
                <p className="text-white/40 text-xs">Running inside EggetSystem VR</p>
              </div>
              {(() => { const m = getRatingMeta(SANDBOX_APP.content_rating); return (
                <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-semibold border border-orange-400/60 bg-orange-500/20 text-orange-200" title="Custom models are not individually rated — Mature for blood and violence">{m.label}</span>
              ); })()}
            </div>
            <Button size="sm" variant="outline" onClick={() => goHomeRef.current && goHomeRef.current()} className="border-white/30 text-white bg-black/40">
              <X className="w-4 h-4" /> Back to Room
            </Button>
          </div>
          <iframe
            src={SANDBOX_APP._sandbox_url}
            className="flex-1 w-full border-0"
            allow="xr-spatial-tracking; fullscreen; autoplay; vr"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            title="The Sandbox"
          />
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-lg">🥽</div>
          <div>
            <p className="text-white font-bold text-sm">EggetSystem VR — Dorm</p>
            <p className="text-white/50 text-xs">
              {openedApp ? `Playing: ${openedApp.name}` : `${ownedApps.length} games on your shelf`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          {xrActive ? (
            <Button size="sm" variant="outline" onClick={exitVR} className="border-white/30 text-white bg-black/40">Exit VR</Button>
          ) : xrSupported === null ? (
            <Button size="sm" disabled variant="outline" className="border-white/30 text-white"><Loader2 className="w-4 h-4 animate-spin" /></Button>
          ) : xrSupported ? (
            <Button size="sm" onClick={enterVR} className="bg-purple-600 hover:bg-purple-700">🥽 Enter VR</Button>
          ) : (
            <span className="text-yellow-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Desktop mode</span>
          )}
          <Button size="sm" variant="outline" onClick={onClose} className="border-white/30 text-white bg-black/40">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Hint */}
      {hint && !xrActive && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur rounded-2xl px-5 py-3 text-center pointer-events-none">
          <p className="text-white/90 text-sm font-medium flex items-center gap-2 justify-center">
            <Move className="w-4 h-4" /> WASD to walk · drag to look · click the TV to open the VR Store
          </p>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gradient-to-t from-black/80 to-transparent text-center pointer-events-none">
        <p className="text-white/40 text-xs">
          {xrActive
            ? 'Left stick to walk · right stick to turn · point at the TV and trigger to download · grip a case (any button) · bring the disc to the console'
            : 'Click the TV to browse the VR Store · download apps to your shelf · then click a case to play'}
        </p>
      </div>
    </div>
  );
}