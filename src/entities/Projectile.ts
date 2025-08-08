import * as THREE from 'three'
import { Game } from '../core/Game'

export class Projectile{
  public mesh: THREE.Mesh
  public velocity = new THREE.Vector3()
  public life = 0
  public radius = 0.15
  public isCannon = false

  constructor(private game: Game){
    const geo = new THREE.SphereGeometry(this.radius, 12, 12)
    const mat = new THREE.MeshStandardMaterial({ color: 0xff5533, emissive: 0x201000, roughness: 0.6, metalness: 0.1 })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true
  }

  get position(){ return this.mesh.position }

  activate(origin: THREE.Vector3, dir: THREE.Vector3, speed: number, isCannon: boolean){
    this.isCannon = isCannon
    this.mesh.position.copy(origin)
    this.velocity.copy(dir).multiplyScalar(speed)
    this.life = 2.5
  }

  addTo(scene: THREE.Scene){ scene.add(this.mesh) }
  removeFrom(scene: THREE.Scene){ scene.remove(this.mesh) }
  deactivate(){ this.life = 0 }

  update(dt: number){
    // simple gravity if cannon
    if (this.isCannon) this.velocity.y -= 9.8 * dt

    this.mesh.position.addScaledVector(this.velocity, dt)
    this.life -= dt

    if (this.life <= 0){
      this.game.recycleProjectile(this)
    }
  }
}
