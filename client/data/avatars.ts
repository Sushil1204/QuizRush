export type Avatar = {
  id: string
  emoji: string
  label: string
  bg: string
}

export const AVATARS: Avatar[] = [
  { id: 'cool', emoji: '\u{1F60E}', label: 'Sunglasses', bg: '#ffe3c4' },
  { id: 'monster', emoji: '\u{1F479}', label: 'Pink monster', bg: '#ffd9e8' },
  { id: 'cat', emoji: '\u{1F431}', label: 'Orange cat', bg: '#ffe8c9' },
  { id: 'robot', emoji: '\u{1F916}', label: 'Blue robot', bg: '#d9ecff' },
  { id: 'octopus', emoji: '\u{1F419}', label: 'Pink creature', bg: '#ffe0f2' },
  { id: 'alien', emoji: '\u{1F47D}', label: 'Green alien', bg: '#ddf6dc' },
  { id: 'penguin', emoji: '\u{1F427}', label: 'Penguin', bg: '#ddf0ff' },
  { id: 'unicorn', emoji: '\u{1F984}', label: 'Unicorn', bg: '#f0e3ff' },
  { id: 'frog', emoji: '\u{1F438}', label: 'Frog', bg: '#e3f6d8' },
  { id: 'lion', emoji: '\u{1F981}', label: 'Lion', bg: '#ffedcf' },
  { id: 'astronaut', emoji: '\u{1F9D1}\u200D\u{1F680}', label: 'Space character', bg: '#e7e9ff' },
  { id: 'devil', emoji: '\u{1F608}', label: 'Purple character', bg: '#ece0ff' },
]

export function getAvatar(id: string): Avatar {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0]
}
