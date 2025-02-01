# Active Context: Vinted Lens

## Current Focus
Switching from Claude to OpenAI and re-enabling parallel processing

## Recent Changes
- Fixed image handling with Claude API
- Added base64 image conversion
- Added CORS header for browser requests
- Improved error logging and debugging
- Fixed API key handling

## Next Steps
1. Switch to OpenAI GPT-4V-Mini
   - Update API client
   - Modify image handling for OpenAI format
   - Update prompts for GPT-4V
   - Test cost efficiency

2. Re-enable Parallel Processing
   - Restore batch processing
   - Implement request queuing
   - Add rate limiting for OpenAI
   - Test concurrent requests

3. Add Cost Tracking
   - Track token usage
   - Calculate costs per request
   - Add cost summary to UI
   - Implement budget limits

## Current Priorities
1. Cost optimization with GPT-4V
2. Performance improvement with parallel processing
3. User feedback on costs

## Open Questions
- Best batch size for parallel requests to OpenAI
- How to structure prompts for GPT-4V efficiency
- Optimal way to track and display costs
- How to handle rate limits with parallel processing
