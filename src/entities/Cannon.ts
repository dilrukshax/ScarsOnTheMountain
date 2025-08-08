import * as THREE from 'three'
import { Game } from '../core/Game'

export class Cannon{
  public root = new THREE.Group()
  private barrel = new THREE.Mesh()
  public playerMode = false

  // Aim state
  private yaw = 0 // rotate around Y
  private pitch = 0.15 // up/down
  private minPitch = -0.1
  private maxPitch = 1.1
  private sensitivity = 0.0025

  private onMouseMove = (ev: MouseEvent)=>{
    if (!this.playerMode) return
    this.yaw += ev.movementX * this.sensitivity
    // wrap yaw to avoid precision drift
    if (this.yaw > Math.PI) this.yaw -= Math.PI*2
    if (this.yaw < -Math.PI) this.yaw += Math.PI*2
    this.pitch = THREE.MathUtils.clamp(this.pitch - ev.movementY * this.sensitivity, this.minPitch, this.maxPitch)
    this.applyAim()
  }

  constructor(private game: Game, public position: THREE.Vector3){
    // Base/pedestal
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.0, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x343434, metalness: 0.35, roughness: 0.6 })
    )
    base.castShadow = base.receiveShadow = true

    // Barrel points along +X in local space
    this.barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 2.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x464646, metalness: 0.55, roughness: 0.5 })
    )
    this.barrel.rotation.z = Math.PI/2
    this.barrel.position.y = 0.42
    this.barrel.position.x = 0.6
    this.barrel.castShadow = true

    // Invisible click collider (bigger target)
    const collider = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 12, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    )

    this.root.add(base, this.barrel, collider)
    this.root.position.copy(position)

    this.applyAim()
  }

  private applyAim(){
    // Apply yaw to root and pitch to barrel
    this.root.rotation.y = this.yaw
    this.barrel.rotation.z = Math.PI/2 - this.pitch
  }

  addTo(scene: THREE.Scene){ scene.add(this.root) }
  removeFrom(scene: THREE.Scene){ scene.remove(this.root) }

  dispose(scene: THREE.Scene){ this.removeFrom(scene); this.detachAimControls() }

  enterPlayerMode(){
    if (this.playerMode) return
    this.playerMode = true

    // Camera framing near the cannon
    this.game.controls.target.copy(this.root.position)
    this.game.camera.position.copy(this.root.position).add(new THREE.Vector3(0, 1.3, 2.4))

    this.attachAimControls()

    // Request pointer lock on the canvas for smooth aim
    const el = this.game.renderer.domElement
    el.requestPointerLock?.()
  }

  exitPlayerMode(){
    if (!this.playerMode) return
    this.playerMode = false
    this.detachAimControls()

    if (document.pointerLockElement){
      document.exitPointerLock?.()
    }
  }

  private attachAimControls(){
    window.addEventListener('mousemove', this.onMouseMove)
  }

  private detachAimControls(){
    window.removeEventListener('mousemove', this.onMouseMove)
  }

  update(dt: number){
    // No AI fire; only player controlled.
  }

  playerFire(){
    const dir = this.computeWorldDirection()
    this.fire(dir, true)
  }

  private computeWorldDirection(){
    // Transform local +X by world matrix to get direction
    const p0 = this.barrel.getWorldPosition(new THREE.Vector3())
    const p1Local = new THREE.Vector3(1, 0, 0)
    const p1 = p1Local.applyMatrix4(this.barrel.matrixWorld)
    return p1.sub(p0).normalize()
  }

  private fire(dir: THREE.Vector3, isPlayer = false){
    const origin = this.barrel.getWorldPosition(new THREE.Vector3())
    this.game.spawnProjectile(origin, dir.normalize(), 38, true)

    // Recoil
    const oldX = this.barrel.position.x
    this.barrel.position.x = oldX - 0.18
    setTimeout(()=>{ this.barrel.position.x = oldX }, 100)

    if (isPlayer) this.game.ui.playShoot()
  }
}
