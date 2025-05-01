// Global variables for templates and calendars
let templates = [];
let currentTemplate = null;
let calendars = [];
let currentCalendar = null;
let currentCalendarId = null;

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
            const hasData = (blockData.caregiver_ids && blockData.caregiver_ids.length) || 
                           (blockData.activity_ids && blockData.activity_ids.length);
            
            let caregiverNames = '';
            if (blockData.caregiver_ids && blockData.caregiver_ids.length) {
                caregiverNames = blockData.caregiver_ids
                    .map(id => getCaregiverName(id) || 'Unknown')
                    .join(', ');
            }
            
            let activityNames = '';
            if (blockData.activity_ids && blockData.activity_ids.length) {
                activityNames = blockData.activity_ids
                    .map(id => getActivityName(id) || 'Unknown')
                    .join(', ');
            }
            
            html += `
                <td>
                    <div class="schedule-block ${hasData ? 'has-data' : ''}" data-day="${day}" data-time="${timeSlot}">
                        ${hasData ? `
                            ${caregiverNames ? `<div class="caregiver-name"><strong>Caregivers:</strong> ${caregiverNames}</div>` : ''}
                            ${activityNames ? `<div class="activity-name"><strong>Activities:</strong> ${activityNames}</div>` : ''}
                            ${blockData.notes ? `<div class="notes">${blockData.notes}</div>` : ''}
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
    
    // Populate selects
    populateCaregiverSelect();
    populateActivitySelect();
    
    // Set selected values - handle both old format (single ID) and new format (array of IDs)
    if (blockData.caregiver_ids && blockData.caregiver_ids.length) {
        // Handle multiple IDs (new format)
        setMultiSelectValues('block-caregivers', blockData.caregiver_ids);
    } else if (blockData.caregiver_id) {
        // Handle single ID (old format for backward compatibility)
        setMultiSelectValues('block-caregivers', [blockData.caregiver_id]);
    }
    
    if (blockData.activity_ids && blockData.activity_ids.length) {
        // Handle multiple IDs (new format)
        setMultiSelectValues('block-activities', blockData.activity_ids);
    } else if (blockData.activity_id) {
        // Handle single ID (old format for backward compatibility)
        setMultiSelectValues('block-activities', [blockData.activity_id]);
    }
    
    // Set notes
    $('#block-notes').val(blockData.notes || '');
    
    // Show modal
    $('#blockModalLabel').text(`Edit Block: ${day} ${time}`);
    const blockModal = new bootstrap.Modal(document.getElementById('blockModal'));
    blockModal.show();
}

// Helper function to set multiple select values
function setMultiSelectValues(selectId, values) {
    const select = document.getElementById(selectId);
    if (!select || !values || !values.length) return;
    
    for (let i = 0; i < select.options.length; i++) {
        select.options[i].selected = values.includes(select.options[i].value);
    }
}

function populateCaregiverSelect() {
    let html = '';
    
    if (caregivers.length === 0) {
        html = '<option value="">No caregivers available</option>';
    } else {
        caregivers.forEach(caregiver => {
            html += `<option value="${caregiver.id}">${caregiver.name}</option>`;
        });
    }
    
    $('#block-caregivers').html(html);
}

function populateActivitySelect() {
    let html = '';
    
    if (activities.length === 0) {
        html = '<option value="">No activities available</option>';
    } else {
        activities.forEach(activity => {
            const category = categories.find(c => c.id === activity.category_id);
            const categoryName = category ? category.name : 'Uncategorized';
            html += `<option value="${activity.id}">${activity.name} (${categoryName})</option>`;
        });
    }
    
    $('#block-activities').html(html);
}

// Helper function to get multiple selected values from a select element
function getMultiSelectValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    
    return Array.from(select.selectedOptions).map(option => option.value).filter(val => val);
}

