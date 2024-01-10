const MONTHS_FORMAT = { 0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'April', 4: 'May', 5: 'June', 6: 'July', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec' };

function getLocalTime() {
  document.querySelectorAll('[data-time-title]').forEach(e => e.setAttribute('title', e.getAttribute('data-time-title').split(' ').filter(a => a != undefined).map(time => new Date(parseInt(time))).map(time => `${time.toLocaleDateString()} • ${time.toLocaleTimeString()}`).join('\n') + (e.getAttribute('title') ? e.getAttribute('title') : '')));

  document.querySelectorAll('time').forEach(function (e) {
    const time = new Date(e.getAttribute('data-int') == 'true' ? parseInt(e.getAttribute('data-time')) : e.getAttribute('data-time'));
    if (!time.getDate()) time = new Date('2021-06-24T17:44:26.641Z');
    const format = e.getAttribute('data-format');
    if (!e.getAttribute('data-format')) {
      switch (e.getAttribute('data-type')) {
        case 'date':
          e.textContent = time.toLocaleDateString();
          break;
        case 'time':
          e.textContent = time.toLocaleTimeString();
          break;
        default:
          e.textContent = `${time.toLocaleDateString()} • ${time.toLocaleTimeString()}`;
      }
    } else {
      if (!format) format = 'mdy';
      e.textContent = `${format.includes('m') ? ' ' + MONTHS_FORMAT[time.getMonth()] : ''}${format.includes('d') ? ` ${time.getDate() + 1},` : ''}${format.includes('y') ? ' ' + time.getFullYear() : ''}`;
    }
  });
}

getLocalTime();
