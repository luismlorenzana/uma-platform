// @luismlorenzana/uma-kit/places: the screens around both games, as frames each game fills (uma-platform SD2): getting
// in, the update prompt, the Account, the Warehouse's shelves, the Exchange's rows, the Uma profile and the unlock
// confirm. Every word comes from props, with English defaults.
export { BootGates, BOOT_WORDS, Splash, type BootGatesProps, type BootWords, type GateAuth } from './BootGates.js'
export { INITIAL_GATES, nextGate, type Gate, type GateState } from './gates.js'
export { UpdateNotice, UPDATE_WORDS, useAppUpdate, type UpdateWords } from './UpdateNotice.js'
export {
  appUpdateLifecycle, criticalAction, UpdateLifecycle, watchAppUpdates, type RegisterSW, type UpdateSnapshot, type UpdateSource, type UpdateStatus,
} from './update-lifecycle.js'
export {
  ACCOUNT_WORDS, AccountPage, AppearanceCard, normalizeName, type AccountPageProps, type AccountWords, type InfoRow, type RenameProps, type WalletCell,
} from './AccountPage.js'
export { SHELF_WORDS, ShelfView, type Price, type ShelfViewProps, type ShelfWords } from './ShelfView.js'
export { GRADES, gradeChips, sellOptions, shelfItems, shelfTotal, type GradeFilter, type SellOption, type ShelfItem } from './shelf.js'
export { EXCHANGE_WORDS, ExchangeRows, type ExchangeRow, type ExchangeRowsProps, type ExchangeWords } from './ExchangeRows.js'
export { affordable, exchangeTotal, shortBy, typedQuantity } from './exchange.js'
export { ProfileFrame, type ProfileFrameProps, type ProfileTab } from './ProfileFrame.js'
export { UNLOCK_WORDS, UnlockConfirm, type UnlockConfirmProps, type UnlockWords } from './UnlockConfirm.js'
