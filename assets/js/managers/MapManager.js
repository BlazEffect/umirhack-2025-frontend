import { Config } from '../core/Config.js';
import { EventManager } from '../core/EventManager.js';

export const MapManager = {
  map: null,
  source: null,
  draw: null,
  snap: null,

  config: {
    canDrawField: true
  },

  init: function(userConfig = {}) {
    this.config = { ...this.config, ...userConfig };

    this.createMap();

    if (this.config.canDrawField) {
      this.addInteractions();
      this.setupEventListeners();
    }
  },

  createMap: function() {
    const satelliteLayer = new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: Config.map.satelliteUrl,
        attributions: '© Яндекс'
      })
    });

    const russianLabelsLayer = new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: Config.map.labelsUrl,
        attributions: '© Яндекс'
      }),
      opacity: 0.8
    });

    this.source = new ol.source.Vector();
    const vector = new ol.layer.Vector({
      source: this.source,
      style: {
        'fill-color': 'rgba(255, 255, 255, 0.2)',
        'stroke-color': '#ffcc33',
        'stroke-width': 2,
        'circle-radius': 7,
        'circle-fill-color': '#ffcc33',
      },
    });

    const extent = ol.proj.get('EPSG:3857').getExtent().slice();
    extent[0] += extent[0];
    extent[2] += extent[2];

    this.map = new ol.Map({
      layers: [satelliteLayer, russianLabelsLayer, vector],
      target: 'map',
      view: new ol.View({
        center: ol.proj.fromLonLat(Config.map.defaultCenter),
        zoom: Config.map.defaultZoom,
        extent,
      }),
    });

    if (this.config.canDrawField) {
      const modify = new ol.interaction.Modify({source: this.source});
      this.map.addInteraction(modify);
    }
  },

  addInteractions: function() {
    this.draw = new ol.interaction.Draw({
      source: this.source,
      type: 'Polygon',
    });

    this.draw.on('drawend', function(event) {
      const feature = event.feature;
      const geometry = feature.getGeometry();
      const area = this.calculateArea(geometry);
      this.displayArea(area);

      feature.getGeometry().on('change', function() {
        const updatedArea = MapManager.calculateArea(feature.getGeometry());
        MapManager.displayArea(updatedArea);
      });
    }.bind(this));

    this.map.addInteraction(this.draw);
    this.snap = new ol.interaction.Snap({ source: this.source });
    this.map.addInteraction(this.snap);
  },

  setupEventListeners: function() {
    this.source.on('addfeature', function(event) {
      const feature = event.feature;
      const geometry = feature.getGeometry();

      if (geometry.getType() === 'Polygon') {
        const area = this.calculateArea(geometry);
        this.displayArea(area);

        geometry.on('change', function() {
          const updatedArea = MapManager.calculateArea(geometry);
          MapManager.displayArea(updatedArea);
        });
      }
    }.bind(this));

    EventManager.on('map:locateUser', () => {
      this.locateUser();
    });
  },

  calculateArea: function(polygon) {
    return ol.sphere.getArea(polygon) / 10000;
  },

  displayArea: function(area) {
    EventManager.emit('map:areaCalculated', area);
  },

  locateUser: function() {
    if (!navigator.geolocation) {
      EventManager.emit('notification:show', {
        message: 'Геолокация не поддерживается вашим браузером',
        type: 'warning'
      });
      return;
    }

    EventManager.emit('ui:locationLoading', true);

    navigator.geolocation.getCurrentPosition(
      this.handleLocationSuccess.bind(this),
      this.handleLocationError.bind(this),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  },

  handleLocationSuccess: function(position) {
    EventManager.emit('ui:locationLoading', false);

    const coords = ol.proj.fromLonLat([
      position.coords.longitude,
      position.coords.latitude
    ]);

    this.map.getView().animate({
      center: coords,
      zoom: 15,
      duration: 1000
    });

    this.addLocationMarker(coords, position.coords.accuracy);

    EventManager.emit('notification:show', {
      message: `Местоположение определено! Точность: ${Math.round(position.coords.accuracy)} метров`
    });
  },

  handleLocationError: function(error) {
    EventManager.emit('ui:locationLoading', false);

    let errorMessage = 'Не удалось определить местоположение. ';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage += 'Доступ к геолокации запрещен.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage += 'Информация о местоположении недоступна.';
        break;
      case error.TIMEOUT:
        errorMessage += 'Время ожидания определения местоположения истекло.';
        break;
      default:
        errorMessage += 'Произошла неизвестная ошибка.';
        break;
    }

    EventManager.emit('notification:show', {
      message: errorMessage,
      type: 'warning'
    });
  },

  addLocationMarker: function(coords, accuracy) {
    const existingFeatures = this.source.getFeatures().filter(feature =>
      feature.get('type') === 'location'
    );
    existingFeatures.forEach(feature => this.source.removeFeature(feature));

    const accuracyCircle = new ol.Feature({
      geometry: new ol.geom.Circle(coords, accuracy),
      type: 'location'
    });

    accuracyCircle.setStyle(new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(66, 133, 244, 0.2)'
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(66, 133, 244, 0.5)',
        width: 1
      })
    }));

    this.source.addFeature(accuracyCircle);

    const locationMarker = new ol.Feature({
      geometry: new ol.geom.Point(coords),
      type: 'location'
    });

    locationMarker.setStyle(new ol.style.Style({
      image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({
          color: '#4285F4'
        }),
        stroke: new ol.style.Stroke({
          color: 'white',
          width: 2
        })
      })
    }));

    this.source.addFeature(locationMarker);
  }
};