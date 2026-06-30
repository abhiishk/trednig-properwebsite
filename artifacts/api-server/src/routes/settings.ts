import { Router } from "express";
import { getDb, isAuthed } from "../lib/mongo";

const router = Router();

router.get('/settings', async (_req, res) => {
  try {
    const database = await getDb();
    const doc = await database.collection('settings').findOne({ id: 'social' });
    const defaults = { id: 'social', whatsapp: '', telegram: '', instagram: '', youtube: '', twitter: '', tagline: '' };
    const { _id, ...rest } = (doc || defaults) as any;
    res.json(rest);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    if (!(await isAuthed(req))) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const database = await getDb();
    const body = req.body;
    const allowed = ['whatsapp', 'telegram', 'instagram', 'youtube', 'twitter', 'tagline'];
    const update: Record<string, any> = { id: 'social', updatedAt: Date.now() };
    for (const f of allowed) if (f in body) update[f] = String(body[f] || '');
    await database.collection('settings').updateOne(
      { id: 'social' },
      { $set: update },
      { upsert: true }
    );
    const doc = await database.collection('settings').findOne({ id: 'social' });
    const { _id, ...rest } = doc as any;
    res.json(rest);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
