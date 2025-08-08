import { Game } from './core/Game'
import { CarGame } from './car/CarGame'

// Bootstrap
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
if (!canvas) throw new Error('Canvas not found')

let castle: Game | null = null
let car: CarGame | null = null

const hud = document.getElementById('hud')!
const menu = document.getElementById('main-menu')!
const toMenuBtn = document.getElementById('to-menu') as HTMLButtonElement
const playCastleBtn = document.getElementById('play-castle') as HTMLButtonElement
const playCarBtn = document.getElementById('play-car') as HTMLButtonElement

function showMenu(){
  hud.classList.add('hidden')
  menu.classList.remove('hidden')
}
function showHUD(){
  hud.classList.remove('hidden')
  menu.classList.add('hidden')
}

playCastleBtn.onclick = ()=>{
  showHUD()
  if (!castle) castle = new Game(canvas)
  else castle.startRound(1)
}

playCarBtn.onclick = ()=>{
  showHUD()
  if (!car) car = new CarGame(canvas)
  car.start()
}

toMenuBtn.onclick = ()=>{
  // Stop sessions and show menu
  if (car){ car.stop() }
  showMenu()
}

showMenu()
