# JeevCare

You're walking home and spot a dog by the road with an injured leg. You want to help, but who do you call? Which rescue group covers your area, and will anyone actually show up?

That moment is why we built JeevCare. You take a photo, the app picks up your location, and the report goes straight to the nearest rescue NGO that can take it. After that you can follow the case step by step until the animal is safe.

*Jeev* (जीव) means "living being" in Hindi. The idea is simple: every one of them deserves a response.

> JeevCare is a demo project. It runs on your own machine with demo data, so you can try every role yourself. Nothing here is a live service, and no real money changes hands.

## What you can do

JeevCare puts everyone who helps an animal in trouble in one place, and each role has its own dashboard.

**Citizens**
- Report an emergency with a photo and location, and mark it SOS if the animal's life is at risk
- Follow each report as it goes from "accepted" to "resolved"
- Book a vet, or request a quick video consult with one
- Apply to adopt or foster a rescued animal
- Donate to rescue fundraisers and see a history of everything they've given
- Earn trust points and badges for useful reports, and appear on the community leaderboard

You don't need an account to report. When an animal is hurt, signing up shouldn't be the first step.

**Rescue NGOs**
- New cases appear on the dashboard the moment they're reported
- Pick up open cases nearby, or turn down ones they can't handle
- Move a case through *accepted → team dispatched → on site → resolved*. The person who reported it sees each step as it happens
- Run fundraisers for specific rescues

**Vets and shelters**
- Publish appointment slots and manage bookings
- Accept tele-consults (a video room link is created automatically)
- List animals for adoption and review applications

**Municipal authorities**
- See every case in the city, with simple analytics
- Flag fake reports
- Send alerts to citizens
- Review an audit log of important actions

## How a report finds the right NGO

This is the part we're proudest of.

1. **Is it a duplicate?** If someone already reported the same kind of animal within 2 km in the last 6 hours, the new report joins that case. NGOs don't get five alerts about one dog.
2. **Who's closest and free?** A new case goes to a verified NGO within 10 km, preferring the one with the fewest active cases.
3. **Nobody nearby?** It falls back to the nearest NGOs, wherever they are.
4. **Turned down?** The case moves on to the next NGO automatically.

Two NGOs can't claim the same case, and two people can't book the same vet slot, even when they click at exactly the same moment.

## Built with

| Part | Tools |
|---|---|
| Backend | Node.js, Express 5 |
| Database | MongoDB with Mongoose (geospatial queries for "nearby") |
| Live updates | Socket.IO |
| Frontend | Plain HTML, CSS and JavaScript, served by Express, no build step |
| Security | JWT login, bcrypt passwords, Helmet with a strict Content Security Policy, rate limiting |
| Tests | Jest and Supertest |

## Try it on your machine

### What you need

- [Node.js](https://nodejs.org/) 20 or newer
- [MongoDB](https://www.mongodb.com/try/download/community) 6 or newer, installed locally or as a free MongoDB Atlas cluster

### Setup

```bash
git clone https://github.com/soham-newjourney2/JeevCare.git
cd JeevCare/server
npm install
cp .env.example .env
```

On Windows Command Prompt, use `copy .env.example .env` instead of `cp`.

Open `.env` and set `JWT_SECRET` to a long random string. The file has a one-line command that generates one. If MongoDB isn't running at the default local address, update `MONGO_URI` too.

Load the demo data and start the server:

```bash
npm run seed
npm run dev
```

Then open **http://localhost:5000**.

> `npm run seed` clears JeevCare's data before adding the demo records, so don't point it at a database you care about. Run it again whenever you want a fresh start.

### Demo accounts

Every account uses the password `password123`.

| Role | Email | What's waiting for you |
|---|---|---|
| Citizen | `john@example.com` | Past reports, a trust score and badge, a vet booking |
| Citizen | `priya@example.com` | An adoption application and a tele-consult request |
| Rescue NGO | `ngo@pawsrescue.org` | An injured dog waiting to be accepted, a cat rescue in progress |
| Rescue NGO | `help@streetcare.org` | A finished rescue |
| Vet | `vet@smith.com` | Open appointment slots for the next three days |
| Shelter | `shelter@happytails.org` | Three pets up for adoption |
| Authority | `admin@jeevcare.gov` | City-wide cases, analytics and the audit log |

### A five-minute tour

1. Open a normal window and log in as **john@example.com**. Open a private window and log in as **ngo@pawsrescue.org**.
2. As John, report an animal. If your browser won't share your location, enter **19.0760, 72.8777**. The demo is set in Mumbai, so this puts the case near the demo NGOs.
3. Watch the case appear on the NGO dashboard straight away.
4. As the NGO, accept it and move it through each stage. John's case page updates live.
5. Log in as **admin@jeevcare.gov** to see the same case from the city's side.

### Adding an authority account

Authority accounts can see every report in the city, so they can't be created from the sign-up page. Use the command line instead:

```bash
npm run create-authority -- --name "City Admin" --email admin@city.gov --password "a-long-password" --department "Animal Welfare" --ward "Ward A"
```

### Settings

Everything lives in `server/.env`, and `.env.example` explains each option.

| Setting | What it does |
|---|---|
| `PORT` | Port the server listens on (default 5000) |
| `NODE_ENV` | `development` shows full error details while you work |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs login tokens. Keep it long and private |
| `CORS_ORIGINS` | Only needed if a frontend on another domain calls the API |
| `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX` | Requests per IP every 15 minutes (defaults: 1000 overall, 20 login and sign-up attempts) |
| `MONGO_URI_TEST` | Database used by the tests |

## Tests

```bash
cd server
npm test
```

The 55 tests cover:
- sign-up and login
- the full rescue lifecycle
- bookings and donations under simultaneous requests
- adoptions
- rate limiting
- security checks such as role access and input sanitising

The tests wipe their database before each run. They use `MONGO_URI_TEST` (a database called `jeevcare_test` by default) and refuse to start if that name doesn't contain "test", so your demo data stays safe.

## Project layout

```
public/                       Frontend (static files served by Express)
  index.html                  Home page
  pages/                      Team, guidelines, privacy, terms
  auth/                       Login and sign-up
  citizen/ ngo/ provider/ authority/    Pages for each role
  assets/
    css/main.css              Theme, layout and shared components
    css/utilities.css         Small helper classes (mb-20, d-flex, text-muted...)
    css/pages/                Page-specific styles
    js/api.js                 API calls, login session, toasts, shared helpers
    js/layout.js              Builds the navbar and sidebar for every page
    js/pages/                 Page-specific scripts
    icons/

server/                       Backend
  server.js                   Starts the HTTP and Socket.IO server
  app.js                      Express setup and security middleware
  config/                     Database and CORS setup
  routes/ controllers/        The REST API
  models/                     MongoDB schemas
  middleware/                 Auth, file uploads, input sanitising, errors
  services/                   Case lifecycle, duplicate detection, NGO matching, slot booking
  sockets/                    Live updates (login required)
  scripts/                    Demo data and authority account tools
  tests/
```

Pages have no inline scripts or styles. That keeps the HTML easy to read and lets the Content Security Policy block inline scripts completely.

## Limitations

This is a demo MVP, so a few things are simplified on purpose:

- **Donations are simulated.** No payment provider is connected.
- **No real verification.** NGOs, vets and shelters count as verified as soon as they sign up.
- **No email, SMS or push notifications.** Updates only show up inside the app.
- **Video consults use public Jitsi rooms.** They're fine for a demo but not private enough for real use.

## The team

<div align="center">
<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://github.com/soham-newjourney2">
        <img src="https://github.com/soham-newjourney2.png?size=200" width="110" alt="Soham Chowdhury">
      </a>
      <h3>Soham Chowdhury</h3>
      <sub>Backend</sub><br><br>
      <a href="https://github.com/soham-newjourney2">
        <img src="https://img.shields.io/badge/GitHub-soham--newjourney2-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub @soham-newjourney2" height="22">
      </a>
    </td>
    <td align="center" width="50%">
      <a href="https://github.com/srijoyeemisra">
        <img src="https://github.com/srijoyeemisra.png?size=200" width="110" alt="Srijoyee Misra">
      </a>
      <h3>Srijoyee Misra</h3>
      <sub>Frontend</sub><br><br>
      <a href="https://github.com/srijoyeemisra">
        <img src="https://img.shields.io/badge/GitHub-srijoyeemisra-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub @srijoyeemisra" height="22">
      </a>
    </td>
  </tr>
</table>

<sub>Built with care for every living being. Ideas and issues are welcome.</sub>
</div>
