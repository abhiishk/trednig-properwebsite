import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb, isAuthed } from "../lib/mongo";
import { objectStorageClient } from "../lib/objectStorage";

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

/**
 * GET /admin/migrate-images/status
 * Returns count of prompts still using base64 thumbnails.
 */
router.get('/admin/migrate-images/status', async (req, res) => {
  if (!await isAuthed(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const database = await getDb();
    const total = await database.collection('prompts').countDocuments({});
    const base64Count = await database.collection('prompts').countDocuments({
      thumbnail: { $regex: '^data:' }
    });
    res.json({ base64Count, total });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /admin/migrate-images
 * Reads all base64 thumbnails from MongoDB, uploads them to GCS, updates records.
 */
router.post('/admin/migrate-images', async (req, res) => {
  if (!await isAuthed(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const privateDir = process.env.PRIVATE_OBJECT_DIR || '';
    if (!privateDir) { res.status(500).json({ error: 'Object storage not configured (PRIVATE_OBJECT_DIR missing)' }); return; }

    const parts = privateDir.startsWith('/') ? privateDir.slice(1).split('/') : privateDir.split('/');
    const bucketName = parts[0];
    const dirPrefix = parts.slice(1).join('/');
    const bucket = objectStorageClient.bucket(bucketName);

    const database = await getDb();
    const prompts = await database.collection('prompts')
      .find({ thumbnail: { $regex: '^data:' } })
      .toArray();

    let migrated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const prompt of prompts) {
      try {
        const dataUrl: string = prompt.thumbnail;
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) { failed++; continue; }
        const [, contentType, b64] = match;
        const buffer = Buffer.from(b64, 'base64');

        const objectId = uuidv4();
        const objectName = `${dirPrefix}/uploads/${objectId}`.replace(/^\//, '');
        const file = bucket.file(objectName);

        await file.save(buffer, { contentType, resumable: false });

        const objectPath = `/objects/uploads/${objectId}`;
        const thumbnailUrl = `/api/storage${objectPath}`;

        await database.collection('prompts').updateOne(
          { _id: prompt._id },
          { $set: { thumbnail: thumbnailUrl } }
        );
        migrated++;
      } catch (err: any) {
        failed++;
        errors.push(`${prompt._id}: ${err.message}`);
      }
    }

    res.json({ migrated, failed, total: prompts.length, errors: errors.slice(0, 5) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
