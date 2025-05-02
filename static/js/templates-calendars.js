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
    if (!calendars || calendars.length === 0) {
        $('#calendarsContainer').html('<p>No calendars available. Create a new calendar to get started.</p>');
        return;
    }

    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Template</th>
                    <th>Start Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    calendars.forEach(calendar => {
        const template = templates.find(t => t.id === calendar.template_id);
        const templateName = template ? template.name : 'None';
        const startDate = calendar.start_date ? new Date(calendar.start_date).toLocaleDateString() : 'Not set';

        html += `
            <tr>
                <td>${calendar.name}</td>
                <td>${templateName}</td>
                <td>${startDate}</td>
                <td>
                    <button class="btn btn-sm btn-info view-calendar-btn" data-id="${calendar.id}">
                        <i class="fas fa-calendar-alt"></i> View
                    </button>
                    <button class="btn btn-sm btn-primary edit-calendar-btn" data-id="${calendar.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-calendar-btn" data-id="${calendar.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    $('#calendarsContainer').html(html);

    // Set up event handlers
    $('.view-calendar-btn').click(function() {
        const id = $(this).data('id');
        viewCalendar(id);
    });
    
    $('.edit-calendar-btn').click(function() {
        const id = $(this).data('id');
        showCalendarModal(id);
    });

    $('.delete-calendar-btn').click(function() {
        const id = $(this).data('id');
        if (confirm('Are you sure you want to delete this calendar?')) {
            deleteCalendar(id);
        }
    });
}

function showCalendarModal(calendarOrId = null) {
    // Reset the form
    $('#calendar-form')[0].reset();
    $('#calendar-id').val('');
    
    const modalTitle = calendarOrId ? 'Edit Calendar' : 'Add Calendar';
    $('#calendarModalLabel').text(modalTitle);
    
    // Populate template dropdown
    populateTemplateSelect('#calendar-template-id');
    
    // If editing a calendar
    if (calendarOrId) {
        // If we received an ID instead of a calendar object
        if (typeof calendarOrId === 'string' || typeof calendarOrId === 'number') {
            const id = calendarOrId;
            $.get(`/api/calendars/${id}`, function(calendar) {
                populateCalendarForm(calendar);
            });
        } else {
            // If we received a calendar object directly
            populateCalendarForm(calendarOrId);
        }
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('calendarModal'));
    modal.show();
}

function populateCalendarForm(calendar) {
    // Populate form fields with calendar data
    $('#calendar-id').val(calendar.id);
    $('#calendar-name').val(calendar.name);
    $('#calendar-template').val(calendar.template_id || '');
    $('#calendar-start-date').val(calendar.start_date || '');
    $('#calendar-description').val(calendar.description || '');
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
        
        // If calendar has a template, get the template data
        if (calendar.template_id) {
            const template = templates.find(t => t.id === calendar.template_id);
            if (template) {
                // Start date of the calendar
                const startDate = calendar.start_date ? new Date(calendar.start_date) : new Date();
                
                // Initialize current week to first week
                currentCalendar.currentWeekOffset = 0;
                
                // Show calendar view
                showCalendarView(calendar, template, startDate);
            } else {
                showNotification(`Template not found for calendar ${calendar.name}`, false);
            }
        } else {
            showNotification(`No template associated with calendar ${calendar.name}`, false);
        }
    });
}

function showCalendarView(calendar, template, startDate) {
    // Set modal title
    $('#calendarViewModalLabel').text(`Calendar View: ${calendar.name}`);
    $('#calendar-view-title').text(calendar.name);
    
    // Calculate week dates based on current week offset
    const weekOffset = calendar.currentWeekOffset || 0;
    const weekStartDate = new Date(startDate);
    
    // Adjust weekStartDate to the Monday of the week containing startDate
    const dayOfWeek = weekStartDate.getDay(); // 0 (Sunday) to 6 (Saturday)
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday special case
    weekStartDate.setDate(weekStartDate.getDate() + daysToMonday + (weekOffset * 7));
    
    // Generate and display week range
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    
    $('#week-display').text(
        `Week: ${formatDate(weekStartDate)} - ${formatDate(weekEndDate)}`
    );
    
    // Update the date headers
    updateCalendarDateHeaders(weekStartDate);
    
    // Populate calendar schedule
    populateCalendarSchedule(calendar, template, weekStartDate);
    
    // Show modal
    const calendarViewModal = new bootstrap.Modal(document.getElementById('calendarViewModal'));
    calendarViewModal.show();
    
    // Set up week navigation handlers
    $('#prev-week-btn').off('click').on('click', function() {
        calendar.currentWeekOffset--;
        showCalendarView(calendar, template, startDate);
    });
    
    $('#next-week-btn').off('click').on('click', function() {
        calendar.currentWeekOffset++;
        showCalendarView(calendar, template, startDate);
    });
    
    // Set up print handler
    $('#print-calendar-btn').off('click').on('click', function() {
        window.print();
    });
}

function updateCalendarDateHeaders(weekStartDate) {
    const dateHeaderRow = $('#calendar-dates-header');
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Clear existing headers except the first time column
    dateHeaderRow.find('th:not(:first-child)').remove();
    
    // Today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add date headers for each day of the week
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStartDate);
        currentDate.setDate(currentDate.getDate() + i);
        
        const dateStr = formatDate(currentDate, 'short');
        const isToday = isSameDay(currentDate, today);
        
        dateHeaderRow.append(`
            <th class="${isToday ? 'today-header' : ''}" data-date="${formatDate(currentDate, 'iso')}">
                ${dayNames[i]}<br>${dateStr}
            </th>
        `);
    }
}

function populateCalendarSchedule(calendar, template, weekStartDate) {
    const timeSlots = ['8-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const schedule = template.schedule || {};
    const tbody = $('#calendar-view-table tbody');
    
    // Clear existing content
    tbody.empty();
    
    // Today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate schedule rows for each time slot
    timeSlots.forEach(timeSlot => {
        let html = `<tr><td>${timeSlot}</td>`;
        
        // For each day of the week
        for (let i = 0; i < 7; i++) {
            const dayName = dayNames[i];
            const currentDate = new Date(weekStartDate);
            currentDate.setDate(currentDate.getDate() + i);
            
            const dateStr = formatDate(currentDate, 'short');
            const blockData = schedule[dayName] && schedule[dayName][timeSlot] || {};
            
            // Determine if the block has data
            const hasData = (blockData.caregiver_ids && blockData.caregiver_ids.length) || 
                           (blockData.activity_ids && blockData.activity_ids.length);
            
            // Get caregiver and activity names
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
            
            // Determine block class based on date
            let blockClass = 'calendar-block';
            if (hasData) blockClass += ' has-data';
            
            if (isSameDay(currentDate, today)) {
                blockClass += ' today';
            } else if (currentDate < today) {
                blockClass += ' past';
            } else {
                blockClass += ' future';
            }
            
            html += `
                <td>
                    <div class="${blockClass}" data-date="${formatDate(currentDate, 'iso')}">
                        ${hasData ? `
                            ${caregiverNames ? `<div class="caregiver-name"><strong>Caregivers:</strong> ${caregiverNames}</div>` : ''}
                            ${activityNames ? `<div class="activity-name"><strong>Activities:</strong> ${activityNames}</div>` : ''}
                            ${blockData.notes ? `<div class="notes">${blockData.notes}</div>` : ''}
                        ` : ''}
                    </div>
                </td>
            `;
        }
        
        html += '</tr>';
        tbody.append(html);
    });
}

// Helper function to format dates
function formatDate(date, format = 'medium') {
    if (!date) return '';
    
    const d = new Date(date);
    
    switch (format) {
        case 'iso':
            // YYYY-MM-DD
            return d.toISOString().split('T')[0];
            
        case 'short':
            // MMM D (e.g., May 1)
            return new Intl.DateTimeFormat('en-US', { 
                month: 'short', 
                day: 'numeric' 
            }).format(d);
            
        case 'medium':
        default:
            // MMM D, YYYY (e.g., May 1, 2025)
            return new Intl.DateTimeFormat('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            }).format(d);
    }
}

// Helper function to check if two dates are the same day
function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
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

// Event Handlers for Calendars
$(document).ready(function() {
    // Add calendar button
    $('#add-calendar-btn').off('click').on('click', function() {
        showCalendarModal();
    });
    
    // Save calendar button
    $('#save-calendar').off('click').on('click', saveCalendar);
}); 