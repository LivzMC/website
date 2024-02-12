const defaultColourTop = '404040';
const defaultColourBottom = '202020';
const IMAGE = '/banner/allBanners.png';

const colours = [
  '#191919', '#4c4c4c',
  '#999999', '#ffffff',
  '#f27fa5', '#b24cd8',
  '#7f3fb2', '#334cb2',
  '#4c7f99', '#6699d8',
  '#667f33', '#7fcc19',
  '#e5e533', '#d87f33',
  '#664c33', '#993333'
];

const COLOUR_ARRAY = [
  { id: 'a', colour: 'BLACK', coord: [0, 0] },               /* BLACK */
  { id: 'i', colour: 'DARK_GRAY', coord: [400, 0] },         /* DARK_GRAY */
  { id: 'h', colour: 'LIGHT_GRAY', coord: [500, 0] },        /* LIGHT_GRAY */
  { id: 'p', colour: 'WHITE', coord: [600, 320] },           /* WHITE */
  { id: 'j', colour: 'PINK', coord: [300, 320] },            /* PINK */
  { id: 'n', colour: 'LIGHT_PURPLE', coord: [100, 320] },    /* LIGHT_PURPLE */
  { id: 'f', colour: 'PURPLE', coord: [400, 320] },          /* PURPLE */
  { id: 'e', colour: 'BLUE', coord: [100, 0] },              /* BLUE */
  { id: 'g', colour: 'CYAN', coord: [300, 0] },              /* CYAN */
  { id: 'm', colour: 'LIGHT_BLUE', coord: [700, 0] },        /* LIGHT_BLUE */
  { id: 'c', colour: 'GREEN', coord: [600, 0] },             /* GREEN */
  { id: 'k', colour: 'LIGHT_GREEN', coord: [0, 320] },       /* LIGHT_GREEN */
  { id: 'l', colour: 'YELLOW', coord: [700, 320] },          /* YELLOW */
  { id: 'o', colour: 'ORANGE', coord: [200, 320] },          /* ORANGE */
  { id: 'd', colour: 'BROWN', coord: [200, 0] },             /* BROWN */
  { id: 'b', colour: 'RED', coord: [500, 320] },             /* RED */
  { id: ';', colour: 'TRANSPARENT', coord: [1000, 1000] }    /* TRANSPARENT */
];

const LAYERS = [
  { id: 'p', coord: [0, 120] },
  { id: 'k', coord: [0, 80] },
  { id: 'e', coord: [80, 0] },
  { id: 'q', coord: [20, 120] },
  { id: 'L', coord: [20, 280] },
  { id: 'H', coord: [60, 240] },
  { id: 'M', coord: [0, 280] },
  { id: 'E', coord: [0, 240] },
  { id: 'f', coord: [0, 40] },
  { id: 's', coord: [60, 120] },
  { id: 'y', coord: [80, 160] },
  { id: 'r', coord: [40, 120] },
  { id: 'J', coord: [60, 160] },
  { id: 'I', coord: [40, 280] },
  { id: 'x', coord: [60, 280] },
  { id: 'j', coord: [80, 40] },
  { id: 'm', coord: [40, 80] },
  { id: 'n', coord: [60, 80] },
  { id: 'z', coord: [0, 200] },
  { id: 'l', coord: [20, 80] },
  { id: 'w', coord: [40, 160] },
  { id: 'C', coord: [60, 200] },
  { id: 'b', coord: [20, 0] },
  { id: 'D', coord: [80, 200] },
  { id: 'd', coord: [60, 0] },
  { id: 'F', coord: [20, 240] },
  { id: 'g', coord: [20, 40] },
  { id: 'v', coord: [20, 160] },
  { id: 't', coord: [80, 120] },
  { id: 'h', coord: [40, 40] },
  { id: 'G', coord: [40, 240] },
  { id: 'c', coord: [40, 0] },
  { id: 'i', coord: [60, 40] },
  { id: 'o', coord: [80, 80] },
  { id: 'K', coord: [80, 240] },
  { id: 'A', coord: [20, 200] },
  { id: 'B', coord: [40, 200] },
  { id: 'u', coord: [0, 160] },
];

let colTop = defaultColourTop;
let colBottom = defaultColourBottom;
let selectedLayer = null;

if (typeof jscolor !== 'undefined') {
  jscolor.presets.myPreset = {
    format: 'hex',
    palette: colours.join(' '),
  };
}

