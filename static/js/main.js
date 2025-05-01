// Global state
let categories = [];
let caregivers = [];
let activities = [];
let templates = [];
let calendars = [];
let currentTemplate = null;
let currentCalendar = null;

// DOM Ready
$(document).ready(function() {
    // Initialize the application
    initApp();
    
    // Navigation event handlers
    $('.nav-link').on('click', function(e) {
        e.preventDefault();
        const section = $(this).data('section');
        
        // Update active nav link
        $('.nav-link').removeClass('active');
        $(this).addClass('active');
        
        // Show the selected section
        $('.content-section').removeClass('active');
        $(`#${section}`).addClass('active');
        
        // Load section data if needed
        loadSectionData(section);
    });
    
    // Add button event handlers
    $('#add-caregiver-btn').on('click', showCaregiverModal);
    $('#add-category-btn').on('click', showCategoryModal);
    $('#add-activity-btn').on('click', showActivityModal);
    $('#add-template-btn').on('click', showTemplateModal);
    $('#add-calendar-btn').on('click', showCalendarModal);
    
    // Save button event handlers
    $('#save-caregiver').on('click', saveCaregiver);
    $('#save-category').on('click', saveCategory);
    $('#save-activity').on('click', saveActivity);
    $('#save-template').on('click', saveTemplate);
    $('#save-calendar').on('click', saveCalendar);
    $('#save-schedule').on('click', saveSchedule);
    $('#save-block').on('click', saveBlock);
    
    // Filter category event handler
    $('#filter-category').on('change', function() {
        loadActivities($(this).val());
    });
    
    // Backup data event handler
    $('#backup-btn').on('click', backupData);
    
    // Picture preview handler
    $('#caregiver-picture').on('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#picture-preview').html(`<img src="${e.target.result}" class="mt-2 img-thumbnail">`);
            };
            reader.readAsDataURL(file);
        }
    });
});

// Initialize application
function initApp() {
    // Load dashboard data
    loadDashboardData();
}

// Load data for a specific section
function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'caregivers':
            loadCaregivers();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'activities':
            loadCategories().then(() => {
                loadActivities();
                populateCategorySelect('#activity-category');
                populateCategorySelect('#filter-category');
            });
            break;
        case 'templates':
            loadTemplates();
            break;
        case 'calendars':
            loadTemplates().then(() => {
                loadCalendars();
                populateTemplateSelect('#calendar-template');
            });
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Dashboard Data
function loadDashboardData() {
    // Load counts
    $.get('/api/caregivers', function(data) {
        caregivers = data;
        $('#caregiver-count').text(data.length);
        populateRecentCaregivers();
    });
    
    $.get('/api/activities', function(data) {
        activities = data;
        $('#activity-count').text(data.length);
        populateRecentActivities();
    });
    
    $.get('/api/templates', function(data) {
        templates = data;
        $('#template-count').text(data.length);
    });
}

// Populate recent caregivers in dashboard
function populateRecentCaregivers() {
    const recentCaregivers = caregivers.slice(0, 5);
    let html = '';
    
    recentCaregivers.forEach(caregiver => {
        html += `
            <tr>
                <td>${caregiver.name}</td>
                <td>${caregiver.performance_score || 'N/A'}</td>
                <td>$${caregiver.hourly_rate || 'N/A'}</td>
            </tr>
        `;
    });
    
    $('#recent-caregivers').html(html || '<tr><td colspan="3" class="text-center">No caregivers found</td></tr>');
}

// Populate recent activities in dashboard
function populateRecentActivities() {
    const recentActivities = activities.slice(0, 5);
    let html = '';
    
    recentActivities.forEach(activity => {
        const category = categories.find(c => c.id === activity.category_id) || { name: 'N/A' };
        html += `
            <tr>
                <td>${activity.name}</td>
                <td>${category.name}</td>
            </tr>
        `;
    });
    
    $('#recent-activities').html(html || '<tr><td colspan="2" class="text-center">No activities found</td></tr>');
}

// Show notification toast
function showNotification(message, success = true) {
    $('#toast-message').text(message);
    $('#notification-toast').removeClass('bg-success bg-danger')
        .addClass(success ? 'bg-success' : 'bg-danger')
        .toast('show');
}

// Backup data 
function backupData() {
    $.get('/api/backup', function(response) {
        showNotification('Backup created successfully!');
    }).fail(function() {
        showNotification('Failed to create backup!', false);
    });
}

// Caregiver CRUD Operations
function loadCaregivers() {
    $.get('/api/caregivers', function(data) {
        caregivers = data;
        populateCaregivers();
    });
}

