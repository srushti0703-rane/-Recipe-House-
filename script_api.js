// === Recipe House – robust frontend (v111) ===
const API_BASE = "http://127.0.0.1:8000/api";
console.log("Loaded script_api.js v111");

// ---------- HTTP ----------
async function apiGet(p){ const r = await fetch(`${API_BASE}${p}`); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPost(p,b){ const r = await fetch(`${API_BASE}${p}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPatch(p,b){ const r = await fetch(`${API_BASE}${p}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiDelete(p){ const r = await fetch(`${API_BASE}${p}`,{method:"DELETE"}); if(!r.ok) throw new Error(await r.text()); return true; }

// ---------- State ----------
let recipes = [];
let nextId = 1;
let editingId = null;
let openRecipeId = null;

// ---------- Utils ----------
function ratingClass(n){ if(n<=1) return "rate-low"; if(n<=3) return "rate-mid"; return "rate-high"; }

// ---------- Popup (ensure exists) ----------
function ensurePopup(){
  if (document.getElementById("popup")) return;
  const wrap = document.createElement("div");
  wrap.id = "popup";
  wrap.className = "popup hidden";
  wrap.innerHTML = `
    <div class="popup-content">
      <span id="close-popup" aria-label="Close">&times;</span>
      <img id="popup-img" alt="" class="popup-img" />
      <h2 id="popup-title"></h2>
      <p id="popup-category"></p>
      <h3>Ingredients</h3>
      <ul id="popup-ingredients"></ul>
      <h3>Instructions</h3>
      <ol id="popup-instructions"></ol>
      <div class="rating">
        <h3>Rate this recipe:</h3>
        <div class="stars">
          <span class="star" onclick="rate(1)">&#9733;</span>
          <span class="star" onclick="rate(2)">&#9733;</span>
          <span class="star" onclick="rate(3)">&#9733;</span>
          <span class="star" onclick="rate(4)">&#9733;</span>
          <span class="star" onclick="rate(5)">&#9733;</span>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
}

// ---------- Safety: stamp ids on cards if missing ----------
function ensureIdsInDom(){
  window.recipes = recipes; // expose globally for fallbacks
  const map = new Map(recipes.map(r => [String(r.name||'').toLowerCase(), r.id]));
  document.querySelectorAll('.recipe-card').forEach(card => {
    if (!card.dataset.id) {
      const title = (card.querySelector('.title, h3, .card-title')?.textContent || '')
        .trim().toLowerCase();
      const id = map.get(title);
      if (id) card.dataset.id = id;
    }
  });
}

// ---------- Render (INLINE onclick added on card & title) ----------
function displayRecipes(list){
  const el = document.getElementById("recipe-list");
  if(!el){ console.error("Missing #recipe-list"); return; }

  el.innerHTML = list.map(r => `
    <div class="recipe-card" data-id="${Number(r.id) || ''}" onclick="openRecipe(${Number(r.id)||0})">
      <img src="${r.image || '/img/download.jpg'}" alt="${r.name}">
      <h3 class="title" onclick="openRecipe(${Number(r.id)||0}); event.stopPropagation();">${r.name}</h3>
      <p class="category"><strong>Category:</strong> ${r.category}</p>
      <p class="ingredients"><strong>Ingredients:</strong> ${r.ingredients.join(", ")}</p>
      <div class="rating-row">
        <span class="rating-badge ${ratingClass(r.rating ?? 0)}">⭐ ${r.rating ?? 0}</span>
        <div class="card-actions">
          <button type="button" class="btn small edit"
                  onclick="startEdit(${Number(r.id)||0}); event.stopPropagation();">Edit</button>
          <button type="button" class="btn small danger"
                  onclick="deleteRecipe(${Number(r.id)||0}); event.stopPropagation();">Delete</button>
        </div>
      </div>
    </div>
  `).join("");

  ensureIdsInDom();
}

// ---------- Load / Search / Filter ----------
async function loadRecipes(){
  const data = await apiGet("/recipes");
  recipes = data;
  window.recipes = data;
  nextId = data.length ? Math.max(...data.map(r=>r.id)) + 1 : 1;
  displayRecipes(data);
}
function searchRecipes(t){
  t=(t||"").toLowerCase();
  displayRecipes(recipes.filter(r =>
    r.name.toLowerCase().includes(t) ||
    r.ingredients.join(" ").toLowerCase().includes(t) ||
    r.category.toLowerCase().includes(t)
  ));
}
function filterRecipes(cat){
  if(!cat || cat==="all") return displayRecipes(recipes);
  displayRecipes(recipes.filter(r=> r.category.toLowerCase()===cat.toLowerCase()));
}
window.filterRecipes = filterRecipes;

// ---------- Add / Edit / Delete ----------
async function addOrEditRecipe(e){
  e.preventDefault();
  const name = document.getElementById("new-name")?.value.trim();
  const category = document.getElementById("new-category")?.value.trim();
  const ingredientsStr = document.getElementById("new-ingredients")?.value || "";
  const instructions = document.getElementById("new-instructions")?.value || "";
  let image = document.getElementById("new-img")?.value.trim();

  if(!name || !category || !ingredientsStr || !instructions){ alert("Please fill all fields."); return; }
  if(image && !image.startsWith("/img/") && !/^https?:\/\//i.test(image)){ if(image.startsWith("img/")) image = "/" + image; }
  const ingredients = ingredientsStr.split(",").map(s=>s.trim()).filter(Boolean);

  if (editingId){
    await apiPatch(`/recipes/${editingId}`, { name, category, ingredients, instructions, image });
    editingId = null; const btn=document.querySelector('#recipe-form button[type="submit"]'); if(btn) btn.textContent="Add Recipe";
  } else {
    await apiPost("/recipes", { id: nextId++, name, category, rating: 0, ingredients, instructions, image });
  }
  e.target.reset?.(); await loadRecipes(); alert("Saved!");
}
async function deleteRecipe(id){ if(!confirm("Delete this recipe?")) return; await apiDelete(`/recipes/${id}`); await loadRecipes(); }
function startEdit(id){
  const r=recipes.find(x=>x.id===id); if(!r) return;
  editingId=id;
  document.getElementById("new-name").value=r.name;
  document.getElementById("new-category").value=r.category;
  document.getElementById("new-ingredients").value=r.ingredients.join(", ");
  document.getElementById("new-instructions").value=r.instructions;
  document.getElementById("new-img").value=r.image || "";
  const btn=document.querySelector('#recipe-form button[type="submit"]'); if(btn) btn.textContent="Save Changes";
  document.querySelector(".add-recipe")?.scrollIntoView({behavior:"smooth"});
}
window.startEdit = startEdit; window.deleteRecipe = deleteRecipe;

// ---------- Popup open/close + rating ----------
function openRecipe(id){
  ensurePopup();
  const r = (window.recipes || recipes || []).find(x=>x.id===id); if(!r){ console.warn("Recipe not found", id); return; }
  openRecipeId = id;

  (document.getElementById("popup-title")||{}).textContent = r.name;
  (document.getElementById("popup-category")||{}).textContent = `Category: ${r.category}`;
  const img = document.getElementById("popup-img"); if (img) img.src = r.image || "/img/download.jpg";

  const ul = document.getElementById("popup-ingredients");
  if (ul) ul.innerHTML = r.ingredients.map(it=>`<li>${it}</li>`).join("");

  const ol = document.getElementById("popup-instructions");
  if (ol){
    const steps = (r.instructions||"").split(/\r?\n+/).map(s=>s.replace(/^\d+\.\s*/,"").trim()).filter(Boolean);
    ol.innerHTML = steps.map(step=>`<li>${step}</li>`).join("");
  }

  const popup = document.getElementById("popup");
  popup.classList.remove("hidden");
  popup.style.display = "flex";              // force visible
  document.body.classList.add("modal-open"); // blur page
  setTimeout(()=>highlightStars(r.rating ?? 0),0);
}
window.openRecipe = openRecipe;

function closePopup(){
  const popup = document.getElementById("popup");
  popup.classList.add("hidden");
  popup.style.display = "none";              // force hide
  document.body.classList.remove("modal-open");
}
window.closePopup = closePopup;

function highlightStars(n){ document.querySelectorAll("#popup .star").forEach((s,i)=>s.classList.toggle("active", i<n)); }
async function rate(n){ if(!openRecipeId) return; await apiPatch(`/recipes/${openRecipeId}/rating`, { rating:n }); highlightStars(n); await loadRecipes(); }
window.rate = rate;


// === Theme togglehbjkdnkjkhfkldxnkfnkjhxdfhsjhdfskdjjfjshjhfhskfhksfkush ===
function applyTheme() {
  const dark = localStorage.getItem('theme') === 'dark';
  document.body.classList.toggle('dark', dark);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = dark ? '☀️ Light Mode' : '🌙 Dark Mode';
}
function toggleTheme() {
  const dark = !document.body.classList.contains('dark');
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  applyTheme();
}

// hook up the button + apply saved theme on load
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
});









// ---------- Overlay/X & ESC closers ----------
document.addEventListener("DOMContentLoaded", () => {
  ensurePopup();

  // close by clicking overlay or ×
  const popup = document.getElementById("popup");
  popup?.addEventListener("click", (e) => {
    if (e.target.id === "popup" || e.target.id === "close-popup") {
      closePopup();
    }
  }, true);

  // search + add/edit form
  document.getElementById("search")?.addEventListener("input", (e) => searchRecipes(e.target.value));
  document.getElementById("recipe-form")?.addEventListener("submit", addOrEditRecipe);

  loadRecipes(); // render cards with inline onclick
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePopup(); });



function scrollToForm() {
  const target =
    document.getElementById('add-recipe') ||
    document.querySelector('.add-recipe') ||
    document.getElementById('recipe-form');

  if (!target) return;

  // smooth scroll to the form
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // if you have a sticky header and want a tiny offset:
  setTimeout(() => window.scrollBy({ top: -12, left: 0, behavior: 'instant' }), 250);
}
window.scrollToForm = scrollToForm;





