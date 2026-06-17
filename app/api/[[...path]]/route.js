import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'trendyprompt'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'trendyprompt2025'

let client
let db
async function getDb() {
  if (db) return db
  client = new MongoClient(MONGO_URL)
  await client.connect()
  db = client.db(DB_NAME)
  await db.collection('prompts').createIndex({ createdAt: -1 }).catch(() => {})
  await db.collection('prompts').createIndex({ id: 1 }, { unique: true }).catch(() => {})
  return db
}

// Admin token store (in-memory; fine for MVP)
const tokens = new Set()
function issueToken() {
  const t = uuidv4()
  tokens.add(t)
  return t
}
function isAuthed(req) {
  const auth = req.headers.get('authorization') || ''
  const tok = auth.replace(/^Bearer\s+/i, '').trim()
  return tok && tokens.has(tok)
}

function json(data, init = {}) {
  return NextResponse.json(data, init)
}
function err(message, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

// Seed data
const SEED_PROMPTS = [
  {
    title: 'Floating Gentleman in the Sky',
    type: 'image',
    tools: ['ChatGPT', 'Midjourney'],
    thumbnail: 'https://images.unsplash.com/photo-1635243824676-e2f0f45a88e8?w=1200&q=80',
    prompt: 'A man in a vibrant orange suit floating midair above a quiet desert highway, cinematic 35mm film grain, golden hour, ultra-detailed, surreal yet hyper realistic, shot on Kodak Portra 400, shallow depth of field, dynamic motion.',
    instructions: [
      'Open ChatGPT and select the Image creation tool (or Midjourney).',
      'Paste the full prompt as is.',
      'For best results, add aspect ratio 4:5 or 9:16.',
      'Generate 4 variations and pick the most cinematic.',
      'Upscale your favorite and share on Instagram with #TrendyPrompt.'
    ],
    toolLinks: [
      { name: 'ChatGPT', url: 'https://chatgpt.com' },
      { name: 'Midjourney', url: 'https://midjourney.com' }
    ]
  },
  {
    title: 'Cinematic Rain-Soaked Portrait',
    type: 'image',
    tools: ['Midjourney', 'Gemini'],
    thumbnail: 'https://images.unsplash.com/photo-1652129950700-8517fe5d068d?w=1200&q=80',
    prompt: 'Dramatic cinematic portrait of a person standing in heavy rain, neon street reflections, moody teal and orange color grade, ultra realistic skin texture, shot on ARRI Alexa with 50mm lens, depth of field, volumetric lighting, 8k.',
    instructions: [
      'Use Midjourney v6 or Gemini Imagen.',
      'Paste the prompt and add --ar 4:5 --style raw.',
      'Try variations focused on lighting.',
      'Refine with /describe for similar looks.'
    ],
    toolLinks: [
      { name: 'Midjourney', url: 'https://midjourney.com' },
      { name: 'Gemini', url: 'https://gemini.google.com' }
    ]
  },
  {
    title: 'Veo 3 — Cinematic Forest Reveal',
    type: 'video',
    tools: ['Veo'],
    thumbnail: 'https://images.unsplash.com/photo-1633885274919-04b5af171f8c?w=1200&q=80',
    prompt: 'Slow dolly-in through a misty pine forest at dawn, beams of sunlight piercing fog, a lone figure walking away from the camera, cinematic anamorphic lens flare, 24fps film look, ambient ASMR forest sound, 8 second clip.',
    instructions: [
      'Open Google Veo 3 in Google AI Studio or Gemini.',
      'Paste the full prompt — Veo handles audio cues natively.',
      'Set duration to 8 seconds, aspect 16:9.',
      'Generate and pick the take with best lighting.'
    ],
    toolLinks: [{ name: 'Veo (Gemini)', url: 'https://gemini.google.com' }]
  },
  {
    title: 'Foggy Field Mystery (Cinematic)',
    type: 'image',
    tools: ['ChatGPT', 'Gemini'],
    thumbnail: 'https://images.unsplash.com/photo-1691828621407-c07af8339953?w=1200&q=80',
    prompt: 'A solitary silhouette walking through a vast foggy field at blue hour, ultra realistic, mysterious atmosphere, faint sun behind the fog, cinematic composition, low contrast film look, photographed on Hasselblad H6D, ISO 200.',
    instructions: [
      'Use ChatGPT 4o image generation or Gemini Nano Banana.',
      'Paste prompt, request 4:5 ratio.',
      'Ask for variations with different times of day.'
    ],
    toolLinks: [
      { name: 'ChatGPT', url: 'https://chatgpt.com' },
      { name: 'Gemini', url: 'https://gemini.google.com' }
    ]
  },
  {
    title: 'Hyper-Vivid AI Self Portrait',
    type: 'image',
    tools: ['Gemini', 'ChatGPT'],
    thumbnail: 'https://images.unsplash.com/photo-1655834648155-f7a98ff3c49d?w=1200&q=80',
    prompt: 'Hyper-vivid AI self portrait, neon magenta and cyan rim lighting on the face, sharp focus on the eyes, painterly background with abstract brush strokes, fashion editorial vibe, 85mm lens, f/1.4, ultra high detail.',
    instructions: [
      'Upload a reference selfie to Gemini Nano Banana or ChatGPT image edit.',
      'Paste this prompt as the edit instruction.',
      'Iterate 2-3 times for the most striking lighting.'
    ],
    toolLinks: [
      { name: 'Gemini', url: 'https://gemini.google.com' },
      { name: 'ChatGPT', url: 'https://chatgpt.com' }
    ]
  },
  {
    title: 'Kling — Urban Mirror Symmetry Loop',
    type: 'video',
    tools: ['Kling'],
    thumbnail: 'https://images.unsplash.com/photo-1752989336995-9c1f999c7361?w=1200&q=80',
    prompt: 'A perfectly symmetric urban architecture push-in, mirrored modernist building, smooth dolly forward, subtle bokeh, looping motion, dramatic lighting, 5 second seamless loop, 9:16 vertical.',
    instructions: [
      'Open Kling AI and choose Text-to-Video.',
      'Paste this prompt, set aspect 9:16, duration 5s.',
      'Enable Motion Brush if needed for stability.',
      'Export and post as a Reels/Short.'
    ],
    toolLinks: [{ name: 'Kling AI', url: 'https://klingai.com' }]
  },
  {
    title: 'Abstract Pastel Shapes (Wallpaper)',
    type: 'image',
    tools: ['ChatGPT', 'Midjourney'],
    thumbnail: 'https://images.unsplash.com/photo-1752989408615-02e3a16c68c5?w=1200&q=80',
    prompt: 'Minimal abstract composition of overlapping pastel geometric shapes, soft gradients, paper-cut texture, calm color palette of cream beige sage and dusty pink, designed as a phone wallpaper, 9:19.5 ratio.',
    instructions: [
      'Use Midjourney v6 or ChatGPT.',
      'Paste prompt and request 9:19.5 ratio.',
      'Save the best variation as your wallpaper.'
    ],
    toolLinks: [
      { name: 'ChatGPT', url: 'https://chatgpt.com' },
      { name: 'Midjourney', url: 'https://midjourney.com' }
    ]
  },
  {
    title: 'Sora — Futuristic Mirror City Flythrough',
    type: 'video',
    tools: ['Sora', 'Veo'],
    thumbnail: 'https://images.unsplash.com/photo-1752989457599-aedd8e27b83d?w=1200&q=80',
    prompt: 'A drone flythrough between futuristic mirrored skyscrapers at sunset, golden reflections, smooth camera glide, soft volumetric haze, 10 second cinematic shot, anamorphic lens, color graded teal and orange.',
    instructions: [
      'Open Sora (OpenAI) or Veo 3 (Google).',
      'Paste full prompt, set duration 10s, aspect 16:9.',
      'Generate 2-3 takes and pick the smoothest.'
    ],
    toolLinks: [
      { name: 'Sora', url: 'https://sora.com' },
      { name: 'Veo', url: 'https://gemini.google.com' }
    ]
  }
]

async function seedIfEmpty() {
  const database = await getDb()
  const count = await database.collection('prompts').countDocuments()
  if (count === 0) {
    const now = Date.now()
    const docs = SEED_PROMPTS.map((p, i) => ({
      id: uuidv4(),
      ...p,
      published: true,
      createdAt: now - i * 1000,
      updatedAt: now - i * 1000,
    }))
    await database.collection('prompts').insertMany(docs)
    return docs.length
  }
  return 0
}

export async function GET(req, ctx) {
  try {
    const params = await ctx.params
    const path = params?.path || []
    const url = new URL(req.url)

    // Auto-seed on first read
    await seedIfEmpty()
    const database = await getDb()

    if (path.length === 0 || path[0] === '') {
      return json({ ok: true, service: 'TrendyPrompt API' })
    }

    if (path[0] === 'prompts' && path.length === 1) {
      const search = (url.searchParams.get('search') || '').trim()
      const type = url.searchParams.get('type') // image | video
      const tool = url.searchParams.get('tool')
      const adminAll = url.searchParams.get('all') === '1' && isAuthed(req)

      const filter = {}
      if (!adminAll) filter.published = true
      if (type && ['image', 'video'].includes(type)) filter.type = type
      if (tool) filter.tools = tool
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { prompt: { $regex: search, $options: 'i' } },
          { tools: { $regex: search, $options: 'i' } },
        ]
      }
      const items = await database.collection('prompts')
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray()
      const cleaned = items.map(({ _id, ...rest }) => rest)
      return json({ items: cleaned })
    }

    if (path[0] === 'prompts' && path.length === 2) {
      const id = path[1]
      const doc = await database.collection('prompts').findOne({ id })
      if (!doc) return err('Not found', 404)
      const { _id, ...rest } = doc
      if (!rest.published && !isAuthed(req)) return err('Not found', 404)
      return json(rest)
    }

    if (path[0] === 'admin' && path[1] === 'check') {
      return json({ authed: isAuthed(req) })
    }

    return err('Not found', 404)
  } catch (e) {
    console.error(e)
    return err('Server error: ' + e.message, 500)
  }
}

