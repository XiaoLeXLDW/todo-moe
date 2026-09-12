/** Small shared vocabulary for the content surfaces and floating controls. */
export const MOE_VISUAL = {
    pageGutter: 20,
    contentMaxWidth: 760,
    panelRadius: 28,
    cardRadius: 20,
    bar: { height: 64, inset: 5, gap: 12, maxWidth: 520, captureSize: 60 },
    motion: {
        pressMs: 110,
        settleMs: 180,
        keyboardMs: 220,
        lensSpring: { damping: 24, stiffness: 310, mass: 0.8 },
    },
} as const;
