import { existsSync } from 'node:fs';

import { normalizeTags } from './lib/args.mjs';
import { normalizeConfig } from './lib/config.mjs';
import { editArchive, showArchive } from './lib/edit.mjs';
import { runBiliup, uploadVideo } from './lib/upload.mjs';

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
    description: 'Upload a video to Bilibili through biliup (requires a one-time `biliup login`). Defaults to private (浠呰嚜宸卞彲瑙? for safety; pass onlySelf=false to publish publicly. Returns BV id on success.',
    parameters: objectSchema({
      video: { type: 'string', description: 'Absolute path to the video file.' },
      title: { type: 'string', description: 'Video title (Bilibili limit about 80 chars).' },
      desc: { type: 'string', description: 'Video description.' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tags; defaults to the configured defaultTags.' },
      cover: { type: 'string', description: 'Optional absolute cover image path (4:3 or 16:9).' },
      tid: { type: 'integer', description: 'Partition id; default 188 (绉戞妧 鈫?璁＄畻鏈烘妧鏈?.' },
      submit: { type: 'string', enum: ['app', 'web', 'b-cut-android'], description: 'Submission API; default web (web keeps the requested partition, app maps 188 to 21).' },
      onlySelf: { type: 'boolean', description: 'true (default) keeps it private (浠呰嚜宸卞彲瑙?; false publishes publicly.' },
      dryRun: { type: 'boolean', description: 'Only return the biliup command; do not upload.' },
    }, ['video', 'title']),
    output: textOutput,
    async execute(args) {
      const video = typeof args.video === 'string' ? args.video.trim() : '';
      if (!video) throw new Error('video 涓嶈兘涓虹┖');
      if (!existsSync(video)) throw new Error(`瑙嗛涓嶅瓨鍦細${video}`);
      const cover = typeof args.cover === 'string' && args.cover.trim() ? args.cover.trim() : '';
      if (cover && !existsSync(cover)) throw new Error(`灏侀潰涓嶅瓨鍦細${cover}`);
      if (!cfg.biliupPath) throw new Error('鏈厤缃?biliupPath锛氳鍦ㄦ彃浠堕厤缃噷濉啓 biliup 鍙墽琛屾枃浠惰矾寰勶紝鎴栬缃?BILIUP_PATH 鐜鍙橀噺');
      if (!existsSync(cfg.biliupPath)) throw new Error(`鎵句笉鍒?biliup锛?{cfg.biliupPath}`);
      if (!existsSync(cfg.cookiePath)) throw new Error(`鏈櫥褰曪細鎵句笉鍒?${cfg.cookiePath}銆傝鍏堝湪 biliup 鐩綍杩愯 login.bat锛坆iliup login锛夋壂鐮乣);

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
        result.ok ? `涓婁紶鎴愬姛锛?{result.bvid}${result.aid ? `锛坅id ${result.aid}锛塦 : ''}` : `涓婁紶澶辫触锛坋xit ${result.code}锛塦,
        `鍙鎬э細${onlySelf ? '浠呰嚜宸卞彲瑙侊紙鍘诲垱浣滀腑蹇冩敼鍏紑锛屾垨鐢?bili_edit锛? : '鍏紑'}`,
      ];
      if (!result.ok) lines.push('--- stdout ---', tail(result.stdout), '--- stderr ---', tail(result.stderr));
      return { text: lines.join('\n') };
    },
    presentCall: present('涓婁紶瑙嗛鍒?B 绔?),
  });

  ctx.tools.register({
    name: 'bili_edit',
    description: 'Edit an uploaded video\'s title, partition, tags, description or visibility through the Bilibili web API (requires biliup login cookies). Refuses when the submission is still under review.',
    parameters: objectSchema({
      bvid: { type: 'string', description: 'BV id of the archive to edit.' },
      title: { type: 'string', description: 'New title; omit to keep.' },
      tid: { type: 'integer', description: 'New partition id; omit to keep.' },
      tag: { type: 'string', description: 'New comma-separated tags; omit to keep.' },
      desc: { type: 'string', description: 'New description; omit to keep.' },
      onlySelf: { type: 'boolean', description: 'true = 浠呰嚜宸卞彲瑙? false = 鍏紑; omit to keep current.' },
      dryRun: { type: 'boolean', description: 'Only report current state and planned changes.' },
    }, ['bvid']),
    output: textOutput,
    async execute(args) {
      const bvid = typeof args.bvid === 'string' ? args.bvid.trim() : '';
      if (!bvid) throw new Error('bvid 涓嶈兘涓虹┖');
      if (!cfg.biliupPath) throw new Error('鏈厤缃?biliupPath锛氳鍦ㄦ彃浠堕厤缃噷濉啓 biliup 鍙墽琛屾枃浠惰矾寰勶紝鎴栬缃?BILIUP_PATH 鐜鍙橀噺');
      if (!existsSync(cfg.biliupPath)) throw new Error(`鎵句笉鍒?biliup锛?{cfg.biliupPath}`);
      if (!existsSync(cfg.cookiePath)) throw new Error(`鏈櫥褰曪細鎵句笉鍒?${cfg.cookiePath}`);

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
            `褰撳墠锛歴tate=${archive.state} title=${archive.title} tid=${archive.tid} is_only_self=${archive.is_only_self}`,
            `璁″垝锛?{Object.entries(overrides).map(([key, value]) => `${key}=${value}`).join(' ') || '锛堟棤鍙樻洿锛?}`,
          ].join('\n'),
        };
      }

      const result = await editArchive({ biliupPath: cfg.biliupPath, cookiePath: cfg.cookiePath, bvid, overrides });
      if (result.state === 'reviewing') return { text: `${bvid} 杩樺湪瀹℃牳涓紙-50锛夛紝B 绔欎笉鍏佽缂栬緫锛涘鏍搁€氳繃鍚庡啀璇曘€俙 };
      if (result.state === 'rejected') return { text: `${bvid} 宸茶閫€鍥烇紙-30锛夛紝璇峰厛鍦ㄥ垱浣滀腑蹇冩煡鐪嬮€€鍥炲師鍥犮€俙 };

      const ok = result.code === 0;
      const lines = [ok ? `${bvid} 淇敼鎴愬姛` : `${bvid} 淇敼澶辫触锛坈ode ${result.code}锛?{result.message ?? ''}锛塦];
      if (ok) {
        try {
          const after = await showArchive({ biliupPath: cfg.biliupPath, bvid });
          const archive = after.archive ?? {};
          lines.push(`鏀瑰悗锛歴tate=${archive.state} title=${archive.title} tid=${archive.tid} is_only_self=${archive.is_only_self}`);
        } catch {
          lines.push('淇敼宸叉彁浜わ紝鍥炶鐘舵€佸け璐ワ紙绋嶇瓑鍑犵鍐嶇湅锛?);
        }
      }
      return { text: lines.join('\n') };
    },
    presentCall: present('缂栬緫 B 绔欑浠?),
  });

  ctx.tools.register({
    name: 'bili_check',
    description: 'Check biliup binary and login state (cookies.json). Optionally pass a BV id to print that video via `biliup show`.',
    parameters: objectSchema({
      bvid: { type: 'string', description: 'Optional BV id to query with biliup show.' },
    }, []),
    output: textOutput,
    async execute(args) {
      const lines = [
        `biliup: ${cfg.biliupPath ? (existsSync(cfg.biliupPath) ? cfg.biliupPath : `MISSING锛?{cfg.biliupPath}锛塦) : '鏈厤缃紙璇疯缃?biliupPath 鎴?BILIUP_PATH锛?}`,
        `cookies: ${cfg.cookiePath ? (existsSync(cfg.cookiePath) ? cfg.cookiePath : `MISSING锛?{cfg.cookiePath}锛塦) : '鏈厤缃?}`,
      ];
      if (args.bvid) {
        const result = await runBiliup(cfg.biliupPath, ['show', args.bvid], {
          cwd: cfg.biliupPath.replace(/[\\/][^\\/]+$/, ''),
          timeoutMs: 120000,
        });
        lines.push(`--- biliup show ${args.bvid}锛坋xit ${result.code}锛?---`, tail(result.stdout, 40), tail(result.stderr, 15));
      }
      return { text: lines.join('\n') };
    },
    presentCall: present('妫€鏌?biliup 鐘舵€?),
  });
}

