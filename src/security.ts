// SPDX-FileCopyrightText: 2026 Mohammad Allatayfeh
// SPDX-License-Identifier: MPL-2.0

import { chmod, lstat, mkdir } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { OperationalError } from "./errors";

export function normalizeRelativePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function resolveInside(workspace: string, candidate: string, label: string): string {
  if (!candidate.trim()) {
    throw new OperationalError(`${label} cannot be empty.`);
  }
  if (isAbsolute(candidate)) {
    throw new OperationalError(`${label} must be relative to the repository workspace.`);
  }
  const root = resolve(workspace);
  const target = resolve(root, candidate);
  const relation = relative(root, target);
  if (relation === "" || (!relation.startsWith(`..${sep}`) && relation !== ".." && !isAbsolute(relation))) {
    return target;
  }
  throw new OperationalError(`${label} escapes the repository workspace.`);
}

export async function rejectSymlink(path: string, label: string): Promise<void> {
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) {
      throw new OperationalError(`${label} cannot be a symbolic link.`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function rejectSymlinkPath(workspace: string, targetPath: string, label: string): Promise<void> {
  const root = resolve(workspace);
  const target = resolve(targetPath);
  const relation = relative(root, target);
  if (relation === ".." || relation.startsWith(`..${sep}`) || isAbsolute(relation)) {
    throw new OperationalError(`${label} escapes the repository workspace.`);
  }
  await rejectSymlink(root, "Repository workspace");
  let cursor = root;
  for (const component of relation.split(sep).filter(Boolean)) {
    cursor = resolve(cursor, component);
    await rejectSymlink(cursor, label);
  }
}

export async function createContainedDirectory(workspace: string, relativePath: string): Promise<string> {
  const root = resolve(workspace);
  const target = resolveInside(root, relativePath, "Output directory");
  if (target === root) throw new OperationalError("Output directory cannot be the repository workspace root.");
  await rejectSymlinkPath(root, target, "Output directory path");
  await mkdir(target, { recursive: true, mode: 0o700 });
  await rejectSymlinkPath(root, target, "Output directory path");
  await chmod(target, 0o700);
  return target;
}
