import { Game } from '../core/Game'

export type DialogueData = {
  nodes: Record<string, { text: string, choices: { text: string, next: string }[] }>
  roundComplete: { text: string, choices: { text: string, next: string }[] }
}

export class DialogueManager{
  private data: DialogueData | null = null

  constructor(private game: Game){
    fetch('/assets/dialogues.json').then(r=>r.json()).then(d=> this.data = d)
  }

  private ensure(){ if (!this.data) throw new Error('Dialogue data not loaded') }

  showNode(key: string){
    this.ensure()
    const node = this.data!.nodes[key]
    if (!node) return
    this.game.ui.showDialogue(node.text, node.choices, (next)=>{
      if (this.data!.nodes[next]) this.showNode(next)
      else this.game.toMap()
    })
  }

  showRoundComplete(){
    this.ensure()
    const n = this.data!.roundComplete
    this.game.ui.showDialogue(n.text, n.choices, (next)=>{
      this.showNode(next)
    })
  }
}
