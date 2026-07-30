# CapiTalk
### *Connect Beyond Your Department.*

## Overview

**CapiTalk** is a school-exclusive random chat platform inspired by Omegle, designed specifically for **Capitol University** students.

Unlike traditional anonymous chat applications, users create a custom username and select their department while keeping their real identity private.

The goal is to encourage interaction between students from different colleges, help build new friendships, and strengthen the campus community through safe, real-time conversations.

---

# Objectives

Build a modern web application that is:

- Fast
- Responsive
- Secure
- Mobile-friendly
- Real-time
- Privacy-focused
- Scalable

The application should feel comparable to Discord, Telegram, and modern social platforms.

---

# Target Users

Only Capitol University students.

Each user creates:

- Username
- Department
- Optional avatar

No real names, student IDs, or emails should ever appear inside conversations.

---

# Branding

## Application Name

**CapiTalk**

## Tagline

> Connect Beyond Your Department.

Alternative taglines:

- One Campus. Endless Conversations.
- Meet Someone New.
- Your Next Campus Conversation Starts Here.
- Random Chats. Real Campus Connections.

---

# Tech Stack

## Frontend

- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- Shadcn/UI
- Framer Motion
- React Hook Form

## Backend

- Supabase
- PostgreSQL
- Supabase Realtime
- Supabase Storage

## Image Processing

- Sharp
- Browser-side compression
- Automatic WebP conversion

## Deployment

- Vercel
- Supabase

---

# Authentication

Since CapiTalk is exclusive to Capitol University, only verified students may register.

Possible verification methods:

- Capitol University Email
- Invitation Code
- Admin-generated Registration Code

Once verified, students only interact using their chosen username.

---

# User Registration

Required Information

- Username
- Department
- Accept Community Guidelines

Optional

- Avatar
- Bio (maximum 80 characters)

---

# Username Rules

- Unique
- 3–20 characters
- Letters
- Numbers
- Underscores
- No offensive words
- No impersonation

Examples

- sleepycoder
- pixelwizard
- dev_july
- coffeelover

---

# Departments

Users choose their department during registration.

Example Departments

- College of Computer Studies
- College of Engineering
- College of Nursing
- College of Business Administration
- College of Education
- College of Criminal Justice
- College of Arts and Sciences
- College of Hospitality Management
- Senior High School
- Others

Display inside chat

```
PixelWizard
College of Computer Studies
```

---

# User Profile

Contains only

- Username
- Department
- Avatar
- Status

Status values

- Online
- Searching
- In Chat
- Offline

---

# Matchmaking

The primary feature.

Pressing **Start Chatting** places the user into the matchmaking queue.

The server should:

- Find another available student
- Create a private chat room
- Connect both users instantly

Display

```
Connected!

You are chatting with:

Username
Department
```

---

# Matchmaking Filters

Support:

- Anyone
- Same Department
- Different Department

Future filters

- Interests
- Year Level
- Organizations
- Clubs

---

# Chat Features

Support

- Text
- Emojis
- Images

Future

- Voice Messages
- GIFs
- Stickers
- Video Calls

---

# Image Upload

Accepted

- JPG
- JPEG
- PNG
- WEBP

Maximum Size

10 MB

Processing Pipeline

1. Validate upload
2. Compress image
3. Resize if needed
4. Remove metadata
5. Convert to WebP
6. Generate thumbnail
7. Upload to Supabase Storage
8. Store only optimized WebP versions

Recommended Settings

- Max Width: 1600px
- Thumbnail: 320px
- Quality: 80–85%
- Lazy Loading
- CDN Caching

---

# Real-time Features

- Instant Messaging
- Typing Indicator
- Online Status
- Read Receipts (optional)
- Delivered Status
- Live Connection Status

---

# Skip Feature

Users may press **Next** anytime.

Behavior

- End current chat
- Notify partner

```
Your partner has left the conversation.
```

- Automatically search again

---

# Queue States

- Idle
- Searching
- Matched
- Disconnected

Inactive users should automatically leave the queue.

---

# Session Recovery

If the browser refreshes

- Restore session
- Reconnect if possible
- Restore draft message (optional)

---

# Safety

Community Guidelines prohibit

- Harassment
- Spam
- Hate Speech
- NSFW Content
- Bullying
- Impersonation

---

# Reporting

Every conversation includes **Report User**.

Reasons

- Spam
- Harassment
- Inappropriate Images
- Offensive Language
- Fake Identity
- Others

