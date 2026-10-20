import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { checkHandoff, recordCompaction } from '../bin/owner-handoff-check.mjs';

const oldThread = '11111111-1111-1111-1111-111111111111';
const successorThread = '22222222-2222-2222-2222-222222222222';
test('P4 requires preserved bytes, cold semantics, same route and a settled single writer', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p4-gate-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, value) => {
    const bytes = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    fs.writeFileSync(path.join(root, name), bytes);
    return { path: name, sha256: createHash('sha256').update(bytes).digest('hex') };
  };
  const handoff = write('handoff.md', `Owner ${oldThread}\nIntent and private boundaries preserved.`);
  const preservation = [write('preservation.json', { head: 'fixture', index: 'unchanged', dirtyFiles: ['work.txt'], inFlight: [] })];
  write('work.txt', 'original dirty work');
  const readbackData = { oldThread, successorThread, handoffSha256: handoff.sha256, readOnly: true, questionsAsked: 0, unresolvedQuestion: false, verdict: 'pass', intent: 'Continue the owned fixture.', authority: 'Exact fixture assignment.', preservation: 'Dirty source retained.', limits: 'No deployment.', next: 'Read work.txt.' };
  const readback = write('readback.json', readbackData);
  const packet = { schemaVersion: 1, oldThread, successorThread, handoff, readback, preservation, compactions: [1, 2].map(n => ({ thread: oldThread, id: `fixture-${n}`, observedAt: `2026-09-05T12:0${n}:00Z` })), inFlight: [], ownerReleaseConfirmed: true, semanticAcceptance: true, oldRoute: { harness: 'fixture', model: 'fixture', provider: 'fixture' }, successorRoute: { harness: 'fixture', model: 'fixture', provider: 'fixture' } };
  assert.equal(checkHandoff(packet, root).runtimeAction, 'none');
  for (const [name, mutate, message] of [
    ['one event', p => p.compactions.pop(), /Two observed/],
    ['duplicate event', p => p.compactions[1].id = p.compactions[0].id, /distinct/],
    ['wrong event owner', p => p.compactions[0].thread = successorThread, /owner-scoped/],
    ['active operation', p => p.inFlight.push('test PID fixture'), /settled/],
    ['no owner release', p => p.ownerReleaseConfirmed = false, /confirmed/],
    ['no semantic acceptance', p => p.semanticAcceptance = false, /semantics/],
    ['route change', p => p.successorRoute.provider = 'different', /route differs/],
    ['same thread', p => p.successorThread = oldThread, /Distinct/],
    ['missing preservation', p => p.preservation = [], /preservation evidence/],
    ['bad hash', p => p.handoff.sha256 = '0'.repeat(64), /bytes changed/],
  ]) await t.test(name, () => { const p = structuredClone(packet); mutate(p); assert.throws(() => checkHandoff(p, root), message); });
  await t.test('question bound and failed cold read do not release', () => {
    for (const delta of [{ questionsAsked: 2 }, { unresolvedQuestion: true }, { verdict: 'fail' }, { handoffSha256: '0'.repeat(64) }]) {
      const p = { ...packet, readback: write('bad-readback.json', { ...readbackData, ...delta }) };
      assert.throws(() => checkHandoff(p, root));
    }
  });
  await t.test('source changes invalidate acceptance', () => {
    fs.appendFileSync(path.join(root, preservation[0].path), 'changed');
    assert.throws(() => checkHandoff(packet, root), /bytes changed/);
    assert.equal(fs.readFileSync(path.join(root, 'work.txt'), 'utf8'), 'original dirty work');
  });
});

test('P4 compaction recording is owner-local, durable and idempotent', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'p4-count-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'events.json');
  const event = { thread: oldThread, id: 'fixture-one', observedAt: '2026-09-05T12:00:00Z' };
  assert.equal(recordCompaction(file, event).handoffDue, false);
  assert.equal(recordCompaction(file, event).count, 1);
  assert.equal(recordCompaction(file, { ...event, id: 'fixture-two' }).handoffDue, true);
  const bytes = fs.readFileSync(file);
  assert.throws(() => recordCompaction(file, { ...event, thread: successorThread }), /Different owner/);
  fs.writeFileSync(file + '.lock', 'existing lock');
  assert.throws(() => recordCompaction(file, { ...event, id: 'fixture-three' }), /EEXIST/);
  assert.deepEqual(fs.readFileSync(file), bytes);
});
