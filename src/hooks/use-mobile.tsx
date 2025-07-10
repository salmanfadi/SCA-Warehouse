
// This file serves as a compatibility layer for code using the old naming
// It re-exports the useIsMobile hook as useMobileDetector

import { useIsMobile } from './use-mobile';

// Export the renamed function
export const useMobileDetector = useIsMobile;

// Also re-export the original function name for consistency
export { useIsMobile };
