const fs = require('node:fs');
const path = require('node:path');
const { AndroidConfig, withFinalizedMod } = require('@expo/config-plugins');
const { deduplicateManifestIntents } = require('./manifest-intents.cjs');

function rewriteTree(root, scheme, packageName) {
    if (!fs.existsSync(root)) return;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const target = path.join(root, entry.name);
        if (entry.isDirectory()) rewriteTree(target, scheme, packageName);
        else if (/\.(xml|kt|java)$/.test(entry.name)) {
            const before = fs.readFileSync(target, 'utf8');
            let after = before.replace(/\/\/ Todo Moe retains upstream patch marker: mindwtr:\/\/\/focus\r?\n/g, '')
                .replace(/(?:mindwtr|todomoe(?:-dev)?):\/\//g, `${scheme}://`)
                .replace(/android:scheme="(?:mindwtr|todomoe(?:-dev)?)"/g, `android:scheme="${scheme}"`)
                .replace(/\.scheme\("(?:mindwtr|todomoe(?:-dev)?)"\)/g, `.scheme("${scheme}")`)
                .replace(/(?:tech\.dongdongbh\.mindwtr|io\.github\.xiaolexldw\.todomoe(?:\.dev)?)\.action\./g, `${packageName}.action.`);
            // Preserve the upstream patch registry's idempotence guard without
            // leaving an executable link to the upstream app.
            if (entry.name === 'AlarmUtil.java' && after.includes(`Uri.parse("${scheme}:///focus")`)) {
                after = '// Todo Moe retains upstream patch marker: mindwtr:///focus\n' + after;
            }
            if (after !== before) fs.writeFileSync(target, after);
        }
    }
}

module.exports = (config, { scheme }) => {
    if (!/^todomoe(?:-dev)?$/.test(scheme)) throw new Error('Invalid Todo Moe scheme.');
    const packageName = config.android.package;
    // Expo evaluates dangerous mods before XML/Kotlin writers, in reverse
    // registration order. Finalized is required for generated identity changes.
    return withFinalizedMod(config, ['android', async (mod) => {
        rewriteTree(path.join(mod.modRequest.platformProjectRoot, 'app', 'src'), scheme, packageName);
        // Upstream plugins append share filters or look for the pre-brand
        // identity. Repeated prebuilds therefore recreate equivalent entries.
        // Normalize only exact duplicates after all identity rewrites finished.
        const manifestPath = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
        if (fs.existsSync(manifestPath)) {
            const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(manifestPath);
            if (deduplicateManifestIntents(manifest)) {
                await AndroidConfig.Manifest.writeAndroidManifestAsync(manifestPath, manifest);
            }
        }
        // Upstream patches this dependency's notification click path at prebuild.
        try {
            const moduleRoot = path.dirname(require.resolve('react-native-alarm-notification/package.json', { paths: [mod.modRequest.projectRoot] }));
            rewriteTree(path.join(moduleRoot, 'android', 'src'), scheme, packageName);
        } catch (error) {
            if (error.code !== 'MODULE_NOT_FOUND') throw error;
        }
        return mod;
    }]);
};
module.exports.rewriteTree = rewriteTree;
