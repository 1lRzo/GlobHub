// Análise real (não simulada) de código Luau:
// 1. Tokenizador léxico que reconhece a Gramática do Luau/Roblox.
// 2. Validador estrutural (blocos, strings, parênteses, erros comuns).
// 3. Formatador por re-gravura de indentação.
// Não é um interpretador: a execução de verdade continua sendo do motor Roblox.

export type TokenType =
  | 'keyword' | 'literal' | 'string' | 'comment' | 'number'
  | 'ident' | 'global' | 'operator' | 'whitespace' | 'unknown';

export interface LuauToken {
  type: TokenType;
  value: string;
  line: number;
  pos: number;
}

export const KEYWORDS = [
  'and', 'break', 'do', 'else', 'elseif', 'end', 'for', 'function', 'if', 'in',
  'local', 'not', 'or', 'repeat', 'return', 'then', 'until', 'while', 'continue', 'export', 'type'
];

export const LITERALS = ['true', 'false', 'nil'];

export const GLOBALS = [
  'game', 'workspace', 'script', 'Instance', 'Vector3', 'Vector2', 'CFrame', 'Enum',
  'UDim2', 'UDim', 'Color3', 'BrickColor', 'Ray', 'TweenInfo', 'Random', 'task',
  'math', 'string', 'table', 'os', 'utf8', 'coroutine', 'buffer', 'debug',
  'print', 'warn', 'error', 'assert', 'pcall', 'xpcall', 'select', 'require',
  'tostring', 'tonumber', 'typeof', 'type', 'ipairs', 'pairs', 'next', 'unpack',
  'setmetatable', 'getmetatable', 'rawget', 'rawset', 'tick', 'time', 'wait', 'spawn', 'delay'
];

export const SERVICES = [
  'Players', 'ReplicatedStorage', 'ServerStorage', 'ServerScriptService', 'StarterGui',
  'StarterPack', 'StarterPlayer', 'Lighting', 'SoundService', 'TweenService', 'RunService',
  'UserInputService', 'ContextActionService', 'PhysicsService', 'CollectionService',
  'DataStoreService', 'MarketplaceService', 'HttpService', 'Debris', 'PathfindingService',
  'TextService', 'TeleportService', 'MessagingService'
];

const KEYWORD_SET = new Set(KEYWORDS);
const LITERAL_SET = new Set(LITERALS);
const GLOBAL_SET = new Set(GLOBALS);

const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
const isIdentChar = (c: string) => /[A-Za-z0-9_]/.test(c);
const isDigit = (c: string) => /[0-9]/.test(c);

