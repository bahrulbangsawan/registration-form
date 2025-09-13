# Activity Registration Form

A Next.js-based registration form for activity tokens with shadcn/ui components. This application allows users to search for members by phone number with branch selection, select up to 5 activity tokens (maximum 2 per category), and submit registrations.

## Features

- **Phone Search**: Branch-aware phone number search to find registered members with debounced functionality
- **Manual Search**: Retry search functionality with dedicated buttons when initial searches fail or return no results
- **Identity Verification**: Display member information for confirmation
- **Token Selection**: Interactive selection of up to 5 activity tokens with category limits
- **Duplicate Prevention**: Automatic validation to prevent selecting identical class sessions across multiple tokens
- **Progress Tracking**: Real-time progress banner showing token usage and category distribution
- **Form Submission**: Submit registrations with error handling and success feedback
- **Backend Connectivity**: Robust Google Apps Script integration with automatic URL resolution
- **Error Recovery**: Comprehensive error handling for network failures and backend issues
- **Responsive Design**: Mobile-first design that works on all screen sizes
- **Accessibility**: Keyboard navigation and screen reader support

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **State Management**: Custom React hooks
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main registration page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── IdentityCard.tsx     # Member information display
│   ├── NameSearchCard.tsx   # Phone search functionality with branch selection
│   ├── ProgressBanner.tsx   # Token usage progress
│   ├── SubmitCard.tsx       # Form submission
│   ├── TokenSelectionCard.tsx # Individual token selection
│   └── index.ts             # Component exports
├── hooks/
│   ├── useMemberSearch.ts   # Member search with debouncing
│   ├── useSchedules.ts      # Schedule data management
│   ├── useSelections.ts     # Token selection state
│   └── index.ts             # Hook exports
└── lib/
    └── utils.ts             # Utility functions
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.googleusercontent.com/macros/echo?user_content_key=YOUR_CONTENT_KEY&lib=YOUR_LIB_ID
```

**Important Notes:**
- Use the `script.googleusercontent.com` URL format for better reliability
- The system automatically handles URL redirects from `script.google.com` to `script.googleusercontent.com`
- Replace `YOUR_CONTENT_KEY` and `YOUR_LIB_ID` with your actual Google Apps Script deployment values
- The backend URL should return `{"ok":true,"msg":"API ready"}` for health checks

### 3. Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Build for Production

```bash
npm run build
npm run export
```

This creates a static export in the `out/` directory, suitable for deployment to GitHub Pages or any static hosting service.

## Backend Integration

### Google Apps Script Setup

This application integrates with a Google Apps Script (GAS) Web App that provides:
- Member search functionality
- Activity schedule management
- Registration submission with validation
- Race condition prevention using LockService

### Why Google Apps Script?

- **No Server Costs**: Runs on Google's infrastructure
- **Direct Sheets Integration**: Native access to Google Sheets data
- **Automatic Scaling**: Handles concurrent users automatically
- **Simple Deployment**: One-click deployment as Web App
- **Built-in Security**: Leverages Google's authentication and permissions

### Backend Deployment

1. **Set up Google Sheets**:
   - Create `list_member` sheet with columns: `member_id`, `branch`, `name`, `birthdate`, `parent_name`, `contact`, `registration_status` (master members table for search)
   - Create `form2025` sheet with columns: `member_id`, `branch`, `name`, `birthdate`, `activity_name`, `parent_name`, `contact`, `token` (registration records)
   - Create `schedule2025` sheet with columns: `activity_id`, `branch`, `class_category`, `activity_name`, `total_slot`, `booked_slot`, `available_slot`

2. **Deploy Google Apps Script**:
   - Copy code from `gas-backend/Code.gs`
   - Update sheet IDs in the configuration
   - Deploy as Web App with "Anyone" access
   - Copy the Web App URL

3. **Configure Frontend**:
   ```env
   NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.googleusercontent.com/macros/echo?user_content_key=YOUR_CONTENT_KEY&lib=YOUR_LIB_ID
   ```
   
   **Backend URL Troubleshooting:**
   - If using `script.google.com` URLs, the system will automatically follow redirects to `script.googleusercontent.com`
   - Test your backend URL with: `curl -L "YOUR_BACKEND_URL"` to verify it returns the expected JSON response
   - Ensure the Web App is deployed with "Anyone" access permissions

See `gas-backend/DEPLOYMENT.md` for detailed setup instructions.

### API Endpoints

- `GET /exec` - Health check
- `GET /exec?fn=search&name=query` - Search members
- `GET /exec?fn=schedules` - Load activity schedules
- `POST /exec` - Submit registration

See `docs/api-contract.md` for complete API documentation.

### Data Architecture

The backend uses a three-sheet architecture:
- **`list_member`**: Master members table for search operations
- **`form2025`**: Registration records (one row per token)
- **`schedule2025`**: Activity schedules and availability

This separation allows for efficient member search while maintaining detailed registration tracking.

## Backend Requirements

This frontend expects a Google Apps Script backend with the following endpoints:

### GET `/exec?fn=search&name={query}`
Search for members by name (reads from list_member sheet).

**Response:**
```json
[
  {
    "id": "string",
    "name": "string",
    "branch": "string",
    "birthdate": "YYYY-MM-DD",
    "parent_name": "string",
    "phone": "string"
  }
]
```

### GET `/exec?fn=schedules`
Get all available activity schedules.

**Response:**
```json
[
  {
    "activity_id": "string",
    "activity_name": "string",
    "class_category": "string",
    "available_slot": number,
    "session_time": "string",
    "instructor": "string"
  }
]
```

### POST `/exec`
Submit registration data (writes to form2025 sheet).

**Request Body:**
```json
{
  "member": {
    "id": "string",
    "name": "string",
    "branch": "string",
    "birthdate": "YYYY-MM-DD",
    "parent_name": "string",
    "phone": "string"
  },
  "selections": [
    {
      "class_category": "string",
      "activity_id": "string",
      "activity_name": "string"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration submitted successfully"
}
```

## Token Selection Rules

- Maximum 5 tokens total
- Maximum 2 tokens per category
- Only sessions with available slots can be selected
- Categories with 2 selections become unavailable for new tokens

## Deployment

### GitHub Pages

1. Build the static export:
   ```bash
   npm run build
   npm run export
   ```

2. Deploy the `out/` directory to GitHub Pages

3. Update `next.config.js` if deploying to a subdirectory:
   ```js
   const nextConfig = {
     output: 'export',
     trailingSlash: true,
     images: {
       unoptimized: true
     },
     basePath: '/your-repo-name', // Add this for subdirectory deployment
     assetPrefix: '/your-repo-name/' // Add this for subdirectory deployment
   }
   ```

## Validation Features

### Duplicate Session Prevention

The application automatically prevents users from selecting identical class sessions across multiple tokens:

- **Activity ID Validation**: Each session has a unique `activity_id` that identifies the specific class and schedule
- **Real-time Checking**: Validation occurs immediately when selecting or updating token choices
- **User Feedback**: The system silently prevents duplicate selections without disrupting the user experience
- **Cross-token Validation**: Checks apply across all 5 available tokens to ensure no duplicates

**Example**: If "Basketball Tuesday 2pm" is selected for Token 1, it cannot be selected again for any other token.

### Manual Search Functionality

Enhanced search capabilities for better user experience:

- **Retry Buttons**: When searches fail or return no results, dedicated retry buttons appear
- **Error Recovery**: Users can manually trigger searches after network errors or timeouts
- **Persistent Search**: Search functionality remains available even when initial attempts yield no results
- **Immediate Execution**: Manual searches bypass debouncing for instant results

**Usage**:
1. Enter phone number and select branch
2. If no results appear or an error occurs, click "Try Search Again" or "Retry Search"
3. The system will immediately re-attempt the search with the same parameters

## Development Notes

- The application uses client-side rendering only (`'use client'`)
- All API calls are made to the Google Apps Script backend
- Error handling is implemented for network failures and validation errors
- The UI is fully responsive and accessible
- Toast notifications provide user feedback for all actions
- Backend connectivity issues are automatically diagnosed and resolved
- The system handles Google Apps Script URL redirects transparently

## Troubleshooting

### Backend Connectivity Issues

If you encounter `net::ERR_ABORTED` or similar network errors:

1. **Verify Backend URL**: Test your Google Apps Script URL directly:
   ```bash
   curl -L "https://your-backend-url"
   ```
   Expected response: `{"ok":true,"msg":"API ready"}`

2. **Check URL Format**: Ensure you're using the correct URL format:
   - ✅ Correct: `https://script.googleusercontent.com/macros/echo?user_content_key=...`
   - ⚠️ May redirect: `https://script.google.com/macros/s/.../exec`

3. **Verify Deployment**: Ensure your Google Apps Script is:
   - Deployed as a Web App
   - Set to "Anyone" access
   - Using the latest version

4. **Environment Variables**: Restart your development server after updating `.env.local`:
   ```bash
   npm run dev
   ```

### Common Error Solutions

- **Registration fails silently**: Check browser console for network errors
- **Member search not working**: Verify the backend `search` endpoint is accessible
- **Token selection issues**: Ensure the `schedules` endpoint returns valid data
- **CORS errors**: Verify Google Apps Script deployment permissions

### Testing Backend Endpoints

```bash
# Test health check
curl "https://your-backend-url"

# Test member search
curl "https://your-backend-url?fn=search&name=test"

# Test schedules
curl "https://your-backend-url?fn=schedules"
```

## Browser Support

- Modern browsers with ES2017+ support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## License

This project is for internal use and follows the organization's licensing requirements.
