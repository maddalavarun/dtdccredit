import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger, #ef4444)' }}>Something went wrong.</h1>
                    <p style={{ color: 'var(--text-muted, #6b7280)', marginTop: '1rem', marginBottom: '2rem' }}>
                        The application encountered an unexpected error.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'var(--primary, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        Refresh Page
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <pre style={{ marginTop: '2rem', textAlign: 'left', background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '4px', overflowX: 'auto', fontSize: '0.8rem' }}>
                            {this.state.error && this.state.error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
