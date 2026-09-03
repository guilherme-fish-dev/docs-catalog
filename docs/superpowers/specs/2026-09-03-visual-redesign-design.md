# Redesign visual do Catálogo de Documentos

## Contexto e objetivo

O catálogo (uso pessoal, sem vínculo com identidade de empresa) está funcional,
mas com uma estética que "cheira a IA": paleta terrosa genérica (verde/laranja),
glassmorphism com blur em todo painel, sombras difusas repetidas em todo
elemento, gradientes sem intenção. Nada disso comunica personalidade.

Objetivo: dar uma identidade visual forte e autoral, mantendo o projeto 100%
estático (sem build, sem framework) e sem alterar a estrutura/funcionalidade
existente — é um reskin, não uma reescrita.

Direção validada com o usuário via mockups comparativos (companion visual de
brainstorming): estilo **dark + neobrutalista**, paleta **Citrine & Plum**,
tipografia **Fraunces itálico + Inter**, brutalismo aplicado a todos os
elementos de UI, sem mudança de layout estrutural.

## Escopo

**Dentro do escopo:**
- `styles.css` — nova paleta de cores, tipografia, bordas, sombras, estados
  (hover/focus/selected) de todos os componentes existentes.
- `index.html` — troca das fontes carregadas (Google Fonts) e ajustes mínimos
  de markup **apenas se estritamente necessários** para o novo estilo (ex.:
  um wrapper extra para um efeito visual). Nenhuma seção é criada, removida
  ou reposicionada.
- Sem novos arquivos JS, sem mudança de `app.js`, `js/storage.js`,
  `js/importExport.js` — o redesign é puramente visual (CSS + tipografia).

**Fora do escopo:**
- Qualquer mudança de layout estrutural (barra de projeto no topo, sidebar de
  filtros à esquerda, grid de cards à direita permanecem onde estão).
- Qualquer mudança de comportamento/funcionalidade (busca, ranking, import/
  export, CRUD de projeto/documento).
- Dark/light mode alternável — o novo visual é escuro por padrão e único (não
  há modo claro).
- Ícones ou ilustrações customizadas — usar apenas tipografia, cor, borda e
  sombra para gerar personalidade (evita dependência de assets externos).

## Direção visual

### Paleta — "Citrine & Plum"

Fundo escuro em tons de ameixa/berinjela (não preto puro, para manter alguma
temperatura/personalidade), com amarelo-citrino como cor de destaque única.
Contraste alto, sem gradientes, sem cores translúcidas em glass.

| Papel | Cor aproximada | Uso |
|---|---|---|
| `--bg` | `#150b18` (ameixa quase-preto) | fundo da página |
| `--surface` | `#1e0f22` (ameixa escuro) | painéis, cards, inputs |
| `--surface-raised` | `#241129` | chips, elementos sobre surface |
| `--border` | `#3a2240` (ameixa médio, baixo contraste) | bordas neutras/secundárias |
| `--accent` | `#f4d35e` (citrino) | bordas de destaque, sombra dura, links, foco, elementos ativos |
| `--text` | `#f3e9ee` (quase-branco rosado) | texto principal |
| `--text-muted` | `#c9a8d1` (lilás claro) | texto secundário |
| `--danger` | manter um vermelho/coral que não brigue com o citrino (ex.: `#ff6a6a`) para ações destrutivas (remover projeto/documento) |

Não há gradiente em nenhum elemento. Sombras usam cor sólida do `--accent`
(sombra "dura", sem blur: `box-shadow: 4px 4px 0 var(--accent)` como padrão),
substituindo o `--shadow` difuso atual em todos os `.panel`, `.doc-card`,
inputs, botões e no modal.

### Tipografia

- Títulos (`h1`, `h2`, `.card-title`, `.modal-title`): **Fraunces**, peso 600,
  **itálico** — substitui Space Grotesk. O itálico é a assinatura visual do
  projeto (contraste "editorial" contra o brutalismo do resto da UI).
- Corpo, labels, botões, inputs: **Inter** — substitui IBM Plex Sans.
- Elementos "técnicos" (eyebrow/labels em uppercase, badges de score, tags,
  texto de busca) podem usar uma mono (ex. **JetBrains Mono**) para reforçar
  o lado técnico do brutalismo, como visto no mockup de tipografia.

