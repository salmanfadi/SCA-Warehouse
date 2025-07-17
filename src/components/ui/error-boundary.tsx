import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  /**
   * The children to render
   */
  children: ReactNode;
  
  /**
   * Component to render when an error occurs
   */
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  /**
   * Whether an error has occurred
   */
  hasError: boolean;
}

/**
 * A component that catches JavaScript errors in its child component tree
 * and displays a fallback UI instead of the component tree that crashed
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback;
    }

    // Render children if no error
    return this.props.children;
  }
}
