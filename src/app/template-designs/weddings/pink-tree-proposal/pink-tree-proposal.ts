import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import type Lenis from 'lenis';
import type * as Three from 'three';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PINK_TREE_PROPOSAL } from './pink-tree-proposal.data';

type AnswerState = 'pending' | 'yes' | 'no';

@Component({
  selector: 'app-pink-tree-proposal',
  imports: [],
  templateUrl: './pink-tree-proposal.html',
  styleUrl: './pink-tree-proposal.css',
})
export class PinkTreeProposal implements AfterViewInit, OnDestroy {
  @ViewChild('treeCanvas') private readonly treeCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('ringCanvas') private readonly ringCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('storyStage') private readonly storyStage?: ElementRef<HTMLElement>;
  @ViewChild('cinematicPin') private readonly cinematicPin?: ElementRef<HTMLElement>;

  readonly proposal = PINK_TREE_PROPOSAL;
  answerState: AnswerState = 'pending';
  isSceneReady = false;
  modelLoadProgress = 0;
  modelLoadFailed = false;
  assetLoadLabel = 'Loading cinematic world';

  private readonly changeDetector = inject(ChangeDetectorRef);
  private THREE?: typeof Three;
  private renderer?: Three.WebGLRenderer;
  private scene?: Three.Scene;
  private camera?: Three.PerspectiveCamera;
  private ringRenderer?: Three.WebGLRenderer;
  private ringScene?: Three.Scene;
  private ringCamera?: Three.PerspectiveCamera;
  private treeModel?: Three.Group;
  private ringModel?: Three.Group;
  private butterflyModel?: Three.Group;
  private butterflyMixer?: Three.AnimationMixer;
  private modelBasePosition?: Three.Vector3;
  private ringBasePosition?: Three.Vector3;
  private frameId = 0;
  private clock?: Three.Clock;
  private isCompactViewport = false;
  private storyProgress = 0;
  private lenis?: Lenis;
  private gsapTicker?: (time: number) => void;
  private gsapModule?: typeof import('gsap').gsap;
  private scrollTrigger?: typeof import('gsap/ScrollTrigger').ScrollTrigger;
  private animationContext?: gsap.Context;

  ngAfterViewInit() {
    void this.prepareProposal();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frameId);
    this.animationContext?.revert();
    this.scrollTrigger?.getAll().forEach((trigger) => trigger.kill());

    if (this.gsapTicker) {
      this.gsapModule?.ticker.remove(this.gsapTicker);
    }

