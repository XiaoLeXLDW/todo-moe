export type GlassMode = 'off' | 'soft' | 'liquid';
export type GlassCapabilities = { soft: boolean; liquid: boolean; reason: string };

export function resolveGlassMode(mode: GlassMode, capabilities: GlassCapabilities, reducedMotion = false): GlassMode {
    if (mode === 'off' || !capabilities.soft) return 'off';
    if (mode === 'liquid' && capabilities.liquid && !reducedMotion) return 'liquid';
    return 'soft';
}

export function platformGlassCapabilities(platform: string, version: number, nativeAvailable: boolean): GlassCapabilities {
    if (platform !== 'android' || !nativeAvailable) {
        return { soft: false, liquid: false, reason: '当前平台使用清晰实底' };
    }
    return {
        soft: version >= 31,
        liquid: version >= 33,
        reason: version >= 33 ? '原生模糊与实验液态折射；实际效果需设备验证'
            : version >= 31 ? '支持原生模糊；液态自动降为柔和'
                : '当前 Android 使用清晰实底',
    };
}
