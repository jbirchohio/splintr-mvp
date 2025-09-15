export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-bold">About Splintr</h1>
      <p className="text-sm text-muted">Interactive branching video stories</p>
      <div className="text-sm">Version: {process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'}</div>
      <div className="text-sm">Privacy: <a className="underline" href="/privacy">/privacy</a></div>
      <div className="text-sm">Terms: <a className="underline" href="/terms">/terms</a></div>
      <div className="text-sm">Support: <a className="underline" href="mailto:support@splintr.app">support@splintr.app</a></div>
    </div>
  )
}

