/**
 * Storage layer — automatically uses MongoDB when available,
 * falls back to a JSON file store (./data/) so data persists across restarts
 * without needing MongoDB installed.
 */

const fs = require('fs');
const path = require('path');

// ─── State ───────────────────────────────────────────────────────────────────
let mongooseReady = false;
let mongooseInstance = null;

const DATA_DIR = path.join(__dirname, '../../data');

// ─── JSON file store ─────────────────────────────────────────────────────────
const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
};

const readStore = (collection) => {
  ensureDataDir();
  const file = path.join(DATA_DIR, `${collection}.json`);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
};

const writeStore = (collection, data) => {
  ensureDataDir();
  const file = path.join(DATA_DIR, `${collection}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
};

// ─── MongoDB connection ───────────────────────────────────────────────────────
// Returns a short status string used by the startup banner.
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-career-copilot';

  // Skip connection attempt entirely when URI explicitly set to 'none'
  if (uri === 'none') {
    return 'JSON file store (data/ dir)';
  }

  try {
    const mongoose = require('mongoose');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    mongooseReady = true;
    mongooseInstance = mongoose;
    return `MongoDB connected`;
  } catch {
    return 'JSON file store (MongoDB unavailable)';
  }
};

const isMongoReady = () => mongooseReady;

// ─── Universal CRUD operations ───────────────────────────────────────────────

/**
 * Find a single document.
 * mongoQuery is used for Mongoose, fileKey is a function(record) => bool for file store.
 */
const findOne = async (Model, mongoQuery, fileKey) => {
  if (mongooseReady) {
    return Model.findOne(mongoQuery);
  }
  const store = readStore(Model.modelName.toLowerCase() + 's');
  const entries = Object.values(store);
  return entries.find(fileKey) || null;
};

/**
 * Find multiple documents.
 */
const find = async (Model, mongoQuery, fileFilter, sortFn, limit) => {
  if (mongooseReady) {
    let q = Model.find(mongoQuery);
    if (sortFn) q = q.sort(sortFn);
    if (limit) q = q.limit(limit);
    return q;
  }
  const store = readStore(Model.modelName.toLowerCase() + 's');
  let results = Object.values(store).filter(fileFilter || (() => true));
  if (sortFn) {
    const [field, dir] = Object.entries(sortFn)[0];
    results = results.sort((a, b) => dir === -1 ? new Date(b[field]) - new Date(a[field]) : new Date(a[field]) - new Date(b[field]));
  }
  if (limit) results = results.slice(0, limit);
  return results;
};

/**
 * Upsert — find by key and update, or create if not found.
 * fileKeyFn(record) picks the right record.
 * fileIdFn() generates the ID for new records.
 */
const upsert = async (Model, mongoQuery, data, fileKeyFn, fileIdFn) => {
  if (mongooseReady) {
    return Model.findOneAndUpdate(mongoQuery, data, { new: true, upsert: true });
  }
  const collName = Model.modelName.toLowerCase() + 's';
  const store = readStore(collName);
  const existing = Object.values(store).find(fileKeyFn);
  const id = existing?._id || existing?.id || fileIdFn();
  const record = { ...existing, ...data, _id: id, id, updatedAt: new Date().toISOString() };
  if (!existing) record.createdAt = new Date().toISOString();
  store[id] = record;
  writeStore(collName, store);
  return record;
};

/**
 * Create a new document.
 */
const create = async (Model, data) => {
  if (mongooseReady) {
    return Model.create(data);
  }
  const collName = Model.modelName.toLowerCase() + 's';
  const store = readStore(collName);
  const id = `${Model.modelName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record = { ...data, _id: id, id, createdAt: new Date().toISOString() };
  store[id] = record;
  writeStore(collName, store);
  return record;
};

/**
 * Update one document by ID.
 */
const updateById = async (Model, id, updates) => {
  if (mongooseReady) {
    return Model.findByIdAndUpdate(id, updates, { new: true });
  }
  const collName = Model.modelName.toLowerCase() + 's';
  const store = readStore(collName);
  if (!store[id]) return null;
  store[id] = { ...store[id], ...updates, updatedAt: new Date().toISOString() };
  writeStore(collName, store);
  return store[id];
};

/**
 * Find by ID.
 */
const findById = async (Model, id) => {
  if (mongooseReady) {
    return Model.findById(id);
  }
  const collName = Model.modelName.toLowerCase() + 's';
  const store = readStore(collName);
  return store[id] || null;
};

module.exports = {
  connectDB,
  isMongoReady,
  findOne,
  find,
  upsert,
  create,
  updateById,
  findById,
};
