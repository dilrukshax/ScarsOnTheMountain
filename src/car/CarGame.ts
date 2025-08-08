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
  private baseSpeed = 12
  private speed = this.baseSpeed
  private targetSpeed = this.baseSpeed
  private maxSpeed = 26
  private minSpeed = 6
  private lateral = 0
  private maxLateral = 3
  private obs: THREE.Mesh[] = []
  private laneMarks: THREE.Mesh[] = []
  private trees: THREE.Group[] = []
  private running = false
  private score = 0
  private swayTime = 0

  private keyState: Record<string,boolean> = {}

  constructor(private canvas: HTMLCanvasElement){
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true

    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.02)

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 2000)
    this.camera.position.set(0, 4, 8)
    this.scene.add(this.camera)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enabled = false

    const hemi = new THREE.HemisphereLight(0xeaf6ff, 0x3b5a3f, 0.9)
    this.scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xffffff, 0.8)
    sun.position.set(10, 20, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 50
    // cover road area
    ;(sun.shadow.camera as THREE.OrthographicCamera).left = -12
    ;(sun.shadow.camera as THREE.OrthographicCamera).right = 12
    ;(sun.shadow.camera as THREE.OrthographicCamera).top = 12
    ;(sun.shadow.camera as THREE.OrthographicCamera).bottom = -12
    this.scene.add(sun)

    // Infinite road (repeating by moving obstacles backwards)
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 })
    this.road = new THREE.Mesh(new THREE.PlaneGeometry(20, 220), roadMat)
    this.road.rotation.x = -Math.PI/2
    this.road.position.z = -90
    this.road.receiveShadow = true
    this.scene.add(this.road)

    // Lane markers (store for animation)
    const laneMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    for (let i=0;i<20;i++){
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2), laneMat)
      mark.rotation.x = -Math.PI/2
      mark.position.set(0, 0.011, -i*10)
      this.scene.add(mark)
      this.laneMarks.push(mark)
    }

    // Simple F1 player car, distinct look
    this.car = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.45, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xff143a, metalness: 0.2, roughness: 0.5 })
    )
    body.position.y = 0.4
    body.castShadow = true
    const cockpit = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.1 }))
    cockpit.rotation.z = Math.PI/2
    cockpit.position.set(0.1, 0.65, -0.2)
    cockpit.castShadow = true
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 2.0), new THREE.MeshStandardMaterial({ color: 0xffffff }))
    stripe.position.set(0, 0.68, 0)
    const rearWing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.6), new THREE.MeshStandardMaterial({ color: 0x111111 }))
    rearWing.position.set(0, 0.72, -1.2)
    rearWing.castShadow = true
    const frontWing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.35), new THREE.MeshStandardMaterial({ color: 0x111111 }))
    frontWing.position.set(0, 0.32, 1.25)
    frontWing.castShadow = true
    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xdd0000, emissiveIntensity: 1.2 }))
    tailLight.position.set(0, 0.4, -1.25)

    const wheels: THREE.Mesh[] = []
    for (let i=0;i<4;i++){
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 18), new THREE.MeshStandardMaterial({ color: 0x0d0d0d, metalness: 0.0, roughness: 0.9 }))
      w.rotation.z = Math.PI/2
      const sx = i<2 ? -0.65 : 0.65
      const sz = i%2===0 ? 0.9 : -0.9
      w.position.set(sx, 0.26, sz)
      w.castShadow = true
      wheels.push(w)
      this.car.add(w)
    }
    this.car.add(body, cockpit, stripe, rearWing, frontWing, tailLight)
    this.scene.add(this.car)

    // Road-side trees
    this.buildTrees()

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
    for (let i=0;i<22;i++) this.spawnObstacle(-i*20 - 30)
  }

  private spawnObstacle(z: number){
    const laneX = [-3, 0, 3][Math.floor(Math.random()*3)]
    const car = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 2.0), new THREE.MeshStandardMaterial({ color: 0x2266ff, metalness: 0.1, roughness: 0.8 }))
    car.position.set(laneX, 0.4, z)
    car.castShadow = true
    car.receiveShadow = false
    this.scene.add(car)
    this.obs.push(car)
  }

  private buildTrees(){
    const makeTree = (isLeft: boolean)=>{
      const tree = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x7b4a2d, roughness: 0.9 }))
      trunk.position.y = 0.6
      trunk.castShadow = true
      trunk.receiveShadow = true
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.7 }))
      crown.position.y = 1.4
      crown.castShadow = true
      tree.add(trunk, crown)
      tree.position.x = (isLeft ? -7.5 : 7.5) + (Math.random()*0.8 - 0.4)
      tree.position.y = 0
      tree.position.z = -Math.random()*180 - 20
      this.scene.add(tree)
      this.trees.push(tree)
    }
    // populate both sides
    for (let i=0;i<30;i++){ makeTree(true); makeTree(false) }
  }

  private loop = ()=>{
    if (!this.running) return
    const dt = this.clock.getDelta()
    this.swayTime += dt

    // Controls: arrows / A-D; Up/Down for speed
    if (this.keyState['arrowleft'] || this.keyState['a']) this.lateral -= 10*dt
    if (this.keyState['arrowright'] || this.keyState['d']) this.lateral += 10*dt
    this.lateral = THREE.MathUtils.clamp(this.lateral, -this.maxLateral, this.maxLateral)

    const accel = (this.keyState['arrowup'] || this.keyState['w'])
    const brake = (this.keyState['arrowdown'] || this.keyState['s'])
    if (accel) this.targetSpeed = Math.min(this.targetSpeed + 20*dt, this.maxSpeed)
    else this.targetSpeed = this.baseSpeed
    if (brake) this.targetSpeed = Math.max(this.minSpeed, this.targetSpeed - 30*dt)
    this.speed = THREE.MathUtils.lerp(this.speed, this.targetSpeed, 2*dt)

    // Dynamic FOV for speed feel
    const targetFov = THREE.MathUtils.mapLinear(this.speed, this.minSpeed, this.maxSpeed, 68, 82)
    this.camera.fov += (targetFov - this.camera.fov) * 3 * dt
    this.camera.updateProjectionMatrix()

    // Move car laterally
    this.car.position.x = this.lateral

    // Scroll obstacles
    for (const o of this.obs){ o.position.z += this.speed * dt }

    // Scroll lane markers and recycle
    for (const m of this.laneMarks){
      m.position.z += this.speed * dt
      if (m.position.z > 6){ m.position.z = -180 - Math.random()*40 }
    }

    // Trees parallax + subtle sway
    for (const t of this.trees){
      t.position.z += (this.speed * dt)
      // gentle wind sway
      t.rotation.z = Math.sin(this.swayTime + t.position.x) * 0.03
      if (t.position.z > 8){
        t.position.z = -200 - Math.random()*80
        // slight lane-wise jitter so it doesn't look uniform
        t.position.x += (Math.random()*0.6 - 0.3)
        t.position.x = THREE.MathUtils.clamp(t.position.x, -8.5, 8.5)
      }
    }

    // Recycle obstacles and increment score when passed
    for (const o of this.obs){
      if (o.position.z > 6){
        o.position.z = -220 - Math.random()*140
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

    // Camera follow with slight lateral lag
    this.camera.position.lerp(new THREE.Vector3(this.car.position.x * 0.8, 4, 8), 0.08)
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
