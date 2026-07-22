import { Component, type ErrorInfo, type ReactNode } from 'react'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    window.dispatchEvent(new CustomEvent('rumen-client-error', { detail: { name: error.name, message: error.message, componentStack: info.componentStack } }))
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="fatal-error" role="alert"><img src="/assets/characters/rita-expressions/rita-error.webp" alt=""/><h1>왕국 화면을 불러오지 못했어요</h1><p>작성 중인 내용은 가능한 한 기기에 남겨 두었습니다. 화면을 새로 불러와 다시 시도해 주세요.</p><button onClick={() => window.location.reload()}>안전하게 다시 불러오기</button></main>
  }
}
