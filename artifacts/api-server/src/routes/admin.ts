import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb, isAuthed } from "../lib/mongo";
import { objectStorageClient } from "../lib/objectStorage";

const router = Router();

router.post('/admin/login', async (req, res) => {
  try {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD) {
      res.status(500).json({ error: 'ADMIN_PASSWORD environment variable is not set' });
      return;
    }
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

/**
 * POST /admin/fix-orphaned-thumbnails
 * 1. Migrates any remaining base64 thumbnails to Replit Object Storage.
 * 2. Checks all /api/storage/objects/... thumbnails — if the file doesn't exist
 *    in the current bucket (i.e. it was from the old hosting), clears the thumbnail
 *    so the prompt shows a placeholder instead of a 404.
 * Returns a summary of what was fixed.
 */
router.post('/admin/fix-orphaned-thumbnails', async (req, res) => {
  if (!await isAuthed(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const privateDir = process.env.PRIVATE_OBJECT_DIR || '';
    if (!privateDir) { res.status(500).json({ error: 'Object storage not configured (PRIVATE_OBJECT_DIR missing)' }); return; }

    const rawParts = privateDir.startsWith('/') ? privateDir.slice(1).split('/') : privateDir.split('/');
    const bucketName = rawParts[0];
    const dirPrefix = rawParts.slice(1).join('/');
    const bucket = objectStorageClient.bucket(bucketName);

    const database = await getDb();

    // Step 1: migrate any remaining base64 thumbnails
    const base64Prompts = await database.collection('prompts')
      .find({ thumbnail: { $regex: '^data:' } })
      .toArray();

    let migratedBase64 = 0;
    let base64Failed = 0;
    const base64Errors: string[] = [];

    for (const prompt of base64Prompts) {
      try {
        const dataUrl: string = prompt.thumbnail;
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) { base64Failed++; continue; }
        const [, contentType, b64] = match;
        const buffer = Buffer.from(b64, 'base64');

        const objectId = uuidv4();
        const objectName = `${dirPrefix}/uploads/${objectId}`.replace(/^\//, '');
        const file = bucket.file(objectName);
        await file.save(buffer, { contentType, resumable: false });

        const thumbnailUrl = `/api/storage/objects/uploads/${objectId}`;
        await database.collection('prompts').updateOne(
          { _id: prompt._id },
          { $set: { thumbnail: thumbnailUrl } }
        );
        migratedBase64++;
      } catch (err: any) {
        base64Failed++;
        base64Errors.push(`${prompt._id}: ${err.message}`);
      }
    }

    // Step 2: check all /api/storage/objects/... paths for existence in current bucket
    const storageThumbnailPrompts = await database.collection('prompts')
      .find({ thumbnail: { $regex: '^/api/storage/objects/' } })
      .toArray();

    let cleared = 0;
    let stillValid = 0;
    const clearErrors: string[] = [];

    for (const prompt of storageThumbnailPrompts) {
      try {
        // Extract UUID from path like /api/storage/objects/uploads/<uuid>
        const thumbPath: string = prompt.thumbnail;
        const uuidMatch = thumbPath.match(/\/uploads\/(.+)$/);
        if (!uuidMatch) { cleared++; continue; }
        const objectId = uuidMatch[1];
        const objectName = `${dirPrefix}/uploads/${objectId}`.replace(/^\//, '');
        const file = bucket.file(objectName);
        const [exists] = await file.exists();
        if (!exists) {
          await database.collection('prompts').updateOne(
            { _id: prompt._id },
            { $set: { thumbnail: '' } }
          );
          cleared++;
        } else {
          stillValid++;
        }
      } catch (err: any) {
        clearErrors.push(`${prompt._id}: ${err.message}`);
      }
    }

    res.json({
      migratedBase64,
      base64Failed,
      base64Errors: base64Errors.slice(0, 5),
      checkedStoragePaths: storageThumbnailPrompts.length,
      orphanedCleared: cleared,
      stillValid,
      clearErrors: clearErrors.slice(0, 5),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
