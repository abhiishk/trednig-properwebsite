'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { upload } from '@vercel/blob/client'
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

const TOOLS = ['ChatGPT', 'Gemini', 'Veo', 'Kling', 'Midjourney', 'Sora', 'Runway']
const TYPES = [
  { key: 'image', label: 'Images', icon: ImageIcon },
  { key: 'video', label: 'Videos', icon: Video },
]

// --- helpers ---------------------------------------------------------------
function getToken() { if (typeof window === 'undefined') return null; return localStorage.getItem('tp_token') }
function setToken(t) { if (t) localStorage.setItem('tp_token', t); else localStorage.removeItem('tp_token') }
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const t = getToken()
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await fetch(`/api${path}`, { ...opts, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result); r.onerror = reject
    r.readAsDataURL(file)
  })
}

// Upload a File to Vercel Blob (client-direct, bypasses 4.5MB limit)
async function uploadToBlob(file, onProgress) {
  const authToken = getToken()
  if (!authToken) throw new Error('Not logged in')
  const safeName = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, '_')}`
  const blob = await upload(safeName, file, {
    access: 'public',
    handleUploadUrl: '/api/blob/upload-token',
    clientPayload: JSON.stringify({
      authToken,
      contentType: file.type,
      originalFileName: file.name,
    }),
    onUploadProgress: (e) => {
      if (typeof e?.percentage === 'number' && onProgress) onProgress(e.percentage)
    },
  })
  return blob.url
}

// ===========================================================================
// MAIN
// ===========================================================================
const App = () => {
  const [view, setView] = useState('dashboard') // dashboard | new | edit | settings
  const [editId, setEditId] = useState(null)
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    (async () => {
      if (!getToken()) { setChecking(false); return }
      try { const r = await api('/admin/check'); setAuthed(r.authed) } catch {}
      setChecking(false)
    })()
  }, [])

  // Hash routing inside /admin so back-button works
  useEffect(() => {
    const apply = () => {
      const h = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#\/?/, '')
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

  const navigate = (h) => { window.location.hash = h; window.scrollTo({ top: 0 }) }
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

// ===========================================================================
// LOGIN
// ===========================================================================
function AdminLogin({ onSuccess, goHome }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e?.preventDefault?.()
    setLoading(true)
    try {
      const r = await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
      setToken(r.token); toast.success('Welcome back'); onSuccess()
    } catch (e) { toast.error(e.message) }
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

// ===========================================================================
// DASHBOARD
// ===========================================================================
function Dashboard({ navigate, goHome, onLogout }) {
  const [items, setItems] = useState(null)

  const load = async () => {
    try { const data = await api('/prompts?all=1'); setItems(data.items || []) }
    catch (e) { toast.error(e.message) }
  }
  useEffect(() => { load() }, [])

  const del = async (id) => {
    if (!confirm('Delete this prompt?')) return
    try { await api(`/prompts/${id}`, { method: 'DELETE' }); toast.success('Deleted'); setItems(items.filter(x => x.id !== id)) }
    catch (e) { toast.error(e.message) }
  }
  const togglePublish = async (p) => {
    try {
      const updated = await api(`/prompts/${p.id}`, { method: 'PUT', body: JSON.stringify({ published: !p.published }) })
      setItems(items.map(x => x.id === p.id ? updated : x))
      toast.success(updated.published ? 'Published' : 'Unpublished')
    } catch (e) { toast.error(e.message) }
  }
  const toggleTrending = async (p) => {
    try {
      const updated = await api(`/prompts/${p.id}`, { method: 'PUT', body: JSON.stringify({ trending: !p.trending }) })
      setItems(items.map(x => x.id === p.id ? updated : x))
      toast.success(updated.trending ? 'Marked trending' : 'Removed trending')
    } catch (e) { toast.error(e.message) }
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

// ===========================================================================
// EDITOR with FILE UPLOAD (image + video)
// ===========================================================================
function Editor({ navigate, editId }) {
  const [form, setForm] = useState({
    title: '', type: 'image', tools: [], thumbnail: '', videoUrl: '',
    prompt: '', instructions: [''], toolLinks: [{ name: '', url: '' }],
    published: true, trending: false,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageProgress, setImageProgress] = useState(0)
  const [videoUploading, setVideoUploading] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const imageRef = useRef(null)
  const videoRef = useRef(null)

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
      })
    }).catch(e => toast.error(e.message)).finally(() => setLoading(false))
  }, [editId])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleTool = (t) => setForm((f) => ({ ...f, tools: f.tools.includes(t) ? f.tools.filter(x => x !== t) : [...f.tools, t] }))
  const setInstruction = (i, v) => setForm((f) => ({ ...f, instructions: f.instructions.map((x, idx) => idx === i ? v : x) }))
  const addInstruction = () => setForm((f) => ({ ...f, instructions: [...f.instructions, ''] }))
  const removeInstruction = (i) => setForm((f) => ({ ...f, instructions: f.instructions.filter((_, idx) => idx !== i) }))
  const setLink = (i, k, v) => setForm((f) => ({ ...f, toolLinks: f.toolLinks.map((x, idx) => idx === i ? { ...x, [k]: v } : x) }))
  const addLink = () => setForm((f) => ({ ...f, toolLinks: [...f.toolLinks, { name: '', url: '' }] }))
  const removeLink = (i) => setForm((f) => ({ ...f, toolLinks: f.toolLinks.filter((_, idx) => idx !== i) }))

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please pick an image file'); return }
    setImageUploading(true); setImageProgress(0)
    try {
      // Try Vercel Blob first; fall back to base64 if not configured
      let url
      try {
        url = await uploadToBlob(file, (p) => setImageProgress(p))
      } catch (blobErr) {
        if (file.size <= 4 * 1024 * 1024) {
          url = await fileToDataUrl(file)
          toast.info('Stored inline (set up Vercel Blob for permanent hosting)')
        } else {
          throw new Error('Image too large for fallback. Set up Vercel Blob in your Vercel dashboard → Storage tab.')
        }
      }
      setField('thumbnail', url)
      toast.success('Image uploaded!')
    } catch (err) { toast.error(err.message || 'Upload failed') }
    setImageUploading(false); setImageProgress(0)
    if (imageRef.current) imageRef.current.value = ''
  }

  const handleVideoFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { toast.error('Please pick a video file'); return }
    if (file.size > 100 * 1024 * 1024) { toast.error('Video too large (max 100 MB)'); return }
    setVideoUploading(true); setVideoProgress(0)
    try {
      const url = await uploadToBlob(file, (p) => setVideoProgress(p))
      setField('videoUrl', url)
      // Auto-generate thumbnail from first frame if none yet
      if (!form.thumbnail) await tryGenerateThumb(file)
      toast.success('Video uploaded!')
    } catch (err) {
      toast.error('Video upload requires Vercel Blob. Open your Vercel dashboard → Storage → create a Blob store and connect it to this project. Then redeploy.')
    }
    setVideoUploading(false); setVideoProgress(0)
    if (videoRef.current) videoRef.current.value = ''
  }

  // Generate a thumbnail (data URL) from a video file's first frame
  const tryGenerateThumb = async (file) => {
    try {
      const url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.src = url; v.muted = true; v.playsInline = true; v.crossOrigin = 'anonymous'
      await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(rej, 5000) })
      v.currentTime = Math.min(1, (v.duration || 1) * 0.1)
      await new Promise((res) => { v.onseeked = res; setTimeout(res, 1500) })
      const canvas = document.createElement('canvas')
      canvas.width = v.videoWidth || 720
      canvas.height = v.videoHeight || 1280
      canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      URL.revokeObjectURL(url)
      setField('thumbnail', dataUrl)
    } catch {}
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
      if (editId) { await api(`/prompts/${editId}`, { method: 'PUT', body: JSON.stringify(payload) }); toast.success('Updated') }
      else { await api('/prompts', { method: 'POST', body: JSON.stringify(payload) }); toast.success('Created') }
      navigate('')
    } catch (e) { toast.error(e.message) }
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
          <Button size="sm" onClick={save} disabled={saving || imageUploading || videoUploading} className="rounded-full h-8 px-4">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (editId ? 'Save' : 'Publish')}
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24">
        <h1 className="font-serif-display text-3xl tracking-tight">{editId ? 'Edit prompt' : 'New prompt'}</h1>

        {/* Type */}
        <div>
          <Label>Type</Label>
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

        {/* VIDEO upload (only when type = video) */}
        {form.type === 'video' && (
          <div>
            <Label>Video</Label>
            <div className="mt-2 rounded-2xl border border-dashed border-neutral-300 p-3">
              {form.videoUrl ? (
                <div className="relative">
                  <video src={form.videoUrl} controls className="w-full max-h-72 rounded-xl bg-black" />
                  <button onClick={() => setField('videoUrl', '')} className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full p-1.5 hover:bg-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  <button type="button" onClick={() => videoRef.current?.click()} disabled={videoUploading}
                    className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition border border-neutral-200 disabled:opacity-50">
                    {videoUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-xs text-neutral-600">Uploading… {Math.round(videoProgress)}%</span>
                        <div className="w-full h-1 bg-neutral-200 rounded-full overflow-hidden">
                          <div className="h-full bg-neutral-900 transition-all" style={{ width: `${videoProgress}%` }} />
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-neutral-500" />
                        <span className="text-xs text-neutral-600">Upload video file</span>
                        <span className="text-[10px] text-neutral-400">max 100 MB · mp4/webm</span>
                      </>
                    )}
                  </button>
                  <div className="flex flex-col gap-2 justify-center">
                    <Label className="text-xs text-neutral-500">Or paste video URL</Label>
                    <Input placeholder="https://…/video.mp4" value={form.videoUrl} onChange={(e) => setField('videoUrl', e.target.value)} />
                  </div>
                </div>
              )}
              <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={handleVideoFile} />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Videos are uploaded directly to Vercel Blob (free 1 GB). Auto-thumbnail captured from first frame.
            </p>
          </div>
        )}

        {/* THUMBNAIL upload */}
        <div>
          <Label>{form.type === 'video' ? 'Thumbnail (cover for the video)' : 'Cover image'}</Label>
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
                      <span className="text-xs text-neutral-600">Uploading… {Math.round(imageProgress)}%</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-neutral-500" />
                      <span className="text-xs text-neutral-600">Upload image</span>
                      <span className="text-[10px] text-neutral-400">max 10 MB</span>
                    </>
                  )}
                </button>
                <div className="flex flex-col gap-2 justify-center">
                  <Label className="text-xs text-neutral-500">Or paste image URL</Label>
                  <Input placeholder="https://…" value={form.thumbnail} onChange={(e) => setField('thumbnail', e.target.value)} />
                </div>
              </div>
            )}
            <input ref={imageRef} type="file" accept="image/*" hidden onChange={handleImageFile} />
          </div>
        </div>

        {/* Title */}
        <div>
          <Label>Title</Label>
          <Input className="mt-2 h-11" placeholder="e.g. Cinematic foggy portrait"
            value={form.title} onChange={(e) => setField('title', e.target.value)} />
        </div>

        {/* Tools */}
        <div>
          <Label>Tools / Models</Label>
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

        {/* Prompt */}
        <div>
          <Label>Prompt text</Label>
          <Textarea className="mt-2 min-h-[140px]" placeholder="Paste the full prompt…"
            value={form.prompt} onChange={(e) => setField('prompt', e.target.value)} />
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

        {/* Flags */}
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

        <Button onClick={save} disabled={saving || imageUploading || videoUploading} className="w-full h-12 rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editId ? 'Save changes' : 'Publish prompt')}
        </Button>
      </div>
    </div>
  )
}

// ===========================================================================
// SETTINGS (social links)
// ===========================================================================
function SettingsView({ navigate }) {
  const [form, setForm] = useState({ whatsapp: '', telegram: '', instagram: '', youtube: '', twitter: '', tagline: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/settings')
      .then(s => setForm({ whatsapp: s.whatsapp || '', telegram: s.telegram || '', instagram: s.instagram || '', youtube: s.youtube || '', twitter: s.twitter || '', tagline: s.tagline || '' }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try { await api('/settings', { method: 'PUT', body: JSON.stringify(form) }); toast.success('Saved') }
    catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>

  const fields = [
    { key: 'whatsapp', label: 'WhatsApp Channel URL', placeholder: 'https://whatsapp.com/channel/…', icon: MessageCircle },
    { key: 'telegram', label: 'Telegram URL', placeholder: 'https://t.me/yourchannel', icon: Send },
    { key: 'instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/yourhandle', icon: Instagram },
    { key: 'youtube', label: 'YouTube URL', placeholder: 'https://youtube.com/@yourhandle', icon: Youtube },
    { key: 'twitter', label: 'X / Twitter URL', placeholder: 'https://x.com/yourhandle', icon: Twitter },
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
          <p className="text-sm text-neutral-500 mt-1">Your social channels show in the footer and on every prompt page. WhatsApp adds a floating chat button site-wide.</p>
        </div>

        <div>
          <Label>Tagline (footer)</Label>
          <Input className="mt-2 h-11" placeholder="Daily viral AI prompts. Made for creators."
            value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </div>

        {fields.map((f) => {
          const Icon = f.icon
          return (
            <div key={f.key}>
              <Label className="inline-flex items-center gap-2"><Icon className="w-3.5 h-3.5" /> {f.label}</Label>
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

function Label({ children, className }) {
  return <label className={cn('text-xs font-medium text-neutral-700 uppercase tracking-wider', className)}>{children}</label>
}

export default App
