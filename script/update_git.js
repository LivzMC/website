require('dotenv').config();
const fsp = require('fs/promises');
const { execSync } = require('child_process');

const repoPath = process.env.GITHUB || 'livzmc/website';

(async function () {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const SHA = execSync('git rev-parse HEAD').toString().trim();
    const footer = await (await fsp.readFile('src/front-end/partials/footer.ejs')).toString();
    const prev = footer.split('\n').filter(a => a.includes('id="github_hash"'))[0];
    const new_footer = footer.replace(prev, `${branch}@<a id="github_hash" class="text-indigo-600 dark:text-indigo-500 hover:underline" href="https://github.com/${repoPath}/commits/${SHA}" target="__">${SHA.substring(0, 7)}</a>`);
    await fsp.writeFile('src/front-end/partials/footer.ejs', new_footer);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();