import { Suspense, lazy, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowRight, BookOpen, CheckCircle2, FileText, ShieldCheck } from 'lucide-react'
import { AuthForm } from './components/AuthForm'
import { Dashboard } from './components/Dashboard'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { createDocument, listDocuments } from './lib/documents'
import type { DocumentRecord, DocumentView } from './types'

const EditorPage = lazy(() => import('./components/EditorPage').then((module) => ({ default: module.EditorPage })))

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [view, setView] = useState<DocumentView>('mine')
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [activeDocument, setActiveDocument] = useState<DocumentRecord | null>(null)
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [dashboardError, setDashboardError] = useState('')

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) setDashboardError(error.message)
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user.id || activeDocument) return
    let cancelled = false
    setLoadingDocuments(true)
    setDashboardError('')
    Promise.all([
      listDocuments(session.user.id, 'mine'),
      listDocuments(session.user.id, 'shared'),
    ]).then(([mine, shared]) => {
      if (!cancelled) setDocuments([...mine, ...shared])
    }).catch((error: unknown) => {
      if (!cancelled) setDashboardError(error instanceof Error ? error.message : 'Could not load your documents.')
    }).finally(() => {
      if (!cancelled) setLoadingDocuments(false)
    })
    return () => { cancelled = true }
  }, [session?.user.id, activeDocument])

  if (!isSupabaseConfigured) return <ConfigurationNotice />
  if (!authReady) return <div className="full-screen-loading"><span className="spinner" />Loading Ajaia Docs...</div>
  if (!session) return <AuthForm />

  const user = session.user
  const handleCreate = async (title: string, content?: DocumentRecord['content_json']) => {
    const document = await createDocument(title, content)
    setDocuments((current) => [document, ...current.filter((item) => item.id !== document.id)])
    setActiveDocument(document)
  }
  const handleSignOut = async () => {
    const { error } = await supabase!.auth.signOut()
    if (error) setDashboardError(error.message)
  }

  if (activeDocument) {
    return (
      <Suspense fallback={<div className="full-screen-loading"><span className="spinner" />Opening your document...</div>}>
        <EditorPage
          document={activeDocument}
          user={user}
          onBack={() => setActiveDocument(null)}
          onShareUpdate={() => {
            void listDocuments(user.id, 'shared').then((shared) => {
              setDocuments((current) => [...current.filter((item) => item.owner_id === user.id), ...shared])
            }).catch((error: unknown) => setDashboardError(error instanceof Error ? error.message : 'Could not refresh sharing.'))
          }}
        />
      </Suspense>
    )
  }

  return (
    <Dashboard
      user={user}
      documents={documents}
      view={view}
      loading={loadingDocuments}
      error={dashboardError}
      onViewChange={setView}
      onCreate={handleCreate}
      onOpen={setActiveDocument}
      onSignOut={handleSignOut}
      onDocumentsChange={setDocuments}
    />
  )
}

function ConfigurationNotice() {
  return (
    <main className="setup-screen">
      <section className="setup-card">
        <div className="brand-mark large"><FileText size={25} /></div>
        <p className="eyebrow">AJ A I A&nbsp; / &nbsp;DOCS</p>
        <h1>Your ideas deserve a home.</h1>
        <p className="setup-intro">Ajaia Docs is ready to connect. Add your Supabase project settings to enable secure sign-in, document storage, and sharing.</p>
        <div className="setup-checklist">
          <div><CheckCircle2 size={18} /><span>Frontend is configured for Vercel</span></div>
          <div><ShieldCheck size={18} /><span>Access controls are enforced by Supabase RLS</span></div>
          <div><BookOpen size={18} /><span>Setup guide is included in the README</span></div>
        </div>
        <div className="setup-command"><code>VITE_SUPABASE_URL=...</code><code>VITE_SUPABASE_ANON_KEY=...</code></div>
        <a className="text-link" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase dashboard <ArrowRight size={15} /></a>
        <p className="setup-footnote">Cloud persistence is not active until these values are configured and the database schema is applied.</p>
      </section>
    </main>
  )
}
