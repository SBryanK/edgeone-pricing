import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary. Any uncaught render-time error bubbling up to the
 * root component tree will be captured here instead of crashing the whole
 * React tree to a blank page. Users see a recovery UI; we log details to the
 * console for debugging.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[EdgeOne Calculator] Unhandled UI error:', error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleHardReset = (): void => {
    try {
      localStorage.removeItem('edgeone_calculator_drafts');
      localStorage.removeItem('edgeone_calculator_active_draft');
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-lg w-full bg-white border border-red-200 rounded-2xl shadow-sm p-6">
          <h1 className="text-lg font-bold text-red-600 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-600 mb-4">
            The calculator hit an unexpected error. You can retry, or reset all locally
            saved drafts if the issue persists.
          </p>
          {this.state.error?.message && (
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto mb-4 text-gray-700">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={this.handleHardReset}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-50"
            >
              Reset saved drafts
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
