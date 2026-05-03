import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements OnInit, OnDestroy {
  @ViewChild('invitationCard') private invitationCard?: ElementRef<HTMLElement>;

  private observer: IntersectionObserver | null = null;
  private readonly guestNames = ['Emma', 'Noah', 'Sofia', 'Lucas'];
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private confettiTimers: ReturnType<typeof setTimeout>[] = [];
  private currentNameIndex = 0;
  private currentLetterIndex = 0;
  private isDeletingName = false;
  typedGuestName = signal('');
  invitationOpen = signal(false);
  readonly templateCategories = [
    {
      category: 'Wedding',
      title: 'Eternal Vows',
      image: '/assets/wedding.jpg',
      alt: 'Wedding invitation template preview',
      previewClass: 'template-preview-wedding',
      swatches: ['#d4a12d', '#fff3df', '#191816'],
    },
    {
      category: 'Birthday',
      title: 'Confetti Hour',
      image: '/assets/birthday.jpg',
      alt: 'Birthday invitation template preview',
      previewClass: 'template-preview-birthday',
      swatches: ['#e8a6aa', '#f3c76b', '#24211e'],
    },
    {
      category: 'Baby Shower',
      title: 'Hello Little One',
      image: '/assets/babyshower.jpg',
      alt: 'Baby shower invitation template preview',
      previewClass: 'template-preview-baby',
      swatches: ['#f8d8aa', '#bddfcf', '#64584b'],
    },
    {
      category: 'Housewarming',
      title: 'New Threshold',
      image: '/assets/housewarm.jpg',
      alt: 'Housewarming invitation template preview',
      previewClass: 'template-preview-house',
      swatches: ['#9a8d74', '#f4efe5', '#171715'],
    },
  ];

  ngOnInit() {
    this.initScrollAnimations();
    this.initScrollListener();
    this.typeGuestName();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    this.confettiTimers.forEach((timer) => clearTimeout(timer));
  }

  private initScrollAnimations() {
    // Create Intersection Observer for scroll animations
    const observerOptions: IntersectionObserverInit = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Add animation class when element comes into view
          entry.target.classList.add('in-view');
          entry.target.classList.add('animate');
          
          // Add stagger delay for multiple elements
          const children = entry.target.querySelectorAll('.scroll-fade, .scale-on-scroll');
          children.forEach((child, index) => {
            (child as HTMLElement).style.animationDelay = `${index * 0.1}s`;
            child.classList.add('in-view');
          });
        }
      });
    }, observerOptions);

    // Observe all elements with scroll animation classes
    document.querySelectorAll('.scroll-fade, .scale-on-scroll, .section-fade').forEach(el => {
      this.observer?.observe(el);
    });
  }

  private initScrollListener() {
    // Add scroll-based parallax effect to elements
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const parallaxElements = document.querySelectorAll('[data-parallax]');
      
      parallaxElements.forEach(el => {
        const speed = parseFloat((el as HTMLElement).getAttribute('data-parallax') || '0.5');
        (el as HTMLElement).style.transform = `translateY(${scrollY * speed}px)`;
      });
    });
  }

  private typeGuestName() {
    const activeName = this.guestNames[this.currentNameIndex];

    if (this.isDeletingName) {
      this.currentLetterIndex -= 1;
    } else {
      this.currentLetterIndex += 1;
    }

    this.typedGuestName.set(activeName.slice(0, this.currentLetterIndex));

    let delay = this.isDeletingName ? 55 : 95;

    if (!this.isDeletingName && this.currentLetterIndex === activeName.length) {
      delay = 1300;
      this.isDeletingName = true;
    }

    if (this.isDeletingName && this.currentLetterIndex === 0) {
      this.isDeletingName = false;
      this.currentNameIndex = (this.currentNameIndex + 1) % this.guestNames.length;
      delay = 280;
    }

    this.typingTimer = setTimeout(() => this.typeGuestName(), delay);
  }

  toggleInvitation() {
    const willOpen = !this.invitationOpen();
    this.invitationOpen.set(willOpen);

    if (willOpen) {
      this.playConfettiBurst();
    }
  }

  openInvitation(event: MouseEvent) {
    event.stopPropagation();

    if (!this.invitationOpen()) {
      this.invitationOpen.set(true);
      this.playConfettiBurst();
    }
  }

  private playConfettiBurst() {
    void import('canvas-confetti').then(({ default: confetti }) => {
      const origin = this.getInvitationConfettiOrigin();
      const colors = ['#ff3150', '#ffc93c', '#30d5c8', '#8b5cf6', '#ff7a1a', '#22c55e'];
      const defaults = {
        colors,
        disableForReducedMotion: true,
        origin,
        zIndex: 2000,
      };

      confetti({
        ...defaults,
        particleCount: 150,
        spread: 92,
        startVelocity: 46,
        scalar: 1,
      });

      this.confettiTimers.push(
        setTimeout(() => {
          confetti({
            ...defaults,
            particleCount: 90,
            spread: 130,
            startVelocity: 30,
            decay: 0.91,
            scalar: 0.82,
          });
        }, 120),
        setTimeout(() => {
          confetti({
            ...defaults,
            particleCount: 46,
            angle: 60,
            spread: 58,
            origin: { x: Math.max(origin.x - 0.08, 0), y: origin.y + 0.02 },
          });
          confetti({
            ...defaults,
            particleCount: 46,
            angle: 120,
            spread: 58,
            origin: { x: Math.min(origin.x + 0.08, 1), y: origin.y + 0.02 },
          });
        }, 260),
      );
    });
  }

  private getInvitationConfettiOrigin() {
    const card = this.invitationCard?.nativeElement;

    if (!card) {
      return { x: 0.5, y: 0.42 };
    }

    const rect = card.getBoundingClientRect();

    return {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height * 0.45) / window.innerHeight,
    };
  }
}
