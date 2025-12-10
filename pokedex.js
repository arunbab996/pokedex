// Simple Pokédex logic for static web page (no React)

const TYPE_META = {
  normal: { label: "Normal", emoji: "⚪", bg: "from-gray-100 to-gray-200 text-gray-800" },
  fire: { label: "Fire", emoji: "🔥", bg: "from-orange-300 to-red-400 text-white" },
  water: { label: "Water", emoji: "💧", bg: "from-blue-300 to-blue-500 text-white" },
  electric: { label: "Electric", emoji: "⚡", bg: "from-yellow-300 to-yellow-500 text-gray-900" },
  grass: { label: "Grass", emoji: "🌿", bg: "from-green-300 to-emerald-500 text-white" },
  ice: { label: "Ice", emoji: "❄️", bg: "from-cyan-200 to-cyan-400 text-gray-900" },
  fighting: { label: "Fighting", emoji: "🥊", bg: "from-rose-300 to-rose-500 text-white" },
  poison: { label: "Poison", emoji: "☠️", bg: "from-violet-300 to-purple-600 text-white" },
  ground: { label: "Ground", emoji: "🟤", bg: "from-amber-200 to-amber-400 text-gray-900" },
  flying: { label: "Flying", emoji: "🕊️", bg: "from-sky-200 to-indigo-200 text-gray-900" },
  psychic: { label: "Psychic", emoji: "🔮", bg: "from-pink-200 to-pink-400 text-white" },
  bug: { label: "Bug", emoji: "🐞", bg: "from-lime-200 to-emerald-300 text-gray-900" },
  rock: { label: "Rock", emoji: "🪨", bg: "from-stone-200 to-stone-400 text-gray-900" },
  ghost: { label: "Ghost", emoji: "👻", bg: "from-indigo-400 to-violet-700 text-white" },
  dragon: { label: "Dragon", emoji: "🐉", bg: "from-indigo-600 to-indigo-900 text-white" },
  dark: { label: "Dark", emoji: "🌑", bg: "from-stone-700 to-stone-900 text-white" },
  steel: { label: "Steel", emoji: "🔩", bg: "from-slate-200 to-slate-400 text-gray-900" },
  fairy: { label: "Fairy", emoji: "🧚", bg: "from-pink-100 to-pink-300 text-gray-900" }
};

const TYPE_FRAME = {
  fire: "border-orange-200",
  water: "border-sky-200",
  grass: "border-emerald-200",
  electric: "border-yellow-200",
  ice: "border-cyan-200",
  psychic: "border-pink-200",
  dragon: "border-indigo-200",
  dark: "border-slate-300",
  fairy: "border-pink-200"
};

const STAT_LABELS = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed"
};

const REGIONS = {
  all: { label: "All regions", range: [1, 1010] },
  kanto: { label: "Kanto (1–151)", range: [1, 151] },
  johto: { label: "Johto (152–251)", range: [152, 251] },
  hoenn: { label: "Hoenn (252–386)", range: [252, 386] },
  sinnoh: { label: "Sinnoh (387–493)", range: [387, 493] },
  unova: { label: "Unova (494–649)", range: [494, 649] },
  kalos: { label: "Kalos (650–721)", range: [650, 721] },
  alola: { label: "Alola (722–809)", range: [722, 809] },
  galar: { label: "Galar (810–898)", range: [810, 898] },
  paldea: { label: "Paldea (899–1010)", range: [899, 1010] }
};

const CRY_URL = "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg";

// caches
const pokemonCache = new Map();
const speciesCache = new Map();
const evoChainCache = new Map();

// state
let allNames = [];
let currentPokemon = null;
let currentRegion = "all";
let showAll = false;
let regionList = [];
let regionDetails = [];
let regionPage = 0;
let isLoading = false;
let isLoadingRegion = false;
let suggestIndex = -1;

