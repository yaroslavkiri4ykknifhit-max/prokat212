(async () => {
  const backend = 'https://prokat-212-vitebsk.hulk-baseman-6e.chatgpt.site';
  const siteBase = '/prokat212/';
  const params = new URLSearchParams(location.search);
  const route = params.get('page') || '/';
  const routeUrl = new URL(route,backend);
  const localPage = path => {
    if (['/catalog','/catalog/'].includes(path)) return 'catalog.html';
    if (['/prices','/prices/'].includes(path)) return 'prices.html';
    if (path==='/privacy') return 'privacy.html';
    const match = /^\/item\/([0-9a-z-]{8,40})$/.exec(path);
    return match ? 'item-'+match[1]+'.html' : 'not-found.html';
  };
  const pageUrl = value => {
    const target = new URL(value,backend);
    if (target.pathname.startsWith('/admin')) return target.href;
    return siteBase+'?page='+encodeURIComponent(target.pathname+target.search)+target.hash;
  };

  if (routeUrl.origin!==backend) return;
  if (routeUrl.pathname.startsWith('/admin')) {
    location.replace(backend+'/admin');
    return;
  }

  if (routeUrl.pathname!=='/') {
    try {
      const response = await fetch(siteBase+'pages/'+localPage(routeUrl.pathname),{credentials:'omit'});
      if (!response.ok) throw new Error();
      const parsed = new DOMParser().parseFromString(await response.text(),'text/html');
      parsed.querySelectorAll('script[src]').forEach(script=>script.remove());
      document.title = parsed.title;
      document.body.replaceWith(document.importNode(parsed.body,true));
    } catch {
      const main = document.querySelector('main');
      const note = document.createElement('p');
      note.textContent = 'Эта страница временно недоступна. Выберите оборудование в каталоге ниже.';
      main.prepend(note);
    }
  }

  const grid = document.querySelector('#product-grid');
  const favorites = routeUrl.searchParams.get('view')==='favorites';
  const category = routeUrl.searchParams.get('category') || '';
  const query = routeUrl.searchParams.get('q') || '';
  if (grid) {
    grid.dataset.query = query;
    if (favorites) {
      grid.dataset.favorites = '';
      document.title = 'Избранное · Прокат 212';
      document.querySelector('h1')?.replaceChildren('Избранное');
      const tabs = document.querySelector('.catalog-tabs');
      if (tabs) tabs.hidden = true;
      const empty = document.querySelector('#empty-search');
      empty.textContent = 'Добавляйте оборудование в избранное с помощью сердечка на карточке.';
    }
    document.querySelectorAll('[data-filter]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.filter===category));
    });
  }
  const search = document.querySelector('.header-search');
  if (search) {
    search.elements.q.value = query;
    search.addEventListener('submit',event=>{
      event.preventDefault();
      location.href = pageUrl('/catalog?'+new URLSearchParams({q:new FormData(search).get('q') || ''}));
    });
  }

  const script = document.createElement('script');
  script.src = siteBase+'shop.js?v=static1';
  script.onload = () => { void refreshFromServer(); };
  document.body.append(script);
  if (location.hash) {
    requestAnimationFrame(()=>document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
  }

  async function refreshFromServer() {
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),5000);
    try {
      const response = await fetch(backend+'/api/storefront?page='+encodeURIComponent(route),{
        credentials:'omit',signal:controller.signal,
      });
      if (!response.ok && response.status!==404) return;
      const data = await response.json();
      if (!data.html || !Array.isArray(data.products)) return;
      const parsed = new DOMParser().parseFromString(data.html,'text/html');
      parsed.querySelectorAll('script,base').forEach(element=>element.remove());
      for (const element of parsed.querySelectorAll('[src],[data-photo]')) {
        for (const attribute of ['src','data-photo']) {
          const value = element.getAttribute(attribute);
          if (value?.startsWith('/')) element.setAttribute(attribute,siteBase+value.slice(1));
        }
      }
      for (const anchor of parsed.querySelectorAll('a[href]')) {
        const value = anchor.getAttribute('href');
        if (value.startsWith('/')) anchor.href = pageUrl(value);
      }
      if (/^\/item\//.test(routeUrl.pathname)) {
        const currentMain = document.querySelector('main');
        const updatedMain = parsed.querySelector('main');
        if (currentMain && updatedMain && (!currentMain.querySelector('.item-grid') || response.status===404)) {
          currentMain.replaceWith(updatedMain);
        }
        document.title = parsed.title;
      }
      const currentGrid = document.querySelector('#product-grid');
      const newGrid = parsed.querySelector('#product-grid');
      if (currentGrid && newGrid) currentGrid.replaceChildren(...newGrid.childNodes);
      for (const selector of ['.price-table','.item-grid','.item-title']) {
        const current = document.querySelector(selector);
        const update = parsed.querySelector(selector);
        if (current && update) current.replaceWith(update);
      }
      window.dispatchEvent(new CustomEvent('prokat-catalog-update',{detail:data.products}));
    } catch {
      // All visible catalog content and the cart already use local data.
    } finally {
      clearTimeout(timeout);
    }
  }
})();
