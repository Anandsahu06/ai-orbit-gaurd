'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Home, Loader2, Minus, Plus } from 'lucide-react'
import type { OrbitPoint, OrbitTrack, Satellite } from '@/lib/types/api'
import { cn } from '@/lib/utils'
import { loadCesium } from './load-cesium'

const COLORS = {
  orange: '#F26B1D',
  navy: '#0B1F3A',
  active: '#E6EEF9',
  activeTrack: '#8FB2E3',
  debris: '#8A9AB0',
  pair: '#FF8A80',
  tca: '#EF4444',
  space: '#050B18',
}

export interface OrbitGlobeProps {
  satellites: Satellite[]
  tracks?: OrbitTrack[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  /** Objects involved in a conjunction; highlighted alongside their tracks. */
  highlightIds?: string[]
  tcaPoint?: OrbitPoint
  /** Render tracks for every object (true) or only selected / highlighted ones. */
  showAllTracks?: boolean
  variant?: 'full' | 'compact' | 'hero'
  showControls?: boolean
  className?: string
  children?: React.ReactNode
}

function cameraHeightFor(altKm: number) {
  return altKm > 10000 ? altKm * 1000 + 22_000_000 : 13_000_000
}

export function OrbitGlobe({
  satellites,
  tracks = [],
  selectedId,
  onSelect,
  highlightIds,
  tcaPoint,
  showAllTracks = true,
  variant = 'full',
  showControls = true,
  className,
  children,
}: OrbitGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const onSelectRef = useRef(onSelect)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    let cancelled = false
    let handler: any

    loadCesium()
      .then((Cesium) => {
        if (cancelled || !containerRef.current) return
        const credit = document.createElement('div')
        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: credit,
          skyBox: false,
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          baseLayer: Cesium.ImageryLayer.fromProviderAsync(
            Cesium.TileMapServiceImageryProvider.fromUrl(Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')),
          ),
        })

        const { scene } = viewer
        scene.backgroundColor = Cesium.Color.fromCssColorString(COLORS.space)
        scene.globe.baseColor = Cesium.Color.fromCssColorString('#0E2748')
        scene.globe.showGroundAtmosphere = true
        scene.fog.enabled = false
        scene.screenSpaceCameraController.minimumZoomDistance = 1_500_000
        scene.screenSpaceCameraController.maximumZoomDistance = 90_000_000
        if (variant === 'hero') scene.screenSpaceCameraController.enableZoom = false

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(20, 18, variant === 'hero' ? 24_000_000 : 26_000_000),
        })

