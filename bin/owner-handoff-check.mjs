#!/usr/bin/env node
// P4 release eligibility only: never starts, stops or reconfigures a runtime.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const id = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const refuse = message => { throw new Error(message); };

function readBounded(root, pointer) {
  if (!pointer || typeof pointer.path !== 'string' || !/^[a-f0-9]{64}$/.test(pointer.sha256 || '')) refuse('Missing preservation pointer/hash');
  const target = path.resolve(root, pointer.path);
  const real = fs.realpathSync(target);
  if (real !== target || !real.startsWith(root + path.sep) || /(?:^|\/)(?:\.env[^/]*|\.ssh|PERSONAL)(?:\/|$)|\.(?:db|sqlite|jsonl|ndjson|pem|key)$/.test(pointer.path)) refuse('Restricted preservation pointer');
  if (!fs.statSync(real).isFile() || fs.statSync(real).size > 512 * 1024) refuse('Preservation document exceeds bounded read');
  const bytes = fs.readFileSync(real);
  if (bytes.length > 512 * 1024 || hash(bytes) !== pointer.sha256) refuse('Preservation bytes changed');
  return bytes;
}

export function checkHandoff(packet, root) {
  root = fs.realpathSync(root);
  if (packet.schemaVersion !== 1 || !id.test(packet.oldThread || '') || !id.test(packet.successorThread || '') || packet.oldThread === packet.successorThread) refuse('Distinct stable old/successor identities required');
  if (!Array.isArray(packet.compactions) || packet.compactions.length < 2 || packet.compactions.length > 100) refuse('Two observed compaction events required');
  const events = new Set();
  for (const event of packet.compactions) {
    if (!event || event.thread !== packet.oldThread || typeof event.id !== 'string' || !event.id || event.id.length > 160 || events.has(event.id) || !Number.isFinite(Date.parse(event.observedAt))) refuse('Compaction events must be distinct, dated and owner-scoped');
    events.add(event.id);
  }
  if (!Array.isArray(packet.inFlight) || packet.inFlight.length) refuse('Owner has not reached a settled boundary');
  if (packet.ownerReleaseConfirmed !== true) refuse('Existing owner has not confirmed release');
  if (!Array.isArray(packet.preservation) || !packet.preservation.length || packet.preservation.length > 12) refuse('Source/index/dirty/in-flight preservation evidence required');
  for (const ref of packet.preservation) readBounded(root, ref);
  const handoff = readBounded(root, packet.handoff).toString('utf8');
  if (!handoff.includes(packet.oldThread)) refuse('Handoff lacks the old owner identity');
  const readback = JSON.parse(readBounded(root, packet.readback).toString('utf8'));
  if (readback.verdict !== 'pass' || readback.readOnly !== true || readback.successorThread !== packet.successorThread || readback.oldThread !== packet.oldThread || readback.handoffSha256 !== packet.handoff.sha256) refuse('Cold readback is missing, failed or refers to another checkpoint');
  if (!Number.isInteger(readback.questionsAsked) || readback.questionsAsked < 0 || readback.questionsAsked > 1) refuse('Successor question bound exceeded');
  if (readback.unresolvedQuestion === true) refuse('Successor question is unresolved');
  for (const field of ['intent', 'authority', 'preservation', 'limits', 'next']) {
    if (typeof readback[field] !== 'string' || !readback[field].trim() || readback[field].length > 1600) refuse(`Cold readback lacks ${field}`);
  }
  if (packet.semanticAcceptance !== true) refuse('Responsible owner has not accepted readback semantics');
  for (const field of ['harness', 'model', 'provider']) {
    if (typeof packet.oldRoute?.[field] !== 'string' || !packet.oldRoute[field] || packet.oldRoute[field] !== packet.successorRoute?.[field]) refuse('Verified route differs; migration requires separate authority');
  }
  return { eligible: true, oldThread: packet.oldThread, successorThread: packet.successorThread, handoffSha256: packet.handoff.sha256, eventCount: events.size, runtimeAction: 'none', limits: ['Eligibility checks supplied owner evidence; it does not authenticate runtime events or independently judge prose.', 'Re-resolve both live identities and source hashes at release. Keep successor read-only until the old writer relinquishes ownership.'] };
}

export function recordCompaction(file, event) {
  if (!id.test(event.thread || '') || !event.id || typeof event.id !== 'string' || event.id.length > 160 || !Number.isFinite(Date.parse(event.observedAt))) refuse('Explicit stable event identity/time required');
  const parent = fs.realpathSync(path.dirname(file));
  if (parent !== path.resolve(path.dirname(file))) refuse('Symlink event parent refused');
  const lock = file + '.lock';
  const fd = fs.openSync(lock, 'wx', 0o600);
  try {
    if (fs.existsSync(file) && (fs.lstatSync(file).isSymbolicLink() || fs.statSync(file).size > 64 * 1024)) refuse('Unsafe event record');
    const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { thread: event.thread, events: [] };
    if (state.thread !== event.thread || !Array.isArray(state.events) || state.events.length >= 100) refuse('Different owner or bounded event record full');
    if (state.events.some(item => item.id === event.id)) return { count: state.events.length, duplicate: true };
    state.events.push(event);
    const temp = file + `.tmp-${process.pid}`;
    const out = fs.openSync(temp, 'wx', 0o600);
    try { fs.writeFileSync(out, JSON.stringify(state, null, 2) + '\n'); fs.fsyncSync(out); } finally { fs.closeSync(out); }
    fs.renameSync(temp, file);
    const dir = fs.openSync(parent, 'r');
    try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
    return { count: state.events.length, handoffDue: state.events.length >= 2, runtimeAction: 'none' };
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, file, rootOrThread, eventId] = process.argv.slice(2);
    let result;
    if (command === 'check') result = checkHandoff(JSON.parse(fs.readFileSync(file, 'utf8')), rootOrThread);
    else if (command === 'record-compaction') result = recordCompaction(file, { thread: rootOrThread, id: eventId, observedAt: new Date().toISOString() });
    else refuse('Usage: owner-handoff-check.mjs check PACKET.json WORKSPACE_ROOT | record-compaction OWNER_EVENTS.json THREAD EVENT_ID');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(JSON.stringify({ eligible: false, runtimeAction: 'none', reason: error.message })); process.exitCode = 1; }
}
