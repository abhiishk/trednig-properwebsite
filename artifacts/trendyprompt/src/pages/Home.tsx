'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Search, Copy, Check, ArrowLeft, X, Image as ImageIcon, Video,
  Sparkles, ExternalLink, Flame, Zap,
  MessageCircle, Send, Instagram, Twitter, Youtube, Volume2, VolumeX,
  Globe, ChevronLeft, ChevronRight, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TOOLS = ['ChatGPT', 'Gemini', 'Veo', 'Kling', 'Midjourney', 'Sora', 'Runway', 'Ideogram']
const TYPES = [
  { key: 'image', label: 'Images', icon: ImageIcon },
  { key: 'video', label: 'Videos', icon: Video },
]
const GENDERS = [
  { key: 'female', label: 'Girls', emoji: '👩' },
  { key: 'male', label: 'Boys', emoji: '👨' },
]
const SUGGESTIONS = ['cinematic', 'portrait', 'Veo', 'Kling reels', 'wallpaper', 'futuristic']

function getToken() { return localStorage.getItem('tp_token') }
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export async function api(path: string, opts: RequestInit & { headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const t = getToken()
  if (t) headers['Authorization'] = `Bearer ${t}`
  const res = await fetch(`${API_BASE}/api${path}`, { ...opts, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any).error || 'Request failed')
  return data
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true }
  catch { return false }
}

// Hash routing with URL path fallback for direct navigation (e.g. /trending, /p/:id)
function useHashRoute() {
  const [hash, setHash] = useState(typeof window !== 'undefined' ? window.location.hash : '')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  let parts: string[]
  const cleanHash = hash.replace(/^#\/?/, '')
  if (cleanHash) {
    // In-page hash navigation (#/p/:id, #/trending)
    parts = cleanHash.split('/').filter(Boolean)
  } else {
    // Direct URL path navigation (/trending, /p/:id)
    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    parts = path.replace(/^\//, '').split('/').filter(p => p && p !== import.meta.env.BASE_URL.replace(/\//g, ''))
  }

  return { hash, parts, navigate: (h: string) => { window.location.hash = h; window.scrollTo({ top: 0 }) } }
}

interface Prompt {
  id: string
  title: string
  type: 'image' | 'video'
  tools: string[]
  thumbnail: string
  videoUrl?: string
  prompt: string
  gender?: 'male' | 'female' | null
  images?: string[]
  instructions?: string[]
  toolLinks?: { name: string; url: string }[]
  trending?: boolean
  published?: boolean
}

interface Settings {
  whatsapp?: string
  telegram?: string
  instagram?: string
  youtube?: string
  twitter?: string
  tagline?: string
}

export default function AppRoot() {
  const { parts, navigate } = useHashRoute()

  let view = 'home'
  if (parts[0] === 'p' && parts[1]) view = 'detail'
  else if (parts[0] === 'trending') view = 'trending'

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {(view === 'home' || view === 'trending') && (
        <HomeView navigate={navigate} trendingOnly={view === 'trending'} />
      )}
      {view === 'detail' && <DetailView id={parts[1]} navigate={navigate} />}
    </main>
  )
}

function SiteHeader({ navigate, currentTab }: { navigate: (h: string) => void; currentTab: string }) {
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
          </nav>
        </div>
      </div>
    </header>
  )
}

function HomeView({ navigate, trendingOnly }: { navigate: (h: string) => void; trendingOnly: boolean }) {
  const [items, setItems] = useState<Prompt[] | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string | null>(null)
  const [tool, setTool] = useState<string | null>(null)
  const [gender, setGender] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(false)
  const pageRef = useRef(0)

  const buildQs = useCallback((pageNum: number) => {
    const qs = new URLSearchParams()
    if (search) qs.set('search', search)
    if (type) qs.set('type', type)
    if (tool) qs.set('tool', tool)
    if (gender) qs.set('gender', gender)
    if (trendingOnly) qs.set('trending', '1')
    qs.set('page', String(pageNum))
    return qs.toString()
  }, [search, type, tool, gender, trendingOnly])

  const load = useCallback(async () => {
    setItems(null)
    setPage(0)
    pageRef.current = 0
    setHasMore(false)
    hasMoreRef.current = false
    try {
      const data = await api(`/prompts?${buildQs(0)}`)
      setItems(data.items || [])
      setHasMore(!!data.hasMore)
      hasMoreRef.current = !!data.hasMore
      setTotal(data.total ?? 0)
    } catch (e: any) { toast.error(e.message); setItems([]) }
  }, [buildQs])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    const nextPage = pageRef.current + 1
    try {
      const data = await api(`/prompts?${buildQs(nextPage)}`)
      setItems(prev => [...(prev || []), ...(data.items || [])])
      setHasMore(!!data.hasMore)
      hasMoreRef.current = !!data.hasMore
      setPage(nextPage)
      pageRef.current = nextPage
    } catch (e: any) { toast.error(e.message) }
    loadingMoreRef.current = false
    setLoadingMore(false)
  }, [buildQs])

  // Infinite scroll — trigger loadMore when sentinel enters the viewport
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => { load() }, [type, tool, gender, trendingOnly])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [search])
  useEffect(() => { api('/settings').then(setSettings).catch(() => {}) }, [])

  const stats = useMemo(() => {
    if (!items) return null
    return { total, videos: items.filter(p => p.type === 'video').length, images: items.filter(p => p.type === 'image').length }
  }, [items, total])

  return (
    <div>
      <SiteHeader navigate={navigate} currentTab={trendingOnly ? 'trending' : 'home'} />

      <section className="relative overflow-hidden">
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

          {stats && (
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <Stat icon={Sparkles} label={`${stats.total} prompts`} />
              <Stat icon={ImageIcon} label={`${stats.images} images`} />
              <Stat icon={Video} label={`${stats.videos} videos`} />
              <Stat icon={Globe} label={`${TOOLS.length} AI tools`} />
            </div>
          )}

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
          {GENDERS.map((g) => {
            const active = gender === g.key
            return (
              <button key={g.key} onClick={() => setGender(active ? null : g.key)}
                className={cn('shrink-0 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-medium transition border',
                  active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300')}>
                <span>{g.emoji}</span> {g.label}
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

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {items === null ? <SkeletonGrid /> : items.length === 0 ? <EmptyState /> : (
          <>
            <div className="masonry">
              {items.map((p) => (
                <PromptCard key={p.id} prompt={p} onClick={() => navigate(`/p/${p.id}`)} />
              ))}
            </div>
            {/* Sentinel — IntersectionObserver watches this to trigger next page */}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="flex justify-center py-8">
                <span className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </section>

      <Footer settings={settings} />
      <FloatingWhatsapp settings={settings} />
    </div>
  )
}

function Stat({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
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

function PromptCard({ prompt, onClick }: { prompt: Prompt; onClick: () => void }) {
  const isVideo = prompt.type === 'video' && !!prompt.videoUrl
  const hasCarousel = !isVideo && (prompt.images?.length ?? 0) > 1
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(true)
  const [copied, setCopied] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIndex(i => (i - 1 + (prompt.images?.length ?? 1)) % (prompt.images?.length ?? 1))
  }
  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIndex(i => (i + 1) % (prompt.images?.length ?? 1))
  }

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

  const quickCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await copyText(prompt.prompt)
    if (ok) { setCopied(true); toast.success('Prompt copied!'); setTimeout(() => setCopied(false), 1500) }
    else toast.error('Copy failed')
  }

  const toggleMute = (e: React.MouseEvent) => {
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
      className="group relative w-full overflow-hidden rounded-2xl bg-neutral-100 cursor-pointer"
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
      ) : hasCarousel ? (
        <div className="relative overflow-hidden">
          <img
            src={prompt.images![imgIndex]}
            alt={prompt.title}
            loading="lazy"
            className="w-full h-auto object-cover block transition-opacity duration-300"
          />
          <button onClick={prevImg}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 grid place-items-center text-white backdrop-blur-sm">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextImg}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 grid place-items-center text-white backdrop-blur-sm">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
            {prompt.images!.map((_, di) => (
              <button key={di} onClick={(e) => { e.stopPropagation(); setImgIndex(di) }}
                className={cn('w-1.5 h-1.5 rounded-full transition', di === imgIndex ? 'bg-white' : 'bg-white/40')} />
            ))}
          </div>
        </div>
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

      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {isVideo && (
          <button
            onClick={toggleMute}
            className="grid place-items-center w-7 h-7 rounded-full bg-white/90 backdrop-blur hover:bg-white shadow-sm"
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
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

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

      {!isVideo && (
        <div className="sm:hidden px-1 pt-2 pb-1">
          <p className="text-xs font-medium line-clamp-2 text-neutral-800">{prompt.title}</p>
        </div>
      )}
    </div>
  )
}

function DetailView({ id, navigate }: { id: string; navigate: (h: string) => void }) {
  const [doc, setDoc] = useState<Prompt | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    let cancel = false
    setDoc(null); setError(null)
    api(`/prompts/${id}`).then(d => { if (!cancel) setDoc(d) }).catch(e => { if (!cancel) setError(e.message) })
    api('/settings').then(setSettings).catch(() => {})
    return () => { cancel = true }
  }, [id])

  const copy = async () => {
    if (!doc) return
    const ok = await copyText(doc.prompt)
    if (ok) { setCopied(true); toast.success('Prompt copied!'); setTimeout(() => setCopied(false), 1500) }
    else toast.error('Copy failed')
  }

  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <p className="text-sm text-neutral-500">{error}</p>
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
        <div className="rounded-2xl overflow-hidden bg-neutral-100">
          {isVideo ? (
            <video src={doc.videoUrl} poster={doc.thumbnail || undefined} controls autoPlay loop playsInline className="w-full h-auto" />
          ) : doc.thumbnail ? (
            <img src={doc.thumbnail} alt={doc.title} className="w-full h-auto" />
          ) : null}
        </div>

        <div className="mt-5">
          <h1 className="font-serif-display text-[30px] sm:text-[40px] leading-tight tracking-tight">{doc.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(doc.tools || []).map((t) => (
              <Badge key={t} variant="outline" className="rounded-full font-normal text-[11px]">{t}</Badge>
            ))}
          </div>
        </div>

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

        {doc.instructions && doc.instructions.length > 0 && (
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

        {doc.toolLinks && doc.toolLinks.length > 0 && (
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

        {settings && (settings.whatsapp || settings.telegram || settings.instagram) && (
          <section className="mt-8">
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium mb-3">Get more like this</p>
            <SocialButtons settings={settings} />
          </section>
        )}
      </article>

      <div className="sm:hidden fixed bottom-3 inset-x-3 z-30">
        <Button onClick={copy} className="w-full h-12 rounded-full shadow-xl">
          {copied ? <><Check className="w-4 h-4 mr-2" /> Copied</> : <><Copy className="w-4 h-4 mr-2" /> Copy prompt</>}
        </Button>
      </div>
      <FloatingWhatsapp settings={settings} />
    </div>
  )
}

const SOCIAL_BUTTONS = [
  { key: 'whatsapp', label: 'WhatsApp Channel', icon: MessageCircle, brand: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500' },
  { key: 'telegram', label: 'Telegram', icon: Send, brand: 'bg-sky-500 hover:bg-sky-600 text-white border-sky-500' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, brand: 'bg-gradient-to-r from-fuchsia-500 to-orange-500 hover:opacity-90 text-white border-transparent' },
  { key: 'youtube', label: 'YouTube', icon: Youtube, brand: 'bg-red-500 hover:bg-red-600 text-white border-red-500' },
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, brand: 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-900' },
]

function SocialButtons({ settings }: { settings: Settings }) {
  const links = SOCIAL_BUTTONS.filter(b => settings && (settings as any)[b.key])
  if (!links.length) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {links.map((b) => {
        const Icon = b.icon
        return (
          <a key={b.key} href={(settings as any)[b.key]} target="_blank" rel="noreferrer"
            className={cn('inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border transition', b.brand)}>
            <Icon className="w-4 h-4" />
            {b.label.split(' ')[0]}
          </a>
        )
      })}
    </div>
  )
}

function Footer({ settings }: { settings: Settings | null }) {
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
        {settings && SOCIAL_BUTTONS.some(b => (settings as any)[b.key]) && (
          <>
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-3">Join the channel</p>
            <SocialButtons settings={settings} />
          </>
        )}
        <div className="mt-7 pt-5 border-t border-neutral-100">
          <p className="text-[12px] text-neutral-500">
            Made with <span className="text-pink-500">&#9829;</span> by{' '}
            <span className="font-semibold text-neutral-900">Abhishek Sharma</span>
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">&copy; {new Date().getFullYear()} TrendyPrompt &middot; All rights reserved</p>
        </div>
      </div>
    </footer>
  )
}

function FloatingWhatsapp({ settings }: { settings: Settings | null }) {
  if (!settings?.whatsapp) return null
  return (
    <a href={settings.whatsapp} target="_blank" rel="noreferrer"
      className="fixed bottom-20 sm:bottom-5 right-4 z-40 group" title="Join WhatsApp channel">
      <div className="relative">
        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
        <div className="relative w-12 h-12 rounded-full bg-emerald-500 text-white grid place-items-center shadow-lg group-hover:scale-105 transition">
          <MessageCircle className="w-5 h-5" />
        </div>
      </div>
    </a>
  )
}
