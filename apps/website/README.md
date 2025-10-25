# SavvyAIHelper Official Website

A modern, professional website for SavvyAIHelper - an AI-powered credit card optimization platform.

## Features

- 🌐 **Multi-language Support** - English and Chinese (Traditional)
- 🌙 **Dark/Light Theme** - Toggle between themes
- 📱 **Responsive Design** - Mobile-first approach
- 🎨 **Modern UI/UX** - Professional and innovative design
- 📧 **Contact Form** - Email integration for inquiries
- ⚡ **Fast Performance** - Optimized with Next.js 15

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **Email**: Nodemailer
- **State Management**: Zustand
- **Internationalization**: i18next

## Getting Started

1. **Install Dependencies**
   ```bash
   cd apps/website
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp env.example .env.local
   ```
   
   Configure your email settings in `.env.local`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   CONTACT_EMAIL=contact@savvyaihelper.com
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open in Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── Header.tsx      # Navigation header
│   ├── Hero.tsx        # Hero section
│   ├── Features.tsx    # Features section
│   ├── About.tsx       # About section
│   ├── ContactForm.tsx # Contact form
│   ├── Footer.tsx      # Footer
│   ├── ThemeToggle.tsx # Theme switcher
│   └── LanguageToggle.tsx # Language switcher
├── lib/                # Utilities
│   └── i18n.ts         # Internationalization setup
├── locales/            # Translation files
│   ├── en.json         # English translations
│   └── zh.json         # Chinese translations
└── store/              # State management
    ├── theme.ts        # Theme store
    └── language.ts     # Language store
```

## Customization

### Adding New Languages
1. Create a new translation file in `src/locales/`
2. Update the language store in `src/store/language.ts`
3. Add the language option to the toggle component

### Styling
- Modify `tailwind.config.js` for theme customization
- Update `src/app/globals.css` for global styles
- Component-specific styles are in individual component files

### Content
- Update translation files in `src/locales/` for text content
- Modify component files for structural changes

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
The website can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- DigitalOcean App Platform
- Railway

## Email Configuration

For the contact form to work, configure your email service:

### Gmail Setup
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `SMTP_PASS`

### Other Email Services
Update the SMTP configuration in `src/app/api/contact/route.ts` for your email provider.

## License

© 2024 SavvyAIHelper. All rights reserved.
