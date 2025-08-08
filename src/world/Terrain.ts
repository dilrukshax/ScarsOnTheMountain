import * as THREE from 'three'

let peakPosition = new THREE.Vector3(0, 6, -6)
export function getPeakPosition(){ return peakPosition.clone() }

export function createMountainTerrain(){
  const group = new THREE.Group()

  // Base ground plane
  const tex = new THREE.TextureLoader().load('/assets/ground.jpg')
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(8,8)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60, 1, 1), new THREE.MeshStandardMaterial({ color: 0x4e6e43, map: tex, roughness: 1 }))
  ground.rotation.x = -Math.PI/2
  ground.receiveShadow = true
  group.add(ground)

  // Main mountain peak
  const geo = new THREE.ConeGeometry(6, 12, 6)
  geo.translate(0, 6, 0)
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a7f88, roughness: 0.95, metalness: 0.05 })
  const peak = new THREE.Mesh(geo, mat)
  peak.position.set(0, 0, -6)
  peak.castShadow = peak.receiveShadow = true
  group.add(peak)

  // Flat top platform for castle
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.3, 12), new THREE.MeshStandardMaterial({ color: 0x767d86, roughness: 1 }))
  top.position.copy(peakPosition)
  top.castShadow = top.receiveShadow = true
  group.add(top)

  // Background mountains (distant, no shadows)
  const bgMat = new THREE.MeshStandardMaterial({ color: 0x8f9aa3, roughness: 1, metalness: 0 })
  for (let i=0;i<6;i++){
    const h = 8 + Math.random()*8
    const r = 4 + Math.random()*4
    const bg = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), bgMat)
    bg.position.set(-20 + Math.random()*40, 0, -20 - Math.random()*30)
    bg.receiveShadow = false
    bg.castShadow = false
    group.add(bg)
  }

  // Cliffs/rocks
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x62686e, roughness: 0.9 })
  for (let i=0;i<8;i++){
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random()*1.2), rockMat)
    r.position.set(-8 + Math.random()*16, 0.3, -4 + Math.random()*10)
    r.castShadow = r.receiveShadow = true
    group.add(r)
  }

  // Trees (instanced: trunk + cone leaves as one merged matrix)
  const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6)
  const leavesGeo = new THREE.ConeGeometry(0.5, 1.0, 6)
  leavesGeo.translate(0, 0.9, 0)
  const treeMatTrunk = new THREE.MeshStandardMaterial({ color: 0x6b4f2a, roughness: 0.9 })
  const treeMatLeaves = new THREE.MeshStandardMaterial({ color: 0x2f6e3a, roughness: 0.8 })

  const treeCount = 120
  const trunks = new THREE.InstancedMesh(trunkGeo, treeMatTrunk, treeCount)
  const leaves = new THREE.InstancedMesh(leavesGeo, treeMatLeaves, treeCount)
  trunks.castShadow = trunks.receiveShadow = true
  leaves.castShadow = true
  const m = new THREE.Matrix4()

  let placed = 0
  while (placed < treeCount){
    const x = -25 + Math.random()*50
    const z = -15 + Math.random()*25
    // Avoid castle plateau area and steep center
    if (new THREE.Vector2(x, z).distanceTo(new THREE.Vector2(0, -6)) < 4) continue
    m.identity().makeTranslation(x, 0.3, z)
    m.multiply(new THREE.Matrix4().makeRotationY(Math.random()*Math.PI*2))
    const s = 0.8 + Math.random()*0.6
    m.multiply(new THREE.Matrix4().makeScale(1, s, 1))
    trunks.setMatrixAt(placed, m)
    leaves.setMatrixAt(placed, m)
    placed++
  }
  trunks.instanceMatrix.needsUpdate = true
  leaves.instanceMatrix.needsUpdate = true
  group.add(trunks, leaves)

  return group
}
