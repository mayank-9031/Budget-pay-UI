// Frontend color management system with predefined colors
export const predefinedColors = [
  "#F59E0B", // Amber
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#10B981", // Emerald
  "#F97316", // Orange
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F472B6", // Pink
  "#6366F1", // Indigo
]

// Store category colors in localStorage
const CATEGORY_COLORS_KEY = "budget_pay_category_colors"

// Get stored category colors
export function getStoredCategoryColors(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(CATEGORY_COLORS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Store category color
export function storeCategoryColor(categoryId: string, color: string): void {
  if (typeof window === "undefined") return
  try {
    const stored = getStoredCategoryColors()
    stored[categoryId] = color
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(stored))
  } catch {
    // Handle storage errors silently
  }
}

// Remove category color
export function removeCategoryColor(categoryId: string): void {
  if (typeof window === "undefined") return
  try {
    const stored = getStoredCategoryColors()
    delete stored[categoryId]
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(stored))
  } catch {
    // Handle storage errors silently
  }
}

// Get color for a category
export function getCategoryColor(categoryId: string, categoryName?: string): string {
  const storedColors = getStoredCategoryColors()

  // If we have a stored color for this category, use it
  if (storedColors[categoryId]) {
    return storedColors[categoryId]
  }

  // For uncategorized transactions
  if (categoryId === "uncategorized" || categoryId === "default") {
    return "#6B7280" // Gray
  }

  // Generate consistent color based on category ID or name
  const seed = categoryId || categoryName || "default"
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % predefinedColors.length
  return predefinedColors[index]
}

// Get color with opacity
export function getCategoryColorWithOpacity(categoryId: string, opacity = 0.1): string {
  const color = getCategoryColor(categoryId)
  // Convert hex to rgba
  const r = Number.parseInt(color.slice(1, 3), 16)
  const g = Number.parseInt(color.slice(3, 5), 16)
  const b = Number.parseInt(color.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// Get available colors (all predefined colors)
export function getAvailableColors(): string[] {
  return [...predefinedColors]
}

// Get used colors
export function getUsedColors(): string[] {
  const storedColors = getStoredCategoryColors()
  return Object.values(storedColors)
}

// Get next available color (cycles through predefined colors)
export function getNextAvailableColor(): string {
  const usedColors = getUsedColors()

  // Find first unused color
  for (const color of predefinedColors) {
    if (!usedColors.includes(color)) {
      return color
    }
  }

  // If all colors are used, start cycling from the beginning
  return predefinedColors[usedColors.length % predefinedColors.length]
}

// Predefined color palette for charts and other UI elements
export const uiColors = {
  primary: "#4F46E5", // Indigo
  secondary: "#6B7280", // Gray
  success: "#10B981", // Emerald
  warning: "#F59E0B", // Amber
  error: "#EF4444", // Red
  info: "#3B82F6", // Blue
}
