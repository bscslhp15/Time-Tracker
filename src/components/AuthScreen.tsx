import { useState, type FormEvent } from 'react'
import { ArrowRight, Clock3, LockKeyhole, Sparkles } from 'lucide-react'

type AuthScreenProps = {
  authEnabled: boolean
  busy: boolean
  error: string
  message: string
  onSubmit: (mode: 'login' | 'signup', email: string, password: string) => void
  onDemo: () => void
}

export function AuthScreen({ authEnabled, busy, error, message, onSubmit, onDemo }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(mode, email.trim(), password)
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="brand-lockup"><span className="brand-mark"><Clock3 size={19} /></span><span>minute</span></div>
        <div className="auth-story-copy">
          <span className="eyebrow">TIME, WELL SPENT</span>
          <h1>Make every<br />hour <em>count.</em></h1>
          <p>A thoughtful place to track your work, see your progress, and know exactly how far you’ve come.</p>
        </div>
        <div className="auth-story-foot"><span className="live-dot" /> Your next good day starts here</div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="mobile-brand brand-lockup"><span className="brand-mark"><Clock3 size={19} /></span><span>minute</span></div>
          <div className="auth-heading">
            <span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</span>
            <h2>{mode === 'login' ? 'Sign in to your space' : 'Create your account'}</h2>
            <p>{mode === 'login' ? 'Your hours are right where you left them.' : 'A clearer picture of your work starts here.'}</p>
          </div>
          <div className="auth-switch" role="tablist" aria-label="Account access">
            <button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Sign in</button>
            <button type="button" className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')}>Create account</button>
          </div>
          <form className="stack-form" onSubmit={handleSubmit}>
            <label>Email address<input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 6 characters" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            {message && <p className="form-success" role="status">{message}</p>}
            <button className="button button-primary button-wide" type="submit" disabled={!authEnabled || busy}>
              {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} />
            </button>
          </form>
          {!authEnabled && <div className="setup-notice"><LockKeyhole size={16} /><span>Connect your Supabase project in <code>.env.local</code> to enable secure accounts.</span></div>}
          <div className="auth-divider"><span>OR</span></div>
          <button className="button button-secondary button-wide" type="button" onClick={onDemo}><Sparkles size={16} /> Explore a sample workspace</button>
          <p className="auth-footnote">Demo data stays in this browser and is not sent anywhere.</p>
        </div>
        <span className="auth-copyright">Made for the work you’re proud of.</span>
      </section>
    </main>
  )
}