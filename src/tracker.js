// ============================================================
// tracker.js — Tracking System
// ============================================================

export async function savePost(env, data) {
    const key = `post_${Date.now()}`;
  
    const record = {
      ...data,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: 0,
      shares: 0
    };
  
    await env.BOT_MEMORY.put(key, JSON.stringify(record));
  }
  
  export async function updatePost(env, key, updates) {
    const existing = await env.BOT_MEMORY.get(key);
    if (!existing) return;
  
    const data = JSON.parse(existing);
  
    const updated = {
      ...data,
      ...updates
    };
  
    await env.BOT_MEMORY.put(key, JSON.stringify(updated));
  }