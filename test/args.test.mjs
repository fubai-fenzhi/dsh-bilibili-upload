import assert from 'node:assert/strict';
import test from 'node:test';

import { buildUploadArgs, normalizeTags, parseUploadResult } from '../lib/args.mjs';

test('normalizeTags accepts arrays and comma strings, trims, dedupes', () => {
  assert.equal(normalizeTags([' a ', 'b', 'A', '']), 'a,b');
  assert.equal(normalizeTags('x, y , x'), 'x,y');
  assert.equal(normalizeTags([]), '');
});

test('buildUploadArgs builds the biliup upload command', () => {
  const args = buildUploadArgs({
    video: 'E:/v.mp4',
    title: 'T',
    desc: 'D',
    tags: ['a', 'b'],
    cover: 'E:/c.png',
    tid: 188,
    onlySelf: true,
  });
  assert.deepEqual(args, [
    'upload', 'E:/v.mp4',
    '--title', 'T',
    '--desc', 'D',
    '--tag', 'a,b',
    '--tid', '188',
    '--copyright', '1',
    '--submit', 'app',
    '--cover', 'E:/c.png',
    '--is-only-self', '1',
  ]);
});

test('buildUploadArgs passes the chosen submit interface', () => {
  const args = buildUploadArgs({ video: 'v.mp4', title: 'T', submit: 'web' });
  const index = args.indexOf('--submit');
  assert.equal(args[index + 1], 'web');
});

test('buildUploadArgs omits private flag when publishing publicly', () => {
  const args = buildUploadArgs({ video: 'v.mp4', title: 'T', onlySelf: false });
  assert.ok(!args.includes('--is-only-self'));
  assert.ok(!args.includes('--cover'));
});

test('parseUploadResult reads bvid and aid from biliup log', () => {
  const output = 'ResponseData { code: 0, data: Some(Object {"aid": Number(117683177718178), "bvid": String("BV1Lz1Jz7Edf")}) }';
  assert.deepEqual(parseUploadResult(output), { bvid: 'BV1Lz1Jz7Edf', aid: 117683177718178 });
});

test('parseUploadResult returns nulls when nothing matched', () => {
  assert.deepEqual(parseUploadResult('nothing here'), { bvid: null, aid: null });
});
