import type { FC } from 'react'
import type { RadiusSettings } from '../types'

interface RadiusSliderProps {
  value: number
  onChange: (value: number) => void
  settings: RadiusSettings
}

export const RadiusSlider: FC<RadiusSliderProps> = ({
  value,
  onChange,
  settings
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number.parseFloat(e.target.value))
  }

  return (
    <div className="absolute left-0 top-10 w-[200px] p-[10px] font-helvetica text-xs leading-5">
      <input
        type="range"
        min={settings.min}
        max={settings.max}
        step={settings.step}
        value={value}
        onChange={handleChange}
      />
    </div>
  )
}
