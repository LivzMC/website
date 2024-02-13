const COLOUR_MAP = {
  "g": "p",
  "8": "h",
  "9": "i",
  "1": "a",
  "c": "l",
  "f": "o",
  "2": "b",
  "4": "d",
  "b": "k",
  "3": "c",
  "d": "m",
  "7": "g",
  "5": "e",
  "a": "j",
  "e": "n",
  "6": "f"
}

const LAYER_MAP = {
  "o": "f",
  "v": "E",
  "s": "s",
  "u": "y",
  "t": "w",
  "p": "l",
  "r": "n",
  "q": "m",
  "7": "j",
  "n": "z",
  "i": "B",
  "a": "J",
  "9": "r",
  "A": "I",
  "B": "x",
  "e": "H",
  "E": "M",
  "d": "q",
  "D": "L",
  "j": "b",
  "k": "d",
  "l": "C",
  "m": "D",
  "y": "g",
  "z": "F",
  "w": "h",
  "x": "G",
  "5": "t",
  "g": "v",
  "3": "c",
  "8": "i",
  "4": "e",
  "6": "k",
  "h": "A",
  "b": "o",
  "f": "u",
  "c": "p",
  "C": "K"
}

function import_pmc(e) {
  const error =  document.getElementById('pmc_import_error');
  error.classList.add('hidden');
  if (!e.target.value.startsWith('https://www.planetminecraft.com/banner') || !e.target.value.includes('=')) {
    error.classList.remove('hidden');
    error.innerText = 'You must remix the banner and use the shareable link.';
    return;
  }

  const ID = e.target.value.split('=')[1]?.replace(/\W/g,'')?.slice(1);
  if (!ID) {
    error.classList.remove('hidden');
    error.innerText = "Missing ID";
    return;
  }

  const base_color = ID[0];
  const letters = [...ID.match(/.{1,2}/g)];
  let final_id = `${COLOUR_MAP[base_color] ? COLOUR_MAP[base_color] : 'p'}a`;

  for (let i = 0; i < letters.length; i++) {
    const l = letters[i];
    const colour = l[0];
    const pattern = l[1];
    if (COLOUR_MAP[colour] && LAYER_MAP[pattern]) final_id = final_id + COLOUR_MAP[colour] + LAYER_MAP[pattern];

    if (i + 1 == letters.length) {
      window.location.href = `/banner?=${final_id}&pmc=${base_color}${letters.join('')}`;
    }
  }
}