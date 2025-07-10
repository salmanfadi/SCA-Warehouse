import React, { useEffect, useState } from 'react';

interface OfflineDetectorProps {
  className?: string;
}

/**
 * Component that detects online/offline status and shows a notification when offline
 */
export function OfflineDetector({ className = '' }: OfflineDetectorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Update online status
    const handleOnline = () => {
      setIsOnline(true);
      document.body.classList.add('online');
      document.body.classList.remove('offline');
    };

    const handleOffline = () => {
      setIsOnline(false);
      document.body.classList.remove('online');
      document.body.classList.add('offline');
    };

    // Set initial class
    if (isOnline) {
      document.body.classList.add('online');
    } else {
      document.body.classList.add('offline');
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.body.classList.remove('online', 'offline');
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className={`offline-indicator ${className}`}>
      You are currently offline. Some features may be unavailable.
    </div>
  );
}
