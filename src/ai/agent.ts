import { useStore } from '../store/useStore';
import { AGENT_TOOLS, pathOf, projectOutline } from './tools';
import { AgentSettings, AgentToolResult, DEFAULT_MODEL, GEMINI_KEY_STORAGE, GEMINI_MODEL_STORAGE } from './types';
import { newId } from '../core/ids';

/* ------------------------------------------------------------------ */
/* Configuração (chave fica apenas no navegador do usuário)             */
/* ------------------------------------------------------------------ */

export function getSettings(): AgentSettings {
  try {
    return {
      apiKey: localStorage.getItem(GEMINI_KEY_STORAGE) ?? '',
      model: localStorage.getItem(GEMINI_MODEL_STORAGE) || DEFAULT_MODEL
    };
  } catch {
    return { apiKey: '', model: DEFAULT_MODEL };
  }
}

export function saveSettings(s: AgentSettings): void {
  try {
    if (s.apiKey) localStorage.setItem(GEMINI_KEY_STORAGE, s.apiKey.trim());
    else localStorage.removeItem(GEMINI_KEY_STORAGE);
    localStorage.setItem(GEMINI_MODEL_STORAGE, s.model.trim() || DEFAULT_MODEL);
  } catch { /* armazenamento indisponível */ }
}

/* ------------------------------------------------------------------ */
/* Conversa com o modelo (function calling real)                        */
/* ------------------------------------------------------------------ */

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

let conversation: GeminiContent[] = [];
let pendingConfirm: { name: string; args: Record<string, unknown> } | null = null;

export function hasPendingConfirm(): boolean {
  return pendingConfirm !== null;
}

function pushPart(part: GeminiPart, role: 'user' | 'model'): void {
  const last = conversation[conversation.length - 1];
  if (last && last.role === role) last.parts.push(part);
  else conversation.push({ role, parts: [part] });
}

function toolDeclarations() {
  return [{
    functionDeclarations: AGENT_TOOLS.map(t => ({
      name: t.name,
      description: t.description + (t.params.length ? ` Parâmetros: ${t.params.join('; ')}.` : ''),
      ...(t.params.length > 0
        ? {
            parameters: {
              type: 'OBJECT',
              properties: Object.fromEntries(
                t.params.map(p => [p.split(' ')[0].trim(), { type: 'STRING', description: p }])
              ),
              required: [] as string[]
            }
          }
        : {})
    }))
  }];
}

function systemPrompt(): string {
  const state = useStore.getState();
  let outline = '(sem projeto aberto)';
  if (state.project) {
    try {
      outline = projectOutline(6);
    } catch {
      outline = '(não foi possível ler o projeto)';
    }
  }
  return [
    'Você é o agente de desenvolvimento do Roblox Web Studio, um editor de jogos Roblox no navegador.',
    'Você age NO projeto real usando as ferramentas disponíveis (function calling). Não prometa API fora delas.',
    'Regras:',
    '1. Prefira várias chamadas pequenas a uma explicação longa: construa o que o usuário pediu de verdade.',
    '2. Antes de modificar, entenda o projeto: use outline_project/find_objects/list_children conforme o necessário.',
    '3. Scripts de servidor (Script) vão em ServerScriptService apropiado; código que roda no jogador (LocalScript) em StarterPlayerScripts; código compartilhado em ModuleScript dentro de ReplicatedStorage/Modules. Escreva Luau real do Roblox (task.wait, game:GetService...), sem esperar que funcione no navegador.',
    '4. delete_objects exige confirmação do usuário: a ferramenta retorna needsConfirm e o usuário confirmará; depois disso prossegue.',
    '5. Responda SEMPRE em português do Brasil, de forma curta e direta, listando o que foi criado/alterado.',
    '6. Quando algo não for possível no navegador (executar Luau, multiplayer, publicar), diga com honestidade.',
    '7. Cores use hex (#ff0000). Posições/tamanhos em studs, ex.: {"Size":[4,1,2],"Position":[0,0.5,0]}.',
    '',
    'Estrutura atual do projeto:',
    outline
  ].join('\n');
}

