from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from datetime import datetime
import os
import json
import csv
import firebase_admin
from firebase_admin import credentials, firestore
from google.api_core.exceptions import ResourceExhausted 
import time 
from fuzzywuzzy import fuzz

app = Flask(__name__, static_folder='static')
# IMPORTANT: Keep your secret key stable for session persistence
app.secret_key = 'your_super_secret_key_here_must_be_long_and_random_for_security' 

# --- Firebase init ---
try:
    cred = credentials.Certificate("firebase_service_account.json")
    firebase_admin.initialize_app(cred)
    print("Firebase initialized.")
except Exception as e:
    print(f"ERROR: Firebase init failed - {e}")
    exit()

db = firestore.client()

USERS = {
    "user1": {"password": "userpass", "role": "user"},
    "admin1": {"password": "adminpass", "role": "admin"}
}

# --- GLOBAL APPLICATION DATA STORAGE ---
app_data = {
    'bus_routes': [],
    'unique_locations': [],
    'unique_service_types': []
}

CACHE_FILE = 'bus_data_cache.json'

# --- LANGUAGE DATA ---
LANGUAGES = {
    'en': {
        'select_language_title': 'Select Your Language',
        'login_title': 'Login',
        'username_label': 'Username',
        'password_label': 'Password',
        'invalid_credentials': 'Invalid Credentials',
        'register_link': 'Register',
        'logout_link': '(Logout)',
        'logged_in_as': 'Logged in as:',
        'not_logged_in': 'Not logged in.',
        'register_title': 'Register',
        'phone_label': 'Phone Number',
        'otp_verified_label': 'Please verify OTP before submitting.', 
        'username_exists': 'Username already exists.',
        'all_fields_required': 'All fields are required.',
        'submit_button': 'Submit', 
        'from_location': 'From Location',
        'to_location': 'To Location',
        'date_label': 'Date',
        'service_type_optional': 'Service Type (Optional)',
        'search_buses': 'Search Buses',
        'today': 'Today',
        'tomorrow': 'Tomorrow',
        'results_heading_prefix': 'Bus Details from',
        'results_heading_to': 'to',
        'results_heading_date': 'Date',
        'table_s_no': 'S.NO.',
        'table_corporation': 'Corporation',
        'table_route_no': 'Route No',
        'table_service_type': 'Service Type',
        'table_source': 'Source',
        'table_destination': 'Destination',
        'table_departure': 'Departure',
        'table_arrival': 'Arrival',
        'table_fare': 'Fare',
        'table_recurring': 'Recurring',
        'table_specific_date': 'Spec. Date',
        'no_buses_found': 'No buses found for the selected criteria.',
        'get_travel_tips': '✨ Get Travel Tips and About Location ✨',
        'generating_tips': 'Generating personalized travel Tips...',
        'admin_dashboard_title': 'Admin Dashboard',
        'add_edit_route_title': 'Add/Edit Bus Route',
        'source_placeholder': 'Source Location',
        'destination_placeholder': 'Destination Location',
        'select_corporation': 'Select Corporation',
        'route_no_placeholder': 'Route Number',
        'service_type_placeholder': 'e.g., Express, Ultra Deluxe',
        'departure_time_label': 'Departure Time (24-Hour Format):',
        'arrival_time_label': 'Arrival Time (24-Hour Format):',
        'fare_optional_placeholder': 'e.g., ₹250 or N/A',
        'is_recurring_service': 'Is Recurring Service',
        'specific_date_label': 'Specific Date (YYYY-MM-DD):',
        'add_route_button': 'Add Route',
        'update_route_button': 'Update Route',
        'cancel_edit_button': 'Cancel Edit',
        'manage_routes_title': 'Manage Existing Routes',
        'filter_by_source': 'Filter by Source:',
        'filter_by_destination': 'Filter by Destination:',
        'filter_by_corporation': 'Filter by Corporation:',
        'all_corporations': 'All Corporations',
        'table_actions': 'Actions',
        'edit_button': 'Edit',
        'delete_button': 'Delete',
        'no_routes_found_admin': 'No routes found. Please add some or adjust filters.',
        'confirm_deletion_title': 'Confirm Deletion',
        'confirm_deletion_message': 'Are you sure you want to delete this bus route? This action cannot be undone.',
        'modal_delete_button': 'Delete',
        'modal_cancel_button': 'Cancel',
        'status_success': 'Success!',
        'status_error': 'Error!',
        'status_ok_button': 'OK',
        'route_add_error_invalid_datetime': 'Error adding route: Invalid date/time format:',
        'route_add_error_required_fields': 'Error: All required fields must be filled.',
        'route_add_error_recurring_specific_conflict': 'Error: Cannot set both recurring and specific date.',
        'route_add_error_either_recurring_or_specific': 'Error: Must set either \'Is Recurring Service\' or a \'Specific Date\'.',
        'route_add_success': 'Route added successfully!',
        'route_update_error_id_missing': 'Error: Route ID is missing for update.',
        'route_update_success': 'Route updated successfully!',
        'route_delete_error_id_missing': 'Error: Route ID is missing for deletion.',
        'route_delete_success': 'Route deleted successfully!',
        'route_details_not_found': 'Route details not found for editing. Please refresh and try again.',
        'unexpected_error': 'An unexpected error occurred. Please try again.',
        'invalid_date_format': 'Invalid date format. Please use ISO (YYYY-MM-DD).',
        'not_logged_in_message': 'Please login to perform this action.',
        'network_error_set_language': 'Network error. Please check your connection and try again.',
        'error_set_language': 'Error: Could not set language. Please try again.',
        'api_response_format_error': 'Sorry, the AI provided an unexpected response format. Please try again.',
        'api_gen_error': 'Sorry, I could not generate travel organizer at this time. Please try again later.',
        'api_fetch_error': 'An error occurred while fetching travel organizer. Please check your internet connection or try again.',
        'enter_locations_for_tips': 'Please enter both "From" and "To" locations to get travel tips.',
        # OTP/Registration specific messages
        'phone_placeholder': 'Phone (+91XXXXXXXXXX)', 
        'send_otp_button': 'Send OTP',
        'resend_otp_button': 'Resend OTP',
        'enter_otp': 'Enter OTP',
        'otp_placeholder': 'Enter 6-digit OTP', 
        'verify_otp_button': 'Verify OTP',
        'enter_phone_number': 'Please enter your phone number.',
        'otp_sent_success': 'OTP sent successfully!',
        'failed_send_otp': 'Failed to send OTP',
        'send_otp_first': 'Please send OTP first.',
        'phone_verified_success': 'Phone verified successfully!',
        'invalid_otp': 'Invalid OTP',
        'register_button': 'Register', 
        'already_have_account': 'Already have an account?',
        'username_placeholder': 'Enter username', 
        'password_placeholder': 'Enter password', 
        'google_register_coming_soon': 'Google registration page coming soon!',
        'recaptcha_load_failed': 'Failed to load reCAPTCHA. Please check your internet connection and try again.',
        'invalid_phone_number_format': 'Invalid phone number format. Please use E.164 format (e.g., +91XXXXXXXXXX).',
        'too_many_otp_requests': 'Too many OTP requests. Please wait a few minutes before trying again.',
        'otp_expired': 'The OTP has expired. Please request a new one.',
        'invalid_verification_code': 'The verification code is invalid. Please check and try again.',
    },
    'ta': {
        'select_language_title': 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
        'login_title': 'உள்நுழைவு',
        'username_label': 'பயனர் பெயர்',
        'password_label': 'கடவுச்சொல்',
        'invalid_credentials': 'தவறான நற்சான்றிதழ்கள்',
        'register_link': 'பதிவு',
        'logout_link': '(வெளியேறு)',
        'logged_in_as': 'என உள்நுழைந்துள்ளீர்கள்:',
        'not_logged_in': 'உள்நுழையவில்லை.',
        'register_title': 'பதிவு',
        'phone_label': 'தொலைபேசி எண்',
        'otp_verified_label': 'சமர்ப்பிக்கும் முன் OTP ஐ சரிபார்க்கவும்.',
        'username_exists': 'பயனர் பெயர் ஏற்கனவே உள்ளது.',
        'all_fields_required': 'அனைத்து புலங்களும் தேவை.',
        'submit_button': 'சமர்ப்பி',
        'from_location': 'இருந்து இடம்',
        'to_location': 'வரை இடம்',
        'date_label': 'தேதி',
        'service_type_optional': 'சேவை வகை (விரும்பினால்)',
        'search_buses': 'பேருந்துகளைத் தேடுக',
        'today': 'இன்று',
        'tomorrow': 'நாளை',
        'results_heading_prefix': '', 
        'results_heading_to': 'க்கு',
        'results_heading_date': 'தேதி',
        'table_s_no': 'வரிசை எண்',
        'table_corporation': 'நிறுவனம்',
        'table_route_no': 'பாதை எண்',
        'table_service_type': 'சேவை வகை',
        'table_source': 'மூலம்',
        'table_destination': 'சேருமிடம்',
        'table_departure': 'புறப்படும் நேரம்',
        'table_arrival': 'வந்துசேரும் நேரம்',
        'table_fare': 'கட்டணம்',
        'table_recurring': 'மீண்டும் நிகழும்',
        'table_specific_date': 'குறிப்பிட்ட தேதி',
        'no_buses_found': 'தேர்ந்தெடுக்கப்பட்ட அளவுகோல்களுக்கு எந்தப் பேருந்துகளும் கிடைக்கவில்லை.',
        'get_travel_tips': '✨ பயண உதவிக்குறிப்புகள் மற்றும் இடம் பற்றி அறிக ✨',
        'generating_tips': 'தனிப்பயனாக்கப்பட்ட பயண உதவிக்குறிப்புகளை உருவாக்குகிறது...',
        'admin_dashboard_title': 'நிர்வாக டாஷ்போர்டு',
        'add_edit_route_title': 'பேருந்து வழித்தடத்தை சேர்/திருத்து',
        'source_placeholder': 'மூல இடம்',
        'destination_placeholder': 'சேருமிடம்',
        'select_corporation': 'நிறுவனத்தைத் தேர்ந்தெடுக்கவும்',
        'route_no_placeholder': 'பாதை எண்',
        'service_type_placeholder': 'எ.கா., எக்ஸ்பிரஸ், அல்ட்ரா டீலக்ஸ்',
        'departure_time_label': 'புறப்படும் நேரம் (24-மணி நேர வடிவம்):',
        'arrival_time_label': 'வந்துசேரும் நேரம் (24-மணி நேர வடிவம்):',
        'fare_optional_placeholder': 'எ.கா., ₹250 அல்லது பொருந்தாது',
        'is_recurring_service': 'மீண்டும் நிகழும் சேவை',
        'specific_date_label': 'குறிப்பிட்ட தேதி (YYYY-MM-DD):',
        'add_route_button': 'வழித்தடத்தைச் சேர்',
        'update_route_button': 'வழித்தடத்தைப் புதுப்பி',
        'cancel_edit_button': 'திருத்தத்தை ரத்துசெய்',
        'manage_routes_title': 'ஏற்கனவே உள்ள வழித்தடங்களை நிர்வகி',
        'filter_by_source': 'மூலத்தின் மூலம் வடிகட்டு:',
        'filter_by_destination': 'சேருமிடத்தின் மூலம் வடிகட்டு:',
        'filter_by_corporation': 'நிறுவனத்தின் மூலம் வடிகட்டு:',
        'all_corporations': 'அனைத்து நிறுவனங்களும்',
        'table_actions': 'செயல்கள்',
        'edit_button': 'திருத்து',
        'delete_button': 'நீக்கு',
        'no_routes_found_admin': 'வழித்தடங்கள் எதுவும் காணப்படவில்லை. தயவுசெய்து சிலவற்றைச் சேர்க்கவும் அல்லது வடிகட்டிகளை சரிசெய்யவும்.',
        'confirm_deletion_title': 'நீக்குதலை உறுதிப்படுத்து',
        'confirm_deletion_message': 'இந்த பேருந்து வழித்தடத்தை நீக்க நீங்கள் உறுதியாக உள்ளீர்களா? இந்தச் செயலை செயல்தவிர் செய்ய முடியாது.',
        'modal_delete_button': 'நீக்கு',
        'modal_cancel_button': 'ரத்துசெய்',
        'status_success': 'வெற்றி!',
        'status_error': 'பிழை!',
        'status_ok_button': 'சரி',
        'route_add_error_invalid_datetime': 'வழித்தடம் சேர்ப்பதில் பிழை: தவறான தேதி/நேர வடிவம்:',
        'route_add_error_required_fields': 'பிழை: தேவையான அனைத்து புலங்களும் நிரப்பப்பட வேண்டும்.',
        'route_add_error_recurring_specific_conflict': 'பிழை: மீண்டும் நிகழும் மற்றும் குறிப்பிட்ட தேதி இரண்டையும் அமைக்க முடியாது.',
        'route_add_error_either_recurring_or_specific': 'பிழை: \'மீண்டும் நிகழும் சேவை\' அல்லது \'குறிப்பிட்ட தேதி\' இரண்டில் ஒன்றையாவது அமைக்க வேண்டும்.',
        'route_add_success': 'வழித்தடம் வெற்றிகரமாக சேர்க்கப்பட்டது!',
        'route_update_error_id_missing': 'பிழை: புதுப்பிக்க வழித்தட ID இல்லை.',
        'route_update_success': 'வழித்தடம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!',
        'route_delete_error_id_missing': 'பிழை: நீக்க வழித்தட ID இல்லை.',
        'route_delete_success': 'வழித்தடம் வெற்றிகரமாக நீக்கப்பட்டது!',
        'route_details_not_found': 'திருத்தத்திற்கான வழித்தட விவரங்கள் கண்டறியப்படவில்லை. தயவுசெய்து புதுப்பித்து மீண்டும் முயற்சிக்கவும்.',
        'unexpected_error': 'எதிர்பாராத பிழை ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
        'invalid_date_format': 'தவறான தேதி வடிவம். ISO (YYYY-MM-DD) பயன்படுத்தவும்.',
        'not_logged_in_message': 'இந்த செயலைச் செய்ய உள்நுழையவும்.',
        'network_error_set_language': 'நெட்வொர்க் பிழை. உங்கள் இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
        'error_set_language': 'பிழை: மொழியை அமைக்க முடியவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
        'api_response_format_error': 'மன்னிக்கவும், AI எதிர்பாராத பதில் வடிவமைப்பை வழங்கியது. மீண்டும் முயற்சிக்கவும்.',
        'api_gen_error': 'மன்னிக்கவும், இப்போதைக்கு பயண அமைப்பாளரை உருவாக்க முடியவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.',
        'api_fetch_error': 'பயண அமைப்பாளரை பெறும்போது பிழை ஏற்பட்டது. தயவுசெய்து உங்கள் இணைய இணைப்பைச் சரிபார்க்கவும் அல்லது மீண்டும் முயற்சிக்கவும்.',
        'enter_locations_for_tips': 'பயண உதவிக்குறிப்புகளைப் பெற "இருந்து" மற்றும் "வரை" இரு இடங்களையும் உள்ளிடவும்.',
        # OTP/Registration specific messages
        'phone_placeholder': 'தொலைபேசி எண் (+91XXXXXXXXXX)',
        'send_otp_button': 'OTP அனுப்பு',
        'resend_otp_button': 'மீண்டும் OTP அனுப்பு',
        'enter_otp': 'OTP ஐ உள்ளிடவும்',
        'otp_placeholder': '6 இலக்க OTP ஐ உள்ளிடவும்',
        'verify_otp_button': 'OTP ஐ சரிபார்க்கவும்',
        'enter_phone_number': 'உங்கள் தொலைபேசி எண்ணை உள்ளிடவும்.',
        'otp_sent_success': 'OTP வெற்றிகரமாக அனுப்பப்பட்டது!',
        'failed_send_otp': 'OTP அனுப்ப முடியவில்லை',
        'send_otp_first': 'முதலில் OTP ஐ அனுப்பவும்.',
        'phone_verified_success': 'தொலைபேசி வெற்றிகரமாக சரிபார்க்கப்பட்டது!',
        'invalid_otp': 'தவறான OTP',
        'register_button': 'பதிவுசெய்',
        'already_have_account': 'ஏற்கனவே ஒரு கணக்கு உள்ளதா?',
        'username_placeholder': 'பயனர் பெயர்',
        'password_placeholder': 'கடவுச்சொல்',
        'google_register_coming_soon': 'Google பதிவுப் பக்கம் விரைவில் வரும்!',
        'recaptcha_load_failed': 'reCAPTCHA ஐ ஏற்ற முடியவில்லை. உங்கள் இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
        'invalid_phone_number_format': 'தவறான தொலைபேசி எண் வடிவம். E.164 வடிவத்தைப் பயன்படுத்தவும் (எ.கா., +91XXXXXXXXXX).',
        'too_many_otp_requests': 'அதிக OTP கோரிக்கைகள். சில நிமிடங்கள் காத்திருந்து மீண்டும் முயற்சிக்கவும்.',
        'otp_expired': 'OTP காலாவதியானது. புதிய ஒன்றைக் கோரவும்.',
        'invalid_verification_code': 'சரிபார்ப்பு குறியீடு தவறானது. சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
    }
}


