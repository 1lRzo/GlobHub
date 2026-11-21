# Roblox Web Studio

Um ambiente de desenvolvimento de jogos Roblox que roda inteiramente no navegador, projetado primeiro para celular (Android) e também para computador.

## Status do projeto

O desenvolvimento segue etapas. As etapas concluídas nesta versão são a **Etapa 1**, a **Etapa 2** e a **Etapa 3**:

### Etapa 1 — Base

- [x] Gerenciador de projetos (criar, abrir, duplicar, renomear, excluir, exportar, importar)
- [x] 12 modelos iniciais que geram estruturas reais (Baseplate, Obby, Cidade, Simulador, Tycoon, Roleplay, Survival, Horror, FPS, Jogo de história, Mundo aberto, Vazio)
- [x] Editor 3D real (Three.js): seleção, mover, rotacionar, escalar com manipuladores visuais, câmera por gestos no celular
- [x] Explorer com hierarquia de serviços do Roblox: criar, renomear, duplicar, excluir, mover, pesquisar, expandir/recolher
- [x] Properties com propriedades específicas por classe de objeto
- [x] Ferramentas de edição: agrupar, desagrupar, ancorar, colisão, cor, material, transparência
- [x] Undo/Redo com histórico
- [x] Salvamento automático em armazenamento local do navegador

### Etapa 2 — Scripts e código

- [x] Editor de código Luau próprio, mobile-first: realce de sintaxe real (tokenizador Luau próprio), numeração de linhas, abas de scripts, busca e substituição, indentação automática ao quebrar linha, histórico interno de alterações e salvamento automático no projeto
- [x] Análise estrutural real (sem fingir execução): erros de blocos (`end` faltando/em excesso, `repeat`/`until`), parênteses/colchetes desbalanceados, strings e comentários longos não fechados, uso de `!=` (inexistente em Luau), avisos como `wait` obsoleto → `task.wait()`
- [x] Formatação: re-indentação por blocos sem alterar o conteúdo
- [x] Autocomplete com serviços do Roblox (`Players`, `ReplicatedStorage`, `TweenService`, `DataStoreService`...), globais e palavras-chave
- [x] Scripts Script/LocalScript/ModuleScript com código Luau real nos 12 modelos, pronto para rodar no Roblox
- [x] Propriedades físicas editáveis por objeto: Gravity do Workspace, Anchored, CanCollide, material, massa visual via dimensions (modelagem de dados pronta para o motor)

### Etapa 3 — Agente de IA com ferramentas reais

- [x] Painel de IA integrado ao editor (botão dedicado na barra superior e aba "IA" na navegação mobile), com conversa, histórico de ações e indicação do modo ativo
- [x] Agente com **function calling real**: 18 ferramentas que agem no projeto aberto (criar objetos, pastas, scripts; ler, criar e editar código Luau; renomear, mover, duplicar, agrupar; propriedades; iluminação; partículas; NPC básico; análise de scripts; busca na hierarquia)
- [x] Modo **Gemini** (opcional): o usuário informa a própria chave nas configurações do painel; a conversa usa function calling com as ferramentas do editor e planeja tarefas grandes em várias etapas
- [x] Modo **local sem chave**: comandos diretos determinísticos em português (resumo do projeto, criar pastas/partes/scripts, renomear, mover, duplicar, pintar, agrupar, excluir com confirmação, analisar scripts, buscar objetos)
- [x] Ações destrutivas (excluir objetos) **exigem confirmação** com botões Confirmar/Cancelar; histórico das ferramentas executadas em cada resposta
- [x] Toda ação da IA passa pelo mesmo estado central: o que a IA cria aparece imediatamente no Explorer, no 3D e nas Properties, e entra no histórico de undo/redo
- [x] Análise estrutural Luau aplicada a scripts criados/editados pela IA, com relatório de erros e avisos
- [x] Testes automatizados das ferramentas do agente (caminhos, criação, confirmação destrutiva, iluminação, validação)

### Próximas etapas

- Etapa 4: animações, terreno, iluminação avançada, biblioteca de assets e sons.
- Etapa 5: ambiente de testes, exportação `.rbxlx` e publicação via Roblox Open Cloud com backend seguro (nenhuma chave no frontend).
- Etapa 6: otimização, segurança, revisão mobile e testes gerais.

## Como rodar

```bash
npm install
npm run dev      # desenvolvimento
npm test         # testes das funções centrais, do analisador Luau e do agente de IA
npm run build    # build de produção
```

O deploy para GitHub Pages acontece automaticamente na branch `main` (habilitar Pages com fonte "GitHub Actions").

## Arquitetura

- **React + TypeScript + Vite**: interface
- **Zustand**: estado central (o mesmo projeto alimenta Explorer, Viewport 3D, Properties e o editor de scripts, sempre sincronizados)
- **Three.js**: viewport 3D
- **`src/core`**: modelo de instâncias estilo Roblox, catálogo de classes/propriedades, modelos de projeto, serialização
- **`src/scripting`**: tokenizador, validador estrutural, formatador de Luau e editor de código
- **`src/editor3d`**: motor do viewport
- **`src/features`**: gerenciador de projetos, estúdio, Explorer, Properties, scripts, painel de IA
- **`src/ai`**: agente de desenvolvimento (ferramentas reais do editor, function calling Gemini opcional, modo local determinístico)
- **Armazenamento local do navegador**: persistência dos projetos (com backup por exportação de arquivo `.json`); a chave da IA fica apenas no navegador do usuário até chegar a etapa de backend seguro
- **Testes**: Vitest cobre a árvore de instâncias, todos os modelos, o ciclo de serialização, o analisador Luau e as ferramentas do agente de IA

## Limitações honestas desta etapa

- O editor de código valida e destaca a estrutura, mas **não executa Luau**: a execução real acontece dentro do motor do Roblox. A interpretação de scripts no navegador chegará com o ambiente de testes da Etapa 5, e até lá o app deixa claro quando algo é simulação do editor.
- O agente de IA com chave Gemini roda no navegador do usuário com a chave que ele mesmo informa (função de configuração do painel). Quando a etapa de backend for construída, a chave migra para o servidor e o painel passa a usá-la sem exposição no cliente.
- A exportação no formato `.rbxlx` e a publicação via Roblox Open Cloud chegam na Etapa 5, com backend próprio para guardar credenciais com segurança (nenhuma chave fica no frontend).
- Física em tempo real (simulação no viewport), terreno esculpível e multiplayer pertencem às etapas seguintes; as propriedades correspondentes já existem no modelo de dados.
