import requests
import time
import sys

# Wait for server to be fully ready
print("Waiting for packaged backend to boot...")
time.sleep(10)

base_url = "http://127.0.0.1:8000/api/"

try:
    # 1. Login
    res = requests.post(f"http://127.0.0.1:8000/api/token/", data={"username":"admin", "password":"admin"})
    if res.status_code != 200:
        print(f"Login Failed: {res.text}")
        sys.exit(1)
    
    token = res.json().get('access', res.json().get('token'))
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    # 2. Add Student
    student_data = {
        "first_name": "Test",
        "last_name": "Student",
        "grade": "10",
        "enrollment_date": "2026-03-25"
    }
    res = requests.post(base_url + "students/", json=student_data, headers=headers)
    if res.status_code not in [200, 201]:
        print(f"Failed to create student: {res.text}")
        sys.exit(1)
        
    student_id = res.json().get('id')
    print(f"Successfully created student ID: {student_id}")

    # 3. Add Payment
    payment_data = {
        "student": student_id,
        "amount": "500.00",
        "payment_date": "2026-03-25",
        "payment_method": "Cash"
    }
    res = requests.post(base_url + "payments/", json=payment_data, headers=headers)
    if res.status_code not in [200, 201]:
        print(f"Failed to record payment: {res.text}")
        sys.exit(1)
        
    print(f"Successfully recorded payment ID: {res.json().get('id')}")

    print("ALL FAT INTEGRATION TESTS PASSED NATIVELY!")

except requests.exceptions.ConnectionError:
    print("FATAL ERROR: The backend API failed to start or bind to port 8000!")
    sys.exit(1)
except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