// DOM
let searchForm,
  searchInput,
  searchBtn,
  regionSelect,
  showAllBtn,
  randomBtn,
  clearBtn,
  errorBox,
  mainSection,
  gridSection,
  browseSection,
  mainCard,
  pokemonDataPanel,
  gridContainer,
  loadMoreBtn,
  statusRegion,
  statusMode,
  statusEntries,
  suggestionsList;

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function getPokemonJson(idOrName) {
  const key = String(idOrName).toLowerCase();
  if (pokemonCache.has(key)) return pokemonCache.get(key);

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`);
  if (!res.ok) throw new Error("Failed to fetch Pokémon data");
  const json = await res.json();

  pokemonCache.set(String(json.id), json);
  pokemonCache.set(json.name.toLowerCase(), json);
  return json;
}

async function fetchEvolutionData(speciesUrl) {
  try {
    let species = speciesCache.get(speciesUrl);
    if (!species) {
      const speciesRes = await fetch(speciesUrl);
      if (!speciesRes.ok) return { species: null, evolutions: [] };
      species = await speciesRes.json();
      speciesCache.set(speciesUrl, species);
    }

    if (!species.evolution_chain || !species.evolution_chain.url) {
      return { species, evolutions: [] };
    }

    let evoJson = evoChainCache.get(species.evolution_chain.url);
    if (!evoJson) {
      const evoRes = await fetch(species.evolution_chain.url);
      if (!evoRes.ok) return { species, evolutions: [] };
      evoJson = await evoRes.json();
      evoChainCache.set(species.evolution_chain.url, evoJson);
    }

    const evolutions = [];
    function traverse(node) {
      if (!node) return;
      if (node.species) evolutions.push({ name: node.species.name });
      if (node.evolves_to && node.evolves_to.length) {
        node.evolves_to.forEach((child) => traverse(child));
      }
    }
    traverse(evoJson.chain);
    return { species, evolutions };
  } catch (e) {
    console.warn("evolution fetch failed", e);
    return { species: null, evolutions: [] };
  }
}

function setLoading(flag) {
  isLoading = flag;
  if (searchBtn) {
    searchBtn.textContent = flag ? "Searching…" : "Search";
    searchBtn.disabled = flag;
  }
}

function createTypeBadges(types) {
  return types
    .map((t) => {
      const meta = TYPE_META[t] || {
        label: t,
        emoji: "✨",
        bg: "from-gray-100 to-gray-200 text-gray-800"
      };
      return `
        <div
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r ${meta.bg} shadow-md border border-white/60"
          title="${meta.label}"
        >
          <span class="text-base sm:text-lg">${meta.emoji}</span>
          <span class="capitalize tracking-wide">${t}</span>
        </div>
      `;
    })
    .join("");
}

function renderError(msg) {
  if (!errorBox) return;
  if (!msg) {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
  } else {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }
}

function renderStatus() {
  const regionConf = REGIONS[currentRegion] || REGIONS.all;
  const totalEntries = regionConf.range[1] - regionConf.range[0] + 1;
  const modeLabel = showAll ? "BROWSE" : currentPokemon ? "ENTRY" : "IDLE";
  const entryCountLabel = showAll
    ? `${regionDetails.length}/${totalEntries}`
    : currentPokemon
    ? `1/${totalEntries}`
    : `0/${totalEntries}`;

  if (statusRegion) statusRegion.textContent = regionConf.label;
  if (statusMode) statusMode.textContent = modeLabel;
  if (statusEntries) statusEntries.textContent = entryCountLabel;
}

/* LEFT: Main art + name + types + evolution */
function renderMainCard() {
  if (!mainCard) return;

  if (!currentPokemon || showAll) {
    // In browse mode or no Pokémon → simple placeholder
    mainCard.innerHTML = `
      <div>
        <p class="font-semibold mb-1 text-indigo-700">No Pokémon selected</p>
        <p class="text-xs sm:text-sm max-w-sm mx-auto text-slate-700">
          Search by name or ID, press <span class="font-semibold">Random</span>,
          or use the d-pad / keyboard arrows to explore entries.
        </p>
      </div>
    `;
    return;
  }

  const primaryType = currentPokemon.types[0];
  const frameClass = TYPE_FRAME[primaryType] || "border-slate-200";

  const evoHtml =
    currentPokemon.evolutions && currentPokemon.evolutions.length
      ? currentPokemon.evolutions
          .map(
            (e, idx) => `
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex flex-col items-center w-20 p-2 bg-white rounded-2xl shadow border border-slate-200 hover:border-amber-400 hover:shadow-md transition-colors"
            data-evo="${e.name}"
          >
            ${
              e.sprite
                ? `<img src="${e.sprite}" alt="${e.name}" class="w-10 h-10 object-contain mb-1" />`
                : `<div class="w-10 h-10 bg-slate-100 rounded mb-1"></div>`
            }
            <div class="text-[11px] capitalize font-semibold text-slate-700">${e.name}</div>
          </button>
          ${
            idx < currentPokemon.evolutions.length - 1
              ? `<span class="text-base text-slate-400">➜</span>`
              : ""
          }
        </div>`
          )
          .join("")
      : `<div class="text-xs text-slate-400">No evolution data</div>`;

  mainCard.innerHTML = `
    <div class="flex flex-col gap-4 w-full">
      <div class="flex flex-col items-center justify-center">
        <div class="w-full max-w-sm mx-auto bg-white rounded-3xl shadow-xl border-2 ${frameClass}">
          <div class="p-4 bg-gradient-to-b from-white to-slate-50 flex flex-col items-center">
            <div class="w-full h-52 flex items-center justify-center">
              ${
                currentPokemon.sprite
                  ? `<img src="${currentPokemon.sprite}" alt="${currentPokemon.name}" class="w-full h-full object-contain drop-shadow-xl" />`
                  : `<div class="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center">No image</div>`
              }
            </div>
            <div class="mt-3 text-center">
              <div class="text-xs text-slate-500 font-semibold">
                #${String(currentPokemon.id).padStart(3, "0")}
              </div>
              <h2 class="text-2xl font-extrabold capitalize mt-1 text-rose-700">
                ${capitalize(currentPokemon.name)}
              </h2>
              <div class="mt-2 flex gap-2 justify-center flex-wrap">
                ${createTypeBadges(currentPokemon.types)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-xs font-bold text-slate-800 mb-1 flex items-center gap-2">
          Evolution
          <span class="text-[11px] text-slate-500">(click to jump)</span>
        </h3>
        <div class="flex flex-wrap gap-3 justify-center">
          ${evoHtml}
        </div>
      </div>
    </div>
  `;

  const evoBtns = mainCard.querySelectorAll("[data-evo]");
  evoBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-evo");
      if (name) fetchPokemon(name);
    });
  });
}

/* RIGHT: data screen + browse screen */
function renderScreens() {
  renderStatus();

  // Toggle which screens are visible
  if (showAll) {
    mainSection && mainSection.classList.add("hidden");
    gridSection && gridSection.classList.add("hidden");
    browseSection && browseSection.classList.remove("hidden");
  } else {
    mainSection && mainSection.classList.remove("hidden");
    gridSection && gridSection.classList.remove("hidden");
    browseSection && browseSection.classList.add("hidden");
  }

  // Data screen content (abilities / stats / moves)
  if (!pokemonDataPanel) return;

  if (!currentPokemon || showAll) {
    pokemonDataPanel.innerHTML = `
      <div class="text-xs sm:text-sm text-slate-200 text-center">
        ${
          showAll
            ? "Browsing region entries. Tap a card to jump back into detailed entry mode."
            : 'Search for a Pokémon or press <span class="font-semibold text-amber-200">Random</span> to view abilities, base stats, and top moves here.'
        }
      </div>
    `;
  } else {
    const abilitiesHtml = currentPokemon.abilities
      .map(
        (a) =>
          `<span class="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold capitalize bg-slate-900 border border-slate-600 text-slate-50">
            ✨ ${a.name}${a.hidden ? " (hidden)" : ""}
          </span>`
      )
      .join("");

    const statsHtml = currentPokemon.stats
      .map((s) => {
        const label = STAT_LABELS[s.name] || capitalize(s.name);
        return `
        <div class="flex items-center gap-3">
          <div class="w-28 text-xs sm:text-sm text-slate-200 font-semibold">${label}</div>
          <div class="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              class="h-2 rounded-full bg-emerald-400"
              style="width:${Math.min(100, (s.value / 255) * 100)}%;"
            ></div>
          </div>
          <div class="w-10 text-right font-mono text-xs text-slate-100">${s.value}</div>
        </div>`;
      })
      .join("");

    const movesHtml = currentPokemon.moves
      .slice(0, 8)
      .map(
        (m) => `
      <div class="px-2 py-1 rounded-xl border border-pink-200/60 text-[11px] sm:text-xs capitalize bg-gradient-to-br from-slate-900 to-slate-800 shadow-sm flex items-center gap-2 text-slate-50">
        <span class="text-xs">⚡</span>
        <span class="truncate">${m}</span>
      </div>`
      )
      .join("");

    pokemonDataPanel.innerHTML = `
      <div class="flex flex-wrap gap-3 mb-2">
        <div class="px-3 py-2 rounded-2xl bg-amber-50/10 border border-amber-300/60 min-w-[100px] text-center">
          <div class="text-[11px] text-amber-200 font-semibold">Height</div>
          <div class="text-lg font-extrabold text-amber-100 mt-1">${currentPokemon.height} dm</div>
        </div>
        <div class="px-3 py-2 rounded-2xl bg-sky-50/10 border border-sky-300/60 min-w-[100px] text-center">
          <div class="text-[11px] text-sky-200 font-semibold">Weight</div>
          <div class="text-lg font-extrabold text-sky-100 mt-1">${currentPokemon.weight} hg</div>
        </div>
      </div>

      <div class="mb-3">
        <h3 class="text-xs font-bold text-slate-100 mb-1">Abilities</h3>
        <div class="flex gap-2 flex-wrap">
          ${abilitiesHtml}
        </div>
      </div>

      <div class="mb-3">
        <h3 class="text-xs font-bold text-slate-100 mb-1">Base stats</h3>
        <div class="space-y-2">
          ${statsHtml}
        </div>
      </div>

      <div>
        <h3 class="text-xs font-bold text-slate-100 mb-1">Top moves</h3>
        <div class="grid grid-cols-2 gap-2">
          ${movesHtml}
        </div>
      </div>
    `;
  }

  // Browse grid (big iPad view)
  if (!gridContainer || !loadMoreBtn) return;

  if (!showAll) {
    gridContainer.innerHTML = "";
    loadMoreBtn.classList.add("hidden");
    return;
  }

  gridContainer.innerHTML = regionDetails
    .map((p) => {
      return `
      <div
        class="bg-slate-900 rounded-2xl shadow-md p-3 text-center border border-slate-700 hover:border-amber-300 hover:shadow-lg transition-colors cursor-pointer flex flex-col gap-2"
        data-pname="${p.name}"
      >
        <div class="w-full h-20 flex items-center justify-center bg-slate-800 rounded-xl">
          ${
            p.sprite
              ? `<img src="${p.sprite}" alt="${p.name}" class="w-16 h-16 object-contain" />`
              : `<div class="w-16 h-16 bg-slate-700 rounded-xl"></div>`
          }
        </div>
        <div>
          <div class="text-[11px] text-slate-300 font-semibold">
            #${String(p.id).padStart(3, "0")}
          </div>
          <div class="text-xs sm:text-sm font-extrabold capitalize text-slate-50">
            ${p.name}
          </div>
        </div>
        <div class="mt-1 flex items-center justify-center gap-1 flex-wrap">
          ${p.types
            .map(
              (t) =>
                `<span class="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] capitalize border border-slate-600">${t}</span>`
            )
            .join("")}
        </div>
        <div class="mt-2 flex items-center justify-center gap-2">
          <div class="text-[10px] text-slate-300">HP</div>
          <div class="w-16 bg-rose-900 rounded-full h-2 overflow-hidden">
            <div
              class="h-2 rounded-full bg-rose-400"
              style="width:${Math.min(100, (p.hp / 255) * 100)}%;"
            ></div>
          </div>
          <div class="text-[10px] font-mono text-slate-100">${p.hp}</div>
        </div>
      </div>
    `;
    })
    .join("");

  if (regionDetails.length < regionList.length) {
    loadMoreBtn.classList.remove("hidden");
    loadMoreBtn.textContent = isLoadingRegion ? "Loading…" : "Load more";
  } else {
    loadMoreBtn.classList.add("hidden");
  }

  gridContainer.onclick = (e) => {
    const tile = e.target.closest("[data-pname]");
    if (tile) {
      const name = tile.getAttribute("data-pname");
      if (name) fetchPokemon(name);
    }
  };

  loadMoreBtn.onclick = () => {
    if (!isLoadingRegion) fetchRegionPage(regionPage + 1);
  };
}

async function fetchPokemon(q) {
  const trimmed = String(q || "").trim().toLowerCase();
  if (!trimmed) return;
  setLoading(true);
  renderError(null);
  currentPokemon = null;
  showAll = false;
  regionDetails = [];
  renderMainCard();
  renderScreens();

  try {
    const d = await getPokemonJson(trimmed);
    const normalized = {
      id: d.id,
      name: d.name,
      height: d.height,
      weight: d.weight,
      types: d.types.map((t) => t.type.name),
      sprite:
        (d.sprites.other &&
          d.sprites.other["official-artwork"] &&
          d.sprites.other["official-artwork"].front_default) ||
        d.sprites.front_default,
      stats: d.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
      abilities: d.abilities.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
      moves: d.moves.map((m) => m.move.name),
      evolutions: []
    };

    try {
      const speciesUrl = d.species.url;
      const evoData = await fetchEvolutionData(speciesUrl);
      if (evoData && evoData.evolutions && evoData.evolutions.length) {
        const evoFull = await Promise.all(
          evoData.evolutions.map(async (e) => {
            try {
              const pJson = await getPokemonJson(e.name);
              return {
                name: e.name,
                sprite:
                  (pJson.sprites.other &&
                    pJson.sprites.other["official-artwork"] &&
                    pJson.sprites.other["official-artwork"].front_default) ||
                  pJson.sprites.front_default
              };
            } catch {
              return { name: e.name, sprite: null };
            }
          })
        );
        normalized.evolutions = evoFull;
      }
    } catch {
      // ignore evo errors
    }

    currentPokemon = normalized;
    renderMainCard();
    renderScreens();

    try {
      const audio = new Audio(CRY_URL);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}

    if (searchInput) searchInput.value = currentPokemon.name;
  } catch (err) {
    console.error(err);
    renderError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
}

async function prepareRegionList(regionKey) {
  const conf = REGIONS[regionKey] || REGIONS.all;
  const [from, to] = conf.range;
  const arr = [];
  for (let i = from; i <= to; i++) arr.push(String(i));
  regionList = arr;
}

async function fetchRegionPage(page, pageSize = 40) {
  if (!regionList.length) return;
  isLoadingRegion = true;
  renderScreens();

  const start = page * pageSize;
  const slice = regionList.slice(start, start + pageSize);

  try {
    const details = await Promise.all(
      slice.map(async (idOrName) => {
        const d = await getPokemonJson(idOrName);
        return {
          id: d.id,
          name: d.name,
          types: d.types.map((t) => t.type.name),
          sprite:
            (d.sprites.other &&
              d.sprites.other["official-artwork"] &&
              d.sprites.other["official-artwork"].front_default) ||
            d.sprites.front_default,
          hp: (d.stats.find((s) => s.stat.name === "hp") || {}).base_stat || 0
        };
      })
    );

    regionDetails = regionDetails.concat(details);
    regionPage = page;
  } catch (e) {
    console.error(e);
    renderError("Failed to load region Pokémon");
  } finally {
    isLoadingRegion = false;
    renderScreens();
  }
}

async function onShowAll() {
  showAll = true;
  currentPokemon = null;
  regionDetails = [];
  renderMainCard();
  renderScreens();
  if (!regionList.length) {
    await prepareRegionList(currentRegion);
  }
  await fetchRegionPage(0);
}

function clearAll() {
  if (searchInput) searchInput.value = "";
  currentPokemon = null;
  regionDetails = [];
  regionList = [];
  showAll = false;
  renderError(null);
  renderMainCard();
  renderScreens();
}

async function randomPokemon() {
  try {
    if (currentRegion !== "all") {
      if (!regionList.length) await prepareRegionList(currentRegion);
      if (regionList.length) {
        const nameOrId = regionList[Math.floor(Math.random() * regionList.length)];
        fetchPokemon(nameOrId);
        return;
      }
    }
    if (allNames.length) {
      const name = allNames[Math.floor(Math.random() * allNames.length)];
      fetchPokemon(name);
      return;
    }
    const id = Math.floor(Math.random() * 1010) + 1;
    fetchPokemon(id);
  } catch {
    renderError("Could not pick a random Pokémon");
  }
}

function browseById(delta) {
  if (!currentPokemon) return;
  let nextId = currentPokemon.id + delta;
  if (nextId < 1) nextId = 1;
  fetchPokemon(nextId);
}

function renderSuggestions() {
  if (!suggestionsList || !searchInput) return;
  const q = searchInput.value.trim().toLowerCase();
  if (q.length < 2) {
    suggestionsList.classList.add("hidden");
    suggestionsList.innerHTML = "";
    suggestIndex = -1;
    return;
  }
  const matches = allNames.filter((name) => name.startsWith(q)).slice(0, 8);
  if (!matches.length) {
    suggestionsList.classList.add("hidden");
    suggestionsList.innerHTML = "";
    suggestIndex = -1;
    return;
  }
  suggestionsList.innerHTML = matches
    .map(
      (name, idx) => `
      <li
        class="px-3 py-1 cursor-pointer hover:bg-pink-50 ${
          idx === suggestIndex ? "bg-pink-100" : ""
        }"
        data-suggest="${name}"
      >
        ${name}
      </li>`
    )
    .join("");
  suggestionsList.classList.remove("hidden");
}

async function initAllNames() {
  try {
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=20000");
    const data = await res.json();
    allNames = data.results.map((r) => r.name);
  } catch (e) {
    console.warn("Could not load full index of Pokémon names", e);
  }
}

function setupGlobalShortcuts() {
  window.addEventListener("keydown", (e) => {
    const target = e.target;
    const tag = (target && target.tagName && target.tagName.toLowerCase()) || "";
    const isTyping =
      tag === "input" || tag === "textarea" || (target && target.isContentEditable);
    if (isTyping) return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      browseById(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      browseById(1);
    } else if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      randomPokemon();
    } else if (e.key === "s" || e.key === "/") {
      e.preventDefault();
      if (searchInput) searchInput.focus();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  searchForm = document.getElementById("searchForm");
  searchInput = document.getElementById("searchInput");
  searchBtn = document.getElementById("searchBtn");
  regionSelect = document.getElementById("regionSelect");
  showAllBtn = document.getElementById("showAllBtn");
  randomBtn = document.getElementById("randomBtn");
  clearBtn = document.getElementById("clearBtn");
  errorBox = document.getElementById("errorBox");
  mainSection = document.getElementById("mainSection");
  gridSection = document.getElementById("gridSection");
  browseSection = document.getElementById("browseSection");
  mainCard = document.getElementById("mainCard");
  pokemonDataPanel = document.getElementById("pokemonDataPanel");
  gridContainer = document.getElementById("gridContainer");
  loadMoreBtn = document.getElementById("loadMoreBtn");
  statusRegion = document.getElementById("statusRegion");
  statusMode = document.getElementById("statusMode");
  statusEntries = document.getElementById("statusEntries");
  suggestionsList = document.getElementById("suggestionsList");

  renderMainCard();
  renderScreens();
  setupGlobalShortcuts();
  initAllNames();

  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (searchInput) fetchPokemon(searchInput.value);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      suggestIndex = -1;
      renderSuggestions();
    });
    searchInput.addEventListener("keydown", (e) => {
      const items = suggestionsList
        ? suggestionsList.querySelectorAll("[data-suggest]")
        : [];
      if (!items.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        suggestIndex = (suggestIndex + 1) % items.length;
        renderSuggestions();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        suggestIndex = (suggestIndex - 1 + items.length) % items.length;
        renderSuggestions();
      } else if (e.key === "Enter") {
        if (suggestIndex >= 0 && suggestIndex < items.length) {
          e.preventDefault();
          const name = items[suggestIndex].getAttribute("data-suggest");
          if (name) {
            searchInput.value = name;
            suggestionsList.classList.add("hidden");
            fetchPokemon(name);
            suggestIndex = -1;
          }
        }
      }
    });
  }

  if (suggestionsList) {
    suggestionsList.addEventListener("mousedown", (e) => {
      const li = e.target.closest("[data-suggest]");
      if (!li || !searchInput) return;
      const name = li.getAttribute("data-suggest");
      if (!name) return;
      searchInput.value = name;
      suggestionsList.classList.add("hidden");
      fetchPokemon(name);
      suggestIndex = -1;
    });
  }

  if (regionSelect) {
    regionSelect.addEventListener("change", () => {
      currentRegion = regionSelect.value;
      regionList = [];
      regionDetails = [];
      showAll = false;
      renderMainCard();
      renderScreens();
    });
  }

  if (showAllBtn) showAllBtn.addEventListener("click", onShowAll);
  if (randomBtn) randomBtn.addEventListener("click", randomPokemon);
  if (clearBtn) clearBtn.addEventListener("click", clearAll);
});