init();

async function generateHTML(e, htmlID) {
  const clrPtn = e.target.getAttribute('clr') + e.target.getAttribute('ptn');
  const layer = await drawBannerImage(`;a${clrPtn}`);
  return `${document.getElementById('layers-list').innerHTML}<div draggable="true" id="${htmlID}-container" data-id="${clrPtn}" class="border border-gray-100 dark:border-gray-900 px-4 text-center" style="opacity: 1;"><p draggable="false" class="text-gray-500 dark:text-gray-200">${getLayerColor(e.target.getAttribute('clr'))}</p><div class="grid grid-cols-3"><div class="flex items-center justify-center"><div data-changeColor="changeColorText" class="modal-open" onclick="changeColorInit(this)" class="hover:underline">Change Colour</div></div><div class="flex items-center justify-center"><div id="${htmlID}" draggable="false" class="w-min mt-1 text-gray-900 sm:mt-0 sm:col-span-2 dark:text-gray-300 py-1"><div class="tbc" draggable="false" style="pointer-events: none;"><img draggable="false" class="bg-gray-400 dark:bg-gray-600" style="height: 80px;" data-id_2="format=;a${clrPtn}" src="${layer}" /></div></div></div><div class="flex items-center justify-center"><span class="hover:underline cursor-pointer text-2xl text-red-500" onclick="deleteLayer(this)">x</span></div></div></div>`;
}

function init(mainColour) {
  initDrag();
  const layer = getURL('format');
  const toomany = (layer.length - 2) >> 1 > 8;
  if (toomany) document.getElementById('errors').innerHTML = "${TOO_MANY_LAYER_ERROR}";

  document.querySelectorAll('canvas.tb-color').forEach(function (canvas) {
    const image = new Image();
    const clr = getColor(canvas.getAttribute('clr'));

    image.onload = function () {
      getLayer(canvas, image, clr.coord[0], clr.coord[1], 40, 80);
    };

    image.onerror = function (e) {
      console.error(e);
    };

    image.src = IMAGE;
  });

  document.querySelectorAll('canvas.tb-ptn').forEach(function (canvas) {
    const id = canvas.getAttribute('ptn');
    const col = mainColour && COLOUR_ARRAY.filter(a => a.id === mainColour)[0] ? COLOUR_ARRAY.filter(a => a.id === mainColour)[0].coord : [0, 0];

    function arrayFind(a) {
      const layer = LAYERS.map((e) => {
        if (e.id === a) return e.coord;
        if (col) {
          if (e.id === a) return [col[0] + e.coord[0], col[1] + e.coord[1]];
        } else {
          if (e.id === a) return e.coord;
        }
      }).filter((a) => { return a !== undefined; })[0];

      return layer ? layer : null;
    }

    const coords = arrayFind(id);
    const image = new Image();

    image.onload = function () {
      getLayer(canvas, image, col[0] + coords[0], col[1] + coords[1], 40, 60, true);
    };

    image.onerror = function (e) {
      console.error(e);
    };

    image.src = IMAGE;
  });

  document.querySelectorAll('[data-id_2]').forEach(async (img) => {
    img.setAttribute('src', await drawBannerImage(img.getAttribute('data-id_2').split('=')[1]));
  });

  const URL = `${layer}${getURL('valign') ? `&valign=${getURL('valign')}` : ''}${getURL('colTop') ? `&colTop=${getURL('colTop')}` : ''}${getURL('colBottom') ? `&colBottom=${getURL('colBottom')}` : ''}`;
  const ifElytra = document.getElementById('skinElytraButton').getAttribute('data-elytra');
  drawImage(URL, ifElytra);
}

function getURL(s) {
  const searchParams = new URLSearchParams(window.location.search);
  if (s === "format") return searchParams.get('') || 'pa';

  return searchParams.get(s);
}

function getColor(id) {
  return COLOUR_ARRAY[COLOUR_ARRAY.findIndex((a) => { if (a.id === id) return a; })];
}

function getLayer(op, src, x, y, width, height, clear = false) {
  if (!op) return;
  const context = op.getContext("2d");

  context.patternQuality = "fast";
  context.mozImageSmoothingEnabled = false;
  context.webkitImageSmoothingEnabled = false;
  context.msImageSmoothingEnabled = false;
  context.imageSmoothingEnabled = false;

  if (clear) context.clearRect(0, 0, width * 2, height * 2);
  context.drawImage(src, x, y, width, height, 0, 0, width * 2, height * 2);
  return op;
}

