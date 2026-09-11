import { beforeEach, describe, expect, it, vi } from 'vitest';

const modernFileSystemMock = vi.hoisted(() => {
  type PathKind = 'file' | 'directory';

  const paths = new Map<string, PathKind>();
  const pickDirectoryAsync = vi.fn<(initialUri?: string) => Promise<{ uri: string }>>();
  const directoryCreates = vi.fn((uri: string, _options?: unknown) => {
    paths.set(uri, 'directory');
  });
  const directoryDeletes = vi.fn((uri: string) => {
    paths.delete(uri);
  });
  const fileCreates = vi.fn((uri: string, _options?: unknown) => {
    paths.set(uri, 'file');
  });
  const fileWrites = vi.fn((uri: string, _contents: string, _options?: unknown) => {
    if (paths.get(uri) === 'directory') {
      throw new Error('EISDIR');
    }
    paths.set(uri, 'file');
  });
  const fileCopies = vi.fn((from: string, to: string) => {
    if (paths.get(from) !== 'file') {
      throw new Error(`Missing source file: ${from}`);
    }
    if (paths.get(to) === 'directory') {
      throw new Error('EISDIR');
    }
    paths.set(to, 'file');
  });
  const fileMoves = vi.fn((from: string, to: string) => {
    if (paths.get(from) !== 'file') {
      throw new Error(`Missing source file: ${from}`);
    }
    if (paths.get(to) === 'directory') {
      throw new Error('EISDIR');
    }
    paths.delete(from);
    paths.set(to, 'file');
  });

  const resolveUri = (value: string | { uri: string }): string =>
    typeof value === 'string' ? value : value.uri;

  const getParentUri = (uri: string): string => {
    const trimmed = uri.replace(/\/+$/, '');
    const separatorIndex = trimmed.lastIndexOf('/');
    return separatorIndex > 'file://'.length ? trimmed.slice(0, separatorIndex) : trimmed;
  };

  class Directory {
    static pickDirectoryAsync: typeof pickDirectoryAsync | undefined = pickDirectoryAsync;
    uri: string;

    constructor(uri: string | { uri: string }) {
      this.uri = resolveUri(uri);
    }

    get exists() {
      return paths.get(this.uri) === 'directory';
    }

    create(options?: unknown) {
      directoryCreates(this.uri, options);
    }

    delete() {
      directoryDeletes(this.uri);
    }

    list() {
      return [];
    }

    info() {
      return {
        exists: this.exists,
        uri: this.uri,
      };
    }

    copy(destination: Directory) {
      paths.set(destination.uri, 'directory');
    }

    move(destination: Directory) {
      paths.delete(this.uri);
      paths.set(destination.uri, 'directory');
    }
  }

  class File {
    uri: string;

    constructor(uri: string | { uri: string }) {
      this.uri = resolveUri(uri);
    }

    get exists() {
      return paths.get(this.uri) === 'file';
    }

    get parentDirectory() {
      return new Directory(getParentUri(this.uri));
    }

    create(options?: unknown) {
      fileCreates(this.uri, options);
    }

    write(contents: string, options?: unknown) {
      fileWrites(this.uri, contents, options);
    }

    copy(destination: File) {
      fileCopies(this.uri, destination.uri);
    }

    move(destination: File) {
      fileMoves(this.uri, destination.uri);
    }

    delete() {
      paths.delete(this.uri);
    }

    info() {
      return {
        exists: this.exists,
        uri: this.uri,
      };
    }

    text() {
      return '';
    }

    base64() {
      return '';
    }
  }

  const Paths = {
    cache: { uri: 'file://cache/' },
    document: { uri: 'file://document/' },
    info: vi.fn((uri: string) => ({
      exists: paths.has(uri),
      isDirectory: paths.get(uri) === 'directory',
    })),
  };

  return {
    Directory,
    File,
    Paths,
    pickDirectoryAsync,
    directoryCreates,
    directoryDeletes,
    fileCreates,
    fileWrites,
    fileCopies,
    fileMoves,
    __getPath: (uri: string) => paths.get(uri),
    __reset: () => {
      Directory.pickDirectoryAsync = pickDirectoryAsync;
      pickDirectoryAsync.mockReset();
      paths.clear();
      directoryCreates.mockClear();
      directoryDeletes.mockClear();
      fileCreates.mockClear();
      fileWrites.mockClear();
      fileCopies.mockClear();
      fileMoves.mockClear();
      Paths.info.mockClear();
    },
    __setPath: (uri: string, kind: PathKind) => {
      paths.set(uri, kind);
    },
  };
});

