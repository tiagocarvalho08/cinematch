/* ==========================================================================
   CineMatch — app.js
   Lógica da interface: rotas, formulário de preferências, recomendação,
   favoritos, histórico, estatísticas, perfis, tema e diálogos.

   Depende de:  storage.js (CineStorage)  e  movies.js (CATALOGO, GENEROS...)

   Sumário
     1. Utilitários e formatação
     2. Estado da tela
     3. Tema claro/escuro
     4. Rotas (uma seção por tela)
     5. Formulário de preferências   (RF01)
     6. Algoritmo de recomendação    (RF02)
     7. Tela Descobrir               (RF02 + Me surpreenda)
     8. Componentes: pôster, cartaz, favoritar, estrelas
     9. Catálogo com busca
    10. Favoritos                    (RF03, RF04)
    11. Histórico                    (RF05)
    12. Estatísticas
    13. Perfis
    14. Diálogos e avisos
    15. Eventos globais e início
   ========================================================================== */

(() => {
  "use strict";

  /* ======================================================================
     1. Utilitários e formatação
     ====================================================================== */
  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

  /** Escapa texto antes de inserir em HTML (nomes de perfil vêm do usuário). */
  const esc = (texto) => String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /** Remove acentos e deixa minúsculo, para a busca achar "acao" em "Ação". */
  const normalizar = (texto) => String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const reduzirMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const porId = new Map(CATALOGO.map((t) => [t.id, t]));
  const nomeGenero = (id) => (GENEROS.find((g) => g.id === id) || {}).nome || id;
  const nomeHumor = (id) => (HUMORES.find((h) => h.id === id) || {}).nome || id;
  const tempoPorId = (id) => TEMPOS.find((t) => t.id === id) || TEMPOS[2];
  const faixaPorId = (id) => FAIXAS.find((f) => f.id === id) || FAIXAS[3];

  const numero = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const formatarNota = (n) => numero.format(n);

  /** 169 -> "2h49" · 45 -> "45 min" · 120 -> "2h" · 3000 -> "50 h" */
  function formatarDuracao(min) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    if (h === 0) return `${m} min`;
    if (h >= 48) return `${h} h`; // maratonas longas: só as horas
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
  }

  /** Hora do relógio daqui a `min` minutos: "23:14". */
  function horaDaquiA(min) {
    return new Date(Date.now() + min * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  const formatarClassificacao = (c) => (c === 0 ? "Livre" : `${c} anos`);

  /** Duração total para "ver tudo": filme inteiro ou todos os episódios. */
  const duracaoTotal = (t) => (t.tipo === "serie" ? t.episodios * t.duracao : t.duracao);

  /** "Filme · 2014 · 10 anos" ou "Série · 3 temporadas · 2017 · 16 anos". */
  function metaTitulo(t) {
    const tipo = t.tipo === "serie" ? `Série · ${t.temporadas} ${t.temporadas > 1 ? "temporadas" : "temporada"}` : "Filme";
    return `${tipo} · ${t.ano} · ${formatarClassificacao(t.classificacao)}`;
  }

  /** Duração exibida: filmes mostram o total, séries o episódio. */
  const duracaoExibida = (t) => (t.tipo === "serie" ? `${t.duracao} min/ep.` : formatarDuracao(t.duracao));

  /** "Hoje, 21:14" · "Ontem, 20:02" · "12/11, 19:30" */
  function dataRelativa(iso) {
    const d = new Date(iso);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dia = new Date(d); dia.setHours(0, 0, 0, 0);
    const dias = Math.round((hoje - dia) / 86400000);
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (dias === 0) return `Hoje, ${hora}`;
    if (dias === 1) return `Ontem, ${hora}`;
    return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${hora}`;
  }

  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const icone = (id, classe = "") => `<svg class="ico ${classe}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  /* ======================================================================
     2. Estado da tela (o que não precisa ir para o LocalStorage)
     ====================================================================== */
  const estado = {
    rota: "descobrir",
    recomendacoes: [],      // [{ titulo, compat, motivos }]
    origemResultados: null, // "nova" | "sorteio" | "anterior" | null
    quandoAnterior: null,
    catalogo: { busca: "", tipo: "todos", genero: "", ordem: "nota" },
    ordemFavoritos: "recentes"
  };

  /* ======================================================================
     3. Tema claro/escuro (padrão: escuro)
     ====================================================================== */
  function aplicarTema(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    const botao = $("#botao-tema");
    botao.setAttribute("aria-label", tema === "escuro" ? "Mudar para o tema claro" : "Mudar para o tema escuro");
    botao.title = botao.getAttribute("aria-label");
    $('meta[name="theme-color"]').setAttribute("content", tema === "escuro" ? "#0d0a0b" : "#f7f2f1");
  }

  function alternarTema() {
    const novo = document.documentElement.getAttribute("data-theme") === "escuro" ? "claro" : "escuro";
    CineStorage.tema.salvar(novo);
    aplicarTema(novo);
    avisar(novo === "escuro" ? "Tema escuro ligado." : "Tema claro ligado.");
  }

  /* ======================================================================
     4. Rotas: #descobrir, #catalogo, #favoritos, #historico, #estatisticas
     ====================================================================== */
  const ROTAS = ["descobrir", "catalogo", "favoritos", "historico", "estatisticas"];
  const RENDER = {
    descobrir: renderDescobrir,
    catalogo: renderCatalogo,
    favoritos: renderFavoritos,
    historico: renderHistorico,
    estatisticas: renderEstatisticas
  };
  const NOME_ROTA = { descobrir: "Descobrir", catalogo: "Catálogo", favoritos: "Favoritos", historico: "Histórico", estatisticas: "Estatísticas" };

  function mostrarTela(rota, { focar = true } = {}) {
    if (!ROTAS.includes(rota)) rota = "descobrir";
    estado.rota = rota;
    $$(".tela").forEach((s) => { s.hidden = s.id !== `tela-${rota}`; });
    $$(".nav a").forEach((a) => {
      if (a.dataset.rota === rota) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    RENDER[rota]();
    document.title = `${NOME_ROTA[rota]} · CineMatch`;
    if (focar) {
      const h1 = $(`#tela-${rota} h1`);
      h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  const rotaAtual = () => location.hash.replace("#", "") || "descobrir";

  /* ======================================================================
     5. Formulário de preferências (RF01)
     ====================================================================== */
  const PREFS_PADRAO = { tipo: "ambos", humor: "", tempo: "120", generos: [], faixa: "14" };

  const lerPreferencias = () => ({ ...PREFS_PADRAO, ...(CineStorage.preferencias.obter() || {}) });

  const fichaRadio = (nome, valor, rotulo) =>
    `<label class="ficha"><input type="radio" name="${nome}" value="${valor}"><span>${rotulo}</span></label>`;

  /** Monta as fichas (botões de opção) do formulário a partir das listas de movies.js. */
  function montarFormulario() {
    const tipos = [{ id: "ambos", nome: "Tudo" }, { id: "filme", nome: "Filmes" }, { id: "serie", nome: "Séries" }];
    $("#campo-tipo").innerHTML = tipos.map((t) => fichaRadio("tipo", t.id, t.nome)).join("");
    $("#campo-humor").innerHTML = HUMORES.map((h) => fichaRadio("humor", h.id, h.nome)).join("");
    $("#campo-tempo").innerHTML = TEMPOS.map((t) => fichaRadio("tempo", t.id, t.nome)).join("");
    $("#campo-generos").innerHTML = GENEROS.map((g) =>
      `<label class="ficha"><input type="checkbox" name="generos" value="${g.id}"><span>${g.nome}</span></label>`).join("");
    $("#campo-faixa").innerHTML = FAIXAS.map((f) => `<option value="${f.id}">${f.nome}</option>`).join("");
  }

  /** Preenche o formulário com as preferências salvas. */
  function preencherFormulario(p) {
    const form = $("#form-preferencias");
    $$('input[name="tipo"]', form).forEach((i) => { i.checked = i.value === p.tipo; });
    $$('input[name="humor"]', form).forEach((i) => { i.checked = i.value === p.humor; i.dataset.estava = i.checked ? "1" : ""; });
    $$('input[name="tempo"]', form).forEach((i) => { i.checked = i.value === p.tempo; });
    $$('input[name="generos"]', form).forEach((i) => { i.checked = p.generos.includes(i.value); });
    $("#campo-faixa").value = p.faixa;
    atualizarResumoGeneros(p.generos);
    if (p.generos.length) $("#bloco-generos").open = true;
  }

  /** O resumo do bloco recolhível mostra quais gêneros estão marcados. */
  function atualizarResumoGeneros(generos) {
    $("#resumo-generos").textContent = generos.length ? generos.map(nomeGenero).join(", ") : "opcional · todos";
  }

  /** Lê o formulário como objeto de preferências. */
  function preferenciasDoFormulario() {
    const form = $("#form-preferencias");
    const marcado = (nome) => ($(`input[name="${nome}"]:checked`, form) || {}).value || "";
    return {
      tipo: marcado("tipo") || "ambos",
      humor: marcado("humor"),
      tempo: marcado("tempo") || "120",
      generos: $$('input[name="generos"]:checked', form).map((i) => i.value),
      faixa: $("#campo-faixa").value
    };
  }

  /** Clicar de novo no humor escolhido desmarca (o humor é opcional). */
  function permitirDesmarcarHumor() {
    $("#campo-humor").addEventListener("click", (e) => {
      const input = e.target;
      if (input.tagName !== "INPUT") return;
      if (input.dataset.estava === "1") { input.checked = false; input.dispatchEvent(new Event("change", { bubbles: true })); }
      $$('input[name="humor"]').forEach((i) => { i.dataset.estava = i.checked ? "1" : ""; });
    });
  }

  /** Resumo legível: "Animado · Até 2 h · Ficção científica · Filmes e séries · 14 anos ou mais". */
  function resumoPreferencias(p) {
    return [
      p.humor ? nomeHumor(p.humor) : "Qualquer humor",
      tempoPorId(p.tempo).nome,
      p.generos.length ? p.generos.map(nomeGenero).join(", ") : "Todos os gêneros",
      p.tipo === "ambos" ? "Filmes e séries" : p.tipo === "filme" ? "Filmes" : "Séries",
      faixaPorId(p.faixa).nome
    ].join(" · ");
  }

  /* ======================================================================
     6. Algoritmo de recomendação (RF02)
     ----------------------------------------------------------------------
     a) Filtra: tipo, classificação indicativa e tempo disponível.
     b) Pontua de 0 a 1: gêneros 40% + humor 30% + nota do público 30%.
     c) Títulos sugeridos nas 2 últimas sessões perdem 0,15 só na ordenação,
        para que gerar de novo traga opções diferentes.
     ====================================================================== */
  function cabeNoTempo(t, p) {
    const limite = tempoPorId(p.tempo).minutos;
    return limite === null || t.duracao <= limite; // nas séries, `duracao` é um episódio
  }

  function candidatos(p) {
    const maxima = faixaPorId(p.faixa).maxima;
    return CATALOGO.filter((t) =>
      (p.tipo === "ambos" || t.tipo === p.tipo) && t.classificacao <= maxima && cabeNoTempo(t, p));
  }

  function pontuar(t, p) {
    const emComum = t.generos.filter((g) => p.generos.includes(g));
    const generos = p.generos.length
      ? (emComum.length ? 0.5 + 0.5 * (emComum.length / Math.min(p.generos.length, t.generos.length)) : 0)
      : 0.5;
    const humor = p.humor ? (t.humores.includes(p.humor) ? 1 : 0) : 0.5;
    const nota = Math.min(1, Math.max(0, (t.nota - 5) / 5));
    const pontos = 0.4 * generos + 0.3 * humor + 0.3 * nota;

    const motivos = [];
    if (p.humor && t.humores.includes(p.humor)) motivos.push(nomeHumor(p.humor));
    emComum.forEach((g) => motivos.push(nomeGenero(g)));
    if (t.nota >= 8.5) motivos.push("muito bem avaliado");

    return { titulo: t, compat: Math.round(pontos * 100), pontos, motivos };
  }

  function recomendar(p, quantidade = 3) {
    const recentes = CineStorage.historico.recentes(2);
    return candidatos(p)
      .map((t) => pontuar(t, p))
      .map((r) => ({ ...r, ordem: r.pontos - (recentes.has(r.titulo.id) ? 0.15 : 0) }))
      .sort((a, b) => b.ordem - a.ordem || b.titulo.nota - a.titulo.nota)
      .slice(0, quantidade)
      .sort((a, b) => b.compat - a.compat); // exibe do mais compatível para o menos
  }

  /** Sorteio entre os compatíveis (pelo menos 50%; se não houver, entre todos os que passam nos filtros). */
  function sortear(p) {
    const todos = candidatos(p).map((t) => pontuar(t, p));
    const bons = todos.filter((r) => r.compat >= 50);
    const urna = bons.length ? bons : todos;
    return urna.length ? { escolhido: urna[Math.floor(Math.random() * urna.length)], urna } : null;
  }

  /* ======================================================================
     7. Tela Descobrir
     ====================================================================== */
  function atualizarSubtituloDescobrir(p) {
    const agora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const limite = tempoPorId(p.tempo).minutos;
    $("#sub-descobrir").textContent = limite === null
      ? `Agora são ${agora}. Sem pressa hoje: dá até para começar uma série.`
      : `Agora são ${agora}. Com ${tempoPorId(p.tempo).nome.replace("Até ", "")} livres, tudo aqui termina até as ${horaDaquiA(limite)}.`;
  }

  function renderDescobrir() {
    const p = lerPreferencias();
    atualizarSubtituloDescobrir(p);

    // Ao abrir o app, mostra a última sessão do histórico em vez de uma tela vazia.
    if (!estado.recomendacoes.length && estado.origemResultados === null) {
      const ultima = CineStorage.historico.listar()[0];
      if (ultima) {
        estado.recomendacoes = ultima.titulos.filter((id) => porId.has(id)).map((id) => pontuar(porId.get(id), ultima.preferencias));
        estado.origemResultados = "anterior";
        estado.quandoAnterior = ultima.quando;
      }
    }
    renderResultados(p);
  }

  function renderResultados(p, { animar = false } = {}) {
    const area = $("#area-resultados");
    const meta = $("#meta-resultados");
    const recs = estado.recomendacoes;

    if (!recs.length) {
      meta.textContent = "";
      // Pediu e nada passou nos filtros: explica e oferece o ajuste. Senão, é o primeiro acesso.
      area.innerHTML = estado.origemResultados === "nova" ? avisoPoucos(p, 0) : estadoVazioDescobrir(p);
      return;
    }

    if (estado.origemResultados === "anterior") meta.textContent = `Sua última sessão · ${dataRelativa(estado.quandoAnterior).toLowerCase()}`;
    else if (estado.origemResultados === "sorteio") meta.textContent = "Sorteado entre os compatíveis";
    else meta.textContent = plural(recs.length, "sugestão", "sugestões");

    const aviso = recs.length < 3 && estado.origemResultados === "nova" ? avisoPoucos(p, recs.length) : "";
    const [primeira, ...outras] = recs;
    area.innerHTML = `${aviso}
      <ol class="recs">
        ${cartaoRecomendacao(primeira, p, 0, animar, true)}
        ${outras.map((r, i) => cartaoRecomendacao(r, p, i + 1, animar, false)).join("")}
      </ol>`;
  }

  /** Antes da primeira recomendação: explica o próximo passo e mostra destaques do catálogo. */
  function estadoVazioDescobrir(p) {
    const destaques = candidatos(p).filter((t) => t.poster && t.poster.h > t.poster.w).sort((a, b) => b.nota - a.nota).slice(0, 6);
    return `
      <div class="boas-vindas">
        <p class="boas-vindas-titulo">Três sugestões em um clique.</p>
        <p>Escolha como você está e quanto tempo tem, depois toque em <strong>Gerar recomendações</strong>. Os gêneros são opcionais.</p>
      </div>
      <h3 class="subtitulo-bloco">Mais bem avaliados para esta faixa etária</h3>
      <ul class="grade-cartazes grade-compacta">${destaques.map((t) => cartaz(t)).join("")}</ul>`;
  }

  /** Quando os filtros deixam menos de 3 títulos, diz por quê e oferece um atalho para resolver. */
  function avisoPoucos(p, n) {
    const botoes = [];
    if (p.tipo !== "ambos") botoes.push(`<button class="botao botao-secundario botao-pequeno" type="button" data-ajustar="tipo">Incluir ${p.tipo === "filme" ? "séries" : "filmes"}</button>`);
    if (tempoPorId(p.tempo).minutos !== null) botoes.push(`<button class="botao botao-secundario botao-pequeno" type="button" data-ajustar="tempo">Dar mais tempo</button>`);
    const texto = n === 0 ? "Nenhum título passa nesses filtros." : `Só ${plural(n, "título passa", "títulos passam")} nesses filtros.`;
    return `<div class="aviso-inline" role="status"><p><strong>${texto}</strong> Ajuste um filtro:</p><div>${botoes.join("")}</div></div>`;
  }

  function ajustarFiltro(qual) {
    const p = preferenciasDoFormulario();
    if (qual === "tipo") p.tipo = "ambos";
    if (qual === "tempo") {
      const i = TEMPOS.findIndex((t) => t.id === p.tempo);
      p.tempo = TEMPOS[Math.min(TEMPOS.length - 1, i + 1)].id;
    }
    CineStorage.preferencias.salvar(p);
    preencherFormulario(p);
    gerarRecomendacoes();
  }

  /** "Cabe no seu tempo": trilho = tempo livre, preenchimento = duração. */
  function blocoTempo(t, p) {
    const limite = tempoPorId(p.tempo).minutos;
    let usado, texto;
    if (t.tipo === "serie") {
      const eps = limite === null ? 1 : Math.max(1, Math.min(t.episodios, Math.floor(limite / t.duracao)));
      usado = eps * t.duracao;
      texto = limite === null
        ? `1 episódio termina às <strong>${horaDaquiA(usado)}</strong>`
        : `Cabem ${plural(eps, "episódio", "episódios")}: termina às <strong>${horaDaquiA(usado)}</strong>`;
    } else {
      usado = t.duracao;
      texto = limite === null
        ? `Começando agora, termina às <strong>${horaDaquiA(usado)}</strong>`
        : `Termina às <strong>${horaDaquiA(usado)}</strong> · sobram ${formatarDuracao(limite - usado)}`;
    }
    const pct = limite === null ? 100 : Math.round((usado / limite) * 100);
    return `
      <div class="cabe">
        ${icone("relogio")}
        <p class="cabe-texto num">${texto}</p>
        <div class="cabe-trilho" role="img" aria-label="Ocupa ${pct}% do seu tempo livre"><span style="width:${pct}%"></span></div>
      </div>`;
  }

  function cartaoRecomendacao(r, p, i, animar, destaque) {
    const t = r.titulo;
    return `
      <li class="rec${destaque ? " rec-destaque" : ""}${animar ? " entrando" : ""}" style="--i:${i}" data-id="${t.id}">
        <button type="button" class="rec-capa" data-detalhes="${t.id}" aria-label="Ver detalhes de ${esc(t.titulo)}">${poster(t)}</button>
        <div class="rec-corpo">
          ${destaque ? `<p class="rec-selo">Melhor combinação</p>` : ""}
          <h3 class="rec-titulo"><button type="button" class="link-titulo" data-detalhes="${t.id}">${esc(t.titulo)}</button></h3>
          <p class="meta">${metaTitulo(t)}</p>
          <ul class="fatos num" aria-label="Informações">
            <li class="fato-nota">${icone("estrela", "ico-nota")}<span><span class="visualmente-oculto">Nota </span>${formatarNota(t.nota)}</span></li>
            <li><span class="visualmente-oculto">Duração </span>${duracaoExibida(t)}</li>
            <li>${t.generos.map(nomeGenero).join(", ")}</li>
          </ul>
          <p class="compat num"><strong>${r.compat}%</strong> compatível${r.motivos.length ? ` · ${r.motivos.map(esc).join(", ")}` : ""}</p>
          ${destaque ? `<p class="sinopse">${esc(t.sinopse)}</p>` : ""}
          ${blocoTempo(t, p)}
          <div class="rec-acoes">
            ${botaoFavoritar(t.id, true)}
            ${estrelas(t.id)}
          </div>
        </div>
      </li>`;
  }

  function gerarRecomendacoes() {
    const p = preferenciasDoFormulario();
    CineStorage.preferencias.salvar(p);
    const recs = recomendar(p);
    estado.recomendacoes = recs;
    estado.origemResultados = "nova";
    if (recs.length) CineStorage.historico.registrar({ preferencias: p, titulos: recs.map((r) => r.titulo.id), modo: "recomendacao" });
    atualizarSubtituloDescobrir(p);
    renderResultados(p, { animar: true });
    if (window.innerWidth < 1180) $("#t-resultados").scrollIntoView({ behavior: reduzirMovimento() ? "auto" : "smooth", block: "start" });
  }

  /** "Me surpreenda": troca alguns pôsteres em sequência e para em um título sorteado. */
  function surpreender() {
    const p = preferenciasDoFormulario();
    CineStorage.preferencias.salvar(p);
    const sorteio = sortear(p);
    if (window.innerWidth < 1180) $("#t-resultados").scrollIntoView({ behavior: reduzirMovimento() ? "auto" : "smooth", block: "start" });
    if (!sorteio) {
      estado.recomendacoes = []; estado.origemResultados = "nova";
      renderResultados(p);
      return;
    }
    const { escolhido, urna } = sorteio;
    const finalizar = () => {
      estado.recomendacoes = [escolhido];
      estado.origemResultados = "sorteio";
      CineStorage.historico.registrar({ preferencias: p, titulos: [escolhido.titulo.id], modo: "sorteio" });
      renderResultados(p);
      const card = $(".rec");
      if (card && !reduzirMovimento()) card.classList.add("pousou");
    };

    if (reduzirMovimento() || urna.length < 2) { finalizar(); return; }

    $("#meta-resultados").textContent = "Sorteando…";
    $("#area-resultados").innerHTML = `<ol class="recs"><li class="rec rec-destaque roleta" aria-hidden="true"></li></ol>`;
    const slot = $(".roleta");
    let passo = 0;
    const girar = () => {
      const t = urna[Math.floor(Math.random() * urna.length)].titulo;
      slot.innerHTML = `<div class="rec-capa">${poster(t)}</div><div class="rec-corpo"><p class="rec-selo">Sorteando…</p><h3 class="rec-titulo">${esc(t.titulo)}</h3><p class="meta">${metaTitulo(t)}</p></div>`;
      passo += 1;
      if (passo < 9) setTimeout(girar, 60 + passo * 20);
      else setTimeout(finalizar, 200);
    };
    girar();
  }

  /* ======================================================================
     8. Componentes: pôster, cartaz, favoritar, estrelas
     ====================================================================== */
  /**
   * Pôster do título. Vertical: a imagem preenche a moldura 2:3.
   * Horizontal (logos e cartelas de séries): a imagem fica centralizada sobre
   * um fundo escuro com o nome embaixo. Sem imagem (ou se ela falhar): pôster tipográfico.
   */
  function poster(t, tamanho = "") {
    const img = t.poster;
    const tipo = `${t.tipo === "serie" ? "Série" : "Filme"} · ${t.ano}`;
    const reserva = `<span class="poster-reserva"><span class="poster-tipo">${tipo}</span><span class="poster-titulo">${esc(t.titulo)}</span></span>`;
    if (!img) return `<div class="poster ${tamanho} sem-imagem" aria-hidden="true">${reserva}</div>`;
    const paisagem = img.w > img.h;
    return `<div class="poster ${tamanho}${paisagem ? " paisagem" : ""}" aria-hidden="true">
        <img src="${img.src}" alt="" loading="lazy" decoding="async" width="${img.w}" height="${img.h}">
        ${paisagem ? `<span class="poster-legenda">${esc(t.titulo)}</span>` : ""}
        ${reserva}
      </div>`;
  }

  /** Cartaz do catálogo e dos favoritos: pôster clicável, coração, nota e título. */
  function cartaz(t, { extra = "" } = {}) {
    return `
      <li class="cartaz" data-id="${t.id}">
        <div class="cartaz-capa">
          <button type="button" class="cartaz-abrir" data-detalhes="${t.id}" aria-label="${esc(`${t.titulo}, ${t.ano}. Ver detalhes`)}">${poster(t)}</button>
          <span class="cartaz-nota num"><span class="visualmente-oculto">Nota </span>${icone("estrela", "ico-nota")}${formatarNota(t.nota)}</span>
          ${botaoFavoritar(t.id)}
        </div>
        <p class="cartaz-titulo">${esc(t.titulo)}</p>
        <p class="cartaz-meta num">${t.tipo === "serie" ? "Série" : "Filme"} · ${t.ano} · ${duracaoExibida(t)}</p>
        ${extra}
      </li>`;
  }

  function botaoFavoritar(id, comTexto = false) {
    const ativo = CineStorage.favoritos.contem(id);
    const t = porId.get(id);
    const rotulo = ativo ? `Remover ${t.titulo} dos favoritos` : `Salvar ${t.titulo} nos favoritos`;
    return `
      <button type="button" class="favoritar${comTexto ? " com-texto" : ""}" data-favoritar="${id}" aria-pressed="${ativo}" aria-label="${esc(rotulo)}" title="${esc(rotulo)}">
        ${icone("coracao")}${comTexto ? `<span>${ativo ? "Nos favoritos" : "Favoritar"}</span>` : ""}
      </button>`;
  }

  /** Avaliação pessoal de 1 a 5 estrelas: cada estrela é um botão; a escolhida fica aria-pressed. */
  function estrelas(id, rotulo = "Sua nota") {
    const valor = CineStorage.avaliacoes.obter(id);
    const t = porId.get(id);
    const botoes = [1, 2, 3, 4, 5].map((n) => `
      <button type="button" class="estrela" data-estrela="${id}" data-valor="${n}"
        aria-pressed="${valor === n}" aria-label="${n} ${n === 1 ? "estrela" : "estrelas"}" ${n <= valor ? 'data-cheia=""' : ""}>${icone("estrela")}</button>`).join("");
    return `<div class="estrelas" role="group" aria-label="${esc(`${rotulo} para ${t.titulo}`)}"><span class="estrelas-rotulo">${rotulo}</span>${botoes}</div>`;
  }

  /** Atualiza, em todas as telas visíveis, os botões e estrelas de um título. */
  function sincronizarTitulo(id) {
    $$(`[data-favoritar="${id}"]`).forEach((b) => {
      const temp = document.createElement("div");
      temp.innerHTML = botaoFavoritar(id, b.classList.contains("com-texto"));
      const novo = temp.firstElementChild;
      const tinhaFoco = document.activeElement === b;
      b.replaceWith(novo);
      if (tinhaFoco) novo.focus();
    });
    const valor = CineStorage.avaliacoes.obter(id);
    $$(`[data-estrela="${id}"]`).forEach((b) => {
      const n = Number(b.dataset.valor);
      b.setAttribute("aria-pressed", String(n === valor));
      b.toggleAttribute("data-cheia", n <= valor);
    });
    atualizarContaFavoritos();
  }

  function alternarFavorito(id) {
    const t = porId.get(id);
    const agora = CineStorage.favoritos.alternar(id);
    sincronizarTitulo(id);
    if (agora && !reduzirMovimento()) $$(`[data-favoritar="${id}"]`).forEach((b) => b.classList.add("pulsou"));
    if (agora) avisar(`${t.titulo} entrou nos favoritos.`);
    else avisarComDesfazer(`${t.titulo} saiu dos favoritos.`, () => {
      CineStorage.favoritos.adicionar(id); sincronizarTitulo(id);
      if (estado.rota === "favoritos") renderFavoritos();
    });
    if (estado.rota === "favoritos" || estado.rota === "estatisticas") RENDER[estado.rota]();
  }

  function avaliar(id, valor) {
    const novo = CineStorage.avaliacoes.obter(id) === valor ? 0 : valor; // clicar na mesma estrela apaga a nota
    CineStorage.avaliacoes.salvar(id, novo);
    sincronizarTitulo(id);
    const t = porId.get(id);
    avisar(novo ? `Você deu ${plural(novo, "estrela", "estrelas")} para ${t.titulo}.` : `Nota de ${t.titulo} apagada.`);
    if (estado.rota === "estatisticas") renderEstatisticas();
  }

  function atualizarContaFavoritos() {
    const n = CineStorage.favoritos.listar().length;
    const conta = $("#conta-favoritos");
    conta.textContent = n ? String(n) : "";
    conta.setAttribute("aria-label", n ? plural(n, "favorito", "favoritos") : "");
  }

  /* ======================================================================
     9. Catálogo com busca
     ====================================================================== */
  function montarFiltrosCatalogo() {
    $("#filtro-genero").innerHTML = `<option value="">Todos os gêneros</option>` +
      GENEROS.map((g) => `<option value="${g.id}">${g.nome}</option>`).join("");
  }

  function filtrarCatalogo() {
    const { busca, genero, ordem } = estado.catalogo;
    const termo = normalizar(busca.trim());
    const lista = CATALOGO.filter((t) => {
      if (genero && !t.generos.includes(genero)) return false;
      if (!termo) return true;
      const texto = normalizar(`${t.titulo} ${t.sinopse} ${t.generos.map(nomeGenero).join(" ")} ${t.ano}`);
      return termo.split(/\s+/).every((parte) => texto.includes(parte));
    });
    const ordenar = {
      nota: (a, b) => b.nota - a.nota,
      titulo: (a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"),
      recentes: (a, b) => b.ano - a.ano,
      curtos: (a, b) => a.duracao - b.duracao
    }[ordem];
    return lista.sort(ordenar);
  }

  function renderCatalogo() {
    const c = estado.catalogo;
    $("#busca-catalogo").value = c.busca;
    $("#filtro-genero").value = c.genero;
    $("#ordem-catalogo").value = c.ordem;

    const filtrados = filtrarCatalogo();
    const contagem = {
      todos: filtrados.length,
      filme: filtrados.filter((t) => t.tipo === "filme").length,
      serie: filtrados.filter((t) => t.tipo === "serie").length
    };
    $("#abas-catalogo").innerHTML = [["todos", "Todos"], ["filme", "Filmes"], ["serie", "Séries"]].map(([id, nome]) =>
      `<button type="button" role="tab" class="aba" data-aba="${id}" aria-controls="grade-catalogo" tabindex="${c.tipo === id ? 0 : -1}" aria-selected="${c.tipo === id}">${nome} <span class="num">${contagem[id]}</span></button>`).join("");

    const lista = filtrados.filter((t) => c.tipo === "todos" || t.tipo === c.tipo);
    const filmes = CATALOGO.filter((t) => t.tipo === "filme").length;
    $("#sub-catalogo").textContent = c.busca || c.genero || c.tipo !== "todos"
      ? `Mostrando ${plural(lista.length, "título", "títulos")} de ${CATALOGO.length}.`
      : `${CATALOGO.length} títulos: ${filmes} filmes e ${CATALOGO.length - filmes} séries.`;

    $("#grade-catalogo").innerHTML = lista.map((t) => cartaz(t)).join("");
    $("#grade-catalogo").hidden = lista.length === 0;
    $("#vazio-catalogo").innerHTML = lista.length ? "" : `
      <div class="vazio">
        <p><strong>Nada encontrado${c.busca ? ` para “${esc(c.busca)}”` : ""}.</strong> Tente outra palavra ou tire o filtro de gênero.</p>
        <button type="button" class="botao botao-secundario" data-limpar-busca>Limpar busca e filtros</button>
      </div>`;
  }

  /* ======================================================================
     10. Favoritos (RF03 adicionar · RF04 remover)
     ====================================================================== */
  function renderFavoritos() {
    const favs = CineStorage.favoritos.listar().filter((f) => porId.has(f.id));
    const notas = CineStorage.avaliacoes.todas();
    const ordem = estado.ordemFavoritos;
    $("#ordem-favoritos").value = ordem;

    const titulos = favs.map((f) => porId.get(f.id));
    if (ordem === "estrelas") titulos.sort((a, b) => (notas[b.id] || 0) - (notas[a.id] || 0));
    if (ordem === "titulo") titulos.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));

    const total = titulos.reduce((s, t) => s + duracaoTotal(t), 0);
    const avaliados = titulos.filter((t) => notas[t.id]).length;
    $("#sub-favoritos").textContent = titulos.length
      ? `${plural(titulos.length, "título", "títulos")} · ${formatarDuracao(total)} para ver tudo · ${avaliados} de ${titulos.length} com a sua nota`
      : "Os títulos que você salvar aparecem aqui.";
    $(".ordem-favoritos").hidden = titulos.length < 2;

    const lista = $("#lista-favoritos");
    lista.classList.toggle("grade-cartazes", titulos.length > 0);
    lista.innerHTML = titulos.length ? titulos.map((t) => cartaz(t, {
      extra: `${estrelas(t.id)}<button type="button" class="botao-texto botao-remover" data-remover="${t.id}">Remover</button>`
    })).join("") : `
      <li class="vazio">
        <p><strong>Nenhum favorito ainda.</strong> Toque no coração de uma recomendação ou do catálogo para guardar aqui.</p>
        <a class="botao botao-primario" href="#descobrir">Ir para Descobrir</a>
      </li>`;
  }

  function removerFavorito(id) {
    const t = porId.get(id);
    const item = $(`#lista-favoritos .cartaz[data-id="${id}"]`);
    const vizinho = item && (item.nextElementSibling || item.previousElementSibling);
    const removido = CineStorage.favoritos.remover(id);
    renderFavoritos();
    atualizarContaFavoritos();
    const alvo = vizinho && $(`#lista-favoritos .cartaz[data-id="${vizinho.dataset.id}"] .botao-remover`);
    (alvo || $("#t-favoritos")).focus();
    avisarComDesfazer(`${t.titulo} saiu dos favoritos.`, () => {
      CineStorage.favoritos.restaurar(removido);
      renderFavoritos(); atualizarContaFavoritos();
    });
  }

  /* ======================================================================
     11. Histórico (RF05)
     ====================================================================== */
  function renderHistorico() {
    const lista = CineStorage.historico.listar();
    const totalTitulos = lista.reduce((s, h) => s + h.titulos.length, 0);
    $("#sub-historico").textContent = lista.length
      ? `${plural(lista.length, "sessão", "sessões")} · ${plural(totalTitulos, "título sugerido", "títulos sugeridos")}. O app guarda as ${CineStorage.LIMITE_HISTORICO} mais recentes.`
      : "Cada vez que você gera recomendações, elas ficam guardadas aqui.";
    $("#botao-limpar-historico").hidden = lista.length === 0;

    $("#lista-historico").innerHTML = lista.length ? lista.map((h, i) => `
      <article class="sessao">
        <header class="sessao-cabecalho">
          <h2 class="sessao-quando">${dataRelativa(h.quando)}${h.modo === "sorteio" ? ` <span class="etiqueta">Sorteio</span>` : ""}</h2>
          <p class="meta">${esc(resumoPreferencias(h.preferencias))}</p>
        </header>
        <ul class="sessao-titulos">${h.titulos.filter((id) => porId.has(id)).map((id) => {
          const t = porId.get(id);
          return `<li><button type="button" class="sessao-titulo" data-detalhes="${t.id}">${poster(t, "pequeno")}<span>${esc(t.titulo)}</span></button></li>`;
        }).join("")}</ul>
        <button type="button" class="botao botao-secundario botao-pequeno" data-repetir="${i}">Usar estas preferências</button>
      </article>`).join("") : `
      <div class="vazio">
        <p><strong>Histórico vazio.</strong> Gere sua primeira recomendação em Descobrir.</p>
        <a class="botao botao-primario" href="#descobrir">Ir para Descobrir</a>
      </div>`;
  }

  function repetirSessao(indice) {
    const h = CineStorage.historico.listar()[indice];
    if (!h) return;
    CineStorage.preferencias.salvar({ ...PREFS_PADRAO, ...h.preferencias });
    preencherFormulario(lerPreferencias());
    location.hash = "#descobrir";
    gerarRecomendacoes();
  }

  async function limparHistorico() {
    const n = CineStorage.historico.listar().length;
    const ok = await confirmar({
      titulo: "Limpar o histórico?",
      texto: `As ${plural(n, "sessão", "sessões")} deste perfil serão apagadas. Favoritos e notas continuam salvos. Não dá para desfazer.`,
      acao: "Limpar histórico"
    });
    if (!ok) return;
    CineStorage.historico.limpar();
    estado.recomendacoes = [];
    estado.origemResultados = null;
    renderHistorico();
    avisar("Histórico apagado.");
  }

  /* ======================================================================
     12. Estatísticas
     ====================================================================== */
  /** Lista de barras: a linha mais alta leva a cor de destaque; as outras ficam neutras. */
  function listaBarras(linhas, vazio) {
    if (!linhas.length) return vazio ? `<p class="vazio-curto">${vazio}</p>` : "";
    const maior = Math.max(...linhas.map((l) => l.valor));
    return `<ul class="barras">${linhas.map((l, i) => `
      <li class="barra${i === 0 ? " barra-lider" : ""}">
        <span class="barra-rotulo">${esc(l.rotulo)}</span>
        <span class="barra-valor num">${l.texto || l.valor}</span>
        <span class="barra-trilho" aria-hidden="true"><span style="width:${Math.max(2, (l.valor / maior) * 100)}%"></span></span>
      </li>`).join("")}</ul>`;
  }

  function renderEstatisticas() {
    const favs = CineStorage.favoritos.listar().filter((f) => porId.has(f.id)).map((f) => porId.get(f.id));
    const notas = CineStorage.avaliacoes.todas();
    const historico = CineStorage.historico.listar();

    // KPIs (calculados a partir das listas, nunca digitados)
    const totalMin = favs.reduce((s, t) => s + duracaoTotal(t), 0);
    const mediaPublico = favs.length ? favs.reduce((s, t) => s + t.nota, 0) / favs.length : null;
    const valoresNotas = Object.values(notas);
    const mediaSua = valoresNotas.length ? valoresNotas.reduce((s, n) => s + n, 0) / valoresNotas.length : null;
    const traco = `<span class="traco" aria-label="sem dados">—</span>`;
    $("#kpis").innerHTML = `
      <div><dt>Favoritos</dt><dd>${favs.length}<small>${favs.filter((t) => t.tipo === "filme").length} filmes, ${favs.filter((t) => t.tipo === "serie").length} séries</small></dd></div>
      <div><dt>Para ver tudo</dt><dd>${favs.length ? formatarDuracao(totalMin) : "0 min"}<small>filmes inteiros + todos os episódios</small></dd></div>
      <div><dt>Nota do público</dt><dd>${mediaPublico === null ? traco : formatarNota(mediaPublico)}<small>média dos favoritos, de 0 a 10</small></dd></div>
      <div><dt>Sua nota média</dt><dd>${mediaSua === null ? traco : `${formatarNota(mediaSua)}<span class="unidade"> /5</span>`}<small>${plural(valoresNotas.length, "título avaliado", "títulos avaliados")}</small></dd></div>`;

    // Gêneros nos favoritos
    const contaGeneros = {};
    favs.forEach((t) => t.generos.forEach((g) => { contaGeneros[g] = (contaGeneros[g] || 0) + 1; }));
    const linhasGeneros = Object.entries(contaGeneros)
      .sort((a, b) => b[1] - a[1] || nomeGenero(a[0]).localeCompare(nomeGenero(b[0])))
      .slice(0, 6)
      .map(([g, n]) => ({ rotulo: nomeGenero(g), valor: n, texto: `${n} de ${favs.length}` }));
    $("#est-generos").innerHTML = listaBarras(linhasGeneros, "Salve favoritos para ver quais gêneros aparecem mais.");
    $("#meta-est-generos").textContent = favs.length ? "títulos com o gênero" : "";

    // Humores e tempos pedidos no histórico (os dois respondem "como você costuma assistir")
    const contar = (fn) => historico.reduce((acc, h) => { const k = fn(h); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const contaHumores = contar((h) => h.preferencias.humor || "qualquer");
    const linhasHumores = Object.entries(contaHumores).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, n]) => ({ rotulo: id === "qualquer" ? "Qualquer humor" : nomeHumor(id), valor: n, texto: plural(n, "vez", "vezes") }));
    const contaTempos = contar((h) => h.preferencias.tempo);
    const linhasTempos = TEMPOS.filter((t) => contaTempos[t.id])
      .map((t) => ({ rotulo: t.nome, valor: contaTempos[t.id], texto: plural(contaTempos[t.id], "vez", "vezes") }))
      .sort((a, b) => b.valor - a.valor);
    $("#est-humores").innerHTML = listaBarras(linhasHumores, "Gere recomendações para ver seus humores mais comuns.") +
      (linhasTempos.length ? `<h3 class="subtitulo-painel">Tempo que você costuma ter</h3>${listaBarras(linhasTempos, "")}` : "");
    $("#meta-est-humores").textContent = historico.length ? `nas últimas ${plural(historico.length, "sessão", "sessões")}` : "";

    // Recomendações por dia (últimos 7 dias, hoje à direita)
    const dias = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      dias.push({ data: d, n: 0 });
    }
    historico.forEach((h) => {
      const d = new Date(h.quando); d.setHours(0, 0, 0, 0);
      const dia = dias.find((x) => x.data.getTime() === d.getTime());
      if (dia) dia.n += 1;
    });
    const somaSemana = dias.reduce((s, d) => s + d.n, 0);
    const maxDia = Math.max(...dias.map((d) => d.n));
    const topo = Math.max(2, maxDia % 2 === 0 ? maxDia + 2 : maxDia + 1); // marca do eixo acima do maior valor
    const marcas = [0, topo / 2, topo];
    const diaSemana = (d) => d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    $("#meta-est-dias").textContent = plural(somaSemana, "sessão na semana", "sessões na semana");
    $("#est-dias").innerHTML = `
      <div class="colunas" role="img" aria-label="Sessões de recomendação por dia: ${dias.map((d) => `${diaSemana(d.data)} ${d.n}`).join(", ")}">
        <div class="colunas-eixo num" aria-hidden="true">${marcas.slice().reverse().map((m) => `<span>${m}</span>`).join("")}</div>
        <div class="colunas-area" aria-hidden="true">
          ${marcas.map((m) => `<span class="grade" style="bottom:${(m / topo) * 100}%"></span>`).join("")}
          ${dias.map((d, i) => `
            <div class="coluna${i === 6 ? " coluna-hoje" : ""}">
              <span class="coluna-barra" style="height:${(d.n / topo) * 100}%">${d.n ? `<span class="coluna-valor num">${d.n}</span>` : ""}</span>
              <span class="coluna-rotulo">${i === 6 ? "Hoje" : diaSemana(d.data)}</span>
            </div>`).join("")}
        </div>
      </div>`;

    // Suas notas mais altas
    const top = Object.entries(notas).filter(([id]) => porId.has(id)).sort((a, b) => b[1] - a[1]).slice(0, 4);
    $("#est-top").innerHTML = top.length ? `<ul class="linhas">${top.map(([id, n]) => {
      const t = porId.get(id);
      return `
      <li class="linha">
        ${poster(t, "mini")}
        <div class="linha-texto">
          <button type="button" class="link-titulo" data-detalhes="${id}">${esc(t.titulo)}</button>
          <span class="meta">${metaTitulo(t)}</span>
        </div>
        <span class="estrelas-fixas" role="img" aria-label="${n} de 5 estrelas">${[1, 2, 3, 4, 5].map((k) => icone("estrela", k <= n ? "cheia" : "")).join("")}</span>
      </li>`;
    }).join("")}</ul>` : `<p class="vazio-curto">Dê estrelas aos títulos para montar o seu ranking.</p>`;

    // A frase de abertura diz o achado principal
    $("#sub-estatisticas").textContent = linhasGeneros.length
      ? `${linhasGeneros[0].rotulo} aparece em ${linhasGeneros[0].valor} dos seus ${plural(favs.length, "favorito", "favoritos")}.`
      : "Seus números aparecem conforme você salva favoritos e gera recomendações.";
  }

  /* ======================================================================
     13. Perfis
     ====================================================================== */
  function perfilAtual() {
    const id = CineStorage.perfis.ativo();
    return CineStorage.perfis.listar().find((p) => p.id === id);
  }

  function renderPerfilTopo() {
    const p = perfilAtual();
    const avatar = $("#avatar-perfil");
    avatar.textContent = p.nome.charAt(0).toUpperCase();
    avatar.style.setProperty("--tom", p.cor);
    $("#nome-perfil").textContent = p.nome;
  }

  function renderListaPerfis() {
    const ativo = CineStorage.perfis.ativo();
    const lista = CineStorage.perfis.listar();
    $("#lista-perfis").innerHTML = lista.map((p) => `
      <li class="perfil-linha">
        <span class="avatar" style="--tom:${p.cor}" aria-hidden="true">${esc(p.nome.charAt(0).toUpperCase())}</span>
        <span class="perfil-linha-nome">${esc(p.nome)}</span>
        ${p.id === ativo
          ? `<span class="em-uso">Em uso</span>`
          : `<button type="button" class="botao botao-secundario botao-pequeno" data-usar-perfil="${p.id}">Usar</button>`}
        ${lista.length > 1
          ? `<button type="button" class="botao-icone" data-excluir-perfil="${p.id}" aria-label="Excluir o perfil ${esc(p.nome)}">${icone("fechar")}</button>`
          : `<span class="botao-icone-espaco" aria-hidden="true"></span>`}
      </li>`).join("");
  }

  function trocarPerfil(id) {
    CineStorage.perfis.ativar(id);
    estado.recomendacoes = [];
    estado.origemResultados = null;
    preencherFormulario(lerPreferencias());
    renderPerfilTopo();
    renderListaPerfis();
    atualizarContaFavoritos();
    RENDER[estado.rota]();
    avisar(`Perfil ${perfilAtual().nome} em uso.`);
  }

  async function excluirPerfil(id) {
    const p = CineStorage.perfis.listar().find((x) => x.id === id);
    const ok = await confirmar({
      titulo: `Excluir o perfil ${p.nome}?`,
      texto: "Favoritos, notas e histórico deste perfil serão apagados deste navegador. Não dá para desfazer.",
      acao: "Excluir perfil"
    });
    if (ok) CineStorage.perfis.excluir(id);
    renderListaPerfis();
    $("#dialogo-perfis").showModal();
    if (ok) trocarPerfil(CineStorage.perfis.ativo());
  }

  /* ======================================================================
     14. Diálogos e avisos
     ====================================================================== */
  function abrirDetalhes(id) {
    const t = porId.get(id);
    if (!t) return;
    const serie = t.tipo === "serie"
      ? `<div><dt>Episódios</dt><dd>${t.episodios} em ${plural(t.temporadas, "temporada", "temporadas")}</dd></div>
         <div><dt>Para ver tudo</dt><dd>${formatarDuracao(duracaoTotal(t))}</dd></div>`
      : "";
    $("#conteudo-detalhes").innerHTML = `
      <div class="detalhes">
        ${poster(t, "grande")}
        <div class="detalhes-corpo">
          <div class="dialogo-cabecalho">
            <h2 id="det-titulo">${esc(t.titulo)}</h2>
            <button class="botao-icone" type="button" data-fechar aria-label="Fechar">${icone("fechar")}</button>
          </div>
          <p class="meta">${metaTitulo(t)}</p>
          <p class="sinopse">${esc(t.sinopse)}</p>
          <dl class="fatos-detalhe num">
            <div><dt>Nota do público</dt><dd>${icone("estrela", "ico-nota")}${formatarNota(t.nota)}</dd></div>
            <div><dt>Duração</dt><dd>${duracaoExibida(t)}</dd></div>
            ${serie}
            <div><dt>Gêneros</dt><dd>${t.generos.map(nomeGenero).join(", ")}</dd></div>
            <div><dt>Bom para quem está</dt><dd>${t.humores.map(nomeHumor).join(", ")}</dd></div>
          </dl>
          <div class="rec-acoes">${botaoFavoritar(t.id, true)}${estrelas(t.id)}</div>
        </div>
      </div>`;
    $("#dialogo-detalhes").showModal();
  }

  /** Diálogo de confirmação que devolve uma Promise<boolean>. */
  function confirmar({ titulo, texto, acao }) {
    const dlg = $("#dialogo-confirmar");
    $("#confirmar-titulo").textContent = titulo;
    $("#confirmar-texto").textContent = texto;
    $("#confirmar-ok").textContent = acao;
    $$("dialog[open]").forEach((d) => { if (d !== dlg) d.close(); });
    dlg.returnValue = "";
    dlg.showModal();
    return new Promise((resolver) => {
      const ok = $("#confirmar-ok");
      const aoConfirmar = () => dlg.close("ok");
      ok.addEventListener("click", aoConfirmar);
      dlg.addEventListener("close", () => {
        ok.removeEventListener("click", aoConfirmar);
        resolver(dlg.returnValue === "ok");
      }, { once: true });
    });
  }

  let temporizadorAviso;
  function avisar(texto, acao) {
    const toast = $("#toast");
    clearTimeout(temporizadorAviso);
    toast.innerHTML = `<span>${esc(texto)}</span>${acao ? `<button type="button" class="botao-texto" id="toast-acao">${acao.rotulo}</button>` : ""}`;
    toast.classList.add("visivel");
    if (acao) $("#toast-acao").addEventListener("click", () => { acao.fazer(); toast.classList.remove("visivel"); }, { once: true });
    temporizadorAviso = setTimeout(() => toast.classList.remove("visivel"), acao ? 6000 : 2600);
  }
  const avisarComDesfazer = (texto, desfazer) => avisar(texto, { rotulo: "Desfazer", fazer: desfazer });

  /* ======================================================================
     15. Eventos globais e início
     ====================================================================== */
  function ligarEventos() {
    window.addEventListener("hashchange", () => mostrarTela(rotaAtual()));

    // Formulário: salva a cada mudança e gera ao enviar
    const form = $("#form-preferencias");
    form.addEventListener("change", () => {
      const p = preferenciasDoFormulario();
      CineStorage.preferencias.salvar(p);
      atualizarSubtituloDescobrir(p);
      atualizarResumoGeneros(p.generos);
    });
    form.addEventListener("submit", (e) => { e.preventDefault(); gerarRecomendacoes(); });
    $("#botao-surpresa").addEventListener("click", surpreender);
    permitirDesmarcarHumor();

    $("#botao-tema").addEventListener("click", alternarTema);

    // Busca do topo leva ao catálogo
    $("#form-busca-topo").addEventListener("submit", (e) => {
      e.preventDefault();
      estado.catalogo.busca = $("#busca-topo").value;
      if (estado.rota !== "catalogo") location.hash = "#catalogo"; else renderCatalogo();
    });
    $("#busca-topo").addEventListener("input", (e) => {
      if (estado.rota === "catalogo") { estado.catalogo.busca = e.target.value; renderCatalogo(); }
    });

    // Catálogo
    $("#busca-catalogo").addEventListener("input", (e) => {
      estado.catalogo.busca = e.target.value;
      $("#busca-topo").value = e.target.value;
      renderCatalogo();
    });
    $("#filtro-genero").addEventListener("change", (e) => { estado.catalogo.genero = e.target.value; renderCatalogo(); });
    $("#ordem-catalogo").addEventListener("change", (e) => { estado.catalogo.ordem = e.target.value; renderCatalogo(); });
    $("#ordem-favoritos").addEventListener("change", (e) => { estado.ordemFavoritos = e.target.value; renderFavoritos(); });

    $("#botao-limpar-historico").addEventListener("click", limparHistorico);

    // Perfis
    $("#form-novo-perfil").addEventListener("submit", (e) => {
      e.preventDefault();
      const campo = $("#nome-novo-perfil");
      const nome = campo.value.trim();
      if (!nome) { campo.focus(); return; }
      const novo = CineStorage.perfis.criar(nome);
      campo.value = "";
      trocarPerfil(novo.id);
    });

    // Cliques delegados (os elementos são recriados a cada render)
    document.addEventListener("click", (e) => {
      const alvo = e.target.closest("[data-favoritar],[data-estrela],[data-detalhes],[data-abrir],[data-fechar],[data-remover],[data-repetir],[data-aba],[data-ajustar],[data-limpar-busca],[data-usar-perfil],[data-excluir-perfil]");
      if (!alvo) return;
      const d = alvo.dataset;
      if (d.favoritar) alternarFavorito(d.favoritar);
      else if (d.estrela) avaliar(d.estrela, Number(d.valor));
      else if (d.detalhes) abrirDetalhes(d.detalhes);
      else if (d.abrir) { if (d.abrir === "dialogo-perfis") renderListaPerfis(); $(`#${d.abrir}`).showModal(); }
      else if ("fechar" in d) alvo.closest("dialog").close();
      else if (d.remover) removerFavorito(d.remover);
      else if (d.repetir) repetirSessao(Number(d.repetir));
      else if (d.aba) { estado.catalogo.tipo = d.aba; renderCatalogo(); $(`[data-aba="${d.aba}"]`).focus(); }
      else if (d.ajustar) ajustarFiltro(d.ajustar);
      else if ("limparBusca" in d) { estado.catalogo = { ...estado.catalogo, busca: "", genero: "", tipo: "todos" }; $("#busca-topo").value = ""; renderCatalogo(); }
      else if (d.usarPerfil) trocarPerfil(d.usarPerfil);
      else if (d.excluirPerfil) excluirPerfil(d.excluirPerfil);
    });

    // Se um pôster não carregar, mostra o pôster tipográfico no lugar
    document.addEventListener("error", (e) => {
      if (e.target.tagName === "IMG" && e.target.closest(".poster")) e.target.closest(".poster").classList.add("falhou");
    }, true);

    // Clicar fora do conteúdo do diálogo fecha
    $$("dialog").forEach((dlg) => dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }));

    // Atalho "/" foca a busca; setas trocam abas do catálogo
    document.addEventListener("keydown", (e) => {
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (e.key === "/" && !digitando && !$("dialog[open]")) {
        e.preventDefault();
        const campo = estado.rota === "catalogo" ? $("#busca-catalogo") : $("#busca-topo");
        campo.focus(); campo.select();
      }
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && document.activeElement.matches("[data-aba]")) {
        const abas = $$("[data-aba]");
        const i = abas.indexOf(document.activeElement);
        const prox = abas[(i + (e.key === "ArrowRight" ? 1 : abas.length - 1)) % abas.length];
        estado.catalogo.tipo = prox.dataset.aba; renderCatalogo(); $(`[data-aba="${prox.dataset.aba}"]`).focus();
      }
    });

    // O relógio do subtítulo se atualiza a cada minuto (sem redesenhar os cartões)
    setInterval(() => atualizarSubtituloDescobrir(lerPreferencias()), 60000);
  }

  function iniciar() {
    aplicarTema(document.documentElement.getAttribute("data-theme") || "escuro");
    montarFormulario();
    montarFiltrosCatalogo();
    preencherFormulario(lerPreferencias());
    renderPerfilTopo();
    atualizarContaFavoritos();
    ligarEventos();
    mostrarTela(rotaAtual(), { focar: false });
  }

  iniciar();
})();
