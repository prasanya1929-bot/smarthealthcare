# SMART HEALTH CARE
## Emergency Health Monitoring & Doctor Appointment System

A comprehensive MERN stack healthcare web application designed for senior citizens, featuring emergency monitoring, health tracking, and doctor appointment management.

---

## 🚀 Tech Stack

### Frontend
- **React** - UI framework
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Chart.js** - Data visualization
- **React Router** - Navigation

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MongoDB** (running locally or MongoDB Atlas connection string)

---

## 🛠️ Installation & Setup

### Step 1: Clone the Repository
```bash
cd SHC
```

### Step 2: Install Dependencies

**Install backend dependencies:**
```bash
npm install
```

**Install frontend dependencies:**
```bash
cd frontend
npm install
cd ..
```

**Or install all at once:**
```bash
npm run install-all
```

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb://localhost:27017/smarthealthcare
PORT=5000
```

For MongoDB Atlas, use:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smarthealthcare
PORT=5000
```

### Step 4: Seed Database (Optional)

Create sample doctors and caregivers:
```bash
node backend/seed.js
```

This will create:
- **Doctors:**
  - Email: `doctor1@health.com`, Password: `doctor123`
  - Email: `doctor2@health.com`, Password: `doctor123`
- **Caregivers:**
  - Email: `caregiver1@health.com`, Password: `caregiver123`
  - Email: `caregiver2@health.com`, Password: `caregiver123`

### Step 5: Start the Application

**Option 1: Run both frontend and backend together (Recommended)**
```bash
npm run dev
```

**Option 2: Run separately**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

**Option 3: Production mode**
```bash
npm start
```

---

## 🌐 Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

---

## 👥 User Roles

### 1. **Patient (Senior Citizen)**
- Sign up and create account
- Update personal details
- Enter health data (Heart Rate, SpO2, Temperature)
- View recent health status
- Trigger emergency button (calls ambulance: tel:108)

### 2. **Doctor**
- Pre-created accounts (use seed data)
- View assigned patients
- Monitor patient health charts
- View active emergencies
- Set availability slots
- Resolve emergencies

### 3. **Caregiver**
- Pre-created accounts (use seed data)
- View all patients
- Monitor patient health charts
- View emergency alerts
- Call patients/doctors

---

## 📡 ESP32 Sensor Integration

The backend provides an API endpoint for ESP32 sensor data:

**Endpoint:** `POST /api/sensor-data`

**Payload:**
```json
{
  "patientId": "patient_id_here",
  "heartRate": 75,
  "spo2": 98,
  "temperature": 36.5
}
```

**Features:**
- Automatically stores health data in MongoDB
- Auto-creates emergency if values are abnormal:
  - **Warning:** Heart Rate < 60 or > 100, SpO2 < 95, Temperature < 36 or > 37.5
  - **Critical:** Heart Rate < 50 or > 120, SpO2 < 90, Temperature < 35 or > 38.5

---

## 🚨 Emergency System

### Emergency Triggers:
1. **Manual:** Patient clicks the BIG RED EMERGENCY BUTTON
2. **Automatic:** Abnormal sensor values detected

### Emergency Actions:
- Creates emergency record in database
- Automatically calls ambulance using `tel:108`
- Shows alert message
- Visible to doctors and caregivers

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Patient signup

### Patients
- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get patient by ID
- `PUT /api/patients/:id` - Update patient

### Doctors
- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:id` - Get doctor by ID
- `PUT /api/doctors/:id/availability` - Update availability
- `GET /api/doctors/:id/patients` - Get assigned patients

### Health Data
- `GET /api/health/patient/:patientId` - Get patient health data
- `POST /api/health` - Add health data

### Appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/patient/:patientId` - Get patient appointments
- `GET /api/appointments/doctor/:doctorId` - Get doctor appointments
- `PUT /api/appointments/:id` - Update appointment

### Emergencies
- `POST /api/emergencies` - Create emergency
- `GET /api/emergencies/active` - Get active emergencies
- `GET /api/emergencies/patient/:patientId` - Get patient emergencies
- `PUT /api/emergencies/:id` - Update emergency status

### Sensor Data
- `POST /api/sensor-data` - Receive ESP32 sensor data

---

## 🎨 Features

- ✅ **Elderly-friendly UI** - Large buttons and fonts
- ✅ **Real-time health monitoring** - Charts and data visualization
- ✅ **Emergency system** - One-click emergency button
- ✅ **Role-based access** - Patient, Doctor, Caregiver dashboards
- ✅ **Sensor integration** - ESP32 compatible API
- ✅ **Appointment management** - Book and manage appointments
- ✅ **Health charts** - Visual representation using Chart.js

---

## 📁 Project Structure

```
SHC/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── PatientHealth.js
│   │   ├── Appointment.js
│   │   └── Emergency.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── patients.js
│   │   ├── doctors.js
│   │   ├── health.js
│   │   ├── appointments.js
│   │   ├── emergencies.js
│   │   └── sensorData.js
│   ├── server.js
│   └── seed.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js
│   │   │   └── Signup.js
│   │   ├── pages/
│   │   │   ├── LandingPage.js
│   │   │   ├── PatientDashboard.js
│   │   │   ├── DoctorDashboard.js
│   │   │   └── CaregiverDashboard.js
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── tailwind.config.js
├── .env.example
├── package.json
└── README.md
```

---

## 🔒 Authentication

- **Simple email + password authentication**
- **No JWT or OAuth** - Plain text passwords (demo purpose)
- **Role-based login** - Different dashboards for each role
- **Signup only for patients** - Doctors and caregivers are pre-created

---

## 📝 Notes

- This is a **demo application** - Passwords are stored in plain text
- For production, implement proper password hashing (bcrypt)
- Add JWT tokens for secure authentication
- Implement proper error handling and validation
- Add input sanitization and security measures

---

## 🐛 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod` (local) or check Atlas connection string
- Verify `.env` file has correct `MONGODB_URI`

### Port Already in Use
- Change `PORT` in `.env` file
- Or kill the process using the port

### Frontend Not Loading
- Ensure backend is running on port 5000
- Check `REACT_APP_API_URL` in frontend if using custom backend URL

---

## 📞 Support

For issues or questions, please check the code comments or create an issue in the repository.

---

## 📄 License

This project is for educational/demo purposes.

---

**Built with ❤️ for Smart Health Care**

