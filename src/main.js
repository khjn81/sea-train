import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./style.css";
import { buildCarriage } from "./carriage.js";
import { buildOcean } from "./ocean.js";
import { buildAtmosphere } from "./atmosphere.js";
import {
  passenger,
  pose,
  act,
  updatePassenger,
  identity,
  nameTag,
  disposePassenger,
} from "./passenger.js";
import {
  readPreference,
  writePreference,
  readVolumePercent,
} from "./preferences.js";
import { showGraphicsFailure } from "./graphics.js";

function startTrain() {
  const lifetime = new AbortController();
  let graphicsLost = false,
    frameHandle = 0,
    guideTimer,
    environmentDirty = false;
  function listen(target, type, callback) {
    target.addEventListener(type, callback, { signal: lifetime.signal });
  }
  const icons = { wave: "♧", seat: "▤", window: "◌", tea: "♨", stand: "♙" };
  const names = [
    "느린 파도",
    "다정한 달빛",
    "작은 노을",
    "고요한 조약돌",
    "포근한 구름",
    "느긋한 바람",
    "따뜻한 별빛",
    "은은한 물결",
    "조용한 소라",
    "맑은 새벽",
  ];
  const $ = (s) => document.querySelector(s),
    v = (x, y, z) => new THREE.Vector3(x, y, z);
  $("#app").innerHTML =
    `<div id="scene" role="img" aria-label="노을 바다를 달리는 기차의 객실"></div><div class="vignette"></div>
<header class="top"><div class="brand"><span class="brand-icon">▥</span><strong>바다행</strong><small>노을 열차 · 1호차</small></div><div class="toolbar"><button id="people" aria-label="함께 있는 승객 보기">♙ <span id="count">1</span></button><button id="sound" aria-pressed="false" aria-label="환경음 켜기">♪ 소리</button><button id="capture" aria-label="지금 장면 담기">▧</button><button id="settings" aria-label="설정">☷</button></div></header>
<div id="connection-state" class="connection-state" role="status" aria-live="polite"></div><div class="demo-badge">데모 동승 10명</div><div class="guide">바닥을 눌러 걸어요 · 드래그로 둘러보기</div>
<div class="title-card"><strong>바다 위를 천천히 달리는 중</strong><small>말없이 함께, 잠시 쉬어가요.</small></div><div id="journey-state" role="status"></div><div class="toast" role="status"></div>
<section id="action-panel" class="action-panel" hidden aria-label="쉬어가는 방법"><header>어떻게 쉬어갈까요?<small>빈자리에 앉아서 천천히</small></header><div class="action-choices"><button data-action="tea"><span>♨</span>차 마시기</button><button data-action="read"><span>▥</span>책 읽기</button><button data-action="stretch"><span>↟</span>기지개</button><button data-action="idle"><span>◌</span>가만히 쉬기</button></div></section>
<nav class="dock" aria-label="기차에서 할 일"><button id="greet"><span>${icons.wave}</span>손 인사</button><button id="sit"><span>${icons.seat}</span>자리 앉기</button><button id="relax" aria-expanded="false"><span>${icons.tea}</span>쉬어가기</button><button id="look" aria-pressed="false"><span>${icons.window}</span>창밖 보기</button><button id="stand" disabled><span>${icons.stand}</span>일어나기</button></nav>
<div class="modal-backdrop" id="modal" hidden><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title"></h2><button class="close" aria-label="닫기">×</button></header><div id="modal-content"></div></section></div>`;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e7a184");
  const camera = new THREE.PerspectiveCamera(
    55,
    innerWidth / innerHeight,
    0.1,
    360,
  );
  camera.position.set(0, 3.3, 8.8);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    showGraphicsFailure();
    return;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  $("#scene").appendChild(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    "aria-label",
    "기차 둘러보기. 방향키로 걷고 Enter로 앉으며 Escape로 멈춰요.",
  );
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.4, -3);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 1.8;
  controls.maxDistance = 20;
  controls.minPolarAngle = 0.43;
  controls.maxPolarAngle = 1.47;
  controls.update();
  scene.add(new THREE.HemisphereLight("#ffe8c8", "#a29885", 2.6));
  const sun = new THREE.DirectionalLight("#ffbb8c", 2.1);
  sun.position.set(-6, 7, -5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -10,
    right: 10,
    top: 14,
    bottom: -14,
    near: 0.5,
    far: 35,
  });
  sun.shadow.bias = -0.001;
  scene.add(sun);
  const panorama = buildAtmosphere(scene, () => {
    environmentDirty = true;
  });
  const oceanTick = buildOcean(scene, panorama);
  const { seats, targets } = buildCarriage(scene);
  for (const z of [-5, 4]) {
    const lamp = new THREE.PointLight("#ffe3b2", 9, 12, 2);
    lamp.position.set(0, 3.9, z);
    scene.add(lamp);
  }
  const reflection = new THREE.WebGLCubeRenderTarget(64, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const probe = new THREE.CubeCamera(0.1, 140, reflection);
  probe.position.set(0, 2.2, 0);
  probe.update(renderer, scene);
  scene.environment = reflection.texture;
  const floorHit = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.03, 18),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  floorHit.position.y = 0.12;
  scene.add(floorHit);
  const demos = [1, 4, 7, 10, 13, 16, 19, 20, 22, 3];
  const demoChars = demos.map((id, i) => {
    const c = passenger(scene, i);
    c.position.set(seats[id].x, 0, seats[id].z);
    pose(c, true);
    act(c, ["tea", "read", "idle"][i % 3]);
    nameTag(c, names[i] + " · 데모");
    return c;
  });
  const player = passenger(scene, 4);
  player.position.set(0, 0, 4.8);
  player.rotation.y = Math.PI;
  nameTag(player, "나");
  const remote = new Map();
  let users = [],
    me = null,
    socket,
    connected = false,
    reconnectTimer,
    networkPhase = "connecting";
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  let motionOverride = readPreference("sea:reduced");
  let seat = null,
    request = 0,
    waiter = null,
    route = [],
    afterWalk = null,
    walking = false,
    action = "idle",
    lookMode = false,
    cameraGoal = null,
    savedView = null,
    desiredAction = "idle",
    reduced =
      motionOverride === null ? motionQuery.matches : motionOverride === "true";
  listen(motionQuery, "change", (event) => {
    if (motionOverride === null) {
      reduced = event.matches;
      const checkbox = $("#reduce");
      if (checkbox) checkbox.checked = reduced;
    }
  });
  let journeyEpoch = 0;
  const actionNames = {
    idle: "가만히 쉬는 중",
    tea: "따뜻한 차를 마시는 중",
    read: "책을 읽는 중",
    stretch: "기지개를 켜는 중",
  };
  function send(message) {
    if (connected && socket?.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify(message));
  }
  function aim(position, target) {
    controls.enableDamping = false;
    controls.update();
    controls.enabled = false;
    cameraGoal = { position, target };
  }
  let toastTimer;
  function toast(text) {
    if (graphicsLost) return;
    $(".toast").textContent = text;
    $(".toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $(".toast").classList.remove("show"), 2800);
  }
  function ui() {
    $("#connection-state").textContent = connected
      ? "함께 쉬는 중"
      : networkPhase === "connecting"
        ? "동승객을 찾는 중"
        : "혼자 둘러보는 중";
    $("#count").textContent = connected ? users.length : "1";
    $("#people").title = connected
      ? `실제 접속 ${users.length}명`
      : "연결 끊김 · 혼자 둘러보는 중";
    $("#sit").disabled = walking || !!waiter || seat !== null;
    $("#stand").disabled = seat === null && !walking;
    $("#look").disabled = walking;
    $("#sit").setAttribute("aria-pressed", String(seat !== null && !walking));
    $("#look").setAttribute("aria-pressed", String(lookMode));
    $("#journey-state").textContent = walking
      ? "자리로 천천히 걷는 중 · 일어나기로 멈출 수 있어요"
      : seat !== null
        ? actionNames[action]
        : "";
    document.body.classList.toggle("resting", lookMode);
    for (const button of document.querySelectorAll("[data-action]"))
      button.setAttribute(
        "aria-pressed",
        String(seat !== null && button.dataset.action === action),
      );
  }
  function sync() {
    const ids = new Set(users.filter((u) => u.id !== me).map((u) => u.id));
    for (const [id, c] of remote)
      if (!ids.has(id)) {
        disposePassenger(c);
        remote.delete(id);
      }
    for (const u of users) {
      if (u.id === me) continue;
      let c = remote.get(u.id);
      const seated = u.mode === "seated" && u.seat !== null;
      const target = seated
        ? v(seats[u.seat].x, 0, seats[u.seat].z)
        : v(u.x, 0, u.z);
      if (!c) {
        c = passenger(scene, 0);
        identity(c, u.id);
        nameTag(c, u.name);
        c.position.copy(target);
        remote.set(u.id, c);
      }
      c.userData.target = target;
      c.userData.yaw = seated ? 0 : u.yaw;
      c.userData.moving = u.mode === "walking" ? 1 : 0;
      pose(c, seated);
      act(c, u.action || "idle");
    }
    ui();
  }
  function connect() {
    if (graphicsLost) return;
    clearTimeout(reconnectTimer);
    if (navigator.onLine === false) {
      networkPhase = "offline";
      ui();
      return;
    }
    if (
      socket &&
      [WebSocket.CONNECTING, WebSocket.OPEN].includes(socket.readyState)
    )
      return;
    networkPhase = "connecting";
    ui();
    const endpoint =
      import.meta.env.VITE_REALTIME_URL ||
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/realtime`;
    const connection = (socket = new WebSocket(endpoint));
    socket.onopen = () => {
      if (socket !== connection) return;
      connected = true;
      networkPhase = "online";
      ui();
    };
    socket.onmessage = (e) => {
      if (socket !== connection) return;
      try {
        const d = JSON.parse(e.data);
        if (d.type === "welcome") {
          me = d.id;
          identity(player, me);
          if (seat !== null || walking) {
            route = [];
            afterWalk = null;
            walking = false;
            seat = null;
            pose(player, false);
            setAction("idle", false);
            toast("다시 연결됐어요. 자리를 다시 골라주세요.");
          }
        }
        if (d.type === "state") {
          users = d.users;
          sync();
        }
        if (d.type === "seat-granted" && waiter?.id === d.requestId) {
          const callback = waiter.resolve;
          clearTimeout(waiter.timer);
          waiter = null;
          callback(d.seat);
        }
        if (d.type === "seat-rejected" && waiter?.id === d.requestId) {
          const callback = waiter.resolve;
          clearTimeout(waiter.timer);
          waiter = null;
          callback(null);
        }
        if (d.type === "greet" && d.id !== me) {
          const c = remote.get(d.id);
          if (c) {
            c.userData.wave = performance.now();
            c.userData.tag.visible = true;
            c.userData.showName = performance.now();
          }
          toast(`${d.name} 님이 손을 흔들었어요`);
        }
      } catch {}
    };
    socket.onclose = () => {
      if (socket !== connection) return;
      connected = false;
      networkPhase = "offline";
      users = [];
      if (waiter) {
        clearTimeout(waiter.timer);
        const cb = waiter.resolve;
        waiter = null;
        cb(null);
      }
      sync();
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 4000);
    };
    socket.onerror = () => connection.close();
  }
  listen(window, "offline", () => {
    connected = false;
    networkPhase = "offline";
    users = [];
    socket?.close();
    sync();
  });
  listen(window, "online", () => {
    clearTimeout(reconnectTimer);
    connect();
  });
  function reserve(id) {
    if (!connected) return Promise.resolve(id);
    return new Promise((resolve) => {
      const seq = ++request;
      waiter = {
        id: seq,
        resolve,
        timer: setTimeout(() => {
          if (waiter?.id === seq) {
            waiter = null;
            send({ type: "leave" });
            resolve(null);
            ui();
          }
        }, 4000),
      };
      send({ type: "seat", seat: id, requestId: seq });
      ui();
    });
  }
  function setAction(next, network = true) {
    action = next;
    act(player, next);
    if (network) send({ type: "action", action: next });
    ui();
  }
  function beginRoute(points, done) {
    route = points.filter((p) => p.distanceTo(player.position) > 0.05);
    afterWalk = done;
    walking = route.length > 0;
    pose(player, false);
    setAction("idle", false);
    lookMode = false;
    ui();
    if (!walking) {
      const fn = afterWalk;
      afterWalk = null;
      fn?.();
    }
  }
  function leavePath() {
    if (seat === null || !player.userData.sitting)
      return Math.abs(player.position.x) > 0.8
        ? [v(0, 0, player.position.z)]
        : [];
    const s = seats[seat];
    return [v(s.x, 0, s.z + 0.85), v(0, 0, s.z + 0.85)];
  }
  async function sit(id) {
    if (walking || waiter) return;
    if (demos.includes(id) || users.some((u) => u.id !== me && u.seat === id)) {
      toast("이미 누군가 앉아 있어요.");
      return;
    }
    const epoch = ++journeyEpoch;
    const exit = leavePath();
    if (seat !== null) {
      send({ type: "leave" });
      seat = null;
    }
    const granted = await reserve(id);
    if (epoch !== journeyEpoch) return;
    if (granted === null) {
      toast("자리가 먼저 찼어요. 다른 자리를 골라주세요.");
      return;
    }
    seat = id;
    const s = seats[id];
    beginRoute(
      [...exit, v(0, 0, s.z + 0.85), v(s.x, 0, s.z + 0.85), v(s.x, 0, s.z)],
      () => {
        player.rotation.y = 0;
        pose(player, true);
        send({ type: "settle" });
        setAction(desiredAction);
        aim(
          v(s.x * 0.48, 2.65, Math.min(9.5, s.z + 3.7)),
          v(s.x, 1.05, s.z + 0.25),
        );
        toast("여기서 천천히 쉬어가세요.");
        ui();
      },
    );
  }
  function nearestSeat() {
    return seats
      .map((s, i) => ({
        i,
        d: Math.hypot(s.x - player.position.x, s.z - player.position.z),
      }))
      .filter(
        (s) =>
          !demos.includes(s.i) &&
          !users.some((u) => u.id !== me && u.seat === s.i),
      )
      .sort((a, b) => a.d - b.d)[0]?.i;
  }
  function stand() {
    journeyEpoch++;
    if (waiter) {
      clearTimeout(waiter.timer);
      const cancel = waiter.resolve;
      waiter = null;
      cancel(null);
    }
    const exit = leavePath();
    route = [];
    afterWalk = null;
    walking = false;
    seat = null;
    lookMode = false;
    desiredAction = "idle";
    pose(player, false);
    setAction("idle", false);
    send({ type: "leave" });
    beginRoute(exit, () => {
      send({ type: "stop" });
      ui();
    });
    aim(
      v(0, 3.1, Math.min(9.5, player.position.z + 4)),
      v(0, 1.4, player.position.z - 4),
    );
    ui();
  }
  function walkTo(p) {
    const exit = leavePath();
    seat = null;
    send({ type: "leave" });
    beginRoute([...exit, p], () => {
      send({ type: "stop" });
      ui();
    });
  }
  const ray = new THREE.Raycaster(),
    mouse = new THREE.Vector2();
  let downAt;
  listen(
    renderer.domElement,
    "pointerdown",
    (e) => (downAt = [e.clientX, e.clientY]),
  );
  listen(renderer.domElement, "pointerup", (e) => {
    if (
      !downAt ||
      Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8 ||
      walking ||
      waiter
    )
      return;
    mouse.set(
      (e.clientX / innerWidth) * 2 - 1,
      (-e.clientY / innerHeight) * 2 + 1,
    );
    ray.setFromCamera(mouse, camera);
    const charHit = ray.intersectObjects(
      [player, ...demoChars, ...remote.values()],
      true,
    )[0];
    if (charHit) {
      let p = charHit.object;
      while (p && !p.userData.name) p = p.parent;
      if (p) {
        p.userData.tag.visible = true;
        p.userData.showName = performance.now();
        toast(p.userData.name);
      }
      return;
    }
    const hit = ray.intersectObjects([...targets, floorHit])[0];
    if (!hit) return;
    if (hit.object === floorHit)
      walkTo(
        v(
          THREE.MathUtils.clamp(hit.point.x, -0.65, 0.65),
          0,
          THREE.MathUtils.clamp(hit.point.z, -8.8, 8.8),
        ),
      );
    else {
      desiredAction = "idle";
      sit(hit.object.userData.seat);
    }
  });
  function closeActions(restoreFocus = false) {
    const panel = $("#action-panel");
    const wasOpen = !panel.hidden;
    panel.hidden = true;
    $("#relax").setAttribute("aria-expanded", "false");
    if (restoreFocus && wasOpen) $("#relax").focus();
  }
  $("#sit").onclick = () => {
    desiredAction = "idle";
    const id = nearestSeat();
    if (id !== undefined) sit(id);
    else toast("지금은 빈자리가 없어요.");
  };
  $("#stand").onclick = stand;
  $("#greet").onclick = () => {
    player.userData.wave = performance.now();
    send({ type: "greet" });
    toast("동승객에게 조용히 손을 흔들었어요.");
  };
  $("#relax").onclick = () => {
    const panel = $("#action-panel");
    panel.hidden = !panel.hidden;
    $("#relax").setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) panel.querySelector("button")?.focus();
  };
  $("#action-panel").onclick = (e) => {
    const button = e.target.closest("[data-action]");
    if (!button) return;
    const next = button.dataset.action;
    closeActions();
    desiredAction = next;
    if (walking) {
      toast("자리에 도착하면 시작할게요.");
      return;
    }
    if (seat !== null) setAction(next);
    else {
      const id = nearestSeat();
      if (id !== undefined) sit(id);
      else toast("앉을 자리가 없어요.");
    }
  };
  listen(document, "pointerdown", (event) => {
    if (!event.target.closest("#action-panel,#relax")) closeActions();
  });
  $("#look").onclick = () => {
    if (walking) return;
    lookMode = !lookMode;
    if (lookMode) {
      savedView = {
        position: camera.position.clone(),
        target: controls.target.clone(),
      };
      const s =
        seat !== null
          ? seats[seat]
          : { side: player.position.x > 0 ? 1 : -1, z: player.position.z };
      const pane = -10 + (Math.floor((s.z + 10) / 2.8) + 0.5) * 2.8;
      aim(
        v(s.side * 2.65, 2.05, Math.min(9, pane + 0.1)),
        v(s.side * 10, 1.85, pane - 0.1),
      );
    } else if (savedView) aim(savedView.position, savedView.target);
    ui();
  };
  // Quiet rail sound: filtered air and a soft, repeating wheel rhythm share scene time.
  let audio,
    master,
    railGain,
    airGain,
    volume = readVolumePercent() / 100;
  async function toggleSound() {
    if (!audio) {
      audio = new AudioContext();
      master = audio.createGain();
      master.gain.value = volume;
      master.connect(audio.destination);
      const b = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate),
        data = b.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const air = audio.createBufferSource(),
        filter = audio.createBiquadFilter();
      airGain = audio.createGain();
      air.buffer = b;
      air.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 350;
      airGain.gain.value = 0.06;
      air.connect(filter).connect(airGain).connect(master);
      air.start();
      const wheel = audio.createOscillator();
      wheel.type = "sine";
      wheel.frequency.value = 65;
      railGain = audio.createGain();
      railGain.gain.value = 0.02;
      wheel.connect(railGain).connect(master);
      wheel.start();
      await audio.resume();
    } else if (audio.state === "running") await audio.suspend();
    else await audio.resume();
    const on = audio.state === "running";
    updateSoundButton(on);
    toast(on ? "차창과 레일의 소리가 들려요." : "소리를 껐어요.");
  }
  let audioChanging = false;
  function updateSoundButton(on) {
    const button = $("#sound");
    if (!button) return;
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "환경음 끄기" : "환경음 켜기");
    button.textContent = on ? "♪ 켜짐" : "♪ 소리";
  }
  $("#sound").onclick = async () => {
    if (audioChanging) return;
    audioChanging = true;
    $("#sound").disabled = true;
    try {
      await toggleSound();
      updateSoundButton(audio?.state === "running");
    } catch {
      try {
        await audio?.close();
      } catch {}
      audio = null;
      master = null;
      railGain = null;
      airGain = null;
      updateSoundButton(false);
      toast("지금은 소리를 켤 수 없어요. 소리 없이도 쉬어갈 수 있어요.");
    } finally {
      audioChanging = false;
      const button = $("#sound");
      if (button) button.disabled = false;
    }
  };
  const modal = $("#modal"),
    content = $("#modal-content");
  let focusBeforeModal,
    modalIsolation = [];
  function openModal(title, html) {
    if (modal.hidden) {
      focusBeforeModal = document.activeElement;
      modalIsolation = [...$("#app").children]
        .filter((el) => el !== modal)
        .map((el) => [el, el.inert]);
    }
    $("#modal-title").textContent = title;
    content.innerHTML = html;
    for (const [el] of modalIsolation) el.inert = true;
    modal.hidden = false;
    modal.querySelector(".close").focus();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    for (const [el, wasInert] of modalIsolation) el.inert = wasInert;
    modalIsolation = [];
    if (focusBeforeModal?.isConnected && !focusBeforeModal.disabled)
      focusBeforeModal.focus();
  }
  modal.querySelector(".close").onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
  listen(document, "keydown", (e) => {
    if (e.key === "Escape") {
      if (!modal.hidden) {
        closeModal();
        return;
      }
      if (!$("#action-panel").hidden) {
        closeActions(true);
        return;
      }
      if (walking || seat !== null || waiter) {
        e.preventDefault();
        stand();
      }
      return;
    }
    if (e.target === renderer.domElement && modal.hidden) {
      const step = {
        ArrowUp: [0, -0.8],
        ArrowDown: [0, 0.8],
        ArrowLeft: [-0.6, 0],
        ArrowRight: [0.6, 0],
      }[e.key];
      if (step) {
        e.preventDefault();
        if (!walking && !waiter)
          walkTo(
            v(
              THREE.MathUtils.clamp(player.position.x + step[0], -0.65, 0.65),
              0,
              THREE.MathUtils.clamp(player.position.z + step[1], -8.8, 8.8),
            ),
          );
      } else if (e.key === "Enter") {
        e.preventDefault();
        $("#sit").click();
      }
    }
    if (e.key === "Tab" && !modal.hidden) {
      const buttons = [
        ...modal.querySelectorAll(
          "button,input,a[href],select,textarea,[tabindex]",
        ),
      ].filter(
        (e) => !e.disabled && e.tabIndex >= 0 && e.getClientRects().length,
      );
      const first = buttons[0],
        last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  $("#people").onclick = () =>
    openModal(
      "함께 있는 승객",
      `<p>실제 접속 ${connected ? users.length : 1}명 · 데모 동승 ${demoChars.length}명</p>${users.length ? users.map((u) => `<div class="passenger"><i>♙</i>${escape(u.name)}<small>${u.id === me ? "나" : u.mode === "seated" ? actionNames[u.action] : "천천히 걷는 중"}</small></div>`).join("") : `<div class="passenger"><i>♙</i>여행하는 구름<small>나 · 오프라인</small></div>`}${names.map((name, i) => `<div class="passenger"><i>♙</i>${name}<small>데모 · ${["차 마시기", "독서", "휴식"][i % 3]}</small></div>`).join("")}<p>승객을 누르면 이름을 볼 수 있어요.</p>`,
    );
  $("#settings").onclick = () => {
    openModal(
      "편하게 쉬어가기",
      `<div class="setting"><label for="volume">기차 소리 크기</label><input type="range" id="volume" min="0" max="100" value="${Math.round(volume * 100)}"><output id="volume-value">${Math.round(volume * 100)}%</output></div><div class="setting"><label class="checkline"><input type="checkbox" id="reduce" ${reduced ? "checked" : ""}> 움직임 줄이기</label><p>객실의 작은 흔들림과 소품 효과를 줄여요.</p></div><p>바닥을 눌러 걷고, 빈 좌석을 눌러 앉아요. 쉬어가기에서 차·책·기지개를 선택할 수 있어요.</p><p>데모 승객은 실제 접속 인원에 포함되지 않아요.</p>`,
    );
    $("#volume").oninput = (e) => {
      volume = Number(e.target.value) / 100;
      $("#volume-value").textContent = `${e.target.value}%`;
      writePreference("sea:volume", String(e.target.value));
      if (master) master.gain.setTargetAtTime(volume, audio.currentTime, 0.1);
    };
    $("#reduce").onchange = (e) => {
      reduced = e.target.checked;
      motionOverride = String(reduced);
      writePreference("sea:reduced", motionOverride);
    };
  };
  let postcardUrl;
  $("#capture").onclick = () => {
    renderer.render(scene, camera);
    const postcard = document.createElement("canvas");
    postcard.width = renderer.domElement.width;
    postcard.height = renderer.domElement.height;
    const ctx = postcard.getContext("2d");
    ctx.drawImage(renderer.domElement, 0, 0);
    const size = postcard.width / 60;
    ctx.fillStyle = "rgba(30,26,24,.55)";
    ctx.fillRect(0, postcard.height - size * 3, postcard.width, size * 3);
    ctx.fillStyle = "#fff2db";
    ctx.font = `${size}px serif`;
    ctx.fillText(
      "바다행 · 말없이 함께 쉬어가는 기차",
      size,
      postcard.height - size,
    );
    const url = postcard.toDataURL("image/png");
    postcardUrl = url;
    openModal(
      "오늘의 차창",
      `<img class="postcard" alt="방금 기차에서 담은 장면" src="${url}"><a class="download" href="${url}" download="바다행-차창.png">이미지 저장</a><p>지금 이 순간을 한 장에 담았어요.</p>`,
    );
  };
  listen(window, "resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  let lastMove = 0,
    activeTime = 0;
  const clock = new THREE.Clock();
  listen(document, "visibilitychange", () => {
    if (document.hidden && audio?.state === "running")
      void audio
        .suspend()
        .then(() => updateSoundButton(audio?.state === "running"))
        .catch(() => updateSoundButton(false));
  });
  function frame() {
    if (graphicsLost) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (document.hidden) {
      frameHandle = requestAnimationFrame(frame);
      return;
    }
    const time = (activeTime += dt);
    if (environmentDirty) {
      probe.update(renderer, scene);
      environmentDirty = false;
    }
    oceanTick(time);
    const railPhase = (time * 1.3) % 1;
    if (audio?.state === "running")
      railGain.gain.setTargetAtTime(
        0.012 +
          0.045 * Math.exp(-railPhase * 24) +
          0.022 * Math.exp(-Math.pow((railPhase - 0.18) * 28, 2)),
        audio.currentTime,
        0.02,
      );
    let moving = 0;
    if (route.length) {
      const goal = route[0],
        delta = goal.clone().sub(player.position),
        distance = delta.length();
      if (distance < 0.035) {
        player.position.copy(goal);
        route.shift();
        if (!route.length) {
          walking = false;
          const done = afterWalk;
          afterWalk = null;
          done?.();
          ui();
        }
      } else {
        const direction = delta.normalize();
        player.position.addScaledVector(
          direction,
          Math.min(distance, dt * 1.8),
        );
        player.rotation.y = THREE.MathUtils.lerp(
          player.rotation.y,
          Math.atan2(direction.x, direction.z),
          1 - Math.exp(-dt * 12),
        );
        moving = 1;
        if (time - lastMove > 0.12) {
          send({
            type: "move",
            x: player.position.x,
            z: player.position.z,
            yaw: player.rotation.y,
          });
          lastMove = time;
        }
        if (!cameraGoal) {
          const focus = v(player.position.x * 0.4, 1.3, player.position.z - 2);
          const shift = focus
            .sub(controls.target)
            .multiplyScalar(1 - Math.exp(-dt * 2));
          camera.position.add(shift);
          controls.target.add(shift);
        }
      }
    }
    updatePassenger(player, dt, time, { moving, reduceMotion: reduced });
    for (const c of demoChars)
      updatePassenger(c, dt, time, { reduceMotion: reduced });
    for (const c of remote.values()) {
      const d = c.userData;
      if (d.target) c.position.lerp(d.target, 1 - Math.exp(-dt * 8));
      const angle =
        THREE.MathUtils.euclideanModulo(
          (d.yaw || 0) - c.rotation.y + Math.PI,
          Math.PI * 2,
        ) - Math.PI;
      c.rotation.y += angle * (1 - Math.exp(-dt * 8));
      updatePassenger(c, dt, time, { moving: d.moving, reduceMotion: reduced });
    }
    if (cameraGoal) {
      camera.position.lerp(cameraGoal.position, 1 - Math.exp(-dt * 7));
      controls.target.lerp(cameraGoal.target, 1 - Math.exp(-dt * 7));
      if (camera.position.distanceTo(cameraGoal.position) < 0.015) {
        cameraGoal = null;
        controls.enabled = true;
        controls.enableDamping = true;
      }
    }
    controls.update();
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -3.7, 3.7);
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.3, 4.25);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -9.8, 10.2);
    camera.setViewOffset(
      innerWidth,
      innerHeight,
      reduced ? 0 : Math.sin(time * 2.6) * 0.65,
      reduced ? 0 : Math.sin(time * 5.2) * 0.22,
      innerWidth,
      innerHeight,
    );
    renderer.render(scene, camera);
    frameHandle = requestAnimationFrame(frame);
  }
  listen(renderer.domElement, "webglcontextlost", (event) => {
    event.preventDefault();
    if (graphicsLost) return;
    graphicsLost = true;
    journeyEpoch++;
    lifetime.abort();
    cancelAnimationFrame(frameHandle);
    clearTimeout(reconnectTimer);
    clearTimeout(guideTimer);
    clearTimeout(toastTimer);
    if (waiter) {
      clearTimeout(waiter.timer);
      const cancel = waiter.resolve;
      waiter = null;
      cancel(null);
    }
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      socket.close();
    }
    if (audio) void audio.close().catch(() => {});
    controls.dispose();
    for (const character of [player, ...demoChars, ...remote.values()])
      disposePassenger(character);
    remote.clear();
    renderer.dispose();
    showGraphicsFailure("lost");
  });
  connect();
  frame();
  guideTimer = setTimeout(() => $(".guide")?.classList.add("faded"), 8000);
  ui();
}
startTrain();
