import { useState, useEffect } from 'react';

// Define breakpoints to match Tailwind's default breakpoints
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

type Breakpoint = keyof typeof breakpoints;

export function useBreakpoint() {
  // Initialize with default values
  const [state, setState] = useState({
    isMobile: false,    // < sm
    isSmall: false,     // >= sm
    isMedium: false,    // >= md
    isLarge: false,     // >= lg
    isExtraLarge: false, // >= xl
    is2XL: false,       // >= 2xl
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width < breakpoints.sm,
        isSmall: width >= breakpoints.sm,
        isMedium: width >= breakpoints.md,
        isLarge: width >= breakpoints.lg,
        isExtraLarge: width >= breakpoints.xl,
        is2XL: width >= breakpoints['2xl'],
        windowWidth: width,
      });
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}