const legacyFileSystemMock = vi.hoisted(() => ({
  __esModule: true,
  documentDirectory: 'file://document/',
  cacheDirectory: 'file://cache/',
  getInfoAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  readDirectoryAsync: vi.fn(),
  deleteAsync: vi.fn(),
  copyAsync: vi.fn(),
  moveAsync: vi.fn(),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: vi.fn() as ReturnType<typeof vi.fn> | undefined,
  },
}));

vi.mock('expo-file-system', () => modernFileSystemMock);
vi.mock('expo-file-system/legacy', () => legacyFileSystemMock);

describe('file-system wrapper', () => {
  beforeEach(() => {
    modernFileSystemMock.__reset();
    vi.clearAllMocks();
    legacyFileSystemMock.StorageAccessFramework.requestDirectoryPermissionsAsync = vi.fn()
      .mockResolvedValue({ granted: true, directoryUri: 'content://legacy/tree/export' });
  });

  it('falls back to the legacy directory picker when the modern ActivityResultLauncher rejects', async () => {
    const { StorageAccessFramework } = await import('./file-system');
    const initialUri = 'content://com.android.externalstorage.documents/tree/primary%3ADocuments';
    modernFileSystemMock.pickDirectoryAsync.mockRejectedValue(new Error('Attempting to launch an unregistered ActivityResultLauncher'));
    await expect(StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri)).resolves.toEqual({ granted: true, directoryUri: 'content://legacy/tree/export' });
    expect(modernFileSystemMock.pickDirectoryAsync).toHaveBeenCalledExactlyOnceWith(initialUri);
    expect(legacyFileSystemMock.StorageAccessFramework.requestDirectoryPermissionsAsync).toHaveBeenCalledExactlyOnceWith(initialUri);
  });

  it('treats Expo ERR_PICKER_CANCELLED as a real cancellation without opening another picker', async () => {
    const { StorageAccessFramework } = await import('./file-system');
    modernFileSystemMock.pickDirectoryAsync.mockRejectedValue(Object.assign(new Error('The file picker was cancelled by the user'), { code: 'ERR_PICKER_CANCELLED' }));
    await expect(StorageAccessFramework.requestDirectoryPermissionsAsync()).resolves.toEqual({ granted: false });
    expect(legacyFileSystemMock.StorageAccessFramework.requestDirectoryPermissionsAsync).not.toHaveBeenCalled();
  });

  it('does not classify an arbitrary error message as user cancellation', async () => {
    const { StorageAccessFramework } = await import('./file-system');
    modernFileSystemMock.pickDirectoryAsync.mockRejectedValue(new Error('The file picker was cancelled by the user'));
    await expect(StorageAccessFramework.requestDirectoryPermissionsAsync()).resolves.toMatchObject({ granted: true });
    expect(legacyFileSystemMock.StorageAccessFramework.requestDirectoryPermissionsAsync).toHaveBeenCalledOnce();
  });

  it('rethrows the original modern error when no legacy picker exists', async () => {
    const { StorageAccessFramework } = await import('./file-system');
    const error = new Error('Activity is unavailable');
    modernFileSystemMock.pickDirectoryAsync.mockRejectedValue(error);
    legacyFileSystemMock.StorageAccessFramework.requestDirectoryPermissionsAsync = undefined;
    await expect(StorageAccessFramework.requestDirectoryPermissionsAsync()).rejects.toBe(error);
  });

  it('propagates a failed legacy fallback instead of reporting cancellation', async () => {
    const { StorageAccessFramework } = await import('./file-system');
    const legacyError = new Error('Legacy launch failed');
    modernFileSystemMock.pickDirectoryAsync.mockRejectedValue(new Error('Modern launch failed'));
    legacyFileSystemMock.StorageAccessFramework.requestDirectoryPermissionsAsync!.mockRejectedValue(legacyError);
    await expect(StorageAccessFramework.requestDirectoryPermissionsAsync()).rejects.toBe(legacyError);
  });

  it('returns a successful modern directory without invoking legacy', async () => {
    const { StorageAccessFramework } = await import('./file-system');
    modernFileSystemMock.pickDirectoryAsync.mockResolvedValue({ uri: 'content://modern/tree/export' });
    await expect(StorageAccessFramework.requestDirectoryPermissionsAsync('content://initial')).resolves.toEqual({ granted: true, directoryUri: 'content://modern/tree/export' });
    expect(modernFileSystemMock.pickDirectoryAsync).toHaveBeenCalledExactlyOnceWith('content://initial');
    expect(legacyFileSystemMock.StorageAccessFramework.requestDirectoryPermissionsAsync).not.toHaveBeenCalled();
  });

  it('preserves the legacy result and initial URI when the modern picker is absent', async () => {
    const { StorageAccessFramework } = await import('./file-system');
    modernFileSystemMock.Directory.pickDirectoryAsync = undefined;
    const result = { granted: false };
    legacyFileSystemMock.StorageAccessFramework.requestDirectoryPermissionsAsync!.mockResolvedValue(result);
    await expect(StorageAccessFramework.requestDirectoryPermissionsAsync('content://initial')).resolves.toBe(result);
    expect(legacyFileSystemMock.StorageAccessFramework.requestDirectoryPermissionsAsync).toHaveBeenCalledExactlyOnceWith('content://initial');
  });

  it('repairs a stale directory at a file write target', async () => {
    const { EncodingType, writeAsStringAsync } = await import('./file-system');
    const targetUri = 'file://document/attachments/photo.jpg.tmp-123';
    modernFileSystemMock.__setPath(targetUri, 'directory');

    await writeAsStringAsync(targetUri, 'AQID', { encoding: EncodingType.Base64 });

    expect(modernFileSystemMock.directoryDeletes).toHaveBeenCalledWith(targetUri);
    expect(modernFileSystemMock.fileCreates).toHaveBeenCalledWith(targetUri, { overwrite: true });
    expect(modernFileSystemMock.fileCreates).not.toHaveBeenCalledWith(
      targetUri,
      expect.objectContaining({ intermediates: true })
    );
    expect(modernFileSystemMock.fileWrites).toHaveBeenCalledWith(
      targetUri,
      'AQID',
      { encoding: 'base64' }
    );
    expect(legacyFileSystemMock.writeAsStringAsync).not.toHaveBeenCalled();
    expect(modernFileSystemMock.__getPath(targetUri)).toBe('file');
  });

  it('repairs stale directory targets before file copy and move', async () => {
    const { copyAsync, moveAsync } = await import('./file-system');
    const copySourceUri = 'file://document/source.jpg';
    const copyTargetUri = 'file://document/attachments/source.jpg.tmp-copy';
    const moveSourceUri = 'file://document/source-2.jpg';
    const moveTargetUri = 'file://document/attachments/source-2.jpg';
    modernFileSystemMock.__setPath(copySourceUri, 'file');
    modernFileSystemMock.__setPath(copyTargetUri, 'directory');
    modernFileSystemMock.__setPath(moveSourceUri, 'file');
    modernFileSystemMock.__setPath(moveTargetUri, 'directory');

    await copyAsync({ from: copySourceUri, to: copyTargetUri });
    await moveAsync({ from: moveSourceUri, to: moveTargetUri });

    expect(modernFileSystemMock.directoryDeletes).toHaveBeenCalledWith(copyTargetUri);
    expect(modernFileSystemMock.directoryDeletes).toHaveBeenCalledWith(moveTargetUri);
    expect(modernFileSystemMock.fileCopies).toHaveBeenCalledWith(copySourceUri, copyTargetUri);
    expect(modernFileSystemMock.fileMoves).toHaveBeenCalledWith(moveSourceUri, moveTargetUri);
    expect(modernFileSystemMock.__getPath(copyTargetUri)).toBe('file');
    expect(modernFileSystemMock.__getPath(moveTargetUri)).toBe('file');
    expect(modernFileSystemMock.__getPath(moveSourceUri)).toBeUndefined();
    expect(legacyFileSystemMock.copyAsync).not.toHaveBeenCalled();
    expect(legacyFileSystemMock.moveAsync).not.toHaveBeenCalled();
  });
});
