/**
 * ViewBox and zoom constants for the canvas
 */

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

/** Initial viewBox dimensions */
export const INITIAL_VIEWBOX: ViewBox = {
  x: 0,
  y: 0,
  w: 900,
  h: 560,
}

/** Minimum viewBox width (max zoom in) */
export const VIEWBOX_WIDTH_MIN = 300

/** Maximum viewBox width (max zoom out) */
export const VIEWBOX_WIDTH_MAX = 3000

/** Minimum viewBox height (max zoom in) */
export const VIEWBOX_HEIGHT_MIN = 200

/** Maximum viewBox height (max zoom out) */
export const VIEWBOX_HEIGHT_MAX = 2000

/** Zoom in factor (scroll/button) */
export const ZOOM_IN_FACTOR = 0.85

/** Zoom out factor (scroll/button) */
export const ZOOM_OUT_FACTOR = 1.15

/** Wheel zoom scale multiplier */
export const WHEEL_ZOOM_IN_SCALE = 0.9

/** Wheel zoom scale multiplier */
export const WHEEL_ZOOM_OUT_SCALE = 1.1

/** Extra padding for the transparent click target rect */
export const CLICK_TARGET_PADDING = 1000