async function callGemini(contents: GeminiContent[]): Promise<GeminiPart[]> {
  const settings = getSettings();
  const model = settings.model || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;
  let body: Response;
  try {
    body = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        contents,
        tools: toolDeclarations(),
        generationConfig: { temperature: 0.4 }
      })
    });
  } catch {
    throw new Error('Falha de rede ao chamar a API Gemini. Verifique sua conexão.');
  }
  if (!body.ok) {
    let detail = '';
    try {
      const errJson = await body.json();
      detail = errJson?.error?.message ?? '';
    } catch { /* corpo sem JSON */ }
    if (body.status === 400 && /api key/i.test(detail)) {
      throw new Error('Chave da API inválida. Revise a chave nas configurações do painel de IA.');
    }
    if (body.status === 403 || body.status === 401) {
      throw new Error('Acesso negado pela API Gemini (chave sem permissão ou restrita).');
    }
    if (body.status === 404) {
      throw new Error(`Modelo "${model}" não encontrado. Verifique o nome nas configurações.`);
    }
    if (body.status === 429) {
      throw new Error('Limite de uso da API atingido. Tente novamente mais tarde.');
    }
    throw new Error(`Erro ${body.status} da API Gemini.${detail ? ' Detalhe: ' + detail : ''}`);
  }
  type GeminiResponse = {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; functionCall?: { name: string; args?: Record<string, unknown> } }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };
  const data: GeminiResponse = await body.json();
  if (data.promptFeedback?.blockReason) {
    throw new Error(`O pedido foi bloqueado pelo filtro de segurança (${data.promptFeedback.blockReason}).`);
  }
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) return [];
  return parts.filter(p => typeof p.text === 'string' || p.functionCall) as GeminiPart[];
}

/** Executa uma ferramenta pelo nome (usado pelo loop do agente e por testes). */
export function executeToolForTest(name: string, args: Record<string, unknown>): AgentToolResult {
  const tool = AGENT_TOOLS.find(t => t.name === name);
  if (!tool) {
    return { ok: false, message: `Ferramenta desconhecida: ${name}` };
  }
  try {
    return tool.run(args ?? {});
  } catch (e) {
    return { ok: false, message: String(e instanceof Error ? e.message : e) };
  }
}

export interface AgentEvents {
  onAction?: (toolName: string, result: AgentToolResult) => void;
}

const MAX_STEPS = 14;

/** Executa o próximo modelo da conversa até decisão final (ou confirmação pendente). */
async function agentLoopOnce(events: AgentEvents | undefined): Promise<void> {
  const store = useStore.getState();
  for (let step = 0; step < MAX_STEPS; step++) {
    let parts: GeminiPart[];
    try {
      parts = await callGemini(conversation);
    } catch (e) {
      store.pushAiMessage('agent', `Erro ao falar com a IA: ${e instanceof Error ? e.message : e}`);
      return;
    }
    if (!parts || parts.length === 0) {
      store.pushAiMessage('agent', 'A resposta do modelo veio vazia. Verifique a chave da API e o nome do modelo.');
      return;
    }
    pushPart({ text: parts.map(p => p.text ?? '').join('') || '(chamadas de ferramenta)' }, 'model');
    const calls = parts.filter(p => p.functionCall);
    if (calls.length === 0) {
      const text = parts.map(p => p.text ?? '').join('\n').trim();
      store.pushAiMessage('agent', text || 'Concluído.');
      return;
    }
    for (const call of calls) {
      const name = call.functionCall!.name;
      const args = (call.functionCall!.args ?? {}) as Record<string, unknown>;
      const result = executeToolForTest(name, args);
      if (result.needsConfirm) {
        pendingConfirm = { name, args };
        store.pushAiMessage('system', `CONFIRME:${result.confirmSummary ?? result.message}`);
        return;
      }
      events?.onAction?.(name, result);
      conversation.push({ role: 'user', parts: [{ functionResponse: { name, response: { ok: result.ok, message: result.message } } }] });
    }
  }
  store.pushAiMessage('agent', 'Muitas etapas em sequência. Peça a continuação para eu seguir de onde parei.');
}

/* ------------------------------------------------------------------ */
/* Motor local (sem chave): comandos diretos determinísticos            */
/* ------------------------------------------------------------------ */

const COLOR_WORDS: Record<string, string> = {
  vermelho: '#ef4444', vermelha: '#ef4444', azul: '#3b82f6', verde: '#22c55e', amarelo: '#facc15',
  amarela: '#facc15', preto: '#111827', preta: '#111827', branco: '#ffffff', branca: '#ffffff',
  cinza: '#6b7280', laranja: '#f97316', roxo: '#8b5cf6', rosa: '#ec4899'
};

