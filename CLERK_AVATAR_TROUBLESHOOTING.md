# Clerk Avatar Upload Troubleshooting Guide

## 🚨 Common Error: `_baseFetch` Error

If you're getting an error like:
```
e@https://trusting-eel-17.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js:7:37925
_baseFetch@https://trusting-eel-17.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js:3:171
```

This is typically a network or authentication issue with Clerk's API.

## 🔍 Debugging Steps

### 1. Check Browser Console
Open your browser's developer tools and look for:
- **Network errors** in the Network tab
- **Authentication errors** in the Console tab
- **File validation errors** in the Console tab

### 2. Verify File Requirements
Ensure your image file meets these criteria:
- **File types**: JPG, PNG, GIF, WebP
- **File size**: Less than 5MB
- **File integrity**: Not corrupted

### 3. Check Authentication Status
```javascript
// In browser console, check if user is authenticated
console.log('User ID:', user?.id)
console.log('User authenticated:', !!user)
```

### 4. Test with Different Files
Try uploading:
- A smaller file (< 1MB)
- A different file format (JPG instead of PNG)
- A file from a different source

## 🛠️ Solutions

### Solution 1: Clear Browser Cache
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
4. Try uploading again

### Solution 2: Check Network Connection
1. Ensure stable internet connection
2. Try disabling VPN if using one
3. Check if Clerk's services are accessible

### Solution 3: Re-authenticate
1. Sign out of the application
2. Clear browser cookies for the domain
3. Sign back in
4. Try uploading again

### Solution 4: Use Different Browser
1. Try uploading in a different browser
2. Check if the issue is browser-specific
3. Update your browser to the latest version

## 🔧 Technical Debugging

### Enable Debug Logging
The profile page now includes debug logging. Check the console for:
```javascript
// File information
console.log('Uploading file to Clerk:', {
  fileName: avatarFile.name,
  fileSize: avatarFile.size,
  fileType: avatarFile.type,
  userId: user.id
})

// Upload status
console.log('Clerk upload successful')
console.error('Clerk upload error:', clerkError)
```

### Check Clerk Configuration
Verify your Clerk configuration in `.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Test Clerk API Directly
You can test Clerk's API directly using curl:
```bash
# Test authentication (replace with your actual keys)
curl -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
     https://api.clerk.com/v1/users/YOUR_USER_ID
```

## 🚀 Alternative Solutions

### Option 1: Use Clerk's Backend API
If frontend upload continues to fail, you can implement backend upload:

```typescript
// Backend API route
export async function POST(request: Request) {
  const { file, userId } = await request.json()
  
  const response = await clerkClient.users.updateUserProfileImage(userId, {
    file: file
  })
  
  return Response.json({ success: true, user: response })
}
```

### Option 2: Implement File Compression
Add client-side image compression before upload:

```typescript
import imageCompression from 'browser-image-compression'

const compressImage = async (file: File) => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1024,
    useWebWorker: true
  }
  
  return await imageCompression(file, options)
}
```

### Option 3: Use Alternative Upload Method
Implement a different upload strategy:

```typescript
// Upload to your own storage first, then update Clerk
const uploadToStorage = async (file: File) => {
  // Upload to your storage (AWS S3, Cloudinary, etc.)
  const imageUrl = await uploadToYourStorage(file)
  
  // Update Clerk with the URL
  await user.update({
    imageUrl: imageUrl
  })
}
```

## 📞 Getting Help

### Check Clerk Status
- Visit [Clerk Status Page](https://status.clerk.com/)
- Check for any ongoing issues

### Contact Support
If the issue persists:
1. **Clerk Support**: [support.clerk.com](https://support.clerk.com/)
2. **GitHub Issues**: Check existing issues in Clerk's repository
3. **Community**: Ask in Clerk's Discord community

### Provide Debug Information
When reporting the issue, include:
- Browser and version
- File type and size
- Console error messages
- Network tab information
- Steps to reproduce

## 🔄 Workaround

If avatar upload continues to fail, users can:
1. **Use a different image** (smaller size, different format)
2. **Try later** (temporary service issue)
3. **Contact support** for manual assistance

## 📋 Checklist

Before reporting an issue, verify:
- [ ] File is under 5MB
- [ ] File is JPG, PNG, GIF, or WebP
- [ ] User is properly authenticated
- [ ] Network connection is stable
- [ ] Browser is up to date
- [ ] No browser extensions are interfering
- [ ] Clerk services are operational 