# --- Helper Functions for Data Processing ---

def get_unique_locations_from_bus_data(data):
    locations = set()
    for row in data:
        if 'Source' in row:
            locations.add(row['Source'])
        if 'Destination' in row:
            locations.add(row['Destination'])
    return sorted(list(locations))

def get_unique_service_types(data):
    service_types = set()
    for row in data:
        if 'Service Type' in row:
            service_types.add(row['Service Type'])
    return sorted(list(service_types))

def sanitize_bus_data(data_list): 
    """Helper function to sanitize bus data for JSON serialization."""
    cleaned_data = []
    for item in data_list:
        cleaned_item = {}
        for key, value in item.items():
            if isinstance(value, datetime):
                cleaned_item[key] = value.isoformat()
            elif value is None:
                cleaned_item[key] = None
            else:
                cleaned_item[key] = value
        cleaned_data.append(cleaned_item)
    return cleaned_data

# --- Helper Functions for Data Loading/Persistence ---

def retry_firestore_op(func, *args, **kwargs):
    """
    Retries a Firestore operation with exponential backoff for 429 errors.
    """
    max_retries = 5
    initial_delay = 1 # seconds
    for i in range(max_retries):
        try:
            return func(*args, **kwargs)
        except ResourceExhausted as e: 
            print(f"WARNING: ResourceExhausted (429) - {e}. Retrying in {initial_delay * (2 ** i):.2f}s... (Attempt {i+1}/{max_retries})")
            time.sleep(initial_delay * (2 ** i))
        except Exception as e:
            raise 
    raise Exception(f"Failed after {max_retries} retries due to persistent quota issues or other errors.")


