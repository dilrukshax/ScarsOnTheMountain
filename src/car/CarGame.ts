import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class CarGame{
  public scene = new THREE.Scene()
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  public controls: OrbitControls
  public clock = new THREE.Clock()
  private road: THREE.Mesh
  private car: THREE.Group
  private speed = 12
  private lateral = 0
  private maxLateral = 3
  private obs: THREE.Mesh[] = []
  private running = false
  private score = 0

  private keyState: Record<string,boolean> = {}

  constructor(private canvas: HTMLCanvasElement){
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))

    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.02)

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 2000)
    this.camera.position.set(0, 4, 8)
    this.scene.add(this.camera)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enabled = false

    const hemi = new THREE.HemisphereLight(0xeaf6ff, 0x3b5a3f, 0.9)
    this.scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xffffff, 0.6)
    sun.position.set(10, 20, 10)
    this.scene.add(sun)

    // Infinite road (repeating by moving obstacles backwards)
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 })
    this.road = new THREE.Mesh(new THREE.PlaneGeometry(20, 200), roadMat)
    this.road.rotation.x = -Math.PI/2
    this.road.position.z = -80
    this.scene.add(this.road)

    // Lane markers
    const laneMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    for (let i=0;i<15;i++){
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2), laneMat)
      mark.rotation.x = -Math.PI/2
      mark.position.set(0, 0.01, -i*12)
      this.scene.add(mark)
    }

    // Simple F1 car: low-poly body + wheels
    this.car = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 2.2), new THREE.MeshStandardMaterial({ color: 0xff3344 }))
    body.position.y = 0.4
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.6), new THREE.MeshStandardMaterial({ color: 0x222222 }))
    wing.position.set(0, 0.7, -1.1)
    const fw = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.3), new THREE.MeshStandardMaterial({ color: 0x222222 }))
    fw.position.set(0, 0.3, 1.2)
    const wheels: THREE.Mesh[] = []
    for (let i=0;i<4;i++){
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0x111111 }))
      w.rotation.z = Math.PI/2
      const sx = i<2 ? -0.6 : 0.6
      const sz = i%2===0 ? 0.8 : -0.8
      w.position.set(sx, 0.25, sz)
      wheels.push(w)
      this.car.add(w)
    }
    this.car.add(body, wing, fw)
    this.scene.add(this.car)

    window.addEventListener('resize', this.onResize)
    window.addEventListener('keydown', (e)=> this.keyState[e.key.toLowerCase()] = true)
    window.addEventListener('keyup', (e)=> this.keyState[e.key.toLowerCase()] = false)
  }

  start(){
    this.running = true
    this.score = 0
    this.spawnInitialObstacles()
    this.loop()
  }

  stop(){ this.running = false }

  private spawnInitialObstacles(){
    this.obs.forEach(o=> this.scene.remove(o))
    this.obs = []
    for (let i=0;i<20;i++) this.spawnObstacle(-i*20 - 30)
  }

  private spawnObstacle(z: number){
    const laneX = [-3, 0, 3][Math.floor(Math.random()*3)]
    const car = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 2.0), new THREE.MeshStandardMaterial({ color: 0x2266ff }))
    car.position.set(laneX, 0.4, z)
    this.scene.add(car)
    this.obs.push(car)
  }

  private loop = ()=>{
    if (!this.running) return
    const dt = this.clock.getDelta()

    // Controls: arrows / A-D
    if (this.keyState['arrowleft'] || this.keyState['a']) this.lateral -= 10*dt
    if (this.keyState['arrowright'] || this.keyState['d']) this.lateral += 10*dt
    this.lateral = THREE.MathUtils.clamp(this.lateral, -this.maxLateral, this.maxLateral)

    // Move car laterally; road scroll by moving obstacles forward
    this.car.position.x = this.lateral

    for (const o of this.obs){
      o.position.z += this.speed * dt
    }

    // Recycle obstacles and increment score when passed
    for (const o of this.obs){
      if (o.position.z > 6){
        o.position.z = -200 - Math.random()*100
        o.position.x = [-3,0,3][Math.floor(Math.random()*3)]
        this.score += 1
      }
    }

    // Simple collision check
    for (const o of this.obs){
      if (Math.abs(o.position.x - this.car.position.x) < 1.0 && Math.abs(o.position.z - this.car.position.z) < 1.8){
        this.stop()
        alert('Crash! Score: ' + this.score)
        break
      }
    }

    // Camera follow
    this.camera.position.lerp(new THREE.Vector3(this.car.position.x, 4, 8), 0.08)
    this.camera.lookAt(this.car.position.x, 0.5, this.car.position.z - 6)

    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.loop)
  }

  private onResize = ()=>{
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}
