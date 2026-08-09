// Custom DOM event names for component communication
export const MAP_EVENTS = {
  ROUTE_SELECT: 'route-select',
  ROUTE_DESELECT: 'route-deselect',
  TRAIL_SELECT: 'trail-select',
  TRAIL_DESELECT: 'trail-deselect',
  // OSM trail selected on the map — carries a ready-built ElevationProfile for
  // the elevation pane (OSM trails have no curated JSON to load by name).
  OSM_TRAIL_SELECT: 'osm-trail-select',
  AREA_SELECT: 'area-select',
  LAYER_TOGGLE: 'layer-toggle',
  CENTER_LOCATION: 'center-location',
  SIDEBAR_TOGGLE: 'sidebar-toggle',
  ELEVATION_HOVER: 'elevation-hover',
  LOCATION_UPDATE: 'location-update',
  RIDE_STYLE_CHOSEN: 'ride-style-chosen',
  // Asks whoever owns recording to begin one. The dock's "Start ride" has no
  // business reaching into RidesPanel's state, so it asks instead.
  RIDE_START_REQUEST: 'ride-start-request',
  RIDE_RECORDING_START: 'ride-recording-start',
  RIDE_RECORDING_STOP: 'ride-recording-stop',
  RIDE_RECORDING_UPDATE: 'ride-recording-update',
  RIDE_SELECT: 'ride-select',
  RIDE_DESELECT: 'ride-deselect',
  RIDES_PANEL_TOGGLE: 'rides-panel-toggle',
  // Asks for the "report conditions" form, carrying { trailName }. The form is
  // an event rather than a prop so the one modal at the page root serves every
  // place that might offer it — today the elevation pane, tomorrow wherever.
  CONDITION_REPORT_OPEN: 'condition-report-open',
  TOAST: 'toast',
  MAP_READY: 'map-ready',
} as const;
