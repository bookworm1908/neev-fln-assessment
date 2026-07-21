Write-Host "Starting Neev FLN Assessor Deployment Helper..." -ForegroundColor Cyan

# Check for npm
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "npm found." -ForegroundColor Green
} else {
    Write-Host "Error: npm is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Exit
}

# Install Firebase CLI if not present
if (!(Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "Firebase CLI not found. Installing globally via npm..." -ForegroundColor Yellow
    npm install -g firebase-tools
}

Write-Host "Authenticating with Google..." -ForegroundColor Cyan
firebase login

Write-Host "Initializing Firebase project link..." -ForegroundColor Cyan
firebase use --add

Write-Host "Deploying to Firebase Hosting..." -ForegroundColor Cyan
firebase deploy --only hosting

Write-Host "Deployment complete! Your app is now live." -ForegroundColor Green
