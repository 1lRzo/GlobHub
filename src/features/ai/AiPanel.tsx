import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Icon } from '../../ui/Icons';
import { AiMessage } from '../../ai/types';
import { agentSend, getSettings, resetConversation, saveSettings, AGENT_TOOL_NAMES } from '../../ai/agent';

/** Confirme o texto de mensagens do sistema de confirmação ("CONFIRME:..."). */
function isConfirm(msg: AiMessage): boolean {
  return msg.role === 'system' && msg.text.startsWith('CONFIRME:');
}
function confirmText(msg: AiMessage): string {
  return msg.text.replace(/^CONFIRME:/, '');
}

export function AiPanel() {
  const aiMessages = useStore(s => s.aiMessages);
  const clearAiMessages = useStore(s => s.clearAiMessages);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(getSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const hasProject = useStore(s => s.project !== null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [aiMessages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    try {
      await agentSend(text);
    } finally {
      setBusy(false);
    }
  };

  const onSaveSettings = () => {
    saveSettings(settings);
    setSettings(getSettings());
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2200);
  };

  const onClear = () => {
    clearAiMessages();
    resetConversation();
  };

  const modeLabel = settings.apiKey ? 'IA Gemini conectada' : 'Modo local (sem chave)';

  return (
    <div className="ai-panel">
      <div className="ai-head">
        <span className="ai-mode">{modeLabel}</span>
        <button className="btn-ghost" onClick={() => setSettingsOpen(o => !o)} aria-label="Configurações da IA" title="Configurações da IA">
          <Icon name="sliders" size={16} />
        </button>
        <button className="btn-ghost" onClick={onClear} aria-label="Limpar conversa" title="Limpar conversa e memória do agente">
          <Icon name="trash" size={16} />
        </button>
      </div>

      {settingsOpen && (
        <div className="ai-settings">
          <label>
            Chave da API Gemini
            <input
              type="password"
              value={settings.apiKey}
              onChange={e => setSettings(s => ({ ...s, apiKey: e.target.value }))}
              placeholder="AIza..."
              autoComplete="off"
            />
          </label>
          <label>
            Modelo
            <input
              value={settings.model}
              onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
              placeholder="gemini-2.0-flash"
            />
          </label>
          <p className="hint">
            A chave fica salva apenas neste navegador. Sem chave, o agente local executa comandos diretos determinísticos.
          </p>
          <button className="btn-primary" onClick={onSaveSettings}>Salvar configuração</button>
          {savedHint && <span className="ai-saved">Salvo ✓</span>}
        </div>
      )}

      <div className="ai-list" ref={listRef}>
        {aiMessages.length === 0 && (
          <div className="ai-empty">
            <Icon name="spark" size={26} />
            <strong>Agente de desenvolvimento</strong>
            <p>Pedidos que já funcionam sem chave:</p>
            <p className="hint">"resumo do projeto", "crie 10 partes", "crie um script chamado Dinheiro", "pinte as partes de vermelho", "analise os scripts", "apague tudo dentro da pasta X"</p>
            <p>Com a chave Gemini configurada, pedidos completos funcionam: "crie um mapa de cidade", "faça NPCs que perseguem o jogador".</p>
            {!hasProject && <p className="ai-warn">Abra um projeto para começar.</p>}
          </div>
        )}
        {aiMessages.map(msg => (
          <div key={msg.id} className={`ai-msg ai-${msg.role}`}>
            <div className="ai-bubble">
              {msg.text}
              {msg.actions && msg.actions.length > 0 && (
                <em className="ai-actions">{msg.actions.join(', ')}</em>
              )}
            </div>
            {isConfirm(msg) && (
              <div className="ai-confirm">
                <button className="btn-primary" disabled={busy} onClick={() => { setBusy(true); agentSend('sim').finally(() => setBusy(false)); }}>
                  Confirmar
                </button>
                <button className="btn-ghost" disabled={busy} onClick={() => { setBusy(true); agentSend('não').finally(() => setBusy(false)); }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="ai-msg ai-agent"><div className="ai-bubble ai-typing">Trabalhando...</div></div>
        )}
      </div>

      <form className="ai-input-row" onSubmit={e => { e.preventDefault(); void send(); }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={hasProject ? 'Peça algo ao agente...' : 'Abra um projeto primeiro'}
          disabled={!hasProject || busy}
          aria-label="Mensagem para a IA"
        />
        <button className="btn-primary" type="submit" disabled={!hasProject || busy || !input.trim()} aria-label="Enviar">
          <Icon name="spark" size={16} />
        </button>
      </form>
      <p className="ai-tools-note">{AGENT_TOOL_NAMES.length} ferramentas disponíveis · ações destrutivas pedem confirmação</p>
    </div>
  );
}
