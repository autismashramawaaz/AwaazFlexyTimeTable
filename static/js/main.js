// Global state
let categories = [];
let caregivers = [];
let activities = [];
let templates = [];
let calendars = [];
let currentTemplate = null;
let currentCalendar = null;
let backups = [];
let gitStatus = {};

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
    
    // Backup and Git operation handlers
    $('#backup-btn').on('click', backupData);
    $('#push-changes-btn').on('click', pushChanges);
    $('#refresh-backups-btn').on('click', loadBackups);
    $('#refresh-git-status-btn').on('click', loadGitStatus);
    
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
    
    // Location rates handlers
    $('#add-location-btn').on('click', addLocationRateField);
    
    // Use event delegation for dynamically added remove buttons
    $(document).on('click', '.remove-location', function() {
        $(this).closest('.location-rate-item').remove();
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
        case 'backups':
            loadBackups();
            loadGitStatus();
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
    if (!caregivers || !Array.isArray(caregivers) || caregivers.length === 0) {
        $('#recent-caregivers').html('<div class="text-center">No caregivers found</div>');
        return;
    }
    
    // Sort caregivers by performance score in descending order
    const sortedCaregivers = [...caregivers].sort((a, b) => {
        const scoreA = parseFloat(a.performance_score) || 0;
        const scoreB = parseFloat(b.performance_score) || 0;
        return scoreB - scoreA;
    });
    
    // Get the top 5 caregivers
    const topCaregivers = sortedCaregivers.slice(0, 5);
    
    let html = '';
    topCaregivers.forEach(caregiver => {
        const imgSrc = caregiver.picture 
            ? `/static/${caregiver.picture}` 
            : 'https://via.placeholder.com/40';
        
        // Get the default rate
        const defaultRate = caregiver.default_hourly_rate || caregiver.hourly_rate || 'N/A';
        
        html += `
            <div class="col-6 col-md-4 col-lg-2 mb-3">
                <div class="card">
                    <div class="card-body text-center">
                        <img src="${imgSrc}" class="rounded-circle mb-2" alt="${caregiver.name || 'Caregiver'}" style="width: 60px; height: 60px; object-fit: cover;">
                        <h6 class="mb-0">
                            ${caregiver.name || 'Unnamed'}
                            ${caregiver.initials ? `<span class="badge bg-secondary">${caregiver.initials}</span>` : ''}
                        </h6>
                        <p class="text-muted small mb-1">Score: ${caregiver.performance_score || 'N/A'}</p>
                        <p class="small mb-0">Rate: $${defaultRate}</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#recent-caregivers').html(html);
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

// Backup and Git Operations
function backupData() {
    const description = prompt('Enter a description for this backup (optional):');
    const url = description ? `/api/backup?description=${encodeURIComponent(description)}` : '/api/backup';
    
    $.get(url, function(response) {
        showNotification('Backup created successfully!');
        loadBackups();
    }).fail(function() {
        showNotification('Failed to create backup!', false);
    });
}

function loadBackups() {
    $.get('/api/backups', function(data) {
        backups = data;
        populateBackups();
    }).fail(function() {
        showNotification('Failed to load backups!', false);
    });
}

function populateBackups() {
    let html = '';
    
    backups.forEach(backup => {
        const created = backup.metadata.created_at 
            ? new Date(backup.metadata.created_at).toLocaleString()
            : 'Unknown';
            
        html += `
            <tr>
                <td>${backup.id}</td>
                <td>${created}</td>
                <td>${backup.metadata.description || ''}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-warning restore-backup" data-id="${backup.id}">
                        <i class="fa-solid fa-undo"></i> Restore
                    </button>
                </td>
            </tr>
        `;
    });
    
    $('#backups-list').html(html || '<tr><td colspan="4" class="text-center">No backups found</td></tr>');
    
    // Add event handlers
    $('.restore-backup').on('click', function() {
        const id = $(this).data('id');
        restoreBackup(id);
    });
}

function restoreBackup(id) {
    if (confirm(`Are you sure you want to restore from backup ${id}? This will overwrite current data.`)) {
        $.ajax({
            url: `/api/restore/${id}`,
            type: 'POST',
            success: function(response) {
                showNotification('Backup restored successfully!');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            },
            error: function() {
                showNotification('Failed to restore backup!', false);
            }
        });
    }
}

function loadGitStatus() {
    $.get('/api/git/status', function(data) {
        gitStatus = data;
        updateGitStatusDisplay();
    }).fail(function() {
        showNotification('Failed to load Git status!', false);
    });
}

function updateGitStatusDisplay() {
    // Update branch name
    $('#git-branch').text(gitStatus.branch || 'Unknown');
    
    // Update changes count
    const changesCount = gitStatus.changes ? gitStatus.changes.length : 0;
    $('#git-changes-count').text(changesCount);
    
    // Update changes list
    let changesHtml = '';
    if (gitStatus.changes && gitStatus.changes.length > 0) {
        changesHtml = gitStatus.changes.map(change => `<li class="list-group-item">${change}</li>`).join('');
    } else {
        changesHtml = '<li class="list-group-item">No changes detected</li>';
    }
    $('#git-changes-list').html(changesHtml);
    
    // Update push button status
    $('#push-changes-btn').prop('disabled', !gitStatus.has_changes);
}

function pushChanges() {
    const message = prompt('Enter a commit message:');
    if (!message) return;
    
    $.ajax({
        url: '/api/git/push',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ message }),
        success: function(response) {
            showNotification('Changes pushed successfully!');
            loadGitStatus();
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON && xhr.responseJSON.error 
                ? xhr.responseJSON.error 
                : 'Failed to push changes!';
            showNotification(errorMsg, false);
        }
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
            
        // Get the default rate
        const defaultRate = caregiver.default_hourly_rate || caregiver.hourly_rate || 'N/A';
        
        // Format location rates if available
        let locationRatesHtml = '';
        if (caregiver.location_rates && Array.isArray(caregiver.location_rates) && caregiver.location_rates.length > 0) {
            const safeContent = formatLocationRates(caregiver.location_rates);
            const safeName = caregiver.name ? 
                caregiver.name.replace(/"/g, '&quot;').replace(/'/g, '&#039;') : 
                'Caregiver';
                
            locationRatesHtml = `
                <button class="btn btn-sm btn-outline-info location-rates-btn" 
                    data-caregiver-id="${caregiver.id}">
                    <i class="fas fa-map-marker-alt"></i> View Rates
                </button>
            `;
        }
            
        html += `
            <tr>
                <td><img src="${imgSrc}" class="caregiver-img" alt="${caregiver.name || ''}"></td>
                <td>
                    ${caregiver.name || ''}
                    ${caregiver.initials ? `<span class="badge bg-secondary">${caregiver.initials}</span>` : ''}
                </td>
                <td>${caregiver.performance_score || 'N/A'}</td>
                <td>
                    $${defaultRate}
                    ${locationRatesHtml}
                </td>
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
    
    // Set up location rates popovers after the HTML is added to the DOM
    $('.location-rates-btn').each(function() {
        const caregiverId = $(this).data('caregiver-id');
        const caregiver = caregivers.find(c => c.id === caregiverId);
        
        if (caregiver && caregiver.location_rates) {
            const title = `Location Rates for ${caregiver.name || 'Caregiver'}`;
            const content = formatLocationRates(caregiver.location_rates);
            
            // Initialize popover
            new bootstrap.Popover(this, {
                title: title,
                content: content,
                html: true,
                trigger: 'click',
                placement: 'top'
            });
        }
    });
    
    // Add event handlers
    $('.edit-caregiver').on('click', function() {
        const id = $(this).data('id');
        editCaregiver(id);
    });
    
    $('.delete-caregiver').on('click', function() {
        const id = $(this).data('id');
        deleteCaregiver(id);
    });
    
    // Add global click handler to close popovers when clicking outside
    $(document).off('click.popoverClose').on('click.popoverClose', function(e) {
        if ($(e.target).closest('.popover').length === 0 && 
            !$(e.target).hasClass('location-rates-btn') && 
            $(e.target).closest('.location-rates-btn').length === 0) {
            $('.location-rates-btn').each(function() {
                const popover = bootstrap.Popover.getInstance(this);
                if (popover) {
                    popover.hide();
                }
            });
        }
    });
}

// Format location rates for popover display
function formatLocationRates(rates) {
    // Check if rates is valid
    if (!rates || !Array.isArray(rates) || rates.length === 0) {
        return '<div class="text-center p-2">No location rates available</div>';
    }
    
    let html = '<div class="location-rates-table">';
    html += '<table class="table table-sm mb-0">';
    html += '<thead><tr><th>Location</th><th>Rate</th></tr></thead>';
    html += '<tbody>';
    
    // Only process valid rates
    rates.forEach(rate => {
        if (rate && rate.location && rate.rate !== undefined) {
            // Escape location name for XSS protection
            const safeLoc = rate.location
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
                
            html += `<tr>
                <td>${safeLoc}</td>
                <td>$${rate.rate}</td>
            </tr>`;
        }
    });
    
    html += '</tbody></table></div>';
    return html;
}

function showCaregiverModal(caregiver = null) {
    // Reset form
    $('#caregiver-form')[0].reset();
    $('#picture-preview').empty();
    
    // Clear any existing location rate fields except the first one
    $('.location-rate-item:not(:first)').remove();
    
    // Reset the first location rate field
    $('.location-name:first').val('');
    $('.location-rate:first').val('');
    
    if (caregiver) {
        // Edit mode
        $('#caregiverModalLabel').text('Edit Caregiver');
        $('#caregiver-id').val(caregiver.id);
        $('#caregiver-name').val(caregiver.name);
        $('#caregiver-initials').val(caregiver.initials || '');
        $('#caregiver-performance').val(caregiver.performance_score);
        $('#caregiver-default-rate').val(caregiver.default_hourly_rate || caregiver.hourly_rate || '');
        
        // Load location rates if they exist
        if (caregiver.location_rates && caregiver.location_rates.length > 0) {
            // Clear the first empty row
            $('#location-rates-container').empty();
            
            // Add each location rate
            caregiver.location_rates.forEach(locationRate => {
                const newField = `
                    <div class="location-rate-item row mb-2">
                        <div class="col-md-6">
                            <input type="text" class="form-control location-name" placeholder="Location Name" name="location_names[]" value="${locationRate.location || ''}">
                        </div>
                        <div class="col-md-5">
                            <div class="input-group">
                                <span class="input-group-text">$</span>
                                <input type="number" class="form-control location-rate" placeholder="Rate" name="location_rates[]" min="0" step="0.01" value="${locationRate.rate || ''}">
                            </div>
                        </div>
                        <div class="col-md-1">
                            <button type="button" class="btn btn-sm btn-danger remove-location"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                `;
                $('#location-rates-container').append(newField);
            });
        }
        
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
    
    // Process location rates
    const locationNames = [];
    $('input[name="location_names[]"]').each(function() {
        locationNames.push($(this).val());
    });
    
    const locationRates = [];
    $('input[name="location_rates[]"]').each(function() {
        locationRates.push($(this).val());
    });
    
    // Create location rates array for JSON
    const locationRatesArray = [];
    for (let i = 0; i < locationNames.length; i++) {
        if (locationNames[i] && locationRates[i]) {
            locationRatesArray.push({
                location: locationNames[i],
                rate: parseFloat(locationRates[i])
            });
        }
    }
    
    // Add location rates as JSON string
    formData.append('location_rates_json', JSON.stringify(locationRatesArray));
    
    // For backward compatibility
    if (formData.get('default_hourly_rate')) {
        formData.append('hourly_rate', formData.get('default_hourly_rate'));
    }
    
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

// Add new location rate field
function addLocationRateField() {
    const newField = `
        <div class="location-rate-item row mb-2">
            <div class="col-md-6">
                <input type="text" class="form-control location-name" placeholder="Location Name" name="location_names[]">
            </div>
            <div class="col-md-5">
                <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input type="number" class="form-control location-rate" placeholder="Rate" name="location_rates[]" min="0" step="0.01">
                </div>
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-sm btn-danger remove-location"><i class="fas fa-times"></i></button>
            </div>
        </div>
    `;
    $('#location-rates-container').append(newField);
} 