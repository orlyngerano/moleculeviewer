import { Button as KButton } from '@kobalte/core/button'
import { splitProps } from 'solid-js'
import { cn } from '../../lib/utils'

export type ButtonProps = Parameters<typeof KButton>[0] & {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['variant', 'size', 'class', 'children'])

  return (
    <KButton
      class={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        local.variant === 'outline'
          ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          : local.variant === 'ghost'
            ? 'text-gray-700 hover:bg-gray-100'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
        local.size === 'sm'
          ? 'h-8 px-3 text-xs'
          : local.size === 'lg'
            ? 'h-11 px-8 text-base'
            : 'h-10 px-4 text-sm',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </KButton>
  )
}
