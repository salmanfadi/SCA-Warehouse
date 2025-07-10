import React, { useEffect } from 'react';
import { usePwaStatus } from '../../hooks/usePwaStatus';

/**
 * This component detects if the app is running in standalone mode (installed PWA)
 * and applies appropriate CSS classes and meta tags to optimize the experience
 */
export function StandaloneDetector() {
  const { isStandalone, isIOS } = usePwaStatus();

  useEffect(() => {
    // Add a class to the body when in standalone mode
    if (isStandalone) {
      document.body.classList.add('pwa-standalone');
      
      // Add iOS specific classes if needed
      if (isIOS) {
        document.body.classList.add('pwa-ios');
      }
    }

    // Add meta tags for better fullscreen experience on iOS
    if (isIOS) {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.setAttribute(
          'content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
      }
    }

    return () => {
      document.body.classList.remove('pwa-standalone', 'pwa-ios');
    };
  }, [isStandalone, isIOS]);

  // This component doesn't render anything visible
  return null;
}
