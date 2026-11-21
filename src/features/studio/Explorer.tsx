import { useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { RbxInstance, InstanceId } from '../../core/types';
import { classInfo, isContainer } from '../../core/classes';
import { iconForClass, Icon } from '../../ui/Icons';
import { BottomSheet } from '../../ui/BottomSheet';
import { InsertMenu } from './InsertMenu';

function classIconColor(instance: RbxInstance): string {
  const info = classInfo(instance.className);
  switch (info?.category) {
    case 'Serviço': return '#8a93a3';
    case 'Scripts': return '#b07cff';
    case 'Luzes': return '#ffd66b';
    case 'Efeitos': return '#7cc4ff';
    case 'GUI': return '#f07cd0';
    case 'Interação': return '#38d17c';
    default: return '#6e7787';
  }
}

interface PickerState {
  mode: 'move' | 'none';
  id: InstanceId | null;
}

export function Explorer({ onInsert, compact }: { onInsert: (parentId: InstanceId) => void; compact?: boolean }) {
  const project = useStore(s => s.project);
  const selection = useStore(s => s.selection);
  const expanded = useStore(s => s.expanded);
  const select = useStore(s => s.select);
  const setExpanded = useStore(s => s.setExpanded);
  const updateInstance = useStore(s => s.updateInstance);
  const deleteInstances = useStore(s => s.deleteInstances);
  const duplicateInstances = useStore(s => s.duplicateInstances);
  const reparent = useStore(s => s.reparent);
  const ungroup = useStore(s => s.ungroup);

  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState<InstanceId | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [sheetFor, setSheetFor] = useState<InstanceId | null>(null);
  const [picker, setPicker] = useState<PickerState>({ mode: 'none', id: null });
  const [dragOver, setDragOver] = useState<string | null>(null);

  const containers = useMemo(() => {
    if (!project) return [];
    const out: { id: InstanceId; name: string; path: string }[] = [];
    const walk = (id: InstanceId, path: string, depth: number) => {
      const inst = project.instances[id];
      if (!inst || inst.className === 'DataModel') return;
      if ((isContainer(inst.className) || inst.className === 'Workspace') && depth > 0) {
        out.push({ id, name: inst.name, path });
      }
      if (inst.className !== 'Terrain' && inst.className !== 'Camera') {
        for (const c of inst.children) walk(c, depth === 0 ? inst.name : `${path} · ${inst.name}`, depth + 1);
      }
    };
    for (const sid of project.instances[project.rootId].children) {
      walk(sid, '', 0);
    }
    return out;
  }, [project]);

  if (!project) return null;
  const root = project.instances[project.rootId];

  const beginRename = (id: InstanceId) => {
    setRenaming(id);
    setRenameValue(project.instances[id]?.name ?? '');
  };

  const commitRename = () => {
    if (renaming && renameValue.trim()) {
      updateInstance(renaming, { name: renameValue.trim() });
    }
    setRenaming(null);
  };

  const matches = (inst: RbxInstance): boolean =>
    search.trim().length > 0 && inst.name.toLowerCase().includes(search.trim().toLowerCase()) ||
    (search.trim().length > 0 && inst.className.toLowerCase().includes(search.trim().toLowerCase()));

  const renderRow = (inst: RbxInstance, depth: number): ReactNode => {
    if (!inst) return null;
    const isMatch = matches(inst);
    const ancestorsMatch = search.trim().length > 0 && !isMatch;
    const childRows: ReactNode[] = [];
    const expandable = (isContainer(inst.className) || inst.className === 'Workspace') && inst.children.length > 0;
    const isOpen = !!expanded[inst.id] || search.trim().length > 0;
    if (isOpen) {
      for (const cid of inst.children) {
        const child = project.instances[cid];
        if (child) {
          // durante a pesquisa, mostrar apenas ramificações relevantes
          const childMatch = matches(child) || hasMatchingDescendant(child);
          if (search.trim() && !childMatch && !matches(child) && child.className !== 'Folder' && !child.children.some(cc => matches(project.instances[cc]))) continue;
          childRows.push(renderRow(child, depth + 1));
        }
      }
    }
    if (ancestorsMatch && !expandable && childRows.length === 0) return null;

    const selected = selection.includes(inst.id);
    const isDraggingEnabled = inst.className !== 'DataModel' && !['Workspace', 'Players', 'ReplicatedStorage', 'ServerStorage', 'ServerScriptService', 'StarterGui', 'StarterPack', 'StarterPlayer', 'Lighting', 'SoundService'].includes(inst.className);

    return (
      <div key={inst.id}>
        <div
          className={`tree-row ${selected ? 'selected' : ''} ${dragOver === inst.id ? 'drag-over' : ''}`}
          style={{ paddingLeft: (compact ? 10 : 8) + depth * 14 }}
          draggable={isDraggingEnabled}
          onDragStart={e => {
            e.dataTransfer.setData('text/rws-instance', inst.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={e => {
            if (isContainer(inst.className) || inst.className === 'Workspace') {
              e.preventDefault();
              setDragOver(inst.id);
            }
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(null);
            const dragged = e.dataTransfer.getData('text/rws-instance');
            if (dragged) {
              const ok = reparent(dragged, inst.id);
              if (!ok) useStore.getState().showToast('Não é possível mover um objeto para dentro dele mesmo.');
            }
          }}
          onClick={e => select(inst.id, e.shiftKey || e.ctrlKey || e.metaKey)}
        >
          {expandable ? (
            <button
              className="tree-caret"
              onClick={e => { e.stopPropagation(); setExpanded(inst.id, !expanded[inst.id]); }}
              aria-label={expanded[inst.id] ? 'Recolher' : 'Expandir'}
            >
              <span className={`caret ${expanded[inst.id] ? 'open' : ''}`}><Icon name="chevron" size={13} /></span>
            </button>
          ) : (
            <span className="tree-caret spacer" />
          )}
          <span className="tree-icon" style={{ color: classIconColor(inst) }}>
            <Icon name={iconForClass(inst.className)} size={15} />
          </span>
          {renaming === inst.id ? (
            <input
              className="rename-input"
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setRenaming(null);
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="tree-label" title={`${inst.name} · ${inst.className}`}>{inst.name}</span>
          )}
          <span className="tree-class">{inst.className}</span>
          {inst.className !== 'DataModel' && (
            <button
              className="tree-more"
              onClick={e => { e.stopPropagation(); select(inst.id); setSheetFor(inst.id); }}
              aria-label={`Ações para ${inst.name}`}
            >
              <Icon name="more" size={15} />
            </button>
          )}
        </div>
        {childRows}
      </div>
    );
  };

  const hasMatchingDescendant = (inst: RbxInstance): boolean => {
    const stack = [...inst.children];
    while (stack.length) {
      const id = stack.shift()!;
      const node = project.instances[id];
      if (node) {
        if (matches(node)) return true;
        stack.push(...node.children);
      }
    }
    return false;
  };

  const sheetInst = sheetFor ? project.instances[sheetFor] : null;
  const subject = root.children.flatMap(sid => project.instances[sid]?.children ?? []);

  return (
    <div className="explorer">
      <div className="panel-search">
        <Icon name="search" size={14} />
        <input
          placeholder="Pesquisar objetos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Pesquisar objetos"
        />
        {search && (
          <button className="btn-ghost" onClick={() => setSearch('')} aria-label="Limpar pesquisa">
            <Icon name="close" size={13} />
          </button>
        )}
      </div>
      <div className="tree">
        {root.children.map(sid => {
          const svc = project.instances[sid];
          if (!svc) return null;
          if (search.trim() && !matches(svc) && !svc.children.some(c => matches(project.instances[c])) && !hasMatchingDescendant(svc)) return null;
          return renderRow(svc, 0);
        })}
      </div>

      <BottomSheet open={!!sheetInst} title={sheetInst ? sheetInst.name : ''} onClose={() => setSheetFor(null)}>
        {sheetInst && (
          <div className="actions-list">
            <button className="action" onClick={() => { setSheetFor(null); beginRename(sheetInst.id); }}>
              <Icon name="pen" /> Renomear
            </button>
            <button className="action" onClick={() => { duplicateInstances([sheetInst.id]); setSheetFor(null); }}>
              <Icon name="copy" /> Duplicar
            </button>
            <button className="action" onClick={() => { onInsert(sheetInst.id); setSheetFor(null); }}>
              <Icon name="plus" /> Inserir objeto aqui
            </button>
            <button className="action" onClick={() => { setPicker({ mode: 'move', id: sheetInst.id }); setSheetFor(null); }}>
              <Icon name="move" /> Mover para...
            </button>
            {sheetInst.className === 'Model' && (
              <button className="action" onClick={() => { ungroup(sheetInst.id); setSheetFor(null); }}>
                <Icon name="layers" /> Desagrupar
              </button>
            )}
            <button className="action danger" onClick={() => { deleteInstances([sheetInst.id]); setSheetFor(null); }}>
              <Icon name="trash" /> Excluir
            </button>
            <p className="hint">Classe: {sheetInst.className} · {subject.length ? 'objeto do projeto' : ''}</p>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={picker.mode === 'move'} title="Mover para..." onClose={() => setPicker({ mode: 'none', id: null })}>
        <div className="actions-list scroll">
          {containers
            .filter(c => c.id !== picker.id)
            .map(c => (
              <button
                key={c.id}
                className="action"
                onClick={() => {
                  if (picker.id) {
                    const ok = reparent(picker.id, c.id);
                    useStore.getState().showToast(ok ? `Movido para ${c.name}.` : 'Movimento inválido: um objeto não pode ir para dentro de si mesmo.');
                  }
                  setPicker({ mode: 'none', id: null });
                }}
              >
                <Icon name="folder" />
                <span>
                  {c.name}
                  <small>{c.path}</small>
                </span>
              </button>
            ))}
        </div>
      </BottomSheet>
    </div>
  );
}
