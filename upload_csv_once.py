import csv
import os
import firebase_admin
from firebase_admin import credentials, firestore

# --- Initialize Firebase Admin ---
cred = credentials.Certificate("firebase_service_account.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# --- File path ---
csv_path = os.path.join("data", "SETCbustimings_1_0.csv")
collection_ref = db.collection("bus_routes")

# --- Check if data already exists ---
if next(collection_ref.limit(1).stream(), None):
    print("❌ Firestore already has data. Skipping import.")
    exit()

# --- Read and upload CSV ---
try:
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = []
        for idx, row in enumerate(reader, start=1):
            row = {k.strip(): v.strip() for k, v in row.items()}
            if all(row.get(field) for field in ["Source", "Destination", "Departure", "Arrival"]):
                row["S.NO."] = int(row["S.NO."]) if row.get("S.NO.") else idx
                row["is_recurring"] = True
                row["specific_date"] = ""
                rows.append(row)
            else:
                print(f"⚠️ Skipping row {idx} due to missing fields.")

        print(f"✅ Ready to upload {len(rows)} documents to Firestore...")

        batch = db.batch()
        for i, doc in enumerate(rows):
            ref = collection_ref.document()
            batch.set(ref, doc)
            if (i + 1) % 500 == 0:
                batch.commit()
                print(f"📤 Uploaded {i + 1} docs...")
                batch = db.batch()
        batch.commit()
        print("✅ All data uploaded successfully.")
except FileNotFoundError:
    print(f"❌ CSV not found at: {csv_path}")
except Exception as e:
    print(f"❌ Error uploading CSV: {e}")