/** Tokeniza o código-fonte Luau. Nunca lança: entrada inválada vira token 'unknown'. */
export function tokenizeLuau(source: string): LuauToken[] {
  const tokens: LuauToken[] = [];
  const n = source.length;
  let i = 0;
  let line = 1;
  const push = (type: TokenType, start: number) => {
    tokens.push({ type, value: source.slice(start, i), line, pos: start });
  };

  while (i < n) {
    const c = source[i];
    const start = i;

    if (c === '\n') {
      i++;
      line++;
      push('whitespace', start);
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      while (i < n && (source[i] === ' ' || source[i] === '\t' || source[i] === '\r')) i++;
      push('whitespace', start);
      continue;
    }

    // comentários
    if (c === '-' && source[i + 1] === '-') {
      if (source[i + 2] === '[') {
        const eqStart = i + 3;
        let eqs = 0;
        while (source[eqStart + eqs] === '=') eqs++;
        if (source[eqStart + eqs] === '[') {
          // comentário longo --[[ ... ]]
          const close = `]${'='.repeat(eqs)}]`;
          const closeIdx = source.indexOf(close, eqStart + eqs + 1);
          i = closeIdx === -1 ? n : closeIdx + close.length;
          push('comment', start);
          continue;
        }
      }
      i += 2;
      while (i < n && source[i] !== '\n') i++;
      push('comment', start);
      continue;
    }

    // strings longas [[ ... ]]
    if (c === '[') {
      let eqs = 0;
      while (source[i + 1 + eqs] === '=') eqs++;
      if (source[i + 1 + eqs] === '[') {
        const close = `]${'='.repeat(eqs)}]`;
        const closeIdx = source.indexOf(close, i + 2 + eqs);
        const end = closeIdx === -1 ? n : closeIdx + close.length;
        i = end;
        push('string', start);
        continue;
      }
    }

    // strings com aspas
    if (c === '"' || c === "'") {
      i++;
      let closed = false;
      while (i < n) {
        const ch = source[i];
        if (ch === '\\') { i += 2; continue; }
        if (ch === c) { i++; closed = true; break; }
        if (ch === '\n') { i++; break; } // string não fechada: termina na linha (o validador sinaliza)
        i++;
      }
      const tok = { type: 'string' as TokenType, value: source.slice(start, i), line, pos: start };
      (tok as any).closed = closed;
      tokens.push(tok);
      continue;
    }

    // números
    if (isDigit(c) || (c === '.' && isDigit(source[i + 1]))) {
      i++;
      while (i < n && /[0-9a-fA-FxX._eE]/.test(source[i])) {
        // para exponenciais tipo 1e-5 / 1e+5
        if ((source[i] === 'e' || source[i] === 'E') && (source[i + 1] === '-' || source[i + 1] === '+')) i++;
        i++;
      }
      push('number', start);
      continue;
    }

    // identificadores / palavras-chave
    if (isIdentStart(c)) {
      i++;
      while (i < n && isIdentChar(source[i])) i++;
      const value = source.slice(start, i);
      push(KEYWORD_SET.has(value) ? 'keyword' : LITERAL_SET.has(value) ? 'literal' : GLOBAL_SET.has(value) ? 'global' : 'ident', start);
      continue;
    }

    // operadores
    const pair = source.slice(i, i + 2);
    if (pair === '==' || pair === '~=' || pair === '<=' || pair === '>=' || pair === '..' || pair === '!=') {
      i += 2;
      push('operator', start);
      continue;
    }
    if (pair === '...') {
      i += 3;
      push('operator', start);
      continue;
    }
    if ('+-*/^%#<>():;,.{}[]='.includes(c)) {
      i++;
      push('operator', start);
      continue;
    }

    i++;
    push('unknown', start);
  }

  return tokens;
}

export interface LuauIssue {
  severity: 'error' | 'warning';
  message: string;
  line: number;
}

interface BlockBalance {
  depth: number;      // blocos fechados por end (function/then/do)
  repeatDepth: number; // blocos repeat fechados por until
  openLine: number[];  // linha aproximada de abertura (para mensagens)
}

function scanBlocks(tokens: LuauToken[]): BlockBalance {
  const bb: BlockBalance = { depth: 0, repeatDepth: 0, openLine: [] };
  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (tok.type === 'keyword') {
      if (tok.value === 'function' || tok.value === 'then' || tok.value === 'do') bb.depth++;
      else if (tok.value === 'end') bb.depth--;
      else if (tok.value === 'repeat') bb.repeatDepth++;
      else if (tok.value === 'until') bb.repeatDepth--;
    }
  }
  return bb;
}

/**
 * Validação estrutural honesta: identificador de erros e avisos sem fingir
 * que o código foi executado. Serve para pegar os erros mais comuns antes
 * de o script ir para o Roblox.
 */
