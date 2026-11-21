import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { initViewport, ViewportApi } from './viewport';

export function Viewport() {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ViewportApi | null>(null);
  const project = useStore(s => s.project);
  const selection = useStore(s => s.selection);
  const tool = useStore(s => s.tool);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const api = initViewport(mount, {
      onSelect: (id, additive) => {
        useStore.getState().select(id, additive);
      },
      onTransformStart: () => {
        useStore.getState().beginTransformForSelection();
      },
      onTransformCommit: (id, transform) => {
        useStore.getState().commitTransform(id, transform);
      }
    });
    apiRef.current = api;
    return () => {
      api.dispose();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.sync(project, selection, tool);
  }, [project, selection, tool]);

  useEffect(() => {
    if (apiRef.current && selection.length === 1) {
      apiRef.current.focus(selection[0]);
    }
  }, [selection]);

  return <div className="viewport-wrap" ref={mountRef} aria-label="Visualização 3D" />;
}
