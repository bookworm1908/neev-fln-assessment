#!/bin/bash
echo -e "\033[1;36mStarting Neev FLN Assessor Deployment Helper...\033[0m"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "\033[1;31mError: npm is not installed. Please install Node.js from https://nodejs.org/\033[0m"
    exit 1
fi

# Install Firebase CLI if not present
if ! command -v firebase &> /dev/null; then
    echo -e "\033[1;33mFirebase CLI not found. Installing globally via npm...\033[0m"
    npm install -g firebase-tools
fi

echo -e "\033[1;36mAuthenticating with Google...\033[0m"
firebase login

echo -e "\033[1;36mInitializing Firebase project link...\033[0m"
firebase use --add

echo -e "\033[1;36mDeploying to Firebase Hosting...\033[0m"
firebase deploy --only hosting

echo -e "\033[1;32mDeployment complete! Your app is now live.\033[0m"