function getLayerColor(col) {
  const colour = COLOUR_ARRAY[COLOUR_ARRAY.findIndex((a) => { if (a.id === col) return a; })]?.colour;
  return colour ? colour[0] + colour.slice(1).toLowerCase() : 'unknown';
}

function mouseHover(e) {
  if (!skinViewer) return;
  if (e.target.nodeName === "CANVAS") {
    const b = getURL('format');
    const URL = `${b + e.target.getAttribute('clr') + e.target.getAttribute('ptn')}${getURL('valign') ? `&valign=${getURL('valign')}` : ""}${getURL('colTop') ? `&colTop=${getURL('colTop')}` : ''}${getURL('colBottom') ? `&colBottom=${getURL('colBottom')}` : ''}`;
    const ifElytra = document.getElementById('skinElytraButton').getAttribute('data-elytra');
    drawImage(URL, ifElytra);
  }
}

function mouseHoverLeave(e) {
  if (!skinViewer) return;
  if (e.target.nodeName === "CANVAS") {
    const b = getURL('format');
    const URL = `${b}${getURL('valign') ? `&valign=${getURL('valign')}` : ""}${getURL('colTop') ? `&colTop=${getURL('colTop')}` : ''}${getURL('colBottom') ? `&colBottom=${getURL('colBottom')}` : ''}`;
    const ifElytra = document.getElementById('skinElytraButton').getAttribute('data-elytra');
    drawImage(URL, ifElytra);
  }
}

function mouseDown(e) {
  if (e.target.nodeName === "CANVAS") {
    const b = getURL('format');
    const URL = `${b + e.target.getAttribute('clr') + e.target.getAttribute('ptn')}${getURL('valign') ? `&valign=${getURL('valign')}` : ''}${getURL('colTop') ? `&colTop=${getURL('colTop')}` : ''}${getURL('colBottom') ? `&colBottom=${getURL('colBottom')}` : ''}`;
    const ifElytra = document.getElementById('skinElytraButton').getAttribute('data-elytra');
    window.history.pushState('', '', `?=${URL}`);
    drawImage(URL, ifElytra);
    document.getElementById('validURL_text').innerText = `https://livzmc.net/banner/?=${b + e.target.getAttribute('clr') + e.target.getAttribute('ptn')}`;
    let toomany = false;
    if (((b + e.target.getAttribute('clr') + e.target.getAttribute('ptn')).length - 2) >> 1 > 8) {
      document.getElementById('errors').innerHTML = "${TOO_MANY_LAYER_ERROR}";
      toomany = true;
    }

    if ((b + e.target.getAttribute('clr') + e.target.getAttribute('ptn')).includes('u')) {
      if (toomany) {
        document.getElementById('errors').innerHTML = "${TOO_MANY_LAYER_ERROR}" + "<br>" + "${MOJANG_PATTERN_ERROR}";
      } else {
        document.getElementById('errors').innerHTML = "${MOJANG_PATTERN_ERROR}";
      }
    }

    const htmlID = `${e.target.getAttribute('clr') + e.target.getAttribute('ptn')}-${(((b + e.target.getAttribute('clr') + e.target.getAttribute('ptn')).length) >> 1) - 1}`;

    generateHTML(e, htmlID).then((html) => {
      document.getElementById('layers-list').innerHTML = html;
      const openmodal = document.querySelectorAll('.modal-open');

      for (let i = 0; i < openmodal.length; i++) {
        openmodal[i].addEventListener('click', function (event) {
          event.preventDefault();
          toggleModal();
        });
      }

      initDrag();
    });
  }
}

