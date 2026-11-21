import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Vec3 } from '../../core/types';
import { classInfo, FONTS } from '../../core/classes';
import { Icon } from '../../ui/Icons';
import { BottomSheet } from '../../ui/BottomSheet';

function Vec3Editor({ value, step = 0.5, onChange }: { value: Vec3; step?: number; onChange: (v: Vec3) => void }) {
  const [draft, setDraft] = useState({ x: String(value.x), y: String(value.y), z: String(value.z) });
  useEffect(() => {
    setDraft({ x: String(value.x), y: String(value.y), z: String(value.z) });
  }, [value.x, value.y, value.z]);
  const commit = (axis: 'x' | 'y' | 'z', raw: string) => {
    setDraft(prev => ({ ...prev, [axis]: raw }));
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      onChange({ x: value.x, y: value.y, z: value.z, [axis]: parsed } as Vec3);
    }
  };
  return (
    <div className="vec3">
      {(['x', 'y', 'z'] as const).map(axis => (
        <label key={axis} className="vec3-axis">
          <span>{axis.toUpperCase()}</span>
          <input
            type="number"
            inputMode="decimal"
            step={step}
            value={draft[axis]}
            onChange={e => commit(axis, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

export function Properties() {
  const project = useStore(s => s.project);
  const selection = useStore(s => s.selection);
  const setProperty = useStore(s => s.setProperty);
  const updateInstance = useStore(s => s.updateInstance);
  const deleteInstances = useStore(s => s.deleteInstances);
  const duplicateInstances = useStore(s => s.duplicateInstances);
  const groupSelection = useStore(s => s.groupSelection);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<{ key: string; value: string } | null>(null);

  if (!project) return null;
  const subject = selection.length === 1 ? project.instances[selection[0]] : null;

  if (selection.length === 0) {
    return (
      <div className="properties empty-state">
        <Icon name="sliders" size={22} />
        <p>Selecione um objeto no Explorer ou na visualização 3D para editar suas propriedades.</p>
        <p className="hint">Dica: use a ferramenta Inserir para adicionar Partes, luzes, efeitos e scripts.</p>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="properties">
        <div className="multi-selected">
          <p>{selection.length} objetos selecionados</p>
          <button className="action" onClick={() => duplicateInstances(selection)}>
            <Icon name="copy" /> Duplicar seleção
          </button>
          <button className="action" onClick={() => groupSelection()}>
            <Icon name="group" /> Agrupar em Model
          </button>
          <button className="action danger" onClick={() => { if (confirmDelete) { deleteInstances(selection); setConfirmDelete(false); } else setConfirmDelete(true); }}>
            <Icon name="trash" /> {confirmDelete ? 'Toque de novo para confirmar' : 'Excluir seleção'}
          </button>
        </div>
      </div>
    );
  }

  const info = classInfo(subject.className);
  const defs = info?.propertyDefs ?? [];

  const renderEditor = (def: (typeof defs)[number]) => {
    const value = subject.properties[def.key];
    const coalesceId = subject.id;
    switch (def.kind) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            className="switch"
            checked={value === true}
            onChange={e => setProperty(coalesceId, def.key, e.target.checked)}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            inputMode="decimal"
            step={def.step ?? 1}
            min={def.min}
            max={def.max}
            value={typeof value === 'number' ? value : ''}
            onChange={e => {
              const parsed = parseFloat(e.target.value);
              if (!Number.isNaN(parsed)) setProperty(coalesceId, def.key, parsed);
            }}
          />
        );
      case 'color':
        return (
          <div className="color-input">
            <input
              type="color"
              value={typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#a3a6ab'}
              onChange={e => setProperty(coalesceId, def.key, e.target.value)}
            />
            <input
              type="text"
              value={draft?.key === def.key ? draft.value : String(value ?? '')}
              onChange={e => setDraft({ key: def.key, value: e.target.value })}
              onBlur={e => {
                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setProperty(coalesceId, def.key, e.target.value);
                setDraft(null);
              }}
            />
          </div>
        );
      case 'vec3':
        return (
          <Vec3Editor
            value={(value as Vec3) ?? { x: 0, y: 0, z: 0 }}
            step={def.step}
            onChange={v => setProperty(coalesceId, def.key, v)}
          />
        );
      case 'enum':
        return (
          <select value={String(value ?? '')} onChange={e => setProperty(coalesceId, def.key, e.target.value)}>
            {(def.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={draft?.key === def.key ? draft.value : String(value ?? '')}
            onChange={e => setDraft({ key: def.key, value: e.target.value })}
            onBlur={e => {
              setProperty(coalesceId, def.key, e.target.value);
              setDraft(null);
            }}
          />
        );
    }
  };

  return (
    <div className="properties">
      <div className="prop-head">
        <label className="prop-name">
          <span>Nome</span>
          <input
            value={draft?.key === '__name' ? draft.value : subject.name}
            onChange={e => setDraft({ key: '__name', value: e.target.value })}
            onBlur={e => {
              if (e.target.value.trim()) updateInstance(subject.id, { name: e.target.value.trim() });
              setDraft(null);
            }}
          />
        </label>
        <span className="class-badge">{info?.category ?? 'Objeto'} · {subject.className}</span>
      </div>
      <div className="prop-list">
        {defs.map(def => (
          <div className="prop-row" key={def.key}>
            <span className="prop-label">{def.label}</span>
            <div className="prop-editor">{renderEditor(def)}</div>
          </div>
        ))}
        {defs.length === 0 && <p className="hint">Este objeto não tem propriedades editáveis nesta versão.</p>}
        {info && (
          <div className="prop-presets">
            <span className="prop-label">Material rápido</span>
            <div className="chip-row">
              {(['Plastic', 'SmoothPlastic', 'Neon', 'Metal', 'Wood', 'Glass', 'Concrete'] as string[]).map(m => (
                <button
                  key={m}
                  className={`chip ${subject.properties.Material === m ? 'active' : ''}`}
                  onClick={() => subject.properties.Material !== undefined && setProperty(subject.id, 'Material', m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="prop-actions">
          <button className="action" onClick={() => duplicateInstances([subject.id])}>
            <Icon name="copy" size={15} /> Duplicar
          </button>
          {subject.className === 'Model' && (
            <button className="action" onClick={() => useStore.getState().ungroup(subject.id)}>
              <Icon name="layers" size={15} /> Desagrupar
            </button>
          )}
          <button className="action danger" onClick={() => { if (confirmDelete) { deleteInstances([subject.id]); setConfirmDelete(false); } else setConfirmDelete(true); }}>
            <Icon name="trash" size={15} /> {confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const PROPERTY_FONTS = FONTS;
