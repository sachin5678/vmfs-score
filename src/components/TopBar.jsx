const NAV = [
  { href: '#history', label: 'History' },
  { href: '#backtest', label: 'Backtest' },
  { href: '#monthly', label: 'Monthly' },
  { href: '#method', label: 'Method' },
]

export default function TopBar({ theme, onToggleTheme }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
        <a href="#top" className="headline text-[19px] leading-none">
          VMFS Score
        </a>
        <span className="hidden text-[13px] text-muted sm:inline">
          Indian index valuation terminal
        </span>

        <nav
          aria-label="Sections"
          className="order-3 flex w-full gap-x-5 gap-y-1 text-[13px] text-ink-soft sm:order-none sm:ml-auto sm:w-auto"
        >
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="-my-1.5 py-1.5 transition-colors duration-150 hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-pressed={theme === 'dark'}
          aria-label={`Theme: ${theme === 'dark' ? 'dark' : 'light'}. Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="order-2 rounded-[4px] border border-line px-2.5 py-1 text-[12.5px] text-ink-soft transition-colors duration-150 hover:bg-raise hover:text-ink sm:order-none"
        >
          {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </div>
    </header>
  )
}
