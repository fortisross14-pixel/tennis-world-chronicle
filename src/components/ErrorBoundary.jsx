import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state={error:null};
  }
  static getDerivedStateFromError(error) { return {error}; }
  render() {
    if (this.state.error) {
      return <main className="fatal-error">
        <h1>The Chronicle hit an unexpected error</h1>
        <p>Your save remains in its slot. Reload the page, or return to the save-slot screen.</p>
        <pre>{String(this.state.error?.message||this.state.error)}</pre>
        <button onClick={()=>location.reload()}>Reload</button>
      </main>;
    }
    return this.props.children;
  }
}
