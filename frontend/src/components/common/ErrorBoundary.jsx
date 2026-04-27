import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-2xl bg-red-50 p-8 rounded-lg border border-red-200">
            <h1 className="text-4xl font-bold mb-4 text-red-600">Oops!</h1>
            <p className="text-light-muted dark:text-dark-muted mb-6">Something went wrong.</p>
            <pre className="text-left text-xs bg-white p-4 rounded text-red-800 overflow-auto max-h-64 mb-6 whitespace-pre-wrap">{this.state.error?.toString()}</pre>
            <button onClick={() => window.location.reload()} className="btn-primary">Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
