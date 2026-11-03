// Run manually with local Natural Earth GeoJSON files, never during build.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { projectLocation, atlasSize, atlasCountries } from '../src/atlas.mjs';

if (!process.argv[2]) throw new Error('Usage: node scripts/generate-atlas.mjs land.geojson [countries.geojson] [lakes.geojson]');
const collection = JSON.parse(await readFile(process.argv[2], 'utf8'));
const point = ([longitude, latitude]) => projectLocation(longitude, latitude).map((value) => value.toFixed(2)).join(',');
const line = (coordinates) => coordinates.map((coordinate, index) => `${index ? 'L' : 'M'}${point(coordinate)}`).join('');
const polygons = (geometry) => {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  throw new Error(`Unsupported geometry: ${geometry.type}`);
};
const paths = (geometry) => polygons(geometry).map((rings) => `<path vector-effect="non-scaling-stroke" d="${rings.map((ring) => `${line(ring)}Z`).join('')}"/>`).join('');
const land = collection.features.map(({ geometry }) => paths(geometry)).join('');
const grid = [];
for (let longitude = -180; longitude <= 180; longitude += 30) {
  grid.push(line(Array.from({ length: 85 }, (_, index) => [longitude, -84 + index * 2])));
}
for (let latitude = -60; latitude <= 60; latitude += 30) {
  grid.push(line(Array.from({ length: 181 }, (_, index) => [-180 + index * 2, latitude])));
}
const { width, height } = atlasSize;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none">
<title>World coastlines in the Natural Earth projection</title>
<desc>Made with Natural Earth land data, version 5.1.2. Public domain. Colours and projection adapted for Beyond Lenses.</desc>
<defs>
  <linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#94a38a"/><stop offset="1" stop-color="#5a7866"/></linearGradient>
</defs>
<g stroke="#bfceb6" stroke-opacity=".12" stroke-width=".6">${grid.map((path) => `<path d="${path}"/>`).join('')}</g>
<g fill="url(#land)" fill-rule="evenodd">${land}</g>
</svg>\n`;
const output = fileURLToPath(new URL('../public/images/world-atlas.svg', import.meta.url));
await writeFile(output, svg);
console.log(`Generated ${output} (${Math.round(Buffer.byteLength(svg) / 1024)} KiB).`);
if (process.argv[3]) {
  const countries = JSON.parse(await readFile(process.argv[3], 'utf8'));
  const symbols = Object.values(atlasCountries).map(({ id, code }) => {
    const feature = countries.features.find(({ properties }) => properties.ADM0_A3 === code);
    if (!feature) throw new Error(`Missing country geometry: ${code}`);
    return `<g id="${id}" fill-rule="evenodd">${paths(feature.geometry)}</g>`;
  }).join('');
  const countrySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><title>Country outlines, Natural Earth, public domain</title><defs>${symbols}</defs></svg>\n`;
  const countryOutput = fileURLToPath(new URL('../public/images/atlas-countries.svg', import.meta.url));
  await writeFile(countryOutput, countrySvg);
  console.log(`Generated ${countryOutput} (${Math.round(Buffer.byteLength(countrySvg) / 1024)} KiB).`);
}
if (process.argv[4]) {
  const lakes = JSON.parse(await readFile(process.argv[4], 'utf8'));
  const lakeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><title>Lakes, Natural Earth, public domain</title><g fill="#243f36" fill-rule="evenodd">${lakes.features.map(({ geometry }) => paths(geometry)).join('')}</g></svg>\n`;
  const lakeOutput = fileURLToPath(new URL('../public/images/atlas-lakes.svg', import.meta.url));
  await writeFile(lakeOutput, lakeSvg);
  console.log(`Generated ${lakeOutput} (${Math.round(Buffer.byteLength(lakeSvg) / 1024)} KiB).`);
}
