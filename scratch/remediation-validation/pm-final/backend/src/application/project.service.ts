export class ProjectService {
  private projects = [
    { id: 'proj_1', name: 'Phoenix Platform Upgrade', code: 'PHX', description: 'Core system migrations.', status: 'active', owner: 'Alice Smith' },
    { id: 'proj_2', name: 'Mobile App Redesign', code: 'MOB', description: 'React Native upgrade.', status: 'planning', owner: 'Bob Jones' },
  ];

  async getProjects() {
    return this.projects;
  }
}
