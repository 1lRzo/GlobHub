import { InstanceId, Project, RbxInstance } from '../../core/types';
import { SCRIPT_CLASSES } from '../../core/classes';
import { CodeEditor } from '../../scripting/editor/CodeEditor';
import { Icon, iconForClass } from '../../ui/Icons';
import { useStore } from '../../store/useStore';

interface ScriptAreaProps {
  project: Project;
  openScripts: InstanceId[];
  activeScriptId: InstanceId | null;
  onSelectTab: (id: InstanceId) => void;
  onCloseTab: (id: InstanceId) => void;
  onOpenPicker: () => void;
}

/** Abas de scripts + editor Luau. Um projeto = uma instância de ScriptArea. */
export function ScriptArea({ project, openScripts, activeScriptId, onSelectTab, onCloseTab, onOpenPicker }: ScriptAreaProps) {
  const setInstanceSource = useStore(s => s.setInstanceSource);

  const valid = openScripts.filter(id => {
    const inst = project.instances[id];
    return inst && SCRIPT_CLASSES.includes(inst.className);
  });

  const active: RbxInstance | null = activeScriptId ? project.instances[activeScriptId] ?? null : (valid.length ? project.instances[valid[valid.length - 1]] : null);

  return (
    <div className="script-area">
      <div className="script-tabs" role="tablist" aria-label="Scripts abertos">
        {valid.map(id => {
          const inst = project.instances[id];
          return (
            <div key={id} className={`script-tab ${active?.id === id ? 'active' : ''}`} role="tab" aria-selected={active?.id === id}>
              <button className="script-tab-btn" onClick={() => onSelectTab(id)}>
                <span className="tree-icon" style={{ color: '#b07cff' }}>
                  <Icon name={iconForClass(inst.className)} size={13} />
                </span>
                <span>{inst.name}</span>
              </button>
              <button className="script-tab-close" onClick={() => onCloseTab(id)} aria-label={`Fechar ${inst.name}`}>
                <Icon name="close" size={12} />
              </button>
            </div>
          );
        })}
        <button className="script-tab-add" onClick={onOpenPicker} aria-label="Abrir outro script">
          <Icon name="plus" size={14} />
        </button>
      </div>
      {active ? (
        <CodeEditor
          key={active.id}
          source={active.source ?? ''}
          fileName={active.name}
          onChange={(next) => setInstanceSource(active.id, next)}
        />
      ) : (
        <div className="empty-state code-empty">
          <Icon name="script" size={22} />
          <p>Nenhum script aberto.</p>
          <p className="hint">Selecione um Script, LocalScript ou ModuleScript no Explorer e toque em "Editar código".</p>
          <button className="btn-primary" onClick={onOpenPicker}>Abrir script</button>
          <div className="scripts-picker">
            {Object.values(project.instances)
              .filter(i => SCRIPT_CLASSES.includes(i.className))
              .map(i => (
                <button key={i.id} className="action" onClick={() => onSelectTab(i.id)}>
                  <Icon name={iconForClass(i.className)} />
                  <span>{i.name}<small>{i.className}</small></span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
