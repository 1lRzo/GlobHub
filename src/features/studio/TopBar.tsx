import { useStore } from '../../store/useStore';
import { Icon } from '../../ui/Icons';
import { ToolMode } from '../../core/types';

interface TopBarProps {
  onUndo: () => void;
  onRedo: () => void;
  onHome: () => void;
  onExport: () => void;
  onSave: () => void;
  onMenu: () => void;
  isMobile: boolean;
}

const TOOL_ICON: Record<ToolMode, string> = {
  select: 'cursor',
  move: 'move',
  rotate: 'rotate',
  scale: 'scale'
};

export function TopBar({ onUndo, onRedo, onHome, onExport, onSave, onMenu, isMobile }: TopBarProps) {
  const project = useStore(s => s.project);
  const saveState = useStore(s => s.saveState);
  const tool = useStore(s => s.tool);
  const setTool = useStore(s => s.setTool);
  const action = useStore(s => s.project ? s.project : null);

  const canUndo = useStore(s => s.undoStack.length > 0);
  const canRedo = useStore(s => s.redoStack.length > 0);

  if (!project) return null;
  void action;

  const saveLabel = saveState === 'saved' ? 'Salvo automaticamente' : 'Salvando...';

  return (
    <header className="topbar">
      <button className="btn-ghost" onClick={onHome} aria-label="Voltar ao início">
        <Icon name="home" size={18} />
      </button>
      <div className="project-title">
        <span className="name">{project.name}</span>
        <span className="save-state">{saveLabel}</span>
      </div>
      {!isMobile && (
        <div className="tool-group">
          {(['select', 'move', 'rotate', 'scale'] as ToolMode[]).map(t => (
            <button key={t} className={`tool-btn ${tool === t ? 'active' : ''}`} onClick={() => setTool(t)} aria-label={t} title={t}>
              <Icon name={TOOL_ICON[t]} size={16} />
            </button>
          ))}
        </div>
      )}
      <div className="topbar-actions">
        <button className="btn-ghost" onClick={onUndo} disabled={!canUndo} aria-label="Desfazer" title="Desfazer (Ctrl+Z)">
          <Icon name="undo" size={18} />
        </button>
        <button className="btn-ghost" onClick={onRedo} disabled={!canRedo} aria-label="Refazer" title="Refazer (Ctrl+Y)">
          <Icon name="redo" size={18} />
        </button>
        <button className="btn-ghost" onClick={onSave} aria-label="Salvar agora" title="Salvar agora">
          <Icon name="save" size={18} />
        </button>
        <button className="btn-ghost" onClick={onExport} aria-label="Exportar projeto" title="Exportar projeto (.json)">
          <Icon name="download" size={18} />
        </button>
        {isMobile && (
          <button className="btn-ghost" onClick={onMenu} aria-label="Menu do projeto" title="Menu do projeto">
            <Icon name="wrench" size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
