import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  ArrowRight,
  BatteryCharging,
  Bell,
  Calendar,
  Camera,
  CloudSun,
  Cpu,
  FileText,
  FolderOpen,
  Globe,
  HardDrive,
  LayoutGrid,
  Maximize2,
  Minimize2,
  MonitorCog,
  MoonStar,
  Palette,
  Rocket,
  Search,
  Settings2,
  Shield,
  Sparkles,
  SquareTerminal,
  Star,
  SunMedium,
  UserRound,
  Volume2,
  Wifi,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './App.css'

type AppId =
  | 'explorer'
  | 'edge'
  | 'settings'
  | 'terminal'
  | 'photos'
  | 'notes'

type Accent = 'azure' | 'sunset' | 'forest'
type LayoutMode = 'window' | 'left' | 'right' | 'maximized'

type AppDefinition = {
  id: AppId
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
  tone: string
}

type WindowState = {
  appId: AppId
  minimized: boolean
  layout: LayoutMode
  offset: number
  z: number
}

type SearchItem = {
  id: string
  title: string
  subtitle: string
  kind: 'app' | 'document'
  appId: AppId
}

const APP_LIBRARY: AppDefinition[] = [
  {
    id: 'explorer',
    title: 'File Explorer',
    subtitle: 'Projects, libraries and quick access',
    description: 'Browse folders, recent workspaces and cloud drives.',
    icon: FolderOpen,
    tone: 'from-[#f8c466] to-[#f18f3b]',
  },
  {
    id: 'edge',
    title: 'Sky Browser',
    subtitle: 'Dashboard, docs and launchpad',
    description: 'A polished landing page with live-style cards.',
    icon: Globe,
    tone: 'from-[#69d0ff] to-[#2c82ff]',
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Theme, personalization and system health',
    description: 'Tune the shell with scene presets and hardware telemetry.',
    icon: Settings2,
    tone: 'from-[#cdd5e4] to-[#8d9fbf]',
  },
  {
    id: 'terminal',
    title: 'Terminal',
    subtitle: 'Realtime shell snapshot',
    description: 'Fast command surface with deployment-style logs.',
    icon: SquareTerminal,
    tone: 'from-[#9df0cb] to-[#14b86d]',
  },
  {
    id: 'photos',
    title: 'Gallery',
    subtitle: 'Curated scenes and wallpapers',
    description: 'A cinematic wall of visual cards and captures.',
    icon: Camera,
    tone: 'from-[#ffb1b9] to-[#ff6b6b]',
  },
  {
    id: 'notes',
    title: 'Release Board',
    subtitle: 'Roadmap, notes and sprint view',
    description: 'A compact board for launch tasks and milestones.',
    icon: FileText,
    tone: 'from-[#e1c3ff] to-[#9f63ff]',
  },
]

const SEARCH_ITEMS: SearchItem[] = [
  ...APP_LIBRARY.map((app) => ({
    id: app.id,
    title: app.title,
    subtitle: app.description,
    kind: 'app' as const,
    appId: app.id,
  })),
  {
    id: 'doc-roadmap',
    title: 'Launch Roadmap.md',
    subtitle: 'Pinned inside Release Board',
    kind: 'document',
    appId: 'notes',
  },
  {
    id: 'doc-system',
    title: 'System Telemetry.json',
    subtitle: 'Open in Settings',
    kind: 'document',
    appId: 'settings',
  },
  {
    id: 'doc-wallpapers',
    title: 'Wallpaper Vault',
    subtitle: 'Open in Gallery',
    kind: 'document',
    appId: 'photos',
  },
]

const PINNED_APPS: AppId[] = [
  'explorer',
  'edge',
  'settings',
  'terminal',
  'photos',
  'notes',
]

const RECOMMENDED: SearchItem[] = [
  SEARCH_ITEMS[6],
  SEARCH_ITEMS[7],
  SEARCH_ITEMS[1],
  SEARCH_ITEMS[8],
]