async function drawImage(url, ifElytra) {
  let valign = 's';
  let colTop = '404040';
  let colBottom = '202020';
  const searchParams = new URLSearchParams(`?=${url}`);
  if (searchParams.has('valign')) valign = searchParams.get('valign');
  if (searchParams.has('colTop')) colTop = searchParams.get('colTop');
  if (searchParams.has('colBottom')) colBottom = searchParams.get('colBottom');

  const banner = new Image();
  banner.src = await drawBannerImage(url);
  banner.onload = function () {
    const cape = document.createElement('canvas');
    cape.width = 92;
    cape.height = 44;
    const context = cape.getContext('2d');

    context.patternQuality = "fast";
    context.mozImageSmoothingEnabled = false;
    context.webkitImageSmoothingEnabled = false;
    context.msImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;

    switch (valign) {
      case 'm':
        context.drawImage(banner, 2, -3, 20, 42);
        context.clearRect(2, 34, 20, 5);
        break;
      case 't':
        context.drawImage(banner, 2, 1, 20, 42);
        context.clearRect(2, 34, 20, 10);
        break;
      case 'b':
        context.drawImage(banner, 2, -7, 20, 42);
        context.clearRect(2, 34, 20, 10);
        break;
      default:
        context.drawImage(banner, 2, 2, 20, 32);
        break;
    }

    // Create gradient
    let grd = context.createLinearGradient(0, 0, 0, 32);
    grd.addColorStop(0, `#${colTop}`);
    grd.addColorStop(1, `#${colBottom}`);
    context.fillStyle = grd;
    context.fillRect(22, 2, 22, 32);
    // sides
    context.fillRect(0, 2, 2, 32); // left
    context.fillRect(2, 0, 20, 2); // top
    // Create 2nd gradient
    grd = context.createLinearGradient(0, 0, 0, 32);
    grd.addColorStop(0, `#${colTop}`);
    grd.addColorStop(0, `#${colBottom}`);
    context.fillStyle = grd;
    context.fillRect(22, 0, 20, 2);
    // gradient botton
    grd = context.createLinearGradient(0, 0, 0, 44);
    grd.addColorStop(0, `#${colTop}`);
    grd.addColorStop(1, `#${colBottom}`);
    context.fillStyle = grd;
    context.fillRect(44, 22, 2, 22);
    // Eltra
    context.drawImage(banner, 72, 4, 20, 40);
    context.clearRect(70, 22, 2, 22);
    context.clearRect(72, 32, 2, 12);
    context.clearRect(74, 38, 2, 6);
    context.clearRect(76, 42, 2, 2);

    context.clearRect(84, 4, 12, 2);
    context.clearRect(86, 6, 12, 2);
    context.clearRect(88, 8, 12, 6);
    context.clearRect(90, 14, 12, 8);
    // 
    grd = context.createLinearGradient(0, 0, 0, 44);
    grd.addColorStop(0, `#${colTop}`);
    grd.addColorStop(1, `#${colBottom}`);
    context.fillStyle = grd;
    context.fillRect(44, 22, 2, 22);

    grd = context.createLinearGradient(0, 0, 0, 44);
    grd.addColorStop(0, `#${colTop}`);
    grd.addColorStop(1, `#${colBottom}`);
    context.fillStyle = grd;
    context.fillRect(62, 0, 6, 2);
    context.fillRect(64, 2, 4, 2);
    context.fillRect(68, 4, 4, 4);
    context.fillRect(70, 8, 2, 14);
    grd = context.createLinearGradient(0, 0, 44, 0);
    grd.addColorStop(0, `#${colTop}`);
    grd.addColorStop(1, `#${colBottom}`);
    context.fillStyle = grd;
    context.fillRect(68, 0, 12, 2);

    const img = cape.toDataURL('image/png');

    if (ifElytra === "true") ifElytra = true;
    if (ifElytra === "false") ifElytra = false;
    if (window.location.hostname === "localhost") {
      console.debug(img);
    }

    skinViewer.loadCape(img, {
      backEquipment: ifElytra === true ? 'elytra' : 'cape',
    });

    const doc = document.getElementById('skinElytraButton');
    ifElytra === true ? doc.setAttribute('data-elytra', 'true') : doc.setAttribute('data-elytra', 'false');
  };

  banner.onerror = function (e) {
    console.error(e);
  };
}