def fetch_data_from_firestore():
    """Fetches all bus data from Firestore and processes it with retries."""
    buses = []
    def _fetch():
        docs = db.collection('bus_routes').stream()
        return [doc.to_dict() for doc in docs] 

    try:
        raw_buses = retry_firestore_op(_fetch)
        for bus_data_dict in raw_buses:
            buses.append(bus_data_dict)
        print(f"INFO: Successfully fetched {len(buses)} bus records from Firestore.")
        return buses
    except Exception as e:
        print(f"ERROR: Failed to fetch bus data from Firestore after retries: {e}")
        return []

def save_data_to_cache(data): 
    """Saves the current bus data to the cache file."""
    try:
        sanitized_data = sanitize_bus_data(data) 
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(sanitized_data, f, indent=4)
        print("INFO: Saved bus data to cache file.")
    except Exception as e:
        print(f"ERROR: Failed to save data to cache: {e}")

def load_data_into_memory():
    """Loads data from cache or Firestore into global app_data.
       Ensures bus_data['id'] is present for all records.
    """
    global app_data 

    buses_to_load = []

    print(f"DEBUG: Attempting to load data into memory. Cache file '{CACHE_FILE}' exists: {os.path.exists(CACHE_FILE)}")
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                buses_to_load = json.load(f)
            print(f"INFO: Loaded {len(buses_to_load)} bus data records from cache file.")
        except json.JSONDecodeError as e:
            print(f"WARNING: Cache file corrupted or empty: {e}. Removing cache and re-fetching from Firestore.")
            if os.path.exists(CACHE_FILE): 
                os.remove(CACHE_FILE) 
            buses_to_load = fetch_data_from_firestore()
            if buses_to_load: 
                save_data_to_cache(buses_to_load) 
    else:
        print("INFO: Cache file not found. Fetching from Firestore.")
        buses_to_load = fetch_data_from_firestore()
        if buses_to_load:
            save_data_to_cache(buses_to_load) 
    
    needs_id_update = False
    if buses_to_load:
        for route in buses_to_load:
            if route.get('id') is None or route.get('id') == '':
                needs_id_update = True
                break
    
    if needs_id_update and buses_to_load: 
        print("INFO: IDs missing/empty in some loaded bus records. Re-fetching from Firestore to get document IDs.")
        all_docs_with_id = []
        def _fetch_with_ids():
            return db.collection('bus_routes').stream() 
        
        try:
            docs_stream = retry_firestore_op(_fetch_with_ids)
            for doc in docs_stream:
                data = doc.to_dict()
                data['id'] = doc.id 
                all_docs_with_id.append(data)
            buses_to_load = all_docs_with_id
            if buses_to_load:
                save_data_to_cache(buses_to_load) 
            print(f"INFO: Successfully re-fetched {len(buses_to_load)} bus records with IDs from Firestore.")
        except Exception as e:
            print(f"ERROR: Failed to re-fetch with IDs after retries: {e}. Proceeding with data without guaranteed IDs, this may affect admin operations.")
            for route in buses_to_load:
                if 'id' in route:
                    del route['id']


    app_data['bus_routes'] = buses_to_load
    app_data['unique_locations'] = get_unique_locations_from_bus_data(app_data['bus_routes'])
    app_data['unique_service_types'] = get_unique_service_types(app_data['bus_routes'])
    print(f"INFO: In-memory app_data updated. Bus routes count: {len(app_data['bus_routes'])}, Locations count: {len(app_data['unique_locations'])}, Service Types count: {len(app_data['unique_service_types'])}")


