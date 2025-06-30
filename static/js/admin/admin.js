document.addEventListener('DOMContentLoaded', function() {
    // --- Form Elements ---
    const routeForm = document.getElementById('routeForm');
    const routeIdInput = document.getElementById('routeId'); // Hidden input for document ID
    const sourceInput = document.getElementById('source');
    const destinationInput = document.getElementById('destination');
    const corporationSelect = document.getElementById('corporation');
    const routeNoInput = document.getElementById('route_no'); // Get the route_no input
    const serviceTypeInput = document.getElementById('service_type');
    const departureInput = document.getElementById('departure');
    const arrivalInput = document.getElementById('arrival');
    const fareInput = document.getElementById('fare');
    const isRecurringCheckbox = document.getElementById('is_recurring');
    const specificDateInput = document.getElementById('specific_date');
    const specificDateGroup = document.getElementById('specificDateGroup'); // Parent div to toggle

    const submitButton = document.getElementById('submitButton');
    const cancelEditButton = document.getElementById('cancelEditButton');

    // --- Table Elements ---
    const routeTableBody = document.getElementById('routeTableBody');

    // --- Modal Elements ---
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    let routeIdToDelete = null; // Variable to store the ID of the route to be deleted

    // --- Status Message Modal Elements ---
    const statusMessageModal = document.getElementById('statusMessageModal');
    const statusMessageHeading = document.getElementById('statusMessageHeading');
    const statusMessageText = document.getElementById('statusMessageText');
    const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');

    // --- Explicitly hide modals on page load to prevent unintended display ---
    // This is a safety measure; the primary fix is in CSS, but good to keep.
    if (statusMessageModal) {
        statusMessageModal.style.display = 'none';
    }
    if (deleteConfirmModal) {
        deleteConfirmModal.style.display = 'none';
    }
    // --- End Explicit Hiding ---

    // --- Global Data for Suggestions ---
    let allUniqueRouteNumbers = []; // Initialize an empty array for route numbers

    // --- Initial Setup ---
    // Set the form action dynamically here on DOMContentLoaded
    routeForm.action = adminAddRouteUrl; 
    resetForm(); // Start in 'Add Route' mode
    
    // Extract unique route numbers after allRoutesData is loaded
    if (allRoutesData && Array.isArray(allRoutesData)) {
        const routeNoSet = new Set();
        allRoutesData.forEach(route => {
            if (route['Route No']) {
                routeNoSet.add(route['Route No'].trim());
            }
        });
        allUniqueRouteNumbers = Array.from(routeNoSet).sort();
        console.log("Unique Route Numbers extracted:", allUniqueRouteNumbers);
    }

    renderRoutes(allRoutesData); // Initial render of the table

    // Set min date for specific_date input
    const today = new Date().toISOString().split('T')[0];
    if (specificDateInput) {
        specificDateInput.setAttribute('min', today);
    }

    // --- Event Listeners for Time Inputs ---
    departureInput.addEventListener('input', formatTimeInput);
    departureInput.addEventListener('blur', validateTimeInput); // Validate on blur
    arrivalInput.addEventListener('input', formatTimeInput);
    arrivalInput.addEventListener('blur', validateTimeInput); // Validate on blur

    function formatTimeInput(event) {
        let value = event.target.value.replace(/[^0-9]/g, ''); // Remove non-digits
        if (value.length > 4) {
            value = value.substring(0, 4); // Limit to 4 digits (HHMM)
        }

        if (value.length >= 3) {
            event.target.value = value.substring(0, 2) + ':' + value.substring(2, 4);
        } else {
            event.target.value = value;
        }
    }

    function validateTimeInput(event) {
        const input = event.target;
        const time = input.value;
        const pattern = /^([01]\d|2[0-3]):([0-5]\d)$/; // Regex for HH:MM (24-hour)

        if (!pattern.test(time) && time !== '') {
            input.setCustomValidity('Please enter time in HH:MM (24-hour format, e.g., 14:30).');
            input.reportValidity();
        } else {
            input.setCustomValidity(''); // Clear custom validity message
        }
    }


    // Toggle specific date input based on recurring checkbox
    isRecurringCheckbox.addEventListener('change', toggleSpecificDate);
    // Initial call to set correct state on page load
    toggleSpecificDate(); // Make sure it runs initially to set disabled state correctly


    // Handle form submission (Add/Update)
    routeForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent default form submission

        console.log("Form submitted. Current action:", routeForm.action);
        // Debug: Log all form data before submission
        const formData = new FormData(routeForm);
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

        // --- Client-side validation for recurring/specific_date ---
        if (isRecurringCheckbox.checked && specificDateInput.value) {
            showStatusModal('Error: Cannot set both "Is Recurring Service" and a "Specific Date". Please choose one.', false);
            return;
        } else if (!isRecurringCheckbox.checked && !specificDateInput.value) {
             showStatusModal('Error: Must set either "Is Recurring Service" or a "Specific Date".', false);
             return;
        }

        // Ensure specific_date is enabled if it's supposed to be sent
        if (!isRecurringCheckbox.checked && specificDateInput.hasAttribute('disabled')) {
            specificDateInput.removeAttribute('disabled'); 
        }

        try {
            const response = await fetch(routeForm.action, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.status === 'success') {
                showStatusModal(result.message, true);
                resetForm(); // Reset form after successful submission
                // Page will reload after modal dismissal to reflect changes
            } else {
                showStatusModal(result.message, false);
                // Re-enable specific_date if it was temporarily enabled for submission and there was an error
                if (!isRecurringCheckbox.checked) {
                    specificDateInput.setAttribute('disabled', 'disabled');
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showStatusModal('An unexpected error occurred. Please try again.', false);
        } finally {
            // If specific_date was enabled temporarily for submission, re-disable it unless checkbox is checked.
            if (!isRecurringCheckbox.checked) {
                specificDateInput.setAttribute('disabled', 'disabled');
            }
        }
    });

    // Handle Cancel Edit button click
    cancelEditButton.addEventListener('click', resetForm);

    // --- Functions ---

    function resetForm() {
        routeForm.reset(); // Clear all form fields
        routeIdInput.value = ''; // Clear hidden ID
        // Ensure action is set to ADD when resetting
        routeForm.action = adminAddRouteUrl; 
        submitButton.textContent = 'Add Route'; // Change button text
        submitButton.classList.replace('update-button', 'add-button'); // Change button style
        cancelEditButton.style.display = 'none'; // Hide cancel button
        isRecurringCheckbox.checked = false; // Reset checkbox state
        toggleSpecificDate(); // Update specific date input visibility and disabled state
        
        // Clear any custom validity messages after reset
        departureInput.setCustomValidity('');
        arrivalInput.setCustomValidity('');

        console.log("Form reset to 'Add Route' mode. Form action set to:", routeForm.action);
    }

    // Function to toggle specific date input visibility and required/disabled state
    function toggleSpecificDate() {
        if (specificDateGroup && specificDateInput) {
            if (isRecurringCheckbox.checked) {
                specificDateGroup.style.display = 'none';
                specificDateInput.removeAttribute('required');
                specificDateInput.setAttribute('disabled', 'disabled'); // Disable if recurring
            } else {
                specificDateGroup.style.display = 'block';
                specificDateInput.setAttribute('required', 'required');
                specificDateInput.removeAttribute('disabled'); // Enable if not recurring
            }
        }
    }


    // Function to populate the form for editing
    window.editRoute = function(routeId) {
        console.log('Editing route with ID:', routeId);
        const routeToEdit = allRoutesData.find(route => route.id === routeId);

        if (routeToEdit) {
            console.log('Found route details for editing:', routeToEdit);
            routeIdInput.value = routeToEdit.id;
            sourceInput.value = routeToEdit.Source || '';
            destinationInput.value = routeToEdit.Destination || '';
            corporationSelect.value = routeToEdit.Corporation || '';
            routeNoInput.value = routeToEdit['Route No'] || '';
            serviceTypeInput.value = routeToEdit['Service Type'] || '';
            departureInput.value = routeToEdit.Departure || '';
            arrivalInput.value = routeToEdit.Arrival || '';
            fareInput.value = routeToEdit.Fare || '';
            
            // Ensure boolean conversion for checkbox
            isRecurringCheckbox.checked = routeToEdit.is_recurring === true; 
            specificDateInput.value = routeToEdit.specific_date || '';

            toggleSpecificDate(); // Update visibility and disabled state based on loaded data

            // Set the form action to UPDATE when editing
            routeForm.action = adminUpdateRouteUrl; 
            submitButton.textContent = 'Update Route'; // Change button text
            submitButton.classList.replace('add-button', 'update-button'); // Change button style
            cancelEditButton.style.display = 'inline-block'; // Show cancel button
            console.log("Form set to 'Update Route' mode for ID:", routeId, "Form action set to:", routeForm.action);

            // Clear any custom validity messages on edit load
            departureInput.setCustomValidity('');
            arrivalInput.setCustomValidity('');

            // Scroll to the form
            routeForm.scrollIntoView({ behavior: 'smooth' });

        } else {
            console.error('Route not found in allRoutesData for ID:', routeId);
            showStatusModal('Route details not found for editing. Please refresh and try again.', false);
        }
    };

    // Function to handle delete confirmation modal
    window.confirmDelete = function(id) {
        routeIdToDelete = id;
        deleteConfirmModal.style.display = 'flex'; // Changed to 'flex'
    }

    // Handle Confirm Delete button click
    confirmDeleteBtn.onclick = async function() {
        if (routeIdToDelete) {
            deleteConfirmModal.style.display = 'none'; // Hide confirmation modal immediately

            const formData = new FormData();
            formData.append('id', routeIdToDelete);

            try {
                const response = await fetch(adminDeleteRouteUrl, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.status === 'success') {
                    showStatusModal(result.message, true);
                    // Page will reload after modal dismissal to reflect changes
                } else {
                    showStatusModal(result.message, false);
                }
            } catch (error) {
                console.error('Delete fetch error:', error);
                showStatusModal('An unexpected error occurred during deletion. Please try again.', false);
            } finally {
                routeIdToDelete = null; // Clear the stored ID
            }
        }
    }

    cancelDeleteBtn.onclick = function() {
        deleteConfirmModal.style.display = 'none';
        routeIdToDelete = null;
    }

    // Close modals by clicking outside (general behavior for both modals)
    window.onclick = function(event) {
        if (event.target == deleteConfirmModal) {
            deleteConfirmModal.style.display = 'none';
            routeIdToDelete = null;
        }
        if (event.target == statusMessageModal) {
            statusMessageModal.style.display = 'none';
            // Reload page if a success message was displayed, otherwise just close.
            if (statusMessageHeading.textContent === 'Success!') { 
                window.location.reload(); 
            }
        }
    }

    // Handle close button for status message modal
    closeStatusModalBtn.onclick = function() {
        statusMessageModal.style.display = 'none';
        // Reload page if a success message was displayed
        if (statusMessageHeading.textContent === 'Success!') { 
            window.location.reload(); 
        }
    }


    // --- Generic Status Message Popup Function ---
    function showStatusModal(message, isSuccess = true) {
        statusMessageHeading.textContent = isSuccess ? 'Success!' : 'Error!';
        statusMessageHeading.style.color = isSuccess ? '#28a745' : '#dc3545'; // Green for success, red for error
        statusMessageText.textContent = message;
        statusMessageModal.style.display = 'flex'; // Changed to 'flex'
    }


    // --- Autocomplete / Suggest Functions for Admin Panel ---

    window.suggestAdmin = async function(fieldId) {
        const inputElement = document.getElementById(fieldId);
        let datalistId;
        // Determine datalist ID based on the input field's ID in the unified form
        if (fieldId === 'source') {
            datalistId = 'source_list';
        } else if (fieldId === 'destination') {
            datalistId = 'destination_list';
        } else if (fieldId === 'filter_source') {
            datalistId = 'filter_source_list';
        } else if (fieldId === 'filter_destination') {
            datalistId = 'filter_destination_list';
        } else {
            console.warn(`Unknown fieldId for suggestAdmin: ${fieldId}`);
            return;
        }

        const datalistElement = document.getElementById(datalistId);
        const query = inputElement.value.trim();

        if (query.length < 2) {
            if (datalistElement) datalistElement.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`/get_locations?query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const locations = await response.json();
            console.log(`Admin Location suggestions for '${query}' (Field: ${fieldId}):`, locations);

            if (datalistElement) {
                datalistElement.innerHTML = '';
                locations.forEach(loc => {
                    const option = document.createElement('option');
                    option.value = loc;
                    datalistElement.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error fetching admin locations:', error);
        }
    };

    window.suggestServiceTypeAdmin = function(fieldId) {
        const inputElement = document.getElementById(fieldId);
        // For the single form, the service_type input's datalist is 'service_type_list'
        // For filters, it would be 'filter_service_type_list' (if implemented)
        const datalistId = `${fieldId}_list`; 
        const datalistElement = document.getElementById(datalistId);
        const query = inputElement.value.trim().toLowerCase();

        console.log(`Admin Service Type suggestion for '${query}' (Field: ${fieldId})`);
        console.log("allServiceTypes (Admin):", allServiceTypes); 

        if (!Array.isArray(allServiceTypes) || allServiceTypes.length === 0) {
            console.warn("allServiceTypes (Admin) is empty or not an array. Attempting AJAX fallback.");
            if (query.length >= 1) {
                fetch(`/get_service_types?query=${encodeURIComponent(query)}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(serviceTypes => {
                        console.log("Admin Fallback: fetched service types via AJAX:", serviceTypes);
                        if (datalistElement) {
                            datalistElement.innerHTML = '';
                            serviceTypes.forEach(type => {
                                const option = document.createElement('option');
                                option.value = type;
                                datalistElement.appendChild(option);
                            });
                        }
                    })
                    .catch(error => console.error('Error fetching admin service types (fallback):', error));
            }
            return;
        }

        if (query.length < 1) {
            if (datalistElement) datalistElement.innerHTML = '';
            return;
        }

        const filteredServiceTypes = allServiceTypes.filter(type =>
            type.toLowerCase().includes(query)
        );
        console.log(`Filtered service types for '${query}':`, filteredServiceTypes);

        if (datalistElement) {
            datalistElement.innerHTML = '';
            filteredServiceTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                datalistElement.appendChild(option);
            });
        }
    };

    // New function for Route Number suggestions
    window.suggestRouteNumbersAdmin = function() {
        const inputElement = routeNoInput; // Refers to the globally defined routeNoInput
        const datalistElement = document.getElementById('route_no_list');
        const query = inputElement.value.trim().toLowerCase();

        if (datalistElement) {
            datalistElement.innerHTML = ''; // Clear previous suggestions
        }

        if (query.length < 1) { // Suggest after at least 1 character
            return;
        }

        const filteredRouteNumbers = allUniqueRouteNumbers.filter(routeNo =>
            routeNo.toLowerCase().includes(query)
        );
        
        console.log(`Route number suggestions for '${query}':`, filteredRouteNumbers);

        if (datalistElement) {
            filteredRouteNumbers.forEach(routeNo => {
                const option = document.createElement('option');
                option.value = routeNo;
                datalistElement.appendChild(option);
            });
        }
    };


    // --- Route Filtering and Rendering ---
    window.filterRoutes = function() {
        const filterSource = document.getElementById('filter_source').value.toLowerCase();
        const filterDestination = document.getElementById('filter_destination').value.toLowerCase();
        const filterCorporation = document.getElementById('filter_corporation').value.toLowerCase();

        const filtered = allRoutesData.filter(route => {
            const matchesSource = !filterSource || (route.Source && route.Source.toLowerCase().includes(filterSource));
            const matchesDestination = !filterDestination || (route.Destination && route.Destination.toLowerCase().includes(filterDestination));
            const matchesCorporation = !filterCorporation || (route.Corporation && route.Corporation.toLowerCase() === filterCorporation);
            return matchesSource && matchesDestination && matchesCorporation;
        });
        renderRoutes(filtered);
    };


    // --- Render Existing Routes Table (for sequential S.NO. and actions) ---
    function renderRoutes(routesToRender) {
        if (!routeTableBody) {
            console.error("renderRoutes: routeTableBody element not found in admin page. Cannot render table.");
            return;
        }

        routeTableBody.innerHTML = ''; // Clear existing rows

        if (routesToRender && routesToRender.length > 0) {
            console.log("renderRoutes: Rendering", routesToRender.length, "routes with sequential S.NO. in admin table.");
            routesToRender.forEach((route, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="display:none;">${route.id || 'N/A'}</td> 
                    <td>${index + 1}</td> 
                    <td>${route.Corporation || 'N/A'}</td>
                    <td>${route['Route No'] || 'N/A'}</td>
                    <td>${route['Service Type'] || 'N/A'}</td>
                    <td>${route.Source || 'N/A'}</td>
                    <td>${route.Destination || 'N/A'}</td>
                    <td>${route.Arrival || 'N/A'}</td>
                    <td>${route.Departure || 'N/A'}</td>
                    <td>${route.Fare || 'N/A'}</td>
                    <td>${route.is_recurring ? 'Yes' : 'No'}</td>
                    <td>${route.specific_date || 'N/A'}</td>
                    <td class="actions">
                        <button class="edit-button" onclick="editRoute('${route.id}')">Edit</button>
                        <button class="delete-button" onclick="confirmDelete('${route.id}')">Delete</button>
                    </td>
                `;
                routeTableBody.appendChild(row);
            });
        } else {
            console.log("No routes to render in admin table.");
            const noResultsRow = document.createElement('tr');
            noResultsRow.innerHTML = `<td colspan="12" style="text-align: center;">No routes found. Please add some or adjust filters.</td>`;
            routeTableBody.appendChild(noResultsRow);
        }
    }
});
