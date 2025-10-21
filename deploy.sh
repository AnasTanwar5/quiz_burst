#!/bin/bash

# QuizBurst Vercel Deployment Script
# Run this script to prepare your project for Vercel deployment

echo "🚀 Preparing QuizBurst for Vercel Deployment..."

# 1. Install Vercel CLI if not already installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# 2. Create production build
echo "🔨 Creating production build..."
npm run build

# 3. Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed! Please fix errors before deploying."
    exit 1
fi

# 4. Login to Vercel (if not already logged in)
echo "🔐 Checking Vercel authentication..."
vercel whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Please login to Vercel:"
    vercel login
fi

# 5. Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "📋 Next steps:"
echo "1. Go to your Vercel dashboard"
echo "2. Add environment variables:"
echo "   - MONGODB_URI: mongodb+srv://anas:anas7860@quizburst.u40wlws.mongodb.net/"
echo "   - JWT_SECRET: your-super-secure-production-secret-key"
echo "   - NODE_ENV: production"
echo "   - VITE_API_URL: https://your-app-name.vercel.app"
echo "3. Redeploy after adding environment variables"
echo "4. Test your live application!"

# 6. Open deployment URL
echo "🌐 Opening deployment URL..."
vercel ls
