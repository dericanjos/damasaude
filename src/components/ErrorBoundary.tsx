import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="text-4xl font-bold tracking-tight text-foreground">
              DAMA <span className="text-primary">Doc</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">
                Algo deu errado
              </h1>
              <p className="text-sm text-muted-foreground">
                Ocorreu um erro inesperado. Tente novamente ou volte ao início.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Tentar novamente
              </button>
              <button
                onClick={this.handleHome}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Voltar ao início
              </button>
            </div>

            {isDev && this.state.error && (
              <details className="text-left mt-4 rounded-md border border-border p-3">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Detalhes do erro (dev)
                </summary>
                <pre className="mt-2 text-xs text-destructive overflow-auto max-h-48 whitespace-pre-wrap">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
