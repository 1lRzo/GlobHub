import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { LuauToken, getCompletions, tokenizeLuau, validateLuau } from '../luau';

const COLORS: Record<string, string> = {
  keyword: '#c678dd',
  literal: '#d19a66',
  string: '#98c379',
  comment: '#5f6776',
  number: '#d19a66',
  global: '#e5c07b',
  ident: '#e6edf3',
  operator: '#8b98a9',
  whitespace: '',
  unknown: '#f85149'
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightHtml(tokens: LuauToken[]): string {
  let html = '';
  for (const tok of tokens) {
    if (tok.type === 'whitespace') {
      html += escapeHtml(tok.value);
    } else {
      const color = COLORS[tok.type] ?? '#e6edf3';
      html += `<span style="color:${color}">${escapeHtml(tok.value)}</span>`;
    }
  }
  return html;
}

interface HistoryEntry { value: string }

export function CodeEditor({ source, onChange, fileName }: { source: string; onChange: (next: string) => void; fileName: string }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HistoryEntry[]>([{ value: source }]);
  const historyIndexRef = useRef(0);
  const lastPushRef = useRef(Date.now());

  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [wordCaret, setWordCaret] = useState<{ start: number } | null>(null);

  const html = useMemo(() => highlightHtml(tokenizeLuau(source)), [source]);
  const lineCount = useMemo(() => source.split('\n').length, [source]);
  const issues = useMemo(() => validateLuau(source), [source]);
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.length - errorCount;
  const [showIssues, setShowIssues] = useState(false);

  // histórico local (o editor mantém o seu próprio undo para não conflitar com o undo do projeto)
  useEffect(() => {
    const now = Date.now();
    if (now - lastPushRef.current > 600) {
      const stack = historyRef.current.slice(0, historyIndexRef.current + 1);
      stack.push({ value: source });
      historyRef.current = stack.slice(-80);
      historyIndexRef.current = historyRef.current.length - 1;
      lastPushRef.current = now;
    }
  }, [source]);

  // atualiza contagem de ocorrências da busca
  useEffect(() => {
    if (!findText) { setMatchCount(0); return; }
    let count = 0;
    let idx = source.indexOf(findText);
    while (idx !== -1) {
      count++;
      idx = source.indexOf(findText, idx + findText.length);
    }
    setMatchCount(count);
  }, [findText, source]);

  const syncScroll = () => {
    const ta = taRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  };

  const applyEdit = (next: string, caret?: number) => {
    onChange(next);
    if (caret !== undefined) {
      requestAnimationFrame(() => {
        const ta = taRef.current;
        if (ta) ta.setSelectionRange(caret, caret);
      });
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    // undo/redo local do editor
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (historyIndexRef.current > 0) {
        historyIndexRef.current--;
        applyEdit(historyRef.current[historyIndexRef.current].value);
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyIndexRef.current++;
        applyEdit(historyRef.current[historyIndexRef.current].value);
      }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd } = ta;
      const next = source.slice(0, selectionStart) + '    ' + source.slice(selectionEnd);
      applyEdit(next, selectionStart + 4);
      return;
    }
    if (e.key === 'Enter') {
      // manter a indentação da linha anterior
      e.preventDefault();
      const { selectionStart } = ta;
      const lineStart = source.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = source.slice(lineStart, selectionStart);
      const indent = (currentLine.match(/^[ \t]*/) ?? [''])[0];
      const extra = currentLine.trimEnd().match(/(then|do|repeat|\bfunction[^)]*\)\s*)$/) ? '    ' : '';
      const insertion = '\n' + indent + extra;
      const next = source.slice(0, selectionStart) + insertion + source.slice(ta.selectionEnd);
      applyEdit(next, selectionStart + insertion.length);
      return;
    }
    if (e.key === 'Escape') {
      setSuggestions([]);
    }
  };

  const onChangeTa = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onChange(value);
    // autocomplete por palavra
    const pos = e.target.selectionStart;
    const before = value.slice(0, pos);
    const match = before.match(/[A-Za-z_][A-Za-z0-9_.]*$/);
    setWordCaret(match ? { start: pos - (match[0].length) } : null);
  };

  useEffect(() => {
    if (!wordCaret) { setSuggestions([]); return; }
    const ta = taRef.current;
    if (!ta) return;
    const before = source.slice(0, ta.selectionStart);
    const match = before.match(/[A-Za-z_][A-Za-z0-9_.]*$/);
    if (!match || match[0].length < 2) { setSuggestions([]); return; }
    setSuggestions(getCompletions(match[0]));
  }, [wordCaret, source]);

  const acceptSuggestion = (sugg: string) => {
    const ta = taRef.current;
    if (!ta || !wordCaret) return;
    const pos = ta.selectionStart;
    const next = source.slice(0, wordCaret.start) + sugg + source.slice(pos);
    applyEdit(next, wordCaret.start + sugg.length);
    setSuggestions([]);
  };

  const replaceAll = () => {
    if (!findText) return;
    const next = source.split(findText).join(replaceText);
    applyEdit(next, Math.min(source.length, next.length));
  };

  const jumpToMatch = () => {
    const ta = taRef.current;
    if (!ta || !findText) return;
    const idx = source.indexOf(findText, ta.selectionEnd);
    if (idx === -1) {
      const first = source.indexOf(findText);
      if (first !== -1) ta.setSelectionRange(first, first + findText.length);
    } else {
      ta.setSelectionRange(idx, idx + findText.length);
    }
    ta.focus();
  };

  return (
    <div className="code-editor" aria-label={`Editor de código: ${fileName}`}>
      <div className="code-toolbar">
        <button
          className={`btn-ghost ${findOpen ? 'active' : ''}`}
          onClick={() => setFindOpen(o => !o)}
          aria-label="Pesquisar e substituir"
        >
          Pesquisar
        </button>
        <span className="code-filename">{fileName}</span>
        <button className={`btn-ghost issues-toggle ${errorCount > 0 ? 'has-errors' : ''}`} onClick={() => setShowIssues(o => !o)} aria-label="Problemas encontrados na análise">
          {errorCount > 0 ? `${errorCount} erro(s)` : warningCount > 0 ? `${warningCount} aviso(s)` : 'sem erros'}
        </button>
      </div>
      {showIssues && issues.length > 0 && (
        <div className="code-issues" aria-label="Problemas do código">
          {issues.slice(0, 20).map((iss, idx) => (
            <button
              key={`${iss.line}-${idx}`}
              className={`code-issue ${iss.severity}`}
              onClick={() => {
                const ta = taRef.current;
                if (ta) {
                  const lineStart = source.split('\n').slice(0, iss.line - 1).join('\n').length + (iss.line > 1 ? 1 : 0);
                  ta.focus();
                  ta.setSelectionRange(lineStart, lineStart);
                }
              }}
            >
              <span>{iss.line}</span> {iss.message}
            </button>
          ))}
        </div>
      )}
      {findOpen && (
        <div className="code-find">
          <input
            value={findText}
            onChange={e => setFindText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') jumpToMatch(); }}
            placeholder="Pesquisar..."
            aria-label="Pesquisar no código"
          />
          <input
            value={replaceText}
            onChange={e => setReplaceText(e.target.value)}
            placeholder="Substituir por..."
            aria-label="Substituir no código"
          />
          <div className="code-find-actions">
            <span className="hint">{findText ? `${matchCount} ocorrência(s)` : ''}</span>
            <button className="btn-ghost" onClick={jumpToMatch}>Próxima</button>
            <button className="btn-ghost" onClick={replaceAll}>Substituir tudo</button>
          </div>
        </div>
      )}
      <div className="code-body">
        <div
          className="code-gutter"
          ref={gutterRef}
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <div className="code-content">
          <pre ref={preRef} className="code-highlight" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html + '\n\n' }} />
          <textarea
            ref={taRef}
            className="code-input"
            value={source}
            onChange={onChangeTa}
            onKeyDown={onKeyDown}
            onScroll={syncScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            aria-label="Código Luau"
          />
          {suggestions.length > 0 && (
            <div className="code-suggestions" role="listbox" aria-label="Sugestões">
              {suggestions.map(s => (
                <button key={s} className="code-suggestion" onClick={() => acceptSuggestion(s)}>{s}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
