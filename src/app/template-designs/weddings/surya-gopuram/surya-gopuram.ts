import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  Renderer2,
  ViewChild,
} from '@angular/core';
import type * as Three from 'three';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SURYA_GOPURAM_INVITATION } from './surya-gopuram.data';

@Component({
  selector: 'app-surya-gopuram',
  imports: [],
  templateUrl: './surya-gopuram.html',
  styleUrl: './surya-gopuram.css',
})
export class SuryaGopuram implements AfterViewInit, OnDestroy {
  @ViewChild('templeCanvas') private readonly templeCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('musicPlayer') private readonly musicPlayer?: ElementRef<HTMLAudioElement>;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly renderer2 = inject(Renderer2);

  readonly invitation = SURYA_GOPURAM_INVITATION;
  isMusicPlaying = false;

  private THREE?: typeof Three;
  private renderer?: Three.WebGLRenderer;
  private scene?: Three.Scene;
  private camera?: Three.PerspectiveCamera;
  private templeModel?: Three.Group;
  private modelBasePosition?: Three.Vector3;
  private ganeshaModel?: Three.Group;
  private ganeshaBasePosition?: Three.Vector3;
  private ganeshaBaseScale = 1;
  private frameId = 0;
  private clock?: Three.Clock;
  private isCompactViewport = false;
  private scrollProgress = 0;
  private pageProgress = 0;

