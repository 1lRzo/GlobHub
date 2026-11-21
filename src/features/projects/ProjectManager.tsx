import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { ProjectMeta } from '../../core/types';
import { TEMPLATES, templateById } from '../../core/templates';
import { downloadProjectFile, loadProjectData } from '../../store/storage';
import { Icon } from '../../ui/Icons';
import { BottomSheet } from '../../ui/BottomSheet';

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date(ts).toISOString();
  }
}

export function ProjectManager() {
  const projects = useStore(s => s.projects);
  const createProject = useStore(s => s.createProject);
  const openProject = useStore(s => s.openProject);
  const removeProject = useStore(s => s.removeProject);
  const duplicateProject = useStore(s => s.duplicateProject);
  const renameProject = useStore(s => s.renameProject);
  const importProject = useStore(s => s.importProject);

  const [newName, setNewName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [sheetFor, setSheetFor] = useState<ProjectMeta | null>(null);
  const [renaming, setRenaming] = useState<ProjectMeta | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => ({
    total: projects.length,
    objetos: projects.reduce((acc, p) => acc + p.instanceCount, 0)
  }), [projects]);

  const onCreate = () => {
    const name = newName.trim() || templateById(selectedTemplate).label;
    createProject(name, selectedTemplate);
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const ok = importProject(text);
      if (ok) setSheetFor(null);
    } catch {
      useStore.getState().showToast('Não foi possível ler o arquivo.');
    }
  };

  return (
    <div className="pm">
      <header className="pm-hero">
        <div className="pm-brand">
          <span className="pm-logo"><Icon name="gamepad" size={22} /></span>
          <div>
            <h1>Roblox Web Studio</h1>
            <p>Crie, programe e publique jogos do Roblox pelo navegador, no celular ou no computador.</p>
          </div>
        </div>
        <div className="pm-stats">
          <span><strong>{projects.length}</strong> projetos</span>
          <span><strong>{stats.objetos}</strong> objetos criados</span>
        </div>
      </header>

      <section className="pm-section">
        <h2>Novo projeto</h2>
        <div className="pm-new">
          <input
            placeholder="Nome do jogo..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onCreate()}
            aria-label="Nome do novo jogo"
          />
          <button className="btn-primary" onClick={onCreate}>
            <Icon name="plus" size={16} /> Criar
          </button>
        </div>
        <div className="tpl-grid">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              className={`tpl-card ${selectedTemplate === t.id ? 'active' : ''}`}
              onClick={() => setSelectedTemplate(t.id)}
            >
              <span className="tpl-emoji">{t.emoji}</span>
              <span className="tpl-name">{t.label}</span>
              <span className="tpl-desc">{t.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="pm-section">
        <div className="pm-section-head">
          <h2>Meus projetos</h2>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> Importar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={e => { onImportFile(e.target.files?.[0]); e.target.value = ''; }}
          />
        </div>
        {projects.length === 0 ? (
          <p className="hint">Nenhum projeto ainda. Escolha um modelo acima e crie o primeiro.</p>
        ) : (
          <div className="proj-list">
            {projects.map(p => (
              <div key={p.id} className="proj-card">
                <button className="proj-open" onClick={() => openProject(p.id)} aria-label={`Abrir ${p.name}`}>
                  <span className="tpl-emoji small">{templateById(p.template).emoji}</span>
                  <span className="proj-name">{p.name}</span>
                  <span className="proj-meta">
                    {templateById(p.template).label} · {p.instanceCount} objetos · editado em {formatDate(p.updatedAt)}
                  </span>
                </button>
                <button className="btn-ghost" onClick={() => setSheetFor(p)} aria-label={`Ações para ${p.name}`}>
                  <Icon name="more" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="pm-foot">
        <p className="hint">
          Etapa 1 concluída: editor 3D real, Explorer, Properties, modelos e salvamento.
          Próximas etapas: editor Luau, IA agente, animações, terreno, testes e publicação via Roblox Open Cloud.
        </p>
      </footer>

      <BottomSheet open={!!sheetFor} title={sheetFor?.name ?? ''} onClose={() => setSheetFor(null)}>
        {sheetFor && (
          <div className="actions-list">
            <button className="action" onClick={() => { openProject(sheetFor.id); setSheetFor(null); }}>
              <Icon name="eye" /> Abrir
            </button>
            <button className="action" onClick={() => { setRenameValue(sheetFor.name); setRenaming(sheetFor); setSheetFor(null); }}>
              <Icon name="pen" /> Renomear
            </button>
            <button className="action" onClick={() => { duplicateProject(sheetFor.id); setSheetFor(null); }}>
              <Icon name="copy" /> Duplicar
            </button>
            <button className="action" onClick={() => {
              const p = loadProjectData(sheetFor.id);
              if (p) downloadProjectFile(p);
              else useStore.getState().showToast('Projeto não encontrado.');
              setSheetFor(null);
            }}>
              <Icon name="download" /> Exportar (.json)
            </button>
            <button className="action danger" onClick={() => {
              if (confirmId === sheetFor.id) {
                removeProject(sheetFor.id);
                setSheetFor(null);
                setConfirmId(null);
              } else {
                setConfirmId(sheetFor.id);
                useStore.getState().showToast('Toque em Excluir novamente para confirmar.');
              }
            }}>
              <Icon name="trash" /> {confirmId === sheetFor.id ? 'Confirmar exclusão' : 'Excluir'}
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!renaming} title="Renomear projeto" onClose={() => setRenaming(null)}>
        <div className="form-row">
          <input value={renameValue} onChange={e => setRenameValue(e.target.value)} aria-label="Novo nome" />
          <button
            className="btn-primary"
            onClick={() => {
              if (renaming) renameProject(renaming.id, renameValue);
              setRenaming(null);
            }}
          >
            Salvar
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
