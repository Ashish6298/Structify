import { analyzeProject } from '../intelligence/engine.js';
import { ArchitectureViewModel } from './types.js';
import { createArchitectureView } from './view.js';

export interface ArchitectureNodeDetails {
  name: string;
  path: string;
  type: string;
  importance: string;
  size: number | null;
  lastModified: string | null;
  parent: string | null;
  children: string[];
  metadata: Record<string, unknown>;
}

export interface ArchitectureExplorerModel {
  title: string;
  generatedAt: string;
  projectType: string;
  views: {
    architectural: ArchitectureViewModel;
    complete: ArchitectureViewModel;
  };
  details: Record<string, ArchitectureNodeDetails>;
}

export function createArchitectureExplorerModel(projectPath: string): ArchitectureExplorerModel {
  return createArchitectureExplorerModelFromAnalysis(analyzeProject(projectPath));
}

export function createArchitectureExplorerModelFromAnalysis(
  analysis: ReturnType<typeof analyzeProject>,
): ArchitectureExplorerModel {
  const architectural = createArchitectureView(analysis, 'architectural');
  const complete = createArchitectureView(analysis, 'complete');

  return {
    title: analysis.project.name,
    generatedAt: analysis.generatedAt,
    projectType: analysis.project.type,
    views: {
      architectural,
      complete,
    },
    details: Object.fromEntries(
      analysis.files.map((file) => [
        file.path,
        {
          name: file.name,
          path: file.path,
          type: file.type,
          importance: file.importance,
          size: typeof file.metadata['size'] === 'number' ? (file.metadata['size'] as number) : null,
          lastModified:
            typeof file.metadata['lastModified'] === 'string'
              ? (file.metadata['lastModified'] as string)
              : null,
          parent: file.parent,
          children: file.children,
          metadata: file.metadata,
        } satisfies ArchitectureNodeDetails,
      ]),
    ),
  };
}

export function renderArchitectureExplorerHtml(model: ArchitectureExplorerModel): string {
  const payload = JSON.stringify(model);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(model.title)} Architecture Explorer</title>
  <style>${buildStyles()}</style>
