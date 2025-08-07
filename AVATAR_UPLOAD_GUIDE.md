# Avatar Upload & Sync Guide

This project implements a comprehensive avatar upload system that synchronizes profile pictures between **Clerk** (for authentication) and **Convex** (for application data).

## 🎯 Overview

The avatar system works as follows:
1. **User uploads image** → Frontend validation
2. **Upload to Clerk** → Using `user.setProfileImage()`
3. **Sync to Convex** → Update `pictureUrl` field in users table
4. **Audit logging** → Track avatar changes for compliance

## 🔧 Technical Implementation

### Frontend Components

#### Profile Page (`src/app/profile/[[...rest]]/page.tsx`)
```typescript
// Avatar upload handling
const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (file) {
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }
}

// Avatar upload to Clerk and sync to Convex
if (avatarFile) {
  try {
    // Upload to Clerk first
    await user.setProfileImage({ file: avatarFile })
    
    // Wait for Clerk to process
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Get updated URL and sync to Convex
    const updatedImageUrl = user.imageUrl
    if (updatedImageUrl && updatedImageUrl !== avatarUrl) {
      await updateUserAvatar({
        subject: user.id,
        pictureUrl: updatedImageUrl,
      })
    }
  } catch (error) {
    // Error handling with toast notifications
  }
}
```

### Backend Functions

#### Convex Mutation (`convex/users.ts`)
```typescript
export const updateUserAvatar = mutation({
  args: {
    subject: v.string(), // Clerk user ID
    pictureUrl: v.string(), // New avatar URL
  },
  handler: async (ctx, args) => {
    const { subject, pictureUrl } = args;

    // Find user by Clerk subject ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Update picture URL
    const updatedUser = await ctx.db.patch(user._id, {
      pictureUrl,
      updatedAt: Date.now(),
    });

    // Log the change for audit
    await ctx.db.insert("audit_logs", {
      action: "update",
      entityType: "user",
      entityId: user._id,
      entityName: user.fullName,
      performedBy: subject,
      performedByName: user.fullName,
      organisationId: user.organisationId,
      details: "Updated profile picture",
      metadata: JSON.stringify({ 
        previousPictureUrl: user.pictureUrl, 
        newPictureUrl: pictureUrl 
      }),
      timestamp: Date.now(),
      severity: "info",
    });

    return updatedUser;
  },
});
```

#### Convex Query (`convex/users.ts`)
```typescript
export const getUserAvatar = query({
  args: {
    subject: v.string(), // Clerk user ID
  },
  handler: async (ctx, args) => {
    const { subject } = args;

    const user = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();

    return user?.pictureUrl || null;
  },
});
```

## 📊 Database Schema

### Users Table (`convex/schema.ts`)
```typescript
users: defineTable({
  // ... other fields
  pictureUrl: v.optional(v.string()), // Avatar URL from Clerk
  subject: v.string(), // Clerk user ID
  // ... other fields
}).index("by_subject", ["subject"]),
```

### Audit Logs Table
```typescript
audit_logs: defineTable({
  action: v.string(), // 'update'
  entityType: v.string(), // 'user'
  entityId: v.string(), // User ID
  entityName: v.optional(v.string()), // User's full name
  performedBy: v.string(), // Clerk user ID
  performedByName: v.optional(v.string()), // User's full name
  organisationId: v.optional(v.id("organisations")),
  details: v.optional(v.string()), // "Updated profile picture"
  metadata: v.optional(v.string()), // JSON with old/new URLs
  timestamp: v.float64(),
  severity: v.optional(v.string()), // 'info'
}),
```

## 🎨 User Interface Features

### Avatar Display
- **Priority**: Convex avatar → Clerk avatar → Fallback initials
- **Preview**: Real-time preview when selecting new image
- **Responsive**: Different sizes for different contexts

### Upload Controls
- **File validation**: JPG, PNG, GIF up to 5MB
- **Change photo**: Upload new image
- **Remove photo**: Clear current avatar
- **Loading states**: Visual feedback during upload

