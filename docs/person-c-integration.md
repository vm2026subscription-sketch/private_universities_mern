# Person C — Dashboard Integration Guide

UI ban gaya hai (accha bana hai). Ab usko backend se jodna hai.

Abhi status: components me **koi API call nahi hai** — sab mock data pe chal raha hai.
Save buttons kuch save nahi karte, uploads blob URL banate hain jo refresh pe udd jaate hain.

Backend **poora ready hai aur production pe live hai**. Bas connect karna hai.

Base URL: `/api/v1/university-portal` (axios instance `src/utils/api.js` already configured hai)

---

## 1. Sabse pehle — Auth guard (security)

Abhi `/university/dashboard` **bilkul khula hai**. Koi bhi, bina login ke, khol sakta hai.

Compare karo — admin route protected hai, university wala nahi:

```jsx
// App.jsx — abhi aisa hai ❌
<Route path="/university/dashboard" element={<UniversityDashboardLayout />}>

// admin aisa hai ✅
<Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
```

### Step 1a — `ProtectedRoute.jsx` me `universityOnly` add karo

```jsx
export default function ProtectedRoute({
  children,
  adminOnly = false,
  superadminOnly = false,
  universityOnly = false,          // ← naya
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (superadminOnly && user.role !== 'superadmin') return <Navigate to="/admin" replace />;
  if (adminOnly && user.role !== 'admin' && user.role !== 'superadmin') return <Navigate to="/" replace />;

  // university accounts: role bhi chahiye, aur approval bhi (universityId set hona chahiye)
  if (universityOnly) {
    if (user.role !== 'university') return <Navigate to="/" replace />;
    if (!user.universityId) return <Navigate to="/university/pending" replace />;
  }

  return children;
}
```

### Step 1b — Route wrap karo

```jsx
<Route path="/university/dashboard" element={
  <ProtectedRoute universityOnly><UniversityDashboardLayout /></ProtectedRoute>
}>
```

---

## 2. Login redirect

Login page me, OTP verify hone ke baad role dekhkar bhejo:

```js
const { user } = response.data;

if (user.role === 'university') navigate('/university/dashboard');
else if (user.role === 'admin' || user.role === 'superadmin') navigate('/admin');
else navigate('/');
```

Aur ek error case handle karna hai — jab admin ne abhi approve nahi kiya:

```js
catch (err) {
  if (err.response?.data?.code === 'CLAIM_NOT_APPROVED') {
    navigate('/university/pending');
    return;                      // red error toast MAT dikhana
  }
  toast.error(err.response?.data?.message || 'Login failed');
}
```

User ne kuch galat nahi kiya — bas admin ka wait hai. Usko error jaisa mat dikhao.

**Naya page banana hai:** `/university/pending` — simple screen, "Aapki request review me hai, 2 working days me email aayega."

---

## 3. Profile Section

**File:** `UniversityProfileSection.jsx`
**Hatao:** `location.state?.university` aur saara hardcoded fallback (`'Apex Technical University'` waala)

> `location.state` pe depend mat karna — page refresh karte hi wo `undefined` ho jata hai
> aur fake data dikhne lagta hai.

### Load

```js
const { data } = await api.get('/university-portal/my-university');
// data.university       → poora university document
// data.pendingChanges   → jo admin review me pade hain
// data.policy           → { selfServe: [...], reviewRequired: [...] }
```

### Save

```js
const { data } = await api.put('/university-portal/my-university', {
  description: about,
  vision,
  mission,
  address, phone, email, website,
});

// Response:
// data.applied         → ye turant live ho gaye
// data.awaitingReview  → ye admin ke paas gaye
// data.rejected        → ye allowed hi nahi the
```

**Teeno user ko dikhana zaroori hai.** Warna user ko lagega sab save ho gaya, jabki kuch review me gaya.

```js
if (data.applied.length) toast.success('Saved');
if (data.awaitingReview.length) toast('Kuch changes verification ke liye bheje gaye', { icon: 'ℹ️' });
if (data.rejected.length) toast.error(`Ye fields allowed nahi: ${data.rejected.join(', ')}`);
```

### Review badge

