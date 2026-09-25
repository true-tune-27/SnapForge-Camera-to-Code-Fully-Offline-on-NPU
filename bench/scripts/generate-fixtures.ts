import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const benchDir = resolve(__dirname, '..')

// --- Helpers ---
function writeJson(path: string, data: any) {
  writeFileSync(resolve(benchDir, path), JSON.stringify(data, null, 2))
}
function writeCode(path: string, data: string) {
  writeFileSync(resolve(benchDir, path), data)
}
function ensureDir(path: string) {
  mkdirSync(resolve(benchDir, path), { recursive: true })
}

// --- 1. Fixtures ---
ensureDir('fixtures')

// 1. Settings screen
writeJson('fixtures/settings-screen.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'screen', name: 'SettingsScreen' },
  nodes: [
    { role: 'heading', text: 'Settings', conf: 0.96, bbox: [0.05, 0.04, 0.45, 0.1] },
    {
      role: 'container', variant: 'card', pad: 0.042, radius: 'md', conf: 0.94, bbox: [0.05, 0.14, 0.95, 0.72],
      children: [
        { role: 'row', label: 'Push notifications', ctrl: 'switch', state: 'on', conf: 0.91 },
        { role: 'row', label: 'Volume', ctrl: 'slider', value: 0.6, conf: 0.89 },
      ],
    },
    { role: 'button', variant: 'primary', text: 'Save changes', conf: 0.97, bbox: [0.15, 0.78, 0.85, 0.88] },
  ],
  unresolved: [{ bbox: [0.7, 0.04, 0.93, 0.12], reason: 'illegible_handwriting' }]
})

// 2. Login Form
writeJson('fixtures/login-form.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'screen', name: 'LoginScreen' },
  nodes: [
    { role: 'image', conf: 0.8, bbox: [0.4, 0.1, 0.6, 0.2] },
    { role: 'heading', text: 'Welcome back', conf: 0.95 },
    { role: 'input', label: 'Email', conf: 0.9 },
    { role: 'input', label: 'Password', conf: 0.9 },
    { role: 'button', variant: 'primary', text: 'Log in', conf: 0.99 },
    { role: 'button', variant: 'ghost', text: 'Forgot password?', conf: 0.85 }
  ],
  unresolved: []
})

// 3. Dashboard card grid
writeJson('fixtures/dashboard.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'screen', name: 'Dashboard' },
  nodes: [
    { role: 'heading', text: 'Overview', conf: 0.95 },
    { role: 'container', variant: 'plain', children: [
      { role: 'column', children: [
        { role: 'container', variant: 'card', children: [{role: 'text', text: 'Users', conf: 0.9}], conf: 0.9 },
        { role: 'container', variant: 'card', children: [{role: 'text', text: 'Sales', conf: 0.9}], conf: 0.9 }
      ], conf: 0.9 }
    ], conf: 0.9}
  ],
  unresolved: []
})

// 4. List with rows
writeJson('fixtures/list.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'component', name: 'UserList' },
  nodes: [
    { role: 'list', conf: 0.9, children: [
      { role: 'row', label: 'Alice', conf: 0.9 },
      { role: 'row', label: 'Bob', conf: 0.9 }
    ]}
  ],
  unresolved: []
})

// 5. Profile header
writeJson('fixtures/profile-header.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'component', name: 'ProfileHeader' },
  nodes: [
    { role: 'row', conf: 0.9, children: [
      { role: 'image', conf: 0.9, radius: 'full' },
      { role: 'column', conf: 0.9, children: [
        { role: 'heading', text: 'Jane Doe', conf: 0.9 },
        { role: 'badge', text: 'Admin', conf: 0.9 }
      ]}
    ]}
  ],
  unresolved: []
})

