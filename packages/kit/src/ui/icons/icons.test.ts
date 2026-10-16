import { describe, expect, it } from 'vitest'
import * as icons from './index'

describe('the icon set', () => {
  it('exports one icon per name, each tagged with its name', () => {
    const exported = (Object.values(icons) as unknown[]).filter((icon) => typeof icon === 'function' && 'iconName' in icon).map((icon) => (icon as { iconName: string }).iconName)
    expect([...exported].sort()).toEqual([...icons.ICON_NAMES].sort())
  })
})
