# Arquivar documento

## Contexto e objetivo

Surgiu a necessidade de guardar links de coisas como threads importantes
(Slack, etc.) no catálogo — que já funcionam bem com o modelo de documento
existente (título, tema, tags, resumo, link). O problema é que, ao longo do
tempo, esses registros deixam de ser relevantes no dia a dia mas ainda valem
a pena manter (referência histórica) — sem um jeito de "guardar sem apagar",
eles ficam poluindo a busca e os filtros de Tema/Tag pra sempre, ou o usuário
acaba removendo (perdendo) o registro.

Objetivo: permitir **arquivar** um documento — ele some dos resultados e dos
filtros da sidebar por padrão, mas continua salvo e pode ser trazido de volta
pra busca marcando um checkbox "Incluir arquivados", sem precisar navegar
pra uma tela separada.

## Escopo

**Dentro do escopo:**
- Novo campo `archived` (boolean) no objeto de documento. Documentos
  existentes sem esse campo são tratados como `archived: false` — sem
  necessidade de migração ou script de conversão.
- Botão **Arquivar** em cada card (ao lado de Editar/Remover), que vira
  **Desarquivar** quando o documento já está arquivado. Alterna
  `archived` e salva.
- Checkbox **"Incluir arquivados"** na barra de busca lateral, desmarcado
  por padrão a cada carregamento/troca de projeto (não é persistido).
- Com o checkbox desmarcado: documentos arquivados não aparecem nos
  resultados **nem** contribuem para as listas de "Temas"/"Tags" da
  sidebar (não poluem os filtros com valores que só existem em docs
  arquivados).
- Com o checkbox marcado: documentos arquivados voltam a aparecer nos
  resultados (sujeitos aos mesmos filtros de tema/tag/busca que qualquer
  outro documento) e passam a contribuir pras listas de Temas/Tags. Cada
  card arquivado mostra uma badge **"Arquivado"**, reaproveitando o
  estilo visual já existente do badge de relevância (`.score-badge`) —
  sem CSS novo.

**Fora do escopo:**
- Uma tela/visão dedicada só para arquivados — é sempre um toggle dentro
  da busca normal, nunca uma navegação separada.
- Arquivamento em massa (selecionar vários documentos de uma vez).
- Persistir o estado do checkbox entre sessões ou trocas de projeto —
  sempre volta a desmarcado.
- Qualquer mudança em `js/storage.js` ou `js/importExport.js` — ambos já
  tratam documentos como objetos genéricos (array de docs por projeto);
  um campo `archived` a mais não exige nenhuma mudança de storage nem de
  export/import (um documento arquivado exporta e importa normalmente,
  campo incluído).
- Campos específicos de "thread" (canal, participantes, data) — decidido
  previamente que um link de thread é só mais um documento comum.

**Nota sobre arquivos tocados:** diferente das duas features anteriores
(que couberam só em `app.js`), esta precisa de uma pequena adição em
`index.html`: o checkbox "Incluir arquivados" não existe hoje em nenhuma
forma reaproveitável, então é um elemento novo de markup (um
`<input type="checkbox">` mais um `<label>`, dentro do painel de busca já
existente na sidebar). Sem CSS novo — o checkbox usa a aparência nativa do
navegador e o label reaproveita a classe de texto já usada em `.field-hint`
(mesmo estilo do texto de ajuda abaixo do campo de busca).

## Direção técnica

### Modelo de dados

Documento passa a ter (todos os campos antigos inalterados, mais um novo):

```js
{ id, title, theme, tags, summary, sourceUrl, synonyms, archived }
```

`archived` é `true` ou `false`. Ao criar um documento novo, `archived`
sempre começa `false`. Ao editar um documento (feature já existente), o
valor de `archived` é preservado — editar não arquiva nem desarquiva.

### Alternar arquivado

Um novo botão no card, ao lado de "Remover":
- Se `doc.archived` for falso: mostra "Arquivar".
- Se `doc.archived` for verdadeiro: mostra "Desarquivar".

