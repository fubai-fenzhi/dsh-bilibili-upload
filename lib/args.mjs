export const DEFAULT_TID = 188;

/** Normalize tags: accept array or comma separated string, trim, drop empty, dedupe. */
export function normalizeTags(tags) {
  const list = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(',')
      : [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const tag = String(item ?? '').trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out.join(',');
}

/** Build `biliup upload` arguments. Keep this pure so it is unit-testable. */
export function buildUploadArgs({ video, title, desc = '', tags = [], tid = DEFAULT_TID, cover = '', onlySelf = true, submit = 'app' }) {
  if (!video) throw new Error('video is required');
  if (!title) throw new Error('title is required');
  const args = [
    'upload', video,
    '--title', String(title),
    '--desc', String(desc),
    '--tag', normalizeTags(tags),
    '--tid', String(tid),
    '--copyright', '1',
    '--submit', String(submit),
  ];
  if (cover) args.push('--cover', String(cover));
  if (onlySelf) args.push('--is-only-self', '1');
  return args;
}

/** Parse bvid/aid from biliup output. */
export function parseUploadResult(output) {
  const text = String(output ?? '');
  const bvid =
    /"bvid"\s*:\s*(?:String\()?"([^"]+)"/.exec(text)?.[1] ??
    /\b(BV[0-9A-Za-z]{10})\b/.exec(text)?.[1] ??
    null;
  const aidRaw = /"aid"\s*:\s*(?:Number\()?(\d+)/.exec(text)?.[1] ?? null;
  return { bvid, aid: aidRaw ? Number(aidRaw) : null };
}
