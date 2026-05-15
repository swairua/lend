import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export async function initializeCapacitor() {
  try {
    // Hide splash screen after 3 seconds
    setTimeout(async () => {
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.log('Splash screen not available');
      }
    }, 3000);

    // Configure status bar for Android
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    } catch (e) {
      console.log('Status bar not available');
    }

    // Handle app pause/resume
    CapacitorApp.addListener('pause', () => {
      console.log('App paused');
    });

    CapacitorApp.addListener('resume', () => {
      console.log('App resumed');
    });

    console.log('Capacitor initialized successfully');
  } catch (error) {
    console.log('Error initializing Capacitor:', error);
  }
}
