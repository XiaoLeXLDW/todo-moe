/** Worklet-safe geometry shared by pointer input, selection and optical props. */
export function lensSlotCenter(index: number, width: number, count: number, inset = 5) {
    'worklet';
    const safeWidth = Math.max(1, width);
    const padding = Math.min(inset, (safeWidth - 1) / 2);
    const usable = safeWidth - padding * 2;
    return (padding + usable * (Math.max(0, Math.min(count - 1, index)) + 0.5) / count) / safeWidth;
}

export function lensSlotAt(x: number, width: number, count: number, inset = 5) {
    'worklet';
    const safeWidth = Math.max(1, width);
    const padding = Math.min(inset, (safeWidth - 1) / 2);
    const usable = safeWidth - padding * 2;
    return Math.max(0, Math.min(count - 1, Math.floor((x - padding) / usable * count)));
}

export function clampLensCenter(x: number, width: number, count: number, inset = 5) {
    'worklet';
    const normalized = x / Math.max(1, width);
    return Math.max(lensSlotCenter(0, width, count, inset), Math.min(lensSlotCenter(count - 1, width, count, inset), normalized));
}
