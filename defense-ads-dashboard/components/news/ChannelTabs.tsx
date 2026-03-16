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
      {channels.map((key) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            selected === key
              ? 'bg-accent-purple/20 text-purple-300 border border-accent-purple/40'
              : 'bg-[#1a1a2e] text-gray-400 border border-gray-800 hover:text-gray-200 hover:border-gray-600'
          }`}
        >
          {channelNames[key] || key}
        </button>
      ))}
    </div>
  )
}
