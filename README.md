# CapiTalk 🪙

**The anonymous, real-time campus chat built exclusively for Capitol University students.**

Connect with fellow CU students across departments — instantly and anonymously. Whether you want to meet someone from Engineering, Nursing, Business Admin, or Computer Studies, CapiTalk pairs you with a random student for a live one-on-one conversation.

---

## What is CapiTalk?

CapiTalk is a school-exclusive random chat platform inspired by the concept of Omegle, but purpose-built for the Capitol University student community. No real names, no student IDs — just your chosen username, your department, and a conversation waiting to happen.

### Key Features

- 🔀 **Random Matchmaking** — Get paired instantly with another CU student via a real-time WebSocket server
- 🏫 **Department Filtering** — Match with students from the same department, a different one, or anyone at all
- 💬 **Live Chat** — Real-time messaging with typing indicators, emoji reactions, image sharing, and reply threads
- 🖼️ **Image Compression Pipeline** — Images are compressed client-side to lightweight WebP before sending
- 🔒 **Privacy-First** — No real names or student IDs are ever shared. Chats are ephemeral by design
- 🚩 **Safety & Moderation** — Built-in profanity filter, report system, user blocking, and an admin dashboard
- 🟢 **Live Online Count** — See how many CU students are currently connected in real time
- 📵 **Disconnect Indicator** — Instantly notified when your chat partner leaves or disconnects
- 📱 **Mobile Friendly** — Fully responsive UI optimized for phones and tablets
- 💾 **Session Persistence** — Chat state survives page refreshes thanks to localStorage persistence

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + custom Gumroad design system |
| Real-time | Node.js WebSocket server (`ws`) |
| State | Zustand with localStorage persistence |
| UI Components | Lucide React, Framer Motion |
| Fonts | Inter (Google Fonts) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/your-username/capitalk.git
cd capitalk
npm install
```

### Environment Variables

Create a `.env.local` file in the project root. Supabase is **optional** — the app works fully offline with the local WebSocket server:

```env
# Optional: Supabase Realtime (for cloud deployments)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Running Locally

```bash
npm run dev
```

This starts **both** servers concurrently:
- **Next.js** on `http://localhost:3000`
- **WebSocket matchmaking server** on `ws://localhost:4000`

Open `http://localhost:3000` in two different browser windows (e.g. Chrome + Brave) and start chatting between them.

---

## Project Structure

```
capitalk/
├── app/
│   ├── page.tsx          # Main view router (landing, queue, chat, admin)
│   ├── layout.tsx        # Root layout with SEO metadata
│   └── globals.css       # Gumroad design system tokens & utilities
├── components/
│   ├── Navbar.tsx         # Top navigation with live online count
│   ├── RegistrationModal.tsx  # Profile setup (username, department, avatar)
│   ├── MatchmakingScreen.tsx  # Queue UI with filter tabs
│   ├── ChatRoom.tsx       # Full chat interface with disconnect indicator
│   ├── AdminDashboard.tsx # Moderation panel (reports, bans)
│   └── CoinMascot.tsx     # Animated CapiTalk coin mascot
├── lib/
│   ├── realtime/
│   │   ├── matchmakingEngine.ts  # WebSocket queue & match client
│   │   └── roomManager.ts        # WebSocket chat relay client
│   ├── store/
│   │   └── useChatStore.ts       # Zustand global state + localStorage
│   ├── hooks/
│   │   └── useOnlineCount.ts     # Live online count hook
│   └── utils/
│       ├── imagePipeline.ts      # Client-side WebP image compression
│       └── safety.ts             # Profanity filter & username validation
└── server/
    └── ws-server.js       # Node.js WebSocket matchmaking & chat relay server
```

---

## How Matchmaking Works

1. User registers with a **username** and **department**
2. User clicks **Start Searching** → joins the WebSocket queue on port 4000
3. Server scans the queue for a compatible partner based on the selected filter
4. When a match is found, both clients receive the same **room ID** and transition to the chat view
5. All messages are relayed through the WebSocket server in real time
6. If either user disconnects, the other sees a **disconnection indicator** immediately

---

## Design System

CapiTalk uses a custom Gumroad-inspired aesthetic:

| Token | Value |
|---|---|
| Canvas Cream | `#f4f4f0` |
| Paper White | `#ffffff` |
| Ink Black | `#000000` |
| Coin Pink | `#ff90e8` |
| Highlight Yellow | `#ffc900` |
| Vermillion | `#dc341e` |

---

## Credentials to Keep Secret

When deploying, **never commit** these to version control:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Add `.env.local` to your `.gitignore` (already included by default in Next.js projects).

---

## License

Built for Capitol University students. Not affiliated with or endorsed by Capitol University administration.
