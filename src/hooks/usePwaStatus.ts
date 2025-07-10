
import { useState, useEffect } from 'react';

interface PwaStatus {
  isStandalone: boolean;
  isInstallPromptAvailable: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  browserName: string;
  showInstallPrompt: () => Promise<boolean>;
}

/**
 * Enhanced hook to detect PWA installation status and provide installation prompt functionality
 */
export function usePwaStatus(): PwaStatus {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [browserName, setBrowserName] = useState('');

  useEffect(() => {
    // Check if the app is running in standalone mode (installed PWA)
    const standalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone || 
      document.referrer.includes('android-app://') ||
      window.location.href.includes('standalone=true') ||
      window.location.search.includes('source=pwa');
    
    setIsStandalone(standalone);

    // Detect device and browser
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    // Check if the device is iOS
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);
    
    // Check if the device is Android
    const android = /android/.test(userAgent);
    setIsAndroid(android);
    
    // Check if mobile device
    const mobile = ios || android || /mobile|tablet/.test(userAgent) || window.innerWidth <= 768;
    setIsMobile(mobile);
    
    // Detect browser with better accuracy
    if (userAgent.includes('edg')) {
      setBrowserName('edge');
    } else if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      setBrowserName('chrome');
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      setBrowserName('safari');
    } else if (userAgent.includes('firefox')) {
      setBrowserName('firefox');
    } else if (userAgent.includes('opera') || userAgent.includes('opr')) {
      setBrowserName('opera');
    } else {
      setBrowserName('other');
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('Install prompt event captured');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if the app was installed
    window.addEventListener('appinstalled', (e) => {
      console.log('PWA was installed');
      setIsStandalone(true);
      setDeferredPrompt(null);
    });

    // Add viewport meta tag for better mobile experience
    if (mobile && standalone) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute(
          'content',
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
      }
    }

    // Set CSS classes for styling
    if (standalone) {
      document.body.classList.add('pwa-standalone');
    }
    if (ios) {
      document.body.classList.add('pwa-ios');
    }
    if (android) {
      document.body.classList.add('pwa-android');
    }

    // Clean up
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.body.classList.remove('pwa-standalone', 'pwa-ios', 'pwa-android');
    };
  }, []);

  // Function to show the install prompt
  const showInstallPrompt = async (): Promise<boolean> => {
    if (deferredPrompt) {
      console.log('Showing install prompt...');
      try {
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User ${outcome} the install prompt`);
        
        // Clear the prompt
        setDeferredPrompt(null);
        
        return outcome === 'accepted';
      } catch (error) {
        console.error('Error showing install prompt:', error);
        return false;
      }
    } else {
      console.log('No install prompt available');
      return false;
    }
  };

  return {
    isStandalone,
    isInstallPromptAvailable: !!deferredPrompt,
    isIOS,
    isAndroid,
    isMobile,
    showInstallPrompt,
    browserName
  };
}
