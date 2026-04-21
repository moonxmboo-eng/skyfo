import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
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
type WallpaperId = 'aurora' | 'harbor' | 'neon' | 'bloom'
type LayoutMode = 'window' | 'left' | 'right' | 'maximized'
type PanelId = 'start' | 'search' | 'widgets' | 'quick' | null

type WindowPosition = {
  x: number
  y: number
}

type AppDefinition = {
  id: AppId
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
}

type WindowState = {
  appId: AppId
  minimized: boolean
  layout: LayoutMode
  position: WindowPosition
  z: number
}

type SearchItem = {
  id: string
  title: string
  subtitle: string
  kind: 'app' | 'document'
  appId: AppId
}

type StoredShellState = {
  accent: Accent
  audioEnabled: boolean
  batterySaver: boolean
  focusMode: boolean
  wallpaper: WallpaperId
  wifiEnabled: boolean
  windows: WindowState[]
}

type DragState = {
  appId: AppId
  startX: number
  startY: number
  originX: number
  originY: number
}

const SHELL_STORAGE_KEY = 'skyfo-shell-state-v2'

const DEFAULT_WINDOW_POSITIONS: WindowPosition[] = [
  { x: 220, y: 120 },
  { x: 260, y: 156 },
  { x: 300, y: 192 },
  { x: 340, y: 228 },
]

const APP_LIBRARY: AppDefinition[] = [
  {
    id: 'explorer',
    title: 'File Explorer',
    subtitle: 'Projects, libraries and quick access',
    description: 'Browse folders, recent workspaces and cloud drives.',
    icon: FolderOpen,
  },
  {
    id: 'edge',
    title: 'Sky Browser',
    subtitle: 'Dashboard, docs and launchpad',
    description: 'A polished landing page with live-style cards.',
    icon: Globe,
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Theme, personalization and system health',
    description: 'Tune the shell with scene presets and hardware telemetry.',
    icon: Settings2,
  },
  {
    id: 'terminal',
    title: 'Terminal',
    subtitle: 'Realtime shell snapshot',
    description: 'Fast command surface with deployment-style logs.',
    icon: SquareTerminal,
  },
  {
    id: 'photos',
    title: 'Gallery',
    subtitle: 'Curated scenes and wallpapers',
    description: 'A cinematic wall of visual cards and captures.',
    icon: Camera,
  },
  {
    id: 'notes',
    title: 'Release Board',
    subtitle: 'Roadmap, notes and sprint view',
    description: 'A compact board for launch tasks and milestones.',
    icon: FileText,
  },
]

const APP_IDS = new Set<AppId>(APP_LIBRARY.map((app) => app.id))
const ACCENT_IDS = new Set<Accent>(['azure', 'sunset', 'forest'])
const WALLPAPER_IDS = new Set<WallpaperId>(['aurora', 'harbor', 'neon', 'bloom'])

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

const WALLPAPERS: { id: WallpaperId; title: string; subtitle: string }[] = [
  { id: 'aurora', title: 'Aurora Causeway', subtitle: 'Cool daylight glass' },
  { id: 'harbor', title: 'Glass Harbor', subtitle: 'Calm coastal shine' },
  { id: 'neon', title: 'Neon Skyline', subtitle: 'Lively night energy' },
  { id: 'bloom', title: 'Motion Bloom', subtitle: 'Soft atmospheric gradients' },
]