// 6. Modal
writeJson('fixtures/modal.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'component', name: 'ConfirmModal' },
  nodes: [
    { role: 'container', variant: 'sheet', conf: 0.9, children: [
      { role: 'heading', text: 'Are you sure?', conf: 0.9 },
      { role: 'text', text: 'This action cannot be undone.', conf: 0.9 },
      { role: 'row', conf: 0.9, children: [
        { role: 'button', variant: 'ghost', text: 'Cancel', conf: 0.9 },
        { role: 'button', variant: 'destructive', text: 'Delete', conf: 0.9 }
      ]}
    ]}
  ],
  unresolved: []
})

// 7. Tab bar
writeJson('fixtures/tab-bar.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'component', name: 'TabBar' },
  nodes: [
    { role: 'row', conf: 0.9, children: [
      { role: 'icon', conf: 0.9, text: 'home' },
      { role: 'icon', conf: 0.9, text: 'search' },
      { role: 'icon', conf: 0.9, text: 'settings' }
    ]}
  ],
  unresolved: []
})

// 8. Empty state
writeJson('fixtures/empty-state.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'component', name: 'EmptyState' },
  nodes: [
    { role: 'column', conf: 0.9, children: [
      { role: 'icon', text: 'inbox', conf: 0.9 },
      { role: 'heading', text: 'No messages', conf: 0.9 },
      { role: 'text', text: 'Check back later', conf: 0.9 }
    ]}
  ],
  unresolved: []
})

// 9. Form with validation
writeJson('fixtures/validation-form.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'component', name: 'ValidationForm' },
  nodes: [
    { role: 'input', label: 'Username', conf: 0.9 },
    { role: 'text', text: 'Username is taken', conf: 0.9 },
    { role: 'button', variant: 'primary', text: 'Submit', conf: 0.9 }
  ],
  unresolved: []
})

// 10. Nav drawer
writeJson('fixtures/nav-drawer.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'component', name: 'NavDrawer' },
  nodes: [
    { role: 'container', variant: 'panel', conf: 0.9, children: [
      { role: 'list', conf: 0.9, children: [
        { role: 'row', label: 'Inbox', conf: 0.9 },
        { role: 'row', label: 'Outbox', conf: 0.9 },
        { role: 'divider', conf: 0.9 },
        { role: 'row', label: 'Spam', conf: 0.9 }
      ]}
    ]}
  ],
  unresolved: []
})

// 11. Degraded: 3 unresolved regions
writeJson('fixtures/degraded-unresolved.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'screen', name: 'UnresolvedScreen' },
  nodes: [ { role: 'heading', text: 'Header', conf: 0.9 } ],
  unresolved: [
    { bbox: [0.1, 0.1, 0.2, 0.2], reason: 'illegible_handwriting' },
    { bbox: [0.3, 0.3, 0.4, 0.4], reason: 'occluded' },
    { bbox: [0.5, 0.5, 0.6, 0.6], reason: 'low_confidence' }
  ]
})

// 12. Degraded: conf < 0.6
writeJson('fixtures/degraded-low-conf.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'screen', name: 'LowConfScreen' },
  nodes: [
    { role: 'heading', text: 'Header', conf: 0.5 },
    { role: 'button', text: 'Click', conf: 0.45, variant: 'primary' }
  ],
  unresolved: []
})

// 13. Degraded: 5 levels nested
writeJson('fixtures/degraded-nested.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'component', name: 'DeepNest' },
  nodes: [{ role: 'container', variant: 'plain', conf: 0.9, children: [
    { role: 'container', variant: 'plain', conf: 0.9, children: [
      { role: 'container', variant: 'plain', conf: 0.9, children: [
        { role: 'container', variant: 'plain', conf: 0.9, children: [
          { role: 'container', variant: 'plain', conf: 0.9, children: [
            { role: 'text', text: 'Deep', conf: 0.9 }
          ]}
        ]}
      ]}
    ]}
  ]}],
  unresolved: []
})

// 14. Degraded: role/variant unmatched (button with variant that shouldn't match component)
writeJson('fixtures/degraded-unmatched.json', {
  schema: 'snapforge.layout/v1',
  surface: { kind: 'component', name: 'Unmatched' },
  nodes: [ { role: 'button', variant: 'destructive', conf: 0.9 } ],
  unresolved: []
})

