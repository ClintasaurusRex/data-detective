import { Component } from "react";
import { BACKUP_KEY, STORAGE_KEY } from "./storage/progress.js";

// Last-resort recovery screen. If the app can't render (for example because
// of saved data we didn't anticipate), the learner can reset without losing
// their saved work: it is copied to BACKUP_KEY first.
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  reset = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) localStorage.setItem(BACKUP_KEY, raw);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable; reloading is still worth trying.
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="app">
        <div className="panel" role="alert">
          <h1>Something went wrong</h1>
          <p>Data Detective couldn&rsquo;t start. Reloading the page may fix it.</p>
          <p>
            If it keeps happening, you can reset your saved progress. A copy is kept in this browser&rsquo;s storage
            under &ldquo;{BACKUP_KEY}&rdquo;.
          </p>
          <div className="actions">
            <button type="button" className="primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button type="button" onClick={this.reset}>
              Reset saved progress
            </button>
          </div>
        </div>
      </div>
    );
  }
}
