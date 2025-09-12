# Redeployment and Testing Guide for `net::ERR_FAILED` Fix

This guide provides the steps to redeploy your Google Apps Script and verify that the `net::ERR_FAILED` issue on form submissions has been resolved.

## 1. Redeploy Your Google Apps Script

You must create a **new deployment** to apply the backend changes in `Code.gs`.

1.  Open your Google Apps Script project.
2.  At the top right, click **Deploy > New deployment**.
3.  For "Select type," choose **Web app**.
4.  In the "Description" field, enter a brief description of the changes (e.g., "Fix for POST net::ERR_FAILED").
5.  Under "Web app," ensure the following settings are correct:
    *   **Execute as:** Me
    *   **Who has access:** Anyone
6.  Click **Deploy**.
7.  **Crucially**, after deploying, a "New deployment" window will appear. Copy the **Web app URL** (it starts with `https://script.google.com/macros/s/...`). You do **not** need the `googleusercontent.com` URL for this step.

## 2. Update `.env.local` with the New Deployment URL

The frontend needs the new `googleusercontent.com` URL from your latest deployment.

1.  Take the Web app URL you copied in the previous step and open it in a new browser tab.
2.  The browser will redirect you to a URL that starts with `https://script.googleusercontent.com/macros/echo?...`.
3.  Copy this entire `googleusercontent.com` URL.
4.  Open the `.env.local` file in your project.
5.  Replace the existing `NEXT_PUBLIC_APPS_SCRIPT_URL` with the new URL you just copied.

Your `.env.local` should look like this:

```
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.googleusercontent.com/macros/echo?user_content_key=...&lib=...
```

## 3. Test the Frontend Application

After redeploying the backend and updating the frontend configuration, you can test the fix.

1.  **Restart your development server** to ensure it picks up the changes in `.env.local`. Stop the current `npm run dev` process and start it again.
2.  Open your application in the browser (e.g., `http://localhost:3000`).
3.  Open the browser's developer tools (F12 or Ctrl+Shift+I) and go to the **Network** tab.
4.  Attempt to submit a registration form.

## Acceptance Checks

*   The form should submit successfully without any `net::ERR_FAILED` or CORS errors in the console.
*   In the Network tab, you should see a `POST` request to the `googleusercontent.com` URL with a **status of 200**.
*   There should be **no `OPTIONS` preflight request** for the submission.
*   The response from the server should be a JSON object indicating success (e.g., `{ "ok": true, ... }`).