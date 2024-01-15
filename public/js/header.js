const themeElement = document.getElementById('theme');
const navbarElement = document.getElementById('Navbar-toggle');
const otherToggleElement = document.getElementById('other-toggle');
const langToggleElement = document.getElementById('lang-toggle');
const userMenuToggleElement = document.getElementById('usermenu-toggle');
const userMenuCollapseElement = document.getElementById('usermenu-collapse');
const userMenuToggleNameElement = document.getElementById('usermenu-toggle_name');

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  const expires = 'expires=' + d.toUTCString();
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}

function getCookie(cname) {
  const name = cname + '=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];

    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }

    if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
  }

  return null;
}

if (themeElement) {
  themeElement.addEventListener('click', function () {
    const classList = document.querySelector('html').classList;
    setCookie('theme', classList.contains('dark') ? 'light' : 'dark', '31');

    window.location.reload();
  });
}

if (navbarElement) {
  navbarElement.addEventListener('click', function () {
    const classList = document.getElementById('Navbar-collapse').classList;
    classList.contains('hidden') ? classList.remove('hidden') : classList.add('hidden');
  });
}

if (otherToggleElement) {
  otherToggleElement.addEventListener('click', function () {
    const classList = document.getElementById('other-collapse').classList;
    classList.contains('hidden') ? classList.remove('hidden') : classList.add('hidden');
  });
}

if (langToggleElement) {
  langToggleElement.addEventListener('click', function () {
    const classList = document.getElementById('lang-collapse').classList;
    classList.contains('hidden') ? classList.remove('hidden') : classList.add('hidden');
  });
}

if (userMenuToggleElement && userMenuCollapseElement) {
  userMenuToggleElement.addEventListener('click', function () {
    const classList = userMenuCollapseElement.classList;
    classList.contains('hidden') ? classList.remove('hidden') : classList.add('hidden');
  });

  if (userMenuToggleNameElement) {
    userMenuToggleNameElement.addEventListener('click', function () {
      const classList = userMenuCollapseElement.classList;
      classList.contains('hidden') ? classList.remove('hidden') : classList.add('hidden');
    });

    document.addEventListener('mousedown', function (e) {
      if (!userMenuCollapseElement.contains(e.target)) {
        userMenuCollapseElement.classList.add('hidden');
      }
    });
  }

}
