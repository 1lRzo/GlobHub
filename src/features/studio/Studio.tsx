import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Viewport } from '../../editor3d/Viewport';
import { Icon } from '../../ui/Icons';
import { BottomSheet } from '../../ui/BottomSheet';
import { TopBar } from './TopBar';
import { MobileNav, MobilePanel } from './MobileNav';
import { Explorer } from './Explorer';
import { Properties } from './Properties';
import { InsertMenu } from './InsertMenu';
import { ToolMode } from '../../core/types';

const TOOL_ICON: Record<ToolMode, string> = {
  select: 'cursor',
  move: 'move',
  rotate: 'rotate',
  scale: 'scale'
};

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

export function Studio({ onHome }: { onHome: () => void }) {
  const isMobile = useIsMobile();
  const undo = useStore(s => s.undo);
  const redo = useStore(s => s.redo);
  const exportCurrentProject = useStore(s => s.exportCurrentProject);
  const saveNow = useStore(s => s.saveNow);
  const renameProject = useStore(s => s.renameProject);
  const closeProject = useStore(s => s.closeProject);
  const currentProjectId = useStore(s => s.currentProjectId);
  const tool = useStore(s => s.tool);
  const setTool = useStore(s => s.setTool);
  const duplicateInstances = useStore(s => s.duplicateInstances);
  const deleteInstances = useStore(s => s.deleteInstances);
  const groupSelection = useStore(s => s.groupSelection);
  const selection = useStore(s => s.selection);
  const project = useStore(s => s.project);

  const [panel, setPanel] = useState<MobilePanel>(null);
  const [insertParent, setInsertParent] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && !typing) {
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          if (selection.length) duplicateInstances(selection);
        }
      }
      if (!typing && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selection.length && !typing) {
          // Backspace pode atrapalhar navegação? só com seleção ativa e foco fora de campos
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            deleteInstances(selection);
          }
        }
      }
      if (!typing) {
        if (e.key.toLowerCase() === 'q') setTool('select');
        if (e.key.toLowerCase() === 'g') setTool('move');
        if (e.key.toLowerCase() === 'r') setTool('rotate');
        if (e.key.toLowerCase() === 's') setTool('scale');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, duplicateInstances, deleteInstances, setTool, selection]);

  const openInsert = (parentId: string | null) => {
    setInsertParent(parentId);
    setPanel('insert');
  };

  const projectSheet = (
    <BottomSheet open={panel === 'project'} title="Projeto" onClose={() => setPanel(null)}>
      <div className="actions-list">
        <button className="action" onClick={() => { saveNow(); setPanel(null); }}>
          <Icon name="save" /> Salvar agora
        </button>
        <button className="action" onClick={() => { exportCurrentProject(); setPanel(null); }}>
          <Icon name="download" /> Exportar projeto (.json)
        </button>
        <button className="action" onClick={() => { setRenameValue(project?.name ?? ''); setPanel(null); setRenameOpen(true); }}>
          <Icon name="pen" /> Renomear projeto
        </button>
        <button className="action" onClick={() => { closeProject(); onHome(); }}>
          <Icon name="home" /> Voltar ao início
        </button>
        <p className="hint">
          {project
            ? `${Object.keys(project.instances).length} objetos · salvamento automático no navegador`
            : ''}
        </p>
      </div>
    </BottomSheet>
  );

  void currentProjectId;

  return (
    <div className="studio">
      <TopBar
        isMobile={isMobile}
        onHome={() => { closeProject(); onHome(); }}
        onUndo={undo}
        onRedo={redo}
        onSave={saveNow}
        onExport={exportCurrentProject}
        onMenu={() => setPanel('project')}
      />
      <div className="studio-body">
        {!isMobile && (
          <aside className="panel explorer-panel">
            <div className="panel-title"><Icon name="layers" size={15} /> Explorer</div>
            <Explorer onInsert={pid => openInsert(pid)} />
          </aside>
        )}

        <Viewport />

        {!isMobile && (
          <aside className="panel properties-panel">
            <div className="panel-title"><Icon name="sliders" size={15} /> Properties</div>
            <Properties />
          </aside>
        )}
      </div>

      {isMobile && (
        <MobileNav
          active={panel}
          onOpen={p => setPanel(p)}
          onFocusViewport={() => setPanel(null)}
        />
      )}

      {isMobile && (
        <>
          <BottomSheet open={panel === 'explorer'} title="Explorer" onClose={() => setPanel(null)}>
            <div className="sheet-tall">
              <Explorer onInsert={pid => openInsert(pid)} compact />
            </div>
          </BottomSheet>
          <BottomSheet open={panel === 'insert'} title="Inserir objeto" onClose={() => setPanel(null)}>
            <InsertMenu parentId={insertParent} onClose={() => setPanel(null)} />
          </BottomSheet>
          <BottomSheet open={panel === 'properties'} title="Properties" onClose={() => setPanel(null)}>
            <div className="sheet-tall">
              <Properties />
            </div>
          </BottomSheet>
          <BottomSheet open={panel === 'tools'} title="Ferramentas" onClose={() => setPanel(null)}>
            <div className="tools-grid">
              {(['select', 'move', 'rotate', 'scale'] as ToolMode[]).map(t => (
                <button key={t} className={`tool-card ${tool === t ? 'active' : ''}`} onClick={() => { setTool(t); setPanel(null); }}>
                  <Icon name={TOOL_ICON[t]} size={20} />
                  <span>{t === 'select' ? 'Selecionar' : t === 'move' ? 'Mover' : t === 'rotate' ? 'Rotacionar' : 'Redimensionar'}</span>
                </button>
              ))}
              <button className={`tool-card ${tool === 'select' ? '' : ''}`} onClick={() => { if (selection.length) duplicateInstances(selection); setPanel(null); }}>
                <Icon name="copy" size={20} />
                <span>Duplicar seleção</span>
              </button>
              <button className="tool-card" onClick={() => { if (selection.length > 1) groupSelection(); setPanel(null); }}>
                <Icon name="group" size={20} />
                <span>Agrupar em Model</span>
              </button>
              <button className="tool-card danger" onClick={() => { if (selection.length) deleteInstances(selection); setPanel(null); }}>
                <Icon name="trash" size={20} />
                <span>Excluir seleção</span>
              </button>
            </div>
          </BottomSheet>
          {projectSheet}
        </>
      )}

      {renameOpen && (
        <BottomSheet open={renameOpen} title="Renomear projeto" onClose={() => setRenameOpen(false)}>
          <div className="form-row">
            <input
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              aria-label="Novo nome do projeto"
            />
            <button
              className="btn-primary"
              onClick={() => { if (currentProjectId) renameProject(currentProjectId, renameValue); setRenameOpen(false); }}
            >
              Salvar
            </button>
          </div>
        </BottomSheet>
      )}

      <Toast />
    </div>
  );
}

function Toast() {
  const toast = useStore(s => s.toast);
  const clearToast = useStore(s => s.clearToast);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(clearToast, 3400);
      return () => clearTimeout(t);
    }
  }, [toast, clearToast]);
  if (!toast) return null;
  return <div className="toast" role="status">{toast}</div>;
}