function populateCaregivers() {
    let html = '';
    
    caregivers.forEach(caregiver => {
        const imgSrc = caregiver.picture 
            ? `/static/${caregiver.picture}` 
            : 'https://via.placeholder.com/40';
            
        html += `
            <tr>
                <td><img src="${imgSrc}" class="caregiver-img" alt="${caregiver.name}"></td>
                <td>${caregiver.name}</td>
                <td>${caregiver.performance_score || 'N/A'}</td>
                <td>$${caregiver.hourly_rate || 'N/A'}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary edit-caregiver" data-id="${caregiver.id}">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-caregiver" data-id="${caregiver.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    $('#caregivers-list').html(html || '<tr><td colspan="5" class="text-center">No caregivers found</td></tr>');
    
    // Add event handlers
    $('.edit-caregiver').on('click', function() {
        const id = $(this).data('id');
        editCaregiver(id);
    });
    
    $('.delete-caregiver').on('click', function() {
        const id = $(this).data('id');
        deleteCaregiver(id);
    });
}

function showCaregiverModal(caregiver = null) {
    // Reset form
    $('#caregiver-form')[0].reset();
    $('#picture-preview').empty();
    
    if (caregiver) {
        // Edit mode
        $('#caregiverModalLabel').text('Edit Caregiver');
        $('#caregiver-id').val(caregiver.id);
        $('#caregiver-name').val(caregiver.name);
        $('#caregiver-performance').val(caregiver.performance_score);
        $('#caregiver-rate').val(caregiver.hourly_rate);
        $('#caregiver-location').val(caregiver.location);
        
        if (caregiver.picture) {
            $('#picture-preview').html(`<img src="/static/${caregiver.picture}" class="mt-2 img-thumbnail">`);
        }
    } else {
        // Add mode
        $('#caregiverModalLabel').text('Add Caregiver');
        $('#caregiver-id').val('');
    }
    
    // Show modal
    const caregiverModal = new bootstrap.Modal(document.getElementById('caregiverModal'));
    caregiverModal.show();
}

function saveCaregiver() {
    const id = $('#caregiver-id').val();
    const formData = new FormData($('#caregiver-form')[0]);
    
    if (id) {
        // Update
        $.ajax({
            url: `/api/caregivers/${id}`,
            type: 'PUT',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                bootstrap.Modal.getInstance(document.getElementById('caregiverModal')).hide();
                loadCaregivers();
                showNotification('Caregiver updated successfully!');
            },
            error: function() {
                showNotification('Failed to update caregiver!', false);
            }
        });
    } else {
        // Create
        $.ajax({
            url: '/api/caregivers',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                bootstrap.Modal.getInstance(document.getElementById('caregiverModal')).hide();
                loadCaregivers();
                loadDashboardData();
                showNotification('Caregiver added successfully!');
            },
            error: function() {
                showNotification('Failed to add caregiver!', false);
            }
        });
    }
}

function editCaregiver(id) {
    $.get(`/api/caregivers/${id}`, function(caregiver) {
        showCaregiverModal(caregiver);
    });
}

function deleteCaregiver(id) {
    if (confirm('Are you sure you want to delete this caregiver?')) {
        $.ajax({
            url: `/api/caregivers/${id}`,
            type: 'DELETE',
            success: function() {
                loadCaregivers();
                loadDashboardData();
                showNotification('Caregiver deleted successfully!');
            },
            error: function() {
                showNotification('Failed to delete caregiver!', false);
            }
        });
    }
}

// Category CRUD Operations
function loadCategories() {
    return $.get('/api/categories', function(data) {
        categories = data;
        populateCategories();
    });
}

function populateCategories() {
    let html = '';
    
    categories.forEach(category => {
        html += `
            <tr>
                <td>${category.name}</td>
                <td>${category.description || ''}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary edit-category" data-id="${category.id}">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-category" data-id="${category.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    $('#categories-list').html(html || '<tr><td colspan="3" class="text-center">No categories found</td></tr>');
    
    // Add event handlers
    $('.edit-category').on('click', function() {
        const id = $(this).data('id');
        editCategory(id);
    });
    
    $('.delete-category').on('click', function() {
        const id = $(this).data('id');
        deleteCategory(id);
    });
}

function populateCategorySelect(selector) {
    let html = '<option value="">Select Category</option>';
    
    categories.forEach(category => {
        html += `<option value="${category.id}">${category.name}</option>`;
    });
    
    $(selector).html(html);
}

function showCategoryModal(category = null) {
    // Reset form
    $('#category-form')[0].reset();
    
    if (category) {
        // Edit mode
        $('#categoryModalLabel').text('Edit Category');
        $('#category-id').val(category.id);
        $('#category-name').val(category.name);
        $('#category-description').val(category.description);
    } else {
        // Add mode
        $('#categoryModalLabel').text('Add Category');
        $('#category-id').val('');
    }
    
    // Show modal
    const categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
    categoryModal.show();
}

function saveCategory() {
    const id = $('#category-id').val();
    const data = {
        name: $('#category-name').val(),
        description: $('#category-description').val()
    };
    
    if (id) {
        // Update
        $.ajax({
            url: `/api/categories/${id}`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
                loadCategories();
                loadActivities();
                showNotification('Category updated successfully!');
            },
            error: function() {
                showNotification('Failed to update category!', false);
            }
        });
    } else {
        // Create
        $.ajax({
            url: '/api/categories',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
                loadCategories();
                showNotification('Category added successfully!');
            },
            error: function() {
                showNotification('Failed to add category!', false);
            }
        });
    }
}

