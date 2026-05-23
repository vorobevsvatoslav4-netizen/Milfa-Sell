# TeleVault - Minimalist Telegram Account Marketplace

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fvorobevsvatoslav4-netizen%2FMilfa-Sell)

TeleVault is a premium, minimalist marketplace specifically designed for the secure acquisition of Telegram accounts. Built with a focus on "Zero Friction," it provides a sleek, distraction-free environment for users to browse, fund, and purchase verified Telegram sessions with instant delivery.

## 🚀 Key Features

- **Ultra-Minimalist UI**: A "Zen" design philosophy using Slate and Telegram Blue palettes for maximum focus.
- **Secure Auth**: Seamless email-based registration and login system.
- **Crypto Bot Integration**: Integrated balance funding via Telegram @CryptoBot for instant, secure transactions.
- **Automated Delivery**: Immediate access to login credentials and session data upon successful purchase.
- **Real-time Consistency**: Powered by Cloudflare Durable Objects to ensure atomic transactions and accurate inventory management.
- **Responsive Perfection**: Flawless experience across mobile, tablet, and desktop devices.

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Routing**: React Router 6
- **State Management**: Zustand, TanStack Query (React Query)
- **Styling & Components**: Radix UI, Shadcn UI, Framer Motion, Lucide React
- **Backend**: Cloudflare Workers, Hono
- **Persistence**: Cloudflare Durable Objects (Stateful Storage)

## 📦 Getting Started

### Prerequisites

You will need [Bun](https://bun.sh/) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd televault-market
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun run dev
   ```

## 💻 Development

The project follows a modular architecture:

- `src/`: React frontend components and logic.
- `worker/`: Hono-based Cloudflare Worker with Durable Object entities.
- `shared/`: TypeScript types and mock data shared between frontend and backend.

### Project Structure

- `src/pages/`: Application views (Landing, Auth, Dashboard, Store).
- `src/components/ui/`: Reusable Shadcn UI components.
- `worker/entities.ts`: Business logic and data schemas for Users and Accounts.
- `worker/user-routes.ts`: API endpoint definitions.

## 🚀 Deployment

This project is optimized for Cloudflare Workers and can be deployed instantly using the Aurelia deployment pipeline.

Important: deploy this repository as a Cloudflare Worker, not as a Pages-only static site. The Worker entrypoint in `worker/index.ts` serves `/api/*` routes and falls back to the built Vite assets from `dist`.

### Manual Deployment

To deploy your application manually to Cloudflare:

```bash
bun run deploy
```

The deploy command builds the frontend first, then runs `wrangler deploy`. After deployment, verify the API with:

```bash
curl https://milfasell.online/api/health
```

Before production deploy, set Worker secrets:

```bash
wrangler secret put ADMIN_PASSWORD
wrangler secret put CRYPTO_PAY_TOKEN
```

Optional Telegram bridge secrets:

```bash
wrangler secret put TELEGRAM_CODE_BRIDGE_URL
wrangler secret put TELEGRAM_CODE_BRIDGE_TOKEN
```

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fvorobevsvatoslav4-netizen%2FMilfa-Sell)

## 📝 License

This project is part of the Aurelia mission-critical infrastructure suite. All rights reserved.