const SHORTCUT_HINTS = [
  'Ctrl/⌘ + K 打开搜索',
  'Ctrl/⌘ + Space 打开开始菜单',
  'Alt + 1-6 快速启动应用',
  'Esc 关闭面板',
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

function createWindow(appId: AppId, index: number, z: number): WindowState {
  const position = DEFAULT_WINDOW_POSITIONS[index % DEFAULT_WINDOW_POSITIONS.length]
  return {
    appId,
    minimized: false,
    layout: 'window',
    position,
    z,
  }
}

function isAppId(value: unknown): value is AppId {
  return typeof value === 'string' && APP_IDS.has(value as AppId)
}

function isAccent(value: unknown): value is Accent {
  return typeof value === 'string' && ACCENT_IDS.has(value as Accent)
}

function isWallpaper(value: unknown): value is WallpaperId {
  return typeof value === 'string' && WALLPAPER_IDS.has(value as WallpaperId)
}

function normalizePosition(position: WindowPosition): WindowPosition {
  if (typeof window === 'undefined') {
    return position
  }

  const maxX = Math.max(32, window.innerWidth - 900)
  const maxY = Math.max(96, window.innerHeight - 420)

  return {
    x: Math.min(Math.max(24, Math.round(position.x)), maxX),
    y: Math.min(Math.max(88, Math.round(position.y)), maxY),
  }
}

function loadStoredShellState(): StoredShellState | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(SHELL_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredShellState>
    const windows = Array.isArray(parsed.windows)
      ? parsed.windows.flatMap((item, index) => {
          if (!item || !isAppId(item.appId)) {
            return []
          }

          const layout: LayoutMode =
            item.layout === 'left' ||
            item.layout === 'right' ||
            item.layout === 'maximized'
              ? item.layout
              : 'window'

          const x =
            typeof item.position?.x === 'number'
              ? item.position.x
              : DEFAULT_WINDOW_POSITIONS[index % DEFAULT_WINDOW_POSITIONS.length].x
          const y =
            typeof item.position?.y === 'number'
              ? item.position.y
              : DEFAULT_WINDOW_POSITIONS[index % DEFAULT_WINDOW_POSITIONS.length].y

          return [
            {
              appId: item.appId,
              minimized: Boolean(item.minimized),
              layout,
              position: normalizePosition({ x, y }),
              z: typeof item.z === 'number' ? item.z : index + 1,
            },
          ]
        })
      : []

    return {
      accent: isAccent(parsed.accent) ? parsed.accent : 'azure',
      audioEnabled: parsed.audioEnabled ?? true,
      batterySaver: parsed.batterySaver ?? false,
      focusMode: parsed.focusMode ?? true,
      wallpaper: isWallpaper(parsed.wallpaper) ? parsed.wallpaper : 'aurora',
      wifiEnabled: parsed.wifiEnabled ?? true,
      windows: windows.length > 0 ? windows : [createWindow('explorer', 0, 1)],
    }
  } catch {
    return null
  }
}

