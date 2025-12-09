# 1v1 Gaming Match Tracker

This is a web application for tracking 1v1 gaming matches. It allows players to record their match results, view a leaderboard, and see their own stats.

## Features

*   **Match Tracking:** Record the results of 1v1 matches.
*   **Leaderboard:** View a leaderboard of all players.
*   **Player Profiles:** View individual player profiles with their match history and stats.
*   **PWA Support:** The application can be installed as a Progressive Web App (PWA) for a native-like experience.
*   **Dark Mode:** The application supports a dark mode theme.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js (v18 or newer)
*   pnpm (v8 or newer)

### Installation

1.  Clone the repo
    \`\`\`sh
    git clone https://github.com/your-username/your-repo-name.git
    \`\`\`
2.  Install PNPM packages
    \`\`\`sh
    pnpm install
    \`\`\`
3.  Create a `.env.local` file in the root of the project and add your Supabase credentials:
    \`\`\`
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    \`\`\`

### Running the application

\`\`\`sh
pnpm run dev
\`\`\`

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Backend:** [Supabase](https://supabase.io/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **UI:** [Radix UI](https://www.radix-ui.com/) and [shadcn/ui](https://ui.shadcn.com/)
*   **PWA:** [next-pwa](https://www.npmjs.com/package/next-pwa)
*   **Package Manager:** [pnpm](https://pnpm.io/)
