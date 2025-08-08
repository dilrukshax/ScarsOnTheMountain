import * as THREE from 'three'
import { Game } from '../core/Game'

export class Cannon{
  public root = new THREE.Group()
  private barrel = new THREE.Mesh()
  private fireTimer = 0
  public playerMode = false

  constructor(private game: Game, public position: THREE.Vector3){
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.6 }))
    this.barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.5 }))
    this.barrel.rotation.z = Math.PI/2
    this.barrel.position.y = 0.35
    this.barrel.position.x = 0.4
    base.castShadow = base.receiveShadow = true
    this.barrel.castShadow = true

    this.root.add(base, this.barrel)
    this.root.position.copy(position)
  }

  addTo(scene: THREE.Scene){ scene.add(this.root) }
  removeFrom(scene: THREE.Scene){ scene.remove(this.root) }

  dispose(scene: THREE.Scene){ this.removeFrom(scene) }

  enterPlayerMode(){
    this.playerMode = true
    // slightly zoom camera
    this.game.controls.target.copy(this.root.position)
    this.game.camera.position.lerpVectors(this.game.camera.position, this.root.position.clone().add(new THREE.Vector3(0,1.2,2.4)), 0.5)
  }

  exitPlayerMode(){ this.playerMode = false }

  update(dt: number){
    this.fireTimer -= dt

    // idle periodic fire when not in player mode
    if (!this.playerMode && this.fireTimer <= 0){
      this.fireTimer = 3 + Math.random()*2
      this.aiFire()
    }

    // aim barrel slowly towards camera look dir when in player mode
    if (this.playerMode){
      const targetDir = new THREE.Vector3().copy(this.game.camera.getWorldDirection(new THREE.Vector3()))
      const yaw = Math.atan2(targetDir.z, targetDir.x)
      this.barrel.rotation.y = -yaw
    }
  }

  aiFire(){
    const dir = new THREE.Vector3(1, 0.2, 0).applyAxisAngle(new THREE.Vector3(0,1,0), Math.random()*Math.PI*2)
    this.fire(dir)
  }

  playerFire(){
    const dir = this.game.camera.getWorldDirection(new THREE.Vector3())
    this.fire(dir, true)
  }

  private fire(dir: THREE.Vector3, isPlayer = false){
    const origin = this.root.position.clone().add(new THREE.Vector3(0.6, 0.4, 0))
    this.game.spawnProjectile(origin, dir.normalize(), 30, true)

    // recoil anim
    const oldX = this.barrel.position.x
    this.barrel.position.x = oldX - 0.2
    setTimeout(()=>{ this.barrel.position.x = oldX }, 120)

    if (isPlayer) this.game.ui.playShoot()
  }
}