function helpText(): string {
  return [
    'Sou o agente local (funciona sem chave de API). Comandos que já sei executar no projeto:',
    '· "resumo do projeto" — mostra a estrutura',
    '· "crie uma pasta chamada X" (pode indicar "dentro de Workspace/Map")',
    '· "crie 10 partes" / "crie 10 partes com espaçamento 8"',
    '· "crie um script chamado X" / "crie um localscript chamado X"',
    '· "renomeie X para Y"',
    '· "mova X para Workspace/Map"',
    '· "duplique X 5 vezes"',
    '· "pinte as partes de vermelho" (ou "pinte X de #hex")',
    '· "apague tudo dentro da pasta X" (pede confirmação)',
    '· "agrupe os filhos de X"',
    '· "analise os scripts" / "encontre erros"',
    '· "busque objetos chamados X"',
    'Para construção por linguagem natural completa ("crie um mapa de cidade abandonada"), conecte a API Gemini nas configurações do painel de IA: o agente IA ganha todas as ferramentas do editor.'
  ].join('\n');
}

function runLocal(text: string, events?: AgentEvents): void {
  const store = useStore.getState();
  const t = text.toLowerCase().replace(/[!.?]+$/, '').trim();

  const tool = (name: string, args: Record<string, unknown>) => {
    const result = executeToolForTest(name, args);
    events?.onAction?.(name, result);
    store.pushAiMessage('agent', result.message);
    return result;
  };

  let m: RegExpMatchArray | null;

  if (/^(resumo|estrutura)( do projeto)?$|^(mostre|ver)( a)? (estrutura|resumo)/.test(t)) {
    tool('outline_project', { maxDepth: 5 });
    return;
  }

  if ((m = t.match(/crie (?:uma? )?(?:pasta|folder)(?: chamad[oa]?)? ["']?([\p{L}0-9 _-]+)["']?(?: dentro de ([\p{L}0-9 _/]+))?/u))) {
    tool('create_folder', { name: m[1].trim(), parentPath: (m[2] ?? 'Workspace').trim() });
    return;
  }

  if ((m = t.match(/crie (\d{1,3}) (?:partes|parts|blocos|cubes|cubos)/))) {
    const count = Number(m[1]);
    const spacing = Number(t.match(/espa[cç]amento (\d+(?:\.\d+)?)/)?.[1] ?? 6);
    const messages: string[] = [];
    for (let i = 0; i < count; i++) {
      const result = executeToolForTest('create_instance', {
        className: 'Part', name: `Part ${i + 1}`, parentPath: 'Workspace',
        properties: { Position: [i * spacing, 0.5, 0], Size: [4, 1, 2] }
      });
      events?.onAction?.('create_instance', result);
      messages.push(result.message);
    }
    store.pushAiMessage('agent', `Criei ${count} partes em linha no Workspace (espaçamento ${spacing} studs).`);
    return;
  }

  if ((m = t.match(/crie (?:um |uma )?(script|localscript|modulescript)(?:\s+chamad[oa]?\s+|\s+nome\s+|\s+)?["']?([\p{L}0-9_-][\p{L}0-9 _-]*)?/u))) {
    const kind = m[1] === 'localscript' ? 'LocalScript' : m[1] === 'modulescript' ? 'ModuleScript' : 'Script';
    tool('create_script', { kind, name: (m[2] ?? '').trim() || 'NovoScript' });
    return;
  }

  if ((m = t.match(/renomeie ["']?([^"']+)["']? para ["']?([^"']+)["']?/))) {
    tool('rename_object', { path: m[1].trim(), newName: m[2].trim() });
    return;
  }

  if ((m = t.match(/mova ["']?([^"']+)["']? para ["']?([\p{L}0-9 _/]+)["']?/u))) {
    tool('move_object', { path: m[1].trim(), newParentPath: m[2].trim() });
    return;
  }

  if ((m = t.match(/duplique ["']?([^"']+)["']?(?: (\d{1,3}) vezes?)?/))) {
    tool('duplicate_objects', { path: m[1].trim(), times: m[2] ? Number(m[2]) : 1 });
    return;
  }

  if ((m = t.match(/pinte (?:todas as |as |as? )?(partes?|objects?|objetos?)?(?: chamad[oa]s? ["']?([^"']+)["']?)? de (#[0-9a-f]{3,8}|\p{L}+)/u))) {
    const color = m[3] && m[3].startsWith('#') ? m[3] : (COLOR_WORDS[m[3]] ?? null);
    const namePart = (m[2] ?? m[1] ?? '').toLowerCase();
    const project = useStore.getState().project;
    if (!project) { store.pushAiMessage('agent', 'Nenhum projeto aberto.'); return; }
    if (!color) {
      store.pushAiMessage('agent', `Não reconheço a cor "${m[3]}". Use verde, vermelha, azul... ou um hex como #ff8800.`);
      return;
    }
    const targets = Object.values(project.instances).filter(i =>
      ['Part', 'WedgePart', 'CornerWedgePart', 'TrussPart', 'SpawnLocation', 'Seat', 'VehicleSeat', 'MeshPart'].includes(i.className)
      && i.name.toLowerCase().includes(namePart)
    ).slice(0, 100);
    let painted = 0;
    for (const target of targets) {
      const result = executeToolForTest('set_property', { path: pathOf(project, target.id), key: 'Color', value: color });
      events?.onAction?.('set_property', result);
      if (result.ok) painted++;
    }
    store.pushAiMessage('agent', painted ? `Pintei ${painted} objeto(s) de ${color}.` : 'Não encontrei partes com esse nome para pintar.');
    return;
  }

  if ((m = t.match(/apague? (?:tudo d[ae]ntro d[ao]? |tudo |[ao]s? )?["']?([\p{L}0-9 _/-]+)["']?/u)) && /apag|remova|delete|exclu/.test(t)) {
    const path = m[1].replace(/^(tudo dentro d[ao] |tudo |[ao]s? pasta |[ao]s?modelo |pasta |[ao]s? )/, '').trim();
    tool('delete_objects', { path });
    return;
  }

  if (/agrupe? (os|as|os filhos|as filhos)? ?(filhos|objetos)? ?(?:de|do|da)? ?["']?([\p{L}0-9 _/]+)["']?/u.test(t)) {
    const mm = t.match(/de ["']?([\p{L}0-9 _/]+)["']?/u) ?? t.match(/filhos? de ([\p{L}0-9 _/]+)/u);
    tool('group_children', { path: (mm ? mm[1] : 'Workspace').trim(), name: 'Model' });
    return;
  }

  if (/analis(e|ar)|erros|avisos|problemas/.test(t)) {
    tool('analyze_scripts', {});
    return;
  }

  if ((m = t.match(/busque?|procure?|encontre?/)) && (m = t.match(/(?:chamad[oa]s?|nome) ["']?([^"']+)["']?/))) {
    tool('find_objects', { name: m[1].trim() });
    return;
  }

  store.pushAiMessage('agent', 'Não entendi esse comando no modo local.\n\n' + helpText());
}

/* ------------------------------------------------------------------ */
/* Entradas públicas                                                    */
/* ------------------------------------------------------------------ */

export async function agentSend(userText: string, events?: AgentEvents): Promise<void> {
  const store = useStore.getState();
  if (!store.project) {
    store.pushAiMessage('agent', 'Abra um projeto antes de usar a IA.');
    return;
  }
  const text = userText.trim();
  if (!text) return;
  store.pushAiMessage('user', text);
  if (pendingConfirm) {
    if (/^(sim|confirmar?|pode|ok|claro)/.test(text.toLowerCase())) {
      const pending = pendingConfirm;
      pendingConfirm = null;
      const result = executeToolForTest(pending.name, { ...pending.args, confirmed: true });
      events?.onAction?.(pending.name, result);
      store.pushAiMessage('agent', result.message);
      if (getSettings().apiKey && conversation.length > 0) {
        // retoma a conversa do modelo com o resultado da confirmação
        pushPart({ functionResponse: { name: pending.name, response: { ok: result.ok, message: result.message } } }, 'user');
        pushPart({ text }, 'user');
        await agentLoopOnce(events);
      }
      return;
    }
    if (/^(não|nao|cancelar?|parar)/.test(text.toLowerCase())) {
      pendingConfirm = null;
      store.pushAiMessage('agent', 'Exclusão cancelada. Nada foi alterado.');
      return;
    }
  }
  const settings = getSettings();
  if (!settings.apiKey) {
    runLocal(text, events);
    return;
  }
  pushPart({ text }, 'user');
  await agentLoopOnce(events);
}

export function resetConversation(): void {
  conversation = [];
  pendingConfirm = null;
}

/** Menção utilitária dos ícones para testes de importação. */
export const AGENT_TOOL_NAMES = AGENT_TOOLS.map(t => t.name);

export function newMessageId(): string {
  return newId();
}
