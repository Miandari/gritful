# Gritful - TODO

## PWA & Notifications Roadmap

### Phase 1: Core PWA -- DONE
- [x] Web app manifest with icons, screenshots, standalone display
- [x] Service worker (runtime caching, offline fallback, RSC-aware)
- [x] Error boundaries (error.tsx, global-error.tsx, ChunkLoadError handling)
- [x] Install prompt (iOS instructions, Chromium native install, two-tier dismiss)
- [x] Apple PWA meta tags, viewport, safe-area-inset CSS
- [x] Icon generation scripts (sharp)
- [x] useServerAction hook for offline-aware Server Action calls

### Phase 2: Push Notification Infrastructure -- DONE
- [x] VAPID key generation
- [x] push_subscriptions table + RLS + moddatetime trigger
- [x] Edge Function (web-push for encrypted delivery, 410 cleanup)
- [x] API route for subscription upsert/delete
- [x] PushNotificationManager toggle in profile settings
- [x] SW push/notificationclick/pushsubscriptionchange handlers
- [x] IndexedDB fallback for subscription sync when auth expired
- [x] Push cleanup on logout
- [x] End-to-end push delivery tested and working

### Phase 3: Notification Center Redesign -- IN PROGRESS
- [x] **3a: Database schema updates** (code done, migration needs to be applied via Dashboard)
  - Expanded notification types (milestone, leaderboard, participant_joined, system)
  - Added `category` column (personal / social / leaderboard / system)
  - Added per-category push toggles to user_preferences
  - Added email preference columns (schema-ready, not wired)
  - Added reminder_time + reminder_timezone columns
  - pg_cron job to auto-delete read social/leaderboard notifications > 90 days

- [x] **3b: Decoupled notification persistence from push delivery**
  - Created `lib/notifications/send.ts` with `maybeSendPush()` helper
  - Checks user preferences before sending, uses `after()` for serverless safety
  - Edge Function stays push-only, no persistence logic
  - Ephemeral reminders skip INSERT entirely

- [x] **3c: Redesigned /notifications page**
  - Chronological feed with cursor-based pagination
  - Filter chips: All / Personal / Social / Leaderboard
  - Realtime subscription (filter-aware, no category bleed)
  - Unread indicator (dot or bold)
  - "Mark all as read" button (already exists)
  - Relative timestamps ("2h ago")
  - Action buttons per notification type (View Challenge, Approve/Reject)
  - Empty state
  - Start WITHOUT notification grouping (implement simple 1:1 first)

- [x] **3d: Notification settings UI**
  - Per-category push toggles (Reminders, Milestones, Challenge Activity, Leaderboard)
  - Reminder time picker with timezone display
  - TimezoneSync component for automatic browser timezone detection
  - Email section kept with existing toggles

- [ ] **3e: Notification grouping (LATER)**
  - Only after simple version is working
  - Read-time aggregation preferred (query + group) over write-time merge
  - "3 people joined your challenge" style grouping

### Phase 4: Automated Triggers
- [x] **4a: Daily reminders** (migration needs to be applied via Dashboard)
  - `user_has_pending_tasks()` function checks all frequencies (daily/weekly/monthly/onetime)
  - pg_cron job runs every 15 minutes, checks reminder_time in user's timezone
  - Only fires if user has push_reminders enabled, has subscriptions, and has pending tasks
  - Push only (ephemeral, not stored in notifications table)
  - Requires: `ALTER DATABASE postgres SET app.settings.service_role_key` and `app.settings.supabase_url`

- [ ] **4b: Milestone notifications**
  - Streak milestones (7, 14, 30, 60, 100 days)
  - Points milestones
  - Triggered by entry submission (server action or database trigger)
  - Persist in notifications table + send push

- [ ] **4c: Leaderboard notifications (future)**
  - Someone overtook you
  - Weekly ranking summary
  - Triggered by points recalculation

### Phase 5: Future
- [ ] Email notification pipeline (per-category, templates, unsubscribe)
- [ ] Quiet hours
- [ ] Per-challenge notification overrides
- [ ] Apple splash screens for iOS (generator script)
- [ ] Replace placeholder PWA screenshots with real app screenshots

---

## Other Pending Work (from CLAUDE.md)
- [ ] Investigate participant_details view -- adopt or drop
- [ ] Fix Supabase schema cache issue (foreign key joins)
- [ ] Run temp_add_threshold_type.sql migration
- [ ] Mobile testing (iOS Add to Home Screen, Android install + push)
