'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, X, Image as ImageIcon, Video, Sparkles, Plus, Trash2, Pencil,
  LogOut, Lock, Upload, Loader2, Eye, EyeOff, Flame, Settings,
  MessageCircle, Send, Instagram, Twitter, Youtube,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const TOOLS = ['ChatGPT', 'Gemini', 'Veo', 'Kling', 'Midjourney', 'Sora', 'Runway', 'Ideogram']
const GENDERS = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
]
const TYPES = [
  { key: 'image', label: 'Images', icon: ImageIcon },
  { key: 'video', label: 'Videos', icon: Video },
]

function getToken() { return localStorage.getItem('tp_token') }
function setToken(t: string | null) { if (t) localStorage.setItem('tp_token', t); else localStorage.removeItem('tp_token') }
async function api(path: string, opts: RequestInit & { headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const t = getToken()
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await fetch(`/api${path}`, { ...opts, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any).error || 'Request failed')
  return data
}

async function uploadImageToStorage(file: File): Promise<string> {
  // Step 1: request a presigned PUT URL from our backend
  const res = await fetch('/api/storage/uploads/request-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  })
  if (!res.ok) throw new Error('Failed to get upload URL')
  const { uploadURL, objectPath } = await res.json()

  // Step 2: upload the file directly to GCS via the presigned URL (no size limit)
  const uploadRes = await fetch(uploadURL, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!uploadRes.ok) throw new Error('Upload to storage failed')

  // objectPath is like /objects/uploads/<uuid> — serving URL is /api/storage + objectPath
  return `/api/storage${objectPath}`
}

interface Prompt {
  id: string
  title: string
  type: 'image' | 'video'
  tools: string[]
  thumbnail: string
  videoUrl?: string
  prompt: string
  instructions: string[]
  toolLinks: { name: string; url: string }[]
  trending: boolean
  published: boolean
  gender?: 'male' | 'female' | null
  images?: string[]
}

interface FormState {
  title: string
  type: string
  tools: string[]
  thumbnail: string
  videoUrl: string
  prompt: string
  instructions: string[]
  toolLinks: { name: string; url: string }[]
  published: boolean
  trending: boolean
  gender: string
  images: string[]
}

export default function AdminPage() {
  const [view, setView] = useState('dashboard')
  const [editId, setEditId] = useState<string | null>(null)
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    (async () => {
      if (!getToken()) { setChecking(false); return }
      try { const r = await api('/admin/check'); setAuthed(r.authed) } catch {}
      setChecking(false)
    })()
  }, [])

  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace(/^#\/?/, '')
      const parts = h.split('/').filter(Boolean)
      if (parts[0] === 'new') { setView('new'); setEditId(null) }
      else if (parts[0] === 'edit' && parts[1]) { setView('edit'); setEditId(parts[1]) }
      else if (parts[0] === 'settings') { setView('settings'); setEditId(null) }
      else { setView('dashboard'); setEditId(null) }
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [])

  const navigate = (h: string) => { window.location.hash = h; window.scrollTo({ top: 0 }) }
  const goHome = () => { window.location.href = '/' }

  if (checking) return <div className="min-h-screen grid place-items-center bg-white"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} goHome={goHome} />

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {view === 'dashboard' && <Dashboard navigate={navigate} goHome={goHome} onLogout={() => { setToken(null); setAuthed(false) }} />}
      {(view === 'new' || view === 'edit') && <Editor navigate={navigate} editId={view === 'edit' ? editId : null} />}
      {view === 'settings' && <SettingsView navigate={navigate} />}
    </main>
  )
}

function AdminLogin({ onSuccess, goHome }: { onSuccess: () => void; goHome: () => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e?.preventDefault?.()
    setLoading(true)
    try {
      const r = await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
      setToken(r.token); toast.success('Welcome back'); onSuccess()
    } catch (e: any) { toast.error(e.message) }
    setLoading(false)
  }
  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-to-br from-neutral-50 via-white to-fuchsia-50">
      <Card className="w-full max-w-sm p-7 shadow-xl border-neutral-200">
        <button onClick={goHome} className="text-xs text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to site
        </button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-500 text-white grid place-items-center mb-4 shadow-sm">
          <Lock className="w-4 h-4" />
        </div>
        <h1 className="font-serif-display text-2xl tracking-tight">Admin access</h1>
        <p className="text-sm text-neutral-500 mt-1">Enter your password to continue.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" autoFocus />
          <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading || !password}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

