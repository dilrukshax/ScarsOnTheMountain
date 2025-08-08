import * as THREE from 'three'

export class Castle{
  public root = new THREE.Group()
  private bodyRadius = 3
  private bonusTargets: { center: THREE.Vector3, radius: number, mesh: THREE.Object3D }[] = []

  constructor(){
    // Materials
    const stone = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.95, metalness: 0.05 })
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x7f3b1a, roughness: 0.8 })
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0xc8a44b, emissive: 0x332200, emissiveIntensity: 0.3 })

    // Keep (main tower)
    const keep = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.4, 2.6), stone)
    keep.castShadow = keep.receiveShadow = true
    keep.position.y = 1.7

    // Crenellations
    const merlonGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3)
    for (let i = -1; i <= 1; i++){
      for (let j = -1; j <= 1; j++){
        if (Math.abs(i) + Math.abs(j) < 1) continue
        const m = new THREE.Mesh(merlonGeo, stone)
        m.position.set(i*1.2, 3.4, j*1.2)
        m.castShadow = true
        this.root.add(m)
      }
    }

    // Corner towers
    const towerPositions = [
      new THREE.Vector3(-2, 0, -2),
      new THREE.Vector3( 2, 0, -2),
      new THREE.Vector3(-2, 0,  2),
      new THREE.Vector3( 2, 0,  2),
    ]

    towerPositions.forEach((p)=>{
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 2.4, 12), stone)
      t.position.set(p.x, 1.2, p.z)
      t.castShadow = t.receiveShadow = true

      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.8, 8), roofMat)
      roof.position.set(p.x, 2.8, p.z)
      roof.castShadow = true

      this.root.add(t, roof)

      // Banner target on each tower (bonus)
      const banner = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), bannerMat)
      banner.position.set(p.x + 0.0, 2.2 + Math.random()*0.2, p.z + 0.0)
      banner.castShadow = true
      this.root.add(banner)
      this.bonusTargets.push({ center: banner.position.clone(), radius: 0.25, mesh: banner })
    })

    // Walls
    const wallGeo = new THREE.BoxGeometry(4.6, 1.2, 0.4)
    const wall1 = new THREE.Mesh(wallGeo, stone)
    wall1.position.set(0, 0.6, -2.6)
    const wall2 = wall1.clone(); wall2.position.z = 2.6
    const wall3 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 4.6), stone)
    wall3.position.set(-2.6, 0.6, 0)
    const wall4 = wall3.clone(); wall4.position.x = 2.6
    wall1.castShadow = wall2.castShadow = wall3.castShadow = wall4.castShadow = true
    wall1.receiveShadow = wall2.receiveShadow = wall3.receiveShadow = wall4.receiveShadow = true

    // Gate
    const gate = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 8, 24, Math.PI), stone)
    gate.rotation.z = Math.PI
    gate.position.set(0, 0.8, 2.6)

    this.root.add(keep, wall1, wall2, wall3, wall4, gate)
  }

  addTo(scene: THREE.Scene){ scene.add(this.root) }
  removeFrom(scene: THREE.Scene){ scene.remove(this.root) }

  // Check if a point hits the castle. Returns {hit, bonus}
  hitTest(point: THREE.Vector3){
    // Coarse body
    const center = this.root.position
    const bodyHit = point.distanceTo(center) < this.bodyRadius

    // Bonus banners
    let bonus = false
    for (const t of this.bonusTargets){
      const worldCenter = t.mesh.getWorldPosition(new THREE.Vector3())
      if (point.distanceTo(worldCenter) < t.radius){
        bonus = true
        this.spark(worldCenter)
        break
      }
    }

    if (bodyHit && !bonus){
      // small hit spark near hit point
      this.spark(point)
    }

    return { hit: bodyHit || bonus, bonus }
  }

  private spark(pos: THREE.Vector3){
    const group = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: 0xffdd88 })
    for(let i=0;i<10;i++){
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.04,6,6), mat)
      m.position.copy(pos)
      ;(m as any).vel = new THREE.Vector3().randomDirection().multiplyScalar(1.2)
      group.add(m)
    }
    const scene = this.root.parent as THREE.Scene
    if (!scene) return
    scene.add(group)
    let life = 0.35
    const tick = ()=>{
      life -= 1/60
      group.children.forEach((c: any)=>{
        c.position.addScaledVector(c.vel, 1/60)
        c.vel.multiplyScalar(0.9)
      })
      if (life <= 0) scene.remove(group)
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
}
