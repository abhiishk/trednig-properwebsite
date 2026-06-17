'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Search, Copy, Check, ArrowLeft, X, Image as ImageIcon, Video,
  Sparkles, ExternalLink, Plus, Trash2, Pencil, LogOut, Lock,
  Upload, Loader2, Eye, EyeOff, Flame, Zap, TrendingUp,
  MessageCircle, Send, Instagram, Twitter, Youtube, Volume2, VolumeX,
  Play, Settings, Globe,
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
const SUGGESTIONS = ['cinematic', 'portrait', 'Veo', 'Kling reels', 'wallpaper', 'futuristic']

// --- Hash routing ----------------------------------------------------------
function useHashRoute() {
  const [hash, setHash] = useState(typeof window !== 'undefined' ? window.location.hash : '')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const parts = (hash.replace(/^#\/?/, '')).split('/').filter(Boolean)
  return { hash, parts, navigate: (h) => { window.location.hash = h; window.scrollTo({ top: 0 }) } }
}

// --- Token helpers --------------------------------------------------------
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

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true }
  catch { return false }
}

// ===========================================================================
// APP
// ===========================================================================
const App = () => {
  const { parts, navigate } = useHashRoute()

  let view = 'home'
  if (parts[0] === 'p' && parts[1]) view = 'detail'
  else if (parts[0] === 'trending') view = 'trending'
  else if (parts[0] === 'admin') {
    if (parts[1] === 'new') view = 'admin-new'
    else if (parts[1] === 'edit' && parts[2]) view = 'admin-edit'
    else if (parts[1] === 'settings') view = 'admin-settings'
    else view = 'admin'
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {(view === 'home' || view === 'trending') && (
        <HomeView navigate={navigate} trendingOnly={view === 'trending'} />
      )}
      {view === 'detail' && <DetailView id={parts[1]} navigate={navigate} />}
      {view === 'admin' && <AdminView navigate={navigate} />}
      {view === 'admin-new' && <AdminEditor navigate={navigate} />}
      {view === 'admin-edit' && <AdminEditor navigate={navigate} editId={parts[2]} />}
      {view === 'admin-settings' && <AdminSettings navigate={navigate} />}
    </main>
  )
}