Carregar via Google Fonts (mesmo mecanismo de `<link>` já usado hoje),
trocando a família importada em `index.html`.

### Componentes (regras gerais de estilo)

Aplicado consistentemente a: `.panel`, `.doc-card`, `.chip`/`.filter-pill`,
botões (`.primary-link`, `.secondary-button`, `.ghost-button`,
`.danger-button`), inputs/textarea, `.modal-panel`, `.fab`, badges.

- **Bordas**: sólidas, grossas (2–3px), cor `--border` (neutro) ou `--accent`
  (quando o elemento é interativo/destacado — inputs em foco, card em hover,
  botão primário, FAB).
- **Sombra**: dura e sólida na cor `--accent` (ex. `4px 4px 0` para elementos
  menores, `6px 6px 0` para painéis maiores), nunca com blur. Ao `:hover`/
  `:active`, o elemento se desloca (`translate`) reduzindo o offset da
  sombra — simula "pressionar" o elemento contra a sombra (interação clássica
  do neobrutalismo).
- **Raio de borda**: reduzir bem em relação ao atual (`--radius-lg`/`-md`
  generosos hoje) — cantos quase retos (2–6px) em vez de arredondados,
  reforçando o brutalismo. `--radius-sm` (chips/pills totalmente arredondados)
  é removido: chips/tags passam a ter cantos retos como o resto.
- **Sem** `backdrop-filter`/blur em lugar nenhum (remove o glassmorphism
  atual do `.panel`/`.doc-card`).
- **Sem** gradiente em nenhum background (remove os `radial-gradient`/
  `linear-gradient` do `body`, `.hero`, `.primary-link`, `.fab`).
- **Estados de seleção** (`.chip.is-selected`, filtros ativos): fundo sólido
  `--accent` com texto `--bg` (inversão de contraste), reforçando que aquele
  é o único destaque de cor da tela.
- **Foco de acessibilidade**: outline/sombra em `--accent` visível em todos os
  elementos focáveis (mantém ou melhora a acessibilidade atual).

### O que muda vs. hoje, resumo rápido

| Aspecto | Antes | Depois |
|---|---|---|
| Paleta | Terrosa (verde/laranja sobre bege) | Escura (ameixa) + destaque único (citrino) |
| Fundo | Gradientes radiais + grid sutil | Cor sólida `--bg`, sem textura/gradiente |
| Painéis/cards | Glass (blur + translúcido) + sombra difusa | Opaco + borda sólida + sombra dura |
| Cantos | Bem arredondados (16–24px) | Quase retos (2–6px) |
| Tipografia título | Space Grotesk (regular) | Fraunces itálico (peso 600) |
| Tipografia corpo | IBM Plex Sans | Inter |
| Chips/tags | Pill totalmente arredondado | Retângulo de canto reto, borda sólida |
| Interação hover/press | `translateY` sutil + sombra mais difusa | Deslocamento + redução do offset da sombra dura |

## Testes / verificação

Projeto não tem testes visuais automatizados (os testes existentes, em
`tests/`, cobrem `storage.js`/`importExport.js` — lógica pura, não afetada
por este trabalho). Verificação será manual:

- Abrir `index.html` no navegador e conferir visualmente: hero, barra de
  projeto, sidebar (busca, temas, tags), grid de resultados, cards, FAB,
  modal de cadastro (todas as seções do form, incluindo chip-input de
  tags/sinônimos e mensagem de erro).
- Conferir estados: hover/focus em botões e cards, chip selecionado, filtro
  ativo, resultado vazio (`.empty-state`), formulário com erro.
- Conferir responsivo nos breakpoints já existentes (`980px`, `640px`).
- Rodar `node tests/storage.test.js` e `node tests/importExport.test.js`
  para garantir que nada em JS foi quebrado incidentalmente (não deveriam
  ser tocados, mas serve de guarda).

## Riscos / decisões em aberto

- Contraste de acessibilidade: ameixa escuro + citrino tem bom contraste
  (validar com uma checagem rápida de WCAG AA durante a implementação,
  especialmente `--text-muted` sobre `--surface`).
- Fraunces itálico em títulos longos pode reduzir legibilidade em telas
  pequenas — se necessário, cair para itálico só em `h1`/`.modal-title` e
  manter `h2`/`.card-title` em Fraunces não-itálico (decisão de ajuste fino
  na implementação, não bloqueia o design).
