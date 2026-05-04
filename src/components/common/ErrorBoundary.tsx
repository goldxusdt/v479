import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-6 text-center space-y-6 animate-in fade-in duration-500">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-black uppercase tracking-tight italic v56-gradient-text">
              Something went <span className="text-foreground">wrong</span>
            </h2>
            <p className="text-muted-foreground text-sm font-medium">
              We encountered an unexpected error while rendering this component. Our team has been notified.
            </p>
            {this.state.error && (
              <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono text-red-400/80 text-left overflow-auto max-h-[100px]">
                {this.state.error.message}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={this.handleReset}
              className="gap-2 premium-border hover:bg-white/5 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
              className="gap-2 premium-gradient rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              <Home className="h-3 w-3" />
              Back to Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
