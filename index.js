import { existsSync } from 'node:fs';

import { normalizeTags } from './lib/args.mjs';
import { normalizeConfig } from './lib/config.mjs';
import { editArchive, showArchive } from './lib/edit.mjs';
import { runBiliup, uploadVideo } from './lib/upload.mjs';
import { SKILL_REGISTRATION } from './lib/skill.mjs';

export const name = 'dsh-bilibili-upload';
export const inject = ['tools'];

const textOutput = {
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: { text: { type: 'string' } },
  },
  render: (_args, value) => [{ type: 'text', text: value.text }],
};

const present = (title) => (args) => ({ card: 'generic', title, kind: 'other', rawInput: args });

function objectSchema(properties, required = []) {
  return { type: 'object', additionalProperties: false, properties, required };
}

function tail(text, lines = 30) {
  return String(text ?? '').trimEnd().split('\n').slice(-lines).join('\n');
}

export function apply(ctx, config) {
  const cfg = normalizeConfig(config);

  ctx.tools.register({
    name: 'bili_upload',
    description: 'Upload a video to Bilibili through biliup (requires a one-time biliup login). Defaults to private (仅自己可见) for safety; pass onlySelf=false to publish publicly. Returns the BV id on success.',
    parameters: objectSchema({
      video: { type: 'string', description: 'Absolute path to the video file.' },
      title: { type: 'string', description: 'Video title (Bilibili limit about 80 chars).' },
      desc: { type: 'string', description: 'Video description.' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tags; defaults to the configured defaultTags.' },
      cover: { type: 'string', description: 'Optional absolute cover image path (4:3 or 16:9).' },
      tid: { type: 'integer', description: 'Partition id; default 188 (科技 → 计算机技术).' },
      submit: { type: 'string', enum: ['app', 'web', 'b-cut-android'], description: 'Submission API; default web (web keeps the requested partition, app maps 188 to 21).' },
      onlySelf: { type: 'boolean', description: 'true (default) keeps it private (仅自己可见); false publishes publicly.' },
      dryRun: { type: 'boolean', description: 'Only return the biliup command; do not upload.' },
    }, ['video', 'title']),
    output: textOutput,
    async execute(args) {
      const video = typeof args.video === 'string' ? args.video.trim() : '';
      if (!video) throw new Error('video 不能为空');
      if (!existsSync(video)) throw new Error(`视频不存在：${video}`);
      const cover = typeof args.cover === 'string' && args.cover.trim() ? args.cover.trim() : '';
      if (cover && !existsSync(cover)) throw new Error(`封面不存在：${cover}`);
      if (!cfg.biliupPath) throw new Error('未配置 biliupPath：请在插件配置里填写 biliup 可执行文件路径，或设置 BILIUP_PATH 环境变量');
      if (!existsSync(cfg.biliupPath)) throw new Error(`找不到 biliup：${cfg.biliupPath}`);
      if (!existsSync(cfg.cookiePath)) throw new Error(`未登录：找不到 ${cfg.cookiePath}。请先在 biliup 目录运行 login.bat（biliup login）扫码`);

      const onlySelf = args.onlySelf ?? cfg.defaultOnlySelf;
      const tags = normalizeTags(args.tags && args.tags.length ? args.tags : cfg.defaultTags);
      const submit = args.submit ?? cfg.defaultSubmit;

      if (args.dryRun) {
        return { text: `dry-run:\n${cfg.biliupPath} upload ${video} --title ${args.title} --desc ${args.desc ?? ''} --tag ${tags} --tid ${args.tid ?? cfg.defaultTid} --copyright 1 --submit ${submit}${cover ? ` --cover ${cover}` : ''}${onlySelf ? ' --is-only-self 1' : ''}` };
      }

      const result = await uploadVideo({
        biliupPath: cfg.biliupPath,
        video,
        title: args.title,
        desc: args.desc ?? '',
        tags,
        cover,
        tid: args.tid ?? cfg.defaultTid,
        onlySelf,
        submit,
        timeoutMs: cfg.timeoutMs,
      });
      const lines = [
        result.ok ? `上传成功：${result.bvid}${result.aid ? `（aid ${result.aid}）` : ''}` : `上传失败（exit ${result.code}）`,
        `可见性：${onlySelf ? '仅自己可见（去创作中心改公开，或用 bili_edit）' : '公开'}`,
      ];
      if (!result.ok) lines.push('--- stdout ---', tail(result.stdout), '--- stderr ---', tail(result.stderr));
      return { text: lines.join('\n') };
    },
    presentCall: present('上传视频到 B 站'),
  });

  ctx.tools.register({
    name: 'bili_edit',
    description: 'Edit an uploaded video title, partition, tags, description or visibility through the Bilibili web API (requires biliup login cookies). Refuses while the submission is still under review.',
    parameters: objectSchema({
      bvid: { type: 'string', description: 'BV id of the archive to edit.' },
      title: { type: 'string', description: 'New title; omit to keep.' },
      tid: { type: 'integer', description: 'New partition id; omit to keep.' },
      tag: { type: 'string', description: 'New comma-separated tags; omit to keep.' },
      desc: { type: 'string', description: 'New description; omit to keep.' },
      onlySelf: { type: 'boolean', description: 'true = 仅自己可见; false = 公开; omit to keep current.' },
      dryRun: { type: 'boolean', description: 'Only report current state and planned changes.' },
    }, ['bvid']),
    output: textOutput,
    async execute(args) {
      const bvid = typeof args.bvid === 'string' ? args.bvid.trim() : '';
      if (!bvid) throw new Error('bvid 不能为空');
      if (!cfg.biliupPath) throw new Error('未配置 biliupPath：请在插件配置里填写 biliup 可执行文件路径，或设置 BILIUP_PATH 环境变量');
      if (!existsSync(cfg.biliupPath)) throw new Error(`找不到 biliup：${cfg.biliupPath}`);
      if (!existsSync(cfg.cookiePath)) throw new Error(`未登录：找不到 ${cfg.cookiePath}`);

      const overrides = {};
      if (typeof args.title === 'string') overrides.title = args.title;
      if (Number.isInteger(args.tid)) overrides.tid = args.tid;
      if (typeof args.tag === 'string') overrides.tag = args.tag;
      if (typeof args.desc === 'string') overrides.desc = args.desc;
      if (typeof args.onlySelf === 'boolean') overrides.onlySelf = args.onlySelf;

      if (args.dryRun) {
        const data = await showArchive({ biliupPath: cfg.biliupPath, bvid });
        const archive = data.archive ?? {};
        return {
          text: [
            `当前：state=${archive.state} title=${archive.title} tid=${archive.tid} is_only_self=${archive.is_only_self}`,
            `计划：${Object.entries(overrides).map(([key, value]) => `${key}=${value}`).join(' ') || '（无变更）'}`,
          ].join('\n'),
        };
      }

      const result = await editArchive({ biliupPath: cfg.biliupPath, cookiePath: cfg.cookiePath, bvid, overrides });
      if (result.state === 'reviewing') return { text: `${bvid} 还在审核中（-50），B 站不允许编辑；审核通过后再试。` };
      if (result.state === 'rejected') return { text: `${bvid} 已被退回（-30），请先在创作中心查看退回原因。` };

      const ok = result.code === 0;
      const lines = [ok ? `${bvid} 修改成功` : `${bvid} 修改失败（code ${result.code}：${result.message ?? ''}）`];
      if (ok) {
        try {
          const after = await showArchive({ biliupPath: cfg.biliupPath, bvid });
          const archive = after.archive ?? {};
          lines.push(`改后：state=${archive.state} title=${archive.title} tid=${archive.tid} is_only_self=${archive.is_only_self}`);
        } catch {
          lines.push('修改已提交，回读状态失败（稍等几秒再看）');
        }
      }
      return { text: lines.join('\n') };
    },
    presentCall: present('编辑 B 站稿件'),
  });

  ctx.tools.register({
    name: 'bili_check',
    description: 'Check biliup binary and login state (cookies.json). Optionally pass a BV id to print that video via biliup show.',
    parameters: objectSchema({
      bvid: { type: 'string', description: 'Optional BV id to query with biliup show.' },
    }, []),
    output: textOutput,
    async execute(args) {
      const lines = [
        `biliup: ${cfg.biliupPath ? (existsSync(cfg.biliupPath) ? cfg.biliupPath : `MISSING（${cfg.biliupPath}）`) : '未配置（请设置 biliupPath 或 BILIUP_PATH）'}`,
        `cookies: ${cfg.cookiePath ? (existsSync(cfg.cookiePath) ? cfg.cookiePath : `MISSING（${cfg.cookiePath}）`) : '未配置'}`,
      ];
      if (args.bvid) {
        const result = await runBiliup(cfg.biliupPath, ['show', args.bvid], {
          cwd: cfg.biliupPath.replace(/[\\/][^\\/]+$/, ''),
          timeoutMs: 120000,
        });
        lines.push(`--- biliup show ${args.bvid}（exit ${result.code}） ---`, tail(result.stdout, 40), tail(result.stderr, 15));
      }
      return { text: lines.join('\n') };
    },
    presentCall: present('检查 biliup 状态'),
  });

  const skills = ctx.get('skills');
  if (skills) ctx.effect(() => skills.register(SKILL_REGISTRATION));
}
