import { cloneElement, isValidElement, useId } from 'react'

type TooltipProps = {
  label: string
  children: React.ReactElement
}

export default function Tooltip({ label, children }: TooltipProps) {
  const tooltipId = useId()

  if (!isValidElement(children)) {
    return children
  }

  return (
    <span className="relative inline-flex group">
      {cloneElement(children, {
        'aria-describedby': tooltipId,
      })}
      <span
        id={tooltipId}
        role="tooltip"
        className="tooltip-bubble pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[220px] -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  )
}
