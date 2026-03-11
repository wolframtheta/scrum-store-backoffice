import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './pwa-install-banner.component.html',
  styleUrls: ['./pwa-install-banner.component.scss']
})
export class PwaInstallBannerComponent implements OnInit {
  showBanner = signal(false);
  isIOS = signal(false);
  isAndroid = signal(false);
  hasDeferredPrompt = signal(false);
  
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private readonly DISMISS_KEY = 'pwa-banner-dismissed';
  private readonly DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

  ngOnInit() {
    // Check if already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if banner was recently dismissed
    if (this.wasRecentlyDismissed()) {
      return;
    }

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    this.isIOS.set(isIOSDevice && !isInStandaloneMode);
    this.isAndroid.set(isAndroidDevice);

    // Listen for the beforeinstallprompt event (Android/Chrome/Desktop)
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.hasDeferredPrompt.set(true);
      this.showBanner.set(true);
    });

    // For iOS, show banner immediately if not in standalone mode
    if (this.isIOS() && !isInStandaloneMode) {
      this.showBanner.set(true);
    }
  }

  async installPWA() {
    if (!this.deferredPrompt) {
      return;
    }

    // Show native install prompt
    await this.deferredPrompt.prompt();
    
    // Wait for user response
    const { outcome } = await this.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed');
    }
    
    this.deferredPrompt = null;
    this.hasDeferredPrompt.set(false);
    this.dismiss();
  }

  dismiss() {
    this.showBanner.set(false);
    localStorage.setItem(this.DISMISS_KEY, Date.now().toString());
  }

  private wasRecentlyDismissed(): boolean {
    const dismissedTime = localStorage.getItem(this.DISMISS_KEY);
    if (!dismissedTime) {
      return false;
    }
    
    const elapsed = Date.now() - parseInt(dismissedTime, 10);
    return elapsed < this.DISMISS_DURATION;
  }
}