</head>
<body data-theme="light">
  <div class="app">
    <aside class="panel sidebar">
      <div class="panel-header">
        <h1>Architecture Explorer</h1>
        <p class="muted" id="summary-text"></p>
      </div>
      <div class="panel-body">
        <div class="summary-grid" id="summary-grid"></div>
        <div class="controls">
          <label class="sr-only" for="search">Search</label>
          <input id="search" class="search" type="search" placeholder="Search filename, folder, type, category, importance" />
          <div class="button-row">
            <button id="expand-all" type="button">Expand All</button>
            <button id="collapse-all" type="button">Collapse All</button>
            <button id="theme-toggle" type="button">Dark Mode</button>
          </div>
          <div class="button-row">
            <button id="mode-architectural" class="active" type="button">Show Architectural Files</button>
            <button id="mode-complete" type="button">Show Complete Project</button>
          </div>
          <div class="filters" id="filters"></div>
        </div>
        <div class="panel-header mini-header">
          <h2>Statistics</h2>
        </div>
        <div class="stats-grid" id="stats-grid"></div>
      </div>
    </aside>
    <main class="panel main">
      <div class="main-header">
        <div>
          <h2>Project Tree</h2>
          <p class="muted">Sections, folders, and architectural files prepared from the view model.</p>
        </div>
        <span class="badge" id="mode-badge">Architectural</span>
      </div>
      <div class="tree" id="tree" tabindex="0"></div>
    </main>
    <aside class="panel details">
      <div class="panel-header">
        <h2>Details</h2>
        <p class="muted">Select a file to inspect its normalized metadata.</p>
      </div>
      <div class="panel-body" id="details-panel">
        <div class="empty">Select a file node to inspect its details.</div>
      </div>
    </aside>
  </div>
  <script>${buildScript(payload)}</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildStyles(): string {
  return `
:root{color-scheme:light;--bg:#f4f7fb;--panel:rgba(255,255,255,.9);--panel-strong:#fff;--text:#162033;--muted:#5e6a80;--accent:#1064d9;--accent-soft:rgba(16,100,217,.12);--border:rgba(22,32,51,.1);--shadow:0 18px 48px rgba(16,27,52,.14);--critical:#c0392b;--high:#d97706;--medium:#2563eb;--low:#64748b;--surface:linear-gradient(180deg,rgba(255,255,255,.92),rgba(244,247,251,.96))}
body[data-theme="dark"]{color-scheme:dark;--bg:#0f1726;--panel:rgba(15,23,38,.92);--panel-strong:#152033;--text:#edf3ff;--muted:#90a2c0;--accent:#67b7ff;--accent-soft:rgba(103,183,255,.18);--border:rgba(144,162,192,.16);--shadow:0 18px 48px rgba(2,8,23,.45);--critical:#ff8c7b;--high:#ffbe5c;--medium:#7ac5ff;--low:#8ea0ba;--surface:linear-gradient(180deg,rgba(21,32,51,.94),rgba(15,23,38,.96))}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:radial-gradient(circle at top left,rgba(16,100,217,.12),transparent 30%),radial-gradient(circle at bottom right,rgba(217,119,6,.1),transparent 26%),var(--bg);color:var(--text);font-family:"Segoe UI","Aptos",system-ui,sans-serif}body{overflow:hidden}.app{display:grid;grid-template-columns:320px minmax(420px,1fr) 360px;gap:18px;padding:18px;height:100vh}.panel{background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow);overflow:hidden;backdrop-filter:blur(18px)}.sidebar,.details{display:flex;flex-direction:column}.panel-header{padding:18px 20px 10px;border-bottom:1px solid var(--border)}.panel-body{padding:16px 18px 20px;overflow:auto}.mini-header{padding-left:0;padding-right:0;margin-top:18px}h1,h2,h3,p{margin:0}h1{font-size:1.2rem;letter-spacing:-.03em}h2{font-size:.95rem;margin-bottom:10px}.muted{color:var(--muted)}.summary-grid,.stats-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px}.card{background:var(--panel-strong);border:1px solid var(--border);border-radius:14px;padding:12px}.card strong{display:block;font-size:1.15rem;margin-top:4px}.controls{display:grid;gap:10px;margin-top:16px}.search{width:100%;border:1px solid var(--border);border-radius:12px;padding:11px 12px;background:var(--panel-strong);color:var(--text);outline:none;transition:border-color 140ms ease,box-shadow 140ms ease}.search:focus{border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)}.button-row{display:flex;flex-wrap:wrap;gap:8px}button,.toggle{border:1px solid var(--border);background:var(--panel-strong);color:var(--text);border-radius:12px;padding:10px 12px;cursor:pointer;transition:transform 140ms ease,background 140ms ease,border-color 140ms ease}button:hover,.toggle:hover{transform:translateY(-1px);border-color:var(--accent)}.toggle.active,button.active{background:var(--accent-soft);border-color:var(--accent)}.filters{display:flex;flex-wrap:wrap;gap:8px}.main{display:flex;flex-direction:column;min-width:0}.main-header{padding:18px 20px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px}.tree{padding:12px 14px 24px;overflow:auto;height:100%}.section{border:1px solid var(--border);border-radius:16px;background:rgba(255,255,255,.28);margin-bottom:12px;overflow:hidden}body[data-theme="dark"] .section{background:rgba(255,255,255,.02)}.section-header,.tree-node{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;background:transparent;border:0;text-align:left;color:inherit}.section-header:hover,.tree-node:hover,.tree-node:focus-visible{background:var(--accent-soft);outline:none}.section-meta{margin-left:auto;color:var(--muted);font-size:.82rem}.tree-children{padding-left:18px;overflow:hidden;transition:max-height 180ms ease,opacity 180ms ease}.tree-children.collapsed{max-height:0;opacity:0}.tree-children.expanded{max-height:1800px;opacity:1}.chevron{width:10px;height:10px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg);transition:transform 160ms ease;opacity:.7;flex:0 0 10px}.chevron.expanded{transform:rotate(45deg)}.node-label{display:flex;align-items:center;gap:8px;min-width:0}.badge{border-radius:999px;padding:3px 8px;font-size:.72rem;background:var(--accent-soft);color:var(--accent)}.importance-critical{color:var(--critical)}.importance-high{color:var(--high)}.importance-medium{color:var(--medium)}.importance-low{color:var(--low)}.details-list{display:grid;gap:12px}.details-row{border-bottom:1px solid var(--border);padding-bottom:12px}.details-row:last-child{border-bottom:0;padding-bottom:0}pre{margin:0;white-space:pre-wrap;word-break:break-word;font-family:"Cascadia Code","Consolas",monospace;font-size:.78rem;line-height:1.55}.details-row strong{display:block;font-size:.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}.empty{padding:18px;border:1px dashed var(--border);border-radius:14px;color:var(--muted);text-align:center}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}@media (max-width:1200px){.app{grid-template-columns:300px 1fr}.details{grid-column:1 / -1;min-height:300px}}@media (max-width:860px){body{overflow:auto}.app{grid-template-columns:1fr;height:auto}.main,.sidebar,.details{min-height:420px}}`;
}

