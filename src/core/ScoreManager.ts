export class ScoreManager{
  public points = 0
  public combo = 1
  private comboTimer = 0
  private comboResetTime = 3

  reset(){
    this.points = 0
    this.combo = 1
    this.comboTimer = 0
  }

  onHit(basePoints: number, isCannon: boolean){
    const bonus = isCannon ? 2 : 1
    this.points += Math.floor(basePoints * this.combo * bonus)
    this.combo = Math.min(this.combo + 0.25 * bonus, 5)
    this.comboTimer = this.comboResetTime
  }

  update(dt: number){
    if (this.combo > 1){
      this.comboTimer -= dt
      if (this.comboTimer <= 0){
        this.combo = 1
        this.comboTimer = 0
      }
    }
  }
}