function editCategory(id) {
    $.get(`/api/categories/${id}`, function(category) {
        showCategoryModal(category);
    });
}

function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category? This will affect activities in this category.')) {
        $.ajax({
            url: `/api/categories/${id}`,
            type: 'DELETE',
            success: function() {
                loadCategories();
                loadActivities();
                showNotification('Category deleted successfully!');
            },
            error: function() {
                showNotification('Failed to delete category!', false);
            }
        });
    }
}

// Activity CRUD Operations
function loadActivities(categoryId = '') {
    const url = categoryId ? `/api/activities?category_id=${categoryId}` : '/api/activities';
    
    $.get(url, function(data) {
        activities = data;
        populateActivities();
    });
}

function populateActivities() {
    let html = '';
    
    activities.forEach(activity => {
        const category = categories.find(c => c.id === activity.category_id) || { name: 'N/A' };
        
        html += `
            <tr>
                <td>${activity.name}</td>
                <td>${category.name}</td>
                <td>${activity.description || ''}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary edit-activity" data-id="${activity.id}">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-activity" data-id="${activity.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    $('#activities-list').html(html || '<tr><td colspan="4" class="text-center">No activities found</td></tr>');
    
    // Add event handlers
    $('.edit-activity').on('click', function() {
        const id = $(this).data('id');
        editActivity(id);
    });
    
    $('.delete-activity').on('click', function() {
        const id = $(this).data('id');
        deleteActivity(id);
    });
}

function showActivityModal(activity = null) {
    // Reset form
    $('#activity-form')[0].reset();
    
    if (activity) {
        // Edit mode
        $('#activityModalLabel').text('Edit Activity');
        $('#activity-id').val(activity.id);
        $('#activity-name').val(activity.name);
        $('#activity-category').val(activity.category_id);
        $('#activity-description').val(activity.description);
        $('#activity-duration').val(activity.duration);
    } else {
        // Add mode
        $('#activityModalLabel').text('Add Activity');
        $('#activity-id').val('');
    }
    
    // Show modal
    const activityModal = new bootstrap.Modal(document.getElementById('activityModal'));
    activityModal.show();
}

function saveActivity() {
    const id = $('#activity-id').val();
    const data = {
        name: $('#activity-name').val(),
        category_id: $('#activity-category').val(),
        description: $('#activity-description').val(),
        duration: $('#activity-duration').val()
    };
    
    if (id) {
        // Update
        $.ajax({
            url: `/api/activities/${id}`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                bootstrap.Modal.getInstance(document.getElementById('activityModal')).hide();
                loadActivities($('#filter-category').val());
                loadDashboardData();
                showNotification('Activity updated successfully!');
            },
            error: function() {
                showNotification('Failed to update activity!', false);
            }
        });
    } else {
        // Create
        $.ajax({
            url: '/api/activities',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                bootstrap.Modal.getInstance(document.getElementById('activityModal')).hide();
                loadActivities($('#filter-category').val());
                loadDashboardData();
                showNotification('Activity added successfully!');
            },
            error: function() {
                showNotification('Failed to add activity!', false);
            }
        });
    }
}

function editActivity(id) {
    $.get(`/api/activities/${id}`, function(activity) {
        showActivityModal(activity);
    });
}

function deleteActivity(id) {
    if (confirm('Are you sure you want to delete this activity?')) {
        $.ajax({
            url: `/api/activities/${id}`,
            type: 'DELETE',
            success: function() {
                loadActivities($('#filter-category').val());
                loadDashboardData();
                showNotification('Activity deleted successfully!');
            },
            error: function() {
                showNotification('Failed to delete activity!', false);
            }
        });
    }
} 