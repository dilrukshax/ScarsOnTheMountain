import * as THREE from 'three'

export function createCloudLayer(){
  const group = new THREE.Group()
  const tex = new THREE.TextureLoader().load('/assets/cloud.svg')
  tex.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false })

  for (let i=0;i<10;i++){
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), mat.clone())
    plane.position.set(-12 + Math.random()*24, 5 + Math.random()*5, -4 - Math.random()*12)
    plane.rotation.y = Math.random()*Math.PI
    plane.userData.speed = 0.2 + Math.random()*0.3
    group.add(plane)
  }

  // animate drift
  let t = 0
  const animate = ()=>{
    t += 1/60
    group.children.forEach((p: any, idx)=>{
      p.position.x += Math.sin(t * 0.3 + idx) * 0.002 * p.userData.speed
      p.position.z += p.userData.speed * 0.003
      if (p.position.z > 4) p.position.z = -16
    })
    requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)

  return group
}
