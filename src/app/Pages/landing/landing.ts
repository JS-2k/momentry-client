import { Component, OnInit, OnDestroy, signal } from '@angular/core';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing implements OnInit, OnDestroy {
  private observer: IntersectionObserver | null = null;
  private readonly guestNames = ['Aarav', 'Meera', 'Ishaan', 'Priya'];
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private currentNameIndex = 0;
  private currentLetterIndex = 0;
  private isDeletingName = false;
  typedGuestName = signal('');
  invitationOpen = signal(false);

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
    this.invitationOpen.update((isOpen) => !isOpen);
  }
}
