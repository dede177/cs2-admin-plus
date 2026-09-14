export const demoPlayers = [
  { userid: 1, name: 'jey', team: 'ct', hp: 100, money: 7200, state: 'active', ping: 21, kills: 18, assists: 5, deaths: 9, hsp: 33 },
  { userid: 2, name: 'n0thiN’', team: 'ct', hp: 84, money: 4650, state: 'active', ping: 34, kills: 12, assists: 3, deaths: 7, hsp: 28 },
  { userid: 3, name: 'dnak', team: 'ct', hp: 61, money: 3100, state: 'active', ping: 28, kills: 10, assists: 6, deaths: 8, hsp: 21 },
  { userid: 4, name: 'b1ko', team: 'ct', hp: 42, money: 1850, state: 'active', ping: 39, kills: 8, assists: 4, deaths: 9, hsp: 24 },
  { userid: 5, name: 'Magisk', team: 'ct', hp: 0, money: 950, state: 'dead', ping: 31, kills: 6, assists: 5, deaths: 11, hsp: 18 },
  { userid: 6, name: 's1mple', team: 't', hp: 100, money: 8100, state: 'active', ping: 19, kills: 16, assists: 3, deaths: 9, hsp: 31 },
  { userid: 7, name: 'zywOo', team: 't', hp: 91, money: 6200, state: 'active', ping: 23, kills: 14, assists: 2, deaths: 10, hsp: 24 },
  { userid: 8, name: 'ropz', team: 't', hp: 73, money: 4400, state: 'active', ping: 27, kills: 9, assists: 3, deaths: 9, hsp: 26 },
  { userid: 9, name: 'blameF', team: 't', hp: 38, money: 2250, state: 'active', ping: 42, kills: 7, assists: 5, deaths: 12, hsp: 27 },
  { userid: 10, name: 'mezii', team: 't', hp: 0, money: 1250, state: 'dead', ping: 35, kills: 5, assists: 4, deaths: 13, hsp: 21 },
  { userid: 11, name: 'G2TV', team: 'spec', hp: 0, money: 0, state: 'dead' },
  { userid: 12, name: 'adris', team: 'spec', hp: 0, money: 0, state: 'dead' },
]

export const demoServer = {
  players: demoPlayers,
  map: 'de_mirage',
  meta: {
    endpoint: '192.168.1.100:27015',
    playerCount: 10,
    nextMap: 'de_dust2',
    tickrate: 128,
    round: 12,
    maxRounds: 24,
    firstTo: 13,
    score: { ct: 7, t: 4 },
  },
}
