# Vercel Deployment Guide for QuizBurst

## 🚀 Complete Deployment Steps

### 1. Prerequisites
- [Vercel Account](https://vercel.com) (free tier works)
- [MongoDB Atlas Account](https://cloud.mongodb.com) (free tier works)
- [GitHub Account](https://github.com) (for code hosting)

### 2. Prepare Your Code

#### A. Update Environment Variables for Production
Create a `.env.production` file:

```env
VITE_MONGODB_URI="mongodb+srv://anas:anas7860@quizburst.u40wlws.mongodb.net/"
VITE_JWT_SECRET="your-super-secure-production-secret-key-change-this"
VITE_API_URL="https://your-app-name.vercel.app"
```

#### B. Update API Configuration
Update `src/integrations/mongodb/index.ts` to handle production URLs:

```typescript
export const api = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000',
  // ... rest of your code
};
```

### 3. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the following settings:

**Build Settings:**
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Environment Variables:**
```
MONGODB_URI=mongodb+srv://anas:anas7860@quizburst.u40wlws.mongodb.net/
JWT_SECRET=your-super-secure-production-secret-key-change-this
NODE_ENV=production
VITE_API_URL=https://your-app-name.vercel.app
```

#### Option B: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 4. Configure MongoDB Atlas

#### A. Network Access
1. Go to MongoDB Atlas Dashboard
2. Click "Network Access" in the left sidebar
3. Click "Add IP Address"
4. Click "Allow Access from Anywhere" (0.0.0.0/0)
5. Click "Confirm"

#### B. Database User
1. Go to "Database Access" in the left sidebar
2. Ensure your user has "Read and write to any database" permissions
3. If needed, create a new user with proper permissions

### 5. Update CORS Settings

Update your server CORS configuration in `server/index.mjs`:

```javascript
app.use(cors({
  origin: [
    'https://your-app-name.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));
```

### 6. Test Your Deployment

1. Visit your Vercel URL: `https://your-app-name.vercel.app`
2. Test all functionality:
   - User registration/login
   - Quiz creation
   - Quiz joining
   - Live quiz functionality
   - Leaderboard
   - CSV download

### 7. Domain Configuration (Optional)

#### Custom Domain
1. In Vercel Dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

#### Environment Variables for Custom Domain
```
VITE_API_URL=https://your-custom-domain.com
```

## 🔧 Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Update CORS origin in server configuration
   - Ensure API URL matches your domain

2. **MongoDB Connection Issues**
   - Check network access settings
   - Verify connection string
   - Ensure database user has proper permissions

3. **Build Failures**
   - Check Node.js version compatibility
   - Ensure all dependencies are in package.json
   - Check for TypeScript errors

4. **Environment Variables Not Working**
   - Ensure variables are set in Vercel dashboard
   - Check variable names match exactly
   - Redeploy after adding new variables

## 📋 Environment Variables Summary

### Required Variables:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
JWT_SECRET=your-super-secure-secret-key
NODE_ENV=production
VITE_API_URL=https://your-app-name.vercel.app
```

### Optional Variables:
```
VITE_APP_NAME=QuizBurst
VITE_APP_VERSION=1.0.0
```

## 🎯 Post-Deployment Checklist

- [ ] Test user registration/login
- [ ] Test quiz creation
- [ ] Test quiz joining with session codes
- [ ] Test live quiz functionality
- [ ] Test leaderboard updates
- [ ] Test CSV download
- [ ] Test End Quiz button
- [ ] Verify all API endpoints work
- [ ] Check mobile responsiveness
- [ ] Test with multiple participants

## 🔒 Security Considerations

1. **Change JWT Secret**: Use a strong, unique secret key
2. **MongoDB Security**: Use strong passwords and limit network access
3. **Environment Variables**: Never commit sensitive data to Git
4. **CORS**: Only allow necessary origins
5. **Rate Limiting**: Consider adding rate limiting for production

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check MongoDB Atlas logs
3. Test API endpoints individually
4. Verify environment variables are set correctly

Your QuizBurst application should now be live and fully functional! 🎉
