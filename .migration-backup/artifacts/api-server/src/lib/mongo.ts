import { MongoClient, Db } from "mongodb";
import type { Request } from "express";

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'trendyprompt';

let cachedDb: Db | null = null;
let connecting: Promise<Db> | null = null;
let cachedClient: MongoClient | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  if (connecting) return connecting;
  if (!MONGO_URL || typeof MONGO_URL !== 'string') {
    throw new Error('MONGO_URL is not set. Please configure environment variables.');
  }
  connecting = (async () => {
    try {
      const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 8000 });
      await client.connect();
      const db = client.db(DB_NAME);
      await db.collection('prompts').createIndex({ createdAt: -1 }).catch(() => {});
      await db.collection('prompts').createIndex({ id: 1 }, { unique: true }).catch(() => {});
      await db.collection('admin_tokens').createIndex({ token: 1 }, { unique: true }).catch(() => {});
      await db.collection('admin_tokens').createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }).catch(() => {});
      cachedClient = client;
      cachedDb = db;
      return db;
    } finally {
      connecting = null;
    }
  })();
  return connecting;
}

export async function isAuthed(req: Request): Promise<boolean> {
  const auth = req.headers['authorization'] || '';
  const tok = auth.replace(/^Bearer\s+/i, '').trim();
  if (!tok) return false;
  try {
    const db = await getDb();
    const found = await db.collection('admin_tokens').findOne({ token: tok });
    return !!found;
  } catch {
    return false;
  }
}