const THEME_OPTIONS: {
  id: Accent
  title: string
  description: string
}[] = [
  {
    id: 'azure',
    title: 'Azure Bloom',
    description: 'Cold glass, blue light and bright task surfaces.',
  },
  {
    id: 'sunset',
    title: 'Sunset Relay',
    description: 'Copper gradients with warmer window highlights.',
  },
  {
    id: 'forest',
    title: 'Forest Core',
    description: 'Quiet green accents for focused long sessions.',
  },
]

const METRICS = [
  { label: 'CPU', value: '42%', icon: Cpu },
  { label: 'Storage', value: '1.2 TB', icon: HardDrive },
  { label: 'Shield', value: 'Secure', icon: Shield },
]

const WALLPAPERS = [
  'Aurora Causeway',
  'Glass Harbor',
  'Neon Skyline',
  'Motion Bloom',
]

function getApp(appId: AppId) {
  const app = APP_LIBRARY.find((item) => item.id === appId)
  if (!app) {
    throw new Error(`Unknown app: ${appId}`)
  }
  return app
}

function nextZ(windows: WindowState[]) {
  return windows.reduce((max, window) => Math.max(max, window.z), 0) + 1
}

function App() {
  const [windows, setWindows] = useState<WindowState[]>([
    { appId: 'explorer', minimized: false, layout: 'window', offset: 0, z: 1 },
  ])
  const [accent, setAccent] = useState<Accent>('azure')
  const [startOpen, setStartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [widgetsOpen, setWidgetsOpen] = useState(true)
  const [quickPanelOpen, setQuickPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusMode, setFocusMode] = useState(true)
  const [wifiEnabled, setWifiEnabled] = useState(true)
  const [now, setNow] = useState(new Date())

  const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase())
  const visibleWindows = windows.filter((window) => !window.minimized)
  const activeWindow = [...visibleWindows].sort((a, b) => a.z - b.z).at(-1)?.appId
  const orderedWindows = [...visibleWindows].sort((a, b) => a.z - b.z)
  const panelOpen = startOpen || searchOpen || widgetsOpen || quickPanelOpen
  const searchResults = deferredQuery
    ? SEARCH_ITEMS.filter((item) => {
        const haystack = `${item.title} ${item.subtitle}`.toLowerCase()
        return haystack.includes(deferredQuery)
      }).slice(0, 6)
    : RECOMMENDED

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const dismissPanels = () => {
    setStartOpen(false)
    setSearchOpen(false)
    setWidgetsOpen(false)
    setQuickPanelOpen(false)
  }

  const focusWindow = (appId: AppId) => {
    setWindows((current) => {
      const top = nextZ(current)
      return current.map((window) =>
        window.appId === appId ? { ...window, minimized: false, z: top } : window,
      )
    })
  }

  const launchApp = (appId: AppId) => {
    dismissPanels()
    startTransition(() => {
      setWindows((current) => {
        const existing = current.find((window) => window.appId === appId)
        const top = nextZ(current)
        if (existing) {
          return current.map((window) =>
            window.appId === appId ? { ...window, minimized: false, z: top } : window,
          )
        }
        return [
          ...current,
          {
            appId,
            minimized: false,
            layout: 'window',
            offset: current.length % 4,
            z: top,
          },
        ]
      })
    })
  }

  const toggleTaskbarWindow = (appId: AppId) => {
    const target = windows.find((window) => window.appId === appId)
    if (!target) {
      launchApp(appId)
      return
    }
    if (target.minimized || activeWindow !== appId) {
      focusWindow(appId)
      return
    }
    setWindows((current) =>
      current.map((window) =>
        window.appId === appId ? { ...window, minimized: true } : window,
      ),
    )
  }

  const closeWindow = (appId: AppId) => {
    setWindows((current) => current.filter((window) => window.appId !== appId))
  }

  const setLayout = (appId: AppId, layout: LayoutMode) => {
    focusWindow(appId)
    setWindows((current) =>
      current.map((window) =>
        window.appId === appId ? { ...window, layout, minimized: false } : window,
      ),
    )
  }

  const formattedTime = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const formattedDate = now.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <main className={`desktop-shell theme-${accent}`}>
      <div className="wallpaper-glow wallpaper-glow-left" />
      <div className="wallpaper-glow wallpaper-glow-right" />
      <div className="wallpaper-grid" />

      <header className="topbar">
        <div className="brand-block">
          <div className="brand-logo">
            <Sparkles size={18} />
          </div>
          <div>
            <strong>SkyFO Shell</strong>
            <span>Windows 11 inspired web operating system</span>
          </div>
        </div>
        <div className="topbar-metrics">
          <div className="metric-pill">
            <CloudSun size={16} />
            <span>21° 晴朗</span>
          </div>
          <div className="metric-pill">
            <Rocket size={16} />
            <span>{visibleWindows.length} Active Apps</span>
          </div>
          <button
            className="metric-pill metric-pill-button"
            type="button"
            onClick={() => {
              setWidgetsOpen((current) => !current)
              setStartOpen(false)
              setSearchOpen(false)
              setQuickPanelOpen(false)
            }}
          >
            <Bell size={16} />
            <span>Widgets</span>
          </button>
        </div>
      </header>

      <section className="desktop-surface">
        <nav className="desktop-shortcuts" aria-label="Desktop shortcuts">
          {APP_LIBRARY.map((app) => {
            const Icon = app.icon
            return (
              <button
                key={app.id}
                className="desktop-shortcut"
                type="button"
                onClick={() => launchApp(app.id)}
              >
                <span className={`shortcut-icon bg-${app.id}`}>
                  <Icon size={24} />
                </span>
                <span className="shortcut-text">
                  <strong>{app.title}</strong>
                  <small>{app.subtitle}</small>
                </span>
              </button>
            )
          })}
        </nav>

        <section className="hero-card">
          <div className="hero-eyebrow">
            <Star size={14} />
            <span>Immersive desktop composition</span>
          </div>
          <h1>Build, browse and launch from a glass-first workspace.</h1>
          <p>
            SkyFO folds Windows 11 style layering, centered task flow and fluid
            panels into a single browser-delivered operating shell.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => launchApp('edge')}>
              Open Browser
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setSearchOpen(true)
                setStartOpen(false)
                setWidgetsOpen(false)
                setQuickPanelOpen(false)
              }}
            >
              Search Everything
            </button>
          </div>
          <div className="hero-metrics">
            {METRICS.map((metric) => {
              const Icon = metric.icon
              return (
                <article key={metric.label} className="metric-card">
                  <Icon size={18} />
                  <div>
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <aside className="spotlight-card">
          <div className="spotlight-header">
            <span>Today</span>
            <strong>{formattedDate}</strong>
          </div>
          <ul className="spotlight-list">
            <li>
              <MonitorCog size={16} />
              <span>System polish pass completed</span>
            </li>
            <li>
              <Palette size={16} />
              <span>Three scene presets ready for switching</span>
            </li>
            <li>
              <Calendar size={16} />
              <span>Focus block scheduled 23:00 - 01:00</span>
            </li>
          </ul>
        </aside>

        {panelOpen ? (
          <button
            aria-label="Close open panels"
            className="panel-backdrop"
            type="button"
            onClick={dismissPanels}
          />
        ) : null}

        {widgetsOpen ? (
          <aside className="floating-panel widgets-panel">
            <div className="panel-title">
              <strong>Widgets</strong>
              <span>Climate, agenda and quick glance stats</span>
            </div>
            <div className="widget-grid">
              <article className="widget weather-widget">
                <div className="widget-header">
                  <CloudSun size={18} />
                  <span>Weather</span>
                </div>
                <strong>21°</strong>
                <p>Clear sky, soft breeze and ideal light for a late build.</p>
              </article>
              <article className="widget">
                <div className="widget-header">
                  <Calendar size={18} />
                  <span>Agenda</span>
                </div>
                <ul>
                  <li>23:00 Product polish review</li>
                  <li>23:30 Final push to GitHub</li>
                  <li>00:00 Release handoff</li>
                </ul>
              </article>
              <article className="widget">
                <div className="widget-header">
                  <Rocket size={18} />
                  <span>Launchpad</span>
                </div>
                <button type="button" onClick={() => launchApp('terminal')}>
                  Open Terminal
                </button>
                <button type="button" onClick={() => launchApp('notes')}>
                  Open Release Board
                </button>
              </article>
            </div>
          </aside>
        ) : null}

        {searchOpen ? (
          <section className="floating-panel search-panel">
            <div className="search-box">
              <Search size={18} />
              <input
                autoFocus
                placeholder="Search apps, documents and commands"
                value={searchQuery}
                onChange={(event) => {
                  startTransition(() => {
                    setSearchQuery(event.target.value)
                  })
                }}
              />
            </div>
            <div className="panel-title">
              <strong>{deferredQuery ? 'Search Results' : 'Recommended'}</strong>
              <span>{deferredQuery ? 'Instant matches across the shell' : 'Start from frequent tasks'}</span>
            </div>
            <div className="search-results">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  className="search-result"
                  type="button"
                  onClick={() => launchApp(item.appId)}
                >
                  <span className="search-result-type">{item.kind}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                  </div>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {startOpen ? (
          <section className="floating-panel start-panel">
            <div className="panel-title">
              <strong>Pinned</strong>
              <span>Core apps aligned for daily work</span>
            </div>
            <div className="start-grid">
              {PINNED_APPS.map((appId) => {
                const app = getApp(appId)
                const Icon = app.icon
                return (
                  <button
                    key={app.id}
                    className="start-app"
                    type="button"
                    onClick={() => launchApp(app.id)}
                  >
                    <span className={`shortcut-icon bg-${app.id}`}>
                      <Icon size={20} />
                    </span>
                    <strong>{app.title}</strong>
                    <small>{app.subtitle}</small>
                  </button>
                )
              })}
            </div>
            <div className="panel-title panel-section-gap">
              <strong>Recommended</strong>
              <span>Recent files and system spaces</span>
            </div>
            <div className="recommended-list">
              {RECOMMENDED.map((item) => (
                <button
                  key={item.id}
                  className="recommended-item"
                  type="button"
                  onClick={() => launchApp(item.appId)}
                >
                  <FileText size={16} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {quickPanelOpen ? (
          <section className="floating-panel quick-panel">
            <div className="panel-title">
              <strong>Quick Settings</strong>
              <span>Fast controls with hardware-style status</span>
            </div>
            <div className="quick-toggles">
              <button
                className={wifiEnabled ? 'toggle active' : 'toggle'}
                type="button"
                onClick={() => setWifiEnabled((current) => !current)}
              >
                <Wifi size={18} />
                <span>Wi-Fi</span>
              </button>
              <button
                className={focusMode ? 'toggle active' : 'toggle'}
                type="button"
                onClick={() => setFocusMode((current) => !current)}
              >
                <MoonStar size={18} />
                <span>Focus</span>
              </button>
              <button className="toggle active" type="button">
                <Volume2 size={18} />
                <span>Audio</span>
              </button>
              <button className="toggle active" type="button">
                <BatteryCharging size={18} />
                <span>Battery</span>
              </button>
            </div>
            <div className="theme-stack">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  className={theme.id === accent ? 'theme-option active' : 'theme-option'}
                  type="button"
                  onClick={() => setAccent(theme.id)}
                >
                  <div>
                    <strong>{theme.title}</strong>
                    <span>{theme.description}</span>
                  </div>
                  {theme.id === accent ? <SunMedium size={16} /> : <Palette size={16} />}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="window-layer" aria-label="Open app windows">
          {orderedWindows.map((window) => {
            const app = getApp(window.appId)
            const Icon = app.icon
            const style: CSSProperties = { zIndex: window.z }
            if (window.layout === 'window') {
              style.top = `calc(13% + ${window.offset * 1.5}rem)`
              style.left = `calc(15% + ${window.offset * 1.75}rem)`
            }

            return (
              <article
                key={window.appId}
                className={`window-card layout-${window.layout} ${
                  activeWindow === window.appId ? 'is-active' : ''
                }`}
                style={style}
                onMouseDown={() => focusWindow(window.appId)}
              >
                <div className="window-topbar">
                  <div className="window-app-meta">
                    <span className={`shortcut-icon bg-${app.id}`}>
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{app.title}</strong>
                      <span>{app.subtitle}</span>
                    </div>
                  </div>
                  <div className="window-controls">
                    <button type="button" onClick={() => setWindows((current) => current.map((item) => item.appId === window.appId ? { ...item, minimized: true } : item))}>
                      <Minimize2 size={14} />
                    </button>
                    <button type="button" onClick={() => setLayout(window.appId, 'left')}>
                      L
                    </button>
                    <button type="button" onClick={() => setLayout(window.appId, 'maximized')}>
                      <Maximize2 size={14} />
                    </button>
                    <button type="button" onClick={() => setLayout(window.appId, 'right')}>
                      R
                    </button>
                    <button className="danger" type="button" onClick={() => closeWindow(window.appId)}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="window-body">
                  <WindowContent
                    accent={accent}
                    appId={window.appId}
                    focusMode={focusMode}
                    setAccent={setAccent}
                    launchApp={launchApp}
                  />
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <footer className="taskbar">
        <div className="taskbar-center">
          <button
            className={startOpen ? 'taskbar-button active' : 'taskbar-button'}
            type="button"
            onClick={() => {
              setStartOpen((current) => !current)
              setSearchOpen(false)
              setWidgetsOpen(false)
              setQuickPanelOpen(false)
            }}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={searchOpen ? 'taskbar-button active' : 'taskbar-button'}
            type="button"
            onClick={() => {
              setSearchOpen((current) => !current)
              setStartOpen(false)
              setWidgetsOpen(false)
              setQuickPanelOpen(false)
            }}
          >
            <Search size={18} />
          </button>
          {PINNED_APPS.map((appId) => {
            const app = getApp(appId)
            const Icon = app.icon
            const open = windows.some((window) => window.appId === appId)
            const focused = activeWindow === appId
            return (
              <button
                key={appId}
                className={focused ? 'taskbar-button app-button focused' : open ? 'taskbar-button app-button open' : 'taskbar-button app-button'}
                type="button"
                onClick={() => toggleTaskbarWindow(appId)}
              >
                <Icon size={18} />
              </button>
            )
          })}
        </div>
        <button
          className="taskbar-tray"
          type="button"
          onClick={() => {
            setQuickPanelOpen((current) => !current)
            setStartOpen(false)
            setSearchOpen(false)
            setWidgetsOpen(false)
          }}
        >
          <div className="tray-icons">
            <Wifi size={14} />
            <Volume2 size={14} />
            <BatteryCharging size={14} />
          </div>
          <div className="tray-time">
            <strong>{formattedTime}</strong>
            <span>{formattedDate}</span>
          </div>
        </button>
      </footer>
    </main>
  )
}

function WindowContent({
  appId,
  accent,
  focusMode,
  setAccent,
  launchApp,
}: {
  appId: AppId
  accent: Accent
  focusMode: boolean
  setAccent: (accent: Accent) => void
  launchApp: (appId: AppId) => void
}) {
  if (appId === 'explorer') {
    return (
      <div className="app-grid">
        <section className="content-panel">
          <div className="content-heading">
            <strong>Quick Access</strong>
            <span>High-traffic folders and active workspaces</span>
          </div>
          <div className="folder-grid">
            {[
              ['Design System', '118 assets'],
              ['Client Demos', '24 presentations'],
              ['Deployments', '9 environments'],
              ['Research Vault', '62 references'],
            ].map(([title, meta]) => (
              <article key={title} className="folder-card">
                <FolderOpen size={18} />
                <strong>{title}</strong>
                <span>{meta}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="content-panel">
          <div className="content-heading">
            <strong>Recent Files</strong>
            <span>Fresh activity from the launch workspace</span>
          </div>
          <div className="list-stack">
            {[
              'Shell Architecture.fig',
              'Launch Brief.md',
              'Glass Motion Tokens.json',
              'Taskbar Icon Set.sketch',
            ].map((file) => (
              <div key={file} className="list-row">
                <FileText size={16} />
                <span>{file}</span>
                <small>Edited moments ago</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  if (appId === 'edge') {
    return (
      <div className="browser-shell">
        <div className="browser-bar">
          <div className="tab-pill active">Sky Start</div>
          <div className="address-bar">https://skyfo.local/start</div>
          <button className="browser-action" type="button" onClick={() => launchApp('notes')}>
            Open Board
          </button>
        </div>
        <div className="browser-grid">
          {[
            ['Workspaces', 'Continue the Windows 11 inspired shell build.'],
            ['Release Notes', 'Version 1.0 ships with six desktop apps.'],
            ['Documentation', 'Interaction model, panels and snap layouts.'],
          ].map(([title, copy]) => (
            <article key={title} className="browser-card">
              <strong>{title}</strong>
              <p>{copy}</p>
              <button type="button">Launch</button>
            </article>
          ))}
        </div>
      </div>
    )
  }

  if (appId === 'settings') {
    return (
      <div className="settings-layout">
        <section className="content-panel">
          <div className="content-heading">
            <strong>Appearance</strong>
            <span>Pick a scene preset and refine the shell mood</span>
          </div>
          <div className="theme-stack">
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme.id}
                className={theme.id === accent ? 'theme-option active' : 'theme-option'}
                type="button"
                onClick={() => setAccent(theme.id)}
              >
                <div>
                  <strong>{theme.title}</strong>
                  <span>{theme.description}</span>
                </div>
                {theme.id === accent ? <SunMedium size={16} /> : <Palette size={16} />}
              </button>
            ))}
          </div>
        </section>
        <section className="content-panel">
          <div className="content-heading">
            <strong>System Snapshot</strong>
            <span>Fast health summary for the current session</span>
          </div>
          <div className="settings-metrics">
            {[
              ['Secure boot', 'Enabled'],
              ['Focus assist', focusMode ? 'Priority only' : 'Off'],
              ['Graphics mode', 'Balanced'],
              ['Windows memory', '8.6 GB in use'],
            ].map(([label, value]) => (
              <div key={label} className="settings-row">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  if (appId === 'terminal') {
    return (
      <div className="terminal-shell">
        <div className="terminal-line prompt">skyfo@desktop:~$ pnpm release --ship</div>
        <div className="terminal-line ok">[ok] UI shell booted in 198ms</div>
        <div className="terminal-line ok">[ok] taskbar services attached</div>
        <div className="terminal-line">[info] start menu index warmed</div>
        <div className="terminal-line">[info] translucent surfaces calibrated</div>
        <div className="terminal-line prompt">skyfo@desktop:~$ tail -f launch.log</div>
      </div>
    )
  }

  if (appId === 'photos') {
    return (
      <div className="gallery-grid">
        {WALLPAPERS.map((name, index) => (
          <article key={name} className={`gallery-card gallery-${index + 1}`}>
            <div className="gallery-copy">
              <strong>{name}</strong>
              <span>Wallpaper collection</span>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="notes-board">
      <section className="content-panel">
        <div className="content-heading">
          <strong>Release Board</strong>
          <span>Launch-critical tasks at a glance</span>
        </div>
        <div className="kanban-grid">
          <article className="kanban-column">
            <strong>Now</strong>
            <div className="kanban-card">Finalize desktop interactions</div>
            <div className="kanban-card">Polish taskbar states</div>
          </article>
          <article className="kanban-column">
            <strong>Next</strong>
            <div className="kanban-card">Capture preview screenshots</div>
            <div className="kanban-card">Publish to GitHub</div>
          </article>
          <article className="kanban-column">
            <strong>Later</strong>
            <div className="kanban-card">Add drag-and-snap resizing</div>
            <div className="kanban-card">Persist user preferences</div>
          </article>
        </div>
      </section>
      <section className="content-panel compact">
        <div className="content-heading">
          <strong>Owner</strong>
          <span>Current persona and launch mode</span>
        </div>
        <div className="profile-card">
          <UserRound size={18} />
          <div>
            <strong>Moon Launch Team</strong>
            <span>Full autonomy enabled</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