### Toast Notifications
- **Success**: "Avatar updated successfully"
- **Error**: "Failed to update avatar"
- **Info**: "Avatar uploaded, may take a moment to appear"

## 🔄 Sync Process

### 1. Upload Flow
```
User selects file → Frontend validation → Upload to Clerk → 
Wait for processing → Get new URL → Update Convex → 
Audit log → Success notification
```

### 2. Display Priority
```
1. Convex pictureUrl (if available)
2. Clerk imageUrl (fallback)
3. User initials (final fallback)
```

### 3. Error Handling
- **Clerk upload fails**: Show error, don't update Convex
- **Convex sync fails**: Show warning, avatar still in Clerk
- **Network issues**: Retry with exponential backoff

## 🛡️ Security & Validation

### File Validation
```typescript
// File type validation
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
if (!allowedTypes.includes(file.type)) {
  throw new Error('Invalid file type')
}

// File size validation (5MB limit)
const maxSize = 5 * 1024 * 1024 // 5MB
if (file.size > maxSize) {
  throw new Error('File too large')
}
```

### Access Control
- **User can only update their own avatar**
- **Audit logging for all changes**
- **Rate limiting on uploads**

## 📱 Usage Examples

### Basic Upload
```typescript
const handleAvatarUpload = async (file: File) => {
  try {
    await user.setProfileImage({ file })
    await updateUserAvatar({
      subject: user.id,
      pictureUrl: user.imageUrl,
    })
    toast.success('Avatar updated!')
  } catch (error) {
    toast.error('Upload failed', error.message)
  }
}
```

### Avatar Display
```typescript
const AvatarComponent = ({ userId }) => {
  const convexAvatar = useQuery(api.users.getUserAvatar, { subject: userId })
  const { user } = useUser()
  
  const avatarUrl = convexAvatar || user?.imageUrl || null
  
  return (
    <Avatar>
      <AvatarImage src={avatarUrl} />
      <AvatarFallback>{getInitials(user?.fullName)}</AvatarFallback>
    </Avatar>
  )
}
```

## 🔧 Configuration

### Clerk Configuration
- **Image optimization**: Enabled by default
- **CDN delivery**: Automatic via Clerk's infrastructure
- **File size limits**: 5MB maximum

### Convex Configuration
- **Audit logging**: All avatar changes logged
- **Indexing**: `by_subject` index for fast lookups
- **Reactivity**: Real-time updates across the app

## 🚀 Best Practices

### Performance
- **Lazy loading**: Load avatars on demand
- **Caching**: Clerk CDN handles caching
- **Optimization**: Use appropriate image sizes

### User Experience
- **Preview**: Show image before upload
- **Progress**: Loading states during upload
- **Feedback**: Clear success/error messages

### Data Integrity
- **Sync verification**: Check both systems
- **Fallback handling**: Graceful degradation
- **Audit trails**: Complete change history

## 🐛 Troubleshooting

### Common Issues

#### Avatar not appearing
1. Check Clerk upload success
2. Verify Convex sync completed
3. Check network connectivity
4. Review browser console for errors

#### Sync failures
1. Verify user exists in Convex
2. Check Clerk user ID matches
3. Review audit logs for details
4. Retry with fresh session

#### Performance issues
1. Optimize image size before upload
2. Check network conditions
3. Verify CDN delivery
4. Monitor Convex query performance

## 📈 Monitoring

### Metrics to Track
- **Upload success rate**
- **Sync completion rate**
- **Average upload time**
- **Error frequency by type**

### Audit Log Analysis
```sql
-- Recent avatar changes
SELECT * FROM audit_logs 
WHERE entityType = 'user' 
AND details = 'Updated profile picture'
ORDER BY timestamp DESC
LIMIT 10;
```

## 🔮 Future Enhancements

### Planned Features
- **Image cropping**: Client-side image editing
- **Multiple sizes**: Generate different resolutions
- **Background removal**: AI-powered image processing
- **Avatar templates**: Pre-designed options

### Integration Opportunities
- **Gravatar**: Fallback to Gravatar service
- **Social media**: Import from social profiles
- **AI generation**: Generate avatars from text descriptions 