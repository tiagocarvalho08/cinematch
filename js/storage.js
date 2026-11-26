/* ==========================================================================
   CineMatch — storage.js
   Toda a leitura e gravação no LocalStorage passa por aqui (RF06).

   Organização das chaves:
     cinematch:tema                 "claro" | "escuro"            (global)
     cinematch:perfis               [{ id, nome, cor }]            (global)
     cinematch:perfilAtivo          id do perfil em uso            (global)
     cinematch:<perfil>:preferencias  último formulário preenchido
     cinematch:<perfil>:favoritos     [{ id, adicionadoEm }]
     cinematch:<perfil>:avaliacoes    { idTitulo: 1..5 }
     cinematch:<perfil>:historico     [{ quando, preferencias, titulos[], modo }]

   Se o navegador bloquear o LocalStorage (aba anônima, por exemplo), as
   funções continuam funcionando em memória e o app não quebra.
   ========================================================================== */

const CineStorage = (() => {
  const PREFIXO = "cinematch";
  const LIMITE_HISTORICO = 30; // guarda as 30 sessões de recomendação mais recentes
  const memoria = {}; // reserva usada quando o LocalStorage não está disponível

  /** Lê e converte um JSON salvo; devolve `padrao` se não existir ou estiver corrompido. */
  function ler(chave, padrao) {
    try {
      const bruto = localStorage.getItem(chave);
      return bruto === null ? padrao : JSON.parse(bruto);
    } catch (erro) {
      return chave in memoria ? memoria[chave] : padrao;
    }
  }

  /** Grava qualquer valor como JSON. */
  function gravar(chave, valor) {
    memoria[chave] = valor;
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch (erro) {
      console.warn("CineMatch: não foi possível salvar no LocalStorage.", erro);
    }
  }

  function apagar(chave) {
    delete memoria[chave];
    try { localStorage.removeItem(chave); } catch (erro) { /* sem armazenamento: nada a apagar */ }
  }

  // ------------------------------------------------------------------ tema
  const tema = {
    obter: () => ler(`${PREFIXO}:tema`, null),
    salvar: (valor) => gravar(`${PREFIXO}:tema`, valor)
  };

  // ---------------------------------------------------------------- perfis
  // Tons de identidade dos perfis (pálidos, separados por mais de 60° no círculo de cores).
  const CORES_PERFIL = ["#7fb2e5", "#e5c07f", "#8fd19e", "#e59fc4", "#b9a6f0", "#7fd6d1"];

  function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  const perfis = {
    listar() {
      let lista = ler(`${PREFIXO}:perfis`, null);
      if (!Array.isArray(lista) || lista.length === 0) {
        // primeiro acesso: cria um perfil padrão
        lista = [{ id: "principal", nome: "Eu", cor: CORES_PERFIL[0] }];
        gravar(`${PREFIXO}:perfis`, lista);
      }
      return lista;
    },
    criar(nome) {
      const lista = perfis.listar();
      const novo = { id: gerarId(), nome: nome.trim().slice(0, 24), cor: CORES_PERFIL[lista.length % CORES_PERFIL.length] };
      gravar(`${PREFIXO}:perfis`, [...lista, novo]);
      return novo;
    },
    excluir(id) {
      const lista = perfis.listar().filter((p) => p.id !== id);
      gravar(`${PREFIXO}:perfis`, lista);
      ["preferencias", "favoritos", "avaliacoes", "historico"].forEach((k) => apagar(`${PREFIXO}:${id}:${k}`));
      if (perfis.ativo() === id) perfis.ativar(lista[0] ? lista[0].id : "principal");
    },
    ativo() {
      const id = ler(`${PREFIXO}:perfilAtivo`, null);
      const lista = perfis.listar();
      return lista.some((p) => p.id === id) ? id : lista[0].id;
    },
    ativar(id) {
      gravar(`${PREFIXO}:perfilAtivo`, id);
    }
  };

  /** Monta a chave de um dado do perfil ativo. */
  const chavePerfil = (nome) => `${PREFIXO}:${perfis.ativo()}:${nome}`;

  // ------------------------------------------------------------ preferências
  const preferencias = {
    obter: () => ler(chavePerfil("preferencias"), null),
    salvar: (prefs) => gravar(chavePerfil("preferencias"), prefs)
  };

  // -------------------------------------------------------------- favoritos (RF03, RF04)
  const favoritos = {
    listar: () => ler(chavePerfil("favoritos"), []),
    contem: (id) => favoritos.listar().some((f) => f.id === id),
    adicionar(id) {
      if (favoritos.contem(id)) return;
      gravar(chavePerfil("favoritos"), [{ id, adicionadoEm: new Date().toISOString() }, ...favoritos.listar()]);
    },
    remover(id) {
      const lista = favoritos.listar();
      const removido = lista.find((f) => f.id === id);
      gravar(chavePerfil("favoritos"), lista.filter((f) => f.id !== id));
      return removido; // devolvido para permitir "Desfazer"
    },
    restaurar(item) {
      if (!item || favoritos.contem(item.id)) return;
      const lista = [...favoritos.listar(), item].sort((a, b) => b.adicionadoEm.localeCompare(a.adicionadoEm));
      gravar(chavePerfil("favoritos"), lista);
    },
    /** Alterna e devolve o novo estado (true = agora é favorito). */
    alternar(id) {
      if (favoritos.contem(id)) { favoritos.remover(id); return false; }
      favoritos.adicionar(id); return true;
    }
  };

  // ------------------------------------------------------------- avaliações
  const avaliacoes = {
    todas: () => ler(chavePerfil("avaliacoes"), {}),
    obter: (id) => avaliacoes.todas()[id] || 0,
    salvar(id, estrelas) {
      const todas = avaliacoes.todas();
      if (estrelas > 0) todas[id] = estrelas; else delete todas[id];
      gravar(chavePerfil("avaliacoes"), todas);
    }
  };

  // -------------------------------------------------------------- histórico (RF05)
  const historico = {
    listar: () => ler(chavePerfil("historico"), []),
    registrar(registro) {
      const lista = [{ quando: new Date().toISOString(), ...registro }, ...historico.listar()].slice(0, LIMITE_HISTORICO);
      gravar(chavePerfil("historico"), lista);
    },
    limpar: () => gravar(chavePerfil("historico"), []),
    /** Ids recomendados nas últimas N sessões (para variar as sugestões). */
    recentes(sessoes = 2) {
      return new Set(historico.listar().slice(0, sessoes).flatMap((h) => h.titulos));
    }
  };

  return { tema, perfis, preferencias, favoritos, avaliacoes, historico, LIMITE_HISTORICO };
})();
