// `three` ships runtime modules without TypeScript declarations. The project keeps this
// approved dependency surface small, so this controller owns the narrow untyped boundary.
// @ts-expect-error Runtime package intentionally has no bundled declaration file.
import * as THREE from "three";
import { getEdgeAsset, type EdgeAssetState } from "./edge-assets";
import { KPI_TREE } from "./edge-kpis";
import {
  edgeNavigationReducer,
  getVisibleNodeIds,
  type CameraPose,
  type EdgeViewportState,
} from "./edge-navigation";

export type EdgeSceneNode = {
  id: string;
  assetId: string;
  label: string;
};

export type EdgeSceneComposition = {
  current: EdgeSceneNode;
  parent: EdgeSceneNode | null;
  children: EdgeSceneNode[];
};

export type EdgeSceneController = {
  enter(nodeId: string): Promise<void>;
  back(): Promise<void>;
  home(): Promise<void>;
  resize(width: number, height: number, pixelRatio: number): void;
  setReducedMotion(reduced: boolean): void;
  dispose(): void;
};

const ASSET_STATE: EdgeAssetState = "available";
const CAMERA_TRAVEL_MS = 620;
const REDUCED_CROSSFADE_MS = 150;

const DOMAIN_BY_ID = new Map<string, (typeof KPI_TREE)[number]>(KPI_TREE.map((domain) => [domain.id, domain]));
const KPI_BY_ID = new Map<string, (typeof KPI_TREE)[number]["kpis"][number]>(
  KPI_TREE.flatMap((domain) => domain.kpis.map((kpi) => [kpi.id, kpi] as const)),
);
const SUB_KPI_BY_ID = new Map<string, (typeof KPI_TREE)[number]["kpis"][number]["children"][number]>(
  KPI_TREE.flatMap((domain) => domain.kpis.flatMap((kpi) => kpi.children.map((child) => [child.id, child] as const))),
);

export function getEdgeNodeLabel(nodeId: string): string {
  if (nodeId === "edge") return "The Edge";
  const parts = nodeId.split(".");
  const localId = parts[parts.length - 1] ?? nodeId;
  return DOMAIN_BY_ID.get(localId)?.label ?? KPI_BY_ID.get(localId)?.label ?? SUB_KPI_BY_ID.get(localId)?.label ?? nodeId;
}

function toAssetId(path: readonly string[], nodeId: string): string {
  if (nodeId === "edge" || nodeId.includes(".")) return nodeId;
  return path[0] === "edge" && path.length > 1 ? path.slice(1).join(".") : nodeId;
}

function describeNode(path: readonly string[], nodeId: string): EdgeSceneNode {
  return {
    id: nodeId,
    assetId: toAssetId(path, nodeId),
    label: getEdgeNodeLabel(nodeId),
  };
}

export function buildSceneComposition(viewport: EdgeViewportState): EdgeSceneComposition {
  const currentId = viewport.path[viewport.path.length - 1] ?? "edge";
  const parentId = viewport.path.length > 1 ? viewport.path[viewport.path.length - 2] : null;
  return {
    current: describeNode(viewport.path, currentId),
    parent: parentId ? describeNode(viewport.path.slice(0, -1), parentId) : null,
    children: getVisibleNodeIds(viewport).map((nodeId) => describeNode([...viewport.path, nodeId], nodeId)),
  };
}

export function getAssetFallbackIds(assetId: string): string[] {
  if (assetId === "edge") return ["edge"];
  const parts = assetId.split(".");
  const ids: string[] = [];
  for (let length = parts.length; length > 0; length -= 1) ids.push(parts.slice(0, length).join("."));
  ids.push("edge");
  return ids;
}

export function getCameraPoseForEntry(depth: number, siblingIndex: number): CameraPose {
  const angle = siblingIndex * 0.72;
  const drift = Math.min(depth, 3) * 0.16;
  return Object.freeze({
    x: Number((Math.cos(angle) * drift).toFixed(3)),
    y: Number((Math.sin(angle) * drift).toFixed(3)),
    z: Number(Math.max(4.45, 8 - depth * 1.15).toFixed(3)),
    targetX: Number((Math.cos(angle) * drift * 0.35).toFixed(3)),
    targetY: Number((Math.sin(angle) * drift * 0.35).toFixed(3)),
    targetZ: 0,
  });
}

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