def populate_firestore_from_csv(filename="data/SETCbustimings_1_0.csv"):
    """
    Populates the 'bus_routes' collection in Firestore from a CSV file.
    Runs only if the collection is truly empty.
    """
    print("INFO: Checking Firestore collection for existing data for CSV import...")
    try:
        def _check_collection_empty():
            first_doc = next(db.collection('bus_routes').limit(1).stream(), None)
            return first_doc is None

        is_empty = retry_firestore_op(_check_collection_empty)
        
        if not is_empty:
            print("INFO: 'bus_routes' collection already has data. Skipping CSV import.")
            return

        csv_data = []
        filepath = os.path.join(os.path.dirname(__file__), filename)
        if not os.path.exists(filepath):
            print(f"ERROR: CSV file not found at {filepath} for initial import. Skipping.")
            return

        print(f"INFO: 'bus_routes' collection is empty. Starting CSV import from {filepath}...")
        with open(filepath, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile, delimiter=',')
            expected_headers = [
                'S.NO.', 'Corporation', 'Route No', 'Service Type', 'Source',
                'Destination', 'Departure', 'Arrival'
            ]
            if not reader.fieldnames or not all(header in reader.fieldnames for header in expected_headers):
                print(f"ERROR: CSV headers do not match expected: {expected_headers}. Found: {reader.fieldnames}")
                print("Please ensure your CSV file's first row exactly matches the expected headers.")
                return

            for row_num, row in enumerate(reader, start=1):
                cleaned_row = {k.strip(): v.strip() for k, v in row.items()}
                if all(cleaned_row.get(h) for h in ['Source', 'Destination', 'Departure', 'Arrival']):
                    cleaned_row['S.NO.'] = int(cleaned_row['S.NO.']) if cleaned_row.get('S.NO.') else 0
                    cleaned_row['is_recurring'] = True 
                    cleaned_row['specific_date'] = "" 
                    csv_data.append(cleaned_row)
                else:
                    print(f"WARNING: Skipping CSV row {row_num} due to missing essential data: {cleaned_row}")
            
            if not csv_data:
                print("WARNING: No valid data found in CSV to import.")
                return

            batch = db.batch()
            current_batch_size = 0
            for i, row in enumerate(csv_data):
                doc_ref = db.collection('bus_routes').document() 
                batch.set(doc_ref, row)
                current_batch_size += 1
                if current_batch_size >= 400: 
                    print(f"INFO: Committing batch {i // 400 + 1} of {current_batch_size} documents to Firestore...")
                    retry_firestore_op(batch.commit)
                    batch = db.batch()
                    current_batch_size = 0
            if current_batch_size > 0: 
                print(f"INFO: Committing final batch of {current_batch_size} documents to Firestore...")
                retry_firestore_op(batch.commit)
            print(f"INFO: Successfully imported {len(csv_data)} records from CSV to Firestore.")
    except Exception as e:
        print(f"ERROR: Failed to import CSV data to Firestore: {e}")

