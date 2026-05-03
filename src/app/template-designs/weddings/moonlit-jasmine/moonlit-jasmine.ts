import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Renderer2,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import type * as Three from 'three';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MOONLIT_JASMINE_INVITATION } from './moonlit-jasmine.data';

@Component({
  selector: 'app-moonlit-jasmine',
  imports: [],
  templateUrl: './moonlit-jasmine.html',
  styleUrl: './moonlit-jasmine.css',
})
export class MoonlitJasmine implements AfterViewInit, OnDestroy {
  @ViewChild('butterflyCanvas') private readonly butterflyCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('musicPlayer') private readonly musicPlayer?: ElementRef<HTMLAudioElement>;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly renderer2 = inject(Renderer2);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly invitation = MOONLIT_JASMINE_INVITATION;
  isMusicPlaying = false;
  readonly liveComments = [
    'Wow, so beautiful 😍',
    'Sure, we will come 💛',
    'Congrats Ava & Leo 🎉',
    'This is magical ✨',
    'Counting down already 🥂',
    'Best couple ever 💐',
  ];
  activeComments: Array<{ id: number; text: string }> = [];

  private THREE?: typeof Three;
  private renderer?: Three.WebGLRenderer;
  private scene?: Three.Scene;
  private camera?: Three.PerspectiveCamera;
  private butterflyModel?: Three.Group;
  private mixer?: Three.AnimationMixer;
  private frameId = 0;
  private commentId = 0;
  private commentTimer?: ReturnType<typeof window.setInterval>;
  private isCompactViewport = false;
  private scrollProgress = 0;
  private clock?: Three.Clock;

