import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import type Lenis from 'lenis';
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
  @ViewChild('storyStage') private readonly storyStage?: ElementRef<HTMLElement>;
  @ViewChild('cinematicPin') private readonly cinematicPin?: ElementRef<HTMLElement>;

  readonly invitation = SURYA_GOPURAM_INVITATION;
  isMusicPlaying = false;

  private THREE?: typeof Three;
  private renderer?: Three.WebGLRenderer;
  private scene?: Three.Scene;
  private camera?: Three.PerspectiveCamera;
  private templeModel?: Three.Group;
  private modelBasePosition?: Three.Vector3;
  private frameId = 0;
  private clock?: Three.Clock;
  private isCompactViewport = false;
  private storyProgress = 0;
  private pageProgress = 0;
  private lenis?: Lenis;
  private gsapTicker?: (time: number) => void;
  private gsapModule?: typeof import('gsap').gsap;
  private scrollTrigger?: typeof import('gsap/ScrollTrigger').ScrollTrigger;
  private animationContext?: gsap.Context;

  ngAfterViewInit() {
    void this.createTempleScene();
    void this.createScrollExperience();
    void this.startMusic();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frameId);
    this.musicPlayer?.nativeElement.pause();
    this.animationContext?.revert();
    this.scrollTrigger?.getAll().forEach((trigger) => trigger.kill());

    if (this.gsapTicker) {
      this.gsapModule?.ticker.remove(this.gsapTicker);
    }

    this.lenis?.destroy();
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
    this.scrollTrigger?.refresh();
  }

  async toggleMusic() {
    if (this.isMusicPlaying) {
      this.pauseMusic();
      return;
    }

    await this.startMusic();
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
      duration: 1.35,
      easing: (time: number) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
      smoothWheel: true,
    });
    this.lenis = lenis;
    lenis.on('scroll', () => ScrollTrigger.update());
    this.gsapTicker = (time: number) => this.lenis?.raf(time * 1000);
    gsap.ticker.add(this.gsapTicker);
    gsap.ticker.lagSmoothing(0);

    this.animationContext = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .from('.sunrise-sky', { opacity: 0, duration: 1.2 })
        .from('.temple-stage', { opacity: 0, scale: 0.9, filter: 'blur(22px)', duration: 2.1 }, 0.15)
        .from('.hero-title .eyebrow, .hero-title h1, .hero-title p', {
          opacity: 0,
          y: 34,
          filter: 'blur(12px)',
          duration: 1.15,
          stagger: 0.18,
        }, 0.82)
        .from('.date-seal', { opacity: 0, y: 28, filter: 'blur(10px)', duration: 1 }, 1.25);

      const story = gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: 'top top',
          end: '+=560%',
          pin,
          scrub: 1.8,
          anticipatePin: 1,
          onUpdate: (self) => this.updateStoryProgress(self.progress),
        },
      });

      story
        .to('.hero-title', { opacity: 0, y: -60, filter: 'blur(8px)', duration: 0.62 }, 0.12)
        .to('.date-seal', { opacity: 0, y: 34, filter: 'blur(6px)', duration: 0.5 }, 0.12)
        .fromTo('.story-moment-one', { opacity: 0, y: 42, filter: 'blur(6px)' }, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.42,
        }, 0.2)
        .to('.story-moment-one', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.18 }, 0.42)
        .to('.story-moment-one', { opacity: 0, y: -32, filter: 'blur(5px)', duration: 0.24 }, 0.56)
        .fromTo('.story-moment-two', { opacity: 0, y: 42, filter: 'blur(6px)' }, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.42,
        }, 0.58)
        .to('.story-moment-two', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.18 }, 0.78)
        .to('.story-moment-two', { opacity: 0, y: -32, filter: 'blur(5px)', duration: 0.24 }, 0.9)
        .fromTo('.story-moment-three', { opacity: 0, y: 42, filter: 'blur(6px)' }, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.42,
        }, 0.88)
        .to('.story-moment-three', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.18 }, 1.06)
        .to('.story-moment-three', { opacity: 0, y: -26, filter: 'blur(5px)', duration: 0.2 }, 1.16)
        .to('.temple-stage', { scale: 1.08, duration: 1 }, 0);

      gsap.utils.toArray<HTMLElement>('.event-card').forEach((card, index) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top 78%',
            end: 'top 44%',
            scrub: 0.9,
          },
          opacity: 0,
          y: 88,
          scale: 0.94,
          filter: 'blur(16px)',
          rotateX: index % 2 === 0 ? 8 : -8,
          ease: 'power2.out',
        });
      });

      gsap.from('.detail-card', {
        scrollTrigger: {
          trigger: '.details-grid',
          start: 'top 78%',
          end: 'bottom 58%',
          scrub: 0.8,
        },
        opacity: 0,
        y: 58,
        stagger: 0.11,
        filter: 'blur(12px)',
        ease: 'power2.out',
      });

      gsap.utils.toArray<HTMLElement>('.reveal-soft').forEach((item) => {
        gsap.from(item, {
          scrollTrigger: {
            trigger: item,
            start: 'top 82%',
            end: 'top 56%',
            scrub: 0.85,
          },
          opacity: 0,
          y: 54,
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

  private updateStoryProgress(progress: number) {
    this.storyProgress = progress;
    this.pageProgress = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.setHostProgress('--story-progress', progress);
    this.setHostProgress('--page-progress', this.pageProgress);
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

    audio.volume = 0.32;

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
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0.36, 9.6);

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
    this.renderer.toneMappingExposure = 1.32;

    const ambientLight = new THREE.HemisphereLight(0xffefd1, 0x3f140d, 2.35);
    const sunriseLight = new THREE.DirectionalLight(0xffb85f, 5.2);
    const frontLight = new THREE.DirectionalLight(0xfff5d7, 2.5);
    const lampGlow = new THREE.PointLight(0xff8a2f, 19, 14);
    sunriseLight.position.set(-1.2, 5.8, -3.2);
    frontLight.position.set(3.2, 3.4, 6.4);
    lampGlow.position.set(-2.2, 0.6, 3.1);
    this.scene.add(ambientLight, sunriseLight, frontLight, lampGlow);

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
    const width = Math.max(1, Math.floor(rect.width));
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
    const box = new THREE.Box3().setFromObject(this.templeModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const modelHeight = Math.max(size.y, 1);
    const targetHeight = this.isCompactViewport ? 3.15 : 4.05;
    const scale = targetHeight / modelHeight;

    this.templeModel.scale.setScalar(scale);
    this.templeModel.position.set(
      -center.x * scale,
      -center.y * scale - (this.isCompactViewport ? 0.24 : 0.42),
      -center.z * scale,
    );
    this.modelBasePosition = this.templeModel.position.clone();
    this.templeModel.rotation.set(0.015, -0.34, 0);
    this.camera.position.set(0, this.isCompactViewport ? 0.32 : 0.42, this.isCompactViewport ? 9.8 : 9.15);
    this.camera.lookAt(0, 0.08, 0);
  }

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);

    if (!this.renderer || !this.scene || !this.camera || !this.clock) {
      return;
    }

    const elapsed = this.clock.elapsedTime;

    if (this.templeModel && this.modelBasePosition) {
      const progress = this.easeInOutCubic(this.storyProgress);
      const breathe = Math.sin(elapsed * 0.62) * 0.022;
      const reveal = this.phase(progress, 0, 0.22);
      const ceremonialTurn = Math.sin(progress * Math.PI) * 0.18;

      this.templeModel.rotation.x = 0.012 - progress * 0.035;
      this.templeModel.rotation.y = -0.34 + progress * 0.72 + ceremonialTurn + Math.sin(elapsed * 0.24) * 0.018;
      this.templeModel.rotation.z = Math.sin(progress * Math.PI) * -0.015;
      this.templeModel.position.x = this.modelBasePosition.x + Math.sin(progress * Math.PI * 1.2) * 0.12;
      this.templeModel.position.y = this.modelBasePosition.y + breathe + reveal * 0.08;
      this.templeModel.position.z = this.modelBasePosition.z + (1 - reveal) * 0.4 - progress * 0.52;
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
        standard.side = THREE.DoubleSide;
        standard.roughness = 0.64;
        standard.metalness = 0.025;

        if (standard.map) {
          standard.map.colorSpace = THREE.SRGBColorSpace;
          standard.map.anisotropy = 8;
          standard.map.needsUpdate = true;
        }

        standard.needsUpdate = true;
      });
    });
  }

  private setHostProgress(name: string, value: number) {
    const element = this.templeCanvas?.nativeElement.closest('app-surya-gopuram') as HTMLElement | null;
    element?.style.setProperty(name, String(value));
  }

  private easeInOutCubic(value: number) {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  private phase(value: number, start: number, end: number) {
    return Math.min(1, Math.max(0, (value - start) / Math.max(0.001, end - start)));
  }
}