async function drawBannerImage(url) {
  let form = 'pa';
  const searchParams = new URLSearchParams(`?=${url}`);
  if (searchParams.has('')) form = searchParams.get('');

  const letters = [...form.match(/.{1,2}/g)];
  const layerColourArray = [];
  const layerArray = [];

  for (let i = 0; i < letters.length; i++) {
    layerColourArray.push(letters[i][0]);
    layerArray.push(letters[i][1]);
  }

  function arrayFind(a) {
    return LAYERS.filter((e) => { if (e.id === a) return e.coord; })[0] ? LAYERS.filter((e) => { if (e.id === a) return e.coord; })[0] : null;
  }

  const colour = [];
  for (let i = 0; i < layerColourArray.length; i++) {
    COLOUR_ARRAY.filter((a) => { if (a.id === layerColourArray[i]) return colour.push(a.coord); });
  }

  function getLayer(src, x, y, width, height) {
    const op = document.createElement('canvas');
    op.width = width;
    op.height = height;
    const context = op.getContext("2d");

    context.patternQuality = "fast";
    context.mozImageSmoothingEnabled = false;
    context.webkitImageSmoothingEnabled = false;
    context.msImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;

    context.drawImage(src, x, y, width, height, 0, 0, op.width, op.height);
    return op;
  }

  const image = new Image();
  image.src = IMAGE;

  return new Promise((resolve, reject) => {
    image.onload = function () {
      try {
        const width = 20;
        const height = 40;
        const layer = document.createElement('canvas');
        layer.width = width;
        layer.height = height;
        const context = layer.getContext('2d');

        context.patternQuality = "fast";
        context.mozImageSmoothingEnabled = false;
        context.webkitImageSmoothingEnabled = false;
        context.msImageSmoothingEnabled = false;
        context.imageSmoothingEnabled = false;

        for (let i = 0; i < layerArray.length; i++) {
          if (i === 0) {
            context.drawImage(getLayer(image, colour[i][0], colour[i][1], 20, 40), 0, 0, width, height);
          } else {
            if (layerArray[i] && layerColourArray[i]) {
              const coords = arrayFind(layerArray[i][0]);
              if (coords && colour[i]) {
                context.drawImage(getLayer(image, colour[i][0] + coords.coord[0], colour[i][1] + coords.coord[1], 20, 40), 0, 0, width, height);
              }
            }
          }
        }

        resolve(layer.toDataURL('image/png'));
      } catch (e) {
        console.error(e);
      }
    };

    image.onerror = function (e) {
      console.error(e);
      reject(e);
    };
  });
}

function copyText(e) {
  const text = document.getElementById('validURL').innerText;
  const html = `<span id="validURL_text" onclick="copyText(event)">${text.split(' ')[0]}</span><span class="pl-3 text-indigo-600 dark:text-indigo-500 hover:underline" onclick="copyText(event)"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="hover:cursor-pointer bi-clipboard" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" /><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" /></svg></span>`;
  navigator.clipboard.writeText(text.split(' ')[0]);

  setTimeout(() => {
    document.getElementById('validURL').innerHTML = html;
  }, 1000);

  document.getElementById('validURL').innerHTML = `<span id="validURL_text" onclick="copyText(event)">${text.split(' ')[0]}</span><span class="pl-3 text-indigo-600 dark:text-indigo-500 hover:underline" onclick="copyText(event)"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="hover:cursor-pointer bi-clipboard-check" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z" /><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" /><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" /></svg></span>`;
}

let skinHidden = false;
function changeModel(model) {
  if (!getURL('skin')) {
    skin = DEFAULT_UUID;
  } else {
    skin = getURL('skin');
  }

  fetch(`https://api.livzmc.net/v2/${skin}`).then((r) => r.json()).then((r) => {
    skinViewer.loadSkin(`https://textures.livzmc.net/skin/${r.skin ? r.skin : 'steve'}.png`, model.target.value);
    skinViewer.playerObject.skin.visible = true;
    skinHidden = false;
    document.getElementById('hide-skin').value = 'true';
  });
}

function hideSkin() {
  if (skinHidden) {
    skinViewer.playerObject.skin.visible = true;
    skinHidden = false;
  } else {
    skinViewer.playerObject.skin.visible = false;
    skinHidden = true;
  }

  return skinHidden;
}

function changeAlign(e) {
  const b = getURL('format');
  const URL = `${b}&valign=${e.target.selectedOptions[0].getAttribute('value')}${getURL('colTop') ? `&colTop=${getURL('colTop')}` : ''}${getURL('colBottom') ? `&colBottom=${getURL('colBottom')}` : ''}`;
  const ifElytra = document.getElementById('skinElytraButton').getAttribute('data-elytra');
  window.history.pushState('', '', `?=${URL}`);
  drawImage(URL, ifElytra);
}

// drag
let dragSrcEl = null;
function handleDragStart(e) {
  this.style.opacity = '0.4';
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.outerHTML);
  e.dataTransfer.setData('id', this.id.split('-')[0]);
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  this.classList.add('over');
}