  ngAfterViewInit() {
    void this.createButterflyScene();
    void this.startMusic();
    this.startLiveComments();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frameId);
    window.clearInterval(this.commentTimer);
    this.musicPlayer?.nativeElement.pause();
    this.renderer?.dispose();
    this.scene?.traverse((object) => {
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

  @HostListener('window:resize')
  onResize() {
    this.isCompactViewport = window.matchMedia('(max-width: 920px)').matches;
    this.resizeRenderer();
  }

  @HostListener('window:scroll')
  onScroll() {
    const canvas = this.butterflyCanvas?.nativeElement;
    const host = canvas?.closest('.jasmine-hero-scroll') ?? canvas?.closest('.preview-stage');

    if (!host) {
      return;
    }

    const rect = host.getBoundingClientRect();
    const scrollRange = Math.max(1, rect.height - window.innerHeight);
    this.scrollProgress = this.clamp(-rect.top / scrollRange, 0, 1);
    this.renderer2.setStyle(
      this.host.nativeElement,
      '--scroll-progress',
      String(this.scrollProgress),
    );
  }

  async toggleMusic() {
    if (this.isMusicPlaying) {
      this.pauseMusic();
      return;
    }

    await this.startMusic();
  }

  private pauseMusic() {
    const audio = this.musicPlayer?.nativeElement;

    if (!audio) {
      return;
    }

    audio.pause();
    this.isMusicPlaying = false;
  }

  private async startMusic() {
    const audio = this.musicPlayer?.nativeElement;

    if (!audio) {
      return;
    }

    audio.volume = 0.42;

    try {
      await audio.play();
      this.isMusicPlaying = true;
    } catch {
      this.isMusicPlaying = false;
    }
  }

  private startLiveComments() {
    this.pushLiveComment();
    this.commentTimer = window.setInterval(() => this.pushLiveComment(), 1800);
  }

  private pushLiveComment() {
    const text = this.liveComments[this.commentId % this.liveComments.length];
    const comment = {
      id: this.commentId++,
      text,
    };

    this.activeComments = [comment];
    this.changeDetector.detectChanges();
  }

  private async createButterflyScene() {
    const canvas = this.butterflyCanvas?.nativeElement;

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
    this.isCompactViewport = window.matchMedia('(max-width: 920px)').matches;
    const Loader = loaderModule.GLTFLoader as typeof GLTFLoader;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    this.camera.position.set(0, 0.4, 7.2);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    const ambientLight = new THREE.HemisphereLight(0xfff0d7, 0x0c544c, 2.2);
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
    const fillLight = new THREE.PointLight(0xff9d2e, 18, 12);
    const rimLight = new THREE.DirectionalLight(0x10d8c7, 2.6);
    keyLight.position.set(2.8, 4.2, 5.4);
    fillLight.position.set(-2.4, 1.4, 3.2);
    rimLight.position.set(-3.6, 2.6, -2.4);
    this.scene.add(ambientLight, keyLight, fillLight, rimLight);

    new Loader().load('/assets/scene.gltf', (gltf) => {
      this.butterflyModel = gltf.scene;
      this.butterflyModel.scale.setScalar(0.013);
      this.butterflyModel.position.set(2.8, -0.38, 0.08);
      this.butterflyModel.rotation.set(0.18, -1.12, -0.18);
      this.prepareButterflyMaterials(this.butterflyModel);
      this.mixer = new THREE.AnimationMixer(this.butterflyModel);
      gltf.animations.forEach((clip) => this.mixer?.clipAction(clip).play());
      this.scene?.add(this.butterflyModel);
    });

    this.resizeRenderer();
    this.onScroll();
    this.animate();
  }

  private resizeRenderer() {
    const canvas = this.butterflyCanvas?.nativeElement;

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

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);

    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }

    if (!this.THREE || !this.clock) {
      return;
    }

    const delta = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;
    const progress = this.scrollProgress;
    this.mixer?.update(delta * 1.65);

    if (this.butterflyModel) {
      const curve = Math.sin(progress * Math.PI);
      const mobile = this.isCompactViewport;
      this.butterflyModel.position.x = mobile
        ? this.lerp(1.45, -1.35, progress)
        : this.lerp(2.8, -2.35, progress);
      this.butterflyModel.position.y =
        (mobile ? this.lerp(-0.72, 0.92, progress) : this.lerp(-0.35, 1.35, progress)) +
        Math.sin(elapsed * 4.4) * 0.1 +
        curve * (mobile ? 0.3 : 0.46);
      this.butterflyModel.position.z = mobile
        ? this.lerp(0.05, -0.62, progress)
        : this.lerp(0.45, -0.88, progress);
      this.butterflyModel.rotation.x = 0.18 + Math.sin(elapsed * 1.8) * 0.1;
      this.butterflyModel.rotation.y = -1.12 + progress * 3.6 + Math.sin(elapsed * 1.2) * 0.16;
      this.butterflyModel.rotation.z = -0.18 + Math.sin(elapsed * 2.8) * 0.18;
      this.butterflyModel.scale.setScalar(
        mobile ? 0.0038 + curve * 0.0024 : 0.011 + curve * 0.007,
      );
    }

    this.camera.position.x = this.isCompactViewport
      ? this.lerp(0.08, -0.08, progress)
      : this.lerp(0.25, -0.25, progress);
    this.camera.position.y = this.isCompactViewport ? 0.04 + progress * 0.38 : 0.08 + progress * 0.62;
    this.camera.position.z = this.isCompactViewport ? 8.8 - progress * 0.6 : 7.8 - progress * 1.15;
    this.camera.lookAt(0, 0.35, 0);
    this.renderer.render(this.scene, this.camera);
  };

  private prepareButterflyMaterials(model: Three.Group) {
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
        standard.transparent = false;
        standard.opacity = 1;
        standard.metalness = 0;
        standard.roughness = 0.36;

        const name = standard.name.toLowerCase();
        const isBlue = name.includes('blue');
        const wingColor = isBlue ? 0x00b8a9 : 0xff8a1c;
        const glowColor = isBlue ? 0x004f49 : 0x7a2e00;
        standard.color = new THREE.Color(wingColor);
        standard.emissive = new THREE.Color(glowColor);
        standard.emissiveIntensity = 0.28;

        if (standard.map) {
          standard.map.colorSpace = THREE.SRGBColorSpace;
          standard.map.anisotropy = 8;
          standard.map.needsUpdate = true;
        }

        standard.needsUpdate = true;
      });
    });
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private lerp(start: number, end: number, amount: number) {
    return start + (end - start) * amount;
  }
}