`data.policy.reviewRequired` array me jo field hai, uske input pe "Needs approval" badge dikhao.

**Apni list hardcode mat karna** — server se aayi list use karo, warna dono alag ho jayengi.

---

## 4. Gallery Section

**File:** `UniversityGallerySection.jsx`
**Hatao:** `URL.createObjectURL(file)` — ye sirf browser me temporary URL banata hai, server pe kuch nahi jaata

### Asli upload — do step

```js
// Step 1: file → Cloudinary
const form = new FormData();
form.append('image', file);              // field name 'image' hona zaroori hai
const { data: up } = await api.post('/upload', form);
const imageUrl = up.data.url;

// Step 2: URL save karo
const { data } = await api.post('/university-portal/my-university/gallery', {
  images: [imageUrl],
});
// data.galleryImages → updated list
```

### Delete

```js
await api.delete('/university-portal/my-university/gallery', {
  data: { imageUrl }               // axios me delete ka body 'data' me jaata hai
});
```

Limit: **40 images max**. Duplicate URLs apne aap hat jaate hain.

Logo/cover ke liye bhi wahi upload endpoint, phir:
```js
api.put('/university-portal/my-university', { logoUrl, bannerImageUrl });
```

---

## 5. Courses Section

**File:** `UniversityCoursesSection.jsx`

```js
// list
const { data } = await api.get('/university-portal/my-university/courses');
// data.courses, data.total

// add
await api.post('/university-portal/my-university/courses', {
  name: 'B.Tech Computer Science',
  category: 'Engineering',          // required
  duration: '4 Years',
  feesPerYear: 150000,
  totalSeats: 120,
  eligibility: '10+2 with PCM',
  entranceExams: ['JEE Main'],
});

// edit
await api.put(`/university-portal/my-university/courses/${courseId}`, { feesPerYear: 160000 });

// delete
await api.delete(`/university-portal/my-university/courses/${courseId}`);
```

`name` aur `category` required hain. Courses **turant live** hote hain, review nahi.

---

## 6. Placement Section — ⚠️ ye review me jaayega

**File:** `UniversityPlacementSection.jsx`

```js
await api.put('/university-portal/my-university', {
  stats: {
    avgPackageLPA: 8.5,
    highestPackageLPA: 45,
    placementPercentage: 92,
  },
  topRecruiters: ['TCS', 'Infosys', 'Wipro'],
});
```

Ye saare fields **turant live nahi honge**. Response me `awaitingReview` me aayenge.

**UI me clearly dikhana:** "Placement data verification ke baad publish hoga."

Warna university baar-baar save karegi aur sochegi kaam nahi kar raha.

Same rule: `naacGrade`, `nirfRank`, `establishedYear`, `name` — sab review me jaate hain.

---

## 7. Scholarships & Campus — ye turant live

**File:** `UniversityScholarshipsSection.jsx`

```js
await api.put('/university-portal/my-university', {
  scholarships: [
    { name: 'Merit Scholarship', eligibility: '90%+ in 12th', amount: '50% fee waiver' },
  ],
  campus: {
    overview: '...',
    hostelDetails: '...',
    libraryDetails: '...',
    labDetails: '...',
    sportsDetails: '...',
    transportDetails: '...',
    medicalSupport: '...',
    wifiAvailable: true,
  },
  facilities: ['Gym', 'Cafeteria', 'Auditorium'],
  faculty: [{ name: 'Dr. A Sharma', designation: 'HOD', department: 'CSE' }],
});
```

Arrays **poore replace** hote hain — puri list bhejo, sirf naya item nahi.

---

## 8. Admin — Pending Requests

**File:** `PendingUniversityRequests.jsx`
**Hatao:** `INITIAL_PENDING_REQUESTS` array

