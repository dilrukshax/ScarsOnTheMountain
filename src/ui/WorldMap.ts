import { Game } from '../core/Game'

export class WorldMap{
  private el = document.getElementById('world-map')!
  private nodes = Array.from(document.querySelectorAll('.map-node')) as HTMLButtonElement[]
  private closeBtn = document.getElementById('map-close') as HTMLButtonElement

  constructor(private game: Game){
    this.closeBtn.addEventListener('click', ()=> this.hide())
    this.nodes.forEach(n=> n.addEventListener('click', ()=>{
      const level = Number(n.dataset.level || '1')
      this.hide()
      this.game.startRound(level)
    }))
  }

  show(){ this.el.classList.remove('hidden') }
  hide(){ this.el.classList.add('hidden') }
}
