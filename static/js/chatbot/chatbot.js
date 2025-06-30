document.addEventListener('DOMContentLoaded', function() {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const languageSelect = document.getElementById('language-select');
    const dynamicWelcomeMessage = document.getElementById('dynamic-welcome-message');

    // IMPORTANT: Replace "YOUR_ACTUAL_GOOGLE_GENERATIVE_AI_API_KEY_HERE" with your key
    const API_KEY = "AIzaSyBSGjD8YqDNN-l70IayGUqCQkvZkdOOa3M"; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    let currentLanguage = languageSelect ? languageSelect.value : 'en'; // Default language

    // Dictionaries for localized text
    const localizedText = {
        en: {
            initialPromptWelcome: "Welcome! How can I assist you today?",
            specializationPrefix: `You are a concise AI assistant providing general information *only* about TNSTC and SETC bus services in India. Do not discuss private operators.
            Available service types: Deluxe, Ultra Deluxe, Non-AC Sleeper, AC Seater/Sleeper, Air-Conditioned (AC) Buses, AC Sleeper Buses, AC Seater Buses, Ordinary/Town Buses, Express Buses.
            
            **For specific bus stand names, timings, or schedules for a route, you MUST direct users to use the main bus search page of THIS application.**
            **If asked about specific bus stands that you cannot confirm from the app's database (which you don't have access to), you MUST direct the user to check their nearest main bus terminal for that city/town.**
            **For booking and viewing available seats, you MUST direct users to the official TNSTC/SETC websites.**
            
            I can help with general questions about TNSTC/SETC service types, common bus travel advice for government buses, or general information about bus travel within Tamil Nadu. If a question is outside these topics or asks for real-time/booking details or specific bus stand names, politely decline and *always* redirect the user to the appropriate place. Provide brief, factual answers. Respond in English. Based on this, answer: `,
            outOfScopeResponse: "My apologies, I only provide general information about TNSTC and SETC bus services. For specific bus stand names, timings, or schedules for a route, please use the main search functionality on **this website**. For booking and seat availability, please visit the **official TNSTC/SETC websites**. If you're looking for a bus stand in a specific city, please refer to the **nearby main bus terminal** for that city/town. How else can I help with general TNSTC/SETC travel info?"
        },
        ta: {
            initialPromptWelcome: "வரவேற்பு! இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
            specializationPrefix: `நீங்கள் இந்தியாவில் TNSTC மற்றும் SETC பேருந்து சேவைகள் பற்றி *மட்டும்* பொதுவான தகவல்களை வழங்கும் சுருக்கமான AI உதவியாளர். தனியார் ஆபரேட்டர்கள் பற்றி விவாதிக்க வேண்டாம்.
            கிடைக்கும் சேவை வகைகள்: டீலக்ஸ், அல்ட்ரா டீலக்ஸ், நான்-ஏசி ஸ்லீப்பர், ஏசி சீட்டர்/ஸ்லீப்பர், ஏசி பேருந்துகள், ஏசி ஸ்லீப்பர் பேருந்துகள், ஏசி சீட்டர் பேருந்துகள், சாதாரண/நகரப் பேருந்துகள், எக்ஸ்பிரஸ் பேருந்துகள்.
            
            **குறிப்பிட்ட பேருந்து நிறுத்தப் பெயர்கள், நேரங்கள் அல்லது அட்டவணைகளுக்கு, நீங்கள் பயனர்களை இந்த பயன்பாட்டின் முக்கிய பேருந்து தேடல் பக்கத்தைப் பயன்படுத்தும்படி கட்டாயமாக வழிநடத்த வேண்டும்.**
            **குறிப்பிட்ட பேருந்து நிறுத்தங்கள் பற்றி கேட்கப்பட்டால் (உங்கள் பயன்பாட்டின் தரவுத்தளத்தில் உறுதிப்படுத்த முடியாதவை), பயனர்களை அந்த நகரம்/ஊரின் அருகிலுள்ள முக்கிய பேருந்து முனையத்தை சரிபார்க்கும்படி கட்டாயமாக வழிநடத்த வேண்டும்.**
            **முன்பதிவு மற்றும் இருக்கை கிடைப்பதைப் பார்க்க, நீங்கள் பயனர்களை அதிகாரப்பூர்வ TNSTC/SETC வலைத்தளங்களுக்கு கட்டாயமாக வழிநடத்த வேண்டும்.**
            
            TNSTC/SETC சேவை வகைகள், அரசுப் பேருந்துகளுக்கான பொதுவான பயண குறிப்புகள் அல்லது தமிழ்நாடு பேருந்து பயணம் பற்றிய பொதுவான தகவல்களை நான் உதவ முடியும். இந்த தலைப்புகளுக்கு வெளியே உள்ள கேள்விகள் அல்லது நேரடி/முன்பதிவு விவரங்கள் அல்லது குறிப்பிட்ட பேருந்து நிறுத்தப் பெயர்கள் கேட்கப்பட்டால், தயவுசெய்து மறுத்து, பயனரை சரியான இடத்திற்கு எப்போதும் வழிநடத்தவும். சுருக்கமான, உண்மையான பதில்களை வழங்கவும். தமிழில் பதிலளிக்கவும். இதை அடிப்படையாகக் கொண்டு பதிலளிக்கவும்: `,
            outOfScopeResponse: "மன்னிக்கவும், நான் TNSTC மற்றும் SETC பேருந்து சேவைகள் பற்றிய பொதுவான தகவல்களை மட்டுமே வழங்குகிறேன். குறிப்பிட்ட பேருந்து நிறுத்தப் பெயர்கள், நேரங்கள் அல்லது அட்டவணைகளுக்கு, இந்த வலைத்தளத்தின் முக்கிய தேடல் செயல்பாட்டைப் பயன்படுத்தவும். முன்பதிவு மற்றும் இருக்கை கிடைப்பதைப் பார்க்க, அதிகாரப்பூர்வ TNSTC/SETC வலைத்தளங்களைப் பார்வையிடவும். நீங்கள் ஒரு குறிப்பிட்ட நகரத்தில் ஒரு பேருந்து நிலையத்தைத் தேடுகிறீர்கள் என்றால், தயவுசெய்து அந்த நகரம்/ஊரின் **அருகிலுள்ள முக்கிய பேருந்து முனையத்தை**ப் பார்க்கவும். வேறு ஏதேனும் TNSTC/SETC பயணம் தொடர்பான பொதுவான தகவலுடன் நான் உதவ முடியுமா?"
        }
    };

    let chatHistory = []; 

    function updateDynamicWelcomeMessage() {
        if (dynamicWelcomeMessage) {
            dynamicWelcomeMessage.textContent = localizedText[currentLanguage].initialPromptWelcome;
            if (currentLanguage === 'ta') {
                dynamicWelcomeMessage.classList.add('tamil-text');
            } else {
                dynamicWelcomeMessage.classList.remove('tamil-text');
            }
        }
    }

    updateDynamicWelcomeMessage();
    chatHistory.push({ role: "model", parts: [{ text: localizedText[currentLanguage].initialPromptWelcome }] });

    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            currentLanguage = this.value;
            updateDynamicWelcomeMessage(); 
            chatHistory = [{ role: "model", parts: [{ text: localizedText[currentLanguage].initialPromptWelcome }] }];
        });
    }

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.innerHTML = `<p>${text}</p>`; 
        if (currentLanguage === 'ta' && sender === 'bot') {
            messageDiv.querySelector('p').classList.add('tamil-text');
        }
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (userMessage === '') return;

        appendMessage('user', userMessage);
        userInput.value = '';

        loadingIndicator.classList.remove('hidden');

        chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

        const specializationPrefix = localizedText[currentLanguage].specializationPrefix;
        
        const contentsToSend = chatHistory.map((entry, index) => {
            if (entry.role === "user" && index === chatHistory.length - 1) { 
                return {
                    role: entry.role,
                    parts: [{ text: specializationPrefix + entry.parts[0].text }]
                };
            }
            return entry; 
        });

        const payload = {
            contents: contentsToSend
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', response.status, errorData);
                appendMessage('bot', `An API error occurred: ${errorData.error.message || response.statusText}. Please try again later.`);
                chatHistory.pop(); 
                return; 
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                let botResponseText = result.candidates[0].content.parts[0].text;
                
                // --- Safety Checks for AI Response (using localized outOfScopeResponse) ---
                const lowerBotResponse = botResponseText.toLowerCase();
                const triggeringKeywords = [
                    "private operator", "private bus", "other bus company", "general topic",
                    "i am an ai assistant", "my expertise is limited", "i apologize",
                    "i understand my limitations", "i don't have access to real-time", 
                    "i cannot provide details on specific",
                    // Specific phrases that indicate it's trying to answer beyond its scope for THIS app
                    "cmbt", "chennai mofussil bus terminus", "theni bus stand", "madurai periyar bus stand",
                    "booking", "available seats", "ticket booking", "seat availability" 
                ];
                
                // Logic to determine if the response needs redirection to "nearby main bus terminal"
                // or to the app's search, or official website.
                let needsRedirection = false;
                let specificTerminalQuery = false;

                // Check for general out-of-scope keywords or if it talks about limitations
                if (triggeringKeywords.some(keyword => lowerBotResponse.includes(keyword))) {
                    needsRedirection = true;
                }

                // If it tries to list specific departure points or schedules
                if ((lowerBotResponse.includes("depart from") || lowerBotResponse.includes("departure location") || lowerBotResponse.includes("schedule") || lowerBotResponse.includes("timings")) && !lowerBotResponse.includes("main search page")) {
                    needsRedirection = true;
                }
                
                // If the user explicitly asked about a bus stand and the AI tries to answer specifically
                // without redirecting to "nearby main bus terminal"
                if (userMessage.toLowerCase().includes("bus stand") && 
                    !(lowerBotResponse.includes("main bus terminal") || lowerBotResponse.includes("main search page"))) {
                    specificTerminalQuery = true;
                }

                if (needsRedirection || specificTerminalQuery) { // If any of the above conditions trigger
                    appendMessage('bot', localizedText[currentLanguage].outOfScopeResponse); 
                    chatHistory.pop(); 
                } else {
                    appendMessage('bot', botResponseText);
                    chatHistory.push({ role: "model", parts: [{ text: botResponseText }] });
                }
            } else {
                appendMessage('bot', localizedText[currentLanguage].outOfScopeResponse); 
                console.warn('Gemini API response structure unexpected or empty:', result);
                chatHistory.pop();
            }
        } catch (error) {
            appendMessage('bot', `An error occurred: ${error.message || 'Could not connect to AI.'}`);
            console.error('Error sending message to Gemini API:', error);
            chatHistory.pop();
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    userInput.focus();
});
