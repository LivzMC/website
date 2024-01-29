document.querySelectorAll('.heads').forEach(function (e) {
  e.addEventListener('mousemove', (e) => updateSkin(e), { passive: true });
  e.addEventListener('pointermove', (e) => updateSkin(e), { passive: true });
  e.addEventListener('touchmove', (e) => updateSkin(e), { passive: true });
});

document.querySelectorAll('.capes').forEach(function (e) {
  e.addEventListener('mousemove', (e) => updateCapes(e), { passive: true });
  e.addEventListener('pointermove', (e) => updateCapes(e), { passive: true });
  e.addEventListener('touchmove', (e) => updateCapes(e), { passive: true });
});

document.querySelectorAll('.ears').forEach(function (e) {
  e.addEventListener('mousemove', (e) => updateEars(e));
  e.addEventListener('pointermove', (e) => updateEars(e));
  e.addEventListener('touchmove', (e) => updateEars(e));
});

function updateSkin(e) {
  const number = e.target.getAttribute('skin');
  const model = e.target.getAttribute('model') === 'slim' ? 'slim' : 'default';
  if (document.getElementById('skin').getAttribute('skin') === number && document.getElementById('skin').getAttribute('model') === model) return;
  document.getElementById('skin').setAttribute('skin', number);
  document.getElementById('skin').setAttribute('model', model);
  skinViewer.loadSkin(`https://textures.livzmc.net/skin/${number}.png`, model);
}

function updateCapes(e) {
  const number = e.target.getAttribute('cape');
  const uuid = e.target.getAttribute('uuid');
  const gif = e.target.getAttribute('data-gif') ? e.target.getAttribute('data-gif') === 'true' : false;
  if (document.getElementById('skin').getAttribute('cape') === number) return;
  document.getElementById('skin').setAttribute('cape', number);
  document.getElementById('skinElytraButton').setAttribute('data-cape', number);
  document.getElementById('skinElytraButton').classList.remove('hidden');
  if (gif) {
    document.getElementById('skinElytraButton').setAttribute('data-gif', 'true');
  } else {
    document.getElementById('skinElytraButton').setAttribute('data-gif', 'false');
  }
  if (number.startsWith('LB/')) {
    document.getElementById('skinElytraButton').classList.add('hidden');
    RemapLBCape(`https://textures.livzmc.net/cape/${number}.png?uuid=${uuid}`).then((image) => {
      skinViewer.loadCape(image);
    });
  } else {
    document.getElementById('skinElytraButton').classList.remove('hidden');
    if (number.startsWith('OF/')) {
      skinViewer.loadCape(`https://textures.livzmc.net/optifine_capes/${number.split('OF/')[1]}/${uuid}.png`);
    } else {
      skinViewer.loadCape(`https://textures.livzmc.net/cape/${number}.${gif ? 'gif' : 'png'}?uuid=${uuid}`);
    }
  }
}

function updateEars(e) {
  const number = e.target.getAttribute('ears');
  if (document.getElementById('skin').getAttribute('ears') === number) return;
  document.getElementById('skin').setAttribute('ears', number);
  skinViewer.loadEar(`https://textures.livzmc.net/cape/${number}.png`);
}

const loadImage = design => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = design;
    img.onload = () => resolve(img);
    img.onerror = e => reject(e);
  });
};

async function RemapLBCape(design) {
  try {
    const img = await loadImage(design);
    const canvas = document.createElement('canvas');
    canvas.hidden = true;
    canvas.width = 352;
    canvas.height = 272;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL();
  } catch (e) {
    console.error(e);
    return null;
  }
}