function Dashboard({ navigate, goHome, onLogout }: { navigate: (h: string) => void; goHome: () => void; onLogout: () => void }) {
  const [items, setItems] = useState<Prompt[] | null>(null)
  const [base64Count, setBase64Count] = useState(0)
  const [migrating, setMigrating] = useState(false)

  const load = async () => {
    try {
      const data = await api('/prompts?all=1')
      setItems(data.items || [])
    } catch (e: any) { toast.error(e.message) }
  }

  const checkMigrationStatus = async () => {
    try {
      const r = await api('/admin/migrate-images/status')
      setBase64Count(r.base64Count || 0)
    } catch {}
  }

  useEffect(() => { load(); checkMigrationStatus() }, [])

  const runMigration = async () => {
    if (!confirm(`Migrate ${base64Count} base64 image(s) to cloud storage? This may take a minute.`)) return
    setMigrating(true)
    try {
      const r = await api('/admin/migrate-images', { method: 'POST' })
      toast.success(`Migrated ${r.migrated} image(s) to cloud storage.${r.failed ? ` ${r.failed} failed.` : ''}`)
      setBase64Count(0)
      load()
    } catch (e: any) { toast.error(e.message) }
    setMigrating(false)
  }

  const del = async (id: string) => {
    if (!confirm('Delete this prompt?')) return
    try { await api(`/prompts/${id}`, { method: 'DELETE' }); toast.success('Deleted'); setItems((items || []).filter(x => x.id !== id)) }
    catch (e: any) { toast.error(e.message) }
  }
  const togglePublish = async (p: Prompt) => {
    try {
      const updated = await api(`/prompts/${p.id}`, { method: 'PUT', body: JSON.stringify({ published: !p.published }) })
      setItems((items || []).map(x => x.id === p.id ? updated : x))
      toast.success(updated.published ? 'Published' : 'Unpublished')
    } catch (e: any) { toast.error(e.message) }
  }
  const toggleTrending = async (p: Prompt) => {
    try {
      const updated = await api(`/prompts/${p.id}`, { method: 'PUT', body: JSON.stringify({ trending: !p.trending }) })
      setItems((items || []).map(x => x.id === p.id ? updated : x))
      toast.success(updated.trending ? 'Marked trending' : 'Removed trending')
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={goHome} className="inline-flex items-center gap-1 text-sm text-neutral-700">
            <ArrowLeft className="w-4 h-4" /> Site
          </button>
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate('/settings')} className="p-2 text-neutral-500 hover:text-neutral-900" title="Settings">
              <Settings className="w-4 h-4" />
            </button>
            <Button size="sm" onClick={() => navigate('/new')} className="rounded-full h-8 px-3">
              <Plus className="w-3.5 h-3.5 mr-1" /> New post
            </Button>
            <button onClick={onLogout} className="text-neutral-400 hover:text-neutral-700 p-2" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="font-serif-display text-3xl tracking-tight">Manage prompts</h1>
        <p className="text-sm text-neutral-500 mt-1">Create, edit, publish or mark trending.</p>

        {base64Count > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-amber-900">
                {base64Count} image{base64Count !== 1 ? 's' : ''} still stored as base64
              </p>
              <p className="text-xs text-amber-700 mt-0.5">Migrate them to cloud storage to fix slow page loads.</p>
            </div>
            <button
              onClick={runMigration}
              disabled={migrating}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition disabled:opacity-60"
            >
              {migrating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Migrating…</> : <><Upload className="w-3.5 h-3.5" /> Migrate images</>}
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-3">
          {items === null && <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />}
          {items?.length === 0 && <Card className="p-8 text-center text-sm text-neutral-500">No posts yet. Create your first.</Card>}
          {items?.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                {p.thumbnail && <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-normal">{p.type}</Badge>
                  {p.trending && <Badge className="text-[10px] font-normal bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">Trending</Badge>}
                  {(p.tools || []).slice(0, 3).map((t) => <span key={t} className="text-[10px] text-neutral-500">{t}</span>)}
                </div>
              </div>
              <button onClick={() => toggleTrending(p)} title={p.trending ? 'Remove trending' : 'Mark trending'}
                className={cn('p-2 rounded-lg', p.trending ? 'text-orange-500 hover:bg-orange-50' : 'text-neutral-300 hover:bg-neutral-50')}>
                <Flame className="w-4 h-4" />
              </button>
              <button onClick={() => togglePublish(p)} title={p.published ? 'Unpublish' : 'Publish'}
                className={cn('p-2 rounded-lg', p.published ? 'text-neutral-700 hover:bg-neutral-100' : 'text-neutral-300 hover:bg-neutral-50')}>
                {p.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => navigate(`/edit/${p.id}`)} className="p-2 rounded-lg text-neutral-700 hover:bg-neutral-100" title="Edit">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => del(p.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function Editor({ navigate, editId }: { navigate: (h: string) => void; editId: string | null }) {
  const [form, setForm] = useState<FormState>({
    title: '', type: 'image', tools: [], thumbnail: '', videoUrl: '',
    prompt: '', instructions: [''], toolLinks: [{ name: '', url: '' }],
    published: true, trending: false, gender: '', images: [],
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [extraUploading, setExtraUploading] = useState(false)
  const imageRef = useRef<HTMLInputElement>(null)
  const extraImagesRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editId) return
    setLoading(true)
    api(`/prompts/${editId}`).then(d => {
      setForm({
        title: d.title || '', type: d.type || 'image', tools: d.tools || [],
        thumbnail: d.thumbnail || '', videoUrl: d.videoUrl || '',
        prompt: d.prompt || '',
        instructions: d.instructions?.length ? d.instructions : [''],
        toolLinks: d.toolLinks?.length ? d.toolLinks : [{ name: '', url: '' }],
        published: d.published !== false, trending: !!d.trending,
        gender: d.gender || '', images: d.images || [],
      })
    }).catch((e: any) => toast.error(e.message)).finally(() => setLoading(false))
  }, [editId])

  const setField = (k: keyof FormState, v: any) => setForm((f) => ({ ...f, [k]: v }))
  const toggleTool = (t: string) => setForm((f) => ({ ...f, tools: f.tools.includes(t) ? f.tools.filter(x => x !== t) : [...f.tools, t] }))
  const setInstruction = (i: number, v: string) => setForm((f) => ({ ...f, instructions: f.instructions.map((x, idx) => idx === i ? v : x) }))
  const addInstruction = () => setForm((f) => ({ ...f, instructions: [...f.instructions, ''] }))
  const removeInstruction = (i: number) => setForm((f) => ({ ...f, instructions: f.instructions.filter((_, idx) => idx !== i) }))
  const setLink = (i: number, k: 'name' | 'url', v: string) => setForm((f) => ({ ...f, toolLinks: f.toolLinks.map((x, idx) => idx === i ? { ...x, [k]: v } : x) }))
  const addLink = () => setForm((f) => ({ ...f, toolLinks: [...f.toolLinks, { name: '', url: '' }] }))
  const removeLink = (i: number) => setForm((f) => ({ ...f, toolLinks: f.toolLinks.filter((_, idx) => idx !== i) }))

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please pick an image file'); return }
    setImageUploading(true)
    try {
      const url = await uploadImageToStorage(file)
      setField('thumbnail', url)
      toast.success('Image uploaded!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    }
    setImageUploading(false)
    if (imageRef.current) imageRef.current.value = ''
  }

  const handleExtraImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setExtraUploading(true)
    let uploaded = 0
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      try {
        const url = await uploadImageToStorage(file)
        setForm(f => ({ ...f, images: [...f.images, url] }))
        uploaded++
      } catch (err: any) {
        toast.error(`Failed: ${file.name}`)
      }
    }
    if (uploaded) toast.success(`${uploaded} image${uploaded > 1 ? 's' : ''} added`)
    setExtraUploading(false)
    if (extraImagesRef.current) extraImagesRef.current.value = ''
  }

  const removeExtraImage = (i: number) => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))

  const save = async () => {
    if (!form.title || !form.prompt) { toast.error('Title and prompt are required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        instructions: form.instructions.filter(x => x && x.trim()),
        toolLinks: form.toolLinks.filter(x => x.name && x.url),
      }
      if (editId) { await api(`/prompts/${editId}`, { method: 'PUT', body: JSON.stringify(payload) }); toast.success('Updated') }
      else { await api('/prompts', { method: 'POST', body: JSON.stringify(payload) }); toast.success('Created') }
      navigate('')
    } catch (e: any) { toast.error(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>

  return (
    <div>
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate('')} className="inline-flex items-center gap-1 text-sm text-neutral-700">
            <ArrowLeft className="w-4 h-4" /> Admin
          </button>
          <Button size="sm" onClick={save} disabled={saving || imageUploading} className="rounded-full h-8 px-4">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (editId ? 'Save' : 'Publish')}
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24">
        <h1 className="font-serif-display text-3xl tracking-tight">{editId ? 'Edit prompt' : 'New prompt'}</h1>

        <div>
          <FieldLabel>Type</FieldLabel>
          <div className="mt-2 inline-flex p-1 rounded-full bg-neutral-100">
            {TYPES.map((t) => (
              <button key={t.key} type="button" onClick={() => setField('type', t.key)}
                className={cn('px-4 h-8 rounded-full text-xs font-medium transition',
                  form.type === t.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500')}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {form.type === 'video' && (
          <div>
            <FieldLabel>Video URL</FieldLabel>
            <Input className="mt-2 h-11" placeholder="https://…/video.mp4" value={form.videoUrl} onChange={(e) => setField('videoUrl', e.target.value)} />
            <p className="text-[11px] text-neutral-500 mt-1">Paste a direct .mp4 or .webm URL.</p>
          </div>
        )}

        <div>
          <FieldLabel>{form.type === 'video' ? 'Thumbnail (cover)' : 'Cover image'}</FieldLabel>
          <div className="mt-2 rounded-2xl border border-dashed border-neutral-300 p-3">
            {form.thumbnail ? (
              <div className="relative">
                <img src={form.thumbnail} alt="" className="w-full max-h-72 object-contain rounded-xl bg-neutral-50" />
                <button onClick={() => setField('thumbnail', '')} className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full p-1.5 hover:bg-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <button type="button" onClick={() => imageRef.current?.click()} disabled={imageUploading}
                  className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition border border-neutral-200 disabled:opacity-50">
                  {imageUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs text-neutral-500">Uploading…</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-neutral-500" />
                      <span className="text-xs text-neutral-600">Upload image</span>
                      <span className="text-[10px] text-neutral-400">any size · stored in cloud</span>
                    </>
                  )}
                </button>
                <div className="flex flex-col gap-2 justify-center">
                  <FieldLabel className="text-xs text-neutral-500">Or paste image URL</FieldLabel>
                  <Input placeholder="https://…" value={form.thumbnail} onChange={(e) => setField('thumbnail', e.target.value)} />
                </div>
              </div>
            )}
            <input ref={imageRef} type="file" accept="image/*" hidden onChange={handleImageFile} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <FieldLabel>Extra photos <span className="text-neutral-400 font-normal text-[11px]">(carousel — up to 9)</span></FieldLabel>
            <Button type="button" size="sm" variant="ghost" onClick={() => extraImagesRef.current?.click()} disabled={extraUploading || form.images.length >= 9} className="h-7">
              {extraUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              Add photos
            </Button>
          </div>
          <input ref={extraImagesRef} type="file" accept="image/*" multiple hidden onChange={handleExtraImages} />
          {form.images.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {form.images.map((url, i) => (
                <div key={i} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExtraImage(i)}
                    className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 hover:bg-white">
                    <X className="w-3 h-3 text-neutral-700" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white px-1 rounded">{i + 1}</span>
                </div>
              ))}
            </div>
          )}
          {form.images.length === 0 && (
            <p className="text-[11px] text-neutral-400 mt-1">Add multiple photos to show a carousel on the card. First photo shows first.</p>
          )}
        </div>

        <div>
          <FieldLabel>Title</FieldLabel>
          <Input className="mt-2 h-11" placeholder="e.g. Cinematic foggy portrait"
            value={form.title} onChange={(e) => setField('title', e.target.value)} />
        </div>

        <div>
          <FieldLabel>Gender</FieldLabel>
          <div className="mt-2 inline-flex p-1 rounded-full bg-neutral-100">
            <button type="button" onClick={() => setField('gender', '')}
              className={cn('px-4 h-8 rounded-full text-xs font-medium transition',
                !form.gender ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500')}>
              Unisex
            </button>
            {GENDERS.map((g) => (
              <button key={g.key} type="button" onClick={() => setField('gender', form.gender === g.key ? '' : g.key)}
                className={cn('px-4 h-8 rounded-full text-xs font-medium transition',
                  form.gender === g.key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500')}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Tools / Models</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOOLS.map((t) => {
              const active = form.tools.includes(t)
              return (
                <button key={t} type="button" onClick={() => toggleTool(t)}
                  className={cn('px-3 h-8 rounded-full text-xs font-medium border transition',
                    active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-200')}>
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Prompt text</FieldLabel>
          <Textarea className="mt-2 min-h-[140px]" placeholder="Paste the full prompt…"
            value={form.prompt} onChange={(e) => setField('prompt', e.target.value)} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <FieldLabel>Step-by-step instructions</FieldLabel>
            <Button type="button" size="sm" variant="ghost" onClick={addInstruction} className="h-7">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add step
            </Button>
          </div>
          <div className="mt-2 space-y-2">
            {form.instructions.map((step, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 mt-2 w-6 h-6 rounded-full bg-neutral-100 text-[11px] font-semibold grid place-items-center">{i + 1}</span>
                <Textarea rows={2} placeholder={`Step ${i + 1}`} value={step} onChange={(e) => setInstruction(i, e.target.value)} />
                {form.instructions.length > 1 && (
                  <button type="button" onClick={() => removeInstruction(i)} className="text-neutral-400 hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <FieldLabel>Tool links</FieldLabel>
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

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" checked={form.published} onChange={(e) => setField('published', e.target.checked)} className="w-4 h-4" />
            Publish immediately
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" checked={form.trending} onChange={(e) => setField('trending', e.target.checked)} className="w-4 h-4" />
            <Flame className="w-4 h-4 text-orange-500" /> Mark as Trending
          </label>
        </div>

        <Button onClick={save} disabled={saving || imageUploading} className="w-full h-12 rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editId ? 'Save changes' : 'Publish prompt')}
        </Button>
      </div>
    </div>
  )
}

interface Settings {
  whatsapp: string; telegram: string; instagram: string; youtube: string; twitter: string; tagline: string;
}

function SettingsView({ navigate }: { navigate: (h: string) => void }) {
  const [form, setForm] = useState<Settings>({ whatsapp: '', telegram: '', instagram: '', youtube: '', twitter: '', tagline: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/settings')
      .then((s: Settings) => setForm({ whatsapp: s.whatsapp || '', telegram: s.telegram || '', instagram: s.instagram || '', youtube: s.youtube || '', twitter: s.twitter || '', tagline: s.tagline || '' }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try { await api('/settings', { method: 'PUT', body: JSON.stringify(form) }); toast.success('Saved') }
    catch (e: any) { toast.error(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>

  const fields = [
    { key: 'whatsapp' as const, label: 'WhatsApp Channel URL', placeholder: 'https://whatsapp.com/channel/…', icon: MessageCircle },
    { key: 'telegram' as const, label: 'Telegram URL', placeholder: 'https://t.me/yourchannel', icon: Send },
    { key: 'instagram' as const, label: 'Instagram URL', placeholder: 'https://instagram.com/yourhandle', icon: Instagram },
    { key: 'youtube' as const, label: 'YouTube URL', placeholder: 'https://youtube.com/@yourhandle', icon: Youtube },
    { key: 'twitter' as const, label: 'X / Twitter URL', placeholder: 'https://x.com/yourhandle', icon: Twitter },
  ]

  return (
    <div>
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate('')} className="inline-flex items-center gap-1 text-sm text-neutral-700">
            <ArrowLeft className="w-4 h-4" /> Admin
          </button>
          <Button size="sm" onClick={save} disabled={saving} className="rounded-full h-8 px-4">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-24">
        <div>
          <h1 className="font-serif-display text-3xl tracking-tight">Site settings</h1>
          <p className="text-sm text-neutral-500 mt-1">Your social channels show in the footer and on every prompt page.</p>
        </div>

        <div>
          <FieldLabel>Tagline (footer)</FieldLabel>
          <Input className="mt-2 h-11" placeholder="Daily viral AI prompts. Made for creators."
            value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </div>

        {fields.map((f) => {
          const Icon = f.icon
          return (
            <div key={f.key}>
              <FieldLabel className="inline-flex items-center gap-2"><Icon className="w-3.5 h-3.5" /> {f.label}</FieldLabel>
              <Input className="mt-2 h-11" placeholder={f.placeholder}
                value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          )
        })}

        <Button onClick={save} disabled={saving} className="w-full h-12 rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save settings'}
        </Button>
      </div>
    </div>
  )
}

function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={cn('text-xs font-medium text-neutral-700 uppercase tracking-wider', className)}>{children}</label>
}
