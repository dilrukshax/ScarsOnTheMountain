import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Player } from './Player'
import { ScoreManager } from './ScoreManager'
import { UIManager } from '../ui/UIManager'
import { WorldMap } from '../ui/WorldMap'
import { DialogueManager } from '../ui/DialogueManager'
import { Projectile } from '../entities/Projectile'
import { Balloon } from '../entities/Balloon'
import { Cannon } from '../entities/Cannon'
import { createMountainTerrain, getPeakPosition } from '../world/Terrain'
import { createCloudLayer } from '../world/Clouds'
import { Castle } from '../entities/Castle'

export type GameState = 'map' | 'playing' | 'dialogue'

export class Game {
  public renderer: THREE.WebGLRenderer
  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public controls: OrbitControls
  public clock = new THREE.Clock()
  public delta = 0
  public state: GameState = 'map'

  public score = new ScoreManager()
  public ui: UIManager
  public map: WorldMap
  public dialogue: DialogueManager
  public player: Player

  // Pools
  public projectilePool: Projectile[] = []
  public balloonPool: Balloon[] = []

  // Active
  public projectiles: Projectile[] = []
  public balloons: Balloon[] = []
  public cannons: Cannon[] = []

  public castle: Castle | null = null

  private terrainGroup = new THREE.Group()
  private tempVec3 = new THREE.Vector3()
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()

  private targetBalloonCount = 10
  private roundActive = false
  private hitCastleThisRound = false

  constructor(public canvas: HTMLCanvasElement){
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true

    this.scene = new THREE.Scene()
    // Bright blue sky
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.015)

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.set(0, 6, 16)
    this.scene.add(this.camera)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.target.set(0, 4, 0)

    this.addLights()
    this.buildWorld()

    this.ui = new UIManager(this)
    this.map = new WorldMap(this)
    this.dialogue = new DialogueManager(this)
    this.player = new Player(this)

    window.addEventListener('resize', this.onResize)

