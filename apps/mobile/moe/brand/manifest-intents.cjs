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

module.exports = { deduplicateManifestIntents };
