# Catálogo de Documentos — Design

Data: 2026-09-03
Status: Aprovado (aguardando plano de implementação)

## Contexto

Hoje existe um protótipo local (`SitesUteis/docs/glossario`) que já resolve busca/filtro/cadastro de links de documentos (originalmente "Glossário de Documentos", focado em um único conjunto fixo de docs em `documents.js`). O problema real é mais amplo: como arquiteto, o usuário navega entre **múltiplos projetos/clientes simultâneos** (hoje ClienteExemplo + outros) e precisa achar rapidamente o link certo de um documento, sem depender do Google Drive desorganizado. Precisa também acessar o mesmo catálogo em dois notebooks diferentes (note da consultoria e note do cliente), sem depender de nuvem, git ou de uma conta Anthropic (Artifact foi cogitado e descartado por essa razão).

## Objetivo

Generalizar o protótipo em uma ferramenta única, local (sem backend, sem build), multi-projeto, com sincronização manual entre máquinas via export/import de JSON.

## Fora de escopo

- Sincronização automática entre PCs (nuvem, git, Artifact) — descartado explicitamente pelo usuário.
- Autenticação/multiusuário — uso é individual.
- Campos extras (owner, data de revisão) — adiados para uma iteração futura.
- Subir dados reais de clientes para qualquer repositório git.

## Arquitetura

App estático (HTML/CSS/JS puro, sem dependências externas, aberto via `file://` ou servidor local simples) com um **seletor de projeto** no topo. Trocar o projeto no seletor troca qual conjunto de documentos é exibido — sem misturar dados entre projetos.

Renomeação: "Glossário de Documentos" → **"Catálogo de Documentos"** em toda a UI e nos identificadores de código (`GLOSSARY_DOCUMENTS` → `PROJECT_SEED_DOCUMENTS` ou equivalente genérico).

## Modelo de dados

### Projetos

- `projects.config.js`: arquivo estático, **genérico** (sem dado de cliente), git-safe. Contém a lista **seed** de projetos: `[{id, label}]`. Usado só para popular o registro na primeira execução.
- Registro real de projetos em runtime: `localStorage["docscat_v1_projects"]` — array de `{id, label}`. Seedado a partir de `projects.config.js` na primeira carga (se a chave ainda não existir). Depois disso, `projects.config.js` não é mais lido — toda alteração (criar/renomear/remover projeto) passa a viver só no localStorage.

### Documentos

- Fonte de verdade única por projeto: `localStorage["docscat_v1_docs_<projectId>"]` — array de documentos no mesmo shape já usado hoje (`id, title, theme, tags[], summary, sourceUrl, synonyms[]`).
- Os 2 documentos hoje hardcoded em `documents.js` (Contrato de Locação, Implementação W3) tornam-se o seed inicial do projeto `cliente-exemplo` (id fixo), carregado uma única vez no primeiro uso caso a chave de localStorage ainda não exista. Depois da migração, `documents.js` não é mais referenciado pelo app (mantido no disco só como registro histórico, fora do git).
- **Nada de dado real de cliente entra em arquivo versionável.** Apenas `projects.config.js` (nomes/ids de projeto — ainda assim tratado como sensível o suficiente para revisão manual antes de qualquer commit) e o código do app são git-safe.

## Funcionalidades novas na UI

### Seletor + gestão de projetos

- Dropdown de projeto ativo no header, ao lado de um botão **"+ Novo projeto"**.
- **Novo projeto**: modal simples pedindo nome; gera `id` via slug do nome (+ sufixo se colidir); cria namespace vazio no localStorage; adiciona ao registro; troca o seletor para o novo projeto.
- **Renomear projeto**: edita só o `label` no registro (o `id`/namespace de dados não muda).
- **Remover projeto**: apaga a entrada do registro e a chave `docscat_v1_docs_<projectId>` do localStorage. Exige confirmação explícita (ação destrutiva e irreversível localmente).

### Export / Import (mecanismo de sincronização entre PCs)

- Botão **"Exportar projeto"**: gera um `.json` para download contendo `{ project: {id, label}, documents: [...] }` do projeto ativo.
- Botão **"Importar projeto"**: input de arquivo `.json` (formato acima). Ao importar:
  - Se o `project.id` do arquivo não existe localmente, cria o projeto (usa o `label` do arquivo).
  - Pergunta ao usuário: **substituir** todos os documentos do projeto local pelos do arquivo, ou **mesclar** (documentos novos por `id` são adicionados; `id`s já existentes localmente não são sobrescritos, para não perder edições feitas só numa máquina — em caso de conflito de `id`, o item do arquivo é ignorado e reportado ao usuário).
- O transporte do arquivo entre as duas máquinas (pendrive, e-mail, etc.) fica fora do escopo da ferramenta.

## Fluxo de dados (resumo)

1. Carrega a página → garante registro de projetos existe (seed de `projects.config.js` se primeira vez) → garante seed do projeto `cliente-exemplo` existe (migração de `documents.js` se primeira vez) → renderiza com o último projeto selecionado (persistido também em localStorage, ex.: `docscat_v1_active_project`).
2. Toda operação de cadastro/edição/remoção de documento já existente no protótipo (`+ Cadastrar`) passa a gravar direto no namespace do projeto ativo — sem a etapa manual de copiar JSON pra um arquivo fonte.
3. Busca, filtros por tema/tag e ranking textual continuam operando exatamente como hoje, mas escopados ao projeto ativo (índice reconstruído ao trocar de projeto).

## Estrutura de arquivos

Mantém a pasta atual `SitesUteis/docs/glossario/`, sem mudar de lugar (renomear a pasta fica fora de escopo desta spec — pode ser feito depois, é só um `mv`). Arquivos:

- `index.html` — adiciona seletor de projeto + botão novo projeto + botões export/import no header.
- `app.js` — reestruturado: index por projeto, registro de projetos, import/export, mantém toda a lógica de busca/ranking existente (reaproveitada, só passa a operar sobre o projeto ativo).
- `styles.css` — pequenos acréscimos para os novos controles (dropdown, botões, modal de novo projeto reaproveitando o modal existente).
- `projects.config.js` — novo arquivo, seed inicial `[{id: "cliente-exemplo", label: "ClienteExemplo"}]`.
- `documents.js` — mantido no disco só como fonte de migração (lido uma vez); não é mais a fonte de verdade em runtime.

## Testes / verificação manual

Sem stack de testes automatizados (é HTML/JS estático sem build). Verificação manual cobrindo:

- Primeira carga: migração automática do projeto `cliente-exemplo` com os 2 docs existentes.
- Criar projeto novo vazio, cadastrar doc nele, confirmar isolamento (não aparece no outro projeto).
- Exportar projeto, importar em estado limpo (localStorage vazio) — dados voltam idênticos.
- Importar arquivo com `id` de documento já existente localmente — merge não sobrescreve, replace sobrescreve.
- Remover projeto — confirma que os dados somem do localStorage.

## Riscos / limitações aceitas

- Dado vive só no `localStorage` do navegador daquela máquina — limpar dados do navegador apaga o catálogo. Mitigado pelo hábito de exportar após mudanças relevantes (fora do escopo forçar backup automático).
- Sincronização é manual e sujeita a esquecimento — aceito pelo usuário como troca consciente por não depender de nuvem/conta Anthropic.
