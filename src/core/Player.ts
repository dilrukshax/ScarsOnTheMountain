import * as THREE from 'three'
import { Game } from './Game'

export class Player{
  private keyHandler = (ev: KeyboardEvent)=>{
    if (ev.key.toLowerCase() === 'e' || ev.key === 'Escape'){
      const c = this.game.cannons.find(c=> c.playerMode)
      if (c) c.exitPlayerMode()
    }
  }

  private clickHandler = (ev: PointerEvent)=>{
    if (this.game.state !== 'playing') return

    // First: check if we clicked a cannon to enter cannon mode
    const mouse = this.game.getMouse()
    mouse.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1)
    const ray = this.game.getRaycaster()
    ray.setFromCamera(mouse, this.game.camera)
    const hits = ray.intersectObjects(this.game.cannons.map(c=> c.root), true)
    if (hits.length){
      const cannon = this.game.cannons.find(c=> hits[0].object === c.root || c.root.children.includes(hits[0].object as any))
      if (cannon){
        cannon.enterPlayerMode()
        return
      }
    }

    // If already in cannon mode, fire cannon
    const activeCannon = this.game.cannons.find(c=> c.playerMode)
    if (activeCannon){
      activeCannon.playerFire()
      return
    }

    // Otherwise: eye-click shoot from camera
    const origin = this.game.camera.getWorldPosition(new THREE.Vector3())
    const dir = this.game.camera.getWorldDirection(new THREE.Vector3())
    this.game.spawnProjectile(origin, dir, 42, false)
    this.game.ui.playShoot()
  }

  constructor(private game: Game){
    window.addEventListener('pointerdown', this.clickHandler)
    window.addEventListener('keydown', this.keyHandler)
  }

  update(dt: number){
    // touch support could be expanded here
  }

  dispose(){
    window.removeEventListener('pointerdown', this.clickHandler)
    window.removeEventListener('keydown', this.keyHandler)
  }
}
