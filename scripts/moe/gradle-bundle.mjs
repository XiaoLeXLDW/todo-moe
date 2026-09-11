const START = '// @todo-moe:always-rebundle-release:start';
const END = '// @todo-moe:always-rebundle-release:end';

const BLOCK = `${START}
// RN's declared inputs omit images, JSON and workspace sources outside mobile.
// Keep native tasks incremental; always recreate only the release JS bundle.
tasks.matching { it.name == 'createBundleReleaseJsAndAssets' }.configureEach {
    outputs.upToDateWhen { false }
    outputs.doNotCacheIf('Todo Moe release bundle inputs include assets and workspace sources') { true }
}
${END}`;

/** Append only the app's JS-bundle rule; do not rewrite generated native config. */
export function ensureFreshReleaseBundle(source) {
    const starts = source.split(START).length - 1;
    const ends = source.split(END).length - 1;
    if (starts || ends) {
        const start = source.indexOf(START);
        const end = source.indexOf(END);
        if (starts !== 1 || ends !== 1 || end < start ||
            source.slice(start, end + END.length).replaceAll('\r\n', '\n') !== BLOCK) {
            throw new Error('Unexpected Todo Moe release-bundle rule; refusing duplicate or modified injection.');
        }
        return source;
    }
    if (!/apply plugin:\s*["']com\.android\.application["']/.test(source)) {
        throw new Error('Expected the generated Android app build.gradle.');
    }
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    return source + (source.endsWith('\n') ? '' : newline) + newline + BLOCK.replaceAll('\n', newline) + newline;
}
