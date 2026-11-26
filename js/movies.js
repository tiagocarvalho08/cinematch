/* ==========================================================================
   CineMatch — movies.js
   Catálogo local de filmes e séries + listas de gêneros, humores, tempos e
   faixas etárias usadas no formulário de preferências.

   Campos de cada título:
     id            identificador único (texto, sem espaços)
     titulo        nome em português (Brasil)
     tipo          "filme" ou "serie"
     ano           ano de lançamento
     duracao       filmes: duração total em minutos
                   séries: duração média de um episódio em minutos
     temporadas    (só séries) número de temporadas
     episodios     (só séries) número total de episódios
     nota          nota média do público (0 a 10, aproximada — dado de exemplo)
     classificacao classificação indicativa brasileira: 0 (Livre), 10, 12, 14, 16, 18
     generos       lista de ids de GENEROS
     humores       lista de ids de HUMORES que o título combina
     sinopse       uma frase curta escrita para o projeto
   ========================================================================== */

/** Gêneros disponíveis (id -> rótulo exibido). */
const GENEROS = [
  { id: "acao", nome: "Ação" },
  { id: "aventura", nome: "Aventura" },
  { id: "animacao", nome: "Animação" },
  { id: "comedia", nome: "Comédia" },
  { id: "crime", nome: "Crime" },
  { id: "documentario", nome: "Documentário" },
  { id: "drama", nome: "Drama" },
  { id: "familia", nome: "Família" },
  { id: "fantasia", nome: "Fantasia" },
  { id: "ficcao", nome: "Ficção científica" },
  { id: "romance", nome: "Romance" },
  { id: "suspense", nome: "Suspense" },
  { id: "terror", nome: "Terror" }
];

/** Humores do momento. */
const HUMORES = [
  { id: "animado", nome: "Animado" },
  { id: "relaxado", nome: "Relaxado" },
  { id: "pensativo", nome: "Pensativo" },
  { id: "romantico", nome: "Romântico" },
  { id: "tenso", nome: "Quero tensão" },
  { id: "rir", nome: "Quero rir" }
];

/** Tempo disponível, em minutos (null = sem limite). */
const TEMPOS = [
  { id: "30", nome: "Até 30 min", minutos: 30 },
  { id: "60", nome: "Até 1 h", minutos: 60 },
  { id: "120", nome: "Até 2 h", minutos: 120 },
  { id: "180", nome: "Até 3 h", minutos: 180 },
  { id: "livre", nome: "Sem pressa", minutos: null }
];

/** Faixa etária de quem vai assistir -> classificação máxima permitida. */
const FAIXAS = [
  { id: "livre", nome: "Livre para todos", maxima: 0 },
  { id: "10", nome: "10 anos ou mais", maxima: 10 },
  { id: "12", nome: "12 anos ou mais", maxima: 12 },
  { id: "14", nome: "14 anos ou mais", maxima: 14 },
  { id: "16", nome: "16 anos ou mais", maxima: 16 },
  { id: "18", nome: "18 anos ou mais", maxima: 18 }
];

