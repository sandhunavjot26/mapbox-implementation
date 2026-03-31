/**
 * Mapbox Standard / Standard Satellite basemap presets (Mapbox GL JS v3+ `config`).
 * @see https://docs.mapbox.com/mapbox-gl-js/guides/styles#set-a-style
 */

export type BasemapVariant = "standard" | "standard-satellite";
export type MapLightPreset = "day" | "night";

export const MAPBOX_STANDARD_STYLE = "mapbox://styles/mapbox/standard";
export const MAPBOX_STANDARD_SATELLITE_STYLE =
  "mapbox://styles/mapbox/standard-satellite";

export function getMapboxStyleUrl(variant: BasemapVariant): string {
  return variant === "standard"
    ? MAPBOX_STANDARD_STYLE
    : MAPBOX_STANDARD_SATELLITE_STYLE;
}

/**
 * Fragment passed as `config: { basemap: … }` / `updateConfig({ basemap: … })`.
 * Matches your reference snippets exactly.
 */
export function getBasemapFragmentConfig(
  variant: BasemapVariant,
  light: MapLightPreset,
): Record<string, unknown> {
  if (light === "day") {
    return {};
  }
  if (variant === "standard") {
    return { lightPreset: "night", theme: "monochrome" };
  }
  return { lightPreset: "night" };
}

export function getMapInitialConfig(variant: BasemapVariant, light: MapLightPreset) {
  return {
    basemap: getBasemapFragmentConfig(variant, light),
  };
}
