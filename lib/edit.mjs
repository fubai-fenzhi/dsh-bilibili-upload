import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Parse biliup cookies.json into a cookie header and the csrf token. */
export function parseCookies(cookiePath) {
  const raw = JSON.parse(readFileSync(cookiePath, 'utf8'));
  const list = raw.cookie_info?.cookies ?? [];
  const header = list.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  const jar = Object.fromEntries(list.map((cookie) => [cookie.name, cookie.value]));
  return { header, csrf: jar.bili_jct ?? '', hasSession: Boolean(jar.SESSDATA) };
}

/** `biliup show` prints one log line before the pretty JSON. */
export function parseShowOutput(output) {
  const text = String(output ?? '');
  const start = text.indexOf('{');
  if (start < 0) throw new Error('biliup show 输出里没有 JSON');
  return JSON.parse(text.slice(start));
}

/** Build the archive edit payload; keep every field the API requires. */
export function buildEditPayload(archive, videos, overrides = {}) {
  const payload = {
    copyright: archive.copyright ?? 1,
    videos: (videos ?? []).map((video) => ({
      filename: video.filename,
      title: video.title,
      cid: video.cid,
      desc: video.desc ?? '',
    })),
    cover: archive.cover ?? '',
    title: overrides.title ?? archive.title,
    tid: overrides.tid ?? archive.tid,
    tag: overrides.tag ?? archive.tag ?? '',
    desc: overrides.desc ?? archive.desc ?? '',
    desc_format_id: archive.desc_format_id ?? 9999,
    no_reprint: archive.no_reprint ?? 0,
    open_elec: archive.open_elec ?? 0,
    source: archive.source ?? '',
    is_only_self:
      overrides.onlySelf === true
        ? 1
        : overrides.onlySelf === false
          ? 0
          : (archive.is_only_self ?? 1),
  };
  return payload;
}

export function showArchive({ biliupPath, bvid, timeoutMs = 120000 }) {
  return new Promise((resolve, reject) => {
    execFile(
      biliupPath,
      ['show', bvid],
      { cwd: biliupPath.replace(/[\\/][^\\/]+$/, ''), maxBuffer: 10 * 1024 * 1024, timeout: timeoutMs },
      (error, stdout, stderr) => {
        if (error) reject(new Error(`biliup show 失败: ${stderr || error.message}`));
        else resolve(parseShowOutput(stdout));
      },
    );
  });
}

/**
 * Edit an archive's metadata/visibility through the Bilibili web endpoint.
 * Returns { state: 'reviewing' } when the submission is still under review.
 */
export async function editArchive({ biliupPath, cookiePath, bvid, overrides, fetchImpl = fetch }) {
  const cookies = parseCookies(cookiePath);
  if (!cookies.hasSession || !cookies.csrf) throw new Error('cookies.json 缺少 SESSDATA 或 bili_jct');

  const data = await showArchive({ biliupPath, bvid });
  const state = String(data.archive?.state);
  if (state === '-50') return { state: 'reviewing', archive: data.archive };
  if (state === '-30') return { state: 'rejected', archive: data.archive };

  const payload = buildEditPayload(data.archive, data.videos, overrides);
  const response = await fetchImpl(`https://member.bilibili.com/x/vu/web/edit?csrf=${cookies.csrf}`, {
    method: 'POST',
    headers: {
      Cookie: cookies.header,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Referer: 'https://member.bilibili.com/platform/upload-manager/article',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  return { state: 'edited', code: result.code, message: result.message, payload };
}
