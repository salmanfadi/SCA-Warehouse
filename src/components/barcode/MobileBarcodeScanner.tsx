import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, X, ScanLine, RefreshCcw, FlipHorizontal } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Quagga from 'quagga'; // Import QuaggaJS for barcode scanning

interface MobileBarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  allowManualEntry?: boolean;
  inputValue?: string;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  scanButtonLabel?: string;
}

const MobileBarcodeScanner: React.FC<MobileBarcodeScannerProps> = ({
  onBarcodeScanned,
  allowManualEntry = true,
  inputValue = '',
  onInputChange,
  scanButtonLabel = 'Scan',
}) => {
  // State variables
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState(inputValue);
  const [cameraError, setCameraError] = useState<string>('');
  const [supportsCamera, setSupportsCamera] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [currentCamera, setCurrentCamera] = useState<'environment' | 'user'>('environment');
  const [wasScanningStopped, setWasScanningStopped] = useState(false);
  const [hasScannedBefore, setHasScannedBefore] = useState(false);
  
  // Refs
  const scannerRef = useRef<HTMLDivElement>(null);
  const quaggaInitialized = useRef<boolean>(false);

  // Check for camera support on component mount - without requesting permissions yet
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setSupportsCamera(false);
          setCameraError('Your browser does not support camera access');
          return;
        }
        
        // We now only check if the API exists, not if we have permission
        // This avoids premature permission requests
        setSupportsCamera(true);
      } catch (error) {
        console.error('Error checking camera support:', error);
        setSupportsCamera(false);
        setCameraError('Failed to check camera support');
      }
    };
    
    checkCameraSupport();
    
    // Clean up on unmount
    return () => {
      stopScanning();
    };
  }, []);
  
  // Update manualInput when inputValue prop changes
  useEffect(() => {
    setManualInput(inputValue);
  }, [inputValue]);
  
  // Initialize and clean up Quagga
  useEffect(() => {
    if (isScanning && scannerRef.current) {
      initializeQuagga();
    } else if (!isScanning && quaggaInitialized.current) {
      stopScanning();
    }
    
    return () => {
      if (quaggaInitialized.current) {
        stopScanning();
      }
    };
  }, [isScanning]);
  
  // Initialize Quagga barcode scanner with optimized settings for long barcodes
  const initializeQuagga = useCallback(() => {
    if (!scannerRef.current) return;
    
    // Clear any previous errors
    setCameraError('');
    
    try {
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          willReadFrequently: true, // Fix for the Canvas2D warning
          constraints: {
            facingMode: currentCamera, // Use environment (rear) camera by default
            aspectRatio: { min: 1, max: 2 }, // Prefer landscape orientation
            width: { min: 640 },
            height: { min: 480 },
            // Request higher resolution for better barcode detection
            advanced: [{width: {min: 1280}, height: {min: 720}}]
          },
        },
        locator: {
          patchSize: "large", // Use larger patch size for better detection of long barcodes
          halfSample: false // Disable half sampling for more accurate detection
        },
        numOfWorkers: navigator.hardwareConcurrency || 4,
        frequency: 10,
        decoder: {
          readers: [
            "code_128_reader" // Only use Code 128 format for our long barcodes
          ],
          multiple: false // Only return the first valid barcode
        },
        debug: {
          drawBoundingBox: true,
          showFrequency: true,
          drawScanline: true,
          showPattern: true
        },
        locate: true
      }, (err) => {
        if (err) {
          console.error("Quagga initialization error:", err);
          setCameraError(err.message || 'Failed to initialize camera');
          setIsScanning(false);
          
          toast({
            variant: 'destructive',
            title: 'Camera Error',
            description: err.name === 'NotAllowedError' 
              ? 'Camera permission denied. Please allow camera access.'
              : 'Failed to initialize camera. Please try again.',
          });
          
          return;
        }
        
        console.log("Quagga initialized successfully");
        quaggaInitialized.current = true;
        
        // Start processing frames
        Quagga.start();
        
        // Register barcode detection handler
        Quagga.onDetected(handleBarcodeDetected);
        
        // Show success toast
        toast({
          title: "Camera Active",
          description: "Scanning for barcodes...",
        });
      });
    } catch (error: any) {
      console.error("Error initializing Quagga:", error);
      setCameraError(error.message || 'Failed to initialize scanner');
      setIsScanning(false);
      
      toast({
        variant: 'destructive',
        title: 'Scanner Error',
        description: error.message || 'Failed to initialize barcode scanner',
      });
    }
  }, [currentCamera]);
  
  // Handle barcode detection
  const handleBarcodeDetected = useCallback((result: Quagga.QuaggaJSResultObject) => {
    const code = result.codeResult.code;
    if (!code) return;
    
    // Check if this is a valid barcode format for our application
    console.log("Barcode detected:", code, "with format:", result.codeResult.format, "confidence:", result.codeResult.confidence);
    
    // For our application, we need to ensure we're getting the full barcode
    // The barcode should be a long numeric string (19+ digits for our inventory system)
    if (code.length < 19) {
      console.log("Ignoring short barcode - not a complete scan");
      return;
    }
    
    // Play success sound
    try {
      const audio = new Audio('/beep.mp3');
      audio.play().catch(e => console.log('Sound play error:', e));
    } catch (e) {
      console.log('Sound not supported:', e);
    }
    
    // Stop scanning
    stopScanning();
    
    // Notify parent component
    onBarcodeScanned(code);
    
    // Show success toast
    toast({
      title: "Barcode Scanned",
      description: `${code}`,
    });
  }, [onBarcodeScanned]);
  
  // Stop scanning
  const stopScanning = useCallback(() => {
    if (quaggaInitialized.current) {
      try {
        Quagga.offDetected(handleBarcodeDetected);
        Quagga.stop();
        quaggaInitialized.current = false;
        setIsScanning(false);
        setWasScanningStopped(true);
        setHasScannedBefore(true);
        console.log("Quagga stopped");
      } catch (error) {
        console.error("Error stopping Quagga:", error);
      }
    }
  }, [handleBarcodeDetected]);
  
  // Switch camera between front and back
  const switchCamera = useCallback(() => {
    stopScanning();
    
    // Toggle camera
    setCurrentCamera(prev => prev === 'environment' ? 'user' : 'environment');
    
    // Small delay to ensure previous camera is fully stopped
    setTimeout(() => {
      setIsScanning(true);
    }, 300);
    
    toast({
      title: `Switching Camera`,
      description: `Using ${currentCamera === 'environment' ? 'front' : 'rear'} camera`,
    });
  }, [currentCamera, stopScanning]);
  
  // Handle start camera button click
  const handleStartCamera = () => {
    setIsScanning(true);
    setWasScanningStopped(false);
  };
  
  // Handle stop camera button click
  const handleStopCamera = () => {
    stopScanning();
    setWasScanningStopped(true);
    setHasScannedBefore(true);
  };
  
  // Handle manual barcode submission
  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty Barcode',
        description: 'Please enter a barcode value',
      });
      return;
    }
    
    onBarcodeScanned(manualInput.trim());
    setManualInput('');
  };
  
  // Handle manual input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualInput(e.target.value);
    if (onInputChange) {
      onInputChange(e);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Camera view */}
      <div className="relative overflow-hidden rounded-lg bg-black aspect-video">
        {isScanning ? (
          <>
            {/* Scanner container */}
            <div 
              ref={scannerRef} 
              className="w-full h-full relative"
            >
              {/* Scanning overlay */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-scan-line"></div>
                <div className="absolute inset-0 border-2 border-white/50 rounded"></div>
              </div>
            </div>
            
            {/* Camera controls */}
            <div className="absolute bottom-2 right-2 z-20 flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="bg-black/50 text-white border-white/20 hover:bg-black/70"
                onClick={switchCamera}
              >
                <FlipHorizontal className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="bg-black/50 text-white border-white/20 hover:bg-black/70"
                onClick={handleStopCamera}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-black">
            {/* Always show a scan button when not scanning */}
            <Button 
              onClick={handleStartCamera} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 text-lg shadow-lg"
              variant="default"
            >
              <Camera className="h-6 w-6 mr-2" />
              {hasScannedBefore ? 'Scan Again' : scanButtonLabel}
            </Button>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {cameraError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <p><strong>Camera Error:</strong> {cameraError}</p>
          <p className="text-xs mt-1">You can use manual entry below instead.</p>
        </div>
      )}
      
      {/* Manual entry */}
      {allowManualEntry && (
        <div className="mt-4">
          <Label htmlFor="manual-barcode">Manual Barcode Entry</Label>
          <div className="flex mt-1 gap-2">
            <Input
              id="manual-barcode"
              value={manualInput}
              onChange={handleInputChange}
              placeholder="Enter barcode manually"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualSubmit();
                }
              }}
            />
            <Button onClick={handleManualSubmit}>Submit</Button>
          </div>
        </div>
      )}
      
      {/* Debug info */}
      {showDebug && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <p>Camera: {currentCamera}</p>
          <p>Scanning: {isScanning ? 'Yes' : 'No'}</p>
          <p>Camera Support: {supportsCamera ? 'Yes' : 'No'}</p>
          <p>QuaggaJS Initialized: {quaggaInitialized.current ? 'Yes' : 'No'}</p>
        </div>
      )}
      
      {/* Debug toggle */}
      <div className="mt-2 text-right">
        <button 
          onClick={() => setShowDebug(!showDebug)} 
          className="text-xs text-gray-500 underline"
        >
          {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>
      </div>
    </div>
  );
};

export default MobileBarcodeScanner;
