(()=>{
const apiBase = document.documentElement.dataset.apiBase || '';
const siteBase = document.documentElement.dataset.siteBase;
const pageLink = path => siteBase ? siteBase+'?page='+encodeURIComponent(path) : path;
const storageKey = 'prokat212-cart';
const favoriteKey = 'prokat212-favorites';
const cart = document.querySelector('#cart');
let selection = new URLSearchParams(location.search).get('booking')==='sent' ? [] : readIds(storageKey,20);
if (new URLSearchParams(location.search).get('booking')==='sent') { try { localStorage.removeItem(storageKey); } catch {} }
let favorites = readIds(favoriteKey,500);
let items = new Map(JSON.parse(document.querySelector('#catalog-data').textContent).map(p=>[p.id,p]));
let activeFilter = document.querySelector('[data-filter][aria-pressed=true]')?.dataset.filter || '';
let toastTimer;
const form = document.querySelector('#booking');

function readIds(key,limit) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(saved) ? [...new Set(saved.filter(id => typeof id === 'string'))].slice(0,limit) : [];
  } catch { return []; }
}

function saveSelection() {
  try { localStorage.setItem(storageKey,JSON.stringify(selection)); } catch {}
  refreshCount();
}

function refreshCount() {
  document.querySelectorAll('[data-count]').forEach(el => { el.textContent = selection.length; });
  document.querySelectorAll('[data-add]').forEach(button => {
    button.classList.toggle('added',selection.includes(button.dataset.add));
  });
}

function refreshFavorites() {
  document.querySelectorAll('[data-favorite]').forEach(button => {
    button.setAttribute('aria-pressed',String(favorites.includes(button.dataset.favorite)));
  });
}
function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(saved=>saved!==id);
    toast('Удалено из избранного');
  } else {
    favorites = [...favorites,id].slice(-500);
    toast('Добавлено в избранное');
  }
  try { localStorage.setItem(favoriteKey,JSON.stringify(favorites)); } catch {}
  refreshFavorites();
  applyFilters();
}

function toast(message) {
  const target = document.querySelector('#toast');
  if (!target) return;
  target.textContent = message;
  target.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { target.hidden = true; },2600);
}

function renderCart(message) {
  const host = document.querySelector('#cart-content');
  host.replaceChildren();
  if (message || !selection.length || !items) {
    const paragraph = document.createElement('p');
    paragraph.className = 'cart-message';
    paragraph.textContent = message || (!selection.length ? 'Корзина пуста. Добавьте оборудование из каталога.' : 'Загружаем корзину…');
    host.append(paragraph);
    form.hidden = true;
    return;
  }

  for (const id of selection) {
    const product = items.get(id);
    const row = document.createElement('div');
    row.className = 'cart-line';
    const title = document.createElement('a');
    title.href = pageLink('/item/' + product.id);
    title.textContent = product.name;
    const cost = document.createElement('small');
    cost.textContent = new Intl.NumberFormat('ru-BY').format(product.price / 100) + ' BYN' + (product.unit ? ' / ' + product.unit : '');
    const remove = document.createElement('button');
    remove.className = 'close';
    remove.type = 'button';
    remove.dataset.remove = id;
    remove.setAttribute('aria-label','Удалить: '+product.name);
    remove.textContent = '×';
    const info = document.createElement('div');
    info.append(title,cost);
    row.append(info,remove);
    host.append(row);
  }
  form.hidden = false;
}

function openCart() {
  if (!cart) { location.href = pageLink('/#catalog'); return; }
  if (!cart.open) cart.showModal();
  selection = selection.filter(id=>items.has(id));
  saveSelection();
  renderCart();
}
window.addEventListener('prokat-catalog-update',event=>{
  items = new Map(event.detail.map(p=>[p.id,p]));
  if (cart?.open) {
    selection = selection.filter(id=>items.has(id));
    saveSelection();
    renderCart();
  }
  refreshCount();
  refreshFavorites();
  applyFilters();
});