Reports are visible inside the Admin Dashboard.

---

# Blocking

Users may block another user.

Blocked users should never be matched together again.

---

# Anti-Abuse

Implement

- Rate Limiting
- Flood Protection
- Profanity Filter
- Duplicate Message Detection
- Spam Detection
- Cooldown after excessive "Next"
- CAPTCHA for suspicious behavior

---

# Optional AI Moderation

Automatically detect

- Explicit Images
- Violence
- Hate Speech
- Threats
- Self-Harm

Flag content for administrator review.

---

# Admin Dashboard

Statistics

- Total Users
- Online Users
- Searching Users
- Active Chats
- Reports
- Banned Users
- Peak Usage
- Most Active Departments

Management

- Users
- Reports
- Bans
- Announcements
- Departments

---

# Database Schema

## Users

- id
- username
- avatar_url
- department_id
- bio
- status
- created_at

## Departments

- id
- name

## Queue

- id
- user_id
- searching_since

## ChatRooms

- id
- user_one
- user_two
- started_at
- ended_at

## Messages

- id
- room_id
- sender_id
- message
- image_url
- created_at

## Reports

- id
- reporter_id
- reported_user_id
- reason
- description
- created_at

## Blocks

- blocker_id
- blocked_id

---

# UI Pages

## Landing Page

- Hero
- Features
- FAQ
- Community Guidelines
- Start Chatting Button

---

## Registration

- Username
- Department
- Avatar Upload
- Community Guidelines

---

## Matchmaking Screen

Animated searching indicator.

Examples

```
Looking for another CapiTalk user...

Connecting students...

Finding someone from another department...
```

Include

- Estimated wait
- Cancel button
- Helpful tips

---

## Chat Screen

Top Bar

- Username
- Department
- Online Indicator
- Report
- Next

Middle

- Messages
- Images
- Timestamps

Bottom

- Textbox
- Emoji Picker
- Upload Image
- Send Button

---

## Empty State

```
No students are online right now.

Stay awhile—we'll connect you as soon as someone joins!
```

---

# Animations

Use Framer Motion.

Include

- Page transitions
- Typing dots
- Searching pulse
- Message fade-in
- Connected animation
- Skeleton loaders
- Toast notifications

---

# Mobile Responsiveness

Support

- Desktop
- Tablet
- Mobile

Requirements

- Touch-friendly
- Responsive Layout
- Optional swipe gestures

---

# Performance Optimization

- Browser image compression
- Automatic WebP conversion
- Lazy loading
- Infinite scrolling
- Virtualized message list
- Dynamic imports
- Optimistic UI
- Debounced typing events
- CDN caching
- Route prefetching
- Efficient Supabase subscriptions

---

# Security

- XSS Protection
- SQL Injection Prevention
- CSRF Protection
- Secure Sessions
- Input Sanitization
- File Validation
- Duplicate Username Prevention
- Server-side Validation

---

# User Experience

Include

- Emoji reactions
- Reply to message
- Copy message
- Desktop notifications
- Notification sounds
- Connection quality indicator
- Auto reconnect
- Dark Mode
- Light Mode

---

# Future Features

- Friend Requests
- Favorite Users
- Group Chat
- Voice Chat
- Video Chat
- Study Buddy Matching
- Campus Event Rooms
- Student Organization Channels
- Anonymous Confession Room
- AI Conversation Starters
- Mini Games While Waiting

---

# Advanced Optimization

## Smart Matchmaking

Prioritize pairing students from different departments while maintaining randomness.

If wait time exceeds 30 seconds, gradually relax matching filters.

---

## Presence System

Use **Supabase Realtime Presence** instead of polling to monitor:

- Online users
- Queue status
- Active chats

---

## Ephemeral Chats

Delete chat rooms and messages automatically after both users disconnect (or after a configurable period such as 24 hours) to improve privacy and reduce storage.

---

## Image Pipeline

Store only:

- Optimized WebP images
- Thumbnails
- Lazy-loaded full-resolution images

---

## Scalability

Separate:

- Matchmaking Service
- Messaging Service
- Storage Service

Design for thousands of concurrent users.

---

## Overall Goal

Develop **CapiTalk** into a polished, secure, and scalable random chat platform exclusively for Capitol University students.

The application should promote meaningful interactions beyond departmental boundaries while prioritizing privacy, performance, moderation, and an excellent user experience.