function handleDragLeave(e) {
  this.classList.remove('over');
}

function handleDrop(e) {
  if (e.stopPropagation) { e.stopPropagation(); };
  if (dragSrcEl !== this) {
    dragSrcEl.outerHTML = this.outerHTML;
    this.outerHTML = e.dataTransfer.getData('text/html');
    let b = [];
    document.querySelectorAll('[data-id]').forEach((e) => { b.push(e.getAttribute('id').split('-')[0]); });
    b = b.join('');

    const URL = `${b}${getURL('valign') ? `&valign=${getURL('valign')}` : ''}${getURL('colTop') ? `&colTop=${getURL('colTop')}` : ''}${getURL('colBottom') ? `&colBottom=${getURL('colBottom')}` : ''}`;
    const ifElytra = document.getElementById('skinElytraButton').getAttribute('data-elytra');
    drawImage(URL, ifElytra);
    document.getElementById('validURL_text').innerText = `https://livzmc.net/banner/?=${b}`;
    window.history.pushState('', '', `?=${URL}`);
  }
}

function handleDragEnd() {
  initDrag();
}

function initDrag() {
  const items = document.querySelectorAll('[draggable="true"]');

  items.forEach(function (e) {
    e.addEventListener('dragstart', handleDragStart, false);
    e.addEventListener('dragenter', handleDragEnter, false);
    e.addEventListener('dragover', handleDragOver, false);
    e.addEventListener('dragleave', handleDragLeave, false);
    e.addEventListener('drop', handleDrop, false);
    e.addEventListener('dragend', handleDragEnd, false);
    e.style.opacity = '1';
  });
}
// drag end

function deleteLayer(layer) {
  layer = layer.parentElement.parentElement.parentElement;
  layer.remove();

  const newURL = [];
  document.querySelectorAll('[data-id]').forEach(function (r) {
    newURL.push(r.getAttribute('data-id'));
  });

  const URL = `${newURL.join('')}${getURL('valign') ? `&valign=${getURL('valign')}` : ''}${getURL('colTop') ? `&colTop=${getURL('colTop')}` : ''}${getURL('colBottom') ? `&colBottom=${getURL('colBottom')}` : ''}`;
  window.history.pushState('', '', `?=${URL}`);

  const ifElytra = document.getElementById('skinElytraButton').getAttribute('data-elytra');
  drawImage(URL, ifElytra);

  document.getElementById('validURL_text').innerText = `https://livzmc.net/banner/?=${newURL.join('')}`;

  const toomany = ((newURL.join('')).length - 2) >> 1 > 8;
  if (toomany) {
    document.getElementById('errors').innerHTML = "${TOO_MANY_LAYER_ERROR}";
  } else {
    document.getElementById('errors').innerHTML = '';
  }

  if (newURL.join('').includes('u')) {
    if (toomany) {
      document.getElementById('errors').innerHTML = "${TOO_MANY_LAYER_ERROR}" + "<br>" + "${MOJANG_PATTERN_ERROR}";
    } else {
      document.getElementById('errors').innerHTML = "${MOJANG_PATTERN_ERROR}";
    }
  }
}

// change colour

function changeColorInit(layer) {
  let parentElement = null;

  if (layer && layer.innerText === "Changing Color") {
    selectedLayer = null;
    layer.innerText = "Change Colour";
  } else {
    parentElement = layer.parentElement.parentElement.parentElement;
    selectedLayer = parentElement ? parentElement : null;
    if (layer) layer.innerText = "Changing Color";
  }
}

function colorTopUpdate(e) {
  colTop = e.target.getAttribute('data-current-color').replace('#', '');
  const b = getURL('format');
  const URL = `${b}${getURL('valign') ? `&valign=${getURL('valign')}` : ''}&colTop=${colTop}${getURL('colBottom') ? `&colBottom=${getURL('colBottom')}` : ''}`;
  const ifElytra = document.getElementById('skinElytraButton').getAttribute('data-elytra');
  drawImage(URL, ifElytra);
  window.history.pushState('', '', `?=${URL}`);
}

function colorBottomUpdate(e) {
  colBottom = e.target.getAttribute('data-current-color').replace('#', '');
  const b = getURL('format');
  const URL = `${b}${getURL('valign') ? `&valign=${getURL('valign')}` : ''}${getURL('colTop') ? `&colTop=${getURL('colTop')}` : ''}&colBottom=${colBottom}`;
  const ifElytra = document.getElementById('skinElytraButton').getAttribute('data-elytra');
  drawImage(URL, ifElytra);
  window.history.pushState('', '', `?=${URL}`);
}

