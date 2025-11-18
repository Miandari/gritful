# Custom Action URLs in Email Templates

## Overview
Email templates now support custom action URLs, allowing you to direct users to specific pages based on the email content.

## Default Behavior
If no custom `action_url` is provided, emails will link to:
- **Challenge Updates**: `/challenges/{challenge_id}` (challenge detail page)

## How to Use Custom URLs

### In sendChallengeUpdate Action

To send users to a specific page (like an updates page), add `action_url` to the template_data:

```typescript
const queueEntries = usersWithEmail.map((user) => ({
  user_id: user.user_id,
  email_type: 'challenge_update' as const,
  recipient_email: user.email,
  subject: subject,
  template_name: 'challenge_update',
  template_data: {
    username: user.username || user.full_name || 'there',
    sender_name: senderName,
    challenge_name: challenge.name,
    message: message,
    challenge_id: challengeId,
    // Optional: Custom URL for the email button
    action_url: `https://www.gritful.app/challenges/${challengeId}/updates`,
  },
  scheduled_for: new Date().toISOString(),
}))
```

### URL Configuration

The base APP_URL is configured in Supabase secrets:
```bash
# Set production URL (CRITICAL: Must use www.gritful.app)
supabase secrets set APP_URL=https://www.gritful.app

# Or for local development
# APP_URL is set in .env.local to http://localhost:3000
```

## Example Use Cases

### 1. Direct to Updates Page
```typescript
action_url: `${APP_URL}/challenges/${challengeId}/updates`
```

### 2. Direct to Progress Page
```typescript
action_url: `${APP_URL}/challenges/${challengeId}/progress`
```

### 3. Direct to Specific Entry
```typescript
action_url: `${APP_URL}/challenges/${challengeId}/entries/${entryDate}`
```

### 4. Direct to Dashboard with Context
```typescript
action_url: `${APP_URL}/dashboard?highlight=${challengeId}`
```

## Template Support

Currently supported templates with custom URLs:
- ✅ `challenge_update` - Accepts `action_url`
- 🔜 `daily_reminder` - Could support custom URLs per challenge
- 🔜 `weekly_summary` - Could link to specific stats pages
- 🔜 `join_request` - Could link to approval page

## Future Enhancements

1. **Dynamic Button Text**
   - Allow customizing button text based on action
   - Example: "View Update", "See Progress", "Log Today"

2. **Multiple Action Buttons**
   - Support primary and secondary CTAs
   - Example: "View Challenge" + "Log Progress"

3. **Tracking Parameters**
   - Add UTM parameters for analytics
   - Track email click-through rates

## Notes
- Always use absolute URLs (include full domain)
- Test URLs before sending to large groups
- Unsubscribe URLs are automatically generated and don't need customization
