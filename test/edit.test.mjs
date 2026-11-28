import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEditPayload, classifyArchiveState, parseShowOutput } from '../lib/edit.mjs';

const SHOW_OUTPUT = `2026-11-26 22:34:29  INFO biliup_cli::uploader: user: someone
{
  "archive": {
    "aid": 117683177718178,
    "bvid": "BV1Lz1Jz7Edf",
    "title": "old title",
    "tid": 21,
    "tag": "a,b",
    "desc": "old desc",
    "copyright": 1,
    "cover": "http://example/cover.png",
    "desc_format_id": 9999,
    "no_reprint": 0,
    "open_elec": 0,
    "source": "",
    "is_only_self": 1,
    "state": -50
  },
  "videos": [
    { "filename": "fn1", "title": "p1", "cid": 43946938201, "desc": "" }
  ]
}`;

test('parseShowOutput skips the log line and parses JSON', () => {
  const data = parseShowOutput(SHOW_OUTPUT);
  assert.equal(data.archive.bvid, 'BV1Lz1Jz7Edf');
  assert.equal(data.videos[0].filename, 'fn1');
});

test('buildEditPayload keeps required fields and applies overrides', () => {
  const data = parseShowOutput(SHOW_OUTPUT);
  const payload = buildEditPayload(data.archive, data.videos, {
    title: 'new "title"',
    tid: 188,
    onlySelf: false,
  });
  assert.equal(payload.title, 'new "title"');
  assert.equal(payload.tid, 188);
  assert.equal(payload.is_only_self, 0);
  assert.equal(payload.desc, 'old desc');
  assert.equal(payload.tag, 'a,b');
  assert.equal(payload.cover, 'http://example/cover.png');
  assert.deepEqual(payload.videos, [{ filename: 'fn1', title: 'p1', cid: 43946938201, desc: '' }]);
});

test('buildEditPayload keeps visibility when onlySelf is omitted', () => {
  const data = parseShowOutput(SHOW_OUTPUT);
  const payload = buildEditPayload(data.archive, data.videos, { title: 'x' });
  assert.equal(payload.is_only_self, 1);
});

test('classifyArchiveState: -50 是仅自己可见（已过审），不是可编辑态', () => {
  const info = classifyArchiveState(-50);
  assert.equal(info.kind, 'private-passed');
  assert.equal(info.editable, false);
  assert.match(info.hint, /创作中心/);
});

test('classifyArchiveState: -30 是审核中，不是已退回', () => {
  const info = classifyArchiveState(-30);
  assert.equal(info.kind, 'reviewing');
  assert.equal(info.editable, false);
});

test('classifyArchiveState: 其他 state 仍可编辑', () => {
  assert.equal(classifyArchiveState(0).editable, true);
});
