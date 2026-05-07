import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { log } from '../../utils/logger';

type ErrorBoundaryProps = {
  fallback?: ReactNode;
  children: ReactNode;
  context?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    log('error', `ErrorBoundary: ${this.props.context || 'unknown context'}`, { error, info });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}