  ngAfterViewInit() {
    void this.createTempleScene();
    void this.startMusic();
    this.onScroll();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frameId);
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
    this.isCompactViewport = window.matchMedia('(max-width: 820px)').matches;
    this.resizeRenderer();
    this.frameTemple();
    this.onScroll();
  }

  @HostListener('window:scroll')
  onScroll() {
    const scrollStage = this.host.nativeElement.querySelector('.gopuram-scroll');
    const page = this.host.nativeElement.querySelector('.surya-page');

    if (!scrollStage || !page) {
      return;
    }

    const rect = scrollStage.getBoundingClientRect();
    const scrollRange = Math.max(1, rect.height - window.innerHeight);
    this.scrollProgress = this.clamp(-rect.top / scrollRange, 0, 1);

    const pageRect = page.getBoundingClientRect();
    const pageScrollRange = Math.max(1, pageRect.height - window.innerHeight);
    this.pageProgress = this.clamp(-pageRect.top / pageScrollRange, 0, 1);

    this.renderer2.setStyle(
      this.host.nativeElement,
      '--surya-progress',
      String(this.scrollProgress),
    );

    // FIX: Evenly-spaced phase windows — each panel gets an equal 0.20 wide band
    // with a 0.06 gap before the next one starts, preventing overlap and pop.
    //
    //  intro :  1.0 → 0.0   over [0.00 – 0.20]
    //  name  :  0.0 → 1.0   over [0.26 – 0.46]
    //  bless :  0.0 → 1.0   over [0.44 – 0.64]
    //  detail:  0.0 → 1.0   over [0.62 – 0.82]
    //
    // The slight overlaps between name/blessing (0.44 vs 0.46) and
    // blessing/detail (0.62 vs 0.64) are intentional — they create a
    // natural cascade feel without jarring pauses.

    const introReveal   = 1 - this.phase(this.scrollProgress, 0.00, 0.20);
    const nameReveal    = this.phase(this.scrollProgress, 0.26, 0.46);
    const blessingReveal = this.phase(this.scrollProgress, 0.44, 0.64);
    const detailsReveal  = this.phase(this.scrollProgress, 0.62, 0.82);

    this.renderer2.setStyle(this.host.nativeElement, '--intro-reveal',    String(introReveal));
    this.renderer2.setStyle(this.host.nativeElement, '--name-reveal',     String(nameReveal));
    this.renderer2.setStyle(this.host.nativeElement, '--name-x',          `${-42 + nameReveal * 42}px`);
    this.renderer2.setStyle(this.host.nativeElement, '--name-y',          `${28  - nameReveal * 28}px`);
    this.renderer2.setStyle(this.host.nativeElement, '--blessing-reveal',  String(blessingReveal));
    this.renderer2.setStyle(this.host.nativeElement, '--blessing-x',       `${36  - blessingReveal * 36}px`);
    this.renderer2.setStyle(this.host.nativeElement, '--blessing-y',       `${-18 + blessingReveal * 18}px`);
    this.renderer2.setStyle(this.host.nativeElement, '--details-reveal',   String(detailsReveal));
    this.renderer2.setStyle(this.host.nativeElement, '--details-y',        `${44  - detailsReveal * 44}px`);
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

    audio.volume = 0.36;

    try {
      await audio.play();
      this.isMusicPlaying = true;
    } catch {
      this.isMusicPlaying = false;
    }
  }

  private async createTempleScene() {
    const canvas = this.templeCanvas?.nativeElement;

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
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(0, 1.1, 9);

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
    this.renderer.toneMappingExposure = 1.22;

    const ambientLight = new THREE.HemisphereLight(0xffead0, 0x5c2a1b, 2.2);
    const sunLight = new THREE.DirectionalLight(0xffc46a, 4.8);
    const frontLight = new THREE.DirectionalLight(0xfff7df, 2.2);
    const lampGlow = new THREE.PointLight(0xff8f2f, 18, 14);
    sunLight.position.set(0, 5.2, -3.4);
    frontLight.position.set(3.4, 3.8, 6.2);
    lampGlow.position.set(-2.6, 0.8, 3.4);
    this.scene.add(ambientLight, sunLight, frontLight, lampGlow);

    const Loader = loaderModule.GLTFLoader as typeof GLTFLoader;
    new Loader().load(
      '/assets/textures/indianTemple/indian_temple_3d_model_south_indian_architecture.glb',
      (gltf) => {
        this.templeModel = gltf.scene;
        this.prepareTempleMaterials(this.templeModel);
        this.scene?.add(this.templeModel);
        this.frameTemple();
      },
    );

    this.resizeRenderer();
    this.animate();
  }

  private resizeRenderer() {
    const canvas = this.templeCanvas?.nativeElement;

    if (!canvas || !this.renderer || !this.camera) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const width  = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private frameTemple() {
    if (!this.THREE || !this.templeModel || !this.camera) {
      return;
    }

    const THREE = this.THREE;
    const box    = new THREE.Box3().setFromObject(this.templeModel);
    const size   = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const modelHeight  = Math.max(size.y, 1);
    const targetHeight = this.isCompactViewport ? 3.15 : 3.75;
    const scale = targetHeight / modelHeight;

    this.templeModel.scale.setScalar(scale);
    this.templeModel.position.set(
      -center.x * scale,
      -center.y * scale - 0.32,
      -center.z * scale,
    );
    this.modelBasePosition = this.templeModel.position.clone();
    this.templeModel.rotation.set(0.01, -0.68, 0);
    this.camera.position.set(
      0,
      this.isCompactViewport ? 0.28 : 0.34,
      this.isCompactViewport ? 9.8  : 9.4,
    );
    this.camera.lookAt(0, 0.04, 0);
  }

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);

    if (!this.renderer || !this.scene || !this.camera || !this.clock) {
      return;
    }

    const elapsed = this.clock.elapsedTime;

    if (this.templeModel && this.modelBasePosition) {
      const progress    = this.easeInOutCubic(this.scrollProgress);
      const breathe     = Math.sin(elapsed * 0.72) * 0.018;
      const turn        = -0.68 + progress * 1.08;
      const revealLift  = progress * (this.isCompactViewport ? 0.16 : 0.26);
      const depthPush   = (1 - progress) * (this.isCompactViewport ? 0.24 : 0.32);

      // FIX: temple exit / side travel — widen the phase windows so the model
      // glides out smoothly instead of snapping. Old values were too narrow
      // (0.48–0.66) which caused a sudden jump on the boundary.
      const templeExit  = this.phase(this.pageProgress, 0.52, 0.72);
      const templeSide  =
        -0.9 * this.phase(this.pageProgress, 0.18, 0.34) +
         1.65 * this.phase(this.pageProgress, 0.40, 0.58);

      this.templeModel.visible = templeExit < 0.98;
      this.templeModel.rotation.x = 0.02 - progress * 0.03;
      this.templeModel.rotation.y = turn + Math.sin(elapsed * 0.32) * 0.018;
      this.templeModel.rotation.z = Math.sin(progress * Math.PI) * -0.018;
      this.templeModel.position.x =
        this.modelBasePosition.x + Math.sin(progress * Math.PI) * 0.08 + templeSide;
      this.templeModel.position.y =
        this.modelBasePosition.y + revealLift + breathe - templeExit * 1.1;
      this.templeModel.position.z =
        this.modelBasePosition.z + depthPush - templeExit * 2.8;
    }

    if (this.ganeshaModel && this.ganeshaBasePosition) {
      // FIX: Ganesha reveal/exit windows widened to match temple's new rhythm.
      // Old reveal [0.02–0.10] was too short — Ganesha popped in on first frame.
      // Old exit [0.94–1.00] was tight — it vanished abruptly near the page end.
      const ganeshaReveal = this.phase(this.pageProgress, 0.04, 0.14);
      const ganeshaExit   = this.phase(this.pageProgress, 0.88, 0.98);
      const travel        = this.easeInOutCubic(this.pageProgress);
      const blessingFloat = Math.sin(elapsed * 0.9) * 0.014;
      const maxX  = this.isCompactViewport ? 2.05 : 3.45;
      const waveX = Math.sin(travel * Math.PI * 2.15 - Math.PI / 2) * maxX;
      const waveY =
        (this.isCompactViewport ? -0.82 : -0.72) +
        Math.sin(travel * Math.PI * 3.4) * (this.isCompactViewport ? 0.46 : 0.62);
      const sectionLift =
        this.phase(this.pageProgress, 0.34, 0.72) * (this.isCompactViewport ? 0.28 : 0.38);

      this.ganeshaModel.visible = ganeshaReveal > 0.02 && ganeshaExit < 0.98;
      this.ganeshaModel.scale.setScalar(
        this.ganeshaBaseScale * (0.78 + ganeshaReveal * 0.22 - ganeshaExit * 0.2),
      );
      this.ganeshaModel.rotation.x = 0.02 + Math.sin(travel * Math.PI * 2) * 0.06;
      this.ganeshaModel.rotation.y =
        0.42 + Math.sin(travel * Math.PI * 2.15) * 0.82 + Math.sin(elapsed * 0.36) * 0.012;
      this.ganeshaModel.rotation.z = Math.sin(travel * Math.PI * 3.2) * 0.08;
      this.ganeshaModel.position.x = waveX;
      this.ganeshaModel.position.y = waveY + sectionLift + blessingFloat - ganeshaExit * 0.4;
      this.ganeshaModel.position.z = this.ganeshaBasePosition.z;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private prepareTempleMaterials(model: Three.Group) {
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
        standard.side      = THREE.DoubleSide;
        standard.roughness = 0.68;
        standard.metalness = 0.02;

        if (standard.map) {
          standard.map.colorSpace  = THREE.SRGBColorSpace;
          standard.map.anisotropy  = 8;
          standard.map.needsUpdate = true;
        }

        standard.needsUpdate = true;
      });
    });
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private easeInOutCubic(value: number) {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  private phase(value: number, start: number, end: number) {
    return this.easeInOutCubic(this.clamp((value - start) / Math.max(0.001, end - start), 0, 1));
  }
}
