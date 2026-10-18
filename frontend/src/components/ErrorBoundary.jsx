import { Component } from 'react'
import { Logo } from './ui'

// Last line of defence: if any page crashes while rendering, show a calm way back instead of a blank screen.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Clausewise crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grain flex min-h-screen flex-col bg-night text-night-text">
        <header className="mx-auto flex h-18 w-full max-w-[1240px] items-center px-4 sm:px-6"><Logo dark /></header>
        <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-center px-4 pb-24 sm:px-6">
          <h1 className="font-display text-[clamp(38px,6vw,84px)] font-extrabold leading-[0.92] tracking-[-0.045em]">
            Something broke.
            <br />
            <span className="font-serif font-normal italic text-glow-heat">It’s us, not you.</span>
          </h1>
          <p className="mt-6 max-w-[520px] text-[17px] font-medium leading-relaxed text-night-text/75">This page hit an unexpected error. Your saved history is safe. Reload the page, or start again from the home page.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => window.location.reload()} className="flex h-13 cursor-pointer items-center rounded-full bg-glow-heat px-7 text-[15px] font-extrabold text-night">Reload the page</button>
            <a href="#/" onClick={() => setTimeout(() => window.location.reload(), 0)} className="flex h-13 items-center rounded-full border border-white/20 bg-white/5 px-6 text-[15px] font-bold">Go to the home page</a>
          </div>
        </main>
      </div>
    )
  }
}
