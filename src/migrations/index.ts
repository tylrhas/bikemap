import * as migration_20260807_044718_initial_schema from './20260807_044718_initial_schema';
import * as migration_20260807_202004_trail_conditions from './20260807_202004_trail_conditions';
import * as migration_20260807_213812_condition_report_locks from './20260807_213812_condition_report_locks';
import * as migration_20260807_234413_condition_marks_closed from './20260807_234413_condition_marks_closed';
import * as migration_20260809_041945_map_appearance from './20260809_041945_map_appearance';
import * as migration_20260809_220403_map_palette from './20260809_220403_map_palette';
import * as migration_20260809_223540_brand_identity from './20260809_223540_brand_identity';
import * as migration_20260809_225622_drop_admin_theme from './20260809_225622_drop_admin_theme';
import * as migration_20260809_230500_seed_brand_colors from './20260809_230500_seed_brand_colors';
import * as migration_20260809_230729_map_layers from './20260809_230729_map_layers';
import * as migration_20260809_235500_cota_palette from './20260809_235500_cota_palette';
import * as migration_20260809_236200_clay_highlight from './20260809_236200_clay_highlight';
import * as migration_20260809_232604_map_layer_switches from './20260809_232604_map_layer_switches';

export const migrations = [
  {
    up: migration_20260807_044718_initial_schema.up,
    down: migration_20260807_044718_initial_schema.down,
    name: '20260807_044718_initial_schema',
  },
  {
    up: migration_20260807_202004_trail_conditions.up,
    down: migration_20260807_202004_trail_conditions.down,
    name: '20260807_202004_trail_conditions',
  },
  {
    up: migration_20260807_213812_condition_report_locks.up,
    down: migration_20260807_213812_condition_report_locks.down,
    name: '20260807_213812_condition_report_locks',
  },
  {
    up: migration_20260807_234413_condition_marks_closed.up,
    down: migration_20260807_234413_condition_marks_closed.down,
    name: '20260807_234413_condition_marks_closed',
  },
  {
    up: migration_20260809_041945_map_appearance.up,
    down: migration_20260809_041945_map_appearance.down,
    name: '20260809_041945_map_appearance',
  },
  {
    up: migration_20260809_220403_map_palette.up,
    down: migration_20260809_220403_map_palette.down,
    name: '20260809_220403_map_palette',
  },
  {
    up: migration_20260809_223540_brand_identity.up,
    down: migration_20260809_223540_brand_identity.down,
    name: '20260809_223540_brand_identity',
  },
  {
    up: migration_20260809_225622_drop_admin_theme.up,
    down: migration_20260809_225622_drop_admin_theme.down,
    name: '20260809_225622_drop_admin_theme',
  },
  {
    up: migration_20260809_230500_seed_brand_colors.up,
    down: migration_20260809_230500_seed_brand_colors.down,
    name: '20260809_230500_seed_brand_colors',
  },
  {
    up: migration_20260809_230729_map_layers.up,
    down: migration_20260809_230729_map_layers.down,
    name: '20260809_230729_map_layers',
  },
  {
    up: migration_20260809_232604_map_layer_switches.up,
    down: migration_20260809_232604_map_layer_switches.down,
    name: '20260809_232604_map_layer_switches'
  },
];
