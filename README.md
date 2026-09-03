# Catálogo de Documentos

Catálogo local de links de documentos (Drive, Confluence, o que for), organizado
por **projeto**, com busca por texto/tags/tema e sincronização manual entre
máquinas via export/import de JSON. Sem backend, sem build, sem nuvem — é só
HTML/CSS/JS aberto direto no navegador.

## Como usar

### Abrir

Abra `index.html` direto no navegador (duplo clique, ou `start index.html` no
terminal). Também funciona servido por qualquer servidor estático simples
(`npx serve .`, `python -m http.server`, etc.) se preferir.

### Navegar entre projetos

No topo da página tem um seletor **Projeto**. Cada projeto é um catálogo
isolado — documentos de um projeto nunca aparecem em outro.

- **+ Novo projeto**: cria um projeto vazio, pede só o nome.
- **Renomear**: muda o nome do projeto ativo (o id interno não muda).
- **Remover**: apaga o projeto ativo e todos os seus documentos. Pede
  confirmação — não tem desfazer.

### Cadastrar, buscar e remover documentos

- **+ Cadastrar** (canto inferior direito): abre o formulário — título, tema,
  tags, resumo e o link do documento. Tags e sinônimos são digitados e
  confirmados com Enter ou vírgula.
- A busca (barra lateral) filtra por texto, tema e tags ao mesmo tempo,
  combinando correspondência textual com um ranking leve baseado nos termos
  cadastrados (título, tema, tags, resumo, sinônimos).
- Todo documento tem um botão **Remover** no próprio card.

### Sincronizar entre dois computadores

Não tem nuvem nem conta envolvida — a sincronização é manual, por arquivo:

1. No projeto que quer levar, clique em **Exportar JSON** — baixa um arquivo
   `<projeto>-export-<data>.json` com todos os documentos daquele projeto.
2. Leve esse arquivo pro outro computador do jeito que preferir (pendrive,
   e-mail pra você mesmo, etc.).
3. No outro computador, abra o catálogo e clique em **Importar JSON**,
   escolha o arquivo. Se o projeto ainda não existir lá, ele é criado
   automaticamente com o mesmo nome.
4. Você escolhe entre:
   - **Mesclar**: mantém o que já existe localmente e só adiciona os
     documentos novos do arquivo. Se um `id` já existir dos dois lados, o
     documento local é mantido (o do arquivo é ignorado e reportado).
   - **Substituir**: apaga os documentos atuais do projeto e usa só o que
     veio no arquivo.

## Como funciona

### Onde o dado mora

Tudo fica no **localStorage do navegador** — não existe backend, não existe
arquivo de dados versionado. Cada projeto tem sua própria "gaveta":

| Chave no localStorage | Conteúdo |
|---|---|
| `docscat_v1_projects` | Lista de projetos: `[{id, label}]` |
| `docscat_v1_active_project` | Id do projeto selecionado no momento |
| `docscat_v1_docs_<projectId>` | Array de documentos daquele projeto |

Isso significa: limpar os dados do navegador (ou usar uma aba anônima) apaga
o catálogo daquela máquina. Exportar de vez em quando é o backup.

### Arquivos do projeto

- `index.html` / `styles.css` — estrutura e visual da página.
- `app.js` — toda a lógica de UI: renderização, busca/ranking, formulário de
  cadastro, seletor de projeto, export/import.
- `js/storage.js` — módulo puro (sem DOM) que fala com o `localStorage`:
  criar/renomear/remover projeto, ler/gravar documentos por projeto, migração
  inicial. Testado com `node tests/storage.test.js`.
- `js/importExport.js` — módulo puro que monta o JSON de export e aplica a
  lógica de mesclar/substituir no import (incluindo validação básica de
  formato e detecção de `id` duplicado). Testado com
  `node tests/importExport.test.js`.
- `projects.config.js` — projeto(s) padrão usados **só na primeira execução**,
  pra popular o catálogo vazio (hoje: um projeto genérico "Projeto 1"). Depois
  da primeira carga, toda alteração de projeto vive só no localStorage — esse
  arquivo não é mais lido.
- `documents.js` — **arquivo local, fora do git** (veja `.gitignore`). Serve
  só como fonte de migração única: se você já tinha documentos cadastrados
  no protótipo antigo (versão anterior desta ferramenta, de projeto único),
  eles são lidos daqui uma vez e movidos pro localStorage. Depois disso o
  arquivo não é mais necessário — pode inclusive não existir (num clone novo,
  por exemplo) que a ferramenta funciona normalmente, só sem esse seed extra.

### Por que nada disso pede build ou servidor

Todo módulo é um `<script>` clássico (sem `import`/`export` de ES Modules),
com um wrapper que expõe tanto `window.NomeDoModulo` (pro navegador, via
`file://` ou servidor) quanto `module.exports` (pro Node, usado só pelos
testes). Isso deixa o projeto inteiro aberto direto num navegador, sem
`npm install`, sem bundler.

### Rodando os testes

```bash
node tests/storage.test.js
node tests/importExport.test.js
```

Cobrem: isolamento de dados entre projetos, criação/renomeação/remoção de
projeto, migração idempotente (não duplica dado num segundo carregamento),
export/import (merge, replace, conflito de `id`, doc inválido rejeitado).
`app.js`/`index.html`/`styles.css` não têm teste automatizado — são
verificados manualmente no navegador (é puramente wiring de UI).

## Privacidade

Nenhum dado de documento (título, resumo, link) sai da sua máquina — tudo
fica no localStorage local. O único conteúdo versionado neste repositório é
o **código** da ferramenta; nomes de projeto reais e links de documentos
ficam de fora do git por design (veja `.gitignore` e `documents.js`).
