/**
 * SnapForge Schema Types
 *
 * TypeScript types matching layout.v1.schema.json and index.sfx.schema.json.
 * Committed, not generated at build time, so the Android side can read a stable file.
 *
 * FROZEN — changes require all three lane owners to agree.
 */

// ─── layout.v1 ────────────────────────────────────────────────────────────────

/** Surface kinds the VLM can identify */
export type SurfaceKind = 'screen' | 'component' | 'fragment'

/** What kind of thing was sketched */
export interface Surface {
  kind: SurfaceKind
  /** PascalCase identifier for the generated component */
  name: string
}

/**
 * CLOSED enum of node roles. The grammar depends on this being closed.
 * Adding a role means updating the GBNF grammar, the renderer, and the resolver.
 */
export type Role =
  | 'heading'
  | 'text'
  | 'container'
  | 'row'
  | 'column'
  | 'button'
  | 'input'
  | 'image'
  | 'list'
  | 'divider'
  | 'icon'
  | 'badge'
  | 'control'

/** Container variants */
export type ContainerVariant = 'card' | 'panel' | 'sheet' | 'plain'

/** Button variants */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

/** Control variants */
export type ControlVariant = 'switch' | 'slider' | 'checkbox' | 'radio' | 'select'

/** Union of all per-role variants. Per-role validation is enforced via if/then in the schema. */
export type Variant = ContainerVariant | ButtonVariant | ControlVariant

/** Border radius enum — abbreviated to save tokens (sm/md/lg not small/medium/large) */
export type Radius = 'none' | 'sm' | 'md' | 'lg' | 'full'

/** Toggle/control state */
export type State = 'on' | 'off' | 'indeterminate'

/** Inline control type for row nodes. Saves ~15 tokens per row vs a child control node. */
export type ControlType = 'switch' | 'slider' | 'checkbox' | 'radio' | 'select'

/** [x0, y0, x1, y1] normalised to the rectified board, each 0..1 inclusive */
export type BBox = [number, number, number, number]

/** Why the model declined to read a region */
export type UnresolvedReason =
  | 'illegible_handwriting'
  | 'ambiguous_shape'
  | 'occluded'
  | 'out_of_frame'
  | 'low_confidence'

/** A single node in the layout tree. Recursive via children. */
export interface LayoutNode {
  /** Role of the UI element — closed enum */
  role: Role
  /** Per-role variant — validated against the role by the schema */
  variant?: Variant
  /** Bounding box [x0,y0,x1,y1] normalised 0..1. Required on top-level nodes, optional on children. */
  bbox?: BBox
  /** Model confidence for this node, 0..1 */
  conf: number
  /** Padding relative to board width. Measurement — token snapping happens in the renderer. */
  pad?: number
  /** Gap between children, relative to board width */
  gap?: number
  /** Border radius */
  radius?: Radius
  /** Text content of the node */
  text?: string
  /** Label for the node (for rows, inputs, etc.) */
  label?: string
  /** Toggle/control state */
  state?: State
  /** Numeric value for controls (slider position, etc.) 0..1 */
  value?: number
  /** Inline control type for row nodes */
  ctrl?: ControlType
  /** Child nodes */
  children?: LayoutNode[]
}

/** A region the model declined to read */
export interface Unresolved {
  bbox: BBox
  reason: UnresolvedReason
}

/**
 * The complete layout document the VLM emits.
 * ~280 tokens for a typical screen, schema-valid by construction via GBNF grammar constraint.
 */
export interface Layout {
  schema: 'snapforge.layout/v1'
  surface: Surface
  nodes: LayoutNode[]
  unresolved: Unresolved[]
}

// ─── index.sfx ────────────────────────────────────────────────────────────────

/** Repository metadata */
export interface RepoInfo {
  name: string
  framework: string
  indexedAt: string
}

/** Whether a component uses named or default export */
export type ExportStyle = 'named' | 'default'

/** A component prop from static analysis */
export interface ComponentProp {
  name: string
  /** TypeScript type as written, e.g. 'SpaceToken', 'boolean', 'ReactNode' */
  type: string
  optional?: boolean
}

/** A component in the design system inventory */
export interface ComponentEntry {
  /** Exported identifier, e.g. 'Card' */
  name: string
  /** Import path using the repo's alias, e.g. '@/components/ui/card' */
  import: string
  /** Named or default export */
  export: ExportStyle
  /** Declared props from static analysis */
  props: ComponentProp[]
  /** Layout role.variant keys this component serves, e.g. ['container.card', 'container.panel'] */
  maps: string[]
  /** JSX usage count across the repo. Breaks resolver ties — the component the team uses wins. */
  usageCount: number
}

/** Named token scale mapping names to pixel values */
export interface TokenScale {
  [key: string]: number
}

/** Named colour tokens */
export interface ColorScale {
  [key: string]: string
}

/** Design tokens extracted from the repo */
export interface DesignTokens {
  space: TokenScale
  radius: TokenScale
  color?: ColorScale
}

/** File naming convention */
export type FileCase = 'PascalCase' | 'kebab-case' | 'camelCase'

/** Styling approach */
export type StyleSystem = 'tokens-prop' | 'tailwind' | 'css-modules' | 'styled-components'

/** Inferred conventions from the existing file tree */
export interface Conventions {
  screenDir: string
  fileCase: FileCase
  ext: '.tsx' | '.jsx'
  exportStyle: ExportStyle
  styleSystem: StyleSystem
  importAlias: string
}

/**
 * The design system index sent to the phone.
 * ~40-120 KB gzipped. Generated by the companion CLI, never leaves the local link.
 */
export interface DesignSystemIndex {
  repo: RepoInfo
  components: ComponentEntry[]
  tokens: DesignTokens
  conventions: Conventions
}

// ─── patch.v1 ────────────────────────────────────────────────────────────────

export interface Operation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test'
  path: string
  value?: any
  from?: string
}

/**
 * Payload sent from phone to PC on CH2.
 */
export interface ForgePayload {
  layout: Layout
  patch?: Operation[]
}
