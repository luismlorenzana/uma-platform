// Shared work vocabulary (SC2, docs/sibling/phases.md § Phase C). Games can replace every sentence.
export const WORK_WORDS = {
  free: 'Free', done: 'Done', start: 'Start', startJob: 'Start a job', queueNext: 'Queue next',
  collect: 'Collect', repeat: 'Repeat', speed: 'Speed up', recall: 'Recall', more: 'More',
  yes: 'Yes', notNow: 'Not now', close: 'Close', who: 'Who works here?', what: 'What', howMany: 'How many',
  chooseUma: 'Choose an Uma', chooseJob: 'Choose what to make.', noUma: 'No available Uma.', noSlot: 'No free slot here.',
  locked: 'Locked', busy: 'Busy',
  workLevel: 'Work Level', workLevelLabel: 'Work Lv {level}',
  cardFree: 'Slot {n}, free', startSlot: '{start} in slot {n}',
  cardRunning: '{uma}. {what}, {made} of {count} made, {left} left',
  cardReady: '{uma}. {what}, {made} of {count} made, ready to collect',
  collectLabel: 'Collect {n} {what}', repeatLabel: 'Collect and repeat {what}',
  speedTitle: 'Speed up {what}', speedLeft: '{time} left', ticketsHeld: '{n} held',
  cut: '−30m', cutLabel: 'Take 30 minutes off with one Speed Ticket',
  finish: 'Finish · {n}', finishLabel: 'Finish now with {n} Speed Tickets',
  finishLabelOne: 'Finish now with 1 Speed Ticket',
  buyFinish: 'Buy {n} and finish · {price}', buyAsk: 'Buy {n} Speed Tickets for {price} and finish now?',
  buyAskOne: 'Buy 1 Speed Ticket for {price} and finish now?',
  waste: '{minutes} of the ticket’s 30 minutes go unused. Finish now?',
  buyWaste: 'Buy {n} Speed Tickets for {price} and finish now? {minutes} minutes go unused.',
  buyWasteOne: 'Buy 1 Speed Ticket for {price} and finish now? {minutes} minutes go unused.',
  ticketsShort: 'Needs {n} Speed Tickets.',
  recallTitle: 'Recall {uma}', paid: '{items} collected', returned: '{items} come back',
  returnedOne: '{items} comes back',
  lost: '{n} minutes of progress lost', dropped: '{n} queued jobs dropped', nothingLost: 'Nothing is lost.',
  lostOne: '1 minute of progress lost', droppedOne: '1 queued job dropped',
  unlocks: '{n} unlocks', unlockOne: '1 unlock', queued: '{n} queued behind', queueTitle: 'Queued behind', then: 'then',
  queueLine: 'then {what} · {time}', queueUnknown: 'then {what}', queueFull: 'Three are already queued.',
  queueUp: 'Move {what} earlier', queueRemove: 'Remove {what} from the queue',
  stopped: '{uma}’s queue stopped', stoppedLine: '{place} · stopped {time} ago',
  restart: 'Restart', dismiss: 'Dismiss', short: 'Short {items}.',
  stats: 'Lv {level} · {used} of {slots} slots in use · speed ×{speed}',
  level: 'Lv {level}', upgrade: 'Upgrade to Lv {level}', upgradeAsk: 'Upgrade {place} to Lv {level}?',
  upgradeCost: '{amount} money', upgradeItem: '{item}: {have} held, {need} needed',
  upgradeSlots: '{n} slots', upgradeSpeed: 'Speed ×{speed}',
  size: '×{n}', sizeLabel: '×{n}, {time}', idle: '{time}, then free {idle}',
  targets: 'For your targets', targetShort: '×{n}',
  submit: '{action} · ×{n} · {time}', queueFor: 'Queue for {uma}',
  input: '{item}: {have}/{need}', exp: '{n} EXP', unexpected: 'That didn’t work. Try again.',
} as const

export type WorkWords = { readonly [K in keyof typeof WORK_WORDS]: string }
export type WorkWord = keyof WorkWords
export type WorkCopy = (key: WorkWord, data?: Readonly<Record<string, string | number>>) => string

export function workWords(overrides: Partial<WorkWords> = {}): WorkCopy {
  const words = { ...WORK_WORDS, ...overrides }
  return (key, data = {}) => words[key].replace(/\{(\w+)\}/g, (whole, name: string) => String(data[name] ?? whole))
}

/** Durations round up to the next minute, as in the compact source screens. */
export function durationText(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000))
  const hours = Math.floor(minutes / 60)
  return hours === 0 ? `${minutes}m` : minutes % 60 === 0 ? `${hours}h` : `${hours}h ${minutes % 60}m`
}

export interface WorkNames {
  readonly uma?: (id: string) => string
  readonly item?: (id: string) => string
  readonly place?: (id: string) => string
}

export const itemsList = (items: readonly { readonly item: string; readonly qty: number }[], name: (id: string) => string): string =>
  items.map((row) => `${row.qty.toLocaleString('en-US')} ${name(row.item)}`).join(', ')
