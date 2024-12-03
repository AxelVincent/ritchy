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
  settings,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number.parseFloat(e.target.value))
  }

  return (
    <div className="absolute right-64 top-2.5 w-[220px] rounded-md bg-white shadow-md p-2 font-sans text-sm">
      <div className="flex items-center gap-3">
        <input
          id="radius-input"
          type="range"
          min={settings.min}
          max={settings.max}
          step={settings.step}
          value={value}
          onChange={handleChange}
          aria-labelledby="radius-label"
          aria-valuemin={settings.min}
          aria-valuemax={settings.max}
          aria-valuenow={value}
          aria-valuetext={`${value} kilometers`}
          className="w-30"
        />
        <label
          id="radius-label"
          htmlFor="radius-input"
          className="text-gray-700 w-20"
        >
          {value / 1000} km
        </label>
      </div>
    </div>
  )
}
