#!/bin/bash

# Firebase Notifications Setup Verification Script
# This script verifies that Firebase notifications are properly set up

echo "🔥 Firebase Notifications Setup Verification"
echo "=============================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with Firebase credentials"
    echo "See .env.firebase.example for the required format"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check for Firebase environment variables
echo "Checking Firebase environment variables..."
echo ""

if grep -q "FIREBASE_PROJECT_ID=" .env; then
    PROJECT_ID=$(grep "FIREBASE_PROJECT_ID=" .env | cut -d '=' -f2)
    if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "your-firebase-project-id" ]; then
        echo "⚠️  FIREBASE_PROJECT_ID is not set or using default value"
    else
        echo "✅ FIREBASE_PROJECT_ID is set"
    fi
else
    echo "❌ FIREBASE_PROJECT_ID not found in .env"
fi

if grep -q "FIREBASE_CLIENT_EMAIL=" .env; then
    CLIENT_EMAIL=$(grep "FIREBASE_CLIENT_EMAIL=" .env | cut -d '=' -f2)
    if [ -z "$CLIENT_EMAIL" ] || [ "$CLIENT_EMAIL" == "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com" ]; then
        echo "⚠️  FIREBASE_CLIENT_EMAIL is not set or using default value"
    else
        echo "✅ FIREBASE_CLIENT_EMAIL is set"
    fi
else
    echo "❌ FIREBASE_CLIENT_EMAIL not found in .env"
fi

if grep -q "FIREBASE_PRIVATE_KEY=" .env; then
    PRIVATE_KEY=$(grep "FIREBASE_PRIVATE_KEY=" .env | cut -d '=' -f2)
    if [ -z "$PRIVATE_KEY" ] || [[ "$PRIVATE_KEY" == *"YourPrivateKeyContentHere"* ]]; then
        echo "⚠️  FIREBASE_PRIVATE_KEY is not set or using default value"
    else
        echo "✅ FIREBASE_PRIVATE_KEY is set"
    fi
else
    echo "❌ FIREBASE_PRIVATE_KEY not found in .env"
fi

echo ""
echo "=============================================="
echo ""

# Check if required files exist
echo "Checking Firebase notification files..."
echo ""

FILES=(
    "src/lib/firebase/firebase-messaging.service.ts"
    "src/lib/firebase/dto/notification.dto.ts"
    "src/main/shared/notification/firebase-notification.service.ts"
    "src/main/shared/notification/firebase-notification.controller.ts"
)

ALL_FILES_EXIST=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        ALL_FILES_EXIST=false
    fi
done

echo ""

if [ "$ALL_FILES_EXIST" = true ]; then
    echo "✅ All Firebase notification files are present"
else
    echo "❌ Some Firebase notification files are missing"
fi

echo ""
echo "=============================================="
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. If Firebase credentials are not set:"
echo "   - Go to Firebase Console: https://console.firebase.google.com/"
echo "   - Select your project"
echo "   - Go to Project Settings > Service Accounts"
echo "   - Click 'Generate New Private Key'"
echo "   - Add the credentials to your .env file"
echo ""
echo "2. Restart your development server:"
echo "   npm run start:dev"
echo ""
echo "3. Test the notifications:"
echo "   - Use the API endpoint: POST /firebase-notifications/test/:userId"
echo "   - Or integrate into your existing services"
echo ""
echo "4. See documentation:"
echo "   - FIREBASE_NOTIFICATIONS_README.md"
echo "   - FIREBASE_QUICK_REFERENCE.md"
echo ""

