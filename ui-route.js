import { existsSync } from 'node:fs';

import { normalizeConfig } from './lib/config.mjs';
import { editArchive } from './lib/edit.mjs';
import { uploadVideo } from './lib/upload.mjs';

export const name = 'dsh-bilibili-upload-ui';
export const inject = ['webServer'];

export function apply(ctx) {
  const cfg = normalizeConfig();

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/bili-upload/state',
    resource: async () => Response.json({
      biliup: Boolean(cfg.biliupPath) && existsSync(cfg.biliupPath),
      cookies: Boolean(cfg.cookiePath) && existsSync(cfg.cookiePath),
      biliupPath: cfg.biliupPath,
    }),
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/bili-upload/upload',
    resource: async (request) => {
      if (request.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });
      try {
        const body = await request.json();
        if (!body.video || !body.title) return Response.json({ error: 'video/title required' }, { status: 400 });
        if (!cfg.biliupPath) return Response.json({ error: '未配置 biliupPath（插件配置或 BILIUP_PATH）' }, { status: 400 });
        if (!existsSync(body.video)) return Response.json({ error: `视频不存在：${body.video}` }, { status: 400 });
        if (body.cover && !existsSync(body.cover)) return Response.json({ error: `封面不存在：${body.cover}` }, { status: 400 });
        const result = await uploadVideo({
          biliupPath: cfg.biliupPath,
          video: body.video,
          title: body.title,
          desc: body.desc ?? '',
          tags: body.tags ?? cfg.defaultTags,
          cover: body.cover ?? '',
          tid: Number.isInteger(body.tid) ? body.tid : cfg.defaultTid,
          onlySelf: typeof body.onlySelf === 'boolean' ? body.onlySelf : cfg.defaultOnlySelf,
          submit: body.submit ?? cfg.defaultSubmit,
          timeoutMs: cfg.timeoutMs,
        });
        return Response.json({
          ok: result.ok,
          bvid: result.bvid,
          aid: result.aid,
          code: result.code,
          stderr: result.stderr.slice(-600),
        });
      } catch (error) {
        return Response.json({ error: String(error) }, { status: 500 });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/bili-upload/edit',
    resource: async (request) => {
      if (request.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });
      try {
        const body = await request.json();
        if (!body.bvid) return Response.json({ error: 'bvid required' }, { status: 400 });
        const overrides = {};
        for (const key of ['title', 'tid', 'tag', 'desc']) {
          if (body[key] !== undefined) overrides[key] = body[key];
        }
        if (typeof body.onlySelf === 'boolean') overrides.onlySelf = body.onlySelf;
        const result = await editArchive({
          biliupPath: cfg.biliupPath,
          cookiePath: cfg.cookiePath,
          bvid: body.bvid,
          overrides,
        });
        return Response.json(result);
      } catch (error) {
        return Response.json({ error: String(error) }, { status: 500 });
      }
    },
  }));
}
