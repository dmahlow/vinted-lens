# Product Context: Vinted Lens

## Purpose
Vinted Lens is a Firefox browser extension that enhances the Vinted.com shopping experience by using AI-powered image analysis to filter products based on user preferences and search criteria.

## Problems Solved
1. Manual Visual Scanning: Users currently have to manually scan through numerous product images to find items matching their preferences
2. Hidden Details: Product descriptions may not always accurately describe materials or styles
3. Time Consumption: Browsing through endless scroll of products is time-intensive
4. Missed Opportunities: Users might miss relevant items due to fatigue or oversight

## How It Works
1. Grid Capture
   - Extension monitors Vinted's product grid view
   - Captures 5x2 grid of product images during scroll
   - Processes images in batches for efficient analysis

2. AI Analysis
   - Sends captured grid to Claude (Anthropic's AI) for analysis
   - Includes user preferences and search criteria in the prompt
   - Receives analysis of which products match criteria

3. Visual Filtering
   - Products that don't match criteria fade away
   - Matching products remain visible
   - Continuous processing during endless scroll

4. User Configuration
   - Preferences storage (materials, styles, etc.)
   - Specific search criteria input
   - Anthropic API key configuration

## Key Features
- Real-time image analysis
- Preference-based filtering
- Specific search capabilities
- Visual fade effect for non-matching items
- Seamless integration with Vinted's UI
- Configurable settings
