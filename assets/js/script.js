const STORAGE_KEY = "libri";

class Libro {
  letto = false;

  constructor(titolo, autore, anno) {
    this.id = crypto.randomUUID();
    this.titolo = titolo;
    this.autore = autore;
    this.anno = anno;
  }

  segnaComeLetto() {
    this.letto = true;
  }

  formato() {
    return "cartaceo";
  }

  static fromJSON(d) {
    return Object.assign(new this(d.titolo, d.autore, d.anno), d);
  }
}

class LibroDigitale extends Libro {
  constructor(titolo, autore, anno, dimensioneMb) {
    super(titolo, autore, anno);
    this.dimensioneMb = dimensioneMb;
  }

  formato() {
    return `digitale (${this.dimensioneMb} MB)`;
  }

  static fromJSON(d) {
    return Object.assign(
      new this(d.titolo, d.autore, d.anno, d.dimensioneMb),
      d,
    );
  }
}

class LibroAudio extends Libro {
  constructor(titolo, autore, anno, durataMinuti) {
    super(titolo, autore, anno);
    this.durataMinuti = durataMinuti;
  }

  formato() {
    return `audio (${this.durataMinuti} min)`;
  }

  static fromJSON(d) {
    return Object.assign(
      new this(d.titolo, d.autore, d.anno, d.durataMinuti),
      d,
    );
  }
}

const selectFormato = document.getElementById("formato");
const campoDimensione = document.getElementById("campo-dimensione");
const campoDurata = document.getElementById("campo-durata");
const formLibro = document.getElementById("aggiungi-libro");
const listaLibri = document.getElementById("lista-libri");
const svuota = document.getElementById("svuota-tutto");
const esporta = document.getElementById("esporta-tutto");
const filtri = document.querySelectorAll(".filtri");
const ordinamento = document.getElementById("ordinamento");
const spinner = document.getElementById("spinner");
const spinnerText = document.getElementById("spinner-text");
const boxErrore = document.getElementById("errore");
const risultati = document.getElementById("risultati");
const searchBar = document.getElementById("cerca");
let categorySelected = "Tutti";
let libri = caricaLibri();
let controller;
let timeoutId;
let ordine = "";

function renderLibri() {
  let libriFiltrati = [];

  if (categorySelected === "Tutti") {
    libriFiltrati = libri;
  } else if (categorySelected === "Letti") {
    libriFiltrati = libri.filter(function (libro) {
      return libro.letto === true;
    });
  } else if (categorySelected === "Da leggere") {
    libriFiltrati = libri.filter(function (libro) {
      return libro.letto === false;
    });
  }

  if (ordine === "Titolo") {
    libriFiltrati = libriFiltrati.toSorted((a, b) =>
      a.titolo.localeCompare(b.titolo, "it"),
    );
  } else if (ordine === "Anno") {
    libriFiltrati = libriFiltrati.toSorted(
      (a, b) => (a.anno ?? Infinity) - (b.anno ?? Infinity),
    );
  }

  const righe = libriFiltrati.map((l) => {
    const li = document.createElement("li");
    li.className =
      "libro d-flex justify-content-between align-items-center gap-3 bg-white rounded shadow-sm p-3";
    if (l.letto) {
      li.classList.add("letto");
    }
    li.dataset.id = l.id;

    const info = document.createElement("div");
    info.className = "info";

    const titolo = document.createElement("span");
    titolo.className = "fw-bold me-2";
    titolo.textContent = l.titolo;

    const badge = document.createElement("span");
    badge.className = "badge rounded-pill bg-secondary-subtle text-secondary";
    badge.textContent = l.formato();

    const meta = document.createElement("p");
    meta.className = "meta fs-6 text-muted m-0";
    meta.textContent = `${l.autore} - ${l.anno ?? "?"}`;

    info.appendChild(titolo);
    info.appendChild(badge);
    info.appendChild(meta);

    const azioni = document.createElement("div");
    azioni.className = "azioni d-flex align-items-center";

    if (l.letto) {
      const stato = document.createElement("span");
      stato.className = "text-success";
      stato.textContent = "✓ letto";
      azioni.appendChild(stato);
    } else {
      const bottone = document.createElement("button");
      bottone.type = "button";
      bottone.className = "segna-letto btn btn-sm btn-outline-dark";
      bottone.dataset.azione = "leggi";
      bottone.textContent = "Segna come letto";
      azioni.appendChild(bottone);
    }

    const rimuovi = document.createElement("button");
    rimuovi.type = "button";
    rimuovi.className = "btn btn-sm btn-outline-danger ms-2";
    rimuovi.dataset.azione = "rimuovi";
    rimuovi.textContent = "Rimuovi";

    azioni.append(rimuovi);
    li.appendChild(info);
    li.appendChild(azioni);

    return li;
  });

  listaLibri.replaceChildren(...righe);
  document.getElementById("contatore").textContent = libriFiltrati.length;
}

