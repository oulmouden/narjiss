import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const menuPath = path.join(root, 'shared', 'menu.js');
const outPath = path.resolve(here, '..', 'data', 'projects.json');
const code = fs.readFileSync(menuPath, 'utf8');

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const projects = sandbox.PROJECTS.map((project) => {
  const base = project.images?.triptych || `images/projects/${project.folder}/concept-hero.png`;
  const dir = base.split('/').slice(0, -1).join('/');
  return {
    ...project,
    wp: {
      source_site: '/narjiss/',
      logo: project.images?.logo || `${dir}/${project.folder}_logo.png`,
      hero: base,
      floorplan: `${dir}/floorplan.png`,
      mass_plan_pdf: `${dir}/PLAN DE MASSE.pdf`,
      static_detail_url: project.detail_url || `project.html?id=${project.id}`
    }
  };
});

fs.writeFileSync(outPath, JSON.stringify(projects, null, 2) + '\n', 'utf8');
console.log(`Exported ${projects.length} projects to ${outPath}`);