function buildScript(payload: string): string {
  return `
const explorerData=${payload};
const filters=[{key:'configuration',label:'Configuration',type:'category'},{key:'assets',label:'Assets',type:'category'},{key:'database',label:'Database',type:'category'},{key:'environment',label:'Environment',type:'category'},{key:'component',label:'Components',type:'type'},{key:'controller',label:'Controllers',type:'type'},{key:'service',label:'Services',type:'type'},{key:'repository',label:'Repositories',type:'type'},{key:'page',label:'Pages',type:'type'},{key:'layout',label:'Layouts',type:'type'},{key:'route',label:'Routes',type:'type'},{key:'tests',label:'Hide Tests',type:'exclude-category'},{key:'generated',label:'Hide Generated Files',type:'exclude-generated'},{key:'lockfile',label:'Hide Lock Files',type:'exclude-type'},{key:'cache',label:'Hide Caches',type:'exclude-path'},{key:'node_modules',label:'Hide Node Modules',type:'exclude-path'}];
const state={mode:'architectural',expanded:new Set(),selectedPath:null,query:'',activeFilters:new Set(['generated','tests','lockfile','cache','node_modules'])};
const treeElement=document.getElementById('tree');
const detailsPanel=document.getElementById('details-panel');
const summaryGrid=document.getElementById('summary-grid');
const statsGrid=document.getElementById('stats-grid');
const filtersElement=document.getElementById('filters');
const searchElement=document.getElementById('search');
const summaryText=document.getElementById('summary-text');
const modeBadge=document.getElementById('mode-badge');
initialize();
function initialize(){document.getElementById('expand-all').addEventListener('click',()=>expandAll(true));document.getElementById('collapse-all').addEventListener('click',()=>expandAll(false));document.getElementById('theme-toggle').addEventListener('click',toggleTheme);document.getElementById('mode-architectural').addEventListener('click',()=>setMode('architectural'));document.getElementById('mode-complete').addEventListener('click',()=>setMode('complete'));searchElement.addEventListener('input',(event)=>{state.query=event.target.value.trim().toLowerCase();render();});treeElement.addEventListener('keydown',handleTreeKeyboard);renderFilters();render();}
function renderFilters(){filtersElement.innerHTML='';for(const filter of filters){const button=document.createElement('button');button.type='button';button.className=state.activeFilters.has(filter.key)?'toggle active':'toggle';button.textContent=filter.label;button.addEventListener('click',()=>{state.activeFilters.has(filter.key)?state.activeFilters.delete(filter.key):state.activeFilters.add(filter.key);renderFilters();render();});filtersElement.appendChild(button);}}
function render(){const currentView=explorerData.views[state.mode];const filteredSections=currentView.sections.map(filterSection).filter((section)=>section.childNodes.length>0);renderSummary(currentView);renderStats(currentView.statistics);renderTree(filteredSections);renderModeState();}
function renderSummary(currentView){summaryText.textContent=currentView.projectType+' project • generated '+new Date(explorerData.generatedAt).toLocaleString();summaryGrid.innerHTML='';[['Project',explorerData.title],['Mode',state.mode==='architectural'?'Architectural':'Complete'],['Type',currentView.projectType],['Sections',String(currentView.sections.length)]].forEach(([label,value])=>{const card=document.createElement('div');card.className='card';card.innerHTML='<span class="muted">'+escapeHtml(label)+'</span><strong>'+escapeHtml(value)+'</strong>';summaryGrid.appendChild(card);});}
function renderStats(statistics){statsGrid.innerHTML='';[['Total Files',statistics.totalFiles],['Architectural Files',statistics.architecturalFiles],['Frontend Files',statistics.frontendFiles],['Backend Files',statistics.backendFiles],['Configuration Files',statistics.configuration],['Assets',statistics.assets],['Database Files',statistics.databaseFiles]].forEach(([label,value])=>{const card=document.createElement('div');card.className='card';card.innerHTML='<span class="muted">'+escapeHtml(label)+'</span><strong>'+escapeHtml(String(value))+'</strong>';statsGrid.appendChild(card);});}
function renderModeState(){document.getElementById('mode-architectural').classList.toggle('active',state.mode==='architectural');document.getElementById('mode-complete').classList.toggle('active',state.mode==='complete');modeBadge.textContent=state.mode==='architectural'?'Architectural':'Complete';}
function renderTree(sections){treeElement.innerHTML='';if(sections.length===0){treeElement.innerHTML='<div class="empty">No nodes match the current filters.</div>';return;}sections.forEach((section)=>{const sectionElement=document.createElement('section');sectionElement.className='section';const header=document.createElement('button');header.type='button';header.className='section-header';header.innerHTML='<span class="chevron '+(isExpanded(section.id)?'expanded':'')+'"></span><span class="node-label"><strong>'+escapeHtml(section.title)+'</strong><span class="badge importance-'+escapeHtml(section.importance)+'">'+escapeHtml(section.importance)+'</span></span><span class="section-meta">'+section.counts.files+' files • '+section.counts.folders+' folders</span>';header.addEventListener('click',()=>toggleExpanded(section.id));sectionElement.appendChild(header);const children=document.createElement('div');children.className='tree-children '+(isExpanded(section.id)?'expanded':'collapsed');section.childNodes.forEach((node)=>children.appendChild(renderNode(node,0)));sectionElement.appendChild(children);treeElement.appendChild(sectionElement);});}
function renderNode(node,depth){const wrapper=document.createElement('div');const button=document.createElement('button');button.type='button';button.className='tree-node';button.dataset.path=node.path;button.style.paddingLeft=(14+depth*16)+'px';const hasChildren=node.children.length>0;button.innerHTML='<span class="chevron '+(hasChildren&&isExpanded(node.id)?'expanded':'')+'" style="visibility:'+(hasChildren?'visible':'hidden')+'"></span><span class="node-label"><span>'+escapeHtml(node.name)+'</span><span class="badge">'+escapeHtml(node.type)+'</span><span class="badge importance-'+escapeHtml(node.importance)+'">'+escapeHtml(node.importance)+'</span></span>';button.addEventListener('click',()=>{if(hasChildren&&node.kind!=='file'){toggleExpanded(node.id);}else{selectNode(node.path);}});button.addEventListener('dblclick',()=>selectNode(node.path));wrapper.appendChild(button);if(hasChildren){const childWrapper=document.createElement('div');childWrapper.className='tree-children '+(isExpanded(node.id)?'expanded':'collapsed');node.children.forEach((child)=>childWrapper.appendChild(renderNode(child,depth+1)));wrapper.appendChild(childWrapper);}return wrapper;}
function filterSection(section){return{...section,childNodes:section.childNodes.map(filterNode).filter(Boolean)};}
function filterNode(node){const matchesChildren=node.children.map(filterNode).filter(Boolean);const details=explorerData.details[node.path];const haystack=[node.name,node.path,node.type,node.importance,node.category,details?Object.keys(details.metadata).join(' '):''].join(' ').toLowerCase();const queryMatch=state.query.length===0||haystack.includes(state.query);const filterMatch=passesFilters(node,details);if(queryMatch&&filterMatch||matchesChildren.length>0){return{...node,children:matchesChildren};}return null;}
function passesFilters(node,details){for(const filter of filters){if(!state.activeFilters.has(filter.key)){continue;}if(filter.type==='category'&&node.category!==filter.key){return false;}if(filter.type==='type'&&node.type!==filter.key){return false;}if(filter.type==='exclude-category'&&node.category===filter.key){return false;}if(filter.type==='exclude-type'&&node.type===filter.key){return false;}if(filter.type==='exclude-generated'&&details&&details.metadata.generated===true){return false;}if(filter.type==='exclude-path'&&node.path.includes(filter.key)){return false;}}return true;}
function toggleExpanded(id){state.expanded.has(id)?state.expanded.delete(id):state.expanded.add(id);render();}
function expandAll(expanded){state.expanded.clear();if(expanded){explorerData.views[state.mode].sections.forEach((section)=>{state.expanded.add(section.id);flattenNodes(section.childNodes).forEach((node)=>{if(node.children.length>0){state.expanded.add(node.id);}});});}render();}
function flattenNodes(nodes){return nodes.flatMap((node)=>[node,...flattenNodes(node.children)]);}
function isExpanded(id){return state.expanded.has(id);}
function selectNode(filePath){state.selectedPath=filePath;const details=explorerData.details[filePath];if(!details){detailsPanel.innerHTML='<div class="empty">No file metadata is available for this node.</div>';return;}detailsPanel.innerHTML='';const rows=[['Name',details.name],['Path',details.path],['Type',details.type],['Importance',details.importance],['Size',details.size===null?'n/a':details.size+' bytes'],['Last Modified',details.lastModified||'n/a'],['Parent',details.parent||'n/a'],['Children',details.children.length?details.children.join(', '):'none'],['Metadata',JSON.stringify(details.metadata,null,2)]];const container=document.createElement('div');container.className='details-list';rows.forEach(([label,value])=>{const row=document.createElement('div');row.className='details-row';row.innerHTML='<strong>'+escapeHtml(label)+'</strong><pre>'+escapeHtml(String(value))+'</pre>';container.appendChild(row);});detailsPanel.appendChild(container);}
function toggleTheme(){const dark=document.body.dataset.theme==='dark';document.body.dataset.theme=dark?'light':'dark';document.getElementById('theme-toggle').textContent=dark?'Dark Mode':'Light Mode';}
function setMode(mode){state.mode=mode;state.selectedPath=null;render();detailsPanel.innerHTML='<div class="empty">Select a file node to inspect its details.</div>';}
function handleTreeKeyboard(event){const interactive=Array.from(treeElement.querySelectorAll('.tree-node,.section-header'));const currentIndex=interactive.findIndex((element)=>element===document.activeElement);if(event.key==='ArrowDown'){event.preventDefault();const next=interactive[Math.min(currentIndex+1,interactive.length-1)];if(next)next.focus();}if(event.key==='ArrowUp'){event.preventDefault();const previous=interactive[Math.max(currentIndex-1,0)];if(previous)previous.focus();}if(event.key==='Enter'&&document.activeElement?.dataset?.path){event.preventDefault();selectNode(document.activeElement.dataset.path);}}
function escapeHtml(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}`;
}