    this.lenis?.destroy();
    this.renderer?.dispose();
    this.ringRenderer?.dispose();
    this.disposeScene(this.scene);
    this.disposeScene(this.ringScene);
  }

  @HostListener('window:resize')
  onResize() {
    this.isCompactViewport = window.matchMedia('(max-width: 820px)').matches;
    this.resizeRenderer();
    this.resizeRingRenderer();
    this.frameTree();
    this.frameRing();
    this.frameButterfly();
    this.scrollTrigger?.refresh();
  }

  async answer(choice: AnswerState) {
    this.answerState = choice;
    this.changeDetector.detectChanges();

    const gsap = this.gsapModule;
    if (gsap) {
      gsap.fromTo(
        '.answer-banner',
        { opacity: 0, y: 26, filter: 'blur(14px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' },
      );
    }

    if (choice === 'yes') {
      await this.celebrateYes();
    }
  }

  private async prepareProposal() {
    await this.createTreeScene();
    this.isSceneReady = true;
    this.changeDetector.detectChanges();

    requestAnimationFrame(() => {
      void this.createScrollExperience();
      this.scrollTrigger?.refresh();
    });
  }

  private async createScrollExperience() {
    const stage = this.storyStage?.nativeElement;
    const pin = this.cinematicPin?.nativeElement;

    if (!stage || !pin) {
      return;
    }

    const [{ gsap }, { ScrollTrigger }, lenisModule] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('lenis'),
    ]);
    const Lenis = lenisModule.default;

    gsap.registerPlugin(ScrollTrigger);
    this.gsapModule = gsap;
    this.scrollTrigger = ScrollTrigger;

    const lenis = new Lenis({
      duration: 1.45,
      easing: (time: number) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
      smoothWheel: true,
    });
    this.lenis = lenis;
    lenis.on('scroll', () => ScrollTrigger.update());
    this.gsapTicker = (time: number) => this.lenis?.raf(time * 1000);
    gsap.ticker.add(this.gsapTicker);
    gsap.ticker.lagSmoothing(0);

    this.animationContext = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('.night-sky', { opacity: 0, duration: 1.2 })
        .from('.tree-stage', { opacity: 0, scale: 0.82, filter: 'blur(24px)', duration: 2.1 }, 0.1)
        .from(
          '.proposal-title .eyebrow, .proposal-title h1, .proposal-title p',
          { opacity: 0, y: 34, filter: 'blur(14px)', duration: 1.05, stagger: 0.16 },
          0.8,
        );

      gsap
        .timeline({
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: '+=620%',
            pin,
            scrub: 1.8,
            anticipatePin: 1,
            onUpdate: (self) => this.updateStoryProgress(self.progress),
          },
        })
        .to('.proposal-title', { opacity: 0, y: -70, filter: 'blur(10px)', duration: 0.58 }, 0.1)
        .fromTo(
          '.story-one',
          { opacity: 0, y: 48, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.34 },
          0.18,
        )
        .to('.story-one', { opacity: 0, y: -34, filter: 'blur(8px)', duration: 0.24 }, 0.5)
        .fromTo(
          '.story-two',
          { opacity: 0, y: 48, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.34 },
          0.52,
        )
        .to('.story-two', { opacity: 0, y: -34, filter: 'blur(8px)', duration: 0.24 }, 0.82)
        .fromTo(
          '.story-three',
          { opacity: 0, y: 48, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.38 },
          0.84,
        )
        .to('.tree-stage', { scale: 1.14, duration: 1 }, 0);

      gsap.utils.toArray<HTMLElement>('.reveal-soft').forEach((item) => {
        gsap.from(item, {
          scrollTrigger: {
            trigger: item,
            start: 'top 82%',
            end: 'top 52%',
            scrub: 0.85,
          },
          opacity: 0,
          y: 58,
          filter: 'blur(14px)',
          ease: 'power2.out',
        });
      });

      gsap.utils.toArray<HTMLElement>('.detail-card').forEach((card, index) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top 82%',
            end: 'top 48%',
            scrub: 0.9,
          },
          opacity: 0,
          y: 78,
          rotateX: index % 2 === 0 ? 8 : -8,
          filter: 'blur(14px)',
          ease: 'power2.out',
        });
      });

      gsap.utils.toArray<HTMLElement>('.magnetic-card').forEach((card) => {
        card.addEventListener('pointermove', (event) => this.moveMagneticCard(event, card));
        card.addEventListener('pointerleave', () => gsap.to(card, { x: 0, y: 0, duration: 0.55, ease: 'power3.out' }));
      });

      ScrollTrigger.refresh();
    });
  }

  private async createTreeScene() {
    const canvas = this.treeCanvas?.nativeElement;

    if (!canvas) {
      return;
    }

    const [threeModule, loaderModule] = await Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
    ]);
    const THREE = threeModule;
    this.THREE = THREE;
    this.clock = new THREE.Clock();
    this.isCompactViewport = window.matchMedia('(max-width: 820px)').matches;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    this.camera.position.set(0, 0.4, 9.2);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;

    const ambientLight = new THREE.HemisphereLight(0xffe6f5, 0x170c2a, 2.5);
    const moonLight = new THREE.DirectionalLight(0xd9c7ff, 4.4);
    const petalGlow = new THREE.PointLight(0xff6fb7, 18, 14);
    const warmFill = new THREE.DirectionalLight(0xffd8a8, 1.8);
    moonLight.position.set(-2.4, 6.2, 3.6);
    petalGlow.position.set(1.2, 1.2, 3.8);
    warmFill.position.set(4.5, 2.2, 6.2);
    this.scene.add(ambientLight, moonLight, petalGlow, warmFill);

    const Loader = loaderModule.GLTFLoader as typeof GLTFLoader;
    const loader = new Loader();
    this.resizeRenderer();
    this.animate();

    try {
      const [tree, ring, butterfly] = await Promise.all([
        this.loadStoryAsset(loader, '/assets/tree_pink_fbx.glb', 'Growing the pink tree', 0),
        this.loadStoryAsset(loader, '/assets/the_ring_1_carat.glb', 'Polishing the ring', 1),
        this.loadStoryAsset(loader, '/assets/scene.gltf', 'Waking the butterfly', 2),
      ]);

      this.treeModel = tree.scene;
      this.prepareStoryMaterials(this.treeModel);
      this.scene.add(this.treeModel);

      this.ringModel = ring.scene;
      this.prepareStoryMaterials(this.ringModel);
      this.createRingStage(this.ringModel);

      this.butterflyModel = butterfly.scene;
      this.prepareStoryMaterials(this.butterflyModel);
      this.butterflyMixer = new THREE.AnimationMixer(this.butterflyModel);
      butterfly.animations.forEach((clip) => this.butterflyMixer?.clipAction(clip).play());
      this.scene.add(this.butterflyModel);

      this.frameTree();
      this.frameRing();
      this.frameButterfly();
      this.modelLoadProgress = 100;
      this.assetLoadLabel = 'The story is ready';
      this.changeDetector.detectChanges();
    } catch {
      this.modelLoadFailed = true;
      this.modelLoadProgress = 100;
      this.assetLoadLabel = 'Opening the story with available models';
      this.changeDetector.detectChanges();
    }
  }

  private loadStoryAsset(
    loader: GLTFLoader,
    path: string,
    label: string,
    index: number,
  ): Promise<Awaited<ReturnType<GLTFLoader['loadAsync']>>> {
    const assetWeight = 100 / 3;

    return new Promise((resolve, reject) => {
      loader.load(
        path,
        (gltf) => {
          this.assetLoadLabel = label;
          this.modelLoadProgress = Math.max(this.modelLoadProgress, Math.round((index + 1) * assetWeight));
          this.changeDetector.detectChanges();
          resolve(gltf);
        },
        (event) => {
          this.assetLoadLabel = label;
          const localProgress =
            !event.lengthComputable || event.total === 0
              ? 0.55
              : Math.min(0.96, event.loaded / event.total);
          this.modelLoadProgress = Math.max(
            this.modelLoadProgress,
            Math.round((index + localProgress) * assetWeight),
          );
          this.changeDetector.detectChanges();
        },
        reject,
      );
    });
  }

  private resizeRenderer() {
    const canvas = this.treeCanvas?.nativeElement;

    if (!canvas || !this.renderer || !this.camera) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private resizeRingRenderer() {
    const canvas = this.ringCanvas?.nativeElement;

    if (!canvas || !this.ringRenderer || !this.ringCamera) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    this.ringRenderer.setSize(width, height, false);
    this.ringCamera.aspect = width / height;
    this.ringCamera.updateProjectionMatrix();
  }

  private createRingStage(ringModel: Three.Group) {
    const canvas = this.ringCanvas?.nativeElement;

    if (!canvas || !this.THREE) {
      return;
    }

    const THREE = this.THREE;
    this.ringScene = new THREE.Scene();
    this.ringCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    this.ringRenderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.ringRenderer.setClearColor(0x000000, 0);
    this.ringRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.ringRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.ringRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.ringRenderer.toneMappingExposure = 1.6;

    const ambientLight = new THREE.HemisphereLight(0xfff4e1, 0x23103c, 2.1);
    const diamondLight = new THREE.DirectionalLight(0xffffff, 4.8);
    const blushLight = new THREE.PointLight(0xff8ac8, 18, 9);
    const goldLight = new THREE.PointLight(0xffdc8a, 12, 8);
    diamondLight.position.set(2.8, 3.6, 4.4);
    blushLight.position.set(-1.8, 0.8, 2.4);
    goldLight.position.set(2.2, -0.3, 2.8);
    this.ringScene.add(ambientLight, diamondLight, blushLight, goldLight, ringModel);
    this.resizeRingRenderer();
    this.frameRing();
  }

  private frameTree() {
    if (!this.THREE || !this.treeModel || !this.camera) {
      return;
    }

    const THREE = this.THREE;
    const box = new THREE.Box3().setFromObject(this.treeModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const targetHeight = this.isCompactViewport ? 4.2 : 5.05;
    const scale = targetHeight / Math.max(size.y, 1);

    this.treeModel.scale.setScalar(scale);
    this.treeModel.position.set(
      -center.x * scale,
      -center.y * scale - (this.isCompactViewport ? 0.18 : 0.34),
      -center.z * scale,
    );
    this.modelBasePosition = this.treeModel.position.clone();
    this.treeModel.rotation.set(0.02, -0.26, 0);
    this.camera.position.set(0, this.isCompactViewport ? 0.34 : 0.48, this.isCompactViewport ? 9.8 : 8.9);
    this.camera.lookAt(0, 0.22, 0);
  }

  private frameRing() {
    if (!this.THREE || !this.ringModel || !this.ringCamera) {
      return;
    }

    const THREE = this.THREE;
    const box = new THREE.Box3().setFromObject(this.ringModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const targetSize = this.isCompactViewport ? 0.9 : 1.18;
    const scale = targetSize / Math.max(size.x, size.y, size.z, 1);

    this.ringModel.scale.setScalar(scale);
    this.ringModel.position.set(-center.x * scale, -center.y * scale - 0.02, -center.z * scale);
    this.ringBasePosition = this.ringModel.position.clone();
    this.ringModel.rotation.set(0.74, 0.2, -0.28);
    this.ringCamera.position.set(0, 0.08, this.isCompactViewport ? 4.4 : 4.1);
    this.ringCamera.lookAt(0, 0, 0);
  }

  private frameButterfly() {
    if (!this.butterflyModel) {
      return;
    }

    this.butterflyModel.scale.setScalar(this.isCompactViewport ? 0.0048 : 0.011);
    this.butterflyModel.position.set(this.isCompactViewport ? 1.05 : 2.25, this.isCompactViewport ? 0.12 : 0.42, 0.24);
    this.butterflyModel.rotation.set(0.18, -1.18, -0.12);
  }

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);

    if (!this.renderer || !this.scene || !this.camera || !this.clock) {
      return;
    }

    const delta = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;
    this.butterflyMixer?.update(delta * 1.7);

    if (this.treeModel && this.modelBasePosition) {
      const progress = this.easeInOutCubic(this.storyProgress);
      const breathe = Math.sin(elapsed * 0.7) * 0.035;
      const orbit = Math.sin(progress * Math.PI) * 0.18;

      this.treeModel.rotation.x = 0.02 - progress * 0.025;
      this.treeModel.rotation.y = -0.26 + progress * 0.9 + orbit + Math.sin(elapsed * 0.2) * 0.018;
      this.treeModel.rotation.z = Math.sin(progress * Math.PI) * -0.018;
      this.treeModel.position.x = this.modelBasePosition.x + Math.sin(progress * Math.PI * 1.4) * 0.16;
      this.treeModel.position.y = this.modelBasePosition.y + breathe + this.phase(progress, 0, 0.28) * 0.1;
      this.treeModel.position.z = this.modelBasePosition.z - progress * 0.62;
    }

    this.animateProposalRing(elapsed);
    this.animateButterfly(elapsed);

    this.renderer.render(this.scene, this.camera);
    this.renderRingStage(elapsed);
  };

  private animateProposalRing(elapsed: number) {
    if (!this.ringModel || !this.ringBasePosition) {
      return;
    }

    const hover = Math.sin(elapsed * 1.15) * 0.045;
    this.ringModel.position.x = this.ringBasePosition.x + Math.sin(elapsed * 0.72) * 0.05;
    this.ringModel.position.y = this.ringBasePosition.y + hover;
    this.ringModel.position.z = this.ringBasePosition.z + Math.cos(elapsed * 0.62) * 0.04;
    this.ringModel.rotation.x = 0.82 + Math.sin(elapsed * 0.82) * 0.08;
    this.ringModel.rotation.y = 0.22 + elapsed * 0.6;
    this.ringModel.rotation.z = -0.32 + Math.sin(elapsed * 1.1) * 0.06;
  }

  private renderRingStage(elapsed: number) {
    if (!this.ringRenderer || !this.ringScene || !this.ringCamera) {
      return;
    }

    this.ringCamera.position.y = 0.08 + Math.sin(elapsed * 0.55) * 0.02;
    this.ringCamera.lookAt(0, 0, 0);
    this.ringRenderer.render(this.ringScene, this.ringCamera);
  }

  private animateButterfly(elapsed: number) {
    if (!this.butterflyModel) {
      return;
    }

    const progress = this.easeInOutCubic(this.storyProgress);
    const mobile = this.isCompactViewport;
    const flight = this.phase(progress, 0.02, 0.82);
    const farewell = this.phase(progress, 0.78, 1);
    const flutter = Math.sin(elapsed * 5.2) * (mobile ? 0.05 : 0.08);
    const drift = Math.sin(elapsed * 0.9) * (mobile ? 0.1 : 0.18);
    const startX = mobile ? 1.4 : 2.7;
    const endX = mobile ? -1.1 : -2.25;
    const arc = Math.sin(flight * Math.PI);

    this.butterflyModel.position.x = startX + (endX - startX) * flight + drift + farewell * (mobile ? -0.8 : -1.2);
    this.butterflyModel.position.y = (mobile ? 0.16 : 0.44) + arc * (mobile ? 0.7 : 1.15) + flutter;
    this.butterflyModel.position.z = 0.2 + arc * (mobile ? 0.8 : 1.25) - farewell * 0.5;
    this.butterflyModel.rotation.x = 0.16 + Math.sin(elapsed * 1.8) * 0.12;
    this.butterflyModel.rotation.y = -1.22 + flight * 1.65 + Math.sin(elapsed * 1.1) * 0.22;
    this.butterflyModel.rotation.z = -0.12 + Math.sin(elapsed * 3.1) * 0.22 + arc * 0.18;
    this.butterflyModel.scale.setScalar((mobile ? 0.0048 : 0.011) * (1 + arc * 1.15 - farewell * 0.32));
  }

  private prepareStoryMaterials(model: Three.Group) {
    if (!this.THREE) {
      return;
    }

    const THREE = this.THREE;

    model.traverse((object) => {
      const mesh = object as Three.Mesh;

      if (!mesh.isMesh) {
        return;
      }

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        const standard = material as Three.MeshStandardMaterial;
        standard.side = THREE.DoubleSide;
        standard.roughness = Math.min(0.78, standard.roughness + 0.08);
        standard.metalness = Math.min(0.18, standard.metalness);

        if (standard.map) {
          standard.map.colorSpace = THREE.SRGBColorSpace;
          standard.map.anisotropy = 8;
          standard.map.needsUpdate = true;
        }

        standard.needsUpdate = true;
      });
    });
  }

  private updateStoryProgress(progress: number) {
    this.storyProgress = progress;
    const host = this.treeCanvas?.nativeElement.closest('app-pink-tree-proposal') as HTMLElement | null;
    host?.style.setProperty('--story-progress', String(progress));
  }

  private moveMagneticCard(event: PointerEvent, card: HTMLElement) {
    const gsap = this.gsapModule;

    if (!gsap || window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) * 0.08;
    const y = (event.clientY - rect.top - rect.height / 2) * 0.08;
    gsap.to(card, { x, y, duration: 0.38, ease: 'power3.out' });
  }

  private disposeScene(scene: Three.Scene | undefined) {
    scene?.traverse((object) => {
      const mesh = object as Three.Mesh;

      if (!mesh.isMesh) {
        return;
      }

      mesh.geometry?.dispose();

      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
      } else {
        material?.dispose();
      }
    });
  }

  private async celebrateYes() {
    const confettiModule = await import('canvas-confetti');
    const confetti = confettiModule.default;

    confetti({
      particleCount: 160,
      spread: 86,
      origin: { y: 0.72 },
      colors: ['#ffd1e8', '#ff78b7', '#ffffff', '#f8d26a'],
    });
  }

  private easeInOutCubic(value: number) {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  private phase(value: number, start: number, end: number) {
    return Math.min(1, Math.max(0, (value - start) / Math.max(0.001, end - start)));
  }
}
