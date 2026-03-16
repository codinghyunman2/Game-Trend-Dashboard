'use client'

export default function ChannelTabs({
  channels,
  selected,
  onSelect,
  channelNames,
}: {
  channels: string[]
  selected: string
  onSelect: (key: string) => void
  channelNames: Record<string, string>
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {channels.map((key) => {
        const isSelected = selected === key
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="px-3 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]"
            style={{
              background: isSelected ? 'var(--color-accent-soft)' : 'var(--color-card)',
              border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
              color: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            {channelNames[key] || key}
          </button>
        )
      })}
    </div>
  )
}
