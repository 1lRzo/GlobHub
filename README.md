# Roblox Web Studio

Um ambiente de desenvolvimento de jogos Roblox que roda inteiramente no navegador, projetado primeiro para celular (Android) e também para computador.

## Status do projeto

O desenvolvimento segue etapas. A etapa concluída nesta versão é a **Etapa 1**:

- [x] Gerenciador de projetos (criar, abrir, duplicar, renomear, excluir, exportar, importar)
- [x] 12 modelos iniciais que geram estruturas reais (Baseplate, Obby, Cidade, Simulador, Tycoon, Roleplay, Survival, Horror, FPS, Jogo de história, Mundo aberto, Vazio)
- [x] Editor 3D real (Three.js): seleção, mover, rotacionar, escalar com manipuladores visuais, câmera por gestos no celular
- [x] Explorer com hierarquia de serviços do Roblox: criar, renomear, duplicar, excluir, mover, pesquisar, expandir/recolher
- [x] Properties com propriedades específicas por classe de objeto
- [x] Ferramentas de edição: agrupar, desagrupar, ancorar, colisão, cor, material, transparência
- [x] Undo/Redo com histórico
- [x] Salvamento automático em armazenamento local do navegador

Próximas etapas: editor Luau (2), agente de IA com ferramentas reais (3), animações/terreno/luzes/sons (4), ambiente de testes e publicação via Roblox Open Cloud (5), otimização e segurança (6).

## Como rodar

```bash
npm install
npm run dev      # desenvolvimento
npm test         # testes das funções centrais
npm run build    # build de produção
```

O deploy para GitHub Pages acontece automaticamente na branch `main` (habilitar Pages com fonte "GitHub Actions").

## Arquitetura

- **React + TypeScript + Vite**: interface
- **Zustand**: estado central (o mesmo projeto alimenta Explorer, Viewport 3D e Properties, sempre sincronizados)
- **Three.js**: viewport 3D
- **Armazenamento local do navegador**: persistência dos projetos (com backup por exportação de arquivo `.json`)
- **Testes**: Vitest cobre a árvore de instâncias, a validade de todos os modelos e o ciclo de serialização

## Limitações honestas desta etapa

- A exportação no formato `.rbxlx` e a publicação via Roblox Open Cloud chegam na Etapa 5, com backend próprio para guardar credenciais com segurança (nenhuma chave fica no frontend).
- Physics em tempo real, terreno esculpível e multiplayer pertencem às etapas 2 a 4; as propriedades correspondentes já existem no modelo de dados.
- Scripts criados nos modelos são código Luau real e são executados dentro do Roblox quando o projeto for reproduzido lá; a execução de scripts no editor é a Etapa 2.
