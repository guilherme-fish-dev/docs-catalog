# Link Catalog

Uma awesome list pessoal para organizar **os links que você escolher adicionar**. Guarde sites, ferramentas, artigos, vídeos, referências e qualquer outro recurso em coleções separadas por projeto.

O catálogo funciona localmente no navegador: não tem conta, backend ou serviço de descoberta de links. Você adiciona os endereços; o Link Catalog ajuda a organizar e encontrar o que já está na sua coleção.

## Começar

Abra `index.html` no navegador. Se preferir, sirva a pasta com qualquer servidor estático, como `npx serve .` ou `python -m http.server`.

### Organizar por projeto

Cada projeto mantém sua própria coleção de links. Use o seletor **Projeto** para trocar de coleção.

- **+ Novo projeto** cria uma coleção vazia.
- **Renomear** altera o nome do projeto ativo.
- **Remover** apaga o projeto e todos os links dele, após confirmação.

### Adicionar e encontrar links

Clique em **Adicionar link** e preencha título, tema, tags, resumo e URL. Sinônimos são opcionais e ajudam a busca a encontrar um link com termos relacionados. Pressione Enter ou vírgula para confirmar cada tag ou sinônimo.

Use a busca e os filtros de tema e tags para localizar itens da coleção atual. Cada card permite abrir, editar ou remover um link.

## Levar os dados para outro navegador ou computador

Os dados ficam neste navegador. Para transferir uma coleção manualmente:

1. No projeto desejado, clique em **Exportar JSON**.
2. Leve o arquivo exportado para o outro computador.
3. Abra o Link Catalog e clique em **Importar JSON**.
4. Escolha se quer **mesclar** os links com o projeto existente ou **substituir** o conteúdo desse projeto.

Ao mesclar, os links que já têm o mesmo ID local são preservados. Ao substituir, os links atuais daquele projeto são apagados e trocados pelos do arquivo. Ambas as opções informam o que será feito antes de aplicar alterações.

### Backup local automático

Chrome e Edge para computador permitem vincular um arquivo JSON local como backup automático. O arquivo pode estar em uma pasta sincronizada por outro serviço, se você quiser. Depois de vinculado, mudanças no catálogo salvam um snapshot de todos os projetos nesse arquivo.

- **Usar backup existente** vincula um arquivo que já existe e permite importar o conteúdo dele para este navegador.
- **Criar novo backup** escolhe onde criar o arquivo.
- **Restaurar do backup** aplica o snapshot ao navegador após confirmação.
- **Desvincular** encerra o vínculo sem apagar nem alterar o arquivo.

Esse recurso depende da File System Access API e pode não aparecer em navegadores sem suporte, incluindo navegadores móveis.

## Onde os dados ficam

O catálogo usa o `localStorage` do navegador e não envia títulos, resumos ou URLs para um backend. Cada navegador mantém seus próprios dados; limpar os dados do navegador também remove a coleção local. Exporte ou vincule um backup para manter uma cópia.

Os dados das coleções não são versionados neste repositório. O arquivo local `documents.js`, quando presente, é usado apenas para migrar dados do protótipo antigo uma única vez e está fora do Git.

## Desenvolvimento

O projeto é HTML, CSS e JavaScript sem etapa de build ou instalação de dependências. Para rodar os testes dos módulos:

```bash
node tests/storage.test.js
node tests/importExport.test.js
node tests/localBackup.test.js
```

Os testes cobrem armazenamento por projeto, migração, importação/exportação e snapshots de backup. A interface em `index.html`, `app.js` e `styles.css` é verificada manualmente.
