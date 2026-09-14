const NATIVE_MAPS = new Set([
  'ar_baggage',
  'ar_pool_day',
  'ar_shoots',
  'ar_shoots_night',
  'cs_italy',
  'cs_office',
  'cs_shelter',
  'de_ancient',
  'de_ancient_night',
  'de_anubis',
  'de_boulder',
  'de_cache',
  'de_debris',
  'de_dust2',
  'de_eldorado',
  'de_fachwerk',
  'de_inferno',
  'de_mirage',
  'de_nuke',
  'de_overpass',
  'de_poseidon',
  'de_train',
  'de_vertigo',
])

function normalizeMapName(map) {
  return String(map || '').trim().toLowerCase()
}

export function mapIconFor(map) {
  const name = normalizeMapName(map)
  return NATIVE_MAPS.has(name)
    ? `/map-icons/map_icon_${name}.svg`
    : '/map-icons/map_icon_none_png.png'
}

export function mapBackgroundFor(map) {
  const name = normalizeMapName(map)
  return NATIVE_MAPS.has(name)
    ? `/map-backgrounds/${name}_png.png`
    : '/map-backgrounds/default_psd.png'
}

export function hasNativeMapAsset(map) {
  return NATIVE_MAPS.has(normalizeMapName(map))
}
