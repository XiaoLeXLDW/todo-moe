// XML attribute order is immaterial; array order, every attribute/value and
// unknown child element remain part of the comparison. Do not merge filters
// merely because they share an action, scheme, host, path or MIME type.
function fingerprint(value) {
    if (Array.isArray(value)) return ['array', value.map(fingerprint)];
    if (value && typeof value === 'object') {
        return ['object', Object.keys(value).sort().map((key) => [key, fingerprint(value[key])])];
    }
    return [typeof value, value];
}

function unique(values) {
    const seen = new Set();
    return values.filter((value) => {
        const key = JSON.stringify(fingerprint(value));
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function deduplicateManifestIntents(manifest) {
    let changed = false;
    for (const application of manifest.manifest?.application ?? []) {
        for (const type of ['activity', 'activity-alias', 'receiver', 'service']) {
            for (const component of application[type] ?? []) {
                const filters = component['intent-filter'];
                if (!Array.isArray(filters)) continue;
                for (const filter of filters) {
                    for (const child of ['action', 'category', 'data']) {
                        if (!Array.isArray(filter[child])) continue;
                        const nodes = unique(filter[child]);
                        if (nodes.length !== filter[child].length) {
                            filter[child] = nodes;
                            changed = true;
                        }
                    }
                }
                const remaining = unique(filters);
                if (remaining.length !== filters.length) {
                    component['intent-filter'] = remaining;
                    changed = true;
                }
            }
        }
    }
    return changed;
}

function removeOtherChannelLegacyWidgetReceiver(manifest, expectedPackage) {
    const packages = ['io.github.xiaolexldw.todomoe', 'io.github.xiaolexldw.todomoe.dev'];
    if (!packages.includes(expectedPackage)) throw new Error('Unknown Todo Moe widget package; refusing receiver cleanup.');
    const otherPackage = packages.find((name) => name !== expectedPackage);
    const obsoleteName = `${otherPackage}.widget.TasksWidget`;
    let changed = false;
    for (const application of manifest.manifest?.application ?? []) {
        if (!Array.isArray(application.receiver)) continue;
        // The upstream plugin leaves this fully qualified compatibility receiver
        // after a channel switch. Only the other known Todo Moe channel is stale:
        // relative names, module providers and all other components are retained.
        const receivers = application.receiver.filter((entry) => entry?.$?.['android:name'] !== obsoleteName);
        if (receivers.length !== application.receiver.length) {
            application.receiver = receivers;
            changed = true;
        }
    }
    return changed;
}

module.exports = { deduplicateManifestIntents, removeOtherChannelLegacyWidgetReceiver };