        handler = new Cesium.ScreenSpaceEventHandler(scene.canvas)
        handler.setInputAction((e: any) => {
          const picked = scene.pick(e.position)
          const id: unknown = picked?.id?.id
          if (typeof id === 'string' && id.startsWith('sat:')) onSelectRef.current?.(id.slice(4))
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        viewerRef.current = viewer
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      handler?.destroy()
      if (viewerRef.current && !viewerRef.current.isDestroyed()) viewerRef.current.destroy()
      viewerRef.current = null
    }
  }, [variant])

  useEffect(() => {
    const viewer = viewerRef.current
    const Cesium = window.Cesium
    if (status !== 'ready' || !viewer || !Cesium) return

    const color = (hex: string, alpha = 1) => Cesium.Color.fromCssColorString(hex).withAlpha(alpha)
    const highlight = new Set(highlightIds ?? [])
    const byId = new Map(satellites.map((s) => [s.id, s]))

    viewer.entities.removeAll()

    for (const track of tracks) {
      const selected = track.satelliteId === selectedId
      const paired = highlight.has(track.satelliteId)
      if (!showAllTracks && !selected && !paired) continue
      const debris = byId.get(track.satelliteId)?.type === 'DEBRIS'
      viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(
            track.positions.flatMap((p) => [p.lonDeg, p.latDeg, p.altKm * 1000]),
          ),
          width: selected ? 2.5 : paired ? 2 : 1,
          arcType: Cesium.ArcType.NONE,
          material: selected
            ? color(COLORS.orange)
            : paired
              ? color(COLORS.pair, 0.9)
              : debris
                ? color(COLORS.debris, 0.22)
                : color(COLORS.activeTrack, 0.3),
        },
      })
    }

    for (const sat of satellites) {
      const selected = sat.id === selectedId
      const paired = highlight.has(sat.id)
      const position = Cesium.Cartesian3.fromDegrees(sat.longitudeDeg, sat.latitudeDeg, sat.altitudeKm * 1000)
      const debris = sat.type === 'DEBRIS'

      if (selected) {
        viewer.entities.add({
          position,
          point: {
            pixelSize: 26,
            color: color(COLORS.orange, 0.16),
            outlineColor: color(COLORS.orange, 0.55),
            outlineWidth: 1,
          },
        })
      }

      viewer.entities.add({
        id: `sat:${sat.id}`,
        position,
        point: {
          pixelSize: selected ? 10 : paired ? 8 : debris ? 4 : 5,
          color: selected ? color(COLORS.orange) : paired ? color(COLORS.pair) : debris ? color(COLORS.debris, 0.9) : color(COLORS.active),
          outlineColor: color('#FFFFFF'),
          outlineWidth: selected || paired ? 2 : 0,
        },
        label:
          selected || paired
            ? {
                text: `${sat.name}\n${sat.regime} · NORAD ${sat.noradId}`,
                font: '500 12px Inter, system-ui, sans-serif',
                fillColor: Cesium.Color.WHITE,
                showBackground: true,
                backgroundColor: color(COLORS.navy, 0.88),
                backgroundPadding: new Cesium.Cartesian2(8, 6),
                pixelOffset: new Cesium.Cartesian2(16, 0),
                horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
              }
            : undefined,
      })
    }

    if (tcaPoint) {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(tcaPoint.lonDeg, tcaPoint.latDeg, tcaPoint.altKm * 1000),
        point: { pixelSize: 30, color: color(COLORS.tca, 0.12), outlineColor: color(COLORS.tca, 0.8), outlineWidth: 1.5 },
        label: {
          text: 'TCA',
          font: '600 11px Inter, system-ui, sans-serif',
          fillColor: color(COLORS.tca),
          showBackground: true,
          backgroundColor: color('#FFFFFF', 0.92),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
          pixelOffset: new Cesium.Cartesian2(0, -28),
        },
      })
    }
  }, [status, satellites, tracks, selectedId, highlightIds, tcaPoint, showAllTracks])

  const focus = useCallback(
    (duration = 1.4) => {
      const viewer = viewerRef.current
      const Cesium = window.Cesium
      if (!viewer || !Cesium) return
      const target = satellites.find((s) => s.id === selectedId)
      const point = target
        ? { lon: target.longitudeDeg, lat: target.latitudeDeg, h: cameraHeightFor(target.altitudeKm) }
        : tcaPoint
          ? { lon: tcaPoint.lonDeg, lat: tcaPoint.latDeg, h: 13_000_000 }
          : { lon: 20, lat: 18, h: variant === 'hero' ? 24_000_000 : 26_000_000 }
      viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(point.lon, point.lat, point.h), duration })
    },
    [satellites, selectedId, tcaPoint, variant],
  )

  useEffect(() => {
    if (status === 'ready' && (selectedId || tcaPoint)) focus()
    // Only refocus when the target changes, not on every data refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, selectedId, tcaPoint?.latDeg, tcaPoint?.lonDeg])

  const zoom = (factor: number) => {
    const viewer = viewerRef.current
    if (!viewer) return
    const h = viewer.camera.positionCartographic.height
    if (factor > 0) viewer.camera.zoomIn(h * factor)
    else viewer.camera.zoomOut(h * -factor)
  }

  const resetView = () => {
    const viewer = viewerRef.current
    const Cesium = window.Cesium
    if (!viewer || !Cesium) return
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(20, 18, variant === 'hero' ? 24_000_000 : 26_000_000),
      duration: 1.2,
    })
  }

  return (
    <div className={cn('og-cesium relative isolate overflow-hidden bg-space', className)}>
      <div ref={containerRef} className="absolute inset-0" aria-label="3D orbital visualization" role="img" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
          <Loader2 className="size-5 animate-spin text-orange" aria-hidden="true" />
          <p className="text-xs">Loading 3D orbital view…</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
          <p className="text-sm font-medium text-white">3D view unavailable</p>
          <p className="max-w-xs text-xs text-white/60">
            CesiumJS could not start. WebGL may be disabled in this browser. Tabular data remains available.
          </p>
        </div>
      )}

      {status === 'ready' && showControls && (
        <div className="absolute right-3 bottom-3 z-10 flex flex-col overflow-hidden rounded-md border border-white/10 bg-navy/85 backdrop-blur-sm">
          {[
            { label: 'Zoom in', icon: Plus, onClick: () => zoom(0.35) },
            { label: 'Zoom out', icon: Minus, onClick: () => zoom(-0.5) },
            { label: 'Reset view', icon: Home, onClick: resetView },
          ].map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              aria-label={label}
              title={label}
              className="flex size-8 items-center justify-center text-white/80 transition-colors not-last:border-b not-last:border-white/10 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-orange"
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {status === 'ready' && children}
    </div>
  )
}
