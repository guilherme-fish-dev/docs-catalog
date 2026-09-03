# Editar documento

## Contexto e objetivo

O catálogo hoje só permite **cadastrar** e **remover** documentos — não existe
como corrigir um documento já salvo sem apagar e recadastrar do zero. Isso
veio à tona com um caso real: um documento foi cadastrado com o campo Tema
preenchido como `"Padroes, Teste"` (um único valor de texto, já que Tema —
diferente de Tags — não é uma lista), o que fez a sidebar de "Temas" agrupar
esse valor inteiro como um tema só em vez de dois temas separados. Sem edição,
a única correção possível era apagar o documento e cadastrar de novo.

Objetivo: permitir editar qualquer campo de um documento existente, mantendo
seu `id` estável.

**Fora do escopo** (decidido explicitamente): o campo Tema continua sendo um
valor único de texto por documento, igual hoje — não vira uma lista como
Tags. O usuário resolve o caso acima simplesmente reeditando o Tema para um
valor único (ex.: `"Padroes"`).

## Escopo

**Dentro do escopo — tudo em `app.js` (único arquivo tocado):**
- Botão **Editar** em cada card de documento, ao lado do botão **Remover**
  já existente.
- Reaproveitar o modal/formulário de cadastro (`#modal-overlay`,
  `#doc-form` e todos os seus campos) também para edição — sem duplicar
  markup nem criar um segundo modal.
- Modo edição: título do modal e texto do botão de salvar mudam para
  refletir que é uma edição; todos os campos (título, tema, tags, resumo,
  link, sinônimos) vêm pré-preenchidos com os valores atuais do documento.
- Mesmas validações do cadastro (título, tema, ao menos uma tag, resumo e
  link obrigatórios).
- Ao salvar uma edição, o documento é atualizado no lugar (mesma posição no
  array, mesmo `id`) em vez de um novo documento ser criado.
- Cancelar ou fechar o modal em modo edição não altera o documento.

**Fora do escopo:**
- Qualquer mudança em `storage.js`, `importExport.js`, `styles.css`,
  `index.html`, `projects.config.js` — o botão "Editar" reaproveita a
  classe CSS `.secondary-button` já existente (mesmo estilo visual dos
  botões "Exportar JSON"/"Importar JSON").
- Mudar o campo Tema de valor único para lista (decidido fora do escopo,
  ver Contexto).
- Qualquer mudança em como o `id` de um documento é gerado na criação —
  isso continua `slugify(title) + "-" + Date.now()`, inalterado. A única
  regra nova é que **editar nunca regenera o `id`**.
- Histórico de alterações / undo — editar sobrescreve o documento, sem
  guardar a versão anterior.

## Direção técnica

### Estado do modal: criar vs. editar

Hoje `app.js` tem um único fluxo de modal (sempre criação). A mudança
introduz uma variável de estado, por exemplo `editingDocId` (inicialmente
`null`), que guarda o `id` do documento em edição — ou `null` quando o
modal está em modo criação.

- `openModal()` (criação): comportamento atual, sem mudanças — chama a
  função de abertura com `editingDocId = null`.
- Uma nova função de abertura para edição (ex.: `openEditModal(doc)`) seta
  `editingDocId = doc.id`, preenche cada campo do formulário e os dois
  conjuntos de chips (`formTags`, `formSynonyms`) com os valores de `doc`,
  atualiza o texto do título do modal (`#modal-title`) e do botão de
  submit (`.primary-link` dentro do form) para refletir "editar", e então
  abre o modal do mesmo jeito que a criação (mesma função que faz
  `el.modalOverlay.hidden = false` etc.).
- `closeModal()` / `resetForm()`: além do que já fazem hoje, devem resetar
  `editingDocId` para `null` e devolver o título do modal e o texto do
  botão de submit para os valores de criação — garantindo que abrir o
  modal de criação logo depois de cancelar uma edição não deixe "vazamento"
  de estado.

### Botão Editar no card

Em `createCard(doc)`, ao lado do botão `.danger-button.delete-btn` já
existente na `div.doc-actions`, adicionar um botão:

```html
<button class="secondary-button edit-btn" type="button" data-id="...">Editar</button>
```

com um listener equivalente ao do botão de remover, chamando
`openEditModal(doc)` com o documento daquele card.

### Submit do formulário

O listener de submit (`el.docForm.addEventListener("submit", ...)`) hoje
sempre monta um `newDoc` com um `id` novo e dá `push` no array de docs. A
mudança:

- As mesmas leituras de campo e as mesmas validações (título, tema, tags,
  resumo, link) continuam idênticas — reaproveitadas para os dois modos.
- Se `editingDocId` for `null` → comportamento atual: gera `id` novo,
  monta o objeto e dá `push`.
- Se `editingDocId` não for `null` → monta o objeto do documento com
  `id: editingDocId` (o mesmo de antes, nunca regenerado) e os demais
  campos vindos do formulário; localiza o documento com esse `id` no
  array de docs do projeto ativo e **substitui** esse item no array
  (mesma posição), em vez de dar `push`.
- Nos dois casos: `storageApi.saveDocs(...)`, `rebuildIndex()`, `render()`
  e `closeModal()` acontecem do mesmo jeito que hoje.

### Textos de UI dependentes do modo

| Elemento | Modo criação (atual) | Modo edição (novo) |
|---|---|---|
| `#modal-title` | "Cadastrar documento" | "Editar documento" |
| Botão de submit do form | "Salvar documento" | "Salvar alterações" |

Esses textos são trocados via `textContent` no momento de abrir o modal
(criação ou edição) — sem duplicar markup no `index.html`.

## Testes / verificação

`app.js` não tem suíte de testes automatizados hoje (só `js/storage.js` e
`js/importExport.js`, que são módulos puros sem DOM, têm testes em
`tests/`). Esta feature não muda isso — verificação será manual, no
navegador:

- Cadastrar um documento novo (fluxo de criação continua funcionando
  exatamente como antes).
- Clicar em "Editar" num card existente: modal abre com título "Editar
  documento", todos os campos e chips (tags e sinônimos) pré-preenchidos
  corretamente com os dados daquele documento.
- Alterar um campo (ex.: o Tema, corrigindo o caso relatado) e salvar:
  o card atualiza com o novo valor, o documento some da lista antiga de
  "Temas" (se o tema antigo não for mais usado por nenhum outro doc) e
  aparece agrupado sob o novo tema.
- Confirmar que o `id` do documento não muda após editar (útil pra quem
  já exportou esse `id` num JSON antes — exportar de novo depois de
  editar deve manter o mesmo `id`).
- Abrir o modal de edição, mexer em campos, e clicar em "Cancelar" (ou
  fechar com X/Esc/clique fora): documento original permanece inalterado.
- Editar removendo/adicionando tags e sinônimos via os chip-inputs
  existentes — confirmar que os chips somem/apareçam corretamente e que o
  resultado salvo reflita o estado final dos chips.
- Tentar salvar uma edição deixando um campo obrigatório vazio: mesma
  mensagem de erro do cadastro aparece, sem fechar o modal.
- Abrir criação normalmente logo após cancelar uma edição: modal deve
  abrir vazio, com título "Cadastrar documento" (sem vazamento de estado
  do modo edição anterior).
- Rodar `node tests/storage.test.js` e `node tests/importExport.test.js`
  como guarda de regressão (não deveriam ser afetados, já que nenhum dos
  dois arquivos é tocado).

## Riscos / decisões em aberto

Nenhum identificado — mudança é aditiva e contida a `app.js`, reaproveita
100% do markup e CSS existentes.
