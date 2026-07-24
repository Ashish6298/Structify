export class TaskService {
  private tasks = [
    { id: 'tsk_1', projectId: 'proj_1', title: 'Setup CI/CD pipeline', priority: 'high', status: 'todo', assignee: 'Charlie Brown' },
    { id: 'tsk_2', projectId: 'proj_1', title: 'Database schema migration', priority: 'critical', status: 'in-progress', assignee: 'Alice Smith' },
    { id: 'tsk_3', projectId: 'proj_2', title: 'Design user onboarding flow', priority: 'medium', status: 'done', assignee: 'Bob Jones' },
  ];

  async getTasks(projectId?: string) {
    if (projectId) return this.tasks.filter(t => t.projectId === projectId);
    return this.tasks;
  }
}
