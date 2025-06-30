document.addEventListener('DOMContentLoaded', function() {
    const langButtons = document.querySelectorAll('.lang-button');

    langButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const selectedLang = this.dataset.lang; // 'en' or 'ta'

            // Send selected language to Flask backend
            try {
                const response = await fetch('/set_language', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ language: selectedLang })
                });

                const result = await response.json();

                if (result.status === 'success') {
                    // Redirect to the home page after language is set
                    window.location.href = '/home';
                } else {
                    console.error('Failed to set language:', result.message);
                    alert('Error: Could not set language. Please try again.'); // Using alert for critical error
                }
            } catch (error) {
                console.error('Network error setting language:', error);
                alert('Network error. Please check your connection and try again.'); // Using alert for critical error
            }
        });
    });
});