function App() {
  const [bootState] = useState<StoredShellState | null>(() => loadStoredShellState())
  const [windows, setWindows] = useState<WindowState[]>(
    () => bootState?.windows ?? [createWindow('explorer', 0, 1)],
  )
  const [accent, setAccent] = useState<Accent>(() => bootState?.accent ?? 'azure')
  const [startOpen, setStartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [widgetsOpen, setWidgetsOpen] = useState(true)
  const [quickPanelOpen, setQuickPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [audioEnabled, setAudioEnabled] = useState<boolean>(
    () => bootState?.audioEnabled ?? true,
  )
  const [batterySaver, setBatterySaver] = useState<boolean>(
    () => bootState?.batterySaver ?? false,
  )
  const [focusMode, setFocusMode] = useState<boolean>(
    () => bootState?.focusMode ?? true,
  )
  const [wallpaper, setWallpaper] = useState<WallpaperId>(
    () => bootState?.wallpaper ?? 'aurora',
  )
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(
    () => bootState?.wifiEnabled ?? true,
  )
  const [now, setNow] = useState(new Date())
  const [draggingId, setDraggingId] = useState<AppId | null>(null)
  const dragRef = useRef<DragState | null>(null)

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

  useEffect(() => {
    window.localStorage.setItem(
      SHELL_STORAGE_KEY,
      JSON.stringify({
        accent,
        audioEnabled,
        batterySaver,
        focusMode,
        wallpaper,
        wifiEnabled,
        windows,
      } satisfies StoredShellState),
    )
  }, [accent, audioEnabled, batterySaver, focusMode, wallpaper, wifiEnabled, windows])

  const dismissPanels = () => {
    setStartOpen(false)
    setSearchOpen(false)
    setWidgetsOpen(false)
    setQuickPanelOpen(false)
  }

  const showPanel = (panel: PanelId) => {
    if (panel !== 'search' && searchQuery) {
      setSearchQuery('')
    }
    setStartOpen(panel === 'start')
    setSearchOpen(panel === 'search')
    setWidgetsOpen(panel === 'widgets')
    setQuickPanelOpen(panel === 'quick')
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

        return [...current, createWindow(appId, current.length, top)]
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

  const toggleMaximize = (appId: AppId) => {
    const target = windows.find((window) => window.appId === appId)
    if (!target) {
      return
    }

    setLayout(appId, target.layout === 'maximized' ? 'window' : 'maximized')
  }

  const startWindowDrag = (
    appId: AppId,
    position: WindowPosition,
    layout: LayoutMode,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (layout !== 'window') {
      return
    }

    dragRef.current = {
      appId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    }
    setDraggingId(appId)
    focusWindow(appId)
  }

  const handlePointerMove = useEffectEvent((event: PointerEvent) => {
    if (!dragRef.current) {
      return
    }

    const drag = dragRef.current
    const nextPosition = normalizePosition({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    })

    setWindows((current) =>
      current.map((window) =>
        window.appId === drag.appId
          ? { ...window, position: nextPosition, minimized: false }
          : window,
      ),
    )
  })

  const stopDragging = useEffectEvent(() => {
    dragRef.current = null
    setDraggingId(null)
  })

  const handleKeyboardShortcuts = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()

    if (key === 'escape') {
      dismissPanels()
      stopDragging()
      return
    }

    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault()
      showPanel('search')
      return
    }

    if ((event.ctrlKey || event.metaKey) && key === ' ') {
      event.preventDefault()
      showPanel(startOpen ? null : 'start')
      return
    }

    if (event.altKey && /^[1-6]$/.test(key)) {
      event.preventDefault()
      launchApp(PINNED_APPS[Number(key) - 1])
    }
  })

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('keydown', handleKeyboardShortcuts)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('keydown', handleKeyboardShortcuts)
    }
  }, [])

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
    <main className={`desktop-shell theme-${accent} wallpaper-${wallpaper}`}>
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
          <div className="metric-pill">
            <MonitorCog size={16} />
            <span>Workspace auto-save</span>
          </div>
          <button
            className="metric-pill metric-pill-button"
            type="button"
            onClick={() => showPanel(widgetsOpen ? null : 'widgets')}
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
              onClick={() => showPanel('search')}
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
          <div className="shortcut-hints">
            {SHORTCUT_HINTS.map((hint) => (
              <span key={hint} className="hint-chip">
                {hint}
              </span>
            ))}
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
              <span>Window dragging and save restore enabled</span>
            </li>
            <li>
              <Palette size={16} />
              <span>Theme presets and live wallpaper switching ready</span>
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
                  <li>23:30 Interface stabilization</li>
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
              <article className="widget">
                <div className="widget-header">
                  <LayoutGrid size={18} />
                  <span>Shortcuts</span>
                </div>
                <ul>
                  <li>Ctrl/⌘ + K 搜索</li>
                  <li>Ctrl/⌘ + Space 开始</li>
                  <li>Alt + 1-6 启动应用</li>
                </ul>
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
              <span>
                {deferredQuery
                  ? 'Instant matches across the shell'
                  : 'Start from frequent tasks'}
              </span>
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
                onClick={() => {
                  setWifiEnabled((current) => !current)
                  setQuickPanelOpen(false)
                }}
              >
                <Wifi size={18} />
                <span>{wifiEnabled ? 'Wi-Fi On' : 'Wi-Fi Off'}</span>
              </button>
              <button
                className={focusMode ? 'toggle active' : 'toggle'}
                type="button"
                onClick={() => {
                  setFocusMode((current) => !current)
                  setQuickPanelOpen(false)
                }}
              >
                <MoonStar size={18} />
                <span>{focusMode ? 'Focus On' : 'Focus Off'}</span>
              </button>
              <button
                className={audioEnabled ? 'toggle active' : 'toggle'}
                type="button"
                onClick={() => {
                  setAudioEnabled((current) => !current)
                  setQuickPanelOpen(false)
                }}
              >
                <Volume2 size={18} />
                <span>{audioEnabled ? 'Audio On' : 'Audio Muted'}</span>
              </button>
              <button
                className={batterySaver ? 'toggle active' : 'toggle'}
                type="button"
                onClick={() => {
                  setBatterySaver((current) => !current)
                  setQuickPanelOpen(false)
                }}
              >
                <BatteryCharging size={18} />
                <span>{batterySaver ? 'Battery Saver' : 'Battery Normal'}</span>
              </button>
            </div>
            <div className="theme-stack">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  className={theme.id === accent ? 'theme-option active' : 'theme-option'}
                  type="button"
                  onClick={() => {
                    setAccent(theme.id)
                    setQuickPanelOpen(false)
                  }}
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
              style.top = `${window.position.y}px`
              style.left = `${window.position.x}px`
            }

            return (
              <article
                key={window.appId}
                className={`window-card layout-${window.layout} ${
                  activeWindow === window.appId ? 'is-active' : ''
                } ${draggingId === window.appId ? 'is-dragging' : ''}`}
                style={style}
                onMouseDown={() => focusWindow(window.appId)}
              >
                <div
                  className="window-topbar"
                  onDoubleClick={() => toggleMaximize(window.appId)}
                  onPointerDown={(event) =>
                    startWindowDrag(
                      window.appId,
                      window.position,
                      window.layout,
                      event,
                    )
                  }
                >
                  <div className="window-app-meta">
                    <span className={`shortcut-icon bg-${app.id}`}>
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{app.title}</strong>
                      <span>{app.subtitle}</span>
                    </div>
                  </div>
                  <span className="window-drag-hint">Drag or double-click title bar</span>
                  <div
                    className="window-controls"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      aria-label={`Minimize ${app.title}`}
                      onClick={() =>
                        setWindows((current) =>
                          current.map((item) =>
                            item.appId === window.appId
                              ? { ...item, minimized: true }
                              : item,
                          ),
                        )
                      }
                    >
                      <Minimize2 size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Snap ${app.title} left`}
                      onClick={() => setLayout(window.appId, 'left')}
                    >
                      L
                    </button>
                    <button
                      type="button"
                      aria-label={`Toggle maximize ${app.title}`}
                      onClick={() => toggleMaximize(window.appId)}
                    >
                      <Maximize2 size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Snap ${app.title} right`}
                      onClick={() => setLayout(window.appId, 'right')}
                    >
                      R
                    </button>
                    <button
                      className="danger"
                      type="button"
                      aria-label={`Close ${app.title}`}
                      onClick={() => closeWindow(window.appId)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <div className="window-body">
                  <WindowContent
                    accent={accent}
                    appId={window.appId}
                    audioEnabled={audioEnabled}
                    batterySaver={batterySaver}
                    focusMode={focusMode}
                    resetWorkspace={() => {
                      globalThis.localStorage.removeItem(SHELL_STORAGE_KEY)
                      setAccent('azure')
                      setAudioEnabled(true)
                      setBatterySaver(false)
                      setFocusMode(true)
                      setWallpaper('aurora')
                      setWifiEnabled(true)
                      setWindows([createWindow('explorer', 0, 1)])
                    }}
                    setAccent={setAccent}
                    setWallpaper={setWallpaper}
                    setWifiEnabled={setWifiEnabled}
                    wallpaper={wallpaper}
                    wifiEnabled={wifiEnabled}
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
            onClick={() => showPanel(startOpen ? null : 'start')}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            className={searchOpen ? 'taskbar-button active' : 'taskbar-button'}
            type="button"
            onClick={() => showPanel(searchOpen ? null : 'search')}
          >
            <Search size={18} />
          </button>
          {PINNED_APPS.map((appId, index) => {
            const app = getApp(appId)
            const Icon = app.icon
            const open = windows.some((window) => window.appId === appId)
            const focused = activeWindow === appId
            return (
              <button
                key={appId}
                className={
                  focused
                    ? 'taskbar-button app-button focused'
                    : open
                      ? 'taskbar-button app-button open'
                      : 'taskbar-button app-button'
                }
                type="button"
                title={`Alt + ${index + 1}`}
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
          onClick={() => showPanel(quickPanelOpen ? null : 'quick')}
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
  audioEnabled,
  batterySaver,
  focusMode,
  resetWorkspace,
  setAccent,
  setWallpaper,
  setWifiEnabled,
  wallpaper,
  wifiEnabled,
  launchApp,
}: {
  appId: AppId
  accent: Accent
  audioEnabled: boolean
  batterySaver: boolean
  focusMode: boolean
  resetWorkspace: () => void
  setAccent: (accent: Accent) => void
  setWallpaper: (wallpaper: WallpaperId) => void
  setWifiEnabled: React.Dispatch<React.SetStateAction<boolean>>
  wallpaper: WallpaperId
  wifiEnabled: boolean
  launchApp: (appId: AppId) => void
}) {
  if (appId === 'explorer') {
    return (
      <div className="app-grid">
        <section className="content-panel">
          <div className="content-heading">
            <strong>Quick Access</strong>
            <span>
              {wifiEnabled
                ? 'High-traffic folders and active workspaces'
                : 'Offline mode: cloud locations are temporarily unavailable'}
            </span>
          </div>
          <div className="folder-grid">
            {[
              ['Design System', '118 assets'],
              ['Client Demos', '24 presentations'],
              ['Deployments', wifiEnabled ? '9 environments' : 'Offline: sync paused'],
              ['Research Vault', wifiEnabled ? '62 references' : 'Offline cache only'],
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
          <div className="address-bar">
            {wifiEnabled ? 'https://skyfo.local/start' : 'offline://network-unavailable'}
          </div>
          <button className="browser-action" type="button" onClick={() => launchApp('notes')}>
            Open Board
          </button>
        </div>
        {!wifiEnabled ? (
          <section className="content-panel browser-offline">
            <div className="content-heading">
              <strong>Browser Offline</strong>
              <span>The network toggle now controls app content, not just the icon.</span>
            </div>
            <p>
              Cloud content is blocked while Wi-Fi is off. Reconnect to restore
              release notes, docs and live workspace cards.
            </p>
            <button className="browser-action" type="button" onClick={() => setWifiEnabled(true)}>
              Reconnect Network
            </button>
          </section>
        ) : null}
        <div className="browser-grid">
          {[
            ['Workspaces', 'Continue the Windows 11 inspired shell build.', 'explorer'],
            ['Release Notes', 'Version 1.1 adds drag, shortcuts and restore.', 'notes'],
            ['Documentation', 'Interaction model, panels and snap layouts.', 'settings'],
          ].map(([title, copy, target]) => (
            <article key={title} className="browser-card">
              <strong>{title}</strong>
              <p>{copy}</p>
              <button type="button" onClick={() => launchApp(target as AppId)}>
                Open
              </button>
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
              ['Network', wifiEnabled ? 'Online' : 'Offline'],
              ['Focus assist', focusMode ? 'Priority only' : 'Off'],
              ['Audio route', audioEnabled ? 'Speakers live' : 'Muted'],
              ['Battery mode', batterySaver ? 'Saver enabled' : 'Balanced'],
              ['Graphics mode', 'Balanced'],
              ['Workspace state', 'Restores after reload'],
            ].map(([label, value]) => (
              <div key={label} className="settings-row">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <button className="secondary-button settings-reset" type="button" onClick={resetWorkspace}>
            Reset Workspace
          </button>
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
        <div className="terminal-line ok">[ok] local restore checkpoint written</div>
        <div className="terminal-line">[info] keyboard shortcuts listener active</div>
        <div className="terminal-line">[info] draggable windows ready for interaction</div>
        <div className="terminal-line prompt">skyfo@desktop:~$ tail -f launch.log</div>
      </div>
    )
  }

  if (appId === 'photos') {
    return (
      <div className="gallery-grid">
        {WALLPAPERS.map((item, index) => (
          <button
            key={item.id}
            className={`gallery-card gallery-${index + 1} ${
              wallpaper === item.id ? 'active' : ''
            }`}
            type="button"
            onClick={() => setWallpaper(item.id)}
          >
            <div className="gallery-copy">
              <strong>{item.title}</strong>
              <span>{item.subtitle}</span>
            </div>
          </button>
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
            <div className="kanban-card">Persist shell state locally</div>
          </article>
          <article className="kanban-column">
            <strong>Next</strong>
            <div className="kanban-card">Capture preview screenshots</div>
            <div className="kanban-card">Ship drag-resize v2</div>
          </article>
          <article className="kanban-column">
            <strong>Later</strong>
            <div className="kanban-card">Add boot and lock screen</div>
            <div className="kanban-card">Persist user wallpaper choice</div>
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
