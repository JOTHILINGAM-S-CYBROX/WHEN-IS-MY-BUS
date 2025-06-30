document.addEventListener('DOMContentLoaded', function() {
    // Top-level element references
    const fromLocationInput = document.getElementById('from');
    const toLocationInput = document.getElementById('to');
    const searchDateInput = document.getElementById('date'); // Renamed from 'dateInput' for consistency
    const busResultsTableBody = document.getElementById('busResultsTableBody'); 
    const serviceTypeInput = document.getElementById('service_type'); // NEW: Reference for service type input

    // --- Digital Clock Functionality ---
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const formattedTime = `${hours}:${minutes}:${seconds}`;
        const clockElement = document.getElementById("clock"); 
        if (clockElement) {
            clockElement.innerHTML = formattedTime.split('').map(char => `<span>${char}</span>`).join('');
        }
    }
    if (document.getElementById("clock")) {
        setInterval(updateClock, 1000);
        updateClock(); 
    }

    // --- Date Input Handling (Today/Tomorrow Buttons) ---
    const todayButton = document.getElementById('todayButton');
    const tomorrowButton = document.getElementById('tomorrowButton');

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    if (searchDateInput) { 
        const setTodayWithoutSubmit = () => {
            const today = new Date();
            searchDateInput.value = formatDate(today);
        };
        if (!searchDateInput.value) {
            setTodayWithoutSubmit();
        }

        const setMinDate = () => {
            const today = new Date().toISOString().split("T")[0];
            searchDateInput.setAttribute("min", today);
        };
        setMinDate();

        // These buttons now use type="button" in HTML, so we explicitly submit the form here
        if (todayButton) {
            todayButton.addEventListener('click', function() {
                searchDateInput.value = formatDate(new Date());
                const form = document.querySelector("form");
                if (form) form.submit(); // Submit the form explicitly
            });
        }

        if (tomorrowButton) {
            tomorrowButton.addEventListener('click', function() {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                searchDateInput.value = formatDate(tomorrow);
                const form = document.querySelector("form");
                if (form) form.submit(); // Submit the form explicitly
            });
        }
    }

    // --- Autocomplete / Suggest Functions ---
    // Changed `window.suggest` to `window.suggestLocations` as per HTML oninput
    window.suggestLocations = async function(fieldId) {
        const inputElement = document.getElementById(fieldId);
        const datalistElement = document.getElementById(`${fieldId}_list`);
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
            console.log(`Locations suggested for '${query}':`, locations); 

            if (datalistElement) {
                datalistElement.innerHTML = '';
                locations.forEach(loc => {
                    const option = document.createElement('option');
                    option.value = loc;
                    datalistElement.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    // NEW: Function for Service Type Autocomplete on main page
    window.suggestServiceType = function(fieldId) {
        const inputElement = document.getElementById(fieldId);
        const datalistElement = document.getElementById(`${fieldId}_list`);
        const query = inputElement.value.trim().toLowerCase();

        console.log(`Attempting service type suggestion for '${query}'`); 
        console.log("allServiceTypes variable content:", allServiceTypes); 

        if (!Array.isArray(allServiceTypes) || allServiceTypes.length === 0) {
            console.warn("allServiceTypes is empty or not an array. Service type suggestions might not work as expected.");
            // Fallback AJAX call if allServiceTypes is not properly loaded
            if (query.length >=1) { 
                 fetch(`/get_service_types?query=${encodeURIComponent(query)}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(serviceTypes => {
                        console.log("Fallback: fetched service types via AJAX:", serviceTypes); 
                        if (datalistElement) {
                            datalistElement.innerHTML = '';
                            serviceTypes.forEach(type => {
                                const option = document.createElement('option');
                                option.value = type;
                                datalistElement.appendChild(option);
                            });
                        }
                    })
                    .catch(error => console.error('Error fetching service types (fallback):', error));
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


    // --- Swap Locations Function ---
    window.swapLocations = function() {
        const fromInput = document.getElementById('from');
        const toInput = document.getElementById('to');
        if (fromInput && toInput) {
            const temp = fromInput.value;
            fromInput.value = toInput.value;
            toInput.value = temp;
            fromInput.focus();
        }
    };

    // --- Other Form Element Event Listeners ---
    const form = document.querySelector("form"); 
    const from = document.getElementById("from");
    const to = document.getElementById("to");

    if (form) { 
        if (searchDateInput) { 
            searchDateInput.addEventListener("keypress", function (e) {
                if (e.key === "Enter") {
                    form.submit();
                }
            });
        }
        if (serviceTypeInput) { // Event listener for service_type input
            serviceTypeInput.addEventListener("keypress", function (e) {
                if (e.key === "Enter") {
                    form.submit();
                }
            });
        }

        [from, to].forEach(input => {
            if (input) { 
                input.addEventListener("keypress", function (e) {
                    if (e.key === "Enter") {
                        form.submit();
                    }
                });
            }
        });

        const heroTitle = document.querySelector('.hero-title'); 
        if (heroTitle) {
            setInterval(() => {
                heroTitle.classList.toggle('hover');
            }, 3000);
        }

        const swapButton = document.getElementById('swapButton'); 
        if (swapButton) {
            swapButton.addEventListener('click', () => {
                swapButton.blur();
            });
        }

        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                submitButton.blur();
            });
        }
    }

    // --- Thirukkural Quote Handling ---
    const thirukkuralQuoteDiv = document.getElementById('thirukkuralQuote'); 
    if (thirukkuralQuoteDiv) {
        const kuralListTamil = [
            { line1: "அகர முதல எழுத்தெல்லாம் ஆதி", line2: "பகவன் முதற்றே உலகு." },
            { line1: "வான்நின்று உலகம் வழங்கி வருதலால்", line2: "தான்அமிழ்தம் என்றுணரற் பாற்று." },
            { line1: "ஒழுக்கத்தின் ஒல்கார் உரவோர்", line2: "இழுக்கத்தின் ஏதம் படுபாக்கு அறிந்து." },
            { line1: "மடியை மடியா ஒழுகல்", line2: "குடியைக் குடியாக வேண்டுபவர்." },
            { line1: "தன்நெஞ்சு அறிவது பொய்யற்க", line2: "பொய்ந்தபின் தன்நெஞ்சே தன்னைச் சுடும்." },
            { line1: "பொருள்எல்லாம் போஒழில்", line2: "தோற்றம் மருள்எல்லாம் மாயை பிறப்பு." },
            { line1: "பிறர்க்கின்னா முற்பகல் செய்யின்", line2: "தமக்கின்னா பிற்பகல் தாமே வரும்." },
            { line1: "நகையுள்ளும் இன்னா திகழ்வுள்ளும் இன்னா", line2: "பகையுள்ளும் பண்பு கெடல்." },
            { line1: "எனைத்தானும் எஞ்ஞான்றும் யார்க்கும்",
                line2: "மனத்தான்இன்னா செய்யாமை தலை." },
            { line1: "கூடா ஒழுக்கம் கொடுஞ்சொல் கடும்புணர்வு", line2: "வாடா வசையாய் விடும்." },
            { line1: "உள்ளுவது எலாம் உயர்வுள்ளல்", line2: "மற்றது தள்ளினும் தள்ளாமை நேர்த்து." },
        ];

        const kuralListEnglish = [
            { line1: "A, the first of the alphabet, the Lord is", line2: "the beginning of the universe." },
            { line1: "Since it is rain that sustains the world,", line2: "it is to be considered ambrosia itself." },
            { line1: "The strong do not swerve from virtue,", line2: "they know the harm that vice brings." },
            { line1: "If you desire your house to be a great one,", line2: "discard laziness and act with diligence." },
            { line1: "Let not your mind know that you lie;", line2: "for your own mind will burn you when you have lied." },
            { line1: "All that is seen departs from the soul;", line2: "the shape of illusion is the cause of sorrow." },
            { line1: "If you cause suffering to others in the morning,", line2: "suffering will come to you in the afternoon." },
            { line1: "Even in laughter, offense is offensive;", "line2": "in enmity, the loss of virtue is offensive." },
            { line1: "Never, at any time, to anyone, not even in thought,", line2: "do that which causes suffering." },
            { line1: "Deceitful conduct, harsh words, and cruel acts", line2: "lead to lasting disgrace." },
            { line1: "Always think thoughts of loftiness,", line2: "so that even if they fail, it will be accounted as honor." },
        ];

        let kuralIndex = 0;
        let isTamil = true;
        let timer;

        const showKural = () => {
            clearTimeout(timer);
            thirukkuralQuoteDiv.classList.add('show');
            const displayKural = isTamil ? kuralListTamil[kuralIndex] : kuralListEnglish[kuralIndex];
            const langClass = isTamil ? 'tamil' : '';
            thirukkuralQuoteDiv.innerHTML = `<p class="kural ${langClass}">${displayKural.line1}<br>${displayKural.line2}</p>`;
            isTamil = !isTamil;
            timer = setTimeout(hideKural, 4000);
        };

        const hideKural = () => {
            thirukkuralQuoteDiv.classList.remove('show');
            setTimeout(showKural, 100);
        }

        showKural();
        setInterval(() => {
            kuralIndex = (kuralIndex + 1) % kuralListTamil.length;
            showKural();
        }, 8000);
    }

    // --- Gemini API Integration: Travel Organizer Generator ---
    const getTravelTipsButton = document.getElementById('getTravelTipsButton'); 
    const travelTipsLoading = document.getElementById('travelTipsLoading'); 
    const travelTipsDisplay = document.getElementById('travelTipsDisplay'); 
    const tipsContent = document.getElementById('tipsContent'); 

    if (getTravelTipsButton) {
        getTravelTipsButton.addEventListener('click', async function() {
            const from = fromLocationInput.value.trim();
            const to = toLocationInput.value.trim();

            if (!from || !to) {
                if (tipsContent) tipsContent.innerHTML = '<p>Please enter both "From" and "To" locations to get travel tips.</p>';
                if (travelTipsDisplay) travelTipsDisplay.classList.remove('hidden');
                return;
            }

            if (travelTipsLoading) travelTipsLoading.classList.remove('hidden');
            if (travelTipsDisplay) travelTipsDisplay.classList.add('hidden');
            if (tipsContent) tipsContent.innerHTML = ''; 

            try {
                let chatHistory = [];
                const prompt = `As a travel organizer, generate a detailed travel plan in JSON format for a bus journey from "${from}" to "${to}". The JSON should have a 'title' for the plan and an array of 'sections'. Each section should have a 'heading' (e.g., "WELCOME", "Before Travel", "Packing Essentials" ,"During the Journey", "about the distination" ,"Nearby Famous places", "about the travel route" , "Upon Arrival","Nearby lodges and Rooms in distination","Connecting Areas","Famous Temples" ) and an array of 'items' (bullet points for that section). Provide 3-5 items per section.`;
                chatHistory.push({ role: "user", parts: [{ text: prompt }] });

                const payload = { 
                    contents: chatHistory,
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "OBJECT",
                            properties: {
                                "title": { "type": "STRING" },
                                "sections": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "heading": { "type": "STRING" },
                                            "items": {
                                                "type": "ARRAY",
                                                "items": { "type": "STRING" }
                                            }
                                        },
                                        "required": ["heading", "items"]
                                    }
                                }
                            },
                            "required": ["title", "sections"]
                        }
                    }
                };
                const apiKey = "AIzaSyBSGjD8YqDNN-l70IayGUqCQkvZkdOOa3M"; 
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const jsonResponseText = result.candidates[0].content.parts[0].text;
                    let travelOrganizerData;
                    try {
                        travelOrganizerData = JSON.parse(jsonResponseText);
                    } catch (jsonError) {
                        console.error('Failed to parse JSON response:', jsonError, jsonResponseText);
                        if (tipsContent) tipsContent.innerHTML = '<p>Sorry, the AI provided an unexpected response format. Please try again.</p>';
                        if (travelTipsDisplay) travelTipsDisplay.classList.remove('hidden');
                        return;
                    }
                    
                    let htmlOutput = `<h4>${travelOrganizerData.title || 'Travel Organizer'}</h4>`;
                    if (travelOrganizerData.sections && Array.isArray(travelOrganizerData.sections)) {
                        travelOrganizerData.sections.forEach(section => {
                            htmlOutput += `<h5>${section.heading}</h5>`;
                            if (section.items && Array.isArray(section.items) && section.items.length > 0) {
                                htmlOutput += '<ul>';
                                section.items.forEach(item => {
                                    htmlOutput += `<li>${item}</li>`;
                                });
                                htmlOutput += '</ul>';
                            } else {
                                htmlOutput += '<p>No items for this section.</p>';
                            }
                        });
                    } else {
                        htmlOutput += '<p>No structured sections found in the travel organizer.</p>';
                    }

                    if (tipsContent) tipsContent.innerHTML = htmlOutput;
                    if (travelTipsDisplay) travelTipsDisplay.classList.remove('hidden');
                } else {
                    if (tipsContent) tipsContent.innerHTML = '<p>Sorry, I could not generate travel organizer at this time. Please try again later.</p>';
                    if (travelTipsDisplay) travelTipsDisplay.classList.remove('hidden');
                    console.error('Gemini API response structure unexpected or empty:', result);
                }
            } catch (error) {
                if (tipsContent) tipsContent.innerHTML = '<p>An error occurred while fetching travel organizer. Please check your internet connection or try again.</p>';
                if (travelTipsDisplay) travelTipsDisplay.classList.remove('hidden');
                console.error('Error generating travel organizer:', error);
            } finally {
                if (travelTipsLoading) travelTipsLoading.classList.add('hidden');
            }
        });
    }

    // --- Search Results Rendering Logic (for sequential S.NO.) ---
    function renderBusResults(results) {
        // This is the most crucial check for the S.NO. issue
        if (!busResultsTableBody) {
            console.error("renderBusResults: busResultsTableBody element not found. This is critical for rendering the table correctly. Please ensure the HTML element with id 'busResultsTableBody' exists."); 
            return; 
        }

        busResultsTableBody.innerHTML = ''; 

        if (results && results.length > 0) {
            console.log("renderBusResults: Rendering", results.length, "bus services with sequential S.NO."); 
            results.forEach((route, index) => { 
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td> 
                    <td>${route.Corporation || 'N/A'}</td>
                    <td>${route['Route No'] || 'N/A'}</td>
                    <td>${route['Service Type'] || 'N/A'}</td>
                    <td>${route.Source || 'N/A'}</td>
                    <td>${route.Destination || 'N/A'}</td>
                    <td>${route.Departure || 'N/A'}</td>
                    <td>${route.Arrival || 'N/A'}</td>
                    <td>${route.Fare || 'N/A'}</td>
                    <td>${route.is_recurring ? 'Yes' : 'No'}</td>
                    <td>${route.specific_date || 'N/A'}</td>
                `;
                busResultsTableBody.appendChild(row);
            });
        } else {
            console.log("renderBusResults: No search results to display."); 
            const noResultsRow = document.createElement('tr');
            noResultsRow.innerHTML = `<td colspan="11" style="text-align: center;">தேர்ந்தெடுக்கப்பட்ட அளவுகோல்களுக்கு எந்தப் பேருந்துகளும் கிடைக்கவில்லை.</td>`;
            busResultsTableBody.appendChild(noResultsRow);
        }
    }

    // Initial rendering call on DOMContentLoaded
    // `initialResults` and `allServiceTypes` are global variables passed from Flask via index.html
    if (typeof initialResults !== 'undefined' && initialResults !== null) {
        console.log("DOMContentLoaded: Initial results variable detected. Calling renderBusResults."); 
        renderBusResults(initialResults);
    } else {
        console.warn("DOMContentLoaded: initialResults is undefined or null from Flask. Rendering empty table by default."); 
        renderBusResults([]); // Ensure the table always gets an array to work with
    }
});
