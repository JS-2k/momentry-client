import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { KANCHI_THORANAM_INVITATION } from './kanchi-thoranam.data';

@Component({
  selector: 'app-kanchi-thoranam',
  imports: [],
  templateUrl: './kanchi-thoranam.html',
  styleUrl: './kanchi-thoranam.css',
})
export class KanchiThoranam implements AfterViewInit, OnDestroy {
  @ViewChild('musicPlayer') private readonly musicPlayer?: ElementRef<HTMLAudioElement>;

  readonly invitation = KANCHI_THORANAM_INVITATION;
  isMusicPlaying = false;
  isInvitationOpen = false;

  ngAfterViewInit() {
    void this.startMusic();
  }

  ngOnDestroy() {
    this.musicPlayer?.nativeElement.pause();
  }

  async toggleMusic() {
    if (this.isMusicPlaying) {
      this.pauseMusic();
      return;
    }

    await this.startMusic();
  }

  openInvitation() {
    this.isInvitationOpen = true;
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
}