export function validateLuau(source: string): LuauIssue[] {
  const issues: LuauIssue[] = [];
  const tokens = tokenizeLuau(source);

  // 1. parênteses/colchetes/chaves desbalanceados
  const stack: { ch: string; line: number }[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  for (const tok of tokens) {
    if (tok.type !== 'operator') continue;
    for (const ch of tok.value) {
      if (ch === '(' || ch === '[' || ch === '{') stack.push({ ch, line: tok.line });
      else if (ch === ')' || ch === ']' || ch === '}') {
        const top = stack.pop();
        if (!top) {
          issues.push({ severity: 'error', message: `'${ch}' fechado sem correspondente de abertura.`, line: tok.line });
        } else if (top.ch !== pairs[ch]) {
          issues.push({ severity: 'error', message: `'${ch}' não corresponde a '${top.ch}' aberto na linha ${top.line}.`, line: tok.line });
        }
      }
    }
  }
  for (const open of stack) {
    issues.push({ severity: 'error', message: `'${open.ch}' aberto na linha ${open.line} nunca foi fechado.`, line: open.line });
  }

  // 2. strings não fechadas
  for (const tok of tokens) {
    if (tok.type === 'string') {
      const closed = (tok as any).closed !== false;
      const isLong = tok.value.startsWith('[[') || tok.value.startsWith('[=');
      if (!closed && !isLong) {
        issues.push({ severity: 'error', message: `Texto entre aspas não fechado nesta linha.`, line: tok.line });
      } else if (isLong) {
        if (!/^\[\=*\[/.test(tok.value) || !/\]=*\]$/.test(tok.value)) {
          issues.push({ severity: 'error', message: 'Texto longo ([[ ]]) não fechado.', line: tok.line });
        }
      }
    }
    if (tok.type === 'comment' && !/\]=*\]\s*$/.test(tok.value) && tok.value.startsWith('--[')) {
      const eqs = tok.value.match(/^--\[(=*)\[/);
      if (eqs) issues.push({ severity: 'error', message: 'Comentário longo (--[[ ]]) não fechado.', line: tok.line });
    }
  }

  // 3. operador != (não existe em Luau: use ~=)
  for (const tok of tokens) {
    if (tok.type === 'operator' && tok.value === '!=') {
      issues.push({ severity: 'error', message: `Operador '!=' não existe em Luau; use '~='.`, line: tok.line });
    }
  }

  // 4. equilíbrio de blocos
  const bb = scanBlocks(tokens);
  if (bb.depth > 0) {
    issues.push({ severity: 'error', message: `Faltam ${bb.depth} 'end' para fechar função/then/do.`, line: lastLine(tokens) });
  } else if (bb.depth < 0) {
    issues.push({ severity: 'error', message: `${-bb.depth} 'end' em excesso (não há bloco aberto para eles).`, line: lastLine(tokens) });
  }
  if (bb.repeatDepth > 0) {
    issues.push({ severity: 'warning', message: `Há ${bb.repeatDepth} 'repeat' sem 'until'.`, line: lastLine(tokens) });
  } else if (bb.repeatDepth < 0) {
    issues.push({ severity: 'error', message: `${-bb.repeatDepth} 'until' em excesso.`, line: lastLine(tokens) });
  }

  // 5. avisos úteis
  for (const tok of tokens) {
    if (tok.type === 'ident' && tok.value === 'wait' && tok.line >= 0) {
      // aviso leve, comum em código novo
      issues.push({ severity: 'warning', message: `'wait' é obsoleto; prefira 'task.wait()'.`, line: tok.line });
    }
  }

  return issues.sort((a, b) => a.line - b.line);
}

function lastLine(tokens: LuauToken[]): number {
  return tokens.length ? tokens[tokens.length - 1].line : 1;
}

const OPENERS = new Set(['then', 'do', 'repeat']);
const CLOSERS_START = new Set(['end', 'until', 'else', 'elseif']);

/** Re-grava a indentação identação por blocos (sem reordenar nem reescrever nada). */
export function formatLuau(source: string): string {
  const indentUnit = '    ';
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let depth = 0;
  const out: string[] = [];
  for (const original of lines) {
    const tokens = tokenizeLuau(original);
    const meaningful = tokens.filter(t => t.type !== 'whitespace' && t.type !== 'comment');
    const first = meaningful[0];
    let lineIndent = depth;
    if (first && first.type === 'keyword' && CLOSERS_START.has(first.value)) {
      lineIndent = Math.max(0, depth - 1);
    } else if (first && first.type === 'keyword' && first.value === 'function' && depth === 0) {
      lineIndent = 0;
    }
    // calcula variação de profundidade nesta linha
    let delta = 0;
    for (const tok of meaningful) {
      if (tok.type === 'keyword') {
        if (tok.value === 'function' || OPENERS.has(tok.value)) delta++;
        else if (tok.value === 'end' || tok.value === 'until') delta--;
      }
    }
    const nextDepth = Math.max(0, depth + delta);
    out.push(indentUnit.repeat(lineIndent) + original.trim());
    depth = nextDepth;
  }
  return out.join('\n');
}

/** Sugestões de autocomplete: serviços do Roblox, globais e palavras-chave. */
export function getCompletions(word: string, limit = 8): string[] {
  if (!word) return [];
  const lower = word.toLowerCase();
  const pool = [...KEYWORDS, ...GLOBALS, ...SERVICES, 'LocalScript', 'ModuleScript'];
  const starts = pool.filter(w => w.toLowerCase().startsWith(lower) && w !== word);
  const contains = pool.filter(w => !starts.includes(w) && w.toLowerCase().includes(lower));
  return [...starts, ...contains].slice(0, limit);
}
