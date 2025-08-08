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
    if (ev.button !== 0) return
    if (this.game.state !== 'playing') return

    // If already in cannon mode, fire immediately
    const activeCannon = this.game.cannons.find(c=> c.playerMode)
    if (activeCannon){
      activeCannon.playerFire()
      return
    }

    // Raycast for cannon
    const mouse = this.game.getMouse()
    mouse.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1)
    const ray = this.game.getRaycaster()
    ray.setFromCamera(mouse, this.game.camera)
    const hits = ray.intersectObjects(this.game.cannons.map(c=> c.root), true)
    if (hits.length){
      const cannon = this.game.cannons.find(c=> hits.some(h=> c.root === h.object || c.root.children.includes(h.object as any)))
      if (cannon){
        cannon.enterPlayerMode()
        return
      }
    }

    // Fallback: distance-to-ray selection (helpful when cannon is small on screen)
    const ro = ray.ray.origin
    const rd = ray.ray.direction
    for (const c of this.game.cannons){
      const cp = c.root.getWorldPosition(new THREE.Vector3())
      const v = new THREE.Vector3().subVectors(cp, ro)
      const proj = v.dot(rd)
      if (proj < 0) continue // behind camera
      const closest = new THREE.Vector3().copy(ro).addScaledVector(rd, proj)
      const d = closest.distanceTo(cp)
      if (d < 1.2){
        c.enterPlayerMode()
        return
      }
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
    // no-op
  }

  dispose(){
    window.removeEventListener('pointerdown', this.clickHandler)
    window.removeEventListener('keydown', this.keyHandler)
  }
}
