import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Face, Facelets, FACE_ORDER, PALETTE } from '../lib/cube';

type Props = { faces: Facelets; onSticker: (face: Face, index: number) => void; turnKey?: string };
const DARK = '#202938';
function faceIndex(face: Face, x: number, y: number, z: number) {
  let row = 0, col = 0;
  if (face === 'U') { row = z + 1; col = x + 1; }
  if (face === 'D') { row = 1 - z; col = x + 1; }
  if (face === 'F') { row = 1 - y; col = x + 1; }
  if (face === 'B') { row = 1 - y; col = 1 - x; }
  if (face === 'R') { row = 1 - y; col = 1 - z; }
  if (face === 'L') { row = 1 - y; col = z + 1; }
  return row * 3 + col;
}
export default function CubeCanvas({ faces, onSticker, turnKey = '' }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; root: THREE.Group; raycaster: THREE.Raycaster; pointer: THREE.Vector2; down: THREE.Vector2; dragging: boolean; previous: THREE.Vector2 } | null>(null);
  const facesRef = useRef(faces);
  const callbackRef = useRef(onSticker);
  const turnRef = useRef(turnKey);
  useEffect(() => { facesRef.current = faces; }, [faces]);
  useEffect(() => { callbackRef.current = onSticker; }, [onSticker]);
  useEffect(() => { turnRef.current = turnKey; }, [turnKey]);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      node.innerHTML = '<p class="webgl-fallback">3D graphics are unavailable in this browser. Use the sticker net below.</p>';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(node.clientWidth, node.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    node.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, node.clientWidth / node.clientHeight, 0.1, 100);
    camera.position.set(5.2, 4.1, 6.5);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x293247, 2.1));
    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(5, 8, 7);
    scene.add(light);
    const root = new THREE.Group();
    scene.add(root);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const down = new THREE.Vector2();
    const previous = new THREE.Vector2();
    const ctx = { scene, camera, renderer, root, raycaster, pointer, down, dragging: false, previous };
    sceneRef.current = ctx;
    const build = () => {
      root.clear();
      const cubeletGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96);
      for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
        const colors = [
          x === 1 ? PALETTE[facesRef.current.R[faceIndex('R', x, y, z)]].color : DARK,
          x === -1 ? PALETTE[facesRef.current.L[faceIndex('L', x, y, z)]].color : DARK,
          y === 1 ? PALETTE[facesRef.current.U[faceIndex('U', x, y, z)]].color : DARK,
          y === -1 ? PALETTE[facesRef.current.D[faceIndex('D', x, y, z)]].color : DARK,
          z === 1 ? PALETTE[facesRef.current.F[faceIndex('F', x, y, z)]].color : DARK,
          z === -1 ? PALETTE[facesRef.current.B[faceIndex('B', x, y, z)]].color : DARK
        ];
        const materials = colors.map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.56, metalness: 0.02 }));
        const cubelet = new THREE.Mesh(cubeletGeo, materials);
        cubelet.position.set(x, y, z);
        cubelet.userData.cubelet = true;
        root.add(cubelet);
        const addSticker = (face: Face, pos: THREE.Vector3, normal: THREE.Vector3, index: number) => {
          const geo = new THREE.PlaneGeometry(0.79, 0.79);
          const mat = new THREE.MeshStandardMaterial({ color: PALETTE[facesRef.current[face][index]].color, roughness: 0.5, side: THREE.DoubleSide });
          const sticker = new THREE.Mesh(geo, mat);
          sticker.position.copy(pos);
          sticker.position.addScaledVector(normal, 0.491);
          sticker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
          sticker.userData.sticker = { face, index };
          root.add(sticker);
        };
        if (x === 1) addSticker('R', new THREE.Vector3(x, y, z), new THREE.Vector3(1, 0, 0), faceIndex('R', x, y, z));
        if (x === -1) addSticker('L', new THREE.Vector3(x, y, z), new THREE.Vector3(-1, 0, 0), faceIndex('L', x, y, z));
        if (y === 1) addSticker('U', new THREE.Vector3(x, y, z), new THREE.Vector3(0, 1, 0), faceIndex('U', x, y, z));
        if (y === -1) addSticker('D', new THREE.Vector3(x, y, z), new THREE.Vector3(0, -1, 0), faceIndex('D', x, y, z));
        if (z === 1) addSticker('F', new THREE.Vector3(x, y, z), new THREE.Vector3(0, 0, 1), faceIndex('F', x, y, z));
        if (z === -1) addSticker('B', new THREE.Vector3(x, y, z), new THREE.Vector3(0, 0, -1), faceIndex('B', x, y, z));
      }
    };
    build();
    let frame = 0;
    const animate = () => { frame = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();
    const resize = () => { if (!node.clientWidth || !node.clientHeight) return; camera.aspect = node.clientWidth / node.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(node.clientWidth, node.clientHeight); };
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    const onDown = (event: PointerEvent) => { ctx.dragging = true; ctx.down.set(event.clientX, event.clientY); ctx.previous.copy(ctx.down); renderer.domElement.setPointerCapture(event.pointerId); };
    const onMove = (event: PointerEvent) => {
      if (!ctx.dragging) return;
      const now = new THREE.Vector2(event.clientX, event.clientY);
      const delta = now.clone().sub(ctx.previous);
      if (ctx.down.distanceTo(now) > 4) root.rotation.y += delta.x * 0.009, root.rotation.x += delta.y * 0.009;
      ctx.previous.copy(now);
    };
    const onUp = (event: PointerEvent) => {
      if (!ctx.dragging) return;
      ctx.dragging = false;
      if (ctx.down.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 7) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(root.children, false).find(item => item.object.userData.sticker);
      if (hit?.object.userData.sticker) { const sticker = hit.object.userData.sticker as { face: Face; index: number }; callbackRef.current(sticker.face, sticker.index); }
    };
    const onWheel = (event: WheelEvent) => { camera.position.multiplyScalar(event.deltaY > 0 ? 1.07 : 0.93); camera.position.clampLength(4.3, 11); };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointercancel', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerup', onUp); renderer.domElement.removeEventListener('pointercancel', onUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const mats = Array.isArray(object.material) ? object.material : [object.material]; mats.forEach(mat => mat.dispose()); } });
      renderer.dispose(); renderer.domElement.remove(); sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;
    ctx.root.children.forEach(object => {
      const data = object.userData.sticker as { face: Face; index: number } | undefined;
      if (data && object instanceof THREE.Mesh) (object.material as THREE.MeshStandardMaterial).color.set(PALETTE[faces[data.face][data.index]].color);
    });
  }, [faces, turnKey]);

  return <div className="cube-canvas" ref={host} role="img" aria-label="Interactive 3D Rubik's cube. Drag to rotate, scroll to zoom, tap a sticker to paint." />;
}
