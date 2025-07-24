import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const ready = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show the install prompt if the app isn't already installed
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', ready);
    
    // Check if the app is already installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      setIsVisible(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Dialog open={isVisible} onOpenChange={setIsVisible}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install Scaware App</DialogTitle>
          <DialogDescription>
            Install Scaware on your device for a better experience. You can access it from your home screen.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-4">
          <img 
            src="/android-chrome-192x192.png" 
            alt="Scaware Logo" 
            className="w-16 h-16"
          />
        </div>
        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            onClick={() => setIsVisible(false)}
          >
            Not Now
          </Button>
          <Button 
            onClick={handleInstallClick}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add type for beforeinstallprompt event
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}
