type TaskStatus = 'à faire' | 'en cours' | 'terminée' | 'bloquée';
type TaskPriority = 'basse' | 'moyenne' | 'haute';
type SortOrder = 'asc' | 'desc';

interface TaskData {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    createdAt: string;
    color: string;
}

interface PartialTaskData {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
}

class Task {
    public readonly id: string;
    public title: string;
    public description: string;
    public status: TaskStatus;
    public priority: TaskPriority;
    public readonly createdAt: Date;
    public readonly color: string;

    constructor(title: string, description: string = '', status: TaskStatus = 'à faire', priority: TaskPriority = 'moyenne') {
        this.validateInputs(title, status);
        
        this.id = this.generateId();
        this.title = title.trim();
        this.description = description.trim();
        this.status = status;
        this.priority = priority;
        this.createdAt = new Date();
        this.color = this.getColorByStatus(status);
    }

    private validateInputs(title: string, status: TaskStatus): void {
        if (!title || title.trim().length === 0) {
            throw new Error('Le titre de la tâche ne peut pas être vide');
        }
        
        const validStatuses: TaskStatus[] = ['à faire', 'en cours', 'terminée', 'bloquée'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Statut invalide. Les statuts autorisés sont : ${validStatuses.join(', ')}`);
        }
    }

    private generateId(): string {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getColorByStatus(status: TaskStatus): string {
        const colorMap: Record<TaskStatus, string> = {
            'à faire': '#3498db',
            'en cours': '#f39c12',
            'terminée': '#27ae60',
            'bloquée': '#e74c3c'
        };
        return colorMap[status];
    }

    public update(partialData: PartialTaskData): void {
        if (partialData.title !== undefined) {
            if (!partialData.title || partialData.title.trim().length === 0) {
                throw new Error('Le titre de la tâche ne peut pas être vide');
            }
            this.title = partialData.title.trim();
        }
        
        if (partialData.description !== undefined) {
            this.description = partialData.description.trim();
        }
        
        if (partialData.status !== undefined) {
            const validStatuses: TaskStatus[] = ['à faire', 'en cours', 'terminée', 'bloquée'];
            if (!validStatuses.includes(partialData.status)) {
                throw new Error(`Statut invalide. Les statuts autorisés sont : ${validStatuses.join(', ')}`);
            }
            this.status = partialData.status;
            (this as any).color = this.getColorByStatus(partialData.status);
        }
        
        if (partialData.priority !== undefined) {
            this.priority = partialData.priority;
        }
    }

    public toJSON(): TaskData {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            status: this.status,
            priority: this.priority,
            createdAt: this.createdAt.toISOString(),
            color: this.color
        };
    }

    public static fromJSON(data: TaskData): Task {
        const task = new Task(data.title, data.description, data.status, data.priority);
        (task as any).id = data.id;
        (task as any).createdAt = new Date(data.createdAt);
        (task as any).color = data.color;
        return task;
    }
}

class TaskManager {
    private tasks: Task[] = [];
    private currentFilter: TaskStatus | 'all' = 'all';
    private currentSearch: string = '';
    public currentSort: string = 'date-desc';
    private draggedElement: HTMLElement | null = null;

    constructor() {
        this.load();
        this.addSampleData();
    }

    public add(task: Task): Task {
        this.tasks.push(task);
        this.save();
        this.updateUI();
        return task;
    }

    public getAll(): Task[] {
        return [...this.tasks];
    }

    public findById(id: string): Task | undefined {
        return this.tasks.find(task => task.id === id);
    }

    public update(id: string, partialData: PartialTaskData): boolean {
        const task = this.findById(id);
        if (!task) {
            return false;
        }
        
        try {
            task.update(partialData);
            this.save();
            this.updateUI();
            return true;
        } catch (error) {
            return false;
        }
    }

    public remove(id: string): boolean {
        const index = this.tasks.findIndex(task => task.id === id);
        if (index === -1) {
            return false;
        }
        
        this.tasks.splice(index, 1);
        this.save();
        this.updateUI();
        return true;
    }

    public filterByStatus(status: TaskStatus | 'all'): Task[] {
        this.currentFilter = status;
        this.updateUI();
        return this.getFilteredTasks();
    }

    public search(text: string): Task[] {
        this.currentSearch = text.toLowerCase();
        this.updateUI();
        return this.getFilteredTasks();
    }

    public sortByDate(order: SortOrder = 'desc'): Task[] {
        this.currentSort = `date-${order}`;
        this.updateUI();
        return this.getFilteredTasks();
    }

    public sortByTitle(order: SortOrder = 'asc'): Task[] {
        this.currentSort = `title-${order}`;
        this.updateUI();
        return this.getFilteredTasks();
    }

    public sortByPriority(order: SortOrder = 'desc'): Task[] {
        this.currentSort = `priority-${order}`;
        this.updateUI();
        return this.getFilteredTasks();
    }

    public getFilteredTasks(): Task[] {
        let filteredTasks = [...this.tasks];

        if (this.currentFilter !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.status === this.currentFilter);
        }

        if (this.currentSearch) {
            filteredTasks = filteredTasks.filter(task => 
                task.title.toLowerCase().includes(this.currentSearch) ||
                task.description.toLowerCase().includes(this.currentSearch)
            );
        }

        if (this.currentSort !== 'manual') {
            filteredTasks.sort((a, b) => {
                switch (this.currentSort) {
                    case 'date-asc':
                        return a.createdAt.getTime() - b.createdAt.getTime();
                    case 'date-desc':
                        return b.createdAt.getTime() - a.createdAt.getTime();
                    case 'title-asc':
                        return a.title.localeCompare(b.title);
                    case 'title-desc':
                        return b.title.localeCompare(a.title);
                    case 'priority-desc':
                        const priorityOrder = { 'haute': 3, 'moyenne': 2, 'basse': 1 };
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                    case 'priority-asc':
                        const priorityOrderAsc = { 'haute': 3, 'moyenne': 2, 'basse': 1 };
                        return priorityOrderAsc[a.priority] - priorityOrderAsc[b.priority];
                    default:
                        return 0;
                }
            });
        }

        return filteredTasks;
    }

    public getStats(): Record<string, number> {
        const stats: Record<string, number> = {
            all: this.tasks.length,
            'à faire': 0,
            'en cours': 0,
            'terminée': 0,
            'bloquée': 0
        };

        this.tasks.forEach(task => {
            const status = task.status;
            if (stats[status] !== undefined) {
                stats[status]++;
            }
        });

        return stats;
    }

    public save(): void {
        try {
            const tasksData = this.tasks.map(task => task.toJSON());
            localStorage.setItem('tasks', JSON.stringify(tasksData));
        } catch (error) {
        }
    }

    public load(): void {
        try {
            const savedTasks = localStorage.getItem('tasks');
            if (savedTasks) {
                const tasksData: TaskData[] = JSON.parse(savedTasks);
                this.tasks = tasksData.map(data => Task.fromJSON(data));
            }
        } catch (error) {
            this.tasks = [];
        }
    }

    public clearAll(): void {
        this.tasks = [];
        this.save();
        this.updateUI();
    }

    public updateUI(): void {
        this.updateStats();
        this.renderTasks();
    }

    private setupDragAndDrop(): void {
        const taskCards = document.querySelectorAll('.task-card');
        
        taskCards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                const target = e.currentTarget as HTMLElement;
                this.draggedElement = target;
                target.classList.add('dragging');
                (e as DragEvent).dataTransfer!.setData('text/plain', target.dataset['id'] || '');
                (e as DragEvent).dataTransfer!.effectAllowed = 'move';
            });

            card.addEventListener('dragend', () => {
                if (this.draggedElement) {
                    this.draggedElement.classList.remove('dragging');
                }
                document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
                this.draggedElement = null;
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                (e as DragEvent).dataTransfer!.dropEffect = 'move';
                const target = e.currentTarget as HTMLElement;
                target.classList.add('drag-over');
            });

            card.addEventListener('dragleave', (e) => {
                const target = e.currentTarget as HTMLElement;
                target.classList.remove('drag-over');
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const target = e.currentTarget as HTMLElement;
                target.classList.remove('drag-over');
                
                const draggedId = (e as DragEvent).dataTransfer!.getData('text/plain');
                const targetId = target.dataset['id'];
                
                if (draggedId && targetId && draggedId !== targetId) {
                    this.reorderTasks(draggedId, targetId);
                }
            });
        });
    }

    private reorderTasks(draggedId: string, targetId: string): void {
        const draggedIndex = this.tasks.findIndex(task => task.id === draggedId);
        const targetIndex = this.tasks.findIndex(task => task.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        const draggedTask = this.tasks[draggedIndex];
        const targetTask = this.tasks[targetIndex];
        
        this.tasks[draggedIndex] = targetTask;
        this.tasks[targetIndex] = draggedTask;
        
        this.currentSort = 'manual';
        
        this.save();
        this.updateUI();
    }

    private renderTasks(): void {
        const tasksList = document.getElementById('tasks-list') as HTMLElement;
        const emptyState = document.getElementById('empty-state') as HTMLElement;
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            tasksList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        tasksList.style.display = 'grid';
        emptyState.style.display = 'none';

        tasksList.innerHTML = filteredTasks.map(task => this.createTaskCard(task)).join('');
        
        setTimeout(() => {
            this.setupDragAndDrop();
        }, 10);
    }

    private createTaskCard(task: Task): string {
        const createdDate = new Date(task.createdAt).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="task-card" data-status="${task.status}" data-id="${task.id}" draggable="true">
                <div class="task-header">
                    <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                    <div class="task-actions">
                        <button class="task-action-btn" onclick="editTask('${task.id}')" title="Modifier">✏️</button>
                        <button class="task-action-btn" onclick="deleteTask('${task.id}')" title="Supprimer">🗑️</button>
                    </div>
                </div>
                ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                <div class="task-footer">
                    <span class="task-status" data-status="${task.status}" onclick="quickEditStatus('${task.id}')">
                        ${task.status}
                    </span>
                    <span class="task-priority" data-priority="${task.priority}" onclick="quickEditPriority('${task.id}')">
                        ${task.priority}
                    </span>
                    <span class="task-date">${createdDate}</span>
                </div>
            </div>
        `;
    }

    private updateStats(): void {
        const stats = this.getStats();
        
        document.getElementById('total-tasks')!.textContent = stats['all']?.toString() || '0';
        document.getElementById('todo-tasks')!.textContent = stats['à faire']?.toString() || '0';
        document.getElementById('in-progress-tasks')!.textContent = stats['en cours']?.toString() || '0';
        document.getElementById('completed-tasks')!.textContent = stats['terminée']?.toString() || '0';
        document.getElementById('blocked-tasks')!.textContent = stats['bloquée']?.toString() || '0';
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private addSampleData(): void {
        if (this.tasks.length === 0) {
            const sampleTasks = [
                new Task('Créer une API REST', 'Développer une API avec Node.js et Express pour le projet', 'à faire', 'haute'),
                new Task('Design de l\'interface', 'Créer les maquettes et prototypes de l\'application', 'en cours', 'moyenne'),
                new Task('Tests unitaires', 'Écrire les tests pour toutes les fonctionnalités', 'à faire', 'haute'),
                new Task('Documentation', 'Rédiger la documentation technique du projet', 'bloquée', 'basse'),
                new Task('Déploiement', 'Mettre en production sur le serveur', 'terminée', 'moyenne'),
                new Task('Réunion équipe', 'Préparer la réunion hebdomadaire avec l\'équipe', 'à faire', 'basse')
            ];
            
            sampleTasks.forEach(task => this.tasks.push(task));
            this.save();
        }
    }

}

const taskManager = new TaskManager();

let editingTaskId: string | null = null;

function editTask(id: string): void {
    const task = taskManager.findById(id);
    if (!task) return;

    editingTaskId = id;
    
    (document.getElementById('task-title') as HTMLInputElement).value = task.title;
    (document.getElementById('task-description') as HTMLTextAreaElement).value = task.description;
    (document.getElementById('task-status') as HTMLSelectElement).value = task.status;
    (document.getElementById('task-priority') as HTMLSelectElement).value = task.priority;
    
    document.getElementById('form-title')!.textContent = 'Modifier la tâche';
    (document.getElementById('submit-btn') as HTMLButtonElement).textContent = 'Modifier';
    (document.getElementById('cancel-btn') as HTMLButtonElement).style.display = 'inline-block';
    
    document.querySelector('.form-section')?.scrollIntoView({ behavior: 'smooth' });
}

function deleteTask(id: string): void {
    const modal = document.getElementById('delete-modal') as HTMLElement;
    modal.style.display = 'block';
    
    (document.getElementById('confirm-delete') as HTMLButtonElement).onclick = () => {
        taskManager.remove(id);
        modal.style.display = 'none';
    };
}

function quickEditStatus(id: string): void {
    const task = taskManager.findById(id);
    if (!task) return;

    const statuses: TaskStatus[] = ['à faire', 'en cours', 'terminée', 'bloquée'];
    const currentIndex = statuses.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const newStatus = statuses[nextIndex];

    if (newStatus) {
        taskManager.update(id, { status: newStatus });
    }
}

function quickEditPriority(id: string): void {
    const task = taskManager.findById(id);
    if (!task) return;

    const priorities: TaskPriority[] = ['basse', 'moyenne', 'haute'];
    const currentIndex = priorities.indexOf(task.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    const newPriority = priorities[nextIndex];

    if (newPriority) {
        taskManager.update(id, { priority: newPriority });
    }
}

function cancelEdit(): void {
    editingTaskId = null;
    resetForm();
}

function resetForm(): void {
    (document.getElementById('task-form') as HTMLFormElement).reset();
    document.getElementById('form-title')!.textContent = 'Ajouter une nouvelle tâche';
    (document.getElementById('submit-btn') as HTMLButtonElement).textContent = 'Ajouter';
    (document.getElementById('cancel-btn') as HTMLButtonElement).style.display = 'none';
    document.getElementById('title-error')!.textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form') as HTMLFormElement;
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = (document.getElementById('task-title') as HTMLInputElement).value;
        const description = (document.getElementById('task-description') as HTMLTextAreaElement).value;
        const status = (document.getElementById('task-status') as HTMLSelectElement).value as TaskStatus;
        const priority = (document.getElementById('task-priority') as HTMLSelectElement).value as TaskPriority;
        
        try {
            if (editingTaskId) {
                const success = taskManager.update(editingTaskId, { title, description, status, priority });
                if (success) {
                    resetForm();
                }
            } else {
                const task = new Task(title, description, status, priority);
                taskManager.add(task);
                resetForm();
            }
        } catch (error) {
            document.getElementById('title-error')!.textContent = (error as Error).message;
        }
    });

    document.getElementById('cancel-btn')?.addEventListener('click', cancelEdit);

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    searchInput.addEventListener('input', () => {
        taskManager.search(searchInput.value);
    });

    document.getElementById('clear-search')?.addEventListener('click', () => {
        searchInput.value = '';
        taskManager.search('');
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const status = (btn as HTMLElement).dataset['status'] as TaskStatus | 'all';
            taskManager.filterByStatus(status);
        });
    });

    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', () => {
            const status = (card as HTMLElement).dataset['status'] as TaskStatus | 'all';
            taskManager.filterByStatus(status);
            
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if ((btn as HTMLElement).dataset['status'] === status) {
                    btn.classList.add('active');
                }
            });
        });
    });

    const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
    sortSelect.addEventListener('change', () => {
        const sortValue = sortSelect.value;
        taskManager.currentSort = sortValue;
        taskManager.updateUI();
    });

    document.getElementById('cancel-delete')?.addEventListener('click', () => {
        (document.getElementById('delete-modal') as HTMLElement).style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        const modal = document.getElementById('delete-modal') as HTMLElement;
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    taskManager.updateUI();
});

(window as any).editTask = editTask;
(window as any).deleteTask = deleteTask;
(window as any).quickEditStatus = quickEditStatus;
(window as any).quickEditPriority = quickEditPriority;
(window as any).cancelEdit = cancelEdit;