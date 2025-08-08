document.addEventListener('DOMContentLoaded', () => {
    const newTaskInput = document.getElementById('newTaskInput');
    const taskPriorityInput = document.getElementById('taskPriorityInput'); // ASSET: Priority input
    const addTaskButton = document.getElementById('addTaskButton');
    const taskList = document.getElementById('taskList');
    const clearAllButton = document.getElementById('clearAllButton');
    const filterAllButton = document.getElementById('filterAll');
    const filterActiveButton = document.getElementById('filterActive');
    const filterCompletedButton = document.getElementById('filterCompleted');

    // ASSET: Modal elements
    const customModal = document.getElementById('customModal');
    const modalMessage = document.getElementById('modalMessage');
    const modalConfirmButton = document.getElementById('modalConfirmButton');
    const modalCancelButton = document.getElementById('modalCancelButton');
    const closeButton = document.querySelector('.close-button');


    let tasks = []; // Array to store task objects
    let draggedItem = null; // ASSET: For Drag-and-Drop

    // --- Utility Functions ---

    // ASSET: Custom Confirmation Modal Function
    function showConfirmModal(message, onConfirm) {
        modalMessage.textContent = message;
        customModal.style.display = 'flex'; // Use flex to center the modal content

        // Clear previous event listeners to prevent multiple calls
        modalConfirmButton.onclick = null;
        modalCancelButton.onclick = null;
        closeButton.onclick = null;

        modalConfirmButton.onclick = () => {
            onConfirm();
            customModal.style.display = 'none';
        };

        modalCancelButton.onclick = () => {
            customModal.style.display = 'none';
        };

        closeButton.onclick = () => {
            customModal.style.display = 'none';
        };

        // Close modal if clicking outside content
        window.onclick = (event) => {
            if (event.target == customModal) {
                customModal.style.display = 'none';
            }
        };
    }

    // --- Local Storage Functions ---

    // Function to load tasks from local storage
    function loadTasks() {
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
            renderTasks(document.querySelector('.filters button.active')?.id.replace('filter', '').toLowerCase() || 'all');
        }
    }

    // Function to save tasks to local storage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // --- Task Management Functions ---

    // Function to render tasks based on current filter and order
    function renderTasks(filter = 'all') {
        taskList.innerHTML = ''; // Clear current list

        let filteredTasks = [];
        if (filter === 'all') {
            filteredTasks = tasks;
        } else if (filter === 'active') {
            filteredTasks = tasks.filter(task => !task.completed);
        } else if (filter === 'completed') {
            filteredTasks = tasks.filter(task => task.completed);
        }

        // ASSET: Sort tasks by priority (High > Medium > Low) and then by completion status
        filteredTasks.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Then sort by completion status (incomplete before completed)
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;

            return 0; // Maintain original order if priorities and completion are same
        });

        if (tasks.length === 0) {
            const noTasksMessage = document.createElement('p');
            noTasksMessage.textContent = "No tasks yet! Add one above.";
            noTasksMessage.style.textAlign = "center";
            noTasksMessage.style.color = "#666";
            noTasksMessage.style.marginTop = "20px";
            taskList.appendChild(noTasksMessage);
        }


        filteredTasks.forEach(task => {
            const listItem = document.createElement('li');
            listItem.setAttribute('data-id', task.id);
            listItem.setAttribute('draggable', 'true'); // ASSET: Make list item draggable
            if (task.completed) {
                listItem.classList.add('completed');
            }

            // ASSET: Container for task text and priority
            const taskTextAndPriorityContainer = document.createElement('span');
            taskTextAndPriorityContainer.classList.add('task-text-and-priority');
            taskTextAndPriorityContainer.addEventListener('click', () => toggleCompleteTask(task.id));

            const taskText = document.createElement('span');
            taskText.classList.add('task-text');
            taskText.textContent = task.text;

            const taskPrioritySpan = document.createElement('span');
            taskPrioritySpan.classList.add('task-priority', `priority-${task.priority}`);
            taskPrioritySpan.textContent = `(${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)})`;

            taskTextAndPriorityContainer.appendChild(taskText);
            taskTextAndPriorityContainer.appendChild(taskPrioritySpan);


            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('task-buttons');

            const completeButton = document.createElement('button');
            completeButton.classList.add('complete-btn');
            completeButton.innerHTML = '<ion-icon name="checkmark-circle-outline"></ion-icon>';
            completeButton.title = task.completed ? 'Mark as Incomplete' : 'Mark as Complete';
            completeButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent li click event when button is clicked
                toggleCompleteTask(task.id);
            });

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-btn');
            deleteButton.innerHTML = '<ion-icon name="trash-outline"></ion-icon>';
            deleteButton.title = 'Delete Task';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent li click event when button is clicked
                deleteTask(task.id);
            });

            buttonContainer.appendChild(completeButton);
            buttonContainer.appendChild(deleteButton);

            listItem.appendChild(taskTextAndPriorityContainer);
            listItem.appendChild(buttonContainer);
            taskList.appendChild(listItem);

            // ASSET: Add animation class for new tasks
            listItem.classList.add('task-added');
            setTimeout(() => {
                listItem.classList.add('animate');
            }, 10); // Small delay to allow CSS to apply initial state
        });
    }

    // Function to add a new task
    function addTask() {
        const taskText = newTaskInput.value.trim();
        const taskPriority = taskPriorityInput.value; // ASSET: Get selected priority

        if (taskText === '') {
            alert('Please enter a task.'); // Consider using a custom alert modal here too
            return;
        }

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            priority: taskPriority // ASSET: Store priority
        };

        tasks.push(newTask);
        newTaskInput.value = ''; // Clear input field
        taskPriorityInput.value = 'medium'; // ASSET: Reset priority to default
        saveTasks();
        renderTasks(document.querySelector('.filters button.active').id.replace('filter', '').toLowerCase());
    }

    // Function to toggle task completion
    function toggleCompleteTask(id) {
        const taskIndex = tasks.findIndex(task => task.id === id);
        if (taskIndex > -1) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            saveTasks();
            renderTasks(document.querySelector('.filters button.active').id.replace('filter', '').toLowerCase());
        }
    }

    // Function to delete a task
    function deleteTask(id) {
        const listItemToDelete = taskList.querySelector(`[data-id="${id}"]`);
        if (listItemToDelete) {
            // ASSET: Add animation class for deletion
            listItemToDelete.classList.add('task-deleted');
            // Wait for the animation to finish before truly removing from DOM and array
            listItemToDelete.addEventListener('transitionend', () => {
                tasks = tasks.filter(task => task.id !== id);
                saveTasks();
                renderTasks(document.querySelector('.filters button.active').id.replace('filter', '').toLowerCase());
            }, { once: true }); // Ensure listener only runs once
        }
    }

    // Function to clear all tasks
    function clearAllTasks() {
        // ASSET: Use custom confirmation modal instead of native confirm()
        showConfirmModal('Are you sure you want to clear all tasks?', () => {
            tasks = [];
            saveTasks();
            renderTasks('all'); // Re-render with 'all' filter after clearing
            filterAllButton.click(); // Set "All" filter as active
        });
    }

    // --- Event Listeners ---

    addTaskButton.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    clearAllButton.addEventListener('click', clearAllTasks);

    // Filter Buttons
    filterAllButton.addEventListener('click', () => {
        document.querySelector('.filters button.active').classList.remove('active');
        filterAllButton.classList.add('active');
        renderTasks('all');
    });

    filterActiveButton.addEventListener('click', () => {
        document.querySelector('.filters button.active').classList.remove('active');
        filterActiveButton.classList.add('active');
        renderTasks('active');
    });

    filterCompletedButton.addEventListener('click', () => {
        document.querySelector('.filters button.active').classList.remove('active');
        filterCompletedButton.classList.add('active');
        renderTasks('completed');
    });

    // ASSET: Drag and Drop Event Listeners
    taskList.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'LI') {
            draggedItem = e.target;
            setTimeout(() => {
                draggedItem.classList.add('dragging');
            }, 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedItem.dataset.id);
        }
    });

    taskList.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    taskList.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.target.tagName === 'LI' && draggedItem && e.target !== draggedItem) {
            const boundingBox = e.target.getBoundingClientRect();
            const offset = e.clientY - boundingBox.top;

            const after = offset > boundingBox.height / 2;

            // Visual feedback for drop position
            if (after) {
                e.target.style.borderBottom = '2px solid #007bff';
                e.target.style.borderTop = 'none';
            } else {
                e.target.style.borderTop = '2px solid #007bff';
                e.target.style.borderBottom = 'none';
            }
        }
    });

    taskList.addEventListener('dragleave', (e) => {
        if (e.target.tagName === 'LI') {
            e.target.style.borderTop = 'none';
            e.target.style.borderBottom = 'none';
        }
    });

    taskList.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItem && e.target.tagName === 'LI' && e.target !== draggedItem) {
            const dropTarget = e.target;
            dropTarget.style.borderTop = 'none';
            dropTarget.style.borderBottom = 'none'; // Clear border feedback

            const boundingBox = dropTarget.getBoundingClientRect();
            const offset = e.clientY - boundingBox.top;
            const after = offset > boundingBox.height / 2;

            const draggedId = parseInt(draggedItem.dataset.id);
            const dropId = parseInt(dropTarget.dataset.id);

            const draggedTaskIndex = tasks.findIndex(task => task.id === draggedId);
            const dropTargetTaskIndex = tasks.findIndex(task => task.id === dropId);

            const [movedTask] = tasks.splice(draggedTaskIndex, 1);

            if (after) {
                tasks.splice(dropTargetTaskIndex + (draggedTaskIndex < dropTargetTaskIndex ? 0 : 1), 0, movedTask);
            } else {
                tasks.splice(dropTargetTaskIndex, 0, movedTask);
            }

            saveTasks();
            // Re-render to reflect the new order visually and ensure consistency
            renderTasks(document.querySelector('.filters button.active').id.replace('filter', '').toLowerCase());
        }
    });

    // --- Initial Load ---
    loadTasks();
    filterAllButton.classList.add('active'); // Ensure "All" filter is active on initial load
});