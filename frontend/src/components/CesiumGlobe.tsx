import React, { useEffect, useRef, useState } from 'react';
import "cesium/Build/Cesium/Widgets/widgets.css";
import * as Cesium from 'cesium';
import { SatelliteObject, SatelliteTrajectory } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, AlertTriangle } from 'lucide-react';

interface CesiumGlobeProps {
  satellites: SatelliteObject[];
  selectedSatellite: SatelliteObject | null;
  onSelectSatellite: (sat: SatelliteObject) => void;
  selectedTrajectory: SatelliteTrajectory | null;
  focusTrigger?: number;
}

export const CesiumGlobe: React.FC<CesiumGlobeProps> = ({
  satellites,
  selectedSatellite,
  onSelectSatellite,
  selectedTrajectory,
  focusTrigger
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const entitiesMapRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const trajectoryEntityRef = useRef<Cesium.Entity | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const satellitesRef = useRef(satellites);
  satellitesRef.current = satellites;
  const onSelectSatelliteRef = useRef(onSelectSatellite);
  onSelectSatelliteRef.current = onSelectSatellite;

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      let baseLayer: any = false;
      try {
        const provider = new (Cesium.TileMapServiceImageryProvider as any)({
          url: '/cesiumStatic/Assets/Textures/NaturalEarthII'
        });
        baseLayer = new Cesium.ImageryLayer(provider);
      } catch (layerErr) {
        console.warn('Local NaturalEarthII texture fallback:', layerErr);
      }

      // Initialize Cesium Viewer with clean minimalist dashboard setup
      const viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        scene3DOnly: true,
        shadows: false,
        baseLayer: baseLayer,
      });

      // Configure globe visual tone
      const scene = viewer.scene;
      scene.globe.enableLighting = false;
      scene.globe.depthTestAgainstTerrain = false;

      // Set initial camera view
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(25.0, 15.0, 22000000.0),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-88),
          roll: 0.0
        }
      });

      // Handle interactive entity picking on globe
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click: any) => {
        const pickedObject = viewer.scene.pick(click.position);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
          const noradId = pickedObject.id.id;
          const target = satellitesRef.current.find((s) => s.norad_id === noradId);
          if (target) {
            onSelectSatelliteRef.current(target);
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      viewerRef.current = viewer;

      return () => {
        handler.destroy();
        if (viewer && !viewer.isDestroyed()) {
          viewer.destroy();
        }
      };
    } catch (err: any) {
      console.error('Failed to initialize Cesium Viewer:', err);
      setInitError(err?.message || 'WebGL / Cesium initialization failed');
    }
  }, []);

  // Update satellite entities when satellites array changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Retain trajectory entity if present
    entitiesMapRef.current.forEach((entity) => {
      if (entity !== trajectoryEntityRef.current) {
        viewer.entities.remove(entity);
      }
    });
    entitiesMapRef.current.clear();

    satellites.forEach((sat) => {
      const isSelected = selectedSatellite?.norad_id === sat.norad_id;
      const isDebris = sat.object_type === 'DEBRIS' || sat.status === 'DEBRIS';

      // Pick color scheme matching PDF Screen B
      let pointColor = Cesium.Color.fromCssColorString('#38bdf8'); // Cyan/blue for satellites
      if (isDebris) {
        pointColor = Cesium.Color.fromCssColorString('#fb923c'); // Orange for debris
      }
      if (isSelected) {
        pointColor = Cesium.Color.fromCssColorString('#f97316'); // Vibrant orange for selected
      }

      const showLabel = ['100104', '900027', '100103', '100158', '25544'].includes(sat.norad_id) || isSelected;

      try {
        const entity = viewer.entities.add({
          id: sat.norad_id,
          name: sat.name,
          position: Cesium.Cartesian3.fromDegrees(
            sat.longitude,
            sat.latitude,
            sat.altitude_km * 1000.0 // meters
          ),
          point: {
            pixelSize: isSelected ? 10 : 6,
            color: pointColor,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: isSelected ? 2 : 1,
          },
          label: showLabel ? {
            text: `${sat.name}\n${sat.orbit_type}`,
            font: '10px Inter, sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromCssColorString('#0f172a'),
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -8),
          } : undefined
        });

        entitiesMapRef.current.set(sat.norad_id, entity);
      } catch (entErr) {
        console.warn(`Failed to add entity for ${sat.name}:`, entErr);
      }
    });
  }, [satellites, selectedSatellite]);

  // Render orbit trajectory polyline when trajectory updates
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (trajectoryEntityRef.current) {
      viewer.entities.remove(trajectoryEntityRef.current);
      trajectoryEntityRef.current = null;
    }

    if (selectedTrajectory && selectedTrajectory.points.length > 0) {
      try {
        const positions = selectedTrajectory.points.map((pt) =>
          Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, pt.alt_km * 1000.0)
        );

        positions.push(positions[0]);

        trajectoryEntityRef.current = viewer.entities.add({
          name: `${selectedTrajectory.name} Orbit Path`,
          polyline: {
            positions: positions,
            width: 2.0,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.85)
            })
          }
        });
      } catch (trajErr) {
        console.warn('Error rendering trajectory polyline:', trajErr);
      }
    }
  }, [selectedTrajectory]);

  // Smooth camera fly-to when satellite is selected or focus button is triggered
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedSatellite) return;

    try {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          selectedSatellite.longitude,
          selectedSatellite.latitude,
          Math.max(selectedSatellite.altitude_km * 1000.0 * 2.5, 4000000.0)
        ),
        duration: 1.5
      });
    } catch (flyErr) {
      console.warn('Camera fly-to error:', flyErr);
    }
  }, [selectedSatellite, focusTrigger]);

  const handleZoomIn = () => {
    viewerRef.current?.camera.zoomIn(1500000.0);
  };
  const handleZoomOut = () => {
    viewerRef.current?.camera.zoomOut(2000000.0);
  };
  const handleResetCamera = () => {
    viewerRef.current?.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(25.0, 15.0, 22000000.0),
      duration: 1.0
    });
  };

  if (initError) {
    return (
      <div className="w-full h-full bg-slate-900 rounded-xl flex flex-col items-center justify-center p-8 text-center border border-slate-700">
        <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
        <h3 className="text-white font-bold text-base mb-1">3D Globe Fallback</h3>
        <p className="text-slate-400 text-xs max-w-md mb-4">
          WebGL acceleration could not be loaded in this browser window. Satellite positions are actively tracked in 2D below.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-left max-w-sm w-full bg-slate-800/80 p-3 rounded-lg border border-slate-700">
          {satellites.slice(0, 6).map((s) => (
            <div key={s.norad_id} className="text-slate-300">
              <span className="font-semibold text-white">{s.name}:</span> {s.latitude.toFixed(1)}°, {s.longitude.toFixed(1)}°
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden rounded-xl border border-slate-200 shadow-inner">
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Map Navigation Controls */}
      <div className="absolute right-4 bottom-6 flex flex-col gap-1.5 z-10">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 rounded bg-white/90 hover:bg-white text-slate-700 shadow-md border border-slate-200 flex items-center justify-center transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 rounded bg-white/90 hover:bg-white text-slate-700 shadow-md border border-slate-200 flex items-center justify-center transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCamera}
          className="w-8 h-8 rounded bg-white/90 hover:bg-white text-slate-700 shadow-md border border-slate-200 flex items-center justify-center transition-colors"
          title="Reset Earth View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Status Indicator on Globe */}
      <div className="absolute left-4 top-4 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur border border-slate-700/50 text-white text-xs flex items-center gap-2 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-cyan-400" />
        <span className="font-medium tracking-wide">3D Orbit Visualization</span>
        <span className="text-slate-400 text-[11px]">| SGP4 Propagation</span>
      </div>
    </div>
  );
};