function applyFilters() {
  const grid = document.querySelector('#product-grid');
  if (!grid) return;
  const normalize = value => value.toLocaleLowerCase('ru').normalize('NFD').replace(/\p{M}+/gu,'');
  const query = normalize(grid.dataset.query);
  const favoritesOnly = 'favorites' in grid.dataset;
  const mode = document.querySelector('#sort').value;
  const cards = [...grid.querySelectorAll('[data-card]')];
  cards.sort((a,b) => {
    const value = Number(a.dataset.price) - Number(b.dataset.price);
    if (mode==='asc'&&value) return value;
    if (mode==='desc'&&value) return -value;
    return Number(a.dataset.position) - Number(b.dataset.position) || a.dataset.title.localeCompare(b.dataset.title,'ru');
  });
  let visible = 0;
  for (const card of cards) {
    card.hidden = (favoritesOnly && !favorites.includes(card.dataset.productId)) ||
      (activeFilter && card.dataset.category!==activeFilter) || !normalize(card.dataset.title).includes(query);
    if (!card.hidden) visible++;
    grid.append(card);
  }
  document.querySelector('#empty-search').hidden = visible > 0;
}

document.addEventListener('click',event => {
  const menu = document.querySelector('.catalog-menu[open]');
  if (menu && !event.target.closest('.catalog-menu')) menu.open = false;
  const target = event.target.closest('[data-cart],[data-add],[data-close],[data-remove],[data-filter],[data-photo],[data-favorite]');
  if (!target) return;
  const data = target.dataset;
  if ('cart' in data) void openCart();
  if ('favorite' in data) toggleFavorite(data.favorite);
  if ('close' in data) cart.close();
  if ('add' in data) {
    if (!selection.includes(data.add)) {
      if (selection.length >= 20) { toast('В корзине уже 20 позиций.'); return; }
      selection.push(data.add);
      saveSelection();
    }
    if ('openCart' in data) void openCart();
    else toast('Позиция в корзине');
  }
  if ('remove' in data) {
    selection = selection.filter(id=>id!==data.remove);
    saveSelection();
    renderCart();
  }
  if ('filter' in data) {
    activeFilter = data.filter;
    document.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button===target)));
    applyFilters();
  }
  if ('photo' in data) {
    document.querySelector('.item-image img').src = data.photo;
    document.querySelectorAll('[data-photo]').forEach(button=>button.setAttribute('aria-pressed',String(button===target)));
  }
});

document.addEventListener('keydown',event=>{
  const menu = document.querySelector('.catalog-menu[open]');
  if (menu && event.key==='Escape') { menu.open = false; menu.querySelector('summary').focus(); }
});
document.querySelector('#sort')?.addEventListener('change',applyFilters);
window.addEventListener('storage',event=>{
  if (event.key===storageKey) { selection=readIds(storageKey,20); refreshCount(); if (cart?.open) void openCart(); }
  if (event.key===favoriteKey) { favorites=readIds(favoriteKey,500); refreshFavorites(); applyFilters(); }
});

if (form) {
  const min = new Date(Date.now() + 3*3600000).toISOString().slice(0,10);
  form.elements.from.min = min;
  form.elements.to.min = min;
  form.elements.from.addEventListener('change',()=>{
    const value = form.elements.from.value || min;
    form.elements.to.min = value;
    if (form.elements.to.value < value) form.elements.to.value = value;
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const message = form.querySelector('.form-message');
    if (!selection.length) { message.textContent = 'Выберите оборудование.'; return; }
    let hidden = form.querySelector('input[name=items]');
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = 'items';
      form.append(hidden);
    }
    hidden.value = JSON.stringify(selection);
    form.method = 'POST';
    form.action = apiBase+'/request-booking';
    form.querySelector('button[type=submit]').disabled = true;
    HTMLFormElement.prototype.submit.call(form);
  });
  window.addEventListener('pageshow',()=>{
    form.querySelector('button[type=submit]').disabled = false;
  });
  cart.addEventListener('close',()=>{form.querySelector('.form-message').textContent='';});
}

refreshCount();

refreshFavorites();
applyFilters();

})();