function showElytraCustom() {
  const ifPause = document.getElementById('skinElytraButton').getAttribute('data-elytra');
  const b = getURL('format');
  const URL = `${b}${getURL('valign') ? `&valign=${getURL('valign')}` : ''}${getURL('colTop') ? `&colTop=${getURL('colTop')}` : ''}${getURL('colBottom') ? `&colBottom=${getURL('colBottom')}` : ''}`;
  drawImage(URL, ifPause === "false");
}

async function mouseDownColor(e) {
  if (e.target.nodeName === "CANVAS") {
    if (selectedLayer) {
      const query = [...selectedLayer.querySelector('.tbc').childNodes].filter(a => a && a.data === undefined);
      const id_2 = query[0].getAttribute('data-id_2');
      if (!id_2) return;

      if (query && query[0] && id_2.includes(';')) {
        const id = `${e.target.getAttribute('clr')}${id_2.split('format=')[1][3]}`;
        selectedLayer.setAttribute('id', `${id}-${selectedLayer.getAttribute('id').split('-')[1]}-container`);
        selectedLayer.setAttribute('data-id', id);
        selectedLayer.querySelector('div').setAttribute('id', `${id}-${selectedLayer.getAttribute('id').split('-')[1]}`);
        const image = await drawBannerImage(`;a${id}`);
        query[0].setAttribute('src', image);
        query[0].setAttribute('data-id_2', 'format=;a' + id);
      } else {
        const id = `${e.target.getAttribute('clr')}a`;
        selectedLayer.setAttribute('id', `${e.target.getAttribute('clr')}a-${selectedLayer.getAttribute('id').split('-')[1]}-container`);
        selectedLayer.setAttribute('data-id', id);
        selectedLayer.querySelector('div').setAttribute('id', `${e.target.getAttribute('clr')}a-${selectedLayer.getAttribute('id').split('-')[1]}`);
        const image = await drawBannerImage(id);
        query[0].setAttribute('src', image);
        query[0].setAttribute('data-id_2', 'format=' + id);
      }

      selectedLayer.querySelector('p').innerText = `${id_2.includes(';') ? '' : 'Base Layer | '}${getLayerColor(e.target.getAttribute('clr'))}`;
      selectedLayer.querySelector('[data-changeColor="changeColorText"]').innerText = "Change Colour";
      selectedLayer = null;

      const b = [];
      document.querySelectorAll('[data-id]').forEach((e) => {
        b.push(e.getAttribute('id').split('-')[0]);
      });
      b = b.join('');

      const URL = `${b}${getURL('valign') ? `&valign=${getURL('valign')}` : ''}${getURL('colTop') ? `&colTop=${getURL('colTop')}` : ''}${getURL('colBottom') ? `&colBottom=${getURL('colBottom')}` : ''}`;
      const ifElytra = document.getElementById('skinElytraButton').getAttribute('data-elytra');
      window.history.pushState('', '', `?=${URL}`);
      await drawImage(URL, ifElytra);
      document.getElementById('validURL_text').innerText = `https://livzmc.net/banner/?=${b}`;
    } else {
      document.querySelectorAll('canvas.tb-ptn').forEach((canvas) => {
        canvas.setAttribute('clr', e.target.getAttribute('clr'));
      });

      document.querySelectorAll('canvas.tb-color').forEach((canvas) => {
        canvas.classList.remove('active');
      });

      document.querySelector(`canvas.tb-color[clr=${e.target.getAttribute('clr')}]`).classList.add('active');
      init(e.target.getAttribute('clr'));
    }
  }
}

// change colour end

function searchCapeDesign(e) {
  e.preventDefault();

  fetch("/banner/search_optifine", {
    "headers": {
      "content-type": "application/x-www-form-urlencoded",
      "Referer": "https://livzmc.net/banner/search_optifine",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "require-csrf": "false"
    },
    "body": `username=${e.target.value}&show=+Show+`,
    "method": "POST",
  }).then((r) => {
    if ((r.status / 100).toFixed() !== 2) return null;
    return r.text();
  }).then((r) => {
    if (r) window.location.assign(`/banner/?=${r}&skin=${e.target.value}`);
  });
}
