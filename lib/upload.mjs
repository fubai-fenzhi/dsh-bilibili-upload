import { spawn } from 'node:child_process';
import { dirname } from 'node:path';

import { buildUploadArgs, parseUploadResult } from './args.mjs';

export function runBiliup(command, args, { cwd, timeoutMs = 1800000 } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, { cwd, shell: false, windowsHide: true });
    } catch (error) {
      resolve({ code: -1, stdout: '', stderr: String(error) });
      return;
    }
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => { stdout += chunk; });
    child.stderr?.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: `${stderr}${error}` });
    });
  });
}

/** Upload one video and return the parsed BV/aid plus raw output. */
export async function uploadVideo({
  biliupPath,
  video,
  title,
  desc = '',
  tags = [],
  cover = '',
  tid = 188,
  onlySelf = true,
  submit = 'app',
  timeoutMs,
}) {
  const args = buildUploadArgs({ video, title, desc, tags, cover, tid, onlySelf, submit });
  const result = await runBiliup(biliupPath, args, { cwd: dirname(biliupPath), timeoutMs });
  const parsed = parseUploadResult(`${result.stdout}\n${result.stderr}`);
  return {
    ok: result.code === 0 && Boolean(parsed.bvid),
    code: result.code,
    bvid: parsed.bvid,
    aid: parsed.aid,
    stdout: result.stdout,
    stderr: result.stderr,
    args,
  };
}
