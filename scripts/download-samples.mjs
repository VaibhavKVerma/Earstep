import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE =
  'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM';

const INSTRUMENTS = {
  acoustic: 'acoustic_guitar_steel-mp3',
  electric: 'electric_guitar_clean-mp3',
  piano: 'acoustic_grand_piano-mp3',
};

const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MIDIS = [36, 39, 40, 42, 45, 48, 50, 51, 54, 55, 57, 59, 60, 63, 64, 66, 69, 72, 75, 78, 81, 84];

function fileName(midi) {
  return `${FLATS[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}.mp3`;
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const jobs = [];
for (const [folder, pack] of Object.entries(INSTRUMENTS)) {
  for (const midi of MIDIS) {
    const name = fileName(midi);
    const dest = join(ROOT, 'public', 'samples', folder, name);
    jobs.push({ dest, url: `${BASE}/${pack}/${name}` });
  }
}

await Promise.all(
  jobs.map(async ({ dest, url }) => {
    await mkdir(dirname(dest), { recursive: true });
    const data = await download(url);
    await writeFile(dest, data);
    console.log(`saved ${dest.replace(`${ROOT}/`, '')} (${data.length} bytes)`);
  }),
);

console.log(`downloaded ${jobs.length} samples`);
