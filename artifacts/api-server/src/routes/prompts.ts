import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb, isAuthed } from "../lib/mongo";

const router = Router();

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
    videoUrl: '',
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
      'Use ChatGPT 4o image generation or Gemini.',
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
      'Upload a reference selfie to Gemini or ChatGPT image edit.',
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
    videoUrl: '',
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
    videoUrl: '',
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
];

async function seedIfEmpty() {
  const database = await getDb();
  const guard = await database.collection('settings').findOne({ id: 'seed_lock' });
  if (guard) return 0;
  await database.collection('settings').insertOne({ id: 'seed_lock', seededAt: Date.now() });
  const count = await database.collection('prompts').countDocuments();
  if (count > 0) return 0;
  const now = Date.now();
  const docs = SEED_PROMPTS.map((p, i) => ({
    id: uuidv4(),
    ...p,
    videoUrl: (p as any).videoUrl || '',
    trending: [0, 2, 4, 7].includes(i),
    published: true,
    createdAt: now - i * 1000,
    updatedAt: now - i * 1000,
  }));
  await database.collection('prompts').insertMany(docs);
  return docs.length;
}

router.get('/prompts', async (req, res) => {
  try {
    await seedIfEmpty();
    const database = await getDb();
    const search = (String(req.query.search || '')).trim();
    const type = req.query.type as string;
    const tool = req.query.tool as string;
    const adminAll = req.query.all === '1' && (await isAuthed(req));

    const filter: Record<string, any> = {};
    if (!adminAll) filter.published = true;
    if (type && ['image', 'video'].includes(type)) filter.type = type;
    if (tool) filter.tools = tool;
    if (req.query.trending === '1') filter.trending = true;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { prompt: { $regex: search, $options: 'i' } },
        { tools: { $regex: search, $options: 'i' } },
      ];
    }
    const PAGE_SIZE = 16;
    const page = Math.max(0, parseInt(String(req.query.page || '0'), 10));
    const sort = req.query.trending === '1' ? { trending: -1, createdAt: -1 } : { createdAt: -1 };

    const [items, total] = await Promise.all([
      database.collection('prompts')
        .find(filter)
        .sort(sort as any)
        .skip(page * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray(),
      database.collection('prompts').countDocuments(filter),
    ]);

    const cleaned = items.map(({ _id, ...rest }) => rest);
    res.json({ items: cleaned, total, page, pageSize: PAGE_SIZE, hasMore: (page + 1) * PAGE_SIZE < total });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/prompts/:id', async (req, res) => {
  try {
    await seedIfEmpty();
    const database = await getDb();
    const doc = await database.collection('prompts').findOne({ id: req.params.id });
    if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
    const { _id, ...rest } = doc;
    if (!rest.published && !(await isAuthed(req))) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(rest);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/prompts', async (req, res) => {
  try {
    if (!(await isAuthed(req))) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const body = req.body;
    if (!body.title || !body.prompt) { res.status(400).json({ error: 'title and prompt are required' }); return; }
    const database = await getDb();
    const doc = {
      id: uuidv4(),
      title: String(body.title).trim(),
      type: body.type === 'video' ? 'video' : 'image',
      tools: Array.isArray(body.tools) ? body.tools : [],
      thumbnail: body.thumbnail || '',
      videoUrl: body.videoUrl || '',
      prompt: String(body.prompt),
      instructions: Array.isArray(body.instructions) ? body.instructions.filter(Boolean) : [],
      toolLinks: Array.isArray(body.toolLinks) ? body.toolLinks.filter((t: any) => t && t.name && t.url) : [],
      trending: !!body.trending,
      published: body.published !== false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await database.collection('prompts').insertOne(doc);
    const { _id, ...rest } = doc as any;
    res.json(rest);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/prompts/:id', async (req, res) => {
  try {
    if (!(await isAuthed(req))) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const database = await getDb();
    const body = req.body;
    const update: Record<string, any> = {};
    const fields = ['title', 'type', 'tools', 'thumbnail', 'videoUrl', 'prompt', 'instructions', 'toolLinks', 'published', 'trending'];
    for (const f of fields) if (f in body) update[f] = body[f];
    update.updatedAt = Date.now();
    const result = await database.collection('prompts').findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { returnDocument: 'after' }
    );
    const doc = result;
    if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
    const { _id, ...rest } = doc as any;
    res.json(rest);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/prompts/:id', async (req, res) => {
  try {
    if (!(await isAuthed(req))) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const database = await getDb();
    const r = await database.collection('prompts').deleteOne({ id: req.params.id });
    if (!r.deletedCount) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
