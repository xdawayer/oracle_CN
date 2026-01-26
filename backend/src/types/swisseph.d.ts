// Type declarations for swisseph module
declare module 'swisseph' {
  export function swe_calc_ut(
    tjd_ut: number,
    ipl: number,
    iflag: number
  ): { longitude: number; latitude: number; distance: number; longitudeSpeed: number };

  export function swe_houses(
    tjd_ut: number,
    lat: number,
    lon: number,
    hsys: string
  ): { house: number[]; ascendant: number; mc: number };
}
