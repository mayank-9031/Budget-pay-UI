"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  colors: string[]
  selectedColor: string
  onColorSelect: (color: string) => void
  disabled?: boolean
}

export function ColorPicker({ colors, selectedColor, onColorSelect, disabled }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className={cn(
            "w-8 h-8 rounded-full border-2 border-gray-200 hover:border-gray-300 transition-colors relative",
            selectedColor === color && "border-gray-800 ring-2 ring-gray-300",
            disabled && "opacity-50 cursor-not-allowed",
          )}
          style={{ backgroundColor: color }}
          onClick={() => !disabled && onColorSelect(color)}
          disabled={disabled}
        >
          {selectedColor === color && (
            <Check className="h-4 w-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          )}
        </button>
      ))}
    </div>
  )
}
