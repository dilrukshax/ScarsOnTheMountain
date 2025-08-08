import { Game } from '../core/Game'

export class UIManager{
  private scoreEl = document.getElementById('score')!
  private comboEl = document.getElementById('combo')!
  private dialogueEl = document.getElementById('dialogue')!
  private dialogueText = document.getElementById('dialogue-text')!
  private dialogueChoices = document.getElementById('dialogue-choices')!
  private dialogueClose = document.getElementById('dialogue-close') as HTMLButtonElement

  private objectiveEl: HTMLElement
  private audioCtx: AudioContext | null = null

  constructor(private game: Game){
    // Create objective label if absent
    const hud = document.getElementById('hud')!
    let obj = document.getElementById('objective') as HTMLElement | null
    if (!obj){
      obj = document.createElement('div')
      obj.id = 'objective'
      obj.style.marginRight = '8px'
      obj.style.fontWeight = 'bold'
      hud.insertBefore(obj, this.comboEl)
    }
    this.objectiveEl = obj

    this.dialogueClose.addEventListener('click', ()=>{
      this.hideDialogue()
      this.game.toMap()
    })
  }

  setObjective(text: string){ this.objectiveEl.textContent = text }

  updateScore(v: number){ this.scoreEl.textContent = `Score: ${v}` }
  updateCombo(v: number){ this.comboEl.textContent = `Combo: x${v.toFixed(2)}` }

  showDialogue(text: string, choices: {text:string, next:string}[], onChoice: (next: string)=>void){
    this.dialogueText.textContent = text
    this.dialogueChoices.innerHTML = ''
    choices.forEach(c=>{
      const b = document.createElement('button')
      b.className = 'btn'
      b.textContent = c.text
      b.onclick = ()=> onChoice(c.next)
      this.dialogueChoices.appendChild(b)
    })
    this.dialogueEl.classList.remove('hidden')
  }

  hideDialogue(){ this.dialogueEl.classList.add('hidden') }

  playShoot(){ this.beep(520, 0.06, 0.2) }
  playPop(){ this.beep(880, 0.08, 0.15) }

  private ensureCtx(){
    if (!this.audioCtx){
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioCtx
  }

  // Minimal beep using Web Audio API
  private beep(freq: number, duration: number, gain: number){
    const ctx = this.ensureCtx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = freq
    g.gain.value = gain
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + duration)
  }
}
