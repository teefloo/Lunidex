const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { bootstrapProductionDirectories } = require("./bootstrap-production-directories.cjs");

function withTempDirectory(run) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "lunidex-production-bootstrap-"));
  try {
    run(temporaryDirectory);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

test("creates missing production directories with the requested owner", () => {
  withTempDirectory((temporaryDirectory) => {
    const root = path.join(temporaryDirectory, "opt", "lunidex-production");
    const uid = process.getuid();
    const gid = process.getgid();
    fs.mkdirSync(path.dirname(root), { recursive: true });

    bootstrapProductionDirectories({ root, uid, gid, log: () => {} });

    for (const directory of [
      root,
      path.join(root, "scripts"),
      path.join(root, "scripts", "deployment"),
      path.join(root, "deploy"),
      path.join(root, "deploy", "production"),
      path.join(root, "deploy", "systemd-production"),
    ]) {
      const stats = fs.lstatSync(directory);
      assert.equal(stats.isDirectory(), true);
      assert.equal(stats.uid, uid);
      assert.equal(stats.gid, gid);
    }
  });
});

test("refuses a symlink in the production path", () => {
  withTempDirectory((temporaryDirectory) => {
    const target = path.join(temporaryDirectory, "target");
    const root = path.join(temporaryDirectory, "lunidex-production");
    fs.mkdirSync(target);
    fs.symlinkSync(target, root);

    assert.throws(
      () => bootstrapProductionDirectories({ root, uid: process.getuid(), gid: process.getgid(), log: () => {} }),
      /Refusing symbolic link/,
    );
  });
});

test("refuses a non-directory in the production path", () => {
  withTempDirectory((temporaryDirectory) => {
    const root = path.join(temporaryDirectory, "lunidex-production");
    fs.writeFileSync(root, "keep existing file");

    assert.throws(
      () => bootstrapProductionDirectories({ root, uid: process.getuid(), gid: process.getgid(), log: () => {} }),
      /Refusing non-directory/,
    );
    assert.equal(fs.readFileSync(root, "utf8"), "keep existing file");
  });
});

test("refuses an existing directory with a different expected UID or GID", () => {
  withTempDirectory((temporaryDirectory) => {
    const root = path.join(temporaryDirectory, "lunidex-production");
    fs.mkdirSync(root);
    const wrongUid = process.getuid() + 1;
    const wrongGid = process.getgid() + 1;

    assert.throws(
      () => bootstrapProductionDirectories({ root, uid: wrongUid, gid: wrongGid, log: () => {} }),
      /Refusing existing production directory/,
    );
    assert.equal(fs.lstatSync(root).uid, process.getuid());
    assert.equal(fs.lstatSync(root).gid, process.getgid());
  });
});
