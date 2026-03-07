/**
 * Constants for transition rendering
 */

/** Radius used for self-loop curves */
export const SELF_LOOP_RADIUS = 24

/** Angular separation between multiple self-loops on the same state (radians) */
export const SELF_LOOP_ANGLE_SEPARATION = Math.PI / 4

/** Distance from state center to self-loop control points */
export const SELF_LOOP_CONTROL_DISTANCE = 70

/** Self-loop label distance from state center */
export const SELF_LOOP_LABEL_DISTANCE = 50

/** Spread distance between co-directional transitions */
export const TRANSITION_SPREAD = 22

/** Base offset for bidirectional transition pairs */
export const BIDIRECTIONAL_BASE_OFFSET = 28

/** Offset for transition labels from the path */
export const TRANSITION_LABEL_OFFSET = 12

/** Offset for straight-line transition labels */
export const STRAIGHT_LABEL_OFFSET = 14
