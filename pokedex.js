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

const pokemonCache = new Map();

let allNames = [];
let currentPokemon = null;
let currentRegion = "all";
let showAll = false;

let searchForm,
  searchInput,
  searchBtn,
  regionSelect,
  showAllBtn,
  randomBtn,
  clearBtn,
  mainCard,
  pokemonDataPanel;

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

async function getPokemonJson(idOrName) {
  const key = String(idOrName).toLowerCase();
  if (pokemonCache.has(key)) return pokemonCache.get(key);

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`);
  if (!res.ok) throw new Error("Failed to fetch Pokémon data");
  const json = await res.json();

  pokemonCache.set(json.name, json);
  pokemonCache.set(String(json.id), json);
  return json;
}

function renderMainCard() {
  if (!currentPokemon) {
    mainCard.innerHTML = `
      <div class="text-center">
        <p class="font-semibold text-indigo-700 mb-1">No Pokémon selected</p>
        <p class="text-sm text-slate-600">
          Search by name or ID, press <b>Random</b>, or use arrow keys.
        </p>
      </div>
    `;
    return;
  }

  mainCard.innerHTML = `
    <div class="flex flex-col items-center gap-3">
      <img src="${currentPokemon.sprite}" class="w-56 h-56 object-contain" />
      <h2 class="text-2xl font-extrabold text-rose-700 capitalize">
        ${currentPokemon.name}
      </h2>
    </div>
  `;
}

function renderDataPanel() {
  if (!currentPokemon) {
    pokemonDataPanel.innerHTML = `
      <p class="text-slate-300 text-sm text-center">
        Search for a Pokémon or press <b>Random</b> to view details.
      </p>
    `;
    return;
  }

  pokemonDataPanel.innerHTML = `
    <div class="space-y-3">
      <div class="flex gap-2">
        ${currentPokemon.types
          .map(
            (t) => `
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 capitalize">
            ${t}
          </span>`
          )
          .join("")}
      </div>

      <div>
        <h3 class="font-bold text-sm mb-1">Base stats</h3>
        ${currentPokemon.stats
          .map(
            (s) => `
          <div class="flex items-center gap-2 text-xs">
            <div class="w-28">${STAT_LABELS[s.name]}</div>
            <div class="flex-1 bg-slate-800 h-2 rounded">
              <div class="bg-emerald-400 h-2 rounded" style="width:${(s.value / 255) * 100}%"></div>
            </div>
            <div class="w-8 text-right">${s.value}</div>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;
}

async function fetchPokemon(q) {
  const d = await getPokemonJson(q);
  currentPokemon = {
    id: d.id,
    name: d.name,
    types: d.types.map((t) => t.type.name),
    sprite:
      d.sprites.other?.["official-artwork"]?.front_default ||
      d.sprites.front_default,
    stats: d.stats.map((s) => ({ name: s.stat.name, value: s.base_stat }))
  };

  renderMainCard();
  renderDataPanel();
}

async function initAllNames() {
  const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=20000");
  const data = await res.json();
  allNames = data.results.map((r) => r.name);
}

document.addEventListener("DOMContentLoaded", () => {
  searchForm = document.getElementById("searchForm");
  searchInput = document.getElementById("searchInput");
  searchBtn = document.getElementById("searchBtn");
  regionSelect = document.getElementById("regionSelect");
  showAllBtn = document.getElementById("showAllBtn");
  randomBtn = document.getElementById("randomBtn");
  clearBtn = document.getElementById("clearBtn");
  mainCard = document.getElementById("mainCard");
  pokemonDataPanel = document.getElementById("pokemonDataPanel");

  renderMainCard();
  renderDataPanel();
  initAllNames();

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    fetchPokemon(searchInput.value);
  });

  randomBtn.addEventListener("click", () => {
    const id = Math.floor(Math.random() * 1010) + 1;
    fetchPokemon(id);
  });

  clearBtn.addEventListener("click", () => {
    currentPokemon = null;
    renderMainCard();
    renderDataPanel();
  });

  // 🔥 Boot scan → default Pikachu
  setTimeout(() => {
    fetchPokemon("pikachu");
  }, 600);
});
