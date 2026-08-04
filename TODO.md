# TODO — Subscription Interface After Signup

## Goal
After signup, a university user should be directed to the working Razorpay/subscription interface instead of seeing a stale dashboard with no subscription prompt.

## Steps
- [x] 1. Fix `UniversityOverview.jsx` — replace stale "Plans are not live yet" subscription card with a real status/CTA card linking to `/university/dashboard/subscription`.
- [x] 2. Add prominent "Subscribe Now" banner in `UniversityOverview.jsx` when subscription is not active.
- [x] 3. Fix approval email link in `universityPortalController.js` to point to `/university/dashboard/subscription`.
- [x] 4. Verify dashboard renders correctly and subscription page is reachable.
