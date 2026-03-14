export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <svg
        className="animate-spin h-12 w-12"
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="#7c3aed"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="80 40"
          className="opacity-30"
        />
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="#2563eb"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="30 90"
        />
      </svg>
    </div>
  )
}