// 15-20. Others covering remaining roles (control, etc)
for (let i = 15; i <= 20; i++) {
  writeJson(`fixtures/misc-${i}.json`, {
    schema: 'snapforge.layout/v1',
    surface: { kind: 'fragment', name: `Misc${i}` },
    nodes: [ { role: 'control', ctrl: 'checkbox', conf: 0.9 } ],
    unresolved: []
  })
}

// --- 2. Repos ---

// 2a. acme-web
ensureDir('repos/acme-web/src/components/ui')
ensureDir('repos/acme-web/src/components/settings')
ensureDir('repos/acme-web/src/theme')

// tsconfig
writeJson('repos/acme-web/tsconfig.json', {
  compilerOptions: {
    target: "es2022",
    module: "esnext",
    jsx: "react-jsx",
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    paths: { "@/*": ["./src/*"] }
  }
})

// package.json for typechecking
writeJson('repos/acme-web/package.json', {
  name: "acme-web",
  version: "1.0.0",
  dependencies: {
    "react": "^18.2.0",
    "@types/react": "^18.2.0"
  }
})

// tokens
writeCode('repos/acme-web/src/theme/tokens.ts', `
export const tokens = {
  space: { '4': 4, '8': 8, '12': 12, '16': 16, '24': 24, '32': 32 },
  radius: { sm: 4, md: 8, lg: 16, full: 9999 },
  colors: { primary: 'blue', secondary: 'gray', destructive: 'red' }
};
export type SpaceToken = keyof typeof tokens.space;
export type RadiusToken = keyof typeof tokens.radius;
`)

// Some fake UI components (named exports mostly)
const uiComponents = ['Card', 'Button', 'Switch', 'Slider', 'Badge', 'Input', 'Modal']
for (const comp of uiComponents) {
  writeCode(`repos/acme-web/src/components/ui/${comp.toLowerCase()}.tsx`, `
import React, { ReactNode } from 'react';
import { SpaceToken, RadiusToken } from '@/theme/tokens';
export interface ${comp}Props {
  children?: ReactNode;
  pad?: SpaceToken;
  radius?: RadiusToken;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  label?: string;
}
export const ${comp} = (props: ${comp}Props) => <div>{props.children}</div>;
`)
}

// Some setting components (default exports to test mixing)
const settingsComponents = ['SettingRow', 'SettingGroup']
for (const comp of settingsComponents) {
  writeCode(`repos/acme-web/src/components/settings/${comp.toLowerCase()}.tsx`, `
import React, { ReactNode } from 'react';
export interface ${comp}Props {
  title?: string;
  children?: ReactNode;
}
export default function ${comp}(props: ${comp}Props) {
  return <div>{props.children}</div>;
}
`)
}

// Create the rest of the 18 components as simple dummies
for (let i = 10; i <= 18; i++) {
  writeCode(`repos/acme-web/src/components/ui/dummy${i}.tsx`, `
import React from 'react';
export const Dummy${i} = () => <div/>;
`)
}

// 2b. minimal-web
ensureDir('repos/minimal-web/src/components')

writeJson('repos/minimal-web/tsconfig.json', {
  compilerOptions: {
    target: "es2022",
    module: "esnext",
    jsx: "react-jsx",
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true
  }
})
writeJson('repos/minimal-web/package.json', {
  name: "minimal-web",
  version: "1.0.0",
  dependencies: {
    "react": "^18.2.0",
    "@types/react": "^18.2.0"
  }
})

const minComponents = ['Box', 'Btn', 'Txt', 'Img', 'List']
for (const comp of minComponents) {
  writeCode(`repos/minimal-web/src/components/${comp}.tsx`, `
import React, { ReactNode } from 'react';
export interface ${comp}Props {
  className?: string; // tailwind
  children?: ReactNode;
}
export const ${comp} = (props: ${comp}Props) => <div className={props.className}>{props.children}</div>;
`)
}
