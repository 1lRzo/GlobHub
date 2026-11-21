import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { InstanceId } from '../../core/types';
import { INSERT_CATEGORIES } from '../../core/classes';
import { cameraAnchor } from '../../editor3d/viewport';
import { Icon, iconForClass } from '../../ui/Icons';

export function InsertMenu({ parentId, onClose }: { parentId: InstanceId | null; onClose: () => void }) {
  const project = useStore(s => s.project);
  const [category, setCategory] = useState(INSERT_CATEGORIES[0].label);

  if (!project) return null;

  const insert = (className: string) => {
    const state = useStore.getState();
    if (!state.project) return;
    const id = addInstanceAt(className, parentId, state);
    if (id) state.showToast(`${className} adicionado.`);
    onClose();
  };

  const current = INSERT_CATEGORIES.find(c => c.label === category) ?? INSERT_CATEGORIES[0];

  return (
    <div className="insert-menu">
      <div className="tab-row" role="tablist">
        {INSERT_CATEGORIES.map(c => (
          <button
            key={c.label}
            role="tab"
            aria-selected={c.label === category}
            className={`tab ${c.label === category ? 'active' : ''}`}
            onClick={() => setCategory(c.label)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="insert-grid">
        {current.classes.map(className => (
          <button key={className} className="insert-card" onClick={() => insert(className)}>
            <span className="insert-icon"><Icon name={iconForClass(className)} size={20} /></span>
            <span className="insert-label">{className}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function addInstanceAt(className: string, parentId: InstanceId | null, state: ReturnType<typeof useStore.getState>): InstanceId | null {
  const anchor = cameraAnchor;
  const props =
    className === 'Part' || className === 'WedgePart' || className === 'CornerWedgePart' || className === 'TrussPart' || className === 'MeshPart'
      ? { Position: { x: anchor.x, y: anchor.y, z: anchor.z } }
      : undefined;
  return state.addInstance(className, parentId ?? null, props);
}