```js
// list
const { data } = await api.get('/university-portal/claims?status=pending');
// data.claims[] — har claim me:
//   contactPerson, designation, officialEmail, phone, website
//   emailSignal          → 'official' | 'academic' | 'free' | 'unrelated'
//   needsExtraScrutiny   → true ho to UI me warning dikhao
//   authorizationLetterUrl

// ek claim ki detail
const { data } = await api.get(`/university-portal/claims/${id}`);
// data.currentOwner          → agar pehle se koi owner hai
// data.isReassignment        → true ho to extra confirmation maango
// data.verificationChecklist → admin ko dikhane ke liye ready checklist

// approve
await api.post(`/university-portal/claims/${id}/approve`, { note: 'Verified by call' });

// reject — reason COMPULSORY hai
await api.post(`/university-portal/claims/${id}/reject`, { reason: 'Authorization letter missing' });
```

### 3 cheezein UI me zaroori

1. **`emailSignal` ka badge** — `free` (Gmail) pe orange warning, `official` pe green
2. **`isReassignment: true`** — laal warning: "Is university ka already ek owner hai. Approve karne se uska access chala jayega." Aur ye sirf **superadmin** kar sakta hai — admin ko `403` milega
3. **Reject pe reason ka input** — bina reason ke API `400` dega

---

## 9. Admin — Profile Moderation (naya page banana hai)

Ye page abhi bana hi nahi hai. Jab university placement stats ya NAAC grade edit karti hai, wo yahan aata hai.

```js
const { data } = await api.get('/university-portal/reviews');
// data.reviews[] — har ek me:
//   name, logoUrl, location, submittedAt, submittedBy
//   changes: [{ field, current, proposed }]   ← side-by-side dikhao

// approve — poora ya sirf kuch fields
await api.post(`/university-portal/reviews/${universityId}/approve`, {
  fields: ['naacGrade'],     // optional — na do to sab approve ho jayenge
});

await api.post(`/university-portal/reviews/${universityId}/reject`, { reason: '...' });
```

`current` vs `proposed` side-by-side dikhana — admin ko dono dikhne chahiye tabhi wo judge kar payega.

Partial approve ka support hai: NAAC grade maan lo, placement % reject kar do.

---

## 10. Team Management

```js
const { data } = await api.get('/university-portal/team');
await api.post('/university-portal/team/invite', { name, email });   // sirf owner
await api.delete(`/university-portal/team/${userId}`);               // sirf owner
```

Max 5 accounts per university. Sirf `universityRole === 'owner'` invite kar sakta hai — member ko button hi mat dikhao.

Invite accept ka page: `/university/accept-invite?token=xxx`
```js
await api.post('/university-portal/team/accept-invite', { token, password });
```

---

## 11. Subscription & Revenue — Person B ke baad

**Files:** `UniversitySubscriptionSection.jsx`, `SubscriptionsManager.jsx`, `RevenueDashboard.jsx`

Ye endpoints abhi exist nahi karte. Mock data abhi rehne do, B ka module aane pe jodna.

---

## Galtiyan jinse bachna hai

| ❌ Mat karo | ✅ Ye karo |
|---|---|
| `universityId` body me bhejna | Kuch mat bhejo — session se aata hai. Bhejoge to `400` milega |
| `policy` list hardcode karna | `GET /my-university` se aayi list use karo |
| `URL.createObjectURL` | Pehle `/upload`, phir mila hua URL save karo |
| `CLAIM_NOT_APPROVED` pe error toast | Pending screen pe bhejo |
| Sirf "Saved" dikhana | `applied` / `awaitingReview` / `rejected` teeno dikhao |
| Reject bina reason | Reason input compulsory — API `400` dega |
| `location.state` pe depend | API se load karo, refresh pe state khali hota hai |

---

## Test kaise karo

Backend team se demo account maango:

```bash
cd backend
npm run demo:university
```

Ye ek approved university account bana ke **ready access token** de dega (~15 min valid).
Token ko localStorage me daal ke dashboard test kar sakte ho, ya Postman me use kar sakte ho.

Cleanup: `npm run demo:university -- --cleanup`

---

## Priority order

1. **Auth guard + login redirect** (security — sabse pehle)
2. **Profile section** (sabse zyada use hoga)
3. **Gallery + real upload**
4. **Courses**
5. **Placement** (review badge ke saath)
6. **Scholarships / Campus**
7. **Admin pending requests**
8. **Admin moderation page** (naya)
9. Subscription — B ka wait
