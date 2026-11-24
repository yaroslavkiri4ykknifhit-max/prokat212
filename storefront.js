(async () => {
  const backend = 'https://prokat-212-vitebsk.hulk-baseman-6e.chatgpt.site';
  const siteBase = '/prokat212/';
  const route = new URL(location.href).searchParams.get('page') || '/';
  const pageUrl = path => {
    const target = new URL(path,backend);
    if (target.pathname==='/admin' || target.pathname.startsWith('/admin/')) return target.href;
    return siteBase+'?page='+encodeURIComponent(target.pathname+target.search)+target.hash;
  };

  try {
    const response = await fetch(backend+'/api/storefront?page='+encodeURIComponent(route),{credentials:'omit'});
    const data = await response.json();
    if (!data.html) throw new Error('Каталог временно недоступен.');
    const parsed = new DOMParser().parseFromString(data.html,'text/html');
    parsed.querySelectorAll('script,base').forEach(element=>element.remove());
    for (const element of parsed.querySelectorAll('[src]')) {
      const value = element.getAttribute('src');
      if (value.startsWith('/')) element.setAttribute('src',new URL(value,backend).href);
    }
    for (const link of parsed.querySelectorAll('a[href]')) {
      const value = link.getAttribute('href');
      if (value.startsWith('/')) link.setAttribute('href',pageUrl(value));
    }
    for (const link of parsed.querySelectorAll('link[rel=stylesheet]')) {
      const value = link.getAttribute('href');
      link.href = new URL(value,backend).href;
      document.head.append(link);
    }
    document.title = parsed.title;
    document.documentElement.dataset.apiBase = backend;
    document.documentElement.dataset.siteBase = siteBase;
    document.body.replaceWith(document.importNode(parsed.body,true));

    const search = document.querySelector('.header-search');
    search?.addEventListener('submit',event=>{
      event.preventDefault();
      const query = new FormData(search).get('q') || '';
      location.href = pageUrl('/catalog?'+new URLSearchParams({q:query}));
    });

    const script = document.createElement('script');
    script.src = siteBase+'shop.js';
    script.addEventListener('error',()=>showError('Не удалось загрузить управление каталогом. Обновите страницу.'));
    document.body.append(script);
    if (location.hash) {
      requestAnimationFrame(()=>document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
    }
  } catch (error) {
    console.error("Storefront load failed", error);
    showError('Не удалось загрузить каталог. Попробуйте ещё раз или позвоните нам.');
  }

  function showError(message) {
    const main = document.createElement('main');
    main.className = 'loading';
    const title = document.createElement('h1');
    title.textContent = 'Прокат 212';
    const note = document.createElement('p');
    note.textContent = message;
    const phone = document.createElement('a');
    phone.href = 'tel:+375292630630';
    phone.textContent = '+375 29 263-06-30';
    const retry = document.createElement('button');
    retry.textContent = 'Попробовать снова';
    retry.addEventListener('click',()=>location.reload());
    main.append(title,note,phone,document.createElement('br'),document.createElement('br'),retry);
    document.body.replaceChildren(main);
  }
})();
