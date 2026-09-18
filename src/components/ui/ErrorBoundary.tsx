"use client";

import React, { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Placeholder for future external error reporting.
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-border bg-page-secondary px-4 py-6 text-center">
          <p className="text-sm font-medium text-text-primary">
            Something went wrong. Try refreshing.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-page transition-colors hover:opacity-80"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

