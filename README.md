# JeevCare

JeevCare is a comprehensive digital platform connecting citizens, NGOs, volunteers, donors, and administrative authorities to streamline public services, incident reporting, urgent adoptions, and healthcare via tele-triage consultations.

## Features

- **Citizen Portal**: Enables individuals to report incidents, book tele-triage services, browse adoptions, and engage with community services.
- **NGO & Volunteer Dashboard**: Specialized dashboards for NGOs to manage active cases and for volunteers to coordinate relief efforts.
- **Authority Console**: Audit logs, administrative reports, and verification systems for authorities.
- **Donor System**: Seamless management for fundraising and tracking donation impacts.
- **Real-Time Websockets**: Integrates live updates for critical alerts and urgent cases.

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose Models)
- **Frontend**: Vanilla HTML/CSS/JS with modern UI themes
- **Testing & Mocking**: Automated testing setup and mock data generation 

## Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/soham-newjourney2/JeevCare.git
   ```
2. **Install dependencies:**
   ```bash
   cd JeevCare/server
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env` file in the `server` directory using the provided examples.
4. **Run the server:**
   ```bash
   npm run start
   ```
