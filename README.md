# 🍲 Bhandara Setu — Frontend

> **Bridging Hearts Through Food** — Real-Time Community Meal Discovery & Seva Platform.

Bhandara Setu connects people with nearby community meals, langars, temple prasad distributions, and food relief events across India in real-time. Built with Next.js 15, Tailwind CSS, Leaflet, and MapLibre GL.

**Live backend:** [code-53i5.onrender.com](https://code-53i5.onrender.com)

**Live frontend:** [rahulkumar111232192-ux.github.io/bhandara-setu-frontend](https://rahulkumar111232192-ux.github.io/bhandara-setu-frontend/)

The frontend is ready to deploy to Vercel, Render, or another Next.js host. Set `NEXT_PUBLIC_API_URL` to `https://code-53i5.onrender.com` in the host's environment variables before building.

### Render deployment

Deploy this repository as a **Static Site** with these settings:

```text
Build Command:     npm ci && npm run build
Publish Directory: out
```

Leave the Start Command empty. The `output: "export"` setting in `next.config.ts` generates the `out` directory; Render must not be configured to publish `build`. A matching `render.yaml` is included for Blueprint deployments. Set `NEXT_PUBLIC_API_URL` to `https://code-53i5.onrender.com` in the Render environment variables.

GitHub Pages deployment is configured through GitHub Actions and runs automatically on pushes to `main`. Enable **Settings > Pages > Source: GitHub Actions** in the repository settings.

---

## ✨ Features

- **🗺️ Interactive Geospatial Map**: Real-time Leaflet & vector basemap displaying live community meal locations with category-coded pins and live/ended visual states.
- **⚡ Real-Time Live Feed**: Server-Sent Events (SSE) stream automatically updates listings, voting counts, and comments with zero refresh required.
- **📍 Community Proximity Verification**: GPS-enforced verification allowing people within 300m to confirm availability or report ended/fake meals.
- **💬 Community Discussion Trees**: Threaded, nested comments allowing volunteers and organizers to coordinate logistics and food updates.
- **🔔 Live & Offline Notifications**: Location-aware browser alerts and Service Worker notifications when food is served near your neighborhood.
- **🎨 Cultural & Accessible UI**: Responsive dark/light theme designed with warm saffron branding, regional dice ticker, and Devanagari typography support.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Mapping**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/) + [MapLibre GL](https://maplibre.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Service Worker**: PWA-ready background notification handler

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ (Node 20+ or 22+ recommended)
- npm, yarn, or pnpm

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/bhandara-setu-frontend.git
cd bhandara-setu-frontend
npm install
```

### 3. Environment Variables
Create a `.env.local` file by copying the example:

```bash
cp .env.example .env.local
```

Configure the backend API URL:
```env
# Backend API URL (Express server)
NEXT_PUBLIC_API_URL=http://localhost:5000

# Optional custom basemap key (CARTO)
NEXT_PUBLIC_CARTO_KEY=your_carto_key
```

For a production deployment, use:
```env
NEXT_PUBLIC_API_URL=https://code-53i5.onrender.com
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```text
frontend/
├── app/                  # Next.js 15 App Router pages & layouts
│   ├── layout.tsx        # Root HTML layout with Google Fonts
│   ├── page.tsx          # Main map view, live feed & drawer
│   ├── login/            # Authentication sign-in
│   ├── signup/           # User registration
│   ├── profile/          # Seva dashboard & user posts
│   └── submit/           # Meal submission & edit form
├── components/           # Reusable UI components
│   ├── LeafletMap.tsx    # Interactive map with dynamic markers
│   ├── FeedPanel.tsx     # Sliding feed panel for desktop & mobile
│   ├── FeedCard.tsx      # Meal card with distance & live indicators
│   ├── PostDetail.tsx    # Comprehensive post sheet with verification
│   ├── CommentSection.tsx# Threaded comment hierarchy
│   ├── MapToolbar.tsx    # Filter, locate, and navigation controls
│   └── RotatingDiceTitle.tsx # Rotating regional multi-lingual title
├── hooks/                # Custom React hooks
│   ├── use-live-posts.ts # SSE stream listener for real-time posts
│   └── use-auth.tsx      # Auth context & session management
├── lib/                  # Utilities, types & icons
│   ├── map-icons.ts      # Custom SVG pin icons & states
│   ├── types.ts          # Core TypeScript data schemas
│   └── utils.ts          # Tailwind CSS merge utilities
└── public/               # Static assets & Service Worker
    └── sw.js             # Background notification receiver
```

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