# --- Application Startup Sequence ---
populate_firestore_from_csv() 
load_data_into_memory()


# --- Auth hook ---
@app.before_request
def check_auth():
    # Allowed endpoints for unauthenticated access
    allowed_endpoints = ['static', 'language_selection', 'set_language', 'login', 'register', 'google_register']
    
    # Get the current language from session, default to English
    current_language = session.get('language', 'en')
    messages = LANGUAGES[current_language]

    # If the endpoint is one of the allowed ones, let it pass without auth check
    if request.endpoint is None or request.endpoint in allowed_endpoints:
        return

    # If trying to access /home but not logged in, redirect to login
    if request.endpoint == 'home' and 'logged_in' not in session:
        print(f"INFO: Redirecting unauthenticated user from {request.endpoint} to login (because not logged in).")
        return redirect(url_for('login'))

    # For all other protected routes, ensure user is logged in
    if 'logged_in' not in session:
        print(f"INFO: Redirecting unauthenticated user from {request.endpoint} to login (general fallback for protected routes).")
        return redirect(url_for('login'))

    # If logged in but trying to access an admin route without admin role
    if request.endpoint and request.endpoint.startswith('admin_') and session.get('role') != 'admin':
        print(f"WARNING: Access denied for user '{session.get('username')}' (role: {session.get('role')}) to admin route {request.endpoint}.")
        return messages['not_logged_in_message'], 403 

# --- Routes ---

# Modified: Root route now *always* shows the language selection
@app.route('/')
def language_selection():
    # This ensures that visiting '/' always brings up the language selection
    return render_template('language_selection/language_selection.html', messages=LANGUAGES['en']) 


# New: Endpoint to set the user's language preference
@app.route('/set_language', methods=['POST'])
def set_language():
    data = request.get_json()
    language = data.get('language')
    if language in LANGUAGES: 
        session['language'] = language
        print(f"INFO: Language set to: {language}. Session: {dict(session)}") # Added debug print
        # After setting language, redirect to home. The /home route will then handle authentication.
        return jsonify({"status": "success", "redirect": url_for('home')}) 
    return jsonify({"status": "error", "message": LANGUAGES[session.get('language', 'en')]['error_set_language']}), 400


