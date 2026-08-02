# Dihadi — Worker App

Part of the **Dihadi** daily-wage labor booking platform. Workers register, get approved by admins, and receive job alerts in real time.

## Features

- Register with name, phone, Aadhar, address, and trade
- Account must be **approved by admin** before you can go online
- Online/Offline toggle — go online to receive matching job alerts
- Jobs are filtered to your trade only
- Pop-up job alerts with an **ACCEPT JOB** button
- See the customer's name, phone, address, and GPS location after accepting
- One-tap navigation to the job location

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` by copying the example file:

   ```bash
   copy .env.local.example .env.local
   ```

   Then fill in your Firebase project values.

3. Set up Firestore security rules (Firebase Console → Firestore Database → Rules):

   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3001](http://localhost:3001)

## Firebase Collections Used

| Collection | Purpose |
|---|---|
| `workers` | Worker registrations with `status: pending/approved/blocked` |
| `jobs` | Accepted jobs assigned to this worker |

## Deploy on Vercel

Import this repo at [vercel.com/new](https://vercel.com/new), then add the same environment variables from `.env.local` under **Project → Settings → Environment Variables**.
