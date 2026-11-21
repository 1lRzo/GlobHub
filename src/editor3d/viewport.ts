import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { InstanceId, Project, RbxInstance, ToolMode, TransformPayload } from '../core/types';
import { AUX_COLORS, MATERIAL_LOOK, PART_CLASSES } from '../core/classes';
import { findNearestPartPositionFor } from '../core/partLookup';

function wedgeGeometry(): THREE.BufferGeometry {
  const h = 0.5;
  const vertices: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[]) => {
    vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  // cantos: base (-x..x, -y, -z..z); aresta superior em z=-h
  const a = [-h, -h, -h], b = [h, -h, -h], c = [-h, -h, h], d = [h, -h, h];
  const e = [-h, h, -h], f = [h, h, -h];
  // fundo
  quad(a, c, d, b); // não usado? mantém base fechada
  // traseira (z=-h)
  quad(a, b, f, e);
  // rampa
  quad(c, e, f, d);
  // lados
  vertices.push(...a, ...e, ...c); // x=-h
  vertices.push(...b, ...d, ...f); // x=h
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  return geo;
}

function trussGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const wire = new THREE.WireframeGeometry(geo);
  const out = new THREE.BufferGeometry();
  const wirePos = (wire.getAttribute('position') as THREE.BufferAttribute).array;
  out.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wirePos), 3));
  return out;
}

interface GeometrySet {
  block: THREE.BufferGeometry;
  ball: THREE.BufferGeometry;
  cylinder: THREE.BufferGeometry;
  wedge: THREE.BufferGeometry;
  truss: THREE.BufferGeometry;
}

/** Ponto central da câmera, compartilhado para posicionar objetos inseridos. */
export const cameraAnchor = { x: 0, y: 1, z: 0 };

export interface ViewportApi {
  sync(project: Project | null, selection: InstanceId[], tool: ToolMode): void;
  focus(id: InstanceId): void;
  worldAnchorPoint(): { x: number; y: number; z: number };
  dispose(): void;
}

