'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Search, Copy, Check, ArrowLeft, X, Image as ImageIcon, Video,
  Sparkles, ExternalLink, Plus, Trash2, Pencil, LogOut, Lock,
  Upload, Loader2, Eye, EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const TOOLS = ['ChatGPT', 'Gemini', 'Veo', 'Kling', 'Midjourney', 'Sora', 'Runway']
const TYPES = [
  { key: 'image', label: 'Images', icon: ImageIcon },
  { key: 'video', label: 'Videos', icon: Video },
]

// --- Hash routing ----------------------------------------------------------
function useHashRoute() {
  const [hash, setHash] = useState(typeof window !== 'undefined' ? window.location.hash : '')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const parts = (hash.replace(/^#\/?/, '')).split('/').filter(Boolean)
  return { hash, parts, navigate: (h) => { window.location.hash = h } }
}

// --- API helpers -----------------------------------------------------------
function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('tp_token')
}
function setToken(t) {
  if (t) localStorage.setItem('tp_token', t)
  else localStorage.removeItem('tp_token')
}
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const t = getToken()
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await fetch(`/api${path}`, { ...opts, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// --- File to data URL ------------------------------------------------------
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ===========================================================================
// Main App
// ===========================================================================
const App = () => {
  const { parts, navigate } = useHashRoute()

  let view = 'home'
  if (parts[0] === 'p' && parts[1]) view = 'detail'
  else if (parts[0] === 'admin') {
    if (parts[1] === 'new') view = 'admin-new'
    else if (parts[1] === 'edit' && parts[2]) view = 'admin-edit'
    else view = 'admin'
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {view === 'home' && <HomeView navigate={navigate} />}
      {view === 'detail' && <DetailView id={parts[1]} navigate={navigate} />}
      {view === 'admin' && <AdminView navigate={navigate} />}
      {view === 'admin-new' && <AdminEditor navigate={navigate} />}
      {view === 'admin-edit' && <AdminEditor navigate={navigate} editId={parts[2]} />}
    </main>
  )
}

// ===========================================================================
// HOME
// ===========================================================================
function HomeView({ navigate }) {
  const [items, setItems] = useState(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState(null) // 'image' | 'video' | null
  const [tool, setTool] = useState(null) // 'ChatGPT' etc

  const load = async () => {
    setItems(null)
    const qs = new URLSearchParams()
    if (search) qs.set('search', search)
    if (type) qs.set('type', type)
    if (tool) qs.set('tool', tool)
    try {
      const data = await api(`/prompts?${qs.toString()}`)
      setItems(data.items || [])
    } catch (e) {
      toast.error(e.message)
      setItems([])
    }
  }

  useEffect(() => { load() }, [type, tool])
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <button onClick={() => navigate('')} className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white grid place-items-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-semibold tracking-tight text-[15px]">TrendyPrompt</span>
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="text-xs text-neutral-400 hover:text-neutral-700 transition"
              aria-label="Admin"
              title="Admin"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>

          {/* Hero / Title */}
          <div className="pt-3 pb-4">
            <h1 className="font-serif-display text-[34px] sm:text-[44px] leading-[1.05] tracking-tight">
              Viral AI prompts,
              <br />
              <span className="text-neutral-400">ready to copy.</span>
            </h1>
            <p className="text-sm text-neutral-500 mt-2 max-w-md">
              A curated library of the best image &amp; video prompts for ChatGPT, Gemini, Veo, Kling and more.
            </p>
          </div>

          {/* Search */}
          <div className="pb-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts, styles, tools…"
                className="pl-10 h-11 rounded-xl border-neutral-200 bg-neutral-50 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-neutral-900"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {TYPES.map((t) => {
              const Icon = t.icon
              const active = type === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setType(active ? null : t.key)}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-medium transition border',
                    active
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              )
            })}
            <div className="w-px self-stretch bg-neutral-200 mx-1" />
            {TOOLS.map((tn) => {
              const active = tool === tn
              return (
                <button
                  key={tn}
                  onClick={() => setTool(active ? null : tn)}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-medium transition border',
                    active
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                  )}
                >
                  {tn}
                </button>
              )
            })}
            {(type || tool || search) && (
              <button
                onClick={() => { setType(null); setTool(null); setSearch('') }}
                className="shrink-0 inline-flex items-center gap-1 px-3 h-8 rounded-full text-xs text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Masonry Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {items === null ? (
          <SkeletonGrid />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="masonry">
            {items.map((p) => (
              <PromptCard key={p.id} prompt={p} onClick={() => navigate(`/p/${p.id}`)} />
            ))}
          </div>
        )}
      </section>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 pt-4 text-center">
        <p className="text-xs text-neutral-400">
          Made with care · TrendyPrompt
        </p>
      </footer>
    </div>
  )
}

