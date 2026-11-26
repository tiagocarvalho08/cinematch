# CineMatch · Recomendador de Filmes e Séries

> **Acesse a aplicação:** [https://tiagocarvalho08.github.io/cinematch/](https://tiagocarvalho08.github.io/cinematch/)
>
> **Relatório (PDF):** [docs/relatorio-cinematch.pdf](docs/relatorio-cinematch.pdf)

O CineMatch ajuda quem passa mais tempo procurando o que assistir do que assistindo. Você informa o **humor do momento**, o **tempo disponível**, os **gêneros favoritos** e a **faixa etária** de quem vai assistir, e o app sugere **3 filmes ou séries** compatíveis. Também mostra a que horas cada um termina se você começar agora.

Projeto da disciplina **Desenvolvimento de Interfaces (HTML, CSS e JavaScript)**, desenvolvido com Vibe Coding (programação assistida por IA).

**Autor:** Tiago Carvalho (trabalho individual)

---

## Funcionalidades

| Requisito | O que faz | Onde |
|---|---|---|
| **RF01** Selecionar preferências | Tipo (filmes/séries), humor, tempo, gêneros e faixa etária. Salvas a cada mudança. | Tela **Descobrir** |
| **RF02** Gerar recomendações | 3 sugestões com nota, duração, categoria, % de compatibilidade e o motivo da escolha | **Descobrir**, botão *Gerar recomendações* |
| **RF03** Adicionar favoritos | Botão de coração em recomendações, catálogo e detalhes | Todas as telas |
| **RF04** Remover favoritos | Botão *Remover* com **Desfazer** por 6 segundos | **Favoritos** |
| **RF05** Visualizar histórico | Últimas 30 sessões, com as preferências usadas e o atalho *Usar estas preferências* | **Histórico** |
| **RF06** Salvar dados localmente | Tema, perfis, preferências, favoritos, notas e histórico no LocalStorage | `js/storage.js` |
| Tema claro/escuro | Botão de sol/lua no topo. Abre no escuro e lembra a escolha. | Barra superior |

### Diferenciais (criatividade e bônus)

- **Busca no catálogo**: aceita palavras sem acento (por exemplo "acao"), com filtros por tipo e gênero e quatro ordenações. Atalho de teclado: `/`.
- **Avaliação por estrelas (1 a 5)**: sua nota pessoal, separada da nota do público.
- **Estatísticas**: favoritos, tempo para ver tudo, médias, gêneros preferidos, humores e tempos que você mais pede, e recomendações dos últimos 7 dias.
- **Perfis de usuário**: cada pessoa da casa tem os próprios favoritos, notas e histórico.
- **"Me surpreenda"**: uma roleta sorteia um título entre os compatíveis.
- **"Cabe no seu tempo"**: uma barra compara a duração com o tempo livre e mostra o horário de término (nas séries, quantos episódios cabem).
- **Animações**: entrada dos cartões, barras que crescem e coração que pulsa. Com o sistema em "reduzir movimento", tudo vira um fade curto.
- **Pôsteres reais** em grade no catálogo e nos favoritos, com nota e coração sobre a imagem.
- **Recomendação principal em destaque**, com pôster grande e sinopse.
- **Detalhes do título** em janela, e ajuda *Como funciona* explicando o algoritmo.
- **Acessível**: HTML semântico, navegação por teclado, link "Pular para o conteúdo", rótulos ARIA e contraste AA nos dois temas.

## Como a recomendação funciona

1. **Filtra** pelo tipo pedido, pela classificação indicativa (até a faixa escolhida) e pelo tempo disponível. Nas séries, conta a duração de um episódio.
2. **Pontua** de 0 a 100%: gêneros em comum valem 40%, o humor 30% e a nota do público 30%.
3. **Varia**: títulos sugeridos nas duas últimas sessões perdem pontos, para que gerar de novo traga opções diferentes.

## Estrutura

```
cinematch/
├── index.html          estrutura semântica de todas as telas e diálogos
├── css/
│   └── style.css       tokens de cor (claro/escuro), layout e responsividade
├── js/
│   ├── app.js          interface: rotas, formulário, recomendação, telas
│   ├── movies.js       catálogo (54 títulos) + gêneros, humores, tempos, faixas
│   └── storage.js      toda a leitura e gravação no LocalStorage
└── assets/
    └── images/         logo.svg e favicon.svg
```

Não há dependências nem etapa de build: são só arquivos estáticos. Os recursos externos são as fontes (Google Fonts) e os pôsteres (Wikipédia).

## Rodar no computador

Abra o `index.html` no navegador, ou sirva a pasta:

```bash
python3 -m http.server 5173
```

e acesse `http://localhost:5173`.

## Publicar no GitHub Pages

1. Crie um repositório público chamado `cinematch` e envie estes arquivos (o `index.html` deve ficar na raiz).
2. No GitHub, abra **Settings → Pages**, escolha **Deploy from a branch**, depois a branch `main` e a pasta `/ (root)`, e salve.
3. Em 1 ou 2 minutos o site sai em `https://tiagocarvalho08.github.io/cinematch/` (link no topo deste README).

## Tecnologias

HTML5, CSS3 (custom properties, grid, `@media`, `prefers-reduced-motion`), JavaScript vanilla (ES2020), LocalStorage, `<dialog>` e `<details>` nativos. Fontes: Bricolage Grotesque (títulos) e Manrope (textos), do Google Fonts.

**Visual:** tema escuro por padrão, com fundo quase preto (#0D0A0B) e vermelho bordô (#8E1D33) nas ações, seleções e dados. O tema claro continua disponível no botão de sol/lua.

## Observações

- Notas do público, durações e classificações são **dados de exemplo** aproximados, montados para o projeto acadêmico. As sinopses foram escritas para o projeto.
- Os **pôsteres** vêm da Wikipédia (upload.wikimedia.org), usados com fins educacionais e creditados no rodapé. Os endereços estão em `js/movies.js` (objeto `POSTERS`). Séries que só têm logo na Wikipédia aparecem com o logo sobre um fundo escuro, e 3 títulos sem imagem usam um pôster tipográfico. Se uma imagem não carregar, o pôster tipográfico entra no lugar.
