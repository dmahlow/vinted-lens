# System Patterns: Vinted Lens

## Architecture Overview
1. Browser Extension Layer
   - Content Scripts: Monitor Vinted.com DOM and handle UI modifications
   - Background Scripts: Manage API calls and state
   - Popup UI: User preferences and search interface
   - Options Page: Configuration settings

2. Core Components
   - Grid Detector: Identifies and tracks product grid layout
   - Screenshot Service: Captures 5x2 product image grids
   - Claude Integration: Handles AI analysis pipeline
   - Filter Manager: Applies visibility changes based on AI results
   - Preference Store: Manages user settings and search criteria

## Technical Decisions
1. Screenshot Implementation
   - Use browser.tabs.captureVisibleTab for full viewport capture
   - Send entire viewport as single image to Claude
   - Grid position tracking for result mapping
   - Base64 encoding for API transmission

2. AI Integration
   - Single API call per viewport
   - Grid-aware prompts including layout information
   - Structured responses with grid positions
   - Confidence scoring for matches

3. Visual Effects
   - CSS opacity transitions for smooth fade effects
   - DOM manipulation for hiding non-matching items
   - Special highlighting for low-confidence matches
   - Performance optimization via CSS transforms

4. State Management
   - Local storage for preferences and API key
   - In-memory cache for recent analysis results
   - Event-driven communication between components

## Design Patterns
1. Observer Pattern
   - Scroll event monitoring
   - Grid layout changes
   - Preference updates

2. Factory Pattern
   - Screenshot capture configurations
   - AI prompt generation
   - Filter effect creation

3. Strategy Pattern
   - Different filtering algorithms
   - Various prompt templates
   - Multiple grid detection methods

4. Singleton Pattern
   - API client instance
   - Preference manager
   - Screenshot service

## Error Handling
1. Graceful Degradation
   - Fallback to manual browsing if API fails
   - Cached results for offline capability
   - Clear error messaging to user

2. Rate Limiting
   - Queue system for API requests
   - Batch processing of images
   - Cooldown periods between analyses