/** Catálogo (dados de exemplo para o projeto acadêmico). */
const CATALOGO = [
  // ---------------------------------------------------------------- filmes
  { id: "interestelar", titulo: "Interestelar", tipo: "filme", ano: 2014, duracao: 169, nota: 8.7, classificacao: 10,
    generos: ["ficcao", "aventura", "drama"], humores: ["pensativo", "animado"],
    sinopse: "Um grupo de astronautas atravessa um buraco de minhoca para achar um novo lar para a humanidade." },
  { id: "a-origem", titulo: "A Origem", tipo: "filme", ano: 2010, duracao: 148, nota: 8.8, classificacao: 14,
    generos: ["ficcao", "acao", "suspense"], humores: ["animado", "tenso", "pensativo"],
    sinopse: "Um ladrão que invade sonhos aceita o trabalho inverso: plantar uma ideia na mente de alguém." },
  { id: "star-wars-iv", titulo: "Star Wars: Uma Nova Esperança", tipo: "filme", ano: 1977, duracao: 121, nota: 8.6, classificacao: 10,
    generos: ["ficcao", "aventura", "acao"], humores: ["animado"],
    sinopse: "Um jovem fazendeiro se junta a rebeldes para resgatar uma princesa e enfrentar o Império." },
  { id: "turma-da-monica-lacos", titulo: "Turma da Mônica: Laços", tipo: "filme", ano: 2019, duracao: 97, nota: 7.5, classificacao: 0,
    generos: ["familia", "aventura", "comedia"], humores: ["relaxado", "rir"],
    sinopse: "Cebolinha, Mônica, Magali e Cascão entram na floresta para encontrar o Floquinho." },
  { id: "matrix", titulo: "Matrix", tipo: "filme", ano: 1999, duracao: 136, nota: 8.7, classificacao: 14,
    generos: ["ficcao", "acao"], humores: ["animado", "pensativo"],
    sinopse: "Um programador descobre que o mundo em que vive é uma simulação e decide lutar contra ela." },
  { id: "duna-parte-dois", titulo: "Duna: Parte Dois", tipo: "filme", ano: 2024, duracao: 166, nota: 8.5, classificacao: 14,
    generos: ["ficcao", "aventura", "drama"], humores: ["animado", "pensativo"],
    sinopse: "Paul Atreides se une aos Fremen no deserto de Arrakis para vingar a sua família." },
  { id: "mad-max-estrada-da-furia", titulo: "Mad Max: Estrada da Fúria", tipo: "filme", ano: 2015, duracao: 120, nota: 8.1, classificacao: 16,
    generos: ["acao", "aventura", "ficcao"], humores: ["animado", "tenso"],
    sinopse: "Uma fuga em alta velocidade pelo deserto, de ponta a ponta, sem tirar o pé do acelerador." },
  { id: "aranhaverso-2", titulo: "Homem-Aranha: Através do Aranhaverso", tipo: "filme", ano: 2023, duracao: 140, nota: 8.5, classificacao: 10,
    generos: ["animacao", "acao", "aventura"], humores: ["animado", "rir"],
    sinopse: "Miles Morales viaja pelo multiverso e encontra uma sociedade inteira de Homens-Aranha." },
  { id: "divertida-mente", titulo: "Divertida Mente", tipo: "filme", ano: 2015, duracao: 95, nota: 8.1, classificacao: 0,
    generos: ["animacao", "familia", "comedia"], humores: ["pensativo", "rir", "relaxado"],
    sinopse: "As emoções de uma menina de 11 anos tentam ajudá-la depois de uma mudança de cidade." },
  { id: "up", titulo: "Up: Altas Aventuras", tipo: "filme", ano: 2009, duracao: 96, nota: 8.3, classificacao: 0,
    generos: ["animacao", "aventura", "familia"], humores: ["relaxado", "pensativo"],
    sinopse: "Um viúvo amarra milhares de balões à casa e parte rumo à América do Sul." },
  { id: "a-viagem-de-chihiro", titulo: "A Viagem de Chihiro", tipo: "filme", ano: 2001, duracao: 125, nota: 8.6, classificacao: 0,
    generos: ["animacao", "fantasia"], humores: ["pensativo", "relaxado"],
    sinopse: "Presa num mundo de espíritos, uma menina trabalha numa casa de banhos para salvar os pais." },
  { id: "toy-story", titulo: "Toy Story", tipo: "filme", ano: 1995, duracao: 81, nota: 8.3, classificacao: 0,
    generos: ["animacao", "comedia", "familia"], humores: ["rir", "relaxado"],
    sinopse: "Um cowboy de brinquedo sente ciúmes quando um astronauta novo chega ao quarto." },
  { id: "o-auto-da-compadecida", titulo: "O Auto da Compadecida", tipo: "filme", ano: 2000, duracao: 104, nota: 8.5, classificacao: 12,
    generos: ["comedia", "drama"], humores: ["rir", "relaxado"],
    sinopse: "João Grilo e Chicó vivem de golpes no sertão até o dia do Juízo Final." },
  { id: "cidade-de-deus", titulo: "Cidade de Deus", tipo: "filme", ano: 2002, duracao: 130, nota: 8.6, classificacao: 18,
    generos: ["crime", "drama"], humores: ["tenso", "pensativo"],
    sinopse: "Buscapé cresce numa favela carioca e acompanha pela câmera o avanço do tráfico." },
  { id: "central-do-brasil", titulo: "Central do Brasil", tipo: "filme", ano: 1998, duracao: 110, nota: 8.0, classificacao: 12,
    generos: ["drama"], humores: ["pensativo"],
    sinopse: "Uma escrevedora de cartas atravessa o país com um menino em busca do pai dele." },
  { id: "tropa-de-elite", titulo: "Tropa de Elite", tipo: "filme", ano: 2007, duracao: 115, nota: 8.0, classificacao: 16,
    generos: ["acao", "crime", "drama"], humores: ["tenso", "animado"],
    sinopse: "O capitão Nascimento procura um substituto enquanto enfrenta o tráfico no Rio." },
  { id: "parasita", titulo: "Parasita", tipo: "filme", ano: 2019, duracao: 132, nota: 8.5, classificacao: 16,
    generos: ["suspense", "drama", "comedia"], humores: ["tenso", "pensativo"],
    sinopse: "Uma família pobre se infiltra, um a um, na casa de uma família rica." },
  { id: "corra", titulo: "Corra!", tipo: "filme", ano: 2017, duracao: 104, nota: 7.8, classificacao: 14,
    generos: ["terror", "suspense"], humores: ["tenso"],
    sinopse: "Um fim de semana na casa dos pais da namorada fica cada vez mais estranho." },
  { id: "um-lugar-silencioso", titulo: "Um Lugar Silencioso", tipo: "filme", ano: 2018, duracao: 90, nota: 7.5, classificacao: 14,
    generos: ["terror", "ficcao", "suspense"], humores: ["tenso"],
    sinopse: "Uma família vive em silêncio absoluto para escapar de criaturas que caçam pelo som." },
  { id: "o-iluminado", titulo: "O Iluminado", tipo: "filme", ano: 1980, duracao: 146, nota: 8.4, classificacao: 16,
    generos: ["terror", "suspense"], humores: ["tenso"],
    sinopse: "O zelador de um hotel isolado pela neve perde a razão durante o inverno." },
  { id: "la-la-land", titulo: "La La Land", tipo: "filme", ano: 2016, duracao: 128, nota: 8.0, classificacao: 12,
    generos: ["romance", "drama"], humores: ["romantico", "pensativo"],
    sinopse: "Uma atriz e um pianista se apaixonam enquanto perseguem seus sonhos em Los Angeles." },
  { id: "questao-de-tempo", titulo: "Questão de Tempo", tipo: "filme", ano: 2013, duracao: 123, nota: 7.8, classificacao: 12,
    generos: ["romance", "comedia", "fantasia"], humores: ["romantico", "relaxado"],
    sinopse: "Um rapaz descobre que pode voltar no tempo e usa o dom para conquistar quem ama." },
  { id: "orgulho-e-preconceito", titulo: "Orgulho e Preconceito", tipo: "filme", ano: 2005, duracao: 129, nota: 7.8, classificacao: 10,
    generos: ["romance", "drama"], humores: ["romantico", "relaxado"],
    sinopse: "Elizabeth Bennet e o Sr. Darcy começam com o pé esquerdo na Inglaterra do século XIX." },
  { id: "antes-do-amanhecer", titulo: "Antes do Amanhecer", tipo: "filme", ano: 1995, duracao: 101, nota: 8.1, classificacao: 14,
    generos: ["romance", "drama"], humores: ["romantico", "pensativo"],
    sinopse: "Dois desconhecidos descem do trem em Viena e conversam até o dia nascer." },
  { id: "as-branquelas", titulo: "As Branquelas", tipo: "filme", ano: 2004, duracao: 109, nota: 5.8, classificacao: 12,
    generos: ["comedia"], humores: ["rir"],
    sinopse: "Dois agentes do FBI se disfarçam de herdeiras para investigar um sequestro." },
  { id: "se-beber-nao-case", titulo: "Se Beber, Não Case!", tipo: "filme", ano: 2009, duracao: 100, nota: 7.7, classificacao: 16,
    generos: ["comedia"], humores: ["rir", "animado"],
    sinopse: "Três amigos acordam em Las Vegas sem lembrar da noite e sem o noivo." },
  { id: "entre-facas-e-segredos", titulo: "Entre Facas e Segredos", tipo: "filme", ano: 2019, duracao: 130, nota: 7.9, classificacao: 12,
    generos: ["suspense", "crime", "comedia"], humores: ["tenso", "rir"],
    sinopse: "Um detetive investiga a morte de um escritor rico cercado por uma família suspeita." },
  { id: "sociedade-do-anel", titulo: "O Senhor dos Anéis: A Sociedade do Anel", tipo: "filme", ano: 2001, duracao: 178, nota: 8.9, classificacao: 12,
    generos: ["fantasia", "aventura"], humores: ["animado"],
    sinopse: "Um hobbit parte numa jornada para destruir um anel que pode escravizar o mundo." },
  { id: "pedra-filosofal", titulo: "Harry Potter e a Pedra Filosofal", tipo: "filme", ano: 2001, duracao: 152, nota: 7.7, classificacao: 10,
    generos: ["fantasia", "familia", "aventura"], humores: ["relaxado", "animado"],
    sinopse: "No aniversário de 11 anos, um menino descobre que é bruxo e vai para Hogwarts." },
  { id: "clube-da-luta", titulo: "Clube da Luta", tipo: "filme", ano: 1999, duracao: 139, nota: 8.8, classificacao: 18,
    generos: ["drama", "suspense"], humores: ["tenso", "pensativo"],
    sinopse: "Um homem com insônia cria um clube secreto de lutas com um vendedor de sabonetes." },
  { id: "meu-professor-polvo", titulo: "Professor Polvo", tipo: "filme", ano: 2020, duracao: 85, nota: 8.1, classificacao: 0,
    generos: ["documentario"], humores: ["relaxado", "pensativo"],
    sinopse: "Um mergulhador acompanha por um ano a vida de um polvo numa floresta de algas." },
  { id: "free-solo", titulo: "Free Solo", tipo: "filme", ano: 2018, duracao: 100, nota: 8.1, classificacao: 10,
    generos: ["documentario", "aventura"], humores: ["tenso", "animado"],
    sinopse: "Um escalador tenta subir os 900 metros do El Capitan sem cordas." },
  { id: "ainda-estou-aqui", titulo: "Ainda Estou Aqui", tipo: "filme", ano: 2024, duracao: 137, nota: 8.2, classificacao: 14,
    generos: ["drama"], humores: ["pensativo"],
    sinopse: "Eunice Paiva reconstrói a família depois que o marido é levado pela ditadura." },
  { id: "barbie", titulo: "Barbie", tipo: "filme", ano: 2023, duracao: 114, nota: 6.8, classificacao: 12,
    generos: ["comedia", "fantasia"], humores: ["rir", "animado"],
    sinopse: "A boneca perfeita começa a ter dúvidas e viaja para o mundo real." },
  { id: "tudo-em-todo-lugar", titulo: "Tudo em Todo o Lugar ao Mesmo Tempo", tipo: "filme", ano: 2022, duracao: 139, nota: 7.8, classificacao: 14,
    generos: ["ficcao", "acao", "comedia"], humores: ["animado", "rir", "pensativo"],
    sinopse: "A dona de uma lavanderia precisa salvar o multiverso no meio de uma auditoria fiscal." },

  // ---------------------------------------------------------------- séries
  { id: "dark", titulo: "Dark", tipo: "serie", ano: 2017, duracao: 55, temporadas: 3, episodios: 26, nota: 8.7, classificacao: 16,
    generos: ["ficcao", "suspense", "drama"], humores: ["tenso", "pensativo"],
    sinopse: "O sumiço de uma criança revela segredos de quatro famílias numa cidade alemã." },
  { id: "breaking-bad", titulo: "Breaking Bad", tipo: "serie", ano: 2008, duracao: 49, temporadas: 5, episodios: 62, nota: 9.5, classificacao: 16,
    generos: ["crime", "drama", "suspense"], humores: ["tenso"],
    sinopse: "Um professor de química com câncer passa a fabricar metanfetamina." },
  { id: "stranger-things", titulo: "Stranger Things", tipo: "serie", ano: 2016, duracao: 51, temporadas: 4, episodios: 34, nota: 8.7, classificacao: 14,
    generos: ["ficcao", "terror", "aventura"], humores: ["animado", "tenso"],
    sinopse: "Amigos de uma cidadezinha procuram um garoto desaparecido e encontram outro mundo." },
  { id: "the-office", titulo: "The Office", tipo: "serie", ano: 2005, duracao: 22, temporadas: 9, episodios: 201, nota: 9.0, classificacao: 12,
    generos: ["comedia"], humores: ["rir", "relaxado"],
    sinopse: "O dia a dia de um escritório de papel com o pior chefe do mundo." },
  { id: "brooklyn-99", titulo: "Brooklyn Nine-Nine", tipo: "serie", ano: 2013, duracao: 22, temporadas: 8, episodios: 153, nota: 8.4, classificacao: 12,
    generos: ["comedia", "crime"], humores: ["rir", "relaxado"],
    sinopse: "Um detetive brincalhão e sua equipe resolvem crimes numa delegacia de Nova York." },
  { id: "friends", titulo: "Friends", tipo: "serie", ano: 1994, duracao: 22, temporadas: 10, episodios: 236, nota: 8.9, classificacao: 12,
    generos: ["comedia", "romance"], humores: ["rir", "relaxado", "romantico"],
    sinopse: "Seis amigos dividem apartamentos, cafés e confusões em Manhattan." },
  { id: "black-mirror", titulo: "Black Mirror", tipo: "serie", ano: 2011, duracao: 60, temporadas: 6, episodios: 27, nota: 8.7, classificacao: 16,
    generos: ["ficcao", "suspense", "drama"], humores: ["pensativo", "tenso"],
    sinopse: "Histórias independentes sobre o lado sombrio da tecnologia." },
  { id: "arcane", titulo: "Arcane", tipo: "serie", ano: 2021, duracao: 40, temporadas: 2, episodios: 18, nota: 9.0, classificacao: 14,
    generos: ["animacao", "acao", "fantasia"], humores: ["animado"],
    sinopse: "Duas irmãs ficam em lados opostos de uma guerra entre duas cidades." },
  { id: "round-6", titulo: "Round 6", tipo: "serie", ano: 2021, duracao: 55, temporadas: 2, episodios: 16, nota: 8.0, classificacao: 16,
    generos: ["suspense", "drama", "acao"], humores: ["tenso"],
    sinopse: "Endividados aceitam disputar brincadeiras infantis valendo a própria vida." },
  { id: "the-crown", titulo: "The Crown", tipo: "serie", ano: 2016, duracao: 58, temporadas: 6, episodios: 60, nota: 8.6, classificacao: 14,
    generos: ["drama"], humores: ["pensativo", "relaxado"],
    sinopse: "O reinado de Elizabeth II, das primeiras crises políticas aos dramas da família." },
  { id: "bridgerton", titulo: "Bridgerton", tipo: "serie", ano: 2020, duracao: 62, temporadas: 3, episodios: 24, nota: 7.3, classificacao: 16,
    generos: ["romance", "drama"], humores: ["romantico"],
    sinopse: "Os irmãos Bridgerton procuram o amor na alta sociedade de Londres." },
  { id: "sintonia", titulo: "Sintonia", tipo: "serie", ano: 2019, duracao: 40, temporadas: 5, episodios: 30, nota: 7.5, classificacao: 16,
    generos: ["drama", "crime"], humores: ["pensativo", "tenso"],
    sinopse: "Três amigos de uma quebrada de São Paulo seguem caminhos entre o funk, a fé e o crime." },
  { id: "avatar-aang", titulo: "Avatar: A Lenda de Aang", tipo: "serie", ano: 2005, duracao: 23, temporadas: 3, episodios: 61, nota: 9.3, classificacao: 10,
    generos: ["animacao", "aventura", "fantasia"], humores: ["animado", "relaxado"],
    sinopse: "O último dobrador de ar precisa dominar os quatro elementos para acabar com uma guerra." },
  { id: "ted-lasso", titulo: "Ted Lasso", tipo: "serie", ano: 2020, duracao: 35, temporadas: 3, episodios: 34, nota: 8.8, classificacao: 14,
    generos: ["comedia", "drama"], humores: ["rir", "relaxado", "pensativo"],
    sinopse: "Um técnico de futebol americano é contratado para treinar um time de futebol inglês." },
  { id: "o-urso", titulo: "O Urso", tipo: "serie", ano: 2022, duracao: 30, temporadas: 3, episodios: 28, nota: 8.5, classificacao: 16,
    generos: ["drama", "comedia"], humores: ["tenso", "pensativo"],
    sinopse: "Um chef premiado volta a Chicago para salvar a lanchonete da família." },
  { id: "sherlock", titulo: "Sherlock", tipo: "serie", ano: 2010, duracao: 88, temporadas: 4, episodios: 13, nota: 9.0, classificacao: 14,
    generos: ["crime", "suspense"], humores: ["tenso", "pensativo"],
    sinopse: "Sherlock Holmes e John Watson resolvem casos na Londres de hoje." },
  { id: "planeta-terra-2", titulo: "Planeta Terra II", tipo: "serie", ano: 2016, duracao: 50, temporadas: 1, episodios: 6, nota: 9.5, classificacao: 0,
    generos: ["documentario"], humores: ["relaxado", "pensativo"],
    sinopse: "Ilhas, montanhas, selvas, desertos, campos e cidades vistos de perto." },
  { id: "cidade-invisivel", titulo: "Cidade Invisível", tipo: "serie", ano: 2021, duracao: 40, temporadas: 2, episodios: 12, nota: 6.9, classificacao: 14,
    generos: ["fantasia", "suspense"], humores: ["tenso"],
    sinopse: "Um policial ambiental descobre que entidades do folclore vivem escondidas no Rio." },
  { id: "heartstopper", titulo: "Heartstopper", tipo: "serie", ano: 2022, duracao: 30, temporadas: 3, episodios: 24, nota: 8.0, classificacao: 12,
    generos: ["romance", "drama"], humores: ["romantico", "relaxado"],
    sinopse: "Dois colegas de escola viram amigos e descobrem que querem ser mais que isso." }
];


