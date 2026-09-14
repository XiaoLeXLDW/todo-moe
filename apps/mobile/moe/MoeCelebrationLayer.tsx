import React, { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

type LayerHost = { put: (id: string, node: React.ReactNode) => void; remove: (id: string) => void };
const Context = createContext<LayerHost | null>(null);

/** One per native window. Only transient decoration is portalled here. */
export function MoeCelebrationLayerHost({ children, active = true, scopeKey = '' }: { children: React.ReactNode; active?: boolean; scopeKey?: string }) {
  const [entries, setEntries] = useState<Map<string, React.ReactNode>>(() => new Map());
  const lastScope = useRef(scopeKey);
  const clear = useCallback(() => setEntries(current => current.size ? new Map() : current), []);
  useLayoutEffect(() => {
    if (!active || lastScope.current !== scopeKey) clear();
    lastScope.current = scopeKey;
  }, [active, clear, scopeKey]);
  useEffect(() => {
    const change = AppState.addEventListener('change', state => { if (state !== 'active') clear(); });
    const blur = AppState.addEventListener('blur', clear);
    return () => { change.remove(); blur.remove(); };
  }, [clear]);
  const put = useCallback((id: string, node: React.ReactNode) => {
    setEntries(current => {
      if (current.get(id) === node) return current;
      const next = new Map(current); next.set(id, node); return next;
    });
  }, []);
  const remove = useCallback((id: string) => {
    setEntries(current => {
      if (!current.has(id)) return current;
      const next = new Map(current); next.delete(id); return next;
    });
  }, []);
  const host = useMemo(() => ({ put, remove }), [put, remove]);
  return <Context.Provider value={host}>
    <View style={styles.root} collapsable={false}>
      {children}
      <View testID="moe-celebration-layer" pointerEvents="box-none" style={styles.layer}>
        {active && [...entries].map(([id, node]) => <React.Fragment key={id}>{node}</React.Fragment>)}
      </View>
    </View>
  </Context.Provider>;
}

/** The declaration stays in its route/modal so existing Undo and focus cleanup owns it. */
export function MoeCelebrationLayer({ children }: { children: React.ReactNode }) {
  const host = useContext(Context);
  const id = useId();
  useLayoutEffect(() => {
    if (!host) return;
    host.put(id, children);
  }, [children, host, id]);
  useLayoutEffect(() => () => host?.remove(id), [host, id]);
  return host ? null : <>{children}</>;
}

export function MoeCelebrationStage({ children }: { children: React.ReactNode }) {
  return <View testID="moe-celebration-stage" pointerEvents="none" style={styles.stage}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 60, elevation: 60, overflow: 'visible' },
  stage: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'visible' },
});
