document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const newTaskInput = document.getElementById('newTaskInput');
    const taskDueDateInput = document.getElementById('taskDueDateInput');
    const taskPriorityInput = document.getElementById('taskPriorityInput');
    const addTaskButton = document.getElementById('addTaskButton');
    const taskList = document.getElementById('taskList');
    const clearAllButton = document.getElementById('clearAllButton');
    const searchInput = document.getElementById('searchInput');
    const themeSwitcher = document.getElementById('themeSwitcher');
    const filters = document.querySelector('.filters');

    // Modal Elements
    const customModal = document.getElementById('customModal');
    const modalMessage = document.getElementById('modalMessage');
    const modalConfirmButton = document.getElementById('modalConfirmButton');
    const modalCancelButton = document.getElementById('modalCancelButton');
    const closeButton = document.querySelector('.close-button');

    // Undo Toast Elements
    const undoToast = document.getElementById('undoToast');
    const undoButton = document.getElementById('undoButton');

    // App State
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let recentlyDeletedTask = null;
    let undoTimeout = null;

    // --- Utility Functions ---
    const getFormattedToday = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // --- Theme Manager ---
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.body.classList.add(currentTheme);
        if(currentTheme === 'dark-mode') {
            themeSwitcher.innerHTML = '<ion-icon name="sunny-outline"></ion-icon>';
        }
    }

    themeSwitcher.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        let theme = document.body.classList.contains('dark-mode') ? 'dark-mode' : '';
        themeSwitcher.innerHTML = theme ? '<ion-icon name="sunny-outline"></ion-icon>' : '<ion-icon name="moon-outline"></ion-icon>';
        localStorage.setItem('theme', theme);
    });

    // --- Task Rendering ---
    function renderTasks() {
        const filter = document.querySelector('.filters button.active').id.replace('filter', '').toLowerCase();
        const searchTerm = searchInput.value.toLowerCase();
        
        // Filter tasks
        let filteredTasks = tasks.filter(task => {
            const matchesFilter = (filter === 'all') ||
                                (filter === 'active' && !task.completed) ||
                                (filter === 'completed' && task.completed);
            const matchesSearch = task.text.toLowerCase().includes(searchTerm);
            return matchesFilter && matchesSearch;
        });

        taskList.innerHTML = '';
        if (filteredTasks.length === 0) {
            const message = searchTerm ? 'No tasks match your search.' : 'No tasks yet! Add one above.';
            taskList.innerHTML = `<p style="text-align:center; color: #888;">${message}</p>`;
            return;
        }

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.setAttribute('data-id', task.id);
            li.className = `priority-${task.priority} ${task.completed ? 'completed' : ''}`;
            li.setAttribute('tabindex', '0'); // For accessibility

            let dueDate = '';
            if (task.dueDate) {
                // The date from the input is already YYYY-MM-DD, we need to adjust for timezone issues before formatting
                const dateParts = task.dueDate.split('-');
                const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                dueDate = `${day}/${month}/${year}`;
            }

            li.innerHTML = `
                <div class="task-content">
                    <span class="task-text">${task.text}</span>
                    <div class="task-meta">
                        ${dueDate ? `<span class="task-due-date"><ion-icon name="calendar-outline"></ion-icon>${dueDate}</span>` : ''}
                    </div>
                </div>
                <div class="task-buttons">
                    <button class="edit-btn" aria-label="Edit task"><ion-icon name="create-outline"></ion-icon></button>
                    <button class="delete-btn" aria-label="Delete task"><ion-icon name="trash-outline"></ion-icon></button>
                </div>
            `;

            taskList.appendChild(li);

            // Event listeners for task actions
            li.querySelector('.task-content').addEventListener('click', () => toggleCompleteTask(task.id));
            li.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); editTask(task.id, li); });
            li.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); confirmDeleteTask(task.id); });
            
            // Keyboard accessibility
            li.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') toggleCompleteTask(task.id);
            });
        });
    }

    // --- Task Actions ---
    function addTask() {
        const text = newTaskInput.value.trim();
        if (!text) return;

        const newTask = {
            id: Date.now(),
            text: text,
            completed: false,
            priority: taskPriorityInput.value,
            dueDate: taskDueDateInput.value
        };
        tasks.push(newTask);
        saveAndRender();
        newTaskInput.value = '';
        taskDueDateInput.value = getFormattedToday(); // Reset to today's date
    }

    function toggleCompleteTask(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            saveAndRender();
        }
    }

    function confirmDeleteTask(id) {
        showConfirmModal('Are you sure you want to delete this task?', () => {
            deleteTask(id);
        });
    }

    function deleteTask(id) {
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex > -1) {
            recentlyDeletedTask = { ...tasks[taskIndex], index: taskIndex };
            tasks.splice(taskIndex, 1);
            saveAndRender();
            showUndoToast();
        }
    }
    
    function editTask(id, li) {
        const task = tasks.find(t => t.id === id);
        const taskContent = li.querySelector('.task-content');
        const originalHTML = taskContent.innerHTML;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = task.text;
        input.className = 'task-text'; // Apply same styling
        taskContent.innerHTML = '';
        taskContent.appendChild(input);
        input.focus();

        function saveEdit() {
            const newText = input.value.trim();
            if (newText) {
                task.text = newText;
            }
            saveAndRender();
        }

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                taskContent.innerHTML = originalHTML;
                input.removeEventListener('blur', saveEdit);
            }
        });
    }

    function clearAllTasks() {
        if(tasks.length === 0) return;
        showConfirmModal('Are you sure you want to clear all tasks?', () => {
            tasks = [];
            saveAndRender();
        });
    }

    // --- Undo Functionality ---
    function showUndoToast() {
        undoToast.classList.add('show');
        clearTimeout(undoTimeout);
        undoTimeout = setTimeout(() => {
            undoToast.classList.remove('show');
            recentlyDeletedTask = null;
        }, 5000);
    }
    
    undoButton.addEventListener('click', () => {
        if (recentlyDeletedTask) {
            tasks.splice(recentlyDeletedTask.index, 0, recentlyDeletedTask);
            saveAndRender();
            undoToast.classList.remove('show');
            clearTimeout(undoTimeout);
            recentlyDeletedTask = null;
        }
    });

    // --- Modal ---
    function showConfirmModal(message, onConfirm) {
        modalMessage.textContent = message;
        customModal.style.display = 'flex';

        modalConfirmButton.onclick = () => {
            onConfirm();
            closeModal();
        };

        const closeModal = () => {
            customModal.style.display = 'none';
        };

        modalCancelButton.onclick = closeModal;
        closeButton.onclick = closeModal;
        window.onclick = (event) => {
            if (event.target == customModal) closeModal();
        };
    }

    // --- Local Storage & Render ---
    function saveAndRender() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasks();
    }

    // --- Event Listeners ---
    addTaskButton.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (e) => e.key === 'Enter' && addTask());
    clearAllButton.addEventListener('click', clearAllTasks);
    searchInput.addEventListener('input', renderTasks);
    
    filters.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelector('.filters button.active').classList.remove('active');
            e.target.classList.add('active');
            renderTasks();
        }
    });

    // --- Initial Load ---
    taskDueDateInput.value = getFormattedToday(); // Set the date input to today
    renderTasks();
});