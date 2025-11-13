import { Config } from '../core/Config.js';
import { EventManager } from '../core/EventManager.js';

export const MapManager = {
  map: null,
  source: null,
  draw: null,
  snap: null,
  modify: null,

  isDrawingMode: false,
  currentFeature: null,

  init: function() {
    this.createMap();
    this.setupEventListeners();
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

    if (this.isDrawingMode) {
      this.modify = new ol.interaction.Modify({source: this.source});
      this.map.addInteraction(this.modify);
    }
  },

  enableDrawingMode: function() {
    if (this.isDrawingMode) return;

    this.isDrawingMode = true;
    this.addDrawingInteractions();

    if (!this.modify) {
      this.modify = new ol.interaction.Modify({source: this.source});
      this.map.addInteraction(this.modify);
    }
  },

  disableDrawingMode: function() {
    if (!this.isDrawingMode) return;

    this.isDrawingMode = false;
    this.removeDrawingInteractions();

    if (this.draw) {
      this.draw.abortDrawing();
    }
  },

  addDrawingInteractions: function() {
    this.removeDrawingInteractions();

    this.draw = new ol.interaction.Draw({
      source: this.source,
      type: 'Polygon',
    });

    const originalAddToDrawing = this.draw.addToDrawing_.bind(this.draw);

    this.draw.addToDrawing_ = (event) => {
      if (!this.currentFeature) {
        originalAddToDrawing(event);
        return;
      }

      const geometry = this.currentFeature.getGeometry();
      if (!geometry) {
        originalAddToDrawing(event);
        return;
      }

      const coordinates = geometry.getCoordinates();
      if (!coordinates || !coordinates[0]) {
        originalAddToDrawing(event);
        return;
      }

      const newCoordinates = coordinates[0].slice();
      const insertIndex = newCoordinates.length - 1;
      newCoordinates.splice(insertIndex, 0, event.coordinate);

      if (this.hasSelfIntersection(coordinates[0])) {
        EventManager.emit('notification:show', {
          message: 'Невозможно добавить точку: создается самопересечение!',
          type: 'warning'
        });
        return;
      }

      originalAddToDrawing(event);
    };

    this.draw.on('drawstart', (event) => {
      this.currentFeature = event.feature;
      EventManager.emit('map:drawingStarted');

      this.currentFeature.setStyle(new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
          color: '#ffcc33',
          width: 2
        })
      }));

      const geometry = this.currentFeature.getGeometry();
      this.geometryChangeListener = geometry.on('change', () => {
        this.checkSelfIntersection();
      });
    });

    this.draw.on('drawabort', () => {
      if (this.geometryChangeListener) {
        ol.Observable.unByKey(this.geometryChangeListener);
        this.geometryChangeListener = null;
      }

      this.currentFeature = null;
    });

    this.draw.on('drawend', (event) => {
      if (this.geometryChangeListener) {
        ol.Observable.unByKey(this.geometryChangeListener);
        this.geometryChangeListener = null;
      }

      const feature = event.feature;
      const geometry = feature.getGeometry();
      const coordinates = geometry.getCoordinates();

      if (this.hasSelfIntersection(coordinates[0])) {
        EventManager.emit('notification:show', {
          message: 'Полигон имеет самопересекающиеся линии! Пожалуйста, нарисуйте заново.',
          type: 'error'
        });

        setTimeout(() => {
          this.source.removeFeature(feature);
        }, 10);
        return;
      }

      const area = this.calculateArea(geometry);
      this.displayArea(area);

      geometry.on('change', () => {
        const updatedArea = this.calculateArea(geometry);
        this.displayArea(updatedArea);
      });

      this.currentFeature = null;
      EventManager.emit('map:drawingCompleted', { feature, area });
    });

    this.map.addInteraction(this.draw);

    this.snap = new ol.interaction.Snap({ source: this.source });
    this.map.addInteraction(this.snap);
  },

  removeDrawingInteractions: function() {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
      this.draw = null;
    }

    if (this.snap) {
      this.map.removeInteraction(this.snap);
      this.snap = null;
    }

    this.currentFeature = null;
    this.source.clear();
    this.displayArea(0);
  },

  checkSelfIntersection: function() {
    if (!this.currentFeature) return;

    const geometry = this.currentFeature.getGeometry();
    if (!geometry) return;

    const coordinates = geometry.getCoordinates();
    if (!coordinates || !coordinates[0]) return;

    if (this.hasSelfIntersection(coordinates[0])) {
      this.currentFeature.setStyle(new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 0, 0, 0.2)'
        }),
        stroke: new ol.style.Stroke({
          color: '#ff0000',
          width: 2
        })
      }));
    } else {
      this.currentFeature.setStyle(new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
          color: '#ffcc33',
          width: 2
        })
      }));
    }
  },

  hasSelfIntersection: function(ring) {
    const points = ring;
    const n = points.length - 1;

    if (n < 3) return false;

    for (let i = 0; i < n - 1; i++) {
      const a1 = points[i];
      const a2 = points[i + 1];

      for (let j = i + 2; j < n; j++) {
        if (j === i + 1 || (i === 0 && j === n - 1)) continue;

        const b1 = points[j];
        const b2 = points[j + 1];

        if (this.segmentsIntersect(a1, a2, b1, b2)) {
          return true;
        }
      }
    }
    return false;
  },

  segmentsIntersect: function(a, b, c, d) {
    const ccw = (a, b, c) => {
      return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
    };

    return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
  },

  setupEventListeners: function() {
    this.source.on('addfeature', function(event) {
      const feature = event.feature;
      const geometry = feature.getGeometry();

      if (geometry.getType() === 'Polygon') {
        const area = MapManager.calculateArea(geometry);
        MapManager.displayArea(area);

        geometry.on('change', function() {
          const updatedArea = MapManager.calculateArea(geometry);
          MapManager.displayArea(updatedArea);
        });
      }
    });

    EventManager.on('map:locateUser', () => {
      this.locateUser();
    });

    EventManager.on('map:enableDrawing', () => {
      this.enableDrawingMode();
    });

    EventManager.on('map:disableDrawing', () => {
      this.disableDrawingMode();
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