import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

function texture(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  let seed = 73;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  ctx.fillStyle = kind === "wood" ? "#906b50" : "#677568";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1100; i++) {
    ctx.strokeStyle =
      kind === "wood"
        ? `rgba(${rand() > 0.5 ? "40,21,12" : "218,181,131"},${rand() * 0.055})`
        : `rgba(10,20,10,${rand() * 0.18})`;
    ctx.lineWidth = kind === "wood" ? rand() * 1.8 + 0.3 : 0.6;
    ctx.beginPath();
    let x = rand() * 256,
      y = rand() * 256;
    ctx.moveTo(x, y);
    if (kind === "wood") {
      ctx.bezierCurveTo(
        x + rand() * 10,
        y + 30,
        x - rand() * 5,
        y + 60,
        x + rand() * 4,
        y + 130,
      );
    } else ctx.lineTo(x + 16, y);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(kind === "wood" ? 1 : 3, kind === "wood" ? 1 : 3);
  return t;
}
export function buildCarriage(scene) {
  const materials = {
    wood: new THREE.MeshStandardMaterial({
      color: "#dec7ab",
      map: texture("wood"),
      roughness: 0.48,
    }),
    dark: new THREE.MeshStandardMaterial({ color: "#3f3029", roughness: 0.55 }),
    panel: new THREE.MeshStandardMaterial({
      color: "#b09b7e",
      roughness: 0.75,
    }),
    ivory: new THREE.MeshStandardMaterial({ color: "#e9dfcc", roughness: 0.8 }),
    metal: new THREE.MeshStandardMaterial({
      color: "#b3a084",
      metalness: 0.7,
      roughness: 0.32,
    }),
    fabric: new THREE.MeshStandardMaterial({
      color: "#b1d1b5",
      map: texture("fabric"),
      roughness: 0.95,
    }),
    seam: new THREE.MeshStandardMaterial({ color: "#596f5a", roughness: 0.9 }),
    light: new THREE.MeshStandardMaterial({
      color: "#ffdfab",
      emissive: "#ffd39c",
      emissiveIntensity: 0.55,
    }),
  };
  function box(x, y, z, w, h, d, m, round = 0) {
    const mesh = new THREE.Mesh(
      round
        ? new RoundedBoxGeometry(w, h, d, 2, round)
        : new THREE.BoxGeometry(w, h, d),
      m,
    );
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  }
  function rod(a, b, r, m) {
    const pa = new THREE.Vector3(...a),
      pb = new THREE.Vector3(...b),
      v = pb.clone().sub(pa);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, v.length(), 8),
      m,
    );
    mesh.position.copy(pa.add(pb).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      v.normalize(),
    );
    scene.add(mesh);
    return mesh;
  }
  function label(text, x, y, z, size = 0.3) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 96;
    const cx = c.getContext("2d");
    cx.fillStyle = "#283d36";
    cx.fillRect(0, 0, 256, 96);
    cx.font = "38px serif";
    cx.fillStyle = "#e4d2ad";
    cx.textAlign = "center";
    cx.fillText(text, 128, 62);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 2.67, size),
      new THREE.MeshBasicMaterial({ map: t }),
    );
    p.position.set(x, y, z);
    scene.add(p);
  }
  box(0, -0.16, 0, 8, 0.32, 21, materials.dark);
  for (let i = 0; i < 25; i++)
    box(-3.84 + i * 0.32, 0.015, 0, 0.312, 0.055, 20.95, materials.wood);
  // Curved pale ceiling with wooden ribs; delicate metal window surrounds.
  for (let i = 0; i < 24; i++) {
    const x = -3.84 + i * 0.334;
    const y = 4.25 + 0.62 * Math.sqrt(1 - (x / 4) ** 2);
    const slope = (-0.62 * x) / (16 * Math.sqrt(1 - (x / 4) ** 2));
    const p = box(x, y, 0, 0.35, 0.08, 21, materials.ivory);
    p.rotation.z = Math.atan(slope);
  }
  for (const side of [-1, 1]) {
    const x = side * 4;
    box(x, 0.67, 0, 0.1, 1.35, 21, materials.wood);
    box(x, 4.05, 0, 0.1, 0.5, 21, materials.ivory);
    box(x - side * 0.035, 1.38, 0, 0.15, 0.045, 21, materials.metal);
    box(x - side * 0.035, 3.8, 0, 0.12, 0.045, 21, materials.metal);
    box(x - side * 0.02, 3.92, 0, 0.12, 0.14, 21, materials.wood);
    for (let z = -10; z <= 10; z += 2.8) {
      box(x, 2.59, z, 0.075, 2.4, 0.055, materials.dark);
      box(x - side * 0.012, 2.59, z, 0.09, 2.42, 0.02, materials.metal);
      // Latch and a narrow dividing rail, typical of old passenger carriages.
      box(x - side * 0.04, 2.72, z + 1.38, 0.07, 0.035, 2.72, materials.metal);
      box(
        x - side * 0.07,
        2.69,
        z + 1.38,
        0.08,
        0.06,
        0.18,
        materials.metal,
        0.015,
      );
      box(x - side * 0.035, 0.7, z + 1.38, 0.03, 0.88, 2.4, materials.panel);
      box(x - side * 0.07, 0.7, z + 1.38, 0.025, 0.75, 2.24, materials.wood);
    }
    // Open luggage rack with fine brass rails instead of a thick shelf.
    for (let z = -9.4; z < 10; z += 2.8) {
      rod(
        [x - side * 0.05, 3.93, z],
        [x - side * 0.68, 3.6, z],
        0.023,
        materials.metal,
      );
      rod(
        [x - side * 0.68, 3.6, z],
        [x - side * 0.68, 3.85, z],
        0.022,
        materials.metal,
      );
    }
    for (let j = 0; j < 4; j++)
      rod(
        [x - side * (0.1 + j * 0.17), 3.64, -10],
        [x - side * (0.1 + j * 0.17), 3.64, 10],
        0.018,
        materials.metal,
      );
  }
  // Vestibule and glazed door, with symmetrical wood paneling.
  box(0, 2.38, -10.5, 8, 4.76, 0.16, materials.ivory);
  box(0, 0.8, -10.38, 8, 1.6, 0.06, materials.wood);
  box(0, 2.05, -10.26, 1.85, 4, 0.12, materials.wood, 0.07);
  box(0, 2.65, -10.16, 1.35, 1.85, 0.035, materials.dark, 0.1);
  box(0, 2.65, -10.13, 1.22, 1.72, 0.025, materials.panel, 0.08);
  box(0.67, 1.54, -10.1, 0.06, 0.31, 0.06, materials.metal, 0.025);
  label("01  ·  바다행", 0, 4.25, -10.15, 0.32);
  label("노을 ─ 물결 ─ 구름", -2.4, 2.65, -10.22, 0.29);
  label("잠시 쉬어가요", 2.4, 2.65, -10.22, 0.29);
  for (const x of [-2.4, 2.4]) {
    box(x, 2.6, -10.34, 1.15, 1.55, 0.07, materials.wood, 0.08);
    box(x, 2.6, -10.27, 1.0, 1.4, 0.03, materials.panel, 0.06);
  }
  for (let z = -7; z <= 9; z += 4) {
    box(0, 4.57, z, 0.9, 0.07, 1.9, materials.metal, 0.06);
    box(0, 4.51, z, 0.75, 0.09, 1.7, materials.light, 0.08);
  }
  const seats = [],
    targets = [];
  for (let row = 0; row < 6; row++)
    for (let side of [-1, 1])
      for (let place = 0; place < 2; place++) {
        const z = -7.5 + row * 2.8,
          x = side * (2.25 + place * 0.8),
          id = seats.length;
        seats.push({ x, z, side });
        box(x, 0.5, z, 0.77, 0.22, 1.12, materials.fabric, 0.09);
        box(x, 1.05, z - 0.48, 0.77, 1.03, 0.22, materials.fabric, 0.09);
        box(x, 1.43, z - 0.35, 0.62, 0.16, 0.08, materials.seam, 0.035);
        for (const dx of [-0.38, 0.38]) {
          box(x + dx, 0.73, z, 0.055, 0.1, 1.08, materials.wood, 0.025);
          rod(
            [x + dx, 0.56, z + 0.35],
            [x + dx, 0.71, z + 0.35],
            0.025,
            materials.metal,
          );
        }
        box(x, 0.28, z, 0.16, 0.5, 0.66, materials.dark);
        box(x, 0.98, z - 0.62, 0.5, 0.3, 0.035, materials.wood, 0.025);
        const target = box(
          x,
          1,
          z,
          0.76,
          1.25,
          1.17,
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
        );
        target.userData.seat = id;
        targets.push(target);
      }
  // Valises on the overhead racks.
  for (const [x, z] of [
    [-3.65, -4],
    [3.65, -6],
    [-3.65, 4],
  ]) {
    box(x, 3.84, z, 0.48, 0.36, 0.8, materials.wood, 0.06);
    for (const d of [-0.22, 0.22])
      box(x, 3.84, z + d, 0.49, 0.37, 0.027, materials.dark);
  }
  // Batch static opaque surfaces by shared material and shadow policy.
  scene.updateMatrixWorld(true);
  const groups = new Map(),
    hitTargets = new Set(targets);
  for (const mesh of [...scene.children]) {
    if (
      !mesh.isMesh ||
      hitTargets.has(mesh) ||
      mesh.material.transparent ||
      mesh.material.isShaderMaterial ||
      Array.isArray(mesh.material)
    )
      continue;
    const key = mesh.material.uuid + mesh.castShadow + mesh.receiveShadow;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mesh);
  }
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const geometry = mergeGeometries(
      meshes.map((mesh) => {
        const g = mesh.geometry.index
          ? mesh.geometry.toNonIndexed()
          : mesh.geometry.clone();
        g.applyMatrix4(mesh.matrixWorld);
        return g;
      }),
    );
    if (!geometry) continue;
    const batch = new THREE.Mesh(geometry, meshes[0].material);
    batch.castShadow = meshes[0].castShadow;
    batch.receiveShadow = meshes[0].receiveShadow;
    for (const mesh of meshes) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    scene.add(batch);
  }
  return { seats, targets };
}
