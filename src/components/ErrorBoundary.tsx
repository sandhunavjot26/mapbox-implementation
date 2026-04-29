"use client";

/**
 * Error boundary — catches rendering errors in child components.
 * Prevents a single panel crash from taking down the entire dashboard.
 */

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label shown in the error display (e.g. "Map", "Assets Panel") */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.label ? ` — ${this.props.label}` : ""}]`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-4 bg-red-950/50 border border-red-500/50 m-2 rounded">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-red-500 animate-pulse rounded-full" />
            <span className="text-red-400 text-xs font-mono font-semibold uppercase tracking-wider">
              {this.props.label
                ? `${this.props.label} Error`
                : "Component Error"}
            </span>
          </div>
          <p className="text-slate-500 text-[11px] font-mono mt-1">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 px-2 py-1 text-[11px] font-mono text-cyan-400 border border-cyan-500/50 hover:bg-cyan-950/30 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
