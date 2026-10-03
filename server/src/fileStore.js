import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const uploadsDir = path.resolve(process.cwd(), 'uploads');
export const generatedDir = path.resolve(process.cwd(), 'generated');
export const files = new Map();

export async function ensureDirs() { await fs.mkdir(uploadsDir, {recursive:true}); await fs.mkdir(generatedDir,{recursive:true}); }
export function safeName(name) { return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0,120); }
export function newId() { return crypto.randomUUID(); }
export async function saveUpload(file, extracted) {
  const id = newId();
  const record = { id, originalName:file.originalname, mimeType:file.mimetype, size:file.size, path:file.path, extractedText:extracted.text, structuredData:extracted.structuredData ?? null, createdAt:new Date().toISOString() };
  files.set(id, record);
  return record;
}
