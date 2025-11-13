export const Config = {
  map: {
    satelliteUrl: 'https://sat01.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}',
    labelsUrl: 'https://core-renderer-tiles.maps.yandex.net/tiles?l=skl&x={x}&y={y}&z={z}',
    defaultCenter: [37.6173, 55.7558],
    defaultZoom: 10
  },
  api: {
    fields: '/api/fields',
    seasons: '/api/seasons',
    crops: '/api/seasons/{seasonId}/crops'
  },
  ui: {
    breakpoints: {
      mobile: 1023
    },
    notification: {
      timeout: 5000
    }
  },
  storage: {
    activeSeasonKey: 'agriManageActiveSeason'
  }
};