function SkeletonGrid() {
  const heights = [220, 320, 260, 360, 240, 300, 280, 340]
  return (
    <div className="masonry">
      {heights.map((h, i) => (
        <div key={i} className="shimmer rounded-2xl" style={{ height: h }} />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-24">
      <div className="w-12 h-12 rounded-2xl bg-neutral-100 grid place-items-center mx-auto mb-3">
        <Search className="w-5 h-5 text-neutral-400" />
      </div>
      <p className="text-sm text-neutral-600">No prompts match your filters.</p>
      <p className="text-xs text-neutral-400 mt-1">Try a different search or clear filters.</p>
    </div>
  )
}

function PromptCard({ prompt, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left overflow-hidden rounded-2xl bg-neutral-100 glow-ring focus:outline-none focus:ring-2 focus:ring-neutral-900"
    >
      {prompt.thumbnail ? (
        <img
          src={prompt.thumbnail}
          alt={prompt.title}
          loading="lazy"
          className="w-full h-auto object-cover transition duration-500 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="aspect-[3/4] grid place-items-center text-neutral-300">
          <ImageIcon className="w-8 h-8" />
        </div>
      )}
      {/* Type pill */}
      <div className="absolute top-2 left-2">
        <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-white/90 backdrop-blur text-[10px] font-medium text-neutral-800">
          {prompt.type === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
          {prompt.type === 'video' ? 'Video' : 'Image'}
        </span>
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition">
        <p className="text-white text-sm font-medium line-clamp-2">{prompt.title}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {(prompt.tools || []).slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] text-white/90 bg-white/15 backdrop-blur px-1.5 py-0.5 rounded">
              {t}
            </span>
          ))}
        </div>
      </div>
      {/* Mobile-visible title */}
      <div className="sm:hidden px-1 pt-2 pb-1">
        <p className="text-xs font-medium line-clamp-2 text-neutral-800">{prompt.title}</p>
      </div>
    </button>
  )
}

// ===========================================================================
// DETAIL VIEW
// ===========================================================================
function DetailView({ id, navigate }) {
  const [doc, setDoc] = useState(null)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    setDoc(null); setErr(null)
    api(`/prompts/${id}`).then(d => { if (!cancelled) setDoc(d) }).catch(e => { if (!cancelled) setErr(e.message) })
    return () => { cancelled = true }
  }, [id])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(doc.prompt)
      setCopied(true)
      toast.success('Prompt copied!')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Copy failed')
    }
  }

  if (err) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-neutral-500">{err}</p>
        <Button variant="outline" onClick={() => navigate('')} className="mt-4">Back</Button>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="shimmer h-7 w-28 rounded mb-4" />
        <div className="shimmer rounded-2xl h-[60vh]" />
        <div className="shimmer h-6 w-3/4 mt-6 rounded" />
        <div className="shimmer h-4 w-1/2 mt-3 rounded" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('')}
            className="inline-flex items-center gap-1 text-sm text-neutral-700 hover:text-neutral-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <Badge variant="secondary" className="font-normal">
            {doc.type === 'video' ? 'Video' : 'Image'}
          </Badge>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
        {/* Hero image */}
        {doc.thumbnail && (
          <div className="rounded-2xl overflow-hidden bg-neutral-100 glow-ring">
            <img src={doc.thumbnail} alt={doc.title} className="w-full h-auto" />
          </div>
        )}

        {/* Title + meta */}
        <div className="mt-5">
          <h1 className="font-serif-display text-[30px] sm:text-[40px] leading-tight tracking-tight">
            {doc.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(doc.tools || []).map((t) => (
              <Badge key={t} variant="outline" className="rounded-full font-normal text-[11px]">{t}</Badge>
            ))}
          </div>
        </div>

        {/* Prompt block */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">The Prompt</p>
            <Button size="sm" onClick={copy} className="h-8 rounded-full px-3.5">
              {copied ? <><Check className="w-3.5 h-3.5 mr-1" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
            </Button>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-800">
              {doc.prompt}
            </p>
          </div>
        </section>

        {/* Instructions */}
        {doc.instructions?.length > 0 && (
          <section className="mt-7">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium mb-3">Step-by-step</p>
            <ol className="space-y-2.5">
              {doc.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-neutral-900 text-white text-[11px] font-semibold grid place-items-center">
                    {i + 1}
                  </span>
                  <p className="text-[15px] leading-relaxed text-neutral-800">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Tools */}
        {doc.toolLinks?.length > 0 && (
          <section className="mt-7">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium mb-3">Tools used</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {doc.toolLinks.map((tl, i) => (
                <a
                  key={i}
                  href={tl.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition"
                >
                  <span className="text-sm font-medium">{tl.name}</span>
                  <ExternalLink className="w-4 h-4 text-neutral-400" />
                </a>
              ))}
            </div>
          </section>
        )}
      </article>

      {/* Sticky bottom copy on mobile */}
      <div className="sm:hidden fixed bottom-3 inset-x-3 z-30">
        <Button onClick={copy} className="w-full h-12 rounded-full shadow-xl">
          {copied ? <><Check className="w-4 h-4 mr-2" /> Copied</> : <><Copy className="w-4 h-4 mr-2" /> Copy prompt</>}
        </Button>
      </div>
    </div>
  )
}

