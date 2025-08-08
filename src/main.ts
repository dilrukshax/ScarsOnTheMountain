import { Game } from './core/Game'

// Bootstrap
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
if (!canvas) throw new Error('Canvas not found')

const game = new Game(canvas)
;(window as any).game = game // expose for debugging

// World Map button
const mapBtn = document.getElementById('to-map') as HTMLButtonElement
mapBtn?.addEventListener('click', () => game.showWorldMap())
