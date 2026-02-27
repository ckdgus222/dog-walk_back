import { mkdir, rename } from 'fs/promises';
import { dirname, join } from 'path';

export const DOG_PROFILE_TEMP_PREFIX = 'tmp/media/';
const TMP_PREFIX = 'tmp/';

export const toUploadsUrl = (storageKey: string): string =>
  `/uploads/${storageKey}`;

export const resolveFinalStorageKey = (storageKey: string): string =>
  storageKey.startsWith(TMP_PREFIX)
    ? storageKey.slice(TMP_PREFIX.length)
    : storageKey;

export const buildAbsoluteUploadPath = (storageKey: string): string =>
  join(process.cwd(), 'uploads', storageKey);

export const moveUploadFile = async (
  sourceStorageKey: string,
  targetStorageKey: string,
): Promise<void> => {
  if (sourceStorageKey === targetStorageKey) {
    return;
  }

  const sourcePath = buildAbsoluteUploadPath(sourceStorageKey);
  const targetPath = buildAbsoluteUploadPath(targetStorageKey);

  await mkdir(dirname(targetPath), { recursive: true });
  await rename(sourcePath, targetPath);
};