Clicar alterna o campo `archived` daquele documento no array de docs do
projeto ativo, salva via `storageApi.saveDocs(...)`, reconstrói o índice
de busca e re-renderiza — mesmo padrão já usado por `deleteDocument`.

### Checkbox "Incluir arquivados" e filtragem

Novo estado, ex. `state.includeArchived` (booleano, `false` por padrão,
resetado junto com os outros filtros ao trocar de projeto ou clicar em
"Resetar filtros").

- A reconstrução do índice de busca (hoje `rebuildIndex()`, que gera as
  listas de Temas/Tags a partir de todos os documentos do projeto) passa
  a considerar `state.includeArchived`: quando falso, os documentos com
  `archived: true` são excluídos **antes** de calcular temas/tags
  disponíveis: um tema ou tag que só existe em documentos arquivados não
  aparece na sidebar enquanto o checkbox estiver desmarcado.
- A filtragem de resultados (hoje `filterDocuments()`) aplica a mesma
  regra: quando `state.includeArchived` for falso, documentos arquivados
  nunca entram nos resultados, independente de baterem com busca/tema/tag.
  Quando verdadeiro, documentos arquivados entram nos resultados
  normalmente, sujeitos aos mesmos filtros que qualquer outro documento.
- Marcar/desmarcar o checkbox dispara a mesma reconstrução de índice e
  re-renderização usada hoje ao trocar um filtro.

### Badge "Arquivado" no card

Quando um documento arquivado aparece num resultado (checkbox marcado), o
card ganha uma badge extra ao lado da badge de relevância já existente,
reaproveitando a mesma classe CSS (`.score-badge`) só com o texto
"Arquivado" — sem estilo novo.

## Testes / verificação

Sem testes automatizados novos: assim como as features anteriores em
`app.js`, verificação é manual no navegador (servido localmente, nunca
`file://` direto — não aplica CSS/JS neste ambiente de preview). Rodar
`node tests/storage.test.js` e `node tests/importExport.test.js` ao final
como guarda de regressão (não devem ser afetados).

Roteiro manual:
- Cadastrar um documento novo → confirmar que nasce com `archived: false`
  (não aparece nenhuma badge "Arquivado", aparece "Arquivar" no card).
- Clicar em "Arquivar": card some da lista de resultados imediatamente
  (checkbox "Incluir arquivados" está desmarcado por padrão).
- Se esse documento tinha um Tema ou Tag exclusivos (nenhum outro
  documento usa), confirmar que esse Tema/Tag some da sidebar.
- Marcar "Incluir arquivados": o documento volta a aparecer, com a badge
  "Arquivado" e o botão agora dizendo "Desarquivar"; o Tema/Tag exclusivo
  volta a aparecer na sidebar.
- Clicar em "Desarquivar": volta ao estado original (some a badge, botão
  volta a dizer "Arquivar", documento continua visível pois o checkbox
  ainda está marcado).
- Desmarcar o checkbox: documento desarquivado permanece visível
  normalmente (não estava mais arquivado).
- Trocar de projeto (ou usar "Resetar filtros") com o checkbox marcado:
  confirmar que ele volta a desmarcado.
- Editar um documento arquivado (feature de edição já existente): salvar
  a edição não deve desarquivá-lo.
- Exportar o projeto (JSON) com um documento arquivado e reimportar num
  projeto novo: confirmar que o campo `archived` é preservado no arquivo
  exportado e no documento reimportado (nenhuma mudança de código deveria
  ser necessária pra isso funcionar, já que `js/importExport.js` trata o
  documento como objeto genérico — o teste é só pra confirmar que essa
  suposição se sustenta na prática).

## Riscos / decisões em aberto

Nenhum identificado — mudança é aditiva, contida a `app.js` mais uma
pequena adição de markup em `index.html`, sem CSS novo e sem tocar
`storage.js`/`importExport.js`.