function saveBlock() {
    const day = $('#block-day').val();
    const time = $('#block-time').val();
    const caregiverIds = getMultiSelectValues('block-caregivers');
    const activityIds = getMultiSelectValues('block-activities');
    const notes = $('#block-notes').val();
    
    // Initialize schedule object if needed
    if (!currentTemplate.schedule) {
        currentTemplate.schedule = {};
    }
    
    if (!currentTemplate.schedule[day]) {
        currentTemplate.schedule[day] = {};
    }
    
    // Update block data with arrays for IDs
    currentTemplate.schedule[day][time] = {
        caregiver_ids: caregiverIds,
        activity_ids: activityIds,
        notes: notes
    };
    
    // For backward compatibility, also store the first ID in the old single ID fields
    if (caregiverIds.length > 0) {
        currentTemplate.schedule[day][time].caregiver_id = caregiverIds[0];
    }
    
    if (activityIds.length > 0) {
        currentTemplate.schedule[day][time].activity_id = activityIds[0];
    }
    
    // Update display
    const hasData = caregiverIds.length > 0 || activityIds.length > 0;
    
    let caregiverNames = '';
    if (caregiverIds.length > 0) {
        caregiverNames = caregiverIds
            .map(id => getCaregiverName(id) || 'Unknown')
            .join(', ');
    }
    
    let activityNames = '';
    if (activityIds.length > 0) {
        activityNames = activityIds
            .map(id => getActivityName(id) || 'Unknown')
            .join(', ');
    }
    
    const blockElement = $(`.schedule-block[data-day="${day}"][data-time="${time}"]`);
    blockElement.toggleClass('has-data', hasData);
    
    if (hasData) {
        blockElement.html(`
            ${caregiverNames ? `<div class="caregiver-name"><strong>Caregivers:</strong> ${caregiverNames}</div>` : ''}
            ${activityNames ? `<div class="activity-name"><strong>Activities:</strong> ${activityNames}</div>` : ''}
            ${notes ? `<div class="notes">${notes}</div>` : ''}
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
    currentCalendarId = id;
    
    // Fetch calendar data
    $.get(`/api/calendars/${id}`, function(calendar) {
        currentCalendar = calendar;
        
        // Set view title and description
        $('#calendar-view-title').text(calendar.name || 'Calendar View');
        $('#calendar-view-description').text(calendar.description || '');
        
        // Set export links
        $('#export-ics-link').attr('href', `/api/calendars/${id}/export/ics`);
        
        // Get Google Calendar link
        $.get(`/api/calendars/${id}/export/google`, function(data) {
            $('#export-google-link').attr('href', data.google_calendar_url);
        });
        
        // Load hourly view by default
        loadCalendarView('hourly');
        
        // Hide calendars and show calendar view
        $('.content-section.active').removeClass('active');
        $('#calendar-view').addClass('active');
    });
}

// Load calendar in specified view type
function loadCalendarView(viewType) {
    // Set active button
    $('.btn-group .btn').removeClass('active');
    $(`#view-${viewType}-btn`).addClass('active');
    
    // Hide all view panels
    $('.calendar-view-panel').removeClass('active');
    
    // Fetch and display the appropriate view
    $.get(`/api/calendars/${currentCalendarId}/view/${viewType}`, function(data) {
        // Show the appropriate view panel
        $(`#${viewType}-view`).addClass('active');
        
        // Render view based on type
        if (viewType === 'hourly') {
            renderHourlyView(data);
        } else if (viewType === 'caregiver') {
            renderCaregiverView(data);
        } else if (viewType === 'grant') {
            renderGanttView(data);
        }
    });
}

// Render hourly view (similar to template schedule view)
function renderHourlyView(data) {
    const schedule = data.view_data || {};
    const timeSlots = ['8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    let html = '';
    timeSlots.forEach(timeSlot => {
        html += `<tr><td class="time-cell">${timeSlot}</td>`;
        
        days.forEach(day => {
            const blockData = schedule[day] && schedule[day][timeSlot] || {};
            const hasData = (blockData.caregiver_ids && blockData.caregiver_ids.length) || 
                           (blockData.activity_ids && blockData.activity_ids.length);
            
            let caregiverNames = '';
            if (blockData.caregiver_ids && blockData.caregiver_ids.length) {
                caregiverNames = blockData.caregiver_ids
                    .map(id => getCaregiverName(id) || 'Unknown')
                    .join(', ');
            }
            
            let activityNames = '';
            if (blockData.activity_ids && blockData.activity_ids.length) {
                activityNames = blockData.activity_ids
                    .map(id => getActivityName(id) || 'Unknown')
                    .join(', ');
            }
            
            html += `
                <td>
                    <div class="schedule-block ${hasData ? 'has-data' : ''}" data-day="${day}" data-time="${timeSlot}">
                        ${hasData ? `
                            ${caregiverNames ? `<div class="caregiver-name"><strong>Caregivers:</strong> ${caregiverNames}</div>` : ''}
                            ${activityNames ? `<div class="activity-name"><strong>Activities:</strong> ${activityNames}</div>` : ''}
                            ${blockData.notes ? `<div class="notes">${blockData.notes}</div>` : ''}
                        ` : ''}
                    </div>
                </td>
            `;
        });
        
        html += '</tr>';
    });
    
    $('#hourly-view-table tbody').html(html);
}

// Render caregiver view (grouped by caregiver)
function renderCaregiverView(data) {
    const caregiverView = data.view_data || {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    let html = '<div class="row">';
    
    // Create a card for each caregiver
    Object.values(caregiverView).forEach(cgData => {
        const caregiver = cgData.caregiver;
        const schedule = cgData.schedule;
        
        html += `
            <div class="col-md-6 col-lg-4">
                <div class="card caregiver-card">
                    <div class="card-header">
                        <h4>${caregiver.name}</h4>
                        <div class="text-muted">Performance: ${caregiver.performance_score || 'N/A'}</div>
                    </div>
                    <div class="card-body">
        `;
        
        // Add schedule for each day
        days.forEach(day => {
            html += `<div class="caregiver-schedule-day">
                <h5>${day}</h5>
            `;
            
            // If caregiver has slots for this day
            if (schedule[day]) {
                const timeSlots = Object.keys(schedule[day]).sort();
                timeSlots.forEach(timeSlot => {
                    const blockData = schedule[day][timeSlot];
                    
                    // Get activities for this block
                    let activityNames = '';
                    const activityIds = blockData.activity_ids || [];
                    if (blockData.activity_id && !activityIds.includes(blockData.activity_id)) {
                        activityIds.push(blockData.activity_id);
                    }
                    
                    if (activityIds.length) {
                        activityNames = activityIds
                            .map(id => getActivityName(id) || 'Unknown')
                            .join(', ');
                    }
                    
                    html += `
                        <div class="caregiver-schedule-slot active">
                            <div><strong>${timeSlot}</strong></div>
                            <div>${activityNames}</div>
                            ${blockData.notes ? `<div class="text-muted small">${blockData.notes}</div>` : ''}
                        </div>
                    `;
                });
            } else {
                html += `<div class="text-muted">No activities scheduled</div>`;
            }
            
            html += `</div>`;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    $('#caregiver-view-container').html(html);
}

// Render Gantt view (grouped by activity)
function renderGanttView(data) {
    const ganttView = data.view_data || {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    let html = '';
    
    // Create a row for each activity
    Object.values(ganttView).forEach(actData => {
        const activity = actData.activity;
        const schedule = actData.schedule;
        
        // Get category name
        let categoryName = 'Uncategorized';
        if (activity.category_id) {
            categoryName = getCategoryName(activity.category_id) || 'Uncategorized';
        }
        
        html += `
            <div class="gantt-row">
                <div class="gantt-row-header">
                    <div>${activity.name}</div>
                    <div class="text-muted">${categoryName}</div>
                </div>
                <div class="gantt-row-body">
        `;
        
        // Add columns for each day
        days.forEach(day => {
            html += `
                <div class="gantt-day">
                    <div class="gantt-day-header">${day}</div>
            `;
            
            // If activity has slots for this day
            if (schedule[day]) {
                const timeSlots = Object.keys(schedule[day]).sort();
                timeSlots.forEach(timeSlot => {
                    const blockData = schedule[day][timeSlot];
                    
                    // Get caregivers for this block
                    let caregiverNames = '';
                    const caregiverIds = blockData.caregiver_ids || [];
                    if (blockData.caregiver_id && !caregiverIds.includes(blockData.caregiver_id)) {
                        caregiverIds.push(blockData.caregiver_id);
                    }
                    
                    if (caregiverIds.length) {
                        caregiverNames = caregiverIds
                            .map(id => getCaregiverName(id) || 'Unknown')
                            .join(', ');
                    }
                    
                    html += `
                        <div class="gantt-slot">
                            <div><strong>${timeSlot}</strong></div>
                            <div><small>Caregivers: ${caregiverNames}</small></div>
                            ${blockData.notes ? `<div class="text-muted small">${blockData.notes}</div>` : ''}
                        </div>
                    `;
                });
            } else {
                html += `<div class="text-muted">No slots</div>`;
            }
            
            html += `
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    $('#gantt-view-container').html(html);
}

// Event Handlers for Calendar Views
$(document).ready(function() {
    // View type buttons
    $('#view-hourly-btn').click(function() {
        loadCalendarView('hourly');
    });
    
    $('#view-caregiver-btn').click(function() {
        loadCalendarView('caregiver');
    });
    
    $('#view-gantt-btn').click(function() {
        loadCalendarView('grant');
    });
    
    // Back button
    $('#close-calendar-view-btn').click(function() {
        $('.content-section.active').removeClass('active');
        $('#calendars').addClass('active');
    });
});

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
    
    // Map to store caregiver assignment counts
    const caregiverAssignments = {};
    
    // Initialize assignment counts
    caregivers.forEach(caregiver => {
        caregiverAssignments[caregiver.id] = 0;
    });
    
    // Count activities assigned to each caregiver in templates
    templates.forEach(template => {
        if (template.schedule) {
            Object.values(template.schedule).forEach(daySchedule => {
                Object.values(daySchedule).forEach(block => {
                    // Check for new data structure (caregiver_ids array)
                    if (block.caregiver_ids && Array.isArray(block.caregiver_ids)) {
                        block.caregiver_ids.forEach(caregiverId => {
                            if (caregiverAssignments[caregiverId] !== undefined) {
                                caregiverAssignments[caregiverId]++;
                            }
                        });
                    } 
                    // Check for old data structure (single caregiver_id)
                    else if (block.caregiver_id) {
                        if (caregiverAssignments[block.caregiver_id] !== undefined) {
                            caregiverAssignments[block.caregiver_id]++;
                        }
                    }
                });
            });
        }
    });
    
    // Generate the report HTML
    caregivers.forEach(caregiver => {
        const activityCount = caregiverAssignments[caregiver.id] || 0;
        
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