export async function POST(req, ctx) {
  try {
    const params = await ctx.params
    const path = params?.path || []
    const database = await getDb()

    // Admin login
    if (path[0] === 'admin' && path[1] === 'login') {
      const body = await req.json().catch(() => ({}))
      if (!body.password || body.password !== ADMIN_PASSWORD) {
        return err('Invalid password', 401)
      }
      const token = issueToken()
      return json({ token })
    }

    // Create prompt (admin)
    if (path[0] === 'prompts' && path.length === 1) {
      if (!isAuthed(req)) return err('Unauthorized', 401)
      const body = await req.json().catch(() => ({}))
      if (!body.title || !body.prompt) return err('title and prompt are required')
      const doc = {
        id: uuidv4(),
        title: String(body.title).trim(),
        type: body.type === 'video' ? 'video' : 'image',
        tools: Array.isArray(body.tools) ? body.tools : [],
        thumbnail: body.thumbnail || '',
        prompt: String(body.prompt),
        instructions: Array.isArray(body.instructions) ? body.instructions.filter(Boolean) : [],
        toolLinks: Array.isArray(body.toolLinks) ? body.toolLinks.filter(t => t && t.name && t.url) : [],
        published: body.published !== false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await database.collection('prompts').insertOne(doc)
      const { _id, ...rest } = doc
      return json(rest)
    }

    return err('Not found', 404)
  } catch (e) {
    console.error(e)
    return err('Server error: ' + e.message, 500)
  }
}

export async function PUT(req, ctx) {
  try {
    const params = await ctx.params
    const path = params?.path || []
    const database = await getDb()
    if (!isAuthed(req)) return err('Unauthorized', 401)

    if (path[0] === 'prompts' && path.length === 2) {
      const id = path[1]
      const body = await req.json().catch(() => ({}))
      const update = {}
      const fields = ['title', 'type', 'tools', 'thumbnail', 'prompt', 'instructions', 'toolLinks', 'published']
      for (const f of fields) if (f in body) update[f] = body[f]
      update.updatedAt = Date.now()
      const res = await database.collection('prompts').findOneAndUpdate(
        { id },
        { $set: update },
        { returnDocument: 'after' }
      )
      const doc = res?.value || res // mongo driver variations
      if (!doc) return err('Not found', 404)
      const { _id, ...rest } = doc
      return json(rest)
    }
    return err('Not found', 404)
  } catch (e) {
    console.error(e)
    return err('Server error: ' + e.message, 500)
  }
}

export async function DELETE(req, ctx) {
  try {
    const params = await ctx.params
    const path = params?.path || []
    const database = await getDb()
    if (!isAuthed(req)) return err('Unauthorized', 401)

    if (path[0] === 'prompts' && path.length === 2) {
      const id = path[1]
      const r = await database.collection('prompts').deleteOne({ id })
      if (!r.deletedCount) return err('Not found', 404)
      return json({ ok: true })
    }
    return err('Not found', 404)
  } catch (e) {
    console.error(e)
    return err('Server error: ' + e.message, 500)
  }
}
