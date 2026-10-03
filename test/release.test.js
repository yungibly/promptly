import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archiveName, targets, version, validateTag, verifyArtifacts, formula } from '../scripts/release.js';

test('release refuses mismatched tags and missing or damaged distribution artifacts', () => {
  validateTag(`v${version}`);
  assert.throws(() => validateTag('v0.0.0'), /must match/);
  assert.throws(() => validateTag(undefined), /must match/);
  const directory = mkdtempSync(join(tmpdir(), 'promptly-release-'));
  try {
    assert.throws(() => verifyArtifacts(directory), /ENOENT/);
    for (const target of targets) {
      const name = archiveName(target);
      const bytes = `sample-${target}`;
      writeFileSync(join(directory, name), bytes);
      writeFileSync(join(directory, `${name}.sha256`), `${createHash('sha256').update(bytes).digest('hex')}  ${name}\n`);
    }
    const hashes = verifyArtifacts(directory);
    const ruby = formula(hashes);
    for (const target of targets) {
      assert.ok(ruby.includes(archiveName(target)));
      assert.ok(ruby.includes(hashes[target]));
    }
    assert.throws(() => formula({ ...hashes, [targets[0]]: '"; system "bad' }), /Invalid checksum/);
    writeFileSync(join(directory, archiveName(targets[0])), 'corrupted');
    assert.throws(() => verifyArtifacts(directory), /Checksum mismatch/);
    writeFileSync(join(directory, 'unexpected.tar.gz'), 'extra');
    assert.throws(() => verifyArtifacts(directory), /Unexpected archives/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
