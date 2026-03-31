# Payment Management System (LMCS)

This repository contains a school payment management system built with:
- Django backend (REST API)
- React frontend (Vite)
- Electron packaging (optional build outputs)

## How to open and run locally

### 1. Clone repository
```bash
git clone https://github.com/Reshma-SinghR/Payment_Management_System_LMCS.git
cd Payment_Management_System_LMCS
```

### 2. Backend setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # optional
python manage.py runserver
```

Open browser at: http://127.0.0.1:8000/

### 3. Frontend setup

In separate terminal:
```powershell
cd frontend
npm install
npm run dev
```

Open browser at: http://localhost:5173/

### 4. Notes
- Keep `.venv/`, `node_modules/`, `db.sqlite3`, and generated builds out of source control.
- You can use `git pull` to update, then re-run migrations and rebuild frontend.

### 5. Optional Electron build
- Don't commit the `electron/release` folder; it can contain large binaries.
- Run the project as normal using Django + React.
