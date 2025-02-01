# System Patterns: Vinted Lens

## Architecture Overview
1. Browser Extension Layer
   - Content Scripts: Monitor Vinted.com DOM and handle UI modifications
   - Background Scripts: Manage API calls and state
   - Popup UI: User preferences and search interface
   - Options Page: Configuration settings

2. Core Components
   - Grid Detector: Identifies product items
   - Image Processor: Handles base64 conversion and format
   - AI Integration: Manages vision API requests
   - Filter Manager: Applies visibility changes based on AI results
   - Preference Store: Manages user settings and search criteria
   - Cost Tracker: Monitors API usage and costs

## Technical Decisions
1. Image Processing
   - Convert product images to base64
   - Handle CORS requirements
   - Support multiple image formats
   - Optimize image sizes for API

2. AI Integration
   - OpenAI GPT-4V-Mini for vision analysis
   - Parallel request processing
   - Cost-optimized prompts
   - Batch processing for efficiency

3. Visual Effects
   - CSS opacity transitions for smooth fade effects
   - DOM manipulation for hiding non-matching items
   - Special highlighting for low-confidence matches
   - Performance optimization via CSS transforms

4. State Management
   - Local storage for preferences and API keys
   - In-memory cache for recent analysis results
   - Event-driven communication between components
   - Cost tracking persistence

## Design Patterns
1. Observer Pattern
   - Product grid monitoring
   - Cost tracking updates
   - Preference changes

2. Factory Pattern
   - API client creation
   - Image processor configuration
   - Cost calculator instances

3. Strategy Pattern
   - Different AI providers
   - Various prompt templates
   - Multiple cost tracking methods

4. Queue Pattern
   - Parallel request management
   - Rate limit handling
   - Batch processing control

## Error Handling
1. Graceful Degradation
   - Fallback to single requests if parallel fails
   - Cache results for offline capability
   - Clear error messaging to user

2. Rate Limiting
   - Queue system for parallel requests
   - Dynamic batch sizing
   - Cost-aware throttling
   - Budget enforcement

## Cost Management
1. Usage Tracking
   - Token counting
   - Request volume monitoring
   - Cost calculation
   - Budget enforcement

2. Optimization
   - Batch size tuning
   - Prompt efficiency
   - Cache utilization
   - Parallel processing balance
