import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const PALETTE = [
  "#ad8175",
  "#c6b38e",
  "#859985",
  "#a99aaf",
  "#78939c",
  "#c89e7c",
  "#9aab91",
];
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (color) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
const down = v(0, -1, 0);
function limb(
  parent,
  origin,
  upperLength,
  lowerLength,
  material,
  skin,
  leg = false,
) {
  const upper = new THREE.Group(),
    lower = new THREE.Group(),
    end = new THREE.Group();
  upper.position.copy(origin);
  lower.position.y = -upperLength;
  end.position.y = -lowerLength;
  parent.add(upper);
  upper.add(lower);
  lower.add(end);
  const radius = leg ? 0.083 : 0.065;
  for (const [part, length] of [
    [upper, upperLength],
    [lower, lowerLength],
  ]) {
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        radius,
        Math.max(0.01, length - radius * 2),
        4,
        10,
      ),
      material,
    );
    mesh.position.y = -length / 2;
    mesh.castShadow = true;
    part.add(mesh);
  }
  const tip = new THREE.Mesh(
    leg
      ? new RoundedBoxGeometry(0.18, 0.12, 0.3, 2, 0.045)
      : new THREE.SphereGeometry(0.067, 12, 8),
    leg ? mat("#494039") : skin,
  );
  if (leg) tip.position.z = 0.065;
  end.add(tip);
  tip.castShadow = true;
  return {
    upper,
    lower,
    end,
    upperLength,
    lowerLength,
    origin: origin.clone(),
    leg,
  };
}
// Analytic two-segment IK. Targets and bend preference are in body coordinates.
function solve(limb, target, bend) {
  const axis = target.clone().sub(limb.origin),
    raw = axis.length(),
    a = limb.upperLength,
    b = limb.lowerLength;
  const length = THREE.MathUtils.clamp(
    raw,
    Math.abs(a - b) + 0.001,
    a + b - 0.001,
  );
  axis.normalize();
  const perpendicular = bend
    .clone()
    .addScaledVector(axis, -bend.dot(axis))
    .normalize();
  const along = (a * a + length * length - b * b) / (2 * length),
    height = Math.sqrt(Math.max(0, a * a - along * along));
  const knee = axis
    .clone()
    .multiplyScalar(along)
    .addScaledVector(perpendicular, height);
  const upperQ = new THREE.Quaternion().setFromUnitVectors(
    down,
    knee.clone().normalize(),
  );
  const lowerDirection = axis.multiplyScalar(length).sub(knee).normalize();
  limb.upper.quaternion.copy(upperQ);
  limb.lower.quaternion
    .copy(upperQ)
    .invert()
    .multiply(new THREE.Quaternion().setFromUnitVectors(down, lowerDirection));
  // Keep shoes level; props attached to hands can be positioned independently.
  if (limb.leg)
    limb.end.quaternion
      .copy(limb.upper.quaternion)
      .multiply(limb.lower.quaternion)
      .invert();
}
export function passenger(scene, seed) {
  const group = new THREE.Group(),
    body = new THREE.Group();
  group.add(body);
  const coat = mat(PALETTE[seed % PALETTE.length]),
    skin = mat("#e5bc98"),
    hair = mat(["#41342d", "#685343", "#342f2c"][seed % 3]),
    pants = mat("#4d4d49");
  function mesh(geometry, material, x, y, z, parent = body) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  mesh(new RoundedBoxGeometry(0.47, 0.6, 0.31, 3, 0.1), coat, 0, 0.31, 0);
  const head = new THREE.Group();
  head.position.set(0, 0.88, 0);
  body.add(head);
  mesh(new THREE.SphereGeometry(0.28, 20, 16), skin, 0, 0, 0, head);
  mesh(
    new THREE.SphereGeometry(0.287, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hair,
    0,
    0.02,
    -0.018,
    head,
  );
  for (const x of [-0.085, 0.085])
    mesh(new THREE.SphereGeometry(0.013, 8, 6), hair, x, -0.01, 0.265, head);
  mesh(new THREE.SphereGeometry(0.027, 8, 6), skin, 0, -0.07, 0.274, head);
  mesh(
    new RoundedBoxGeometry(0.38, 0.055, 0.24, 2, 0.02),
    mat("#e3d8ba"),
    0,
    0.58,
    0,
  );
  const armR = limb(body, v(0.26, 0.5, 0), 0.27, 0.26, coat, skin),
    armL = limb(body, v(-0.26, 0.5, 0), 0.27, 0.26, coat, skin);
  const legR = limb(body, v(0.13, 0, 0), 0.36, 0.36, pants, skin, true),
    legL = limb(body, v(-0.13, 0, 0), 0.36, 0.36, pants, skin, true);
  // Props use their own body-space anchors, avoiding a cup inheriting a bent wrist rotation.
  const cup = new THREE.Group();
  body.add(cup);
  const porcelain = mat("#eee0c7");
  mesh(
    new THREE.CylinderGeometry(0.085, 0.065, 0.16, 20),
    porcelain,
    0,
    0,
    0,
    cup,
  );
  mesh(
    new THREE.CylinderGeometry(0.072, 0.072, 0.008, 20),
    mat("#865e38"),
    0,
    0.083,
    0,
    cup,
  );
  const handle = mesh(
    new THREE.TorusGeometry(0.055, 0.014, 8, 16),
    porcelain,
    0.095,
    0,
    0,
    cup,
  );
  handle.rotation.y = Math.PI / 2;
  const steam = new THREE.Group();
  cup.add(steam);
  for (let i = 0; i < 3; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 6),
      new THREE.MeshBasicMaterial({
        color: "#fff2df",
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
    );
    puff.position.set((i - 1) * 0.03, 0.15 + i * 0.065, 0);
    steam.add(puff);
  }
  const book = new THREE.Group();
  body.add(book);
  for (const side of [-1, 1]) {
    const leaf = mesh(
      new RoundedBoxGeometry(0.18, 0.025, 0.23, 2, 0.008),
      mat("#eee2c9"),
      side * 0.085,
      0,
      0,
      book,
    );
    leaf.rotation.z = side * 0.22;
    mesh(
      new THREE.BoxGeometry(0.18, 0.012, 0.24),
      mat("#586f70"),
      side * 0.085,
      -0.019,
      0,
      book,
    );
  }
  group.userData = {
    body,
    head,
    armR,
    armL,
    legR,
    legL,
    coat,
    hair,
    cup,
    steam,
    book,
    seated: 0,
    sitting: false,
    action: "idle",
    blend: 0,
    wave: -1e9,
    phase: seed * 0.83,
  };
  scene.add(group);
  return group;
}
export function pose(c, seated) {
  c.userData.sitting = seated;
}

// Each passenger owns its geometry/materials; repeated meshes share only within it.
export function disposePassenger(character) {
  if (character.userData.disposed) return;
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  character.traverse((node) => {
    // Sprite geometry is shared globally by Three.js, unlike our owned meshes.
    if (node.geometry && !node.isSprite) geometries.add(node.geometry);
    for (const material of Array.isArray(node.material)
      ? node.material
      : [node.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material))
        if (value?.isTexture) textures.add(value);
    }
  });
  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  character.removeFromParent();
  character.clear();
  character.userData = { disposed: true };
}
export function act(c, action) {
  if (c.userData.action !== action) {
    c.userData.action = action;
    c.userData.blend = 0;
  }
}
export function updatePassenger(
  c,
  dt,
  time,
  { moving = 0, reduceMotion = false } = {},
) {
  const d = c.userData,
    blend = 1 - Math.exp(-dt * 7);
  d.seated += (Number(d.sitting) - d.seated) * blend;
  d.blend = Math.min(1, d.blend + dt * 2.5);
  const seated = d.seated,
    walk = reduceMotion ? 0 : moving,
    phase = time * 8 + d.phase;
  d.body.position.y =
    THREE.MathUtils.lerp(0.79, 0.61, seated) +
    (reduceMotion ? 0 : Math.abs(Math.sin(phase)) * 0.022 * walk);
  d.body.rotation.set(
    0,
    Math.sin(phase) * 0.035 * walk,
    reduceMotion ? 0 : Math.sin(time * 1.3 + d.phase) * 0.012,
  );
  const hipY = d.body.position.y;
  for (const [limb, sign] of [
    [d.legR, 1],
    [d.legL, -1],
  ]) {
    const z = THREE.MathUtils.lerp(
      Math.sin(phase + (sign * Math.PI) / 2) * 0.17 * walk,
      0.5,
      seated,
    );
    const lift =
      Math.max(0, Math.sin(phase + (sign * Math.PI) / 2)) *
      0.075 *
      walk *
      (1 - seated);
    solve(limb, v(sign * 0.13, 0.09 - hipY + lift, z), v(0, 0, 1));
  }
  const right = v(0.27, -0.03 + seated * 0.08, Math.sin(phase) * 0.15 * walk),
    left = v(-0.27, -0.03 + seated * 0.08, -Math.sin(phase) * 0.15 * walk);
  const amount = THREE.MathUtils.smoothstep(d.blend, 0, 1);
  d.cup.visible = d.action === "tea";
  d.book.visible = d.action === "read";
  d.head.rotation.set(0, 0, 0);
  if (d.action === "tea") {
    const cycle = (time + d.phase) % 9;
    const sip =
      THREE.MathUtils.smoothstep(cycle, 2, 3) *
      (1 - THREE.MathUtils.smoothstep(cycle, 4, 5));
    right.lerp(v(0.13, 0.17 + sip * 0.5, 0.32 - sip * 0.06), amount);
    left.lerp(v(-0.17, 0.05, 0.25), amount);
    d.cup.position.copy(right).add(v(-0.045, 0.05, 0.015));
    d.cup.rotation.x = -sip * 0.5;
    d.head.rotation.x = -sip * 0.06;
    for (const [i, p] of d.steam.children.entries()) {
      p.position.y = 0.13 + ((time * 0.08 + i * 0.07) % 0.23);
      p.position.x = Math.sin(time + i) * 0.025;
      p.material.opacity = reduceMotion
        ? 0
        : 0.18 * (1 - (p.position.y - 0.13) / 0.23);
    }
  } else if (d.action === "read") {
    right.lerp(v(0.18, 0.12, 0.3), amount);
    left.lerp(v(-0.18, 0.12, 0.3), amount);
    d.book.position.set(0, 0.1, 0.3);
    d.book.rotation.x = 0.2;
    d.head.rotation.x = 0.25 * amount;
  } else if (d.action === "stretch") {
    const ease =
      amount * (reduceMotion ? 0.65 : 0.85 + 0.15 * Math.sin(time * 0.7));
    right.lerp(v(0.29, 1.07, 0.06), ease);
    left.lerp(v(-0.29, 1.07, 0.06), ease);
    d.head.rotation.x = -0.12 * ease;
  }
  const age = (performance.now() - d.wave) / 1000;
  if (age >= 0 && age < 2) {
    const w = Math.sin((Math.PI * age) / 2),
      holding = d.action === "tea" || d.action === "read";
    const hand = holding ? left : right;
    hand.lerp(
      v((holding ? -1 : 1) * (0.35 + 0.035 * Math.sin(age * 15)), 0.94, 0.1),
      w,
    );
  }
  solve(d.armR, right, v(1, 0, 0.5));
  solve(d.armL, left, v(-1, 0, 0.5));
  if (d.tag && performance.now() - (d.showName || 0) > 3000)
    d.tag.visible = false;
}
export function identity(c, id) {
  const seed = [...id].reduce((a, s) => a + s.charCodeAt(0), 0);
  c.userData.coat.color.set(PALETTE[seed % PALETTE.length]);
  c.userData.hair.color.set(["#41342d", "#685343", "#342f2c"][seed % 3]);
}
export function nameTag(c, name) {
  if (c.userData.tag) {
    c.remove(c.userData.tag);
    c.userData.tag.material.map.dispose();
    c.userData.tag.material.dispose();
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const x = canvas.getContext("2d");
  x.fillStyle = "rgba(44,40,34,.78)";
  x.beginPath();
  x.roundRect(0, 0, 512, 96, 48);
  x.fill();
  x.fillStyle = "#fff2d6";
  x.font = "32px sans-serif";
  x.textAlign = "center";
  x.fillText(name, 256, 61);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false }),
  );
  tag.position.y = 2.05;
  tag.scale.set(1.7, 0.32, 1);
  c.add(tag);
  c.userData.tag = tag;
  c.userData.name = name;
  tag.visible = false;
}
