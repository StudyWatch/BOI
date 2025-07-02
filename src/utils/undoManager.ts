
import { UndoAction } from '../types/shift';

class UndoManager {
  private actions: UndoAction[] = [];
  private currentState: any = null;
  private maxActions = 10;

  saveState(state: any): void {
    const undoAction: UndoAction = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action: state.action || 'פעולה',
      previousState: JSON.parse(JSON.stringify(state)),
      description: state.action || 'פעולה'
    };

    this.actions.unshift(undoAction);
    
    if (this.actions.length > this.maxActions) {
      this.actions = this.actions.slice(0, this.maxActions);
    }

    console.log('Added undo action:', state.action || 'פעולה');
  }

  undo(): any | null {
    const lastAction = this.actions.shift();
    if (lastAction) {
      console.log('Undoing action:', lastAction.description);
      return lastAction.previousState;
    }
    return null;
  }

  getLastAction(): UndoAction | null {
    return this.actions.length > 0 ? this.actions[0] : null;
  }

  clear(): void {
    this.actions = [];
  }

  getAllActions(): UndoAction[] {
    return [...this.actions];
  }
}

export default new UndoManager();
