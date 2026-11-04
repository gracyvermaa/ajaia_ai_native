import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, FileText, LockKeyhole, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      const result = mode === 'login'
        ? await supabase!.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase!.auth.signUp({ email: email.trim(), password })
      if (result.error) throw result.error
      if (mode === 'signup' && !result.data.session) {
        setMessage('Check your inbox to confirm your email, then sign in.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-aside">
        <div className="auth-brand"><span className="brand-mark"><FileText size={20} /></span><span>Ajaia <b>Docs</b></span></div>
        <div className="auth-message">
          <div className="eyebrow">A LITTLE MORE ROOM TO THINK</div>
          <h1>Good ideas grow<br />better together.</h1>
          <p>A calm, collaborative space to write, organize, and share what matters.</p>
          <div className="auth-quote"><span>“</span><p>Clear writing is clear thinking.</p></div>
        </div>
        <div className="auth-aside-footer">Thoughtfully made for teams that think.</div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="mobile-auth-brand"><span className="brand-mark"><FileText size={20} /></span>Ajaia <b>Docs</b></div>
          <div className="auth-heading">
            <p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</p>
            <h2>{mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}</h2>
            <p>{mode === 'login' ? 'Pick up right where you left off.' : 'Your next great idea starts here.'}</p>
          </div>
          <form onSubmit={submit} className="auth-form">
            <label htmlFor="auth-email">Email address</label>
            <div className="input-with-icon"><Mail size={17} /><input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></div>
            <label htmlFor="auth-password">Password</label>
            <div className="input-with-icon"><LockKeyhole size={17} /><input id="auth-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required minLength={8} /></div>
            {error && <div role="alert" className="inline-alert error">{error}</div>}
            {message && <div role="status" className="inline-alert success">{message}</div>}
            <button type="submit" className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}{!busy && <ArrowRight size={17} />}</button>
          </form>
          <p className="auth-switch">{mode === 'login' ? 'New to Ajaia Docs?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
          <p className="auth-legal">By continuing, you agree to keep your shared documents respectful and secure.</p>
        </div>
      </section>
    </main>
  )
}
