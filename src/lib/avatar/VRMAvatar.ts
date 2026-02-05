import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

export interface VRMAvatarOptions {
  canvas: HTMLCanvasElement;
  vrmPath: string;
  backgroundColor?: number;
}

export class VRMAvatar {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private vrm: VRM | null = null;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private canvas: HTMLCanvasElement;

  constructor(options: VRMAvatarOptions) {
    const { canvas, backgroundColor = 0x4a5568 } = options;
    this.canvas = canvas;

    // Get actual display size
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width || 1280;
    const height = rect.height || canvas.height || 720;

    console.log('[VRMAvatar] Initializing with canvas size:', { width, height, rect });

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(backgroundColor);

    // Camera - framing upper body
    this.camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 20);
    this.camera.position.set(0, 1.4, 1.2); // Standard interview framing
    this.camera.lookAt(0, 1.3, 0); // Look at upper chest

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true, // Important for canvas capture
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 1);
    this.scene.add(directionalLight);

    // Clock
    this.clock = new THREE.Clock();

    console.log('[VRMAvatar] Constructor complete');
  }

  async loadVRM(path: string): Promise<void> {
    console.log('[VRMAvatar] Loading VRM from:', path);

    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      loader.load(
        path,
        (gltf) => {
          console.log('[VRMAvatar] GLTF loaded, extracting VRM...');
          const vrm = gltf.userData.vrm as VRM;

          if (!vrm) {
            console.error('[VRMAvatar] No VRM data in GLTF');
            reject(new Error('No VRM data in GLTF'));
            return;
          }

          // Clean up previous VRM if exists
          if (this.vrm) {
            this.scene.remove(this.vrm.scene);
            VRMUtils.deepDispose(this.vrm.scene);
          }

          // Check VRM version and rotate appropriately
          console.log('[VRMAvatar] VRM meta:', vrm.meta);

          // Try to detect VRM version
          const isVRM0 = vrm.meta?.metaVersion === '0';

          if (isVRM0) {
            VRMUtils.rotateVRM0(vrm);
          }

          // Face the camera (rotate 180 degrees on Y axis)
          vrm.scene.rotation.y = Math.PI;

          this.vrm = vrm;
          this.scene.add(vrm.scene);

          console.log('[VRMAvatar] VRM scene position:', vrm.scene.position);
          console.log('[VRMAvatar] VRM scene rotation:', vrm.scene.rotation);

          console.log('[VRMAvatar] VRM loaded successfully');
          resolve();
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            console.log(`[VRMAvatar] Loading progress: ${percent}%`);
          }
        },
        (error) => {
          console.error('[VRMAvatar] Failed to load VRM:', error);
          reject(error);
        }
      );
    });
  }

  // Apply facial landmarks to VRM
  applyFaceLandmarks(results: FaceLandmarkerResult): void {
    if (!this.vrm || !results.faceBlendshapes || results.faceBlendshapes.length === 0) {
      return;
    }

    const blendshapes = results.faceBlendshapes[0].categories;
    const expressionManager = this.vrm.expressionManager;

    if (!expressionManager) return;

    // Map MediaPipe blendshapes to VRM expressions
    for (const shape of blendshapes) {
      const value = shape.score;

      switch (shape.categoryName) {
        // Eyes - Blink
        case 'eyeBlinkLeft':
          expressionManager.setValue('blinkLeft', value);
          break;
        case 'eyeBlinkRight':
          expressionManager.setValue('blinkRight', value);
          break;

        // Mouth
        case 'jawOpen':
          // Map jaw open to "aa" (mouth open) expression
          expressionManager.setValue('aa', value * 0.8);
          break;

        case 'mouthSmileLeft':
        case 'mouthSmileRight':
          // Combine for "happy" expression
          const smileValue = Math.max(
            blendshapes.find((s) => s.categoryName === 'mouthSmileLeft')?.score || 0,
            blendshapes.find((s) => s.categoryName === 'mouthSmileRight')?.score || 0
          );
          expressionManager.setValue('happy', smileValue * 0.7);
          break;

        case 'mouthFrownLeft':
        case 'mouthFrownRight':
          const frownValue = Math.max(
            blendshapes.find((s) => s.categoryName === 'mouthFrownLeft')?.score || 0,
            blendshapes.find((s) => s.categoryName === 'mouthFrownRight')?.score || 0
          );
          expressionManager.setValue('sad', frownValue * 0.5);
          break;

        case 'mouthPucker':
          expressionManager.setValue('ou', value * 0.6);
          break;
      }
    }

    // Apply head rotation from transformation matrix
    if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
      const matrix = results.facialTransformationMatrixes[0].data;
      this.applyHeadRotation(matrix);
    }
  }

  // Apply head rotation from transformation matrix
  private applyHeadRotation(matrixData: number[] | Float32Array): void {
    if (!this.vrm) return;

    const head = this.vrm.humanoid?.getNormalizedBoneNode('head');
    if (!head) return;

    // Extract rotation from 4x4 matrix
    const matrix = new THREE.Matrix4().fromArray(matrixData);
    const rotation = new THREE.Euler().setFromRotationMatrix(matrix);

    // Apply smoothed rotation (inverted for mirror effect)
    const smoothing = 0.3;
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -rotation.x * 0.5, smoothing);
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, rotation.y * 0.5, smoothing);
    head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, -rotation.z * 0.3, smoothing);
  }

  // Reset to neutral expression (for face lost)
  resetToNeutral(): void {
    if (!this.vrm || !this.vrm.expressionManager) return;

    const expressionManager = this.vrm.expressionManager;

    // Reset all expressions to 0
    expressionManager.setValue('aa', 0);
    expressionManager.setValue('ih', 0);
    expressionManager.setValue('ou', 0);
    expressionManager.setValue('ee', 0);
    expressionManager.setValue('oh', 0);
    expressionManager.setValue('happy', 0);
    expressionManager.setValue('sad', 0);
    expressionManager.setValue('angry', 0);
    expressionManager.setValue('surprised', 0);
    expressionManager.setValue('blinkLeft', 0);
    expressionManager.setValue('blinkRight', 0);

    // Reset head rotation
    const head = this.vrm.humanoid?.getNormalizedBoneNode('head');
    if (head) {
      head.rotation.set(0, 0, 0);
    }
  }

  // Start render loop
  startRenderLoop(): void {
    console.log('[VRMAvatar] Starting render loop');
    let frameCount = 0;

    const render = () => {
      const delta = this.clock.getDelta();

      if (this.vrm) {
        this.vrm.update(delta);
      }

      this.renderer.render(this.scene, this.camera);

      // Log occasionally to confirm rendering
      frameCount++;
      if (frameCount === 1 || frameCount % 300 === 0) {
        console.log(`[VRMAvatar] Render frame ${frameCount}, VRM loaded: ${!!this.vrm}`);
      }

      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  // Stop render loop
  stopRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Resize handler
  resize(width: number, height: number): void {
    console.log('[VRMAvatar] Resize:', { width, height });
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  // Get canvas for streaming
  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  // Cleanup
  dispose(): void {
    console.log('[VRMAvatar] Disposing');
    this.stopRenderLoop();

    if (this.vrm) {
      this.scene.remove(this.vrm.scene);
      VRMUtils.deepDispose(this.vrm.scene);
    }

    this.renderer.dispose();
  }
}
