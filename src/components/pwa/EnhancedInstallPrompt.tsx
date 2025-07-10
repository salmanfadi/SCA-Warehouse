import React, { useEffect, useState } from 'react';
import { usePwaStatus } from '../../hooks/usePwaStatus';
import { Button } from '../ui/button';
import { Download, ChevronDown, X, Share2, Menu, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';

interface EnhancedInstallPromptProps {
  className?: string;
}

export function EnhancedInstallPrompt({ className = '' }: EnhancedInstallPromptProps) {
  const {
    isStandalone,
    isInstallPromptAvailable,
    isIOS,
    isAndroid,
    isMobile,
    browserName,
    showInstallPrompt,
  } = usePwaStatus();

  const [dismissed, setDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [toastId, setToastId] = useState<string | null>(null);

  // Use a unique localStorage key for permanent dismissal
  const LS_KEY = 'agile_install_prompt_dismissed';

  useEffect(() => {
    const dismissedFlag = localStorage.getItem(LS_KEY);
    if (dismissedFlag === 'true') {
      setDismissed(true);
    }
  }, []);

  // Only show if not installed, not dismissed, and installable or iOS/Android
  useEffect(() => {
    if (
      !isStandalone &&
      !dismissed &&
      (isInstallPromptAvailable || isIOS || isAndroid)
    ) {
      // Only show one toast at a time
      if (!toastId) {
        const id = toast.custom((t) => (
          <div
            className={`w-full max-w-md mx-auto flex flex-col sm:flex-row items-center gap-2 p-3 sm:p-4 bg-slate-900 text-white rounded-lg shadow-lg border border-blue-400 ${
              isMobile ? 'rounded-b-none sm:rounded-lg' : 'rounded-lg'
            } ${className}`}
            style={{ minWidth: 0 }}
          >
            <div className="flex items-center flex-1 min-w-0">
              <Smartphone className="h-6 w-6 text-blue-400 mr-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base truncate">Install Agile Warehouse</div>
                <div className="text-xs text-slate-300 truncate">
                  {isIOS
                    ? 'Add to your home screen for the best experience'
                    : isAndroid
                    ? 'Install this app on your device for better performance'
                    : 'Install for offline access and faster loading'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 sm:mt-0">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
                onClick={async () => {
                  if (isInstallPromptAvailable) {
                    const installed = await showInstallPrompt();
                    if (installed) {
                      setDismissed(true);
                      localStorage.setItem(LS_KEY, 'true');
                      toast.dismiss(t);
                    }
                  } else {
                    setShowInstructions((prev) => !prev);
                  }
                }}
              >
                <Download className="mr-1 h-4 w-4" /> Add to Home
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-white ml-1"
                onClick={() => {
                  setDismissed(true);
                  localStorage.setItem(LS_KEY, 'true');
                  toast.dismiss(t);
                }}
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* How to Install instructions dropdown */}
            {showInstructions && (
              <div className="absolute left-0 right-0 bottom-full mb-2 z-50 bg-slate-800 text-white rounded-md p-3 shadow-lg animate-fade-in">
                {getInstructions(isIOS, isAndroid, browserName)}
              </div>
            )}
          </div>
        ), {
          position: 'bottom-center',
          duration: 999999, // stays until dismissed
          id: 'pwa-install-snackbar',
        }) as string;
        setToastId(id);
      }
    } else if (toastId) {
      toast.dismiss(toastId);
      setToastId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStandalone, dismissed, isInstallPromptAvailable, isIOS, isAndroid, isMobile, toastId]);

  // Helper for install instructions
  function getInstructions(isIOS: boolean, isAndroid: boolean, browserName: string) {
    if (isIOS) {
      return (
        <div>
          <div className="font-semibold mb-1">Install on iOS:</div>
          <ol className="list-decimal list-inside text-xs">
            <li className="mb-1">Tap the <Share2 className="inline h-4 w-4" /> share button</li>
            <li className="mb-1">Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" in the top right corner</li>
          </ol>
        </div>
      );
    } else if (isAndroid && browserName === 'chrome') {
      return (
        <div>
          <div className="font-semibold mb-1">Install on Android:</div>
          <ol className="list-decimal list-inside text-xs">
            <li className="mb-1">Tap the <Menu className="inline h-4 w-4" /> menu button</li>
            <li className="mb-1">Select "Install app" or "Add to Home Screen"</li>
            <li>Follow the on-screen instructions</li>
          </ol>
        </div>
      );
    } else {
      return (
        <div>
          <div className="font-semibold mb-1">Install this app:</div>
          <ol className="list-decimal list-inside text-xs">
            <li className="mb-1">Open this site in Chrome or Safari</li>
            <li className="mb-1">Tap the menu button</li>
            <li>Select "Install app" or "Add to Home Screen"</li>
          </ol>
        </div>
      );
    }
  }

  // This component does not render anything directly
  return null;
}
