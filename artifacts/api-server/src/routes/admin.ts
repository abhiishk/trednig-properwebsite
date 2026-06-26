import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb, isAuthed } from "../lib/mongo";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'trendyprompt2025';

const router = Router();

router.post('/admin/login', async (req, res) => {
  try {
    const body = req.body;
    if (!body.password || body.password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }
    const token = uuidv4();
    const database = await getDb();
    await database.collection('admin_tokens').insertOne({ token, createdAt: new Date() });
    res.json({ token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/check', async (req, res) => {
  try {
    res.json({ authed: await isAuthed(req) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
