// Client mirror of the server registry (nocturne-backend/server/games/index.js).
// Ids MUST match — the server rejects anything it doesn't recognise.
import RockPaperScissors from '../components/game/RockPaperScissors';
import TicTacToe from '../components/game/TicTacToe';
import Connect4 from '../components/game/Connect4';

export const GAMES = [
  {
    id: 'rps',
    title: 'Rock Paper Scissors',
    icon: 'front_hand',
    blurb: 'Best of 3. Pick at the same time.',
    Component: RockPaperScissors,
  },
  {
    id: 'tictactoe',
    title: 'Tic Tac Toe',
    icon: 'grid_3x3',
    blurb: 'Three in a row wins it.',
    Component: TicTacToe,
  },
  {
    id: 'connect4',
    title: 'Connect 4',
    icon: 'view_column',
    blurb: 'Drop four in a line.',
    Component: Connect4,
  },
];

export const gameById = (id) => GAMES.find((g) => g.id === id) || null;