    this.toMap()
    this.loop()
  }

  public showWorldMap(){ this.toMap() }

  private addLights(){
    // Cooler sky light, greener ground bounce
    const hemi = new THREE.HemisphereLight(0xeaf6ff, 0x3b5a3f, 0.7)
    this.scene.add(hemi)

    const dir = new THREE.DirectionalLight(0xffe9a3, 1.0)
    dir.position.set(-8, 12, -6)
    dir.castShadow = true
    dir.shadow.mapSize.set(2048, 2048)
    dir.shadow.camera.near = 1
    dir.shadow.camera.far = 60
    dir.shadow.camera.left = -20
    dir.shadow.camera.right = 20
    dir.shadow.camera.top = 20
    dir.shadow.camera.bottom = -20
    this.scene.add(dir)

    // Subtle back/rim light
    const rim = new THREE.DirectionalLight(0xffd680, 0.4)
    rim.position.set(6, 8, 10)
    this.scene.add(rim)
  }

  private buildWorld(){
    // Terrain & valley
    this.terrainGroup.clear()
    const terrain = createMountainTerrain()
    this.terrainGroup.add(terrain)
    this.scene.add(this.terrainGroup)

    // Little houses in the valley
    const houses = this.createHouses()
    this.terrainGroup.add(houses)

    // Clouds
    const clouds = createCloudLayer()
    this.scene.add(clouds)

    // Cannons
    this.createCannons()

    // Castle at peak
    if (this.castle){ this.castle.removeFrom(this.scene) }
    this.castle = new Castle()
    const peak = getPeakPosition()
    this.castle.root.position.copy(peak)
    this.castle.addTo(this.scene)
  }

  private createHouses(){
    const group = new THREE.Group()
    const houseMat = new THREE.MeshStandardMaterial({ color: 0x8e6f4e, roughness: 0.9, metalness: 0.0 })
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x4b2e22, roughness: 0.8 })

    for (let i = 0; i < 6; i++){
      const house = new THREE.Group()
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1), houseMat)
      body.castShadow = body.receiveShadow = true
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.6, 4), roofMat)
      roof.position.y = 0.8
      roof.rotation.y = Math.PI * 0.25
      roof.castShadow = true
      house.add(body, roof)
      const x = -6 + Math.random() * 12
      const z = -8 + Math.random() * 6
      house.position.set(x, 0.4, z)
      group.add(house)
    }
    return group
  }

  private createCannons(){
    // Clear existing
    for(const c of this.cannons){ c.dispose(this.scene) }
    this.cannons.length = 0

    const positions = [ new THREE.Vector3(-4, 2.5, -2), new THREE.Vector3(5, 3.2, -3) ]
    for(const p of positions){
      const cannon = new Cannon(this, p)
      cannon.addTo(this.scene)
      this.cannons.push(cannon)
    }
  }

  // Round control
  public startRound(level = 1){
    this.clearEntities()
    this.state = 'playing'
    this.roundActive = true
    this.score.reset()
    this.ui.updateScore(this.score.points)
    this.ui.updateCombo(this.score.combo)
    this.hitCastleThisRound = false
    this.ui.setObjective('Objective: Hit the castle at the mountain peak!')

    // Move camera to face the peak and castle
    this.controls.target.set(0, 6, -6)
    this.camera.position.set(0, 7, 14)

    // fewer balloons, focus on castle objective
    const count = Math.max(5, this.targetBalloonCount - 4) + (level-1)*2
    for (let i = 0; i < count; i++) this.spawnBalloon()
  }

  public completeRound(){
    this.roundActive = false
    this.state = 'dialogue'
    this.dialogue.showRoundComplete()
  }

  public toMap(){
    this.state = 'map'
    this.map.show()
  }

  // Entities
  public spawnProjectile(origin: THREE.Vector3, dir: THREE.Vector3, speed = 40, isCannon = false){
    const p = this.projectilePool.pop() ?? new Projectile(this)
    p.activate(origin, dir, speed, isCannon)
    this.projectiles.push(p)
    p.addTo(this.scene)
  }

  public spawnBalloon(){
    const b = this.balloonPool.pop() ?? new Balloon(this)
    const x = -8 + Math.random()*16
    const y = 3 + Math.random()*6
    const z = -6 - Math.random()*6
    b.activate(new THREE.Vector3(x,y,z))
    this.balloons.push(b)
    b.addTo(this.scene)
  }

  public recycleProjectile(p: Projectile){
    p.removeFrom(this.scene)
    p.deactivate()
    this.projectilePool.push(p)
    const idx = this.projectiles.indexOf(p)
    if (idx>=0) this.projectiles.splice(idx,1)
  }

  public recycleBalloon(b: Balloon){
    b.removeFrom(this.scene)
    b.deactivate()
    this.balloonPool.push(b)
    const idx = this.balloons.indexOf(b)
    if (idx>=0) this.balloons.splice(idx,1)

    if (this.roundActive && this.balloons.length === 0){
      this.completeRound()
    }
  }

  private clearEntities(){
    for(const p of this.projectiles.slice()) this.recycleProjectile(p)
    for(const b of this.balloons.slice()) this.recycleBalloon(b)
  }

  // Expose helpers for raycasting
  public getRaycaster(){ return this.raycaster }
  public getMouse(){ return this.mouse }

  // Collision checks (projectiles vs balloons)
  private checkCollisions(){
    for(const p of this.projectiles){
      // castle check first
      if (this.castle){
        const res = this.castle.hitTest(p.position)
        if (res.hit){
          this.recycleProjectile(p)
          this.score.onHit(res.bonus ? 500 : 250, p.isCannon)
          this.ui.updateScore(this.score.points)
          this.ui.updateCombo(this.score.combo)
          this.hitCastleThisRound = true
          this.ui.playPop()
          // Optional: immediately complete round when castle hit
          this.completeRound()
          return
        }
      }

      for(const b of this.balloons){
        if (!b.active) continue
        const dist = p.position.distanceTo(b.position)
        if (dist < (b.radius + p.radius)){
          b.pop()
          this.recycleProjectile(p)
          this.score.onHit(b.isCannonTarget ? 200 : 100, p.isCannon)
          this.ui.updateScore(this.score.points)
          this.ui.updateCombo(this.score.combo)
          this.ui.playPop()
          break
        }
      }
    }
  }

  private loop = ()=>{
    requestAnimationFrame(this.loop)
    this.delta = this.clock.getDelta()
    this.controls.update()

    // Update entities
    for(const p of this.projectiles) p.update(this.delta)
    for(const b of this.balloons) b.update(this.delta)
    for(const c of this.cannons) c.update(this.delta)
    this.player.update(this.delta)

    if (this.state === 'playing'){
      this.score.update(this.delta)
      this.ui.updateCombo(this.score.combo)
      this.checkCollisions()
    }

    this.renderer.render(this.scene, this.camera)
  }

  private onResize = ()=>{
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}