export function initViewport(
  mount: HTMLElement,
  opts: {
    onSelect: (id: InstanceId | null, additive: boolean) => void;
    onTransformStart: () => void;
    onTransformCommit: (id: InstanceId, transform: TransformPayload) => void;
  }
): ViewportApi {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8fbfe8');

  const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 5000);
  camera.position.set(40, 32, 40);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, Math.max(mount.clientHeight, 1));
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  mount.appendChild(renderer.domElement);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.12;
  orbit.maxPolarAngle = Math.PI * 0.495;
  orbit.minDistance = 2;
  orbit.maxDistance = 800;
  orbit.target.set(0, 0, 0);
  orbit.touches.ONE = THREE.TOUCH.ROTATE;
  orbit.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  orbit.update();

  const grid = new THREE.GridHelper(512, 64, 0x556070, 0x394150);
  grid.position.y = 0.02;
  scene.add(grid);

  const ambient = new THREE.AmbientLight(0xffffff, 1.4);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(60, 90, 40);
  scene.add(sun);

  const geos: GeometrySet = {
    block: new THREE.BoxGeometry(1, 1, 1),
    ball: new THREE.SphereGeometry(0.5, 22, 16),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
    wedge: wedgeGeometry(),
    truss: trussGeometry()
  };

  const objects = new Map<InstanceId, THREE.Object3D>();
  const raycaster = new THREE.Raycaster();

  const gizmo = new TransformControls(camera, renderer.domElement);
  gizmo.setSize(0.9);
  scene.add(gizmo);

  let selectionHelper: THREE.BoxHelper | null = null;
  let currentSelection: InstanceId[] = [];
  let currentTool: ToolMode = 'select';
  let disposed = false;

  // seleção por toque/clique
  let downX = 0, downY = 0, downTime = 0, twoTouches = false;
  const dom = renderer.domElement;
  const onTouchStart = (e: TouchEvent) => { twoTouches = e.touches.length >= 2; };
  const onPointerDown = (e: PointerEvent) => {
    downX = e.clientX; downY = e.clientY; downTime = performance.now();
  };
  const onPointerUp = (e: PointerEvent) => {
    if (twoTouches && e.pointerType !== 'mouse') return;
    const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (dist > 8 || performance.now() - downTime > 600) return;
    if (gizmo.dragging) return;
    const rect = dom.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const hits = raycaster.intersectObjects(Array.from(objects.values()), true);
    let id: InstanceId | null = null;
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj && !obj.userData) obj = obj.parent;
      while (obj && !obj.userData.instanceId) obj = obj.parent;
      if (obj && obj.userData.instanceId) {
        id = obj.userData.instanceId as InstanceId;
        break;
      }
    }
    opts.onSelect(id, e.shiftKey || e.ctrlKey || e.metaKey);
  };
  dom.addEventListener('touchstart', onTouchStart, { passive: true });
  dom.addEventListener('pointerdown', onPointerDown);
  dom.addEventListener('pointerup', onPointerUp);

  gizmo.addEventListener('dragging-changed', (event: any) => {
    orbit.enabled = !event.value;
    if (event.value) {
      opts.onTransformStart();
    } else {
      const obj = gizmo.object as THREE.Mesh | null;
      if (obj && obj.userData.instanceId) {
        const pos = obj.position;
        const eul = obj.rotation;
        const scl = obj.scale;
        opts.onTransformCommit(obj.userData.instanceId as InstanceId, {
          position: { x: pos.x, y: pos.y, z: pos.z },
          orientation: {
            x: THREE.MathUtils.radToDeg(eul.x),
            y: THREE.MathUtils.radToDeg(eul.y),
            z: THREE.MathUtils.radToDeg(eul.z)
          },
          size: { x: scl.x, y: scl.y, z: scl.z }
        });
      }
    }
  });

  function geometryFor(inst: RbxInstance): THREE.BufferGeometry {
    if (inst.className === 'WedgePart') return geos.wedge;
    if (inst.className === 'CornerWedgePart') return geos.wedge;
    if (inst.className === 'TrussPart') return geos.truss;
    if (inst.className === 'MeshPart' && !inst.properties.Shape) return geos.block;
    const shape = inst.properties.Shape;
    if (shape === 'Ball') return geos.ball;
    if (shape === 'Cylinder') return geos.cylinder;
    if (shape === 'Wedge') return geos.wedge;
    if (shape === 'CornerWedge') return geos.wedge;
    return geos.block;
  }

  function ensureObject(inst: RbxInstance): THREE.Object3D {
    const existing = objects.get(inst.id);
    if (existing) return existing;
    let obj: THREE.Object3D;
    if (PART_CLASSES.includes(inst.className)) {
      const mesh = new THREE.Mesh(geometryFor(inst), new THREE.MeshStandardMaterial());
      obj = mesh;
    } else if (AUX_COLORS[inst.className]) {
      const group = new THREE.Group();
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7),
        new THREE.MeshStandardMaterial({ color: AUX_COLORS[inst.className], transparent: true, opacity: 0.85, emissive: new THREE.Color(AUX_COLORS[inst.className]), emissiveIntensity: 0.5 })
      );
      group.add(marker as THREE.Mesh);
      if (inst.className === 'PointLight') {
        group.add(new THREE.PointLight(0xffffff, 0, 0));
      }
      obj = group;
    } else {
      // classes sem representação 3D direta: marcador pequeno neutro
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.35),
        new THREE.MeshStandardMaterial({ color: '#8a93a3', transparent: true, opacity: 0.7 })
      );
      const group = new THREE.Group();
      group.add(marker);
      obj = group;
    }
    obj.userData.instanceId = inst.id;
    obj.traverse(child => { child.userData.instanceId = inst.id; });
    scene.add(obj);
    objects.set(inst.id, obj);
    return obj;
  }

  function worldPositionFor(project: Project, inst: RbxInstance): { x: number; y: number; z: number } {
    const fromPart = findNearestPartPositionFor(project, inst);
    return fromPart ?? { x: 0, y: 1, z: 0 };
  }

  function applyObject(obj: THREE.Object3D, project: Project, inst: RbxInstance) {
    if (PART_CLASSES.includes(inst.className)) {
      const mesh = obj as THREE.Mesh;
      mesh.geometry = geometryFor(inst);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const p = inst.properties;
      if (p.Position) mesh.position.set((p.Position as any).x, (p.Position as any).y, (p.Position as any).z);
      if (p.Orientation) {
        mesh.rotation.set(
          THREE.MathUtils.degToRad((p.Orientation as any).x),
          THREE.MathUtils.degToRad((p.Orientation as any).y),
          THREE.MathUtils.degToRad((p.Orientation as any).z)
        );
      }
      if (p.Size) {
        mesh.scale.set(
          Math.max((p.Size as any).x, 0.01),
          Math.max((p.Size as any).y, 0.01),
          Math.max((p.Size as any).z, 0.01)
        );
      }
      const look = MATERIAL_LOOK[(p.Material as string) ?? 'Plastic'] ?? MATERIAL_LOOK.Plastic;
      mat.color.set((p.Color as string) ?? '#a3a6ab');
      mat.roughness = look.roughness;
      mat.metalness = look.metalness;
      const transparency = typeof p.Transparency === 'number' ? p.Transparency : 0;
      mat.opacity = Math.max(look.opacity * (1 - transparency), 0.05);
      mat.transparent = mat.opacity < 1;
      mat.emissive = look.emissive && look.emissive > 0 ? mat.color.clone() : new THREE.Color(0x000000);
      mat.emissiveIntensity = look.emissive ?? 0;
      mat.wireframe = inst.className === 'TrussPart';
      mesh.visible = transparency < 0.98;
    } else if (AUX_COLORS[inst.className]) {
      const group = obj as THREE.Group;
      const world = worldPositionFor(project, inst);
      group.position.set(world.x, world.y + Math.max(typeof inst.properties.Size !== 'undefined' ? ((inst.properties.Size as any).y ?? 0) / 2 + 0.8 : 0.8, 0.8), world.z);
      const light = group.children.find(c => c instanceof THREE.PointLight) as THREE.PointLight | undefined;
      if (light) {
        light.intensity = typeof inst.properties.Brightness === 'number' ? inst.properties.Brightness * 4 : 4;
        light.distance = typeof inst.properties.Range === 'number' ? inst.properties.Range : 12;
        light.color.set((inst.properties.Color as string) ?? '#ffffff');
      }
      group.visible = true;
    } else {
      const group = obj as THREE.Group;
      const world = worldPositionFor(project, inst);
      group.position.set(world.x, world.y + 1.2, world.z);
      group.visible = true;
    }
  }

  function updateSelectionObjects() {
    if (selectionHelper) {
      scene.remove(selectionHelper);
      (selectionHelper as unknown as { dispose?: () => void }).dispose?.();
      selectionHelper = null;
    }
    if (currentSelection.length === 1) {
      const id = currentSelection[0];
      const obj = objects.get(id);
      if (obj) {
        if (currentTool !== 'select') {
          gizmo.attach(obj);
          gizmo.setMode(currentTool === 'move' ? 'translate' : currentTool === 'rotate' ? 'rotate' : 'scale');
        } else {
          gizmo.detach();
        }
        selectionHelper = new THREE.BoxHelper(obj, 0x4f8cff);
        (selectionHelper.material as THREE.LineBasicMaterial).depthTest = false;
        scene.add(selectionHelper);
        return;
      }
    } else if (currentSelection.length > 1) {
      const merged = new THREE.Box3();
      let any = false;
      for (const id of currentSelection) {
        const obj = objects.get(id);
        if (obj) {
          merged.union(new THREE.Box3().setFromObject(obj));
          any = true;
        }
      }
      if (any) {
        const boxMesh = new THREE.Box3Helper(merged, new THREE.Color(0x4f8cff));
        (boxMesh.material as THREE.LineBasicMaterial).depthTest = false;
        scene.add(boxMesh);
        selectionHelper = boxMesh as unknown as THREE.BoxHelper;
      }
    }
    gizmo.detach();
  }

  function loop() {
    if (disposed) return;
    requestAnimationFrame(loop);
    orbit.update();
    cameraAnchor.x = orbit.target.x;
    cameraAnchor.y = Math.max(orbit.target.y, 0.5);
    cameraAnchor.z = orbit.target.z;
    if (selectionHelper && currentSelection.length === 1) {
      const obj = objects.get(currentSelection[0]);
      if (obj) selectionHelper.setFromObject(obj);
    }
    renderer.render(scene, camera);
  }
  loop();

  const resize = () => {
    if (disposed) return;
    const w = mount.clientWidth;
    const h = Math.max(mount.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(mount);

  let lastSignature = '';
  return {
    sync(project, selection, tool) {
      if (!project) {
        for (const obj of objects.values()) scene.remove(obj);
        objects.clear();
        gizmo.detach();
        currentSelection = [];
        currentTool = tool;
        updateSelectionObjects();
        lastSignature = '';
        return;
      }
      currentSelection = selection;
      currentTool = tool;

      const keep = new Set<InstanceId>();
      for (const inst of Object.values(project.instances)) {
        const isPart = PART_CLASSES.includes(inst.className);
        const isAux = !!AUX_COLORS[inst.className];
        if (!isPart && !isAux) continue;
        keep.add(inst.id);
        const obj = ensureObject(inst);
        applyObject(obj, project, inst);
      }
      for (const [id, obj] of [...objects.entries()]) {
        if (!keep.has(id) || !project.instances[id]) {
          scene.remove(obj);
          objects.delete(id);
        }
      }

      // iluminação do serviço Lighting
      let lightingInst: RbxInstance | null = null;
      const root = project.instances[project.rootId];
      for (const sid of root.children) {
        const s = project.instances[sid];
        if (s?.className === 'Lighting') lightingInst = s;
      }
      if (lightingInst) {
        const p = lightingInst.properties;
        const brightness = typeof p.Brightness === 'number' ? p.Brightness : 3;
        sun.intensity = 0.4 + brightness * 0.6;
        ambient.intensity = 0.8 + brightness * 0.25;
        if (typeof p.Ambient === 'string') ambient.color.set(p.Ambient);
        const clock = typeof p.ClockTime === 'number' ? p.ClockTime : 14;
        const dayT = Math.max(0, Math.min(1, 1 - Math.abs(clock - 12) / 12));
        const sky = new THREE.Color('#8fbfe8').lerp(new THREE.Color('#0b1020'), 1 - dayT);
        scene.background = sky;
        if (typeof p.FogColor === 'string' && typeof p.FogEnd === 'number' && p.FogEnd > 0 && p.FogEnd < 50000) {
          scene.fog = new THREE.Fog(new THREE.Color(p.FogColor).getHex(), 1, p.FogEnd);
          sky.lerp(new THREE.Color(p.FogColor), 0.6);
          scene.background = sky;
        } else {
          scene.fog = null;
        }
      }

      const sig = selection.join(',') + '|' + tool;
      if (sig !== lastSignature) {
        lastSignature = sig;
        updateSelectionObjects();
      }
      if (currentSelection.length === 1 && selectionHelper && (selectionHelper as any).setFromObject) {
        const obj = objects.get(currentSelection[0]);
        if (obj && selectionHelper instanceof THREE.BoxHelper) selectionHelper.setFromObject(obj);
      }
    },

    focus(id) {
      const obj = objects.get(id);
      if (!obj) return;
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      orbit.target.copy(center);
      const dist = Math.max(box.getSize(new THREE.Vector3()).length() * 1.8, 12);
      const dir = new THREE.Vector3(0.7, 0.6, 0.7).normalize();
      camera.position.copy(center.clone().add(dir.multiplyScalar(dist)));
      orbit.update();
    },

    worldAnchorPoint() {
      return { x: orbit.target.x, y: Math.max(orbit.target.y, 0.5), z: orbit.target.z };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
      gizmo.dispose();
      orbit.dispose();
      for (const obj of objects.values()) scene.remove(obj);
      objects.clear();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    }
  };
}
