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

    // Castle at peak (build first)
    if (this.castle){ this.castle.removeFrom(this.scene) }
    this.castle = new Castle()
    const peak = getPeakPosition()
    this.castle.root.position.copy(peak)
    this.castle.addTo(this.scene)

    // Cannons (after castle so we can position on top)
    this.createCannons()
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
    for(const c of this.cannons){ c.dispose(this.scene) }
    this.cannons.length = 0

    // If castle exists, compute its top center and place cannon there
    let pos = getPeakPosition().clone().add(new THREE.Vector3(1.6, 0.0, 0.8))
    if (this.castle){
      const box = new THREE.Box3().setFromObject(this.castle.root)
      const center = box.getCenter(new THREE.Vector3())
      pos = new THREE.Vector3(center.x, box.max.y + 0.3, center.z)
    }

    const cannon = new Cannon(this, pos)
    cannon.addTo(this.scene)
    this.cannons.push(cannon)
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
    this.ui.setObjective('Objective: Pop the balloons using the mountain cannon!')

    // Camera to see cannon/peak
    const peak = getPeakPosition()
    this.controls.target.copy(peak)
    this.camera.position.set(peak.x + 6, peak.y + 3, peak.z + 10)

    const count = Math.max(8, this.targetBalloonCount) + (level-1)*3
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
    // Spawn balloons around the mountain peak so the cannon can shoot them
    const center = getPeakPosition()
    const angle = Math.random()*Math.PI*2
    const radius = 3 + Math.random()*5
    const x = center.x + Math.cos(angle) * radius
    const z = center.z + Math.sin(angle) * radius
    const y = center.y + 1.5 + Math.random()*4
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
      // castle spark feedback only (no auto-complete)
      if (this.castle){
        const res = this.castle.hitTest(p.position)
        if (res.hit){
          this.recycleProjectile(p)
          this.score.onHit(res.bonus ? 120 : 60, p.isCannon)
          this.ui.updateScore(this.score.points)
          this.ui.updateCombo(this.score.combo)
          this.ui.playPop()
          // don't end the round on castle hit
          continue
        }
      }

      // balloons
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
