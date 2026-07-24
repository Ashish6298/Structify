import { Router } from 'express';
import { ProjectService } from '../application/project.service.js';

export const projectRouter = Router();
const projectService = new ProjectService();

projectRouter.get('/projects', async (req, res) => {
  const projects = await projectService.getProjects();
  res.json({ data: projects });
});