@app.route('/login', methods=['GET', 'POST'])
def login():
    current_language = session.get('language', 'en')
    messages = LANGUAGES[current_language]

    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username in USERS and USERS[username]['password'] == password:
            session['logged_in'] = True
            session['username'] = username
            session['role'] = USERS[username]['role']
            print(f"INFO: User '{username}' logged in with role '{session['role']}'. Session: {dict(session)}") # Added debug print
            return redirect(url_for('home')) 
        else:
            print(f"INFO: Invalid login attempt for user '{username}'. Session: {dict(session)}") # Added debug print
            return render_template('login/login.html', message=messages['invalid_credentials'], messages=messages)
    print(f"DEBUG: Entering /login GET route. Session: {dict(session)}") # Added debug print
    return render_template('login/login.html', messages=messages)

@app.route('/logout')
def logout():
    username = session.get('username', 'Guest')
    session.clear()
    print(f"INFO: User '{username}' logged out. Session cleared.") # Added debug print
    return redirect(url_for('language_selection'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    current_language = session.get('language', 'en')
    messages = LANGUAGES[current_language]

    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password'].strip()
        phone = request.form['phone'].strip()
        otp_verified = request.form.get('otp_verified', 'false').strip() 

        if not username or not password or not phone:
            print(f"INFO: Registration attempt - missing fields. Session: {dict(session)}")
            return render_template('register/register.html', message=messages['all_fields_required'], messages=messages)

        if otp_verified != "true":
            print(f"INFO: Registration attempt - OTP not verified. Session: {dict(session)}")
            return render_template('register/register.html', message=messages['otp_verified_label'], messages=messages)

        if username in USERS:
            print(f"INFO: Registration attempt - Username '{username}' already exists. Session: {dict(session)}")
            return render_template('register/register.html', message=messages['username_exists'], messages=messages)

        USERS[username] = {
            'password': password,
            'phone': phone,
            'role': 'user' 
        }

        print(f"INFO: New user registered: {username}, Phone: {phone}. Redirecting to login. Session: {dict(session)}") # Added debug print
        return redirect(url_for('login')) 

    print(f"DEBUG: Entering /register GET route. Session: {dict(session)}") # Added debug print
    return render_template('register/register.html', messages=messages)

@app.route('/google_register')
def google_register():
    current_language = session.get('language', 'en')
    messages = LANGUAGES[current_language]
    return messages['google_register_coming_soon']


@app.route('/home')
def home():
    current_language = session.get('language', 'en')
    messages = LANGUAGES[current_language]

    print(f"DEBUG: Entering /home route. session['logged_in']: {session.get('logged_in', 'Not set')}, session content: {dict(session)}") # Added debug print

    if session.get('logged_in'): # Explicitly check for True
        if session.get('role') == 'admin':
            print("DEBUG: User is admin, redirecting to admin_dashboard.")
            return redirect(url_for('admin_dashboard'))
        else:
            print("DEBUG: User is logged in as regular user. Rendering index.html.")
            load_data_into_memory() 
            locations = app_data['unique_locations']
            service_types = app_data['unique_service_types'] 
            current_date = datetime.now().strftime('%Y-%m-%d')
            return render_template('index/index.html', locations=locations, search_date=current_date, 
                                   user_role=session.get('role'), service_types=service_types, results=[],
                                   selected_language=current_language, messages=messages) 
    else:
        print("DEBUG: User NOT logged in. Redirecting to login.")
        return redirect(url_for('login'))


@app.route('/get_locations')
def get_locations_api():
    query = request.args.get('query', '').strip().lower()
    all_locations = app_data['unique_locations'] 
    
    scored_locations = []
    if query:
        for loc in all_locations:
            score = fuzz.partial_ratio(query, loc.lower()) 
            if score >= 60:
                scored_locations.append((loc, score))
        scored_locations.sort(key=lambda x: (-x[1], x[0]))
        filtered_locations = [loc[0] for loc in scored_locations]
    else:
        filtered_locations = [] 
        
    return jsonify(filtered_locations)

@app.route('/get_service_types')
def get_service_types_api():
    query = request.args.get('query', '').strip().lower()
    all_service_types = app_data['unique_service_types']

    scored_service_types = []
    if query:
        for service_type in all_service_types:
            score = fuzz.partial_ratio(query, service_type.lower())
            if score >= 60:
                scored_service_types.append((service_type, score))
        scored_service_types.sort(key=lambda x: (-x[1], x[0]))
        filtered_service_types = [s[0] for s in scored_service_types]
    else:
        filtered_service_types = []

    return jsonify(filtered_service_types)


@app.route('/search', methods=['POST'])
def search():
    current_language = session.get('language', 'en')
    messages = LANGUAGES[current_language]

    if 'logged_in' not in session:
        return redirect(url_for('login')) 

    from_location = request.form['from'].strip()
    to_location = request.form['to'].strip()
    search_date_str = request.form.get('date', '').strip()
    search_service_type = request.form.get('service_type', '').strip().lower() 

    search_date_obj = None 
    if search_date_str:
        try:
            search_date_obj = datetime.strptime(search_date_str, '%Y-%m-%d').date()
        except ValueError:
            locations = app_data['unique_locations']
            service_types = app_data['unique_service_types']
            current_date = datetime.now().strftime('%Y-%m-%d')
            return render_template('index/index.html', message=messages['invalid_date_format'], 
                                   locations=locations, search_date=current_date, user_role=session.get('role'),
                                   service_types=service_types,
                                   from_location=from_location, to_location=to_location, 
                                   search_service_type=request.form.get('service_type'),
                                   selected_language=current_language, messages=messages) 
    
    results = []
    now = datetime.now()
    today = now.date()
    now_time = now.time()

    for row_idx, row in enumerate(app_data['bus_routes']): 
        if 'Source' not in row or 'Destination' not in row or 'Departure' not in row:
            print(f"ERROR: Row {row_idx+1} from data missing essential keys: {row}. Skipping.")
            continue

        csv_source = row['Source'].lower()
        csv_destination = row['Destination'].lower()
        bus_departure_time_str = row['Departure'].strip() 
        bus_service_type = row.get('Service Type', '').lower() 
        
        is_recurring = row.get('is_recurring', False) 
        specific_date_str = row.get('specific_date', '').strip()

        if not (csv_source == from_location.lower() and
                csv_destination == to_location.lower() and
                (not search_service_type or search_service_type in bus_service_type)): 
            continue

        try:
            bus_departure_time_obj = datetime.strptime(bus_departure_time_str, '%H:%M').time()
            
            match_found = False

            if is_recurring:
                if search_date_obj is None or search_date_obj == today: 
                    if bus_departure_time_obj >= now_time:
                        match_found = True
                elif search_date_obj > today: 
                    match_found = True
            
            elif specific_date_str:
                try:
                    bus_specific_date_obj = datetime.strptime(specific_date_str, '%Y-%m-%d').date()
                    if search_date_obj and bus_specific_date_obj == search_date_obj:
                        if search_date_obj == today: 
                            if bus_departure_time_obj >= now_time:
                                match_found = True
                        else:
                            match_found = True
                except ValueError:
                    print(f"ERROR: Row {row_idx+1} - Invalid 'specific_date' format ('{specific_date_str}'). Expected IHDA-MM-DD. This bus might be skipped.")
            
            if match_found:
                results.append(row)

        except ValueError:
            print(f"ERROR: Row {row_idx+1} - Invalid 'Departure' time format ('{row.get('Departure')}'). Expected HH:MM. Skipping row: {row}")
        except Exception as e:
            print(f"ERROR: An unexpected error occurred while processing row {row_idx+1}: {e}. Row: {row}")

    message = None 
    if not results:
        message = messages['no_buses_found']
        print(f"DEBUG: No buses found for '{from_location}' to '{to_location}' on '{search_date_str}' with service type '{search_service_type}'.")
    else:
        try:
            results.sort(key=lambda x: datetime.strptime(x['Departure'], '%H:%M').time())
            print("DEBUG: Results sorted by Departure time.")
        except KeyError:
            print("WARNING: Could not sort results. 'Departure' key missing in some rows.")
        except ValueError:
            print("WARNING: Could not sort results. Invalid 'Departure' time format in some rows.")
        print(f"DEBUG: Found {len(results)} bus services.")
    
    locations = app_data['unique_locations'] 
    service_types = app_data['unique_service_types'] 
    return render_template('index/index.html', results=results, message=message,
                           from_location=from_location, to_location=to_location,
                           search_date=search_date_str, user_role=session.get('role'),
                           service_types=service_types, 
                           search_service_type=request.form.get('service_type'),
                           selected_language=current_language, messages=messages) 


@app.route('/chatbot')
def chatbot_page():
    current_language = session.get('language', 'en')
    messages = LANGUAGES[current_language]
    return render_template('chatbot/chatbot.html', messages=messages)

# --- ADMIN ROUTES ---

@app.route('/admin')
def admin_dashboard():
    current_language = session.get('language', 'en')
    messages = LANGUAGES[current_language]

    print(f"DEBUG: Entering /admin route. session['logged_in']: {session.get('logged_in', 'Not set')}, session content: {dict(session)}") # Added debug print

    load_data_into_memory() 
    all_routes_cleaned = sanitize_bus_data(app_data['bus_routes'])
    locations = app_data['unique_locations']
    service_types = app_data['unique_service_types']
    
    return render_template('admin/admin.html', user_role=session.get('role'), 
                           routes=all_routes_cleaned, locations=locations, 
                           service_types=service_types, messages=messages)


@app.route('/admin/add_route', methods=['POST'])
def admin_add_route():
    current_language = session.get('language', 'en')
    messages = LANGUAGES[current_language]
    try:
        data = {
            'source': request.form.get('source', '').strip(),
            'destination': request.form.get('destination', '').strip(),
            'departure': request.form.get('departure', '').strip(),
            'arrival': request.form.get('arrival', '').strip(),
            'corporation': request.form.get('corporation', '').strip(),
            'route_no': request.form.get('route_no', '').strip(),
            'service_type': request.form.get('service_type', '').strip()
        }
        s_no = int(datetime.now().timestamp()) 
        fare = request.form.get('fare', 'N/A').strip()
        is_recurring = 'is_recurring' in request.form
        specific_date = request.form.get('specific_date', '').strip()

        if not all(data.values()): 
            return jsonify({"status": "error", "message": messages['route_add_error_required_fields']})
        
        if is_recurring and specific_date:
            return jsonify({"status": "error", "message": messages['route_add_error_recurring_specific_conflict']})
        if not is_recurring and not specific_date:
            return jsonify({"status": "error", "message": messages['route_add_error_either_recurring_or_specific']})


        datetime.strptime(data['departure'], '%H:%M')
        datetime.strptime(data['arrival'], '%H:%M') 
        if specific_date:
            datetime.strptime(specific_date, '%Y-%m-%d')

        bus_doc = {
            'S.NO.': s_no,
            'Corporation': data['corporation'],
            'Route No': data['route_no'],
            'Service Type': data['service_type'],
            'Source': data['source'],
            'Destination': data['destination'],
            'Departure': data['departure'],
            'Arrival': data['arrival'],
            'Fare': fare,
            'is_recurring': is_recurring,
            'specific_date': specific_date 
        }
        
        doc_ref_tuple = retry_firestore_op(db.collection('bus_routes').add, bus_doc)
        new_doc_id = doc_ref_tuple[1].id 
        bus_doc['id'] = new_doc_id 

        app_data['bus_routes'].append(bus_doc)
        app_data['unique_locations'] = get_unique_locations_from_bus_data(app_data['bus_routes'])
        app_data['unique_service_types'] = get_unique_service_types(app_data['bus_routes'])
        
        save_data_to_cache(app_data['bus_routes'])
        
        return jsonify({"status": "success", "message": messages['route_add_success']}) 
    except ValueError as ve:
        return jsonify({"status": "error", "message": f"{messages['route_add_error_invalid_datetime']} {ve}"})
    except Exception as e:
        print(f"ERROR: Failed to add route: {e}")
        return jsonify({"status": "error", "message": f"{messages['unexpected_error']}"})


@app.route('/admin/update_route', methods=['POST'])
def admin_update_route():
    current_language = session.get('language', 'en')
    messages = LANGUAGES[current_language]
    try:
        doc_id = request.form.get('id')
        if not doc_id:
            return jsonify({"status": "error", "message": messages['route_update_error_id_missing']})

        updated_data = {
            'Source': request.form.get('source', '').strip(),
            'Destination': request.form.get('destination', '').strip(),
            'Departure': request.form.get('departure', '').strip(),
            'Arrival': request.form.get('arrival', '').strip(),
            'Corporation': request.form.get('corporation', '').strip(),
            'Route No': request.form.get('route_no', '').strip(),
            'Service Type': request.form.get('service_type', '').strip(),
            'Fare': request.form.get('fare', 'N/A').strip(),
            'is_recurring': 'is_recurring' in request.form,
            'specific_date': request.form.get('specific_date', '').strip()
        }
        
        existing_route = next((r for r in app_data['bus_routes'] if r.get('id') == doc_id), None)
        if existing_route:
            updated_data['S.NO.'] = existing_route.get('S.NO.', int(datetime.now().timestamp()))
        else:
            updated_data['S.NO.'] = int(datetime.now().timestamp())


        required_fields = ['Source', 'Destination', 'Departure', 'Arrival', 'Corporation', 'Route No', 'Service Type']
        if not all(updated_data.get(k) for k in required_fields):
            return jsonify({"status": "error", "message": messages['route_add_error_required_fields']})

        if updated_data['is_recurring'] and updated_data['specific_date']:
            return jsonify({"status": "error", "message": messages['route_add_error_recurring_specific_conflict']})
        if not updated_data['is_recurring'] and not updated_data['specific_date']:
            return jsonify({"status": "error", "message": messages['route_add_error_either_recurring_or_specific']})
        
        try:
            datetime.strptime(updated_data['Departure'], '%H:%M')
            datetime.strptime(updated_data['Arrival'], '%H:%M') 
            if updated_data['specific_date']:
                datetime.strptime(updated_data['specific_date'], '%Y-%m-%d')
        except ValueError as ve:
            return jsonify({"status": "error", "message": f"{messages['route_add_error_invalid_datetime']} {ve}"})
    except Exception as e:
        print(f"ERROR: Failed to update route: {e}")
        return jsonify({"status": "error", "message": f"{messages['unexpected_error']}"})

    retry_firestore_op(db.collection('bus_routes').document(doc_id).set, updated_data, merge=False) 
    print(f"INFO: Admin updated route {doc_id}: {updated_data}")
    
    for i, route in enumerate(app_data['bus_routes']):
        if route.get('id') == doc_id: 
            app_data['bus_routes'][i] = {**route, **updated_data} 
            break
    
    app_data['unique_locations'] = get_unique_locations_from_bus_data(app_data['bus_routes'])
    app_data['unique_service_types'] = get_unique_service_types(app_data['bus_routes'])

    save_data_to_cache(app_data['bus_routes'])

    return jsonify({"status": "success", "message": messages['route_update_success']})


@app.route('/admin/delete_route', methods=['POST'])
def admin_delete_route():
    current_language = session.get('language', 'en')
    messages = LANGUAGES[current_language]
    try:
        doc_id = request.form.get('id')
        if not doc_id:
            return jsonify({"status": "error", "message": messages['route_delete_error_id_missing']})

        retry_firestore_op(db.collection('bus_routes').document(doc_id).delete)
        print(f"INFO: Admin deleted route: {doc_id}")
        
        app_data['bus_routes'] = [route for route in app_data['bus_routes'] if route.get('id') != doc_id]
        
        app_data['unique_locations'] = get_unique_locations_from_bus_data(app_data['bus_routes'])
        app_data['unique_service_types'] = get_unique_service_types(app_data['bus_routes'])

        save_data_to_cache(app_data['bus_routes'])

        return jsonify({"status": "success", "message": messages['route_delete_success']})
    except Exception as e:
        print(f"ERROR: Failed to delete route: {e}")
        return jsonify({"status": "error", "message": f"{messages['unexpected_error']}"})


if __name__ == '__main__':
    app.run(debug=True)
