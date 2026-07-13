// `three` ships runtime modules without TypeScript declarations. This is the only
// temporary untyped boundary while the matching `@types/three` approval is pending.
// @ts-expect-error Runtime package intentionally has no bundled declaration file.
import * as THREE from "three";
import { getEdgeAsset, type EdgeAssetState } from "./edge-assets";
import {
  buildSceneComposition,
  getCameraPoseForEntry,
  resolveAvailableAssetId,
  resolvePreviewNodeId,
  type EdgeSceneNode,
} from "./edge-scene-model";
import { edgeNavigationReducer, getVisibleNodeIds, type CameraPose, type EdgeViewportState } from "./edge-navigation";

export type EdgeSceneController = {
  enter(nodeId: string): Promise<void>;
  back(): Promise<void>;
  home(): Promise<void>;
  resize(width: number, height: number, pixelRatio: number): void;
  setReducedMotion(reduced: boolean): void;
  setSelectedNode(nodeId: string | null): void;
  dispose(): void;
};

export type EdgeSceneOptions = {
  reducedMotion?: boolean;
  onPreview?: (nodeId: string | null) => void;
  availableAssetIds?: ReadonlySet<string>;
};

const ASSET_STATE: EdgeAssetState = "available";
const CAMERA_TRAVEL_MS = 620;
const REDUCED_CROSSFADE_MS = 150;

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

export function createEdgeScene(
  canvas: HTMLCanvasElement,
  initial: EdgeViewportState,
  onSelect: (nodeId: string) => void,
  options: EdgeSceneOptions = {},
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
  let reducedMotion = Boolean(options.reducedMotion);
  let disposed = false;
  let frameId = 0;
  let compositionVersion = 0;
  let fadeStartedAt = performance.now();
  let fadeDuration = reducedMotion ? REDUCED_CROSSFADE_MS : CAMERA_TRAVEL_MS;
  let interactiveMeshes: any[] = [];
  let selectedNodeId: string | null = initial.selectedNodeId;
  let previewNodeId: string | null = null;
  const availableAssetIds = options.availableAssetIds ?? new Set<string>(["edge"]);
  const pointerOrigins = new Map<number, { x: number; y: number }>();
  const texturePromises = new Map<string, Promise<any | null>>();
  const loadedTextures = new Set<any>();

  function disposeMaterial(material: any) {
    material.map = null;
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

  function textureFor(assetId: string): Promise<any | null> {
    const resolvedId = resolveAvailableAssetId(assetId, availableAssetIds);
    const src = getEdgeAsset(resolvedId, ASSET_STATE).src;
    const cached = texturePromises.get(src);
    if (cached) return cached;
    const loading = new Promise<any | null>((resolve) => {
      textureLoader.load(
        src,
        (texture: any) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          if (disposed) {
            texture.dispose();
            resolve(null);
            return;
          }
          loadedTextures.add(texture);
          resolve(texture);
        },
        undefined,
        () => resolve(null),
      );
    });
    texturePromises.set(src, loading);
    return loading;
  }

  function syncSelection() {
    for (const mesh of interactiveMeshes) {
      const selected = mesh.userData.nodeId === selectedNodeId;
      const baseScale = mesh.userData.baseScale;
      mesh.scale.setScalar(baseScale * (selected ? 1.08 : 1));
      mesh.material.userData.selectionBoost = selected ? 0.14 : 0;
    }
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
    material.userData.selectionBoost = 0;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { nodeId: node.id, role, baseScale: 1 };

    if (isCurrent) mesh.position.set(0, 0, -0.55);
    else if (isParent) mesh.position.set(-3.5, 2.28, 0.42);
    else {
      const count = Math.max(1, total);
      const angle = -Math.PI * 0.82 + (index / Math.max(1, count - 1)) * Math.PI * 1.64;
      const radiusX = count > 4 ? 3.35 : 2.9;
      const radiusY = count > 4 ? 2.05 : 1.82;
      const baseScale = count > 4 ? 0.78 : 0.9;
      mesh.position.set(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, 0.48);
      mesh.scale.setScalar(baseScale);
      mesh.userData.baseScale = baseScale;
      interactiveMeshes.push(mesh);
    }
    world.add(mesh);

    void textureFor(node.assetId).then((texture) => {
      if (!texture || disposed || version !== compositionVersion || !world.children.includes(mesh)) return;
      material.map = texture;
      material.color.setHex(0xffffff);
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
    syncSelection();
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

  function preview(nodeId: string | null) {
    if (previewNodeId === nodeId) return;
    previewNodeId = nodeId;
    selectedNodeId = nodeId;
    syncSelection();
    options.onPreview?.(nodeId);
  }

  function onPointerMove(event: PointerEvent) {
    const hit = intersect(event);
    const nodeId = resolvePreviewNodeId(hit?.userData.nodeId, getVisibleNodeIds(viewport));
    canvas.classList.toggle("node-hovered", Boolean(nodeId));
    preview(nodeId);
  }

  function onPointerLeave() {
    canvas.classList.remove("node-hovered");
    preview(null);
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
  canvas.addEventListener("pointerleave", onPointerLeave);
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
      if (material) material.opacity = Math.min(1, material.userData.baseOpacity * fadeProgress + material.userData.selectionBoost);
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
    selectedNodeId = null;
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
      if (reduced && !reducedMotion) {
        fadeStartedAt = performance.now();
        fadeDuration = REDUCED_CROSSFADE_MS;
      }
      reducedMotion = reduced;
      targetCamera(viewport.camera);
    },
    setSelectedNode(nodeId) {
      selectedNodeId = resolvePreviewNodeId(nodeId, getVisibleNodeIds(viewport));
      syncSelection();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      compositionVersion += 1;
      window.cancelAnimationFrame(frameId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.classList.remove("node-hovered");
      pointerOrigins.clear();
      clearWorld();
      for (const texture of loadedTextures) texture.dispose();
      loadedTextures.clear();
      texturePromises.clear();
      scene.remove(world);
      renderer.dispose();
    },
  };
}
