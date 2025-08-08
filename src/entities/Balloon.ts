import * as THREE from 'three'
import { Game } from '../core/Game'

export class Balloon{
  public mesh: THREE.Mesh
  public radius = 0.6
  public sway = Math.random() * Math.PI * 2
  public active = false
  public isCannonTarget = false

  constructor(private game: Game){
    const geo = new THREE.SphereGeometry(this.radius, 16, 16)
    const mat = new THREE.MeshStandardMaterial({ color: 0x66b3ff, roughness: 0.7, metalness: 0.0 })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true
  }

  get position(){ return this.mesh.position }

  activate(pos: THREE.Vector3){
    this.position.copy(pos)
    this.active = true
    this.isCannonTarget = Math.random() < 0.25
    ;(this.mesh.material as THREE.MeshStandardMaterial).color.setHex(this.isCannonTarget ? 0xff4444 : 0x66b3ff)
  }

  addTo(scene: THREE.Scene){ scene.add(this.mesh) }
  removeFrom(scene: THREE.Scene){ scene.remove(this.mesh) }
  deactivate(){ this.active = false }

  update(dt: number){
    if (!this.active) return
    this.sway += dt
    this.mesh.position.y += Math.sin(this.sway * 1.5) * 0.01
    this.mesh.position.x += Math.sin(this.sway) * 0.005

    if (this.mesh.position.y < -2){
      this.game.recycleBalloon(this)
    }
  }

  pop(){
    // simple particle burst
    const count = 12
    const group = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    for (let i=0;i<count;i++){
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), mat)
      const vel = new THREE.Vector3().randomDirection().multiplyScalar(1.5 + Math.random())
      m.userData.vel = vel
      m.position.copy(this.mesh.position)
      group.add(m)
    }
    const scene = (this.game as any).scene as THREE.Scene
    scene.add(group)
    let life = 0.6
    const update = (dt: number)=>{
      life -= dt
      group.children.forEach((c: any)=>{
        c.position.addScaledVector(c.userData.vel, dt)
        c.userData.vel.multiplyScalar(0.95)
      })
      if (life <= 0){ scene.remove(group) }
    }
    // attach temp updater
    const tick = (dt: number)=>{
      update(dt)
      if (life>0) requestAnimationFrame(()=>tick(1/60))
    }
    requestAnimationFrame(()=>tick(1/60))

    this.game.recycleBalloon(this)
  }
}
