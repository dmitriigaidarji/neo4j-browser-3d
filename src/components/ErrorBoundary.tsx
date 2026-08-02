import {
  Component,
  type ErrorInfo,
  type PropsWithChildren,
  type ReactNode,
} from "react";

interface State {
  error: Error | null;
}

/**
 * Stops a render error in the graph or a result frame from blanking the whole
 * application, which is what happened before: any thrown error unmounted the
 * React tree and left the user with an empty page and no way back.
 */
export default class ErrorBoundary extends Component<
  PropsWithChildren<{ title?: string; fallback?: ReactNode }>,
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled error", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <article className="message is-danger error-boundary">
        <div className="message-header">
          <span>{this.props.title ?? "Something went wrong"}</span>
          <button
            type="button"
            className="button is-small"
            onClick={this.reset}
          >
            Retry
          </button>
        </div>
        <div className="message-body">
          <p className="is-family-monospace">{error.message}</p>
        </div>
      </article>
    );
  }
}
