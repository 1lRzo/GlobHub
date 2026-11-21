# Roblox Web Studio

Um ambiente de desenvolvimento de jogos Roblox que roda inteiramente no navegador, projetado primeiro para celular (Android) e também para computador.

## Status do projeto

O desenvolvimento segue etapas. As etapas concluídas nesta versão são a **Etapa 1** e a **Etapa 2**:

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

### Próximas etapas

- Etapa 3: agente de IA com ferramentas reais do editor (criar/ler/editar objetos e scripts, planejamento, histórico de ações, confirmação para operações destrutivas), via API de IA integrada em backend próprio.
- Etapa 4: animações, terreno, iluminação avançada, biblioteca de assets e sons.
- Etapa 5: ambiente de testes, exportação `.rbxlx` e publicação via Roblox Open Cloud com backend seguro (nenhuma chave no frontend).
- Etapa 6: otimização, segurança, revisão mobile e testes gerais.

## Como rodar

```bash
npm install
npm run dev      # desenvolvimento
npm test         # testes das funções centrais e do analisador Luau
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
- **`src/features`**: gerenciador de projetos, estúdio, Explorer, Properties, scripts
- **Armazenamento local do navegador**: persistência dos projetos (com backup por exportação de arquivo `.json`)
- **Testes**: Vitest cobre a árvore de instâncias, todos os modelos, o ciclo de serialização e o analisador Luau

## Limitações honestas desta etapa

- O editor de código valida e destaca a estrutura, mas **não executa Luau**: a execução real acontece dentro do motor do Roblox. A interpretação de scripts no navegador chegará com o ambiente de testes da Etapa 5, e até lá fica claro no app quando algo é simulação do editor.
- A exportação no formato `.rbxlx` e a publicação via Roblox Open Cloud chegam na Etapa 5, com backend próprio para guardar credenciais com segurança (nenhuma chave fica no frontend).
- Física em tempo real (simulação no viewport), terreno esculpível e multiplayer pertencem às etapas seguintes; as propriedades correspondentes já existem no modelo de dados.