selectFormato.addEventListener("change", (e) => {
  campoDimensione.hidden = e.target.value !== "digitale";
  campoDurata.hidden = e.target.value !== "audio";
  document.getElementById("dimensione-mb").required =
    e.target.value === "digitale";
  document.getElementById("durata-minuti").required =
    e.target.value === "audio";
});

formLibro.addEventListener("submit", (e) => {
  e.preventDefault();
  const dati = Object.fromEntries(new FormData(e.target));
  const anno = Number(dati.anno) || null;
  let nuovo;

  if (dati.formato === "digitale") {
    nuovo = new LibroDigitale(
      dati.titolo,
      dati.autore,
      anno,
      Number(dati["dimensione-mb"]),
    );
  } else if (dati.formato === "audio") {
    nuovo = new LibroAudio(
      dati.titolo,
      dati.autore,
      anno,
      Number(dati["durata-minuti"]),
    );
  } else {
    nuovo = new Libro(dati.titolo, dati.autore, anno);
  }

  libri.push(nuovo);
  salvaLibri();
  renderLibri();

  risultati.querySelectorAll("button[data-titolo]").forEach((btn) => {
    if (
      btn.dataset.titolo === nuovo.titolo &&
      btn.dataset.autore === nuovo.autore
    ) {
      btn.textContent = "✓ Aggiunto";
      btn.className = "aggiungi-libro btn btn-sm btn-outline-secondary";
      btn.disabled = true;
      btn.closest("li").classList.add("letto");
    }
  });

  e.target.reset();
  campoDimensione.hidden = true;
  campoDurata.hidden = true;
  document.getElementById("dimensione-mb").required = false;
  document.getElementById("durata-minuti").required = false;
});

listaLibri.addEventListener("click", (e) => {
  const bottone = e.target.closest("[data-azione]");

  if (!bottone) {
    return;
  }

  const id = bottone.closest("li").dataset.id;

  if (bottone.dataset.azione === "leggi") {
    const libro = libri.find((l) => l.id === id);
    libro.segnaComeLetto();
  } else if (bottone.dataset.azione === "rimuovi") {
    const rimosso = libri.find((l) => l.id === id);
    libri = libri.filter((l) => l.id !== id);

    const ancoraPresente = libri.find(
      (l) => l.titolo === rimosso.titolo && l.autore === rimosso.autore,
    );

    if (!ancoraPresente) {
      risultati.querySelectorAll("button[data-titolo]").forEach((btn) => {
        if (
          btn.dataset.titolo === rimosso.titolo &&
          btn.dataset.autore === rimosso.autore
        ) {
          btn.textContent = "Aggiungi";
          btn.className = "aggiungi-libro btn btn-sm btn-outline-success";
          btn.disabled = false;
          btn.closest("li").classList.remove("letto");
        }
      });
    }
  }

  salvaLibri();
  renderLibri();
});

svuota.addEventListener("click", () => {
  libri = [];
  localStorage.removeItem(STORAGE_KEY);
  renderLibri();

  risultati.querySelectorAll(".libro.letto").forEach((li) => {
    li.classList.remove("letto");
    const btn = li.querySelector("button[data-titolo]");
    btn.textContent = "Aggiungi";
    btn.className = "aggiungi-libro btn btn-sm btn-outline-success";
    btn.disabled = false;
  });
});

esporta.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(libri, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "libri.json";
  a.click();
  URL.revokeObjectURL(url);
});

filtri.forEach(function (button) {
  button.addEventListener("click", function () {
    filtri.forEach(function (btn) {
      btn.classList.remove("selected", "btn-dark");
      btn.classList.add("btn-outline-dark");
    });

    button.classList.add("selected", "btn-dark");
    button.classList.remove("btn-outline-dark");

    categorySelected = button.textContent.trim();
    renderLibri();
  });
});

ordinamento.addEventListener("change", (e) => {
  ordine = e.target.value;
  renderLibri();
});

function mostraSpinner() {
  spinner.hidden = false;
  spinnerText.hidden = false;
  boxErrore.hidden = true;
}
function nascondiSpinner() {
  spinner.hidden = true;
  spinnerText.hidden = true;
}
function mostraErrore(msg) {
  boxErrore.textContent = "Errore: " + msg;
  boxErrore.hidden = false;
}