export function createEdgeScene(
  canvas: HTMLCanvasElement,
  initial: EdgeViewportState,
  onSelect: (nodeId: string) => void,
): EdgeSceneController {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x07100f, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07100f);
  scene.fog = new THREE.FogExp2(0x07100f, 0.025);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  const cameraTarget = new THREE.Vector3();
  const targetPosition = new THREE.Vector3(initial.camera.x, initial.camera.y, initial.camera.z);
  const targetLookAt = new THREE.Vector3(initial.camera.targetX, initial.camera.targetY, initial.camera.targetZ);
  camera.position.copy(targetPosition);
  cameraTarget.copy(targetLookAt);
  camera.lookAt(cameraTarget);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const textureLoader = new THREE.TextureLoader();
  const world = new THREE.Group();
  scene.add(world);

  let viewport = initial;
  let reducedMotion = false;
  let disposed = false;
  let frameId = 0;
  let compositionVersion = 0;
  let fadeStartedAt = performance.now();
  let fadeDuration = CAMERA_TRAVEL_MS;
  let interactiveMeshes: any[] = [];
  const pointerOrigins = new Map<number, { x: number; y: number }>();
  const textures = new Set<any>();

  function disposeMaterial(material: any) {
    if (material.map) {
      textures.delete(material.map);
      material.map.dispose();
    }
    material.dispose();
  }

  function clearWorld() {
    for (const child of [...world.children]) {
      world.remove(child);
      const mesh = child as any;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMaterial);
      else if (mesh.material) disposeMaterial(mesh.material);
    }
    interactiveMeshes = [];
  }

  function loadTexture(src: string): Promise<any> {
    return new Promise((resolve, reject) => {
      textureLoader.load(src, resolve, undefined, reject);
    });
  }

  async function loadNearestTexture(assetId: string): Promise<any | null> {
    for (const fallbackId of getAssetFallbackIds(assetId)) {
      try {
        const texture = await loadTexture(getEdgeAsset(fallbackId, ASSET_STATE).src);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return texture;
      } catch {
        // A not-yet-generated child inherits the nearest real ancestor image.
      }
    }
    return null;
  }

  function planeFor(
    node: EdgeSceneNode,
    role: "current" | "parent" | "child",
    index: number,
    total: number,
    version: number,
  ) {
    const isCurrent = role === "current";
    const isParent = role === "parent";
    const width = isCurrent ? 8.8 : isParent ? 2.2 : 2.45;
    const height = isCurrent ? 5.5 : isParent ? 1.35 : 1.5;
    const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: isCurrent ? 0x31453f : isParent ? 0x41514d : 0x566f66,
      transparent: true,
      opacity: 0,
      depthWrite: isCurrent,
      side: THREE.DoubleSide,
    });
    material.userData.baseOpacity = isCurrent ? 1 : isParent ? 0.66 : 0.82;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { nodeId: node.id, role };

    if (isCurrent) mesh.position.set(0, 0, -0.55);
    else if (isParent) mesh.position.set(-3.5, 2.28, 0.42);
    else {
      const count = Math.max(1, total);
      const angle = -Math.PI * 0.82 + (index / Math.max(1, count - 1)) * Math.PI * 1.64;
      const radiusX = count > 4 ? 3.35 : 2.9;
      const radiusY = count > 4 ? 2.05 : 1.82;
      mesh.position.set(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, 0.48);
      mesh.scale.setScalar(count > 4 ? 0.78 : 0.9);
      interactiveMeshes.push(mesh);
    }
    world.add(mesh);

    void loadNearestTexture(node.assetId).then((texture) => {
      if (!texture) return;
      if (disposed || version !== compositionVersion || !world.children.includes(mesh)) {
        texture.dispose();
        return;
      }
      if (material.map) material.map.dispose();
      material.map = texture;
      material.color.setHex(0xffffff);
      textures.add(texture);
      material.needsUpdate = true;
    });
  }

  function renderComposition(next: EdgeViewportState) {
    compositionVersion += 1;
    const version = compositionVersion;
    clearWorld();
    const composition = buildSceneComposition(next);
    planeFor(composition.current, "current", 0, 1, version);
    if (composition.parent) planeFor(composition.parent, "parent", 0, 1, version);
    composition.children.forEach((node, index) => planeFor(node, "child", index, composition.children.length, version));
    fadeStartedAt = performance.now();
    fadeDuration = reducedMotion ? REDUCED_CROSSFADE_MS : CAMERA_TRAVEL_MS;
  }

  function pointFromEvent(event: PointerEvent) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 + 1;
  }

  function intersect(event: PointerEvent): any | null {
    pointFromEvent(event);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(interactiveMeshes, false)[0]?.object ?? null;
  }

  function onPointerMove(event: PointerEvent) {
    canvas.classList.toggle("node-hovered", Boolean(intersect(event)));
  }

  function onPointerDown(event: PointerEvent) {
    pointerOrigins.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function onPointerUp(event: PointerEvent) {
    const origin = pointerOrigins.get(event.pointerId);
    pointerOrigins.delete(event.pointerId);
    if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10) return;
    const hit = intersect(event);
    if (hit?.userData.nodeId) onSelect(hit.userData.nodeId);
  }

  function onPointerCancel(event: PointerEvent) {
    pointerOrigins.delete(event.pointerId);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);

  function animate(now: number) {
    if (disposed) return;
    if (reducedMotion) {
      camera.position.copy(targetPosition);
      cameraTarget.copy(targetLookAt);
    } else {
      camera.position.lerp(targetPosition, 0.11);
      cameraTarget.lerp(targetLookAt, 0.11);
    }
    camera.lookAt(cameraTarget);

    const fadeProgress = Math.min(1, (now - fadeStartedAt) / Math.max(1, fadeDuration));
    for (const child of world.children) {
      const material = (child as any).material;
      if (material) material.opacity = material.userData.baseOpacity * fadeProgress;
    }
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(animate);
  }

  function targetCamera(pose: CameraPose) {
    targetPosition.set(pose.x, pose.y, pose.z);
    targetLookAt.set(pose.targetX, pose.targetY, pose.targetZ);
    if (reducedMotion) {
      camera.position.copy(targetPosition);
      cameraTarget.copy(targetLookAt);
      camera.lookAt(cameraTarget);
    }
  }

  async function transition(next: EdgeViewportState): Promise<void> {
    if (next === viewport) return;
    viewport = next;
    targetCamera(next.camera);
    renderComposition(next);
    await wait(reducedMotion ? REDUCED_CROSSFADE_MS : CAMERA_TRAVEL_MS);
  }

  renderComposition(initial);
  frameId = window.requestAnimationFrame(animate);

  return {
    async enter(nodeId) {
      const index = getVisibleNodeIds(viewport).indexOf(nodeId);
      if (index < 0) return;
      const cameraPose = getCameraPoseForEntry(viewport.path.length, index);
      await transition(edgeNavigationReducer(viewport, { type: "enter", nodeId, camera: cameraPose }));
    },
    async back() {
      await transition(edgeNavigationReducer(viewport, { type: "back" }));
    },
    async home() {
      await transition(edgeNavigationReducer(viewport, { type: "home" }));
    },
    resize(width, height, pixelRatio) {
      const safeWidth = Math.max(1, width);
      const safeHeight = Math.max(1, height);
      renderer.setPixelRatio(Math.min(2, Math.max(1, pixelRatio)));
      renderer.setSize(safeWidth, safeHeight, false);
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
    },
    setReducedMotion(reduced) {
      reducedMotion = reduced;
      targetCamera(viewport.camera);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      compositionVersion += 1;
      window.cancelAnimationFrame(frameId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.classList.remove("node-hovered");
      pointerOrigins.clear();
      clearWorld();
      for (const texture of textures) texture.dispose();
      textures.clear();
      scene.remove(world);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
