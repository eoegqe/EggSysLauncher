import React from 'react';

// Catches uncaught render errors anywhere in the subtree and shows a
// recoverable fallback instead of a White Screen of Death. The fallback
// shows the error message so the cause is visible, and offers a reload.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console so the stack is visible in dev tools
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error || 'Unknown error');
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-400 mb-1 max-w-sm break-words">{msg}</p>
          <button
            onClick={this.handleReload}
            className="mt-5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}