# Deployment Guide: Neev FLN Assessor

This guide walks you through deploying the Neev FLN Assessor application for free using Google's Firebase Hosting (Spark Plan). Because this application uses direct REST calls to Firestore, you **do not** need to upgrade to a paid Blaze plan.

## 1. Prerequisites
- A Google Account.
- Node.js installed on your computer.

## 2. Firebase Console Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it something like `neev-fln-assessor`.
3. Disable Google Analytics (optional).
4. Once the project is ready, click **Build** -> **Firestore Database** in the left menu.
5. Click **Create database** -> Choose **Start in test mode** -> Choose a location (e.g. `asia-south1`).
6. Go to **Project Overview** (gear icon) -> **Project settings**. Under the **General** tab, copy the **Web API Key** and **Project ID**. You will enter these in the app's Admin Settings panel.

## 3. Deploying the PWA
For Windows users:
1. Open PowerShell and run: `.\deploy-helper.ps1`
2. Log into your Google account when prompted.
3. Select the Firebase project you created in Step 2.
4. The script will automatically deploy the app and give you a live URL (e.g., `https://neev-fln-assessor.web.app`).

For macOS/Linux users:
1. Open terminal and run: `bash deploy-helper.sh`
2. Follow the same login and selection steps.

## 4. Usage
Open the provided URL on any device. You can install it to your home screen via the browser menu for offline access!