/* ==========================================================================
   Pôsteres: imagens hospedadas pela Wikipédia (upload.wikimedia.org), usadas
   com fins educacionais e creditadas no rodapé do app. `w` e `h` são as
   dimensões originais; imagens horizontais (logos e cartelas de séries)
   recebem um enquadramento próprio. Títulos sem imagem usam um pôster tipográfico.
   ========================================================================== */
const POSTERS = {
  "interestelar": { src: "https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg", w: 220, h: 326 },
  "a-origem": { src: "https://upload.wikimedia.org/wikipedia/en/2/2e/Inception_%282010%29_theatrical_poster.jpg", w: 220, h: 326 },
  "star-wars-iv": { src: "https://upload.wikimedia.org/wikipedia/en/8/87/StarWarsMoviePoster1977.jpg", w: 252, h: 385 },
  "turma-da-monica-lacos": { src: "https://upload.wikimedia.org/wikipedia/pt/7/79/Turma_da_Monica_La%C3%A7os_romance.jpg", w: 311, h: 450 },
  "matrix": { src: "https://upload.wikimedia.org/wikipedia/en/d/db/The_Matrix.png", w: 260, h: 376 },
  "duna-parte-dois": { src: "https://upload.wikimedia.org/wikipedia/en/5/52/Dune_Part_Two_poster.jpeg", w: 259, h: 384 },
  "mad-max-estrada-da-furia": { src: "https://upload.wikimedia.org/wikipedia/en/6/6e/Mad_Max_Fury_Road.jpg", w: 264, h: 378 },
  "aranhaverso-2": { src: "https://upload.wikimedia.org/wikipedia/en/b/b4/Spider-Man-_Across_the_Spider-Verse_poster.jpg", w: 259, h: 385 },
  "divertida-mente": { src: "https://upload.wikimedia.org/wikipedia/en/0/0a/Inside_Out_%282015_film%29_poster.jpg", w: 220, h: 326 },
  "up": { src: "https://upload.wikimedia.org/wikipedia/en/0/05/Up_%282009_film%29.jpg", w: 250, h: 370 },
  "a-viagem-de-chihiro": { src: "https://upload.wikimedia.org/wikipedia/en/d/db/Spirited_Away_Japanese_poster.png", w: 265, h: 376 },
  "toy-story": { src: "https://upload.wikimedia.org/wikipedia/en/1/13/Toy_Story.jpg", w: 250, h: 373 },
  "o-auto-da-compadecida": { src: "https://upload.wikimedia.org/wikipedia/en/d/d1/O_Auto_da_Compadecida.jpg", w: 220, h: 313 },
  "cidade-de-deus": { src: "https://upload.wikimedia.org/wikipedia/en/1/10/CidadedeDeus.jpg", w: 260, h: 383 },
  "central-do-brasil": { src: "https://upload.wikimedia.org/wikipedia/en/1/12/Central-do-brasil-poster04.jpg", w: 268, h: 372 },
  "tropa-de-elite": { src: "https://upload.wikimedia.org/wikipedia/en/d/d7/Elite_Squad.png", w: 220, h: 325 },
  "parasita": { src: "https://upload.wikimedia.org/wikipedia/en/5/53/Parasite_%282019_film%29.png", w: 265, h: 378 },
  "corra": { src: "https://upload.wikimedia.org/wikipedia/en/a/a3/Get_Out_poster.png", w: 258, h: 387 },
  "um-lugar-silencioso": { src: "https://upload.wikimedia.org/wikipedia/en/a/a0/A_Quiet_Place_film_poster.png", w: 220, h: 330 },
  "o-iluminado": { src: "https://upload.wikimedia.org/wikipedia/en/1/1d/The_Shining_%281980%29_U.K._release_poster_-_The_tide_of_terror_that_swept_America_IS_HERE.jpg", w: 263, h: 379 },
  "la-la-land": { src: "https://upload.wikimedia.org/wikipedia/en/a/ab/La_La_Land_%28film%29.png", w: 260, h: 385 },
  "questao-de-tempo": { src: "https://upload.wikimedia.org/wikipedia/en/7/7c/About_Time_%282013_film%29_Poster.jpg", w: 220, h: 327 },
  "orgulho-e-preconceito": { src: "https://upload.wikimedia.org/wikipedia/pt/8/85/Pride_and_Prejudice_2005.jpg", w: 300, h: 445 },
  "antes-do-amanhecer": { src: "https://upload.wikimedia.org/wikipedia/en/d/da/Before_Sunrise_poster.jpg", w: 248, h: 369 },
  "as-branquelas": { src: "https://upload.wikimedia.org/wikipedia/en/2/2b/White_chicks.jpg", w: 220, h: 326 },
  "se-beber-nao-case": { src: "https://upload.wikimedia.org/wikipedia/en/b/b9/Hangoverposter09.jpg", w: 259, h: 384 },
  "entre-facas-e-segredos": { src: "https://upload.wikimedia.org/wikipedia/en/1/1f/Knives_Out_poster.jpeg", w: 260, h: 385 },
  "sociedade-do-anel": { src: "https://upload.wikimedia.org/wikipedia/en/f/fb/Lord_Rings_Fellowship_Ring.jpg", w: 218, h: 326 },
  "pedra-filosofal": { src: "https://upload.wikimedia.org/wikipedia/pt/1/1d/Harry_Potter_Pedra_Filosofal_2001.jpg", w: 337, h: 500 },
  "clube-da-luta": { src: "https://upload.wikimedia.org/wikipedia/en/f/fc/Fight_Club_poster.jpg", w: 260, h: 384 },
  "meu-professor-polvo": { src: "https://upload.wikimedia.org/wikipedia/en/0/06/My_Octopus_Teacher_poster.jpg", w: 264, h: 377 },
  "free-solo": { src: "https://upload.wikimedia.org/wikipedia/en/9/9c/Free_Solo.png", w: 220, h: 311 },
  "ainda-estou-aqui": { src: "https://upload.wikimedia.org/wikipedia/en/0/0a/I%27m_Still_Here_%282024_film%29_poster.jpg", w: 258, h: 387 },
  "barbie": { src: "https://upload.wikimedia.org/wikipedia/en/0/0b/Barbie_2023_poster.jpg", w: 250, h: 375 },
  "tudo-em-todo-lugar": { src: "https://upload.wikimedia.org/wikipedia/en/1/1e/Everything_Everywhere_All_at_Once.jpg", w: 250, h: 370 },
  "dark": { src: "https://upload.wikimedia.org/wikipedia/pt/f/f6/Dark_%28s%C3%A9rie%29.jpg", w: 338, h: 500 },
  "breaking-bad": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Breaking_Bad_logo.svg/500px-Breaking_Bad_logo.svg.png", w: 369, h: 220 },
  "stranger-things": { src: "https://upload.wikimedia.org/wikipedia/commons/3/38/Stranger_Things_logo.png", w: 728, h: 400 },
  "brooklyn-99": { src: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Brooklyn_Nine-Nine_Logo.png", w: 534, h: 298 },
  "arcane": { src: "https://upload.wikimedia.org/wikipedia/pt/b/b4/ArcaneLogo.png", w: 485, h: 206 },
  "round-6": { src: "https://upload.wikimedia.org/wikipedia/pt/e/e8/Squid_Game_poster.jpg", w: 257, h: 380 },
  "the-crown": { src: "https://upload.wikimedia.org/wikipedia/en/1/18/The_Crown_Title_Card.jpg", w: 400, h: 199 },
  "bridgerton": { src: "https://upload.wikimedia.org/wikipedia/en/3/3d/Bridgerton_Title_Card.png", w: 446, h: 223 },
  "sintonia": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Sintonia_%28logo%29.svg/langpt-250px-Sintonia_%28logo%29.svg.png", w: 229, h: 118 },
  "avatar-aang": { src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Avatar_The_Last_Airbender_logo.svg/330px-Avatar_The_Last_Airbender_logo.svg.png", w: 300, h: 128 },
  "ted-lasso": { src: "https://upload.wikimedia.org/wikipedia/en/7/73/Tedlassotitlecard.jpg", w: 447, h: 223 },
  "o-urso": { src: "https://upload.wikimedia.org/wikipedia/pt/a/af/The_Bear_%28s%C3%A9rie_de_televis%C3%A3o%29.png", w: 250, h: 369 },
  "sherlock": { src: "https://upload.wikimedia.org/wikipedia/en/4/4d/Sherlock_titlecard.jpg", w: 421, h: 237 },
  "planeta-terra-2": { src: "https://upload.wikimedia.org/wikipedia/en/b/ba/Planet_Earth_II.png", w: 420, h: 237 },
  "cidade-invisivel": { src: "https://upload.wikimedia.org/wikipedia/pt/7/7a/Cidade_Invis%C3%ADvel%2C_cartaz.png", w: 247, h: 346 },
  "heartstopper": { src: "https://upload.wikimedia.org/wikipedia/en/8/89/Heartstopper_title-card.png", w: 448, h: 223 }
};

// Liga cada título ao seu pôster (ou null quando não há imagem).
CATALOGO.forEach((t) => { t.poster = POSTERS[t.id] || null; });

/* Conferência dos dados: ids únicos e referências válidas (veja o console). */
(function conferirCatalogo() {
  const ids = new Set();
  const generosValidos = new Set(GENEROS.map((g) => g.id));
  const humoresValidos = new Set(HUMORES.map((h) => h.id));
  CATALOGO.forEach((t) => {
    console.assert(!ids.has(t.id), "id repetido no catálogo:", t.id);
    ids.add(t.id);
    t.generos.forEach((g) => console.assert(generosValidos.has(g), "gênero inválido", g, "em", t.id));
    t.humores.forEach((h) => console.assert(humoresValidos.has(h), "humor inválido", h, "em", t.id));
    if (t.tipo === "serie") console.assert(t.episodios > 0 && t.temporadas > 0, "série sem episódios:", t.id);
  });
})();
