const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const storage = new Map();
let serverVersion = 10;
let conflict = false;
const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
const supabase = {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { payload: {}, version: serverVersion }, error: null }) }) }) }),
  rpc: async (_, args) => {
    assert.equal(args.p_expected_version, serverVersion);
    return { data: conflict ? [] : [{ new_version: ++serverVersion }], error: null };
  },
};
const source = fs.readFileSync('src/services/cloudPersistence.ts', 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const exportsObject = {};
vm.runInNewContext(outputText, { exports: exportsObject, require: () => ({ supabase }), localStorage });
(async () => {
  await exportsObject.restoreCloudSnapshot();
  assert.equal(exportsObject.getSnapshotVersion(), 10);
  // Another tab updates shared storage; this tab has not loaded that version.
  localStorage.setItem('kiri_app_state_version', '999');
  assert.equal(exportsObject.getSnapshotVersion(), 10);
  await exportsObject.saveCloudSnapshot({});
  assert.equal(exportsObject.getSnapshotVersion(), 11);
  assert.equal(localStorage.getItem('kiri_app_state_version'), '11');
  conflict = true;
  await assert.rejects(exportsObject.saveCloudSnapshot({}), /SYNC_VERSION_CONFLICT/);
  assert.equal(exportsObject.getSnapshotVersion(), 11);
  console.log('PASS: version is isolated per tab, save acknowledges RPC, conflict retains version');
})().catch(error => { console.error(error); process.exitCode = 1; });
