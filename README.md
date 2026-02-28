<div align="center">
  <img src="public/logo.png" alt="Badges Logo" width="120">

  <h1>🚀 Badges for GitHub</h1>

  <p>
    <b>Generate dynamic, customizable, and live SVG preview cards for your GitHub projects!</b><br>
    Embed your own logos, add custom Shields.io badges, and auto-generate QR codes—all rendering perfectly on GitHub READMEs.
  </p>

  <a href="https://badges-jet.vercel.app/">
    <img src="https://badges-jet.vercel.app/api/card?username=erogluyusuf&repo=badges&theme=dark&qr=true&customBadges=Framework:Vue%203:42b883:vuedotjs,API:Serverless:000000:vercel,Styling:Tailwind:06b6d4:tailwindcss" alt="Badges Project Card">
  </a>

  <br><br>

  <a href="https://badges-jet.vercel.app/"><b>✨ Try the Live UI Builder</b></a>
</div>

---

## 🌟 Overview

This project provides two powerful ways to create beautiful repository cards:
1. **[Web UI (Client-Side)](#)**: Use the visual builder in your browser to design your card, customize colors, adjust image positioning, and download it as a static PNG.
2. **Serverless API (Dynamic SVG)**: Embed a single URL in your markdown file to fetch live GitHub statistics. It bypasses GitHub's strict Camo proxy by downloading external images and shields in the background, embedding them directly as Base64 within a pure SVG!

###  Advanced API Features
*  **Custom Badges:** Seamless Shields.io integration. Add any framework, language, or tool icon.
*  **Auto-Layout & Auto-Height:** Add as many badges as you want. The API automatically wraps them to the next line and expands the card height so your design never breaks.
*  **Custom Logo Support:** Pin your project's logo to the top right corner. (Automatically converts GitHub `blob` links to `raw` links).
*  **QR Code Generator:** Instantly generate and embed a QR code pointing to your repo or any custom URL.
*  **Full Color Control:** Choose between pre-set Light/Dark themes, or override everything with custom HEX codes.

---

##  API Documentation

To use the dynamic SVG in your GitHub `README.md`, simply use an `<img>` tag pointing to your Vercel API endpoint.

```markdown
<img src="[https://badges-jet.vercel.app/api/card?username=YOUR_USERNAME&repo=YOUR_REPO](https://badges-jet.vercel.app/api/card?username=YOUR_USERNAME&repo=YOUR_REPO)">
```
###  URL Parameters

You can fully customize your card by appending these query parameters to the URL:

| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `username` | `string` | **(Required)** Your GitHub username. | `username=erogluyusuf` |
| `repo` | `string` | **(Required)** The target GitHub repository name. | `repo=badges` |
| `theme` | `string` | Base theme for fallback colors. (`dark` or `light`). Default is `dark`. | `theme=light` |
| `bg` | `string` | Custom background HEX color (omit the `#`). Overrides theme. | `bg=0d1117` |
| `titleColor` | `string` | Custom title text HEX color (omit the `#`). | `titleColor=58a6ff` |
| `textColor` | `string` | Custom description and stats HEX color (omit the `#`). | `textColor=8b949e` |
| `w` | `number` | Custom width of the card in pixels. Default is `450`. | `w=600` |
| `h` | `number` | Custom height of the card. If omitted, the height **auto-calculates** based on the number of badges and images. | `h=200` |
| `img` | `string` | URL to a custom logo to display in the top-right corner. | `img=https://.../logo.png` |
| `qr` | `string` | Displays a QR code in the bottom-right. Set to `true` for the repo URL, or provide a custom link. | `qr=true` OR `qr=https://ulak.app` |
| `customBadges`| `string` | Comma-separated list of custom badges. <br>**Format:** `Label:Message:HexColor:IconSlug` | `customBadges=Vue:3:42b883:vuedotjs` |

*(Note: For the `IconSlug`, you can find the exact names on [SimpleIcons](https://simpleicons.org/). For example, `vuedotjs`, `tailwindcss`, `nodedotjs`, `mongodb`.)*

###  Advanced Usage Example

Want to create a massive, customized card with a specific background, a custom logo, a QR code pointing to a website, and multiple framework badges? 

```html
<img src="[https://badges-jet.vercel.app/api/card?username=erogluyusuf&repo=ulak&bg=111111&w=550&qr=https://erogluyusuf.com&img=https://github.com/erogluyusuf/ulak/raw/main/docs/assets/logo-unbg.png&customBadges=Framework:Vue:42b883:vuedotjs,Styling:Tailwind:06b6d4:tailwindcss,DB:MongoDB:47A248:mongodb](https://badges-jet.vercel.app/api/card?username=erogluyusuf&repo=ulak&bg=111111&w=550&qr=https://erogluyusuf.com&img=https://github.com/erogluyusuf/ulak/raw/main/docs/assets/logo-unbg.png&customBadges=Framework:Vue:42b883:vuedotjs,Styling:Tailwind:06b6d4:tailwindcss,DB:MongoDB:47A248:mongodb)">
```
##  Local Development

This project is built with **Vue 3**, **TypeScript**, and **Vite**. 

```bash
# Install dependencies
npm install

# Start the local development server (Vue UI)
npm run dev

# Build for production
npm run build
```
> **Note:** To test the Serverless API (`api/card.js`) locally, it is recommended to use the Vercel CLI by running `vercel dev`.
