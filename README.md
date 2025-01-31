# Vinted Lens

AI-powered visual filtering for Vinted.com using Claude vision capabilities. This Firefox extension analyzes product images in real-time and filters items based on your preferences and search criteria.

## Features

- Real-time image analysis using Claude's vision capabilities
- Visual filtering of products based on preferences (materials, styles, etc.)
- Specific search functionality (e.g., "wool v-neck in red")
- Smooth fade effects for non-matching items
- Configurable preferences and search terms
- Endless scroll support

## Installation

1. Download the latest release from the `web-ext-artifacts` directory
2. In Firefox, go to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Navigate to the downloaded `.zip` file and select it

## Configuration

1. Click the Vinted Lens icon in your browser toolbar
2. Click "Open Settings" to configure:
   - Enter your Anthropic API key
   - Set default preferences

To get an Anthropic API key:
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to API Keys
4. Generate a new key

## Usage

1. Visit Vinted.com
2. The extension will automatically detect product grids
3. Products will briefly pulsate while being analyzed
4. Non-matching items will fade away
5. Use the popup to:
   - Set preferences (e.g., "wool, silk, v-neck")
   - Enter specific search terms
   - Access settings

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm
- Firefox Developer Edition (recommended)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vinted-lens.git
cd vinted-lens
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run start:dev
```

This will:
- Launch Firefox with the extension installed
- Watch for file changes and rebuild automatically
- Reload the extension when changes are detected

### Building

To create a production build:
```bash
npm run build
```

To package the extension:
```bash
npm run package
```

The packaged extension will be in `web-ext-artifacts/`.

### Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm test -- --watch
```

## Project Structure

```
src/
├── background/     # Background scripts
├── content/        # Content scripts and styles
├── icons/         # Extension icons
├── options/       # Options page
├── popup/         # Browser action popup
├── types/         # TypeScript type definitions
└── utils/         # Shared utilities
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT
