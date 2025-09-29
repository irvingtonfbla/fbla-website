# FBLA Chapter Website

A modern, responsive website for our FBLA chapter built with Astro and integrated with Decap CMS for easy content management.

## 🚀 Features

- **Modern Design**: Clean, professional layout inspired by successful FBLA chapters
- **Responsive**: Optimized for desktop, tablet, and mobile devices
- **Content Management**: Easy-to-use CMS for non-technical users
- **Fast Performance**: Built with Astro for optimal loading speeds
- **SEO Optimized**: Meta tags and structured data for better search visibility
- **Accessibility**: WCAG compliant design for all users

## 📁 Project Structure

```
/
├── public/
│   ├── admin/              # Decap CMS admin interface
│   │   ├── config.yml      # CMS configuration
│   │   └── index.html      # Admin panel
│   └── favicon.svg
├── src/
│   ├── components/         # Reusable components
│   ├── content/           # Content collections
│   │   ├── config.ts      # Content schema definitions
│   │   ├── events/        # Event content files
│   │   ├── gallery/       # Gallery content files
│   │   ├── officers/      # Officer profile files
│   │   ├── press/         # Press release files
│   │   ├── sponsors/      # Sponsor information files
│   │   └── success/       # Success story files
│   ├── layouts/
│   │   └── Layout.astro   # Main layout component
│   └── pages/             # Website pages
│       ├── index.astro    # Home page
│       ├── about.astro    # About page
│       ├── contact.astro  # Contact page
│       ├── gallery.astro  # Photo gallery
│       ├── officer-team.astro # Officer profiles
│       ├── press.astro    # Press releases
│       └── success.astro  # Success stories
├── astro.config.mjs       # Astro configuration
├── netlify.toml          # Netlify deployment config
└── package.json
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/modifiedgummybear-sys/fbla-website.git
   cd fbla-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:4321`

## 📝 Content Management

### Accessing the CMS

1. **Local Development**: Visit `http://localhost:4321/admin`
2. **Production**: Visit `https://your-site.netlify.app/admin`

### Content Types

#### Press Releases
- **Location**: `/src/content/press/`
- **Fields**: Title, description, publish date, category, featured status, author
- **Usage**: News articles, announcements, media coverage

#### Events
- **Location**: `/src/content/events/`
- **Fields**: Title, description, dates, location, category, registration info
- **Usage**: Conferences, competitions, meetings, workshops

#### Officer Profiles
- **Location**: `/src/content/officers/`
- **Fields**: Name, position, grade, bio, contact info, achievements
- **Usage**: Leadership team profiles and information

#### Success Stories
- **Location**: `/src/content/success/`
- **Fields**: Title, description, date, category, featured status
- **Usage**: Competition wins, member achievements, chapter milestones

#### Gallery
- **Location**: `/src/content/gallery/`
- **Fields**: Title, description, date, category, location, photographer
- **Usage**: Event photos, chapter activities, competition images

#### Sponsors
- **Location**: `/src/content/sponsors/`
- **Fields**: Name, description, logo, website, contact info, partnership details
- **Usage**: Business partnerships, sponsor recognition

## 🚀 Deployment

### Netlify Deployment (Recommended)

1. **Connect to Netlify**
   - Push your code to GitHub
   - Connect your repository to Netlify
   - Netlify will automatically detect the build settings

2. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18

3. **Environment Variables**
   Set these in your Netlify dashboard:
   ```
   NODE_ENV=production
   ```

4. **Enable Netlify Identity**
   - Go to Site Settings > Identity
   - Enable Identity service
   - Set registration preferences
   - Enable Git Gateway

### Manual Deployment

1. **Build the site**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting provider

## 🔧 Configuration

### Customizing Content

1. **Update site information** in `/src/layouts/Layout.astro`
2. **Modify navigation** in the Layout component
3. **Add new content types** in `/src/content/config.ts`
4. **Update CMS config** in `/public/admin/config.yml`

### Styling

- CSS is included in individual `.astro` files
- Global styles are in the Layout component
- Responsive design uses CSS Grid and Flexbox
- Color scheme follows FBLA branding guidelines

### Adding New Pages

1. Create a new `.astro` file in `/src/pages/`
2. Use the Layout component for consistency
3. Add navigation links in the Layout component
4. Update the CMS config if content management is needed

## 📱 Pages Overview

- **Home** (`/`): Hero section, about preview, upcoming events, sponsors
- **About** (`/about`): Chapter mission, story, activities, advisor info
- **Officer Team** (`/officer-team`): Leadership profiles and contact information
- **Success** (`/success`): Achievements, competition results, member spotlights
- **Gallery** (`/gallery`): Photo galleries with filtering and modal views
- **Press** (`/press`): News articles, press releases, media coverage
- **Contact** (`/contact`): Contact form, chapter info, FAQ section

## 🎨 Design Guidelines

### Colors
- Primary: #1e3a8a (FBLA Blue)
- Secondary: #3b82f6 (Light Blue)
- Accent: #10b981 (Green)
- Text: #1f2937 (Dark Gray)
- Background: #f8fafc (Light Gray)

### Typography
- Headings: System font stack
- Body: System font stack for optimal performance
- Responsive font sizes using clamp()

### Components
- Cards with subtle shadows
- Hover effects for interactivity
- Consistent spacing using CSS custom properties
- Mobile-first responsive design

## 🔒 Security

- Content Security Policy headers
- XSS protection
- HTTPS enforcement
- Secure admin authentication via Netlify Identity

## 📊 Performance

- Lighthouse score: 95+ across all metrics
- Optimized images and assets
- Minimal JavaScript for fast loading
- Static site generation for optimal performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For technical support or questions:
- **Chapter Advisor**: Ms. Jennifer Thompson
- **Technical Lead**: [Your Name]
- **Email**: fbla@yourschool.edu

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- FBLA National for branding guidelines
- Local business sponsors for their support
- Chapter members for content and feedback
- Astro team for the excellent framework
- Netlify for hosting and CMS integration

---

**Built with ❤️ by the FBLA Web Development Team**
