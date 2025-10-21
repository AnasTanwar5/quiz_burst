@echo off
REM QuizBurst Vercel Deployment Script for Windows
REM Run this script to prepare your project for Vercel deployment

echo 🚀 Preparing QuizBurst for Vercel Deployment...

REM 1. Install Vercel CLI if not already installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Installing Vercel CLI...
    npm install -g vercel
)

REM 2. Create production build
echo 🔨 Creating production build...
npm run build

REM 3. Check if build was successful
if %errorlevel% equ 0 (
    echo ✅ Build successful!
) else (
    echo ❌ Build failed! Please fix errors before deploying.
    pause
    exit /b 1
)

REM 4. Login to Vercel (if not already logged in)
echo 🔐 Checking Vercel authentication...
vercel whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo Please login to Vercel:
    vercel login
)

REM 5. Deploy to Vercel
echo 🚀 Deploying to Vercel...
vercel --prod

echo ✅ Deployment complete!
echo 📋 Next steps:
echo 1. Go to your Vercel dashboard
echo 2. Add environment variables:
echo    - MONGODB_URI: mongodb+srv://anas:anas7860@quizburst.u40wlws.mongodb.net/
echo    - JWT_SECRET: your-super-secure-production-secret-key
echo    - NODE_ENV: production
echo    - VITE_API_URL: https://your-app-name.vercel.app
echo 3. Redeploy after adding environment variables
echo 4. Test your live application!

REM 6. Show deployment info
echo 🌐 Deployment information:
vercel ls

pause
