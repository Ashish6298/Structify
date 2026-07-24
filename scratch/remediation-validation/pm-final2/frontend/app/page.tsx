'use client';

import React, { useState } from 'react';

const initialProjects = [
  { id: 'proj_1', name: 'Phoenix Platform Upgrade', code: 'PHX', description: 'Core system migrations.', status: 'active', owner: 'Alice Smith' },
  { id: 'proj_2', name: 'Mobile App Redesign', code: 'MOB', description: 'React Native upgrade.', status: 'planning', owner: 'Bob Jones' }
];

const initialTasks = [
  { id: 'tsk_1', projectId: 'proj_1', title: 'Setup CI/CD pipeline', priority: 'high', status: 'todo', assignee: 'Charlie Brown' },
  { id: 'tsk_2', projectId: 'proj_1', title: 'Database schema migration', priority: 'critical', status: 'in-progress', assignee: 'Alice Smith' },
  { id: 'tsk_3', projectId: 'proj_2', title: 'Design user onboarding flow', priority: 'medium', status: 'done', assignee: 'Bob Jones' }
];

export default function ProjectBoard() {
  const [projects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState<'board' | 'backlog' | 'settings'>('board');
  const [selectedProjectId, setSelectedProjectId] = useState('proj_1');

  const moveTask = (taskId: string, newStatus: 'todo' | 'in-progress' | 'done') => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const filteredTasks = tasks.filter(t => t.projectId === selectedProjectId);
  const currentProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="pm-app">
      <header className="pm-header">
        <div className="header-container">
          <div className="brand" onClick={() => setActiveTab('board')}>📁 VALIDATION-PM PM</div>
          <nav className="nav-links">
            <button className={activeTab === 'board' ? 'active' : ''} onClick={() => setActiveTab('board')}>Kanban Board</button>
            <button className={activeTab === 'backlog' ? 'active' : ''} onClick={() => setActiveTab('backlog')}>Backlog & Sprints</button>
            <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button>
          </nav>
        </div>
      </header>

      <main className="pm-main">
        <div className="project-selector-bar">
          <label>Active Project: </label>
          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
          <span className="owner-badge">Owner: {currentProject?.owner}</span>
        </div>

        {activeTab === 'board' && (
          <div>
            <section className="board-grid">
              {['todo', 'in-progress', 'done'].map(status => (
                <div key={status} className="board-column">
                  <h2 className="column-title">{status.toUpperCase()}</h2>
                  <div className="tasks-container">
                    {filteredTasks.filter(t => t.status === status).map(t => (
                      <div key={t.id} className="task-card">
                        <h3>{t.title}</h3>
                        <div className="task-meta">
                          <span className={`priority-badge ${t.priority}`}>{t.priority}</span>
                          <span className="assignee">{t.assignee}</span>
                        </div>
                        <div className="actions">
                          {status !== 'todo' && <button onClick={() => moveTask(t.id, 'todo')}>Todo</button>}
                          {status !== 'in-progress' && <button onClick={() => moveTask(t.id, 'in-progress')}>Work</button>}
                          {status !== 'done' && <button onClick={() => moveTask(t.id, 'done')}>Done</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {activeTab === 'backlog' && (
          <section className="backlog-section">
            <h2>Product Backlog & Epics</h2>
            <div className="backlog-list">
              {filteredTasks.map(t => (
                <div key={t.id} className="backlog-item">
                  <span className="backlog-id">{t.id}</span>
                  <span className="backlog-title">{t.title}</span>
                  <span className={`priority-badge ${t.priority}`}>{t.priority}</span>
                  <span className="backlog-status">{t.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="settings-section">
            <h2>Project Configuration</h2>
            <div className="settings-form">
              <div className="form-group">
                <label>Project Name</label>
                <input type="text" defaultValue={currentProject?.name} disabled />
              </div>
              <div className="form-group">
                <label>Code Prefix</label>
                <input type="text" defaultValue={currentProject?.code} disabled />
              </div>
              <p className="notice">Settings and access rules are locked in read-only mode. Integrate database storage to persist configurations.</p>
            </div>
          </section>
        )}
      </main>

      <footer className="pm-footer">
        <p>&copy; {new Date().getFullYear()} VALIDATION-PM. Workspaces powered by clean modular fullstack architecture.</p>
      </footer>
    </div>
  );
}
