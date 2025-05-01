// Template CRUD Operations
function loadTemplates() {
    return $.get('/api/templates', function(data) {
        templates = data;
        populateTemplates();
    });
}

function populateTemplates() {
    let html = '';
    
    templates.forEach(template => {
        html += `
            <div class="col-md-4">
                <div class="card template-card">
                    <div class="card-body">
                        <h5 class="card-title">${template.name}</h5>
                        <p class="card-text">${template.description || ''}</p>
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary edit-schedule" data-id="${template.id}">
                                <i class="fa-solid fa-calendar-days"></i> Edit Schedule
                            </button>
                            <div>
                                <button class="btn btn-sm btn-outline-primary edit-template" data-id="${template.id}">
                                    <i class="fa-solid fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-template" data-id="${template.id}">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#templates-list').html(html || '<div class="col-12 text-center">No templates found</div>');
    
    // Add event handlers
    $('.edit-template').on('click', function() {
        const id = $(this).data('id');
        editTemplate(id);
    });
    
    $('.delete-template').on('click', function() {
        const id = $(this).data('id');
        deleteTemplate(id);
    });
    
    $('.edit-schedule').on('click', function() {
        const id = $(this).data('id');
        editSchedule(id);
    });
}

function populateTemplateSelect(selector) {
    let html = '<option value="">Select Template</option>';
    
    templates.forEach(template => {
        html += `<option value="${template.id}">${template.name}</option>`;
    });
    
    $(selector).html(html);
}

function showTemplateModal(template = null) {
    // Reset form
    $('#template-form')[0].reset();
    
    if (template) {
        // Edit mode
        $('#templateModalLabel').text('Edit Template');
        $('#template-id').val(template.id);
        $('#template-name').val(template.name);
        $('#template-description').val(template.description);
    } else {
        // Add mode
        $('#templateModalLabel').text('Add Template');
        $('#template-id').val('');
    }
    
    // Show modal
    const templateModal = new bootstrap.Modal(document.getElementById('templateModal'));
    templateModal.show();
}

function saveTemplate() {
    const id = $('#template-id').val();
    const data = {
        name: $('#template-name').val(),
        description: $('#template-description').val()
    };
    
    if (id) {
        // Update
        $.ajax({
            url: `/api/templates/${id}`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                bootstrap.Modal.getInstance(document.getElementById('templateModal')).hide();
                loadTemplates();
                showNotification('Template updated successfully!');
            },
            error: function() {
                showNotification('Failed to update template!', false);
            }
        });
    } else {
        // Create
        $.ajax({
            url: '/api/templates',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                bootstrap.Modal.getInstance(document.getElementById('templateModal')).hide();
                loadTemplates();
                loadDashboardData();
                showNotification('Template added successfully!');
            },
            error: function() {
                showNotification('Failed to add template!', false);
            }
        });
    }
}

function editTemplate(id) {
    $.get(`/api/templates/${id}`, function(template) {
        showTemplateModal(template);
    });
}

function deleteTemplate(id) {
    if (confirm('Are you sure you want to delete this template?')) {
        $.ajax({
            url: `/api/templates/${id}`,
            type: 'DELETE',
            success: function() {
                loadTemplates();
                loadDashboardData();
                showNotification('Template deleted successfully!');
            },
            error: function() {
                showNotification('Failed to delete template!', false);
            }
        });
    }
}

// Schedule editing
function editSchedule(id) {
    $.get(`/api/templates/${id}`, function(template) {
        currentTemplate = template;
        populateScheduleTable(template);
        
        // Show modal
        $('#scheduleModalLabel').text(`Edit Schedule: ${template.name}`);
        const scheduleModal = new bootstrap.Modal(document.getElementById('scheduleModal'));
        scheduleModal.show();
    });
}

function populateScheduleTable(template) {
    const schedule = template.schedule || {};
    const timeSlots = ['8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    let html = '';
    timeSlots.forEach(timeSlot => {
        html += `<tr><td>${timeSlot}</td>`;
        
        days.forEach(day => {
            const blockData = schedule[day] && schedule[day][timeSlot] || {};
            const hasData = blockData.caregiver_id || blockData.activity_id;
            const caregiverName = blockData.caregiver_id ? (getCaregiverName(blockData.caregiver_id) || 'Unknown') : '';
            const activityName = blockData.activity_id ? (getActivityName(blockData.activity_id) || 'Unknown') : '';
            
            html += `
                <td>
                    <div class="schedule-block ${hasData ? 'has-data' : ''}" data-day="${day}" data-time="${timeSlot}">
                        ${hasData ? `
                            <div class="caregiver-name">${caregiverName}</div>
                            <div class="activity-name">${activityName}</div>
                            <div class="notes">${blockData.notes || ''}</div>
                        ` : ''}
                    </div>
                </td>
            `;
        });
        
        html += '</tr>';
    });
    
    $('#schedule-table tbody').html(html);
    
    // Add click event to schedule blocks
    $('.schedule-block').on('click', function() {
        const day = $(this).data('day');
        const time = $(this).data('time');
        editBlock(day, time);
    });
}

function editBlock(day, time) {
    const blockData = currentTemplate.schedule && currentTemplate.schedule[day] && currentTemplate.schedule[day][time] || {};
    
    // Reset form
    $('#block-form')[0].reset();
    
    // Set day and time
    $('#block-day').val(day);
    $('#block-time').val(time);
    
    // Set values
    $('#block-caregiver').val(blockData.caregiver_id || '');
    $('#block-activity').val(blockData.activity_id || '');
    $('#block-notes').val(blockData.notes || '');
    
    // Populate selects if needed
    if ($('#block-caregiver option').length <= 1) {
        populateCaregiverSelect();
    }
    
    if ($('#block-activity option').length <= 1) {
        populateActivitySelect();
    }
    
    // Show modal
    $('#blockModalLabel').text(`Edit Block: ${day} ${time}`);
    const blockModal = new bootstrap.Modal(document.getElementById('blockModal'));
    blockModal.show();
}

function populateCaregiverSelect() {
    let html = '<option value="">None</option>';
    
    caregivers.forEach(caregiver => {
        html += `<option value="${caregiver.id}">${caregiver.name}</option>`;
    });
    
    $('#block-caregiver').html(html);
}

function populateActivitySelect() {
    let html = '<option value="">None</option>';
    
    activities.forEach(activity => {
        html += `<option value="${activity.id}">${activity.name}</option>`;
    });
    
    $('#block-activity').html(html);
}

function saveBlock() {
    const day = $('#block-day').val();
    const time = $('#block-time').val();
    const caregiverId = $('#block-caregiver').val();
    const activityId = $('#block-activity').val();
    const notes = $('#block-notes').val();
    
    // Initialize schedule object if needed
    if (!currentTemplate.schedule) {
        currentTemplate.schedule = {};
    }
    
    if (!currentTemplate.schedule[day]) {
        currentTemplate.schedule[day] = {};
    }
    
    // Update block data
    currentTemplate.schedule[day][time] = {
        caregiver_id: caregiverId,
        activity_id: activityId,
        notes: notes
    };
    
    // Update display
    const hasData = caregiverId || activityId;
    const caregiverName = caregiverId ? (getCaregiverName(caregiverId) || 'Unknown') : '';
    const activityName = activityId ? (getActivityName(activityId) || 'Unknown') : '';
    
    const blockElement = $(`.schedule-block[data-day="${day}"][data-time="${time}"]`);
    blockElement.toggleClass('has-data', hasData);
    
    if (hasData) {
        blockElement.html(`
            <div class="caregiver-name">${caregiverName}</div>
            <div class="activity-name">${activityName}</div>
            <div class="notes">${notes || ''}</div>
        `);
    } else {
        blockElement.empty();
    }
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('blockModal')).hide();
}

function saveSchedule() {
    $.ajax({
        url: `/api/templates/${currentTemplate.id}`,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(currentTemplate),
        success: function(response) {
            bootstrap.Modal.getInstance(document.getElementById('scheduleModal')).hide();
            showNotification('Schedule saved successfully!');
        },
        error: function() {
            showNotification('Failed to save schedule!', false);
        }
    });
}

// Helper functions for names
function getCaregiverName(id) {
    const caregiver = caregivers.find(c => c.id === id);
    return caregiver ? caregiver.name : null;
}

function getActivityName(id) {
    const activity = activities.find(a => a.id === id);
    return activity ? activity.name : null;
}

function getCategoryName(id) {
    const category = categories.find(c => c.id === id);
    return category ? category.name : null;
}

// Calendar CRUD Operations
function loadCalendars() {
    $.get('/api/calendars', function(data) {
        calendars = data;
        populateCalendars();
    });
}

function populateCalendars() {
    let html = '';
    
    calendars.forEach(calendar => {
        html += `
            <div class="col-md-4">
                <div class="card calendar-card">
                    <div class="card-body">
                        <h5 class="card-title">${calendar.name}</h5>
                        <p class="card-text">Start Date: ${calendar.start_date || 'Not set'}</p>
                        <p class="card-text">${calendar.description || ''}</p>
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary view-calendar" data-id="${calendar.id}">
                                <i class="fa-solid fa-calendar-week"></i> View
                            </button>
                            <div>
                                <button class="btn btn-sm btn-outline-primary edit-calendar" data-id="${calendar.id}">
                                    <i class="fa-solid fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-calendar" data-id="${calendar.id}">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#calendars-list').html(html || '<div class="col-12 text-center">No calendars found</div>');
    
    // Add event handlers
    $('.edit-calendar').on('click', function() {
        const id = $(this).data('id');
        editCalendar(id);
    });
    
    $('.delete-calendar').on('click', function() {
        const id = $(this).data('id');
        deleteCalendar(id);
    });
    
    $('.view-calendar').on('click', function() {
        const id = $(this).data('id');
        viewCalendar(id);
    });
}

function showCalendarModal(calendar = null) {
    // Reset form
    $('#calendar-form')[0].reset();
    
    if (calendar) {
        // Edit mode
        $('#calendarModalLabel').text('Edit Calendar');
        $('#calendar-id').val(calendar.id);
        $('#calendar-name').val(calendar.name);
        $('#calendar-template').val(calendar.template_id || '');
        $('#calendar-start-date').val(calendar.start_date || '');
        $('#calendar-description').val(calendar.description || '');
    } else {
        // Add mode
        $('#calendarModalLabel').text('Add Calendar');
        $('#calendar-id').val('');
        $('#calendar-start-date').val(new Date().toISOString().split('T')[0]);
    }
    
    // Show modal
    const calendarModal = new bootstrap.Modal(document.getElementById('calendarModal'));
    calendarModal.show();
}

function saveCalendar() {
    const id = $('#calendar-id').val();
    const data = {
        name: $('#calendar-name').val(),
        template_id: $('#calendar-template').val(),
        start_date: $('#calendar-start-date').val(),
        description: $('#calendar-description').val()
    };
    
    if (id) {
        // Update
        $.ajax({
            url: `/api/calendars/${id}`,
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide();
                loadCalendars();
                showNotification('Calendar updated successfully!');
            },
            error: function() {
                showNotification('Failed to update calendar!', false);
            }
        });
    } else {
        // Create
        $.ajax({
            url: '/api/calendars',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function(response) {
                bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide();
                loadCalendars();
                showNotification('Calendar added successfully!');
            },
            error: function() {
                showNotification('Failed to add calendar!', false);
            }
        });
    }
}

function editCalendar(id) {
    $.get(`/api/calendars/${id}`, function(calendar) {
        showCalendarModal(calendar);
    });
}

function deleteCalendar(id) {
    if (confirm('Are you sure you want to delete this calendar?')) {
        $.ajax({
            url: `/api/calendars/${id}`,
            type: 'DELETE',
            success: function() {
                loadCalendars();
                showNotification('Calendar deleted successfully!');
            },
            error: function() {
                showNotification('Failed to delete calendar!', false);
            }
        });
    }
}

function viewCalendar(id) {
    $.get(`/api/calendars/${id}`, function(calendar) {
        currentCalendar = calendar;
        // Calendar view implementation would go here
        showNotification('Calendar view not implemented yet.');
    });
}

// Report functions
function loadReports() {
    // Load required data
    Promise.all([
        $.get('/api/caregivers'),
        $.get('/api/categories'),
        $.get('/api/activities'),
        $.get('/api/templates'),
        $.get('/api/calendars')
    ]).then(function([cgData, catData, actData, tmpData, calData]) {
        caregivers = cgData;
        categories = catData;
        activities = actData;
        templates = tmpData;
        calendars = calData;
        
        populateCaregiverPerformance();
        populateActivitiesByCategory();
    });
}

function populateCaregiverPerformance() {
    let html = '';
    
    caregivers.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0));
    
    caregivers.forEach(caregiver => {
        // Count activities assigned to this caregiver in templates
        let activityCount = 0;
        templates.forEach(template => {
            if (template.schedule) {
                Object.values(template.schedule).forEach(daySchedule => {
                    Object.values(daySchedule).forEach(block => {
                        if (block.caregiver_id === caregiver.id) {
                            activityCount++;
                        }
                    });
                });
            }
        });
        
        html += `
            <tr>
                <td>${caregiver.name}</td>
                <td>${caregiver.performance_score || 'N/A'}</td>
                <td>${activityCount}</td>
            </tr>
        `;
    });
    
    $('#caregiver-performance').html(html || '<tr><td colspan="3" class="text-center">No data available</td></tr>');
}

function populateActivitiesByCategory() {
    let categoryActivityCounts = {};
    
    // Count activities by category
    activities.forEach(activity => {
        if (activity.category_id) {
            if (!categoryActivityCounts[activity.category_id]) {
                categoryActivityCounts[activity.category_id] = 0;
            }
            categoryActivityCounts[activity.category_id]++;
        }
    });
    
    // Generate report
    let html = '';
    categories.forEach(category => {
        const count = categoryActivityCounts[category.id] || 0;
        html += `
            <tr>
                <td>${category.name}</td>
                <td>${count}</td>
            </tr>
        `;
    });
    
    $('#activities-by-category').html(html || '<tr><td colspan="2" class="text-center">No data available</td></tr>');
} 