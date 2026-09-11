/** Capture is an action, never a selected page. Keep GTD routes reachable in More. */
export const MOE_TABS = ['focus', 'projects', 'inbox'] as const;
export function moeTabLabel(route: string, chinese: boolean) {
  const labels: Record<string, [string, string]> = { focus: ['今天', 'Today'], projects: ['清单', 'Lists'], inbox: ['收件箱', 'Inbox'] };
  return labels[route]?.[chinese ? 0 : 1] ?? route;
}
