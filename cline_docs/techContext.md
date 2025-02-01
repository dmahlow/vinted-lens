# Technical Context: Vinted Lens

## Technologies Used

### Core Technologies
- Firefox WebExtensions API
- JavaScript/TypeScript
- HTML/CSS
- Canvas API
- OpenAI GPT-4V API

### Development Tools
- web-ext (Firefox extension development tool)
- TypeScript compiler
- ESLint/Prettier
- Jest for testing
- webpack for bundling

### APIs and Libraries
1. Firefox WebExtensions
   - tabs API
   - storage API
   - runtime messaging
   - webRequest API

2. OpenAI GPT-4V
   - Vision API capabilities
   - Markdown-formatted responses
   - Rate limits and quotas
   - Cost tracking features

## Development Setup
1. Extension Development
   - Firefox Developer Edition
   - web-ext for testing
   - Hot reload capabilities
   - Source maps enabled

2. Build Process
   - TypeScript compilation
   - Asset bundling
   - Manifest generation
   - ZIP packaging

3. Testing Environment
   - Jest for unit tests
   - Playwright for E2E testing
   - Mock API responses
   - Firefox debugging tools

## Technical Constraints

### Browser Limitations
- Cross-origin restrictions
- Viewport capture resolution limits
- Screen size variations
- DOM manipulation limits
- Extension manifest v3 requirements
- Memory constraints for large screenshots

### API Constraints
- OpenAI API rate limits (3 RPM for GPT-4V)
- Response time (1-2s typical)
- Cost per API call ($0.01/1K input tokens)
- Image size limitations (max 20MB)
- Token limits (max 4096 tokens)

### Performance Requirements
- Minimal UI lag
- Efficient viewport capture
- Optimized screenshot quality
- Memory management for large images
- Battery consumption optimization
- Smooth visual transitions

### Security Considerations
- API key storage
- Screenshot data handling
- Content security policy
- User data privacy
- Viewport data transmission
- Grid position validation

## Development Guidelines
1. Code Organization
   - Feature-based structure
   - Clear separation of concerns
   - TypeScript for type safety
   - Documented interfaces

2. Performance
   - Debounced scroll handling
   - Optimized viewport capture
   - Memory management for screenshots
   - Efficient grid position tracking
   - Resource cleanup
   - Cache invalidation strategy
   - Response caching
   - Token optimization

3. Error Handling
   - Graceful degradation
   - User feedback
   - Error logging
   - Recovery strategies
   - Rate limit handling
   - Budget enforcement

4. Testing
   - Unit test coverage
   - Integration testing
   - Visual regression tests
   - Performance benchmarks
   - Cost efficiency tests