function cerca(query) {
  localStorage.setItem("lastQuery", query);

  if (controller) {
    controller.abort();
  }
  controller = new AbortController();
  const signal = controller.signal;

  mostraSpinner();

  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", 10);

  fetch(url, { signal })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} Error`);
      }
      return response.json();
    })

    .then((dati) => {
      renderRisultati(dati.docs);
    })

    .catch((err) => {
      if (err.name === "AbortError") {
        return;
      }
      mostraErrore(err.message);
    })

    .finally(() => {
      if (!signal.aborted) {
        nascondiSpinner();
      }
    });
}

function renderRisultati(docs) {
  const filtrati = docs.filter((d) => d.author_name);

  if (filtrati.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.textContent = "Nessun risultato.";
    risultati.replaceChildren(emptyLi);
    return;
  }

  const righe = filtrati.map((d) => {
    const autore = d.author_name[0];

    let anno = d.first_publish_year;
    if (!anno) {
      anno = "?";
    }

    const li = document.createElement("li");
    li.className =
      "libro d-flex justify-content-between align-items-center gap-3 bg-white rounded shadow-sm p-3";

    const info = document.createElement("div");
    info.className = "info";

    const titolo = document.createElement("span");
    titolo.className = "fw-bold fs-6 me-2";
    titolo.textContent = d.title;

    const meta = document.createElement("p");
    meta.className = "meta fs-6 text-muted m-0";
    meta.textContent = `${autore} - ${anno}`;

    info.appendChild(titolo);
    info.appendChild(meta);

    const azioni = document.createElement("div");
    azioni.className = "azioni d-flex align-items-center gap-2";

    const bottone = document.createElement("button");
    bottone.type = "button";
    bottone.className = "aggiungi-libro btn btn-sm btn-outline-success";
    bottone.dataset.titolo = d.title;
    bottone.dataset.autore = autore;
    bottone.dataset.anno = anno;
    bottone.textContent = "Aggiungi";

    const giaPresente = libri.find(
      (l) => l.titolo === d.title && l.autore === autore,
    );

    if (giaPresente) {
      bottone.textContent = "✓ Aggiunto";
      bottone.className = "aggiungi-libro btn btn-sm btn-outline-secondary";
      bottone.disabled = true;
      li.classList.add("letto");
    }

    const btnDettagli = document.createElement("button");
    btnDettagli.type = "button";
    btnDettagli.className = "btn btn-sm btn-outline-dark";
    btnDettagli.textContent = "Dettagli";

    btnDettagli.addEventListener("click", function () {
      fetch(`https://openlibrary.org${d.key}.json`)
        .then(function (r) {
          if (!r.ok) {
            throw new Error(`HTTP ${r.status} Error`);
          }
          return r.json();
        })

        .then(function (data) {
          let descrizione;

          if (typeof data.description === "string") {
            descrizione = data.description;
          } else if (data.description) {
            descrizione = data.description.value;
          }

          if (descrizione) {
            alert(descrizione);
          } else {
            alert("Nessuna descrizione");
          }
        })

        .catch(function (err) {
          mostraErrore(err.message);
        });
    });

    azioni.appendChild(bottone);
    azioni.appendChild(btnDettagli);
    li.appendChild(info);
    li.appendChild(azioni);

    return li;
  });

  risultati.replaceChildren(...righe);
}

searchBar.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  clearTimeout(timeoutId);

  if (query.length < 3) {
    localStorage.removeItem("lastQuery");
    if (controller) {
      controller.abort();
    }
    nascondiSpinner();
    boxErrore.hidden = true;
    risultati.textContent = "";
    return;
  }

  timeoutId = setTimeout(function () {
    cerca(query);
  }, 400);
});

risultati.addEventListener("click", (e) => {
  const bottone = e.target.closest("button[data-titolo]");
  if (!bottone) {
    return;
  }

  const titolo = bottone.dataset.titolo;
  const autore = bottone.dataset.autore;
  const anno = bottone.dataset.anno;
  libri.push(new Libro(titolo, autore, Number(anno) || null));
  salvaLibri();
  renderLibri();
  bottone.textContent = "✓ Aggiunto";
  bottone.className = "aggiungi-libro btn btn-sm btn-outline-secondary";
  bottone.disabled = true;
  bottone.closest("li").classList.add("letto");
});

const salvata = localStorage.getItem("lastQuery");
if (salvata) {
  document.querySelector("#cerca").value = salvata;
  cerca(salvata);
}

function salvaLibri() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(libri));
}

function caricaLibri() {
  const datiJSON = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");

  return datiJSON.map((d) => {
    if (d.dimensioneMb !== undefined) {
      return LibroDigitale.fromJSON(d);
    } else if (d.durataMinuti !== undefined) {
      return LibroAudio.fromJSON(d);
    } else {
      return Libro.fromJSON(d);
    }
  });
}

renderLibri();
