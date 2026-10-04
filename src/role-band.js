import { composeRelations } from './relations.js';
import { composeRelationsV7 } from './relations-v7.js';
import { integrateRoleBand } from './interactions.js';

// Larger art retains its structural derivation. Its input band uses the same
// protected role composer as a compact prompt, with space for the network port.
export function withRoleBand(composition, config) {
  if (config.evolved) {
    const band = composeRelationsV7({ ...config, engine: 'surface', height: 1,
      label: config.engine === 'network' ? '' : config.label });
    return integrateRoleBand(composition, band, config);
  }
  const { scene } = composition;
  const row = scene.rows - 1;
  const offset = config.engine === 'network' ? 4 : 0;
  const band = composeRelations({ ...config, engine: 'surface', height: 1,
    label: config.engine === 'network' ? '' : config.label });
  scene.runs = scene.runs.filter((run) => run.kind === 'wire' || run.row !== row)
    .filter((run) => config.label || run.kind || !run.text.includes('username'));
  scene.runs.push(...band.scene.runs.map((run) => ({ ...run, row,
    x: { ...run.x, offset: run.x.offset + offset } })));
  return { ...composition, cursor: band.cursor + offset,
    program: { ...composition.program, identity: { offset: { row, column: offset }, ...band.program } } };
}