// ===========================================================================
// HEADER
// ===========================================================================
function SiteHeader({ navigate, currentTab }) {
  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <button onClick={() => navigate('')} className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-500 text-white grid place-items-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-tight text-[15px]">TrendyPrompt</span>
          </button>
          <nav className="flex items-center gap-1">
            <button
              onClick={() => navigate('')}
              className={cn('px-3 h-8 rounded-full text-xs font-medium transition',
                currentTab === 'home' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100')}
            >
              Discover
            </button>
            <button
              onClick={() => navigate('/trending')}
              className={cn('px-3 h-8 rounded-full text-xs font-medium transition inline-flex items-center gap-1',
                currentTab === 'trending' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100')}
            >
              <Flame className={cn('w-3.5 h-3.5', currentTab !== 'trending' && 'text-orange-500')} />
              Trending
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="ml-1 p-2 text-neutral-400 hover:text-neutral-700"
              aria-label="Admin"
              title="Admin"
            >
              <Lock className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}

// ===========================================================================
// HOME / TRENDING
// ===========================================================================
function HomeView({ navigate, trendingOnly }) {
  const [items, setItems] = useState(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState(null)
  const [tool, setTool] = useState(null)
  const [settings, setSettings] = useState(null)

  const load = useCallback(async () => {
    setItems(null)
    const qs = new URLSearchParams()
    if (search) qs.set('search', search)
    if (type) qs.set('type', type)
    if (tool) qs.set('tool', tool)
    if (trendingOnly) qs.set('trending', '1')
    try {
      const data = await api(`/prompts?${qs.toString()}`)
      setItems(data.items || [])
    } catch (e) { toast.error(e.message); setItems([]) }
  }, [search, type, tool, trendingOnly])

  useEffect(() => { load() }, [type, tool, trendingOnly])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [search])

  useEffect(() => { api('/settings').then(setSettings).catch(() => {}) }, [])

  const stats = useMemo(() => {
    if (!items) return null
    const total = items.length
    const videos = items.filter(p => p.type === 'video').length
    return { total, videos, images: total - videos }
  }, [items])

  return (
    <div>
      <SiteHeader navigate={navigate} currentTab={trendingOnly ? 'trending' : 'home'} />

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Background gradient blobs */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-fuchsia-200/40 rounded-full blur-3xl" />
          <div className="absolute -top-10 right-0 w-72 h-72 bg-orange-200/40 rounded-full blur-3xl" />
          <div className="absolute top-40 left-1/3 w-60 h-60 bg-cyan-200/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
          <div className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-neutral-900 text-white text-[11px] font-medium mb-4">
            <Zap className="w-3 h-3 text-yellow-300" />
            New prompts added weekly
          </div>

          {trendingOnly ? (
            <h1 className="font-serif-display text-[40px] sm:text-[64px] leading-[1.02] tracking-tight">
              <span className="inline-flex items-center gap-2">
                <Flame className="w-9 h-9 sm:w-12 sm:h-12 text-orange-500" />
                <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-fuchsia-600 bg-clip-text text-transparent">
                  Trending now.
                </span>
              </span>
              <br />
              <span className="text-neutral-400">The prompts going viral this week.</span>
            </h1>
          ) : (
            <h1 className="font-serif-display text-[42px] sm:text-[72px] leading-[0.98] tracking-tight">
              Viral AI prompts
              <br />
              <span className="bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                that actually slap.
              </span>
            </h1>
          )}

          <p className="text-[15px] sm:text-lg text-neutral-600 mt-4 max-w-xl">
            {trendingOnly
              ? 'The hottest image and video prompts everyone is remixing right now.'
              : 'Hand-picked prompts for ChatGPT, Gemini, Veo, Kling, Midjourney & Sora. Copy. Paste. Post. Go viral.'}
          </p>

          {/* Quick stats */}
          {stats && (
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <Stat icon={Sparkles} label={`${stats.total} prompts`} />
              <Stat icon={ImageIcon} label={`${stats.images} images`} />
              <Stat icon={Video} label={`${stats.videos} videos`} />
              <Stat icon={Globe} label={`${TOOLS.length} AI tools`} />
            </div>
          )}

          {/* Search */}
          <div className="mt-6 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a vibe, model or style…"
                className="pl-11 pr-11 h-12 rounded-2xl border-neutral-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-neutral-900"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {!search && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="text-xs text-neutral-400 mr-1 self-center">Try:</span>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSearch(s)}
                    className="text-xs px-2.5 h-7 rounded-full bg-white/80 border border-neutral-200 hover:border-neutral-400 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-14 z-20 bg-white/85 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {TYPES.map((t) => {
            const Icon = t.icon
            const active = type === t.key
            return (
              <button key={t.key} onClick={() => setType(active ? null : t.key)}
                className={cn('shrink-0 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-medium transition border',
                  active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300')}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            )
          })}
          <div className="w-px self-stretch bg-neutral-200 mx-1" />
          {TOOLS.map((tn) => {
            const active = tool === tn
            return (
              <button key={tn} onClick={() => setTool(active ? null : tn)}
                className={cn('shrink-0 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-medium transition border',
                  active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300')}>
                {tn}
              </button>
            )
          })}
          {(type || tool || search) && (
            <button onClick={() => { setType(null); setTool(null); setSearch('') }}
              className="shrink-0 inline-flex items-center gap-1 px-3 h-8 rounded-full text-xs text-neutral-500 hover:text-neutral-900">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {items === null ? <SkeletonGrid /> : items.length === 0 ? <EmptyState /> : (
          <div className="masonry">
            {items.map((p) => (
              <PromptCard key={p.id} prompt={p} onClick={() => navigate(`/p/${p.id}`)} />
            ))}
          </div>
        )}
      </section>

      <Footer settings={settings} />
      <FloatingWhatsapp settings={settings} />
    </div>
  )
}

function Stat({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-white/70 border border-neutral-200 text-neutral-700">
      <Icon className="w-3.5 h-3.5 text-neutral-400" />
      {label}
    </span>
  )
}

function SkeletonGrid() {
  const heights = [220, 320, 260, 360, 240, 300, 280, 340]
  return (
    <div className="masonry">
      {heights.map((h, i) => <div key={i} className="shimmer rounded-2xl" style={{ height: h }} />)}
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

// ===========================================================================
// CARD with hover/in-view video preview + quick copy
// ===========================================================================
function PromptCard({ prompt, onClick }) {
  const isVideo = prompt.type === 'video' && !!prompt.videoUrl
  const videoRef = useRef(null)
  const cardRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [copied, setCopied] = useState(false)

  // Autoplay when in viewport (mobile-friendly)
  useEffect(() => {
    if (!isVideo) return
    const el = cardRef.current
    const v = videoRef.current
    if (!el || !v) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
          v.play().catch(() => {})
        } else {
          v.pause()
        }
      },
      { threshold: [0, 0.55, 1] }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [isVideo])

  const onMouseEnter = () => { if (isVideo && videoRef.current) videoRef.current.play().catch(() => {}) }
  const onMouseLeave = () => { if (isVideo && videoRef.current) videoRef.current.pause() }

  const quickCopy = async (e) => {
    e.stopPropagation()
    const ok = await copyText(prompt.prompt)
    if (ok) { setCopied(true); toast.success('Prompt copied!'); setTimeout(() => setCopied(false), 1500) }
    else toast.error('Copy failed')
  }

  const toggleMute = (e) => {
    e.stopPropagation()
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setMuted(videoRef.current.muted)
    if (!videoRef.current.muted) videoRef.current.play().catch(() => {})
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="group relative w-full overflow-hidden rounded-2xl bg-neutral-100 glow-ring cursor-pointer"
      onClick={onClick}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={prompt.videoUrl}
          poster={prompt.thumbnail || undefined}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          className="w-full h-auto object-cover block"
        />
      ) : prompt.thumbnail ? (
        <img
          src={prompt.thumbnail}
          alt={prompt.title}
          loading="lazy"
          className="w-full h-auto object-cover block transition duration-500 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="aspect-[3/4] grid place-items-center text-neutral-300">
          <ImageIcon className="w-8 h-8" />
        </div>
      )}

      {/* Top-left badges */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-white/90 backdrop-blur text-[10px] font-medium text-neutral-800">
          {prompt.type === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
          {prompt.type === 'video' ? 'Video' : 'Image'}
        </span>
        {prompt.trending && (
          <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] font-semibold">
            <Flame className="w-3 h-3" /> Trending
          </span>
        )}
      </div>

      {/* Top-right: speaker (video only) + quick copy */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {isVideo && (
          <button
            onClick={toggleMute}
            className="grid place-items-center w-7 h-7 rounded-full bg-white/90 backdrop-blur hover:bg-white shadow-sm"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-neutral-700" /> : <Volume2 className="w-3.5 h-3.5 text-neutral-900" />}
          </button>
        )}
        <button
          onClick={quickCopy}
          className={cn(
            'grid place-items-center w-7 h-7 rounded-full backdrop-blur shadow-sm transition',
            copied ? 'bg-emerald-500 text-white' : 'bg-white/90 hover:bg-white text-neutral-700'
          )}
          title="Copy prompt"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Bottom overlay */}
      <div className={cn(
        'absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition',
        isVideo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        <p className="text-white text-sm font-medium line-clamp-2 drop-shadow">{prompt.title}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {(prompt.tools || []).slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] text-white/95 bg-white/15 backdrop-blur px-1.5 py-0.5 rounded">{t}</span>
          ))}
        </div>
      </div>

      {/* Mobile-visible title for images */}
      {!isVideo && (
        <div className="sm:hidden px-1 pt-2 pb-1">
          <p className="text-xs font-medium line-clamp-2 text-neutral-800">{prompt.title}</p>
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// DETAIL
// ===========================================================================
function DetailView({ id, navigate }) {
  const [doc, setDoc] = useState(null)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState(null)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    let cancel = false
    setDoc(null); setErr(null)
    api(`/prompts/${id}`).then(d => { if (!cancel) setDoc(d) }).catch(e => { if (!cancel) setErr(e.message) })
    api('/settings').then(setSettings).catch(() => {})
    return () => { cancel = true }
  }, [id])

  const copy = async () => {
    const ok = await copyText(doc.prompt)
    if (ok) { setCopied(true); toast.success('Prompt copied!'); setTimeout(() => setCopied(false), 1500) }
    else toast.error('Copy failed')
  }

  if (err) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <p className="text-sm text-neutral-500">{err}</p>
      <Button variant="outline" onClick={() => navigate('')} className="mt-4">Back</Button>
    </div>
  )

  if (!doc) return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="shimmer h-7 w-28 rounded mb-4" />
      <div className="shimmer rounded-2xl h-[60vh]" />
    </div>
  )

  const isVideo = doc.type === 'video' && !!doc.videoUrl

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-neutral-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate('')} className="inline-flex items-center gap-1 text-sm text-neutral-700 hover:text-neutral-900">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            {doc.trending && (
              <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0 font-normal">
                <Flame className="w-3 h-3 mr-1" /> Trending
              </Badge>
            )}
            <Badge variant="secondary" className="font-normal">{doc.type === 'video' ? 'Video' : 'Image'}</Badge>
          </div>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-4">
        {/* Hero media */}
        <div className="rounded-2xl overflow-hidden bg-neutral-100 glow-ring">
          {isVideo ? (
            <video
              src={doc.videoUrl}
              poster={doc.thumbnail || undefined}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-auto"
            />
          ) : doc.thumbnail ? (
            <img src={doc.thumbnail} alt={doc.title} className="w-full h-auto" />
          ) : null}
        </div>

        {/* Title */}
        <div className="mt-5">
          <h1 className="font-serif-display text-[30px] sm:text-[40px] leading-tight tracking-tight">{doc.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(doc.tools || []).map((t) => (
              <Badge key={t} variant="outline" className="rounded-full font-normal text-[11px]">{t}</Badge>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">The Prompt</p>
            <Button size="sm" onClick={copy} className="h-8 rounded-full px-3.5">
              {copied ? <><Check className="w-3.5 h-3.5 mr-1" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>}
            </Button>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-800">{doc.prompt}</p>
          </div>
        </section>

        {/* Instructions */}
        {doc.instructions?.length > 0 && (
          <section className="mt-7">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium mb-3">Step-by-step</p>
            <ol className="space-y-2.5">
              {doc.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-neutral-900 text-white text-[11px] font-semibold grid place-items-center">{i + 1}</span>
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
                <a key={i} href={tl.url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition">
                  <span className="text-sm font-medium">{tl.name}</span>
                  <ExternalLink className="w-4 h-4 text-neutral-400" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Share / join channels */}
        {settings && (settings.whatsapp || settings.telegram || settings.instagram) && (
          <section className="mt-8">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium mb-3">Get more like this</p>
            <SocialButtons settings={settings} />
          </section>
        )}
      </article>

      {/* Sticky bottom copy on mobile */}
      <div className="sm:hidden fixed bottom-3 inset-x-3 z-30">
        <Button onClick={copy} className="w-full h-12 rounded-full shadow-xl">
          {copied ? <><Check className="w-4 h-4 mr-2" /> Copied</> : <><Copy className="w-4 h-4 mr-2" /> Copy prompt</>}
        </Button>
      </div>
      <FloatingWhatsapp settings={settings} />
    </div>
  )
}

// ===========================================================================
// SOCIAL / FOOTER
// ===========================================================================
const SOCIAL_BUTTONS = [
  { key: 'whatsapp', label: 'WhatsApp Channel', icon: MessageCircle, brand: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500' },
  { key: 'telegram', label: 'Telegram', icon: Send, brand: 'bg-sky-500 hover:bg-sky-600 text-white border-sky-500' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, brand: 'bg-gradient-to-r from-fuchsia-500 to-orange-500 hover:opacity-90 text-white border-transparent' },
  { key: 'youtube', label: 'YouTube', icon: Youtube, brand: 'bg-red-500 hover:bg-red-600 text-white border-red-500' },
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, brand: 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-900' },
]

function SocialButtons({ settings }) {
  const links = SOCIAL_BUTTONS.filter(b => settings && settings[b.key])
  if (!links.length) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {links.map((b) => {
        const Icon = b.icon
        return (
          <a
            key={b.key}
            href={settings[b.key]}
            target="_blank"
            rel="noreferrer"
            className={cn('inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border transition', b.brand)}
          >
            <Icon className="w-4 h-4" />
            {b.label.split(' ')[0]}
          </a>
        )
      })}
    </div>
  )
}

function Footer({ settings }) {
  return (
    <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-10 mt-10 border-t border-neutral-100">
      <div className="text-center max-w-md mx-auto">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-500 grid place-items-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold tracking-tight">TrendyPrompt</span>
        </div>
        {settings?.tagline ? (
          <p className="text-sm text-neutral-500 mb-5">{settings.tagline}</p>
        ) : (
          <p className="text-sm text-neutral-500 mb-5">Daily viral AI prompts. Made for creators.</p>
        )}
        {settings && SOCIAL_BUTTONS.some(b => settings[b.key]) && (
          <>
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-3">Join the channel</p>
            <SocialButtons settings={settings} />
          </>
        )}
        <p className="text-[11px] text-neutral-400 mt-6">© {new Date().getFullYear()} TrendyPrompt</p>
      </div>
    </footer>
  )
}

function FloatingWhatsapp({ settings }) {
  if (!settings?.whatsapp) return null
  return (
    <a
      href={settings.whatsapp}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-20 sm:bottom-5 right-4 z-40 group"
      title="Join WhatsApp channel"
    >
      <div className="relative">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
        <div className="relative w-12 h-12 rounded-full bg-emerald-500 text-white grid place-items-center shadow-lg group-hover:scale-105 transition">
          <MessageCircle className="w-5 h-5" />
        </div>
      </div>
    </a>
  )
}

// ===========================================================================
// ADMIN DASHBOARD
// ===========================================================================
function AdminView({ navigate }) {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [items, setItems] = useState(null)

  useEffect(() => {
    (async () => {
      if (!getToken()) { setChecking(false); return }
      try { const r = await api('/admin/check'); setAuthed(r.authed) } catch { setAuthed(false) }
      setChecking(false)
    })()
  }, [])

  const loadAll = async () => {
    try { const data = await api('/prompts?all=1'); setItems(data.items || []) }
    catch (e) { toast.error(e.message) }
  }
  useEffect(() => { if (authed) loadAll() }, [authed])

  if (checking) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} navigate={navigate} />

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
          <button onClick={() => navigate('')} className="inline-flex items-center gap-1 text-sm text-neutral-700">
            <ArrowLeft className="w-4 h-4" /> Site
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin/settings')} className="p-2 text-neutral-500 hover:text-neutral-900" title="Settings">
              <Settings className="w-4 h-4" />
            </button>
            <Button size="sm" onClick={() => navigate('/admin/new')} className="rounded-full h-8 px-3">
              <Plus className="w-3.5 h-3.5 mr-1" /> New post
            </Button>
            <button onClick={() => { setToken(null); setAuthed(false) }} className="text-neutral-400 hover:text-neutral-700" title="Logout">
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
              <button onClick={() => navigate(`/admin/edit/${p.id}`)} className="p-2 rounded-lg text-neutral-700 hover:bg-neutral-100" title="Edit">
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

function AdminLogin({ onSuccess, navigate }) {
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
// ADMIN EDITOR
// ===========================================================================
function AdminEditor({ navigate, editId }) {
  const [form, setForm] = useState({
    title: '', type: 'image', tools: [], thumbnail: '', videoUrl: '',
    prompt: '', instructions: [''], toolLinks: [{ name: '', url: '' }],
    published: true, trending: false,
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
        videoUrl: d.videoUrl || '',
        prompt: d.prompt || '',
        instructions: d.instructions?.length ? d.instructions : [''],
        toolLinks: d.toolLinks?.length ? d.toolLinks : [{ name: '', url: '' }],
        published: d.published !== false,
        trending: !!d.trending,
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

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { toast.error('Image too large (max 4MB). Use a URL instead.'); return }
    setUploading(true)
    try { const dataUrl = await fileToDataUrl(file); setField('thumbnail', dataUrl) }
    catch { toast.error('Failed to read image') }
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
      if (editId) { await api(`/prompts/${editId}`, { method: 'PUT', body: JSON.stringify(payload) }); toast.success('Updated') }
      else { await api('/prompts', { method: 'POST', body: JSON.stringify(payload) }); toast.success('Created') }
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
          <Label>Thumbnail (cover image)</Label>
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
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition border border-neutral-200">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-neutral-500" />}
                  <span className="text-xs text-neutral-600">Upload image</span>
                  <span className="text-[10px] text-neutral-400">max 4 MB</span>
                </button>
                <div className="flex flex-col gap-2 justify-center">
                  <Label className="text-xs text-neutral-500">Or paste image URL</Label>
                  <Input placeholder="https://…" value={form.thumbnail} onChange={(e) => setField('thumbnail', e.target.value)} />
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
          </div>
        </div>

        {/* Title */}
        <div>
          <Label>Title</Label>
          <Input className="mt-2 h-11" placeholder="e.g. Cinematic foggy portrait"
            value={form.title} onChange={(e) => setField('title', e.target.value)} />
        </div>

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

        {/* Video URL — only when type is video */}
        {form.type === 'video' && (
          <div>
            <Label>Video URL (MP4 / direct link)</Label>
            <Input className="mt-2 h-11" placeholder="https://…/yourclip.mp4"
              value={form.videoUrl} onChange={(e) => setField('videoUrl', e.target.value)} />
            <p className="text-[11px] text-neutral-500 mt-1">
              Direct MP4 link. The video will autoplay (muted) on cards with sound when users tap unmute. Tip: host on a free CDN like Cloudflare R2, Vercel Blob, or any free MP4 host.
            </p>
          </div>
        )}

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

        <Button onClick={save} disabled={saving} className="w-full h-12 rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editId ? 'Save changes' : 'Publish prompt')}
        </Button>
      </div>
    </div>
  )
}

// ===========================================================================
// ADMIN SETTINGS (social links)
// ===========================================================================
function AdminSettings({ navigate }) {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [form, setForm] = useState({ whatsapp: '', telegram: '', instagram: '', youtube: '', twitter: '', tagline: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      if (!getToken()) { setChecking(false); return }
      try { const r = await api('/admin/check'); setAuthed(r.authed) } catch {}
      try { const s = await api('/settings'); setForm({ whatsapp: s.whatsapp || '', telegram: s.telegram || '', instagram: s.instagram || '', youtube: s.youtube || '', twitter: s.twitter || '', tagline: s.tagline || '' }) } catch {}
      setChecking(false)
    })()
  }, [])

  if (checking) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} navigate={navigate} />

  const save = async () => {
    setSaving(true)
    try { await api('/settings', { method: 'PUT', body: JSON.stringify(form) }); toast.success('Saved') }
    catch (e) { toast.error(e.message) }
    setSaving(false)
  }

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
          <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-1 text-sm text-neutral-700">
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
