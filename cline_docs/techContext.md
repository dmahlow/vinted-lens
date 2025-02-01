# Technical Context: Vinted Lens

## Core Technologies

### API Integration
- OpenAI GPT-4V for image analysis
- REST API with JSON responses
- Base URL: api.openai.com/v1/chat/completions
- Model: gpt-4o-mini

### Token Management
- Input tokens: $0.15 per 1M tokens
- Output tokens: $0.60 per 1M tokens
- Image tokens:
  * Low detail: 85 tokens
  * High detail: 765-1105 tokens
  * Auto mode: Uses high detail estimate

### Cost Calculation
```typescript
const costPerInputToken = 0.00015;  // $0.15 per 1M tokens
const costPerOutputToken = 0.0006;  // $0.60 per 1M tokens

totalCost = (inputTokens * costPerInputToken) +
           (outputTokens * costPerOutputToken)
```

### Development Stack
- TypeScript for type safety
- Webpack for bundling
- Jest for testing
- Firefox WebExtensions API
- Web-ext for packaging

## Architecture

### Background Script
- Handles API communication
- Manages token tracking
- Controls parallel processing
- Enforces cost limits

### Content Script
- Detects product grids
- Manages intersection observer
- Handles endless scroll
- Updates UI based on analysis

### Options Page
- API key management
- Cost limit settings
- Usage statistics
- Token analytics

### Popup
- Quick preferences
- Search terms
- Settings access

## Data Flow

1. Content Detection
   - Intersection observer tracks products
   - Queue system for parallel processing
   - Batch size of 8 concurrent requests

2. Image Analysis
   - Base64 encode images
   - Construct GPT-4V prompts
   - Track token usage
   - Parse JSON responses

3. Cost Management
   - Track input/output tokens separately
   - Add image token costs
   - Calculate running totals
   - Enforce budget limits

## State Management

### Local Storage
- API key (encrypted)
- Preferences
- Cost limits
- Usage statistics
- Token counts

### Runtime State
- Active requests
- Queue status
- Analysis results
- Token tracking

## Error Handling

### API Errors
- Rate limits: Exponential backoff
- Auth errors: Clear key, prompt user
- Network errors: Auto-retry
- Malformed responses: Skip item

### Cost Control
- Budget exceeded: Stop processing
- High usage warning: User alert
- Reset option: Clear statistics
- Monthly auto-reset

## Performance

### Parallel Processing
- Max 8 concurrent requests
- Queue management
- Priority system
- Error recovery

### Token Optimization
- Smart detail level
- Efficient prompts
- Response caching
- Batch processing

## Development Workflow

### Build Process
```bash
npm run build        # Production build
npm run start:dev    # Development mode
npm run package      # Create extension
npm test            # Run tests
```

### Testing Strategy
- Unit tests for utilities
- Integration tests for API
- End-to-end for UI
- Performance benchmarks

### Deployment
- Firefox Add-ons workflow
- Automated builds
- Version management
- Update notifications
