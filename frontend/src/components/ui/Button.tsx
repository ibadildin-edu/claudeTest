import type { ComponentPropsWithRef } from 'react'
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, size, className)} {...props} />
}
