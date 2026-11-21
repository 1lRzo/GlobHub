import { InstanceId } from '../core/types';

export interface AgentToolResult {
  ok: boolean;
  message: string;
  createdIds?: InstanceId[];
  affectedIds?: InstanceId[];
  /** Quando true, a ação destrutiva exige confirmação do usuário antes de executar. */
  needsConfirm?: boolean;
  /** Resumo exibido ao usuário na solicitação de confirmação. */
  confirmSummary?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  destructive?: boolean;
  /** Parâmetros aceitos, para incluir no prompt do modelo. */
  params: string[];
  /** Executa a ferramenta no projeto aberto neste momento. */
  run(args: Record<string, unknown>): AgentToolResult;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  ts: number;
  /** Ferramentas executadas nesta mensagem (histórico de ações). */
  actions?: string[];
}

export interface AgentSettings {
  apiKey: string;
  model: string;
}

export const GEMINI_KEY_STORAGE = 'rws_gemini_key';
export const GEMINI_MODEL_STORAGE = 'rws_gemini_model';
export const DEFAULT_MODEL = 'gemini-2.0-flash';
