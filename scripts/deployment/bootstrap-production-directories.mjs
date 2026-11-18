import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function bootstrapProductionDirectories({ root, uid, gid, fileSystem = fs, log = console.log }) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new TypeError("The production root must be an absolute path.");
  }
  if (!Number.isSafeInteger(uid) || !Number.isSafeInteger(gid) || uid < 0 || gid < 0) {
    throw new TypeError("The deployment UID and GID must be non-negative integers.");
  }

  const directories = [
    root,
    path.join(root, "scripts"),
    path.join(root, "scripts", "deployment"),
    path.join(root, "deploy"),
    path.join(root, "deploy", "production"),
    path.join(root, "deploy", "systemd-production"),
  ];

  for (const directory of directories) {
    let created = false;
    let stats;

    try {
      stats = fileSystem.lstatSync(directory);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;

      try {
        fileSystem.mkdirSync(directory, { mode: 0o755 });
        created = true;
      } catch (createError) {
        if (createError.code !== "EEXIST") throw createError;
      }

      stats = fileSystem.lstatSync(directory);
    }

    if (stats.isSymbolicLink()) {
      throw new Error(`Refusing symbolic link in production path: ${directory}`);
    }
    if (!stats.isDirectory()) {
      throw new Error(`Refusing non-directory in production path: ${directory}`);
    }

    if (created) {
      try {
        fileSystem.chmodSync(directory, 0o755);
        fileSystem.chownSync(directory, uid, gid);
      } catch (error) {
        throw new Error(
          `Created ${directory}, but could not set its owner to ${uid}:${gid}; inspect it before retrying.`,
          { cause: error },
        );
      }
      stats = fileSystem.lstatSync(directory);
    }

    if (stats.uid !== uid || stats.gid !== gid) {
      throw new Error(
        `Refusing existing production directory ${directory}: owner is ${stats.uid}:${stats.gid}, expected ${uid}:${gid}.`,
      );
    }

    log(`${created ? "Created" : "Verified"} production directory ${directory} (${uid}:${gid}).`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const uidValue = process.env.BOOTSTRAP_UID;
    const gidValue = process.env.BOOTSTRAP_GID;
    if (!/^\d+$/.test(uidValue ?? "") || !/^\d+$/.test(gidValue ?? "")) {
      throw new TypeError("BOOTSTRAP_UID and BOOTSTRAP_GID must be non-negative integer strings.");
    }
    bootstrapProductionDirectories({
      root: process.env.BOOTSTRAP_ROOT,
      uid: Number(uidValue),
      gid: Number(gidValue),
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

export { bootstrapProductionDirectories };
