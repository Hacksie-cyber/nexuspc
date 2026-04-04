import React, { Component, ErrorInfo, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Product } from './data/products';

export interface CartItem extends Product {
  qty: number;
}

export interface BuildState {
  [key: string]: Product | null;
}

// Error Boundary Component
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMsg = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMsg = parsed.error;
      } catch (e) {
        errorMsg = this.state.error.message || errorMsg;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">System Error</h2>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-green-400 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
