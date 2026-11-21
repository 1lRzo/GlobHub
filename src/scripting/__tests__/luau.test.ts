import { describe, expect, it } from 'vitest';
import { formatLuau, getCompletions, tokenizeLuau, validateLuau } from '../luau';

describe('tokenizador Luau', () => {
  it('separa palavras-chave, strings, números e comentários', () => {
    const src = "local x = 42 -- contagem\nprint('oi, mundo')\n";
    const tokens = tokenizeLuau(src);
    const kinds = tokens.map(t => t.type);
    expect(kinds).toContain('keyword');
    expect(kinds).toContain('number');
    expect(kinds).toContain('comment');
    expect(kinds).toContain('global');
    const str = tokens.find(t => t.type === 'string');
    expect(str?.value).toContain('oi, mundo');
  });

  it('trata strings longas e comentários longos', () => {
    const src = '--[[ comentário\nlongo ]] local s = [[texto\nmultilinha]]\n';
    const tokens = tokenizeLuau(src);
    const comments = tokens.filter(t => t.type === 'comment');
    const strings = tokens.filter(t => t.type === 'string');
    expect(comments.length).toBe(1);
    expect(strings.length).toBe(1);
    expect(strings[0].value.includes('multilinha')).toBe(true);
  });

  it('numera linhas corretamente', () => {
    const src = 'local a = 1\nlocal b = 2\n\nlocal c = 3';
    const tokens = tokenizeLuau(src);
    const numbers = tokens.filter(t => t.type === 'number');
    expect(numbers).toHaveLength(3);
    expect(numbers[2].line).toBe(4);
  });
});

describe('validação Luau', () => {
  it('aceita um script válido do Roblox sem listar erros', () => {
    const src = `local Players = game:GetService('Players')\nPlayers.PlayerAdded:Connect(function(player)\n\tprint('entrou', player.Name)\nend)\n`;
    expect(validateLuau(src).filter(i => i.severity === 'error')).toEqual([]);
  });

  it('detecta end faltando', () => {
    const src = 'function f(x)\n\tdo\n\t\tprint(x)\nend\n';
    const issues = validateLuau(src);
    expect(issues.some(i => i.severity === 'error' && i.message.includes('end'))).toBe(true);
  });

  it('detecta end em excesso', () => {
    const src = 'local x = 1\nend\n';
    expect(validateLuau(src).some(i => i.severity === 'error' && i.message.includes('excesso'))).toBe(true);
  });

  it('detecta parênteses desbalanceados', () => {
    expect(validateLuau("print('a'\n").some(i => i.severity === 'error' && i.message.includes('nunca foi fechado'))).toBe(true);
    expect(validateLuau('local x = (1 + 2)\n)').some(i => i.severity === 'error' && i.message.includes('sem correspondente'))).toBe(true);
  });

  it('detecta string não fechada e operador !=', () => {
    const issues = validateLuau("local s = 'nunca fechado\nif a != b then end\n");
    expect(issues.some(i => i.message.includes('aspas'))).toBe(true);
    expect(issues.some(i => i.message.includes("'~='"))).toBe(true);
  });

  it('avisa sobre task.wait preferível a wait', () => {
    const src = 'while true do\n\twait(1)\nend\n';
    expect(validateLuau(src).some(i => i.severity === 'warning' && i.message.includes('task.wait'))).toBe(true);
    const ok = 'while true do\n\ttask.wait(1)\nend\n';
    expect(validateLuau(ok).some(i => i.message.includes('task.wait'))).toBe(false);
  });
});

describe('formatador Luau', () => {
  it('re-congrua a indentação de blocos', () => {
    const src = 'function f()\nprint(1)\nif true then\nprint(2)\nend\nend\n';
    const formatted = formatLuau(src);
    const lines = formatted.split('\n');
    expect(lines[1].startsWith('    ')).toBe(true);
    expect(lines[3].startsWith('        ')).toBe(true);
    expect(lines[4].startsWith('    ')).toBe(true);
    expect(lines[5]).toBe('end');
  });

  it('não altera conteúdo além da indentação', () => {
    const src = 'local a = 1\nprint(a)\n';
    expect(formatLuau(src)).toBe(src);
  });
});

describe('autocomplete', () => {
  it('sugere serviços e globais', () => {
    expect(getCompletions('Pla')).toContain('Players');
    expect(getCompletions('Rep')).toContain('ReplicatedStorage');
    expect(getCompletions('vec')).toContain('Vector3');
    expect(getCompletions('')).toEqual([]);
  });
});
