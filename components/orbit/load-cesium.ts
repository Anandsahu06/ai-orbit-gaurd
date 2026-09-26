/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Cesium?: any
    CESIUM_BASE_URL?: string
  }
}

const CESIUM_VERSION = '1.133'
export const CESIUM_BASE = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium/`

let loader: Promise<any> | null = null

/** Loads CesiumJS from the official CDN once, so static assets/workers resolve without bundler config. */
export function loadCesium(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Cesium requires a browser'))
  if (window.Cesium) return Promise.resolve(window.Cesium)
  if (loader) return loader

  loader = new Promise((resolve, reject) => {
    window.CESIUM_BASE_URL = CESIUM_BASE
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `${CESIUM_BASE}Widgets/widgets.css`
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = `${CESIUM_BASE}Cesium.js`
    script.async = true
    script.onload = () => resolve(window.Cesium)
    script.onerror = () => {
      loader = null
      reject(new Error('Failed to load CesiumJS'))
    }
    document.head.appendChild(script)
  })
  return loader
}
