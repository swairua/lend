// Safe initialization that works in browser and native contexts
export async function initializeCapacitor() {
  const win = typeof window !== 'undefined' ? (window as any) : null;

  // Skip if Capacitor is not available (we're in browser/web context)
  if (!win || typeof win.Capacitor === 'undefined') {
    return;
  }

  // In native context, defer the actual initialization
  if (win && win.Capacitor) {
    // Capacitor is available, initialize native features
    try {
      const capacitor = win.Capacitor;
      
      // Get plugins from Capacitor global
      const App = capacitor.Plugins?.App;
      const SplashScreen = capacitor.Plugins?.SplashScreen;
      const StatusBar = capacitor.Plugins?.StatusBar;

      if (SplashScreen) {
        setTimeout(async () => {
          try {
            await SplashScreen.hide();
          } catch (e) {
            console.log('Splash screen not available');
          }
        }, 3000);
      }

      if (StatusBar) {
        try {
          await StatusBar.setStyle({ style: 'dark' });
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        } catch (e) {
          console.log('Status bar not available');
        }
      }

      if (App) {
        App.addListener('pause', () => {
          console.log('App paused');
        });

        App.addListener('resume', () => {
          console.log('App resumed');
        });
      }

      console.log('Capacitor initialized successfully');
    } catch (error) {
      console.log('Error initializing Capacitor:', error);
    }
  }
}
