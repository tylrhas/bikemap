import * as migration_20260807_044718_initial_schema from './20260807_044718_initial_schema';
import * as migration_20260807_202004_trail_conditions from './20260807_202004_trail_conditions';
import * as migration_20260807_213812_condition_report_locks from './20260807_213812_condition_report_locks';
import * as migration_20260807_234413_condition_marks_closed from './20260807_234413_condition_marks_closed';
import * as migration_20260809_041945_map_appearance from './20260809_041945_map_appearance';
import * as migration_20260810_000000_brand_and_layers from './20260810_000000_brand_and_layers';
import * as migration_20260811_034619_race_events from './20260811_034619_race_events';

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
    up: migration_20260810_000000_brand_and_layers.up,
    down: migration_20260810_000000_brand_and_layers.down,
    name: '20260810_000000_brand_and_layers',
  },
  {
    up: migration_20260811_034619_race_events.up,
    down: migration_20260811_034619_race_events.down,
    name: '20260811_034619_race_events',
  },
];
