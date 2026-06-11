/** Message in the dialog history */
export interface DialogMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** EGE task definition */
export interface Task {
  id: string;
  /** EGE task number (e.g. 17, 25, 27) */
  number: number;
  title: string;
  /** Full task description text */
  description: string;
  /** Initial code template (if any) */
  starterCode?: string;
}