// ===========================================================================
// ADMIN
// ===========================================================================
function AdminView({ navigate }) {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [items, setItems] = useState(null)

  useEffect(() => {
    (async () => {
      const t = getToken()
      if (!t) { setChecking(false); return }
      try {
        const r = await api('/admin/check')
        setAuthed(r.authed)
      } catch { setAuthed(false) }
      setChecking(false)
    })()
  }, [])

  const loadAll = async () => {
    try {
      const data = await api('/prompts?all=1')
      setItems(data.items || [])
    } catch (e) { toast.error(e.message) }
  }

  useEffect(() => { if (authed) loadAll() }, [authed])

  if (checking) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
  }

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} navigate={navigate} />

  const del = async (id) => {
    if (!confirm('Delete this prompt?')) return
    try {
      await api(`/prompts/${id}`, { method: 'DELETE' })
      toast.success('Deleted')
      setItems(items.filter(x => x.id !== id))
    } catch (e) { toast.error(e.message) }
  }

  const togglePublish = async (p) => {
    try {
      const updated = await api(`/prompts/${p.id}`, {
        method: 'PUT', body: JSON.stringify({ published: !p.published })
      })
      setItems(items.map(x => x.id === p.id ? updated : x))
      toast.success(updated.published ? 'Published' : 'Unpublished')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate('')} className="inline-flex items-center gap-1 text-sm text-neutral-700">
            <ArrowLeft className="w-4 h-4" /> Site
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 hidden sm:inline">Admin</span>
            <Button size="sm" onClick={() => navigate('/admin/new')} className="rounded-full h-8 px-3">
              <Plus className="w-3.5 h-3.5 mr-1" /> New post
            </Button>
            <button
              onClick={() => { setToken(null); setAuthed(false) }}
              className="text-neutral-400 hover:text-neutral-700"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="font-serif-display text-3xl tracking-tight">Manage prompts</h1>
        <p className="text-sm text-neutral-500 mt-1">Create, edit, publish or delete prompt posts.</p>

        <div className="mt-6 grid gap-3">
          {items === null && <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />}
          {items?.length === 0 && (
            <Card className="p-8 text-center text-sm text-neutral-500">No posts yet. Create your first.</Card>
          )}
          {items?.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                {p.thumbnail && <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-normal">{p.type}</Badge>
                  {(p.tools || []).slice(0, 3).map((t) => (
                    <span key={t} className="text-[10px] text-neutral-500">{t}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => togglePublish(p)}
                title={p.published ? 'Unpublish' : 'Publish'}
                className={cn('p-2 rounded-lg', p.published ? 'text-neutral-700 hover:bg-neutral-100' : 'text-neutral-300 hover:bg-neutral-50')}
              >
                {p.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => navigate(`/admin/edit/${p.id}`)}
                className="p-2 rounded-lg text-neutral-700 hover:bg-neutral-100"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => del(p.id)}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function AdminLogin({ onSuccess, navigate }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e?.preventDefault?.()
    setLoading(true)
    try {
      const r = await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
      setToken(r.token)
      toast.success('Welcome back')
      onSuccess()
    } catch (e) {
      toast.error(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <Card className="w-full max-w-sm p-7">
        <button onClick={() => navigate('')} className="text-xs text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to site
        </button>
        <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white grid place-items-center mb-4">
          <Lock className="w-4 h-4" />
        </div>
        <h1 className="font-serif-display text-2xl tracking-tight">Admin access</h1>
        <p className="text-sm text-neutral-500 mt-1">Enter your password to continue.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
            autoFocus
          />
          <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading || !password}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

function AdminEditor({ navigate, editId }) {
  const [form, setForm] = useState({
    title: '', type: 'image', tools: [], thumbnail: '',
    prompt: '', instructions: [''], toolLinks: [{ name: '', url: '' }],
    published: true,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!editId) return
    setLoading(true)
    api(`/prompts/${editId}`).then(d => {
      setForm({
        title: d.title || '',
        type: d.type || 'image',
        tools: d.tools || [],
        thumbnail: d.thumbnail || '',
        prompt: d.prompt || '',
        instructions: d.instructions?.length ? d.instructions : [''],
        toolLinks: d.toolLinks?.length ? d.toolLinks : [{ name: '', url: '' }],
        published: d.published !== false,
      })
    }).catch(e => toast.error(e.message)).finally(() => setLoading(false))
  }, [editId])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleTool = (t) => {
    setForm((f) => ({
      ...f,
      tools: f.tools.includes(t) ? f.tools.filter(x => x !== t) : [...f.tools, t]
    }))
  }
  const setInstruction = (i, v) => {
    setForm((f) => ({ ...f, instructions: f.instructions.map((x, idx) => idx === i ? v : x) }))
  }
  const addInstruction = () => setForm((f) => ({ ...f, instructions: [...f.instructions, ''] }))
  const removeInstruction = (i) => setForm((f) => ({ ...f, instructions: f.instructions.filter((_, idx) => idx !== i) }))

  const setLink = (i, k, v) => setForm((f) => ({ ...f, toolLinks: f.toolLinks.map((x, idx) => idx === i ? { ...x, [k]: v } : x) }))
  const addLink = () => setForm((f) => ({ ...f, toolLinks: [...f.toolLinks, { name: '', url: '' }] }))
  const removeLink = (i) => setForm((f) => ({ ...f, toolLinks: f.toolLinks.filter((_, idx) => idx !== i) }))

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image too large (max 4MB). Use a URL instead.')
      return
    }
    setUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      setField('thumbnail', dataUrl)
    } catch { toast.error('Failed to read image') }
    setUploading(false)
  }

  const save = async () => {
    if (!form.title || !form.prompt) { toast.error('Title and prompt are required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        instructions: form.instructions.filter(x => x && x.trim()),
        toolLinks: form.toolLinks.filter(x => x.name && x.url),
      }
      if (editId) {
        await api(`/prompts/${editId}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast.success('Updated')
      } else {
        await api('/prompts', { method: 'POST', body: JSON.stringify(payload) })
        toast.success('Created')
      }
      navigate('/admin')
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>

  return (
    <div>
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-1 text-sm text-neutral-700">
            <ArrowLeft className="w-4 h-4" /> Admin
          </button>
          <Button size="sm" onClick={save} disabled={saving} className="rounded-full h-8 px-4">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (editId ? 'Save' : 'Publish')}
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24">
        <h1 className="font-serif-display text-3xl tracking-tight">{editId ? 'Edit prompt' : 'New prompt'}</h1>

        {/* Thumbnail */}
        <div>
          <Label>Thumbnail</Label>
          <div className="mt-2 rounded-2xl border border-dashed border-neutral-300 p-3">
            {form.thumbnail ? (
              <div className="relative">
                <img src={form.thumbnail} alt="" className="w-full max-h-72 object-contain rounded-xl bg-neutral-50" />
                <button
                  onClick={() => setField('thumbnail', '')}
                  className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full p-1.5 hover:bg-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition border border-neutral-200"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-neutral-500" />}
                  <span className="text-xs text-neutral-600">Upload image</span>
                  <span className="text-[10px] text-neutral-400">max 4 MB</span>
                </button>
                <div className="flex flex-col gap-2 justify-center">
                  <Label className="text-xs text-neutral-500">Or paste image URL</Label>
                  <Input
                    placeholder="https://…"
                    value={form.thumbnail}
                    onChange={(e) => setField('thumbnail', e.target.value)}
                  />
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
          </div>
        </div>

        {/* Title */}
        <div>
          <Label>Title</Label>
          <Input
            className="mt-2 h-11"
            placeholder="e.g. Cinematic foggy portrait"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
          />
        </div>

        {/* Type */}
        <div>
          <Label>Type</Label>
          <div className="mt-2 inline-flex p-1 rounded-full bg-neutral-100">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setField('type', t.key)}
                className={cn(
                  'px-4 h-8 rounded-full text-xs font-medium transition',
                  form.type === t.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div>
          <Label>Tools / Models</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOOLS.map((t) => {
              const active = form.tools.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTool(t)}
                  className={cn(
                    'px-3 h-8 rounded-full text-xs font-medium border transition',
                    active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-200'
                  )}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        {/* Prompt */}
        <div>
          <Label>Prompt text</Label>
          <Textarea
            className="mt-2 min-h-[140px]"
            placeholder="Paste the full prompt that users will copy…"
            value={form.prompt}
            onChange={(e) => setField('prompt', e.target.value)}
          />
        </div>

        {/* Instructions */}
        <div>
          <div className="flex items-center justify-between">
            <Label>Step-by-step instructions</Label>
            <Button type="button" size="sm" variant="ghost" onClick={addInstruction} className="h-7">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add step
            </Button>
          </div>
          <div className="mt-2 space-y-2">
            {form.instructions.map((step, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 mt-2 w-6 h-6 rounded-full bg-neutral-100 text-[11px] font-semibold grid place-items-center">
                  {i + 1}
                </span>
                <Textarea
                  rows={2}
                  placeholder={`Step ${i + 1}`}
                  value={step}
                  onChange={(e) => setInstruction(i, e.target.value)}
                />
                {form.instructions.length > 1 && (
                  <button type="button" onClick={() => removeInstruction(i)} className="text-neutral-400 hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tool links */}
        <div>
          <div className="flex items-center justify-between">
            <Label>Tool links</Label>
            <Button type="button" size="sm" variant="ghost" onClick={addLink} className="h-7">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add link
            </Button>
          </div>
          <div className="mt-2 space-y-2">
            {form.toolLinks.map((tl, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <Input placeholder="Name" value={tl.name} onChange={(e) => setLink(i, 'name', e.target.value)} />
                <Input placeholder="https://…" value={tl.url} onChange={(e) => setLink(i, 'url', e.target.value)} />
                {form.toolLinks.length > 1 && (
                  <button type="button" onClick={() => removeLink(i)} className="text-neutral-400 hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Published */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pub"
            checked={form.published}
            onChange={(e) => setField('published', e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="pub" className="text-sm text-neutral-700">Publish immediately</label>
        </div>

        <Button onClick={save} disabled={saving} className="w-full h-12 rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editId ? 'Save changes' : 'Publish prompt')}
        </Button>
      </div>
    </div>
  )
}

function Label({ children, className }) {
  return <label className={cn('text-xs font-medium text-neutral-700 uppercase tracking-wider', className)}>{children}</label>
}

export default App
