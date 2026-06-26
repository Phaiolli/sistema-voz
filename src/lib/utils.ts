import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind CSS classes intelligently, removing conflicts and duplicates.
 *
 * Combines `clsx` for conditional class selection with `tailwind-merge` to handle
 * Tailwind's specificity-based conflicts (e.g., two different `p-*` values).
 * Essential for building responsive components with Tailwind v4.
 *
 * @param inputs - Array of class names, objects, arrays, or undefined values.
 * @returns Merged class string with Tailwind conflicts resolved.
 *
 * @example
 * cn("px-2 py-1", "px-4") // => "py-1 px-4" (px-4 wins)
 * cn("text-sm", undefined, "text-lg") // => "text-lg"
 * cn({ "text-red-500": isError }, "text-black") // => "text-red-500" or "text-black"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
