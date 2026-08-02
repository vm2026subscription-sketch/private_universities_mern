# University Self-Service Portal — Roadmap

Universities apni profile khud manage karein, subscription lein, aur admin sab control kare.
Ye document **plan** hai — koi code isme nahi hai.

**Team:** 3 developers
**Estimated:** 6 weeks (full-time) / 9-10 weeks (part-time)

---

## 1. Scope — v1 me kya banega

### In scope

| # | Feature |
|---|---------|
| 1 | University signup — existing university claim karna, ya nayi request karna |
| 2 | Admin approval workflow (approve / reject / reassign) |
| 3 | Razorpay payment — ₹1,000/month, ₹10,000/year |
| 4 | Subscription lifecycle — activate, expire, renew |
| 5 | University dashboard — apni profile, gallery, courses, placement, scholarships edit |
| 6 | Moderation — sensitive fields admin approval ke baad hi live |
| 7 | Email notifications — submitted, approved, rejected, paid, expiring, expired |
| 8 | Admin dashboard — requests queue, subscriptions, revenue |
| 9 | Team invite — approved university apne 2-3 logon ko invite kare |

### Out of scope (v2 me dekhenge)

Custom subdomain · AI content assistant · Virtual campus tour · Student chat ·
Blog/news posting · Analytics dashboard · Auto-recurring mandate (v1 me manual renewal)

> **Scope creep se bachna hai.** Ye 9 cheezein pehle poori tarah kaam karein, tab aage badhna.

---

## 2. Non-negotiable rules

Ye 5 rules kisi bhi condition me todne nahi hain. Har PR review me check honge.

### R1 — University data ka sirf ek ghar hai

University apna **existing `University` document** hi edit karegi.
`university_profile` naam ka koi parallel collection **nahi** banega.

*Kyun:* 700+ universities ka data already `University` me hai. Do jagah rakhoge to public page aur dashboard alag data dikhayenge, aur pata nahi chalega kaunsa sach hai.

### R2 — Client se aayi ID par kabhi trust nahi

Update hamesha **JWT ke `universityId`** se hoga, URL/body me aayi ID se nahi.

```
❌  PUT /api/v1/university/:id        → id body/URL se
✅  PUT /api/v1/my-university         → id JWT se
```

*Kyun:* URL me ID lene ka matlab hai koi bhi banda ID badal ke dusri university edit kar sakta hai.

### R3 — Payment ka sach sirf webhook batata hai

Frontend ka "payment success" callback **proof nahi hai**. Subscription tabhi activate hogi jab:
1. Razorpay signature server pe HMAC se verify ho, **aur**
2. Webhook se confirmation aaye

*Kyun:* Warna koi bhi Postman se fake success bhej ke muft subscription le lega.

### R4 — Subscription status calculate hota hai, store nahi

Sirf `expiryDate` store karo. `isActive` har baar `expiryDate > now` se nikaalo.
`status: "Active" | "Expired"` field **mat banao**.

*Kyun:* Wo field expiry ke baad bhi "Active" padi rahegi — usko badalne wala koi nahi hoga.

### R5 — Subscription khatam = editing band, public page zinda

Expire hone pe public university page **kabhi mat hatao**. Sirf dashboard editing lock karo.

*Kyun:* Public pages aapki SEO aur students ke liye hain. Hata doge to apna hi traffic maar loge.

---

## 3. Team split

Split aisa hai ki teeno ka kaam **alag files** me rahe — merge conflicts kam ho.

| | Owner | Area | Primary files |
|---|---|---|---|
| **A** | Identity, Access & Tenancy | Backend | `models/`, `middleware/auth.js`, `controllers/universityAuthController.js` |
| **B** | Payments & Subscription | Backend | `models/Subscription.js`, `controllers/paymentController.js`, `services/` |
| **C** | Dashboard & Admin UI | Frontend | `frontend/src/pages/university/`, `frontend/src/pages/admin/` |

### Person A — Identity, Access & Tenancy

**Ye foundation hai. Iske bina B aur C aage nahi badh sakte — isliye A sabse pehle deliver karega.**

- `university` role add karna — **`ROLE_HIERARCHY` me nahi daalna**, `requireRole('university', { exact: true })` use karna
  ↳ *Kyun:* hierarchy ek ladder hai. University `user` se "zyada powerful" nahi, **alag kism ka** account hai.
- `UniversityClaim` model — signup request, status `pending|approved|rejected`
- Signup API — official domain check **signal ke roop me** (hard block nahi)
  ↳ *Kyun:* bahut si private universities Gmail pe chalti hain. Block karoge to paying customer hi nahi aayega.
- `requireUniversityOwner` middleware — R2 enforce kare
- Admin approval APIs — approve / reject / reassign (reassign sirf `superadmin`)
- Har approval `AuditLog` me — model already exists
- Team invite flow — approved owner apni team ko bulaye

**Definition of done:** Ek test suite jo prove kare University A, University B ka data **kisi bhi tarike se** edit nahi kar sakti.

### Person B — Payments & Subscription

- `Subscription` model — `universityId`, `plan`, `amount`, `razorpayPaymentId`, `startDate`, `expiryDate` (**`status` field nahi** — R4)
- Razorpay order create API
- **Signature verification** — HMAC-SHA256, server-side
- **Webhook endpoint** — `payment.captured`, `payment.failed`. Raw body chahiye signature verify ke liye
- Idempotency — same webhook do baar aaye to subscription do baar activate na ho
- `requireActiveSubscription` middleware — expire hone pe editing block (R5: public page nahi)
- Renewal flow — expiry se pehle renew kare to naye din **jud jayein**, reset na hon
- Expiry cron — 7 din pehle warning email, expire pe email
- Admin revenue APIs — monthly/yearly income, active/expired counts

**Definition of done:** Razorpay test mode me poora flow chale, aur **fake success POST reject ho jaye**.

### Person C — Dashboard & Admin UI

- University dashboard shell — sidebar, routing, auth guard
- Profile editor — logo, cover, about, vision, mission, contact, address
- Gallery — multiple image upload, per-university folder (`universities/{universityId}/`)
- Courses — add/edit/delete (existing `Course` model se link)
- Placement, Scholarships, Facilities forms
- Subscription page — current plan, expiry, renew button
- **Moderation UI** — jo fields review me jaate hain unpe "Pending approval" badge
- Admin: University Requests queue — domain flag, designation, authorization letter dikhe
- Admin: Subscriptions + Revenue screens

**Definition of done:** Subscription expire hone pe dashboard read-only ho jaye aur renew prompt dikhe.

---

## 4. Moderation — kaunsa field kaise

Ye product decision hai, code se zyada important. **Aapka product bharosemand information hai.**
Agar universities apne placement numbers khud publish karengi to site brochure ban jayegi.

| Turant live (self-serve) | Admin approval ke baad |
|---|---|
| Gallery images | Placement stats (package, %) |
| About / Vision / Mission | NAAC grade |
| Contact, address, phone | NIRF rank |
| Facilities, hostel info | Fees |
| Course descriptions | UGC / AICTE approvals |
| Faculty list | University name, slug |

**Implementation approach (v1):** `University` doc me ek `pendingChanges` object rakho. Sensitive field edit hone pe wahan jaye, aur `status` `needs_review` ho jaye — **ye status already exists**. Admin approve kare to `pendingChanges` merge ho jaye.

Alag `ModerationRequest` collection v1 me mat banao — ek hi source of truth (R1) rakhna aasaan rahega.

---

## 5. Timeline

### Week 1 — Contracts (teeno saath)

**Ye week code likhne ka nahi hai.** Agar ye theek se hua to baaki 5 weeks smooth jayenge.

- [ ] Data model freeze — `UniversityClaim`, `Subscription`, `User` me kya change hoga
- [ ] API contract likho — har endpoint ka request/response shape
- [ ] Moderation field list final karo (section 4)
- [ ] Razorpay test account + webhook URL setup
- [ ] C ke liye mock API responses ready — taaki wo A/B ka wait na kare

> **Sabse bada risk yahi hai.** Contract pehle fix nahi hua to C do baar UI banayega.

### Week 2-3 — Foundation

| A | B | C |
|---|---|---|
| Role + `UniversityClaim` model | `Subscription` model | Dashboard shell + routing |
| Signup API + domain signal | Razorpay order create | Profile editor form |
| Ownership middleware | Signature verification | Admin requests queue (mock data) |
| Admin approve/reject API | Webhook endpoint | |

**Checkpoint (Week 3 end):** A ka signup→approval flow Postman se end-to-end chale.

### Week 4 — Payment + Dashboard integration

| A | B | C |
|---|---|---|
| Team invite flow | Webhook idempotency | Real APIs se connect |
| Audit logging | Subscription gating middleware | Subscription page |
| | Renewal logic | Gallery upload |

**Checkpoint (Week 4 end):** Ek test university signup → approve → pay → dashboard tak pahunche.

### Week 5 — Moderation, notifications, admin

| A | B | C |
|---|---|---|
| `pendingChanges` merge logic | Expiry cron + warning emails | Moderation UI + badges |
| | Revenue APIs | Admin revenue screens |

### Week 6 — Hardening & pilot

**Sabse important week. Skip mat karna.**

- [ ] **Tenancy attack testing** — University A ke token se B ka data edit karne ki har koshish. Ye A ka kaam nahi, **kisi aur** ko karna chahiye
- [ ] Payment fraud testing — fake success, replayed webhook, tampered amount
- [ ] Expiry edge cases — expiry ke din, renewal after expiry, double payment
- [ ] Load check — 700 universities ke saath admin queries slow to nahi
- [ ] **Pilot: 2-3 friendly universities** ko onboard karo, real feedback lo
- [ ] Tab jaake public launch

---

## 6. Integration points (yahan cheezein tootengi)

| Kya | Kaun-kaun | Kab |
|---|---|---|
| JWT me `universityId` claim | A → B, C | Week 2 |
| Approval ke baad payment page redirect | A → B → C | Week 4 |
| Subscription status dashboard me | B → C | Week 4 |
| `pendingChanges` ka shape | A → C | Week 5 |

Har integration point pe **dono log ek saath baithkar** test karein. Alag-alag "mera side to chal raha hai" se kaam nahi banega.

---

## 7. Risk register

| Risk | Impact | Kya karna hai |
|---|---|---|
| **Tenancy leak** — ek university dusri ka data edit kar le | Catastrophic — trust khatam | R2 strictly. Week 6 me dedicated attack testing |
| **Fake payment** — bina paise subscription | Direct revenue loss | R3. Webhook + signature dono |
| **Fake claim** — student/competitor university claim kar le | Reputation | Domain signal + authorization letter + **university ki website pe listed number pe call** |
| **Data inflation** — university apne numbers badha de | Product credibility | Section 4 ki moderation |
| **Contract churn** — Week 1 me API fix nahi hua | 2-3 week delay | Week 1 seriously lo |
| **Scope creep** — subdomain/AI features beech me aa gaye | Launch late | Section 1 ka "out of scope" respect karo |

---

## 8. Verification trick (admin ke liye)

Approval **button dabane ka kaam nahi** hai, warna formality ban jayega.

Admin ke paas ye dikhna chahiye:
- Designation (Registrar / Admissions Head / Marketing Head)
- Email official domain ka hai ya free — **system khud flag kare**
- Authorization letter (university letterhead pe)

Aur asli check:

> Admin **university ki apni official website pe listed number** pe call kare — form me diye number pe **nahi**.

Fake claim karne wala form me apna number dalega. Website ka number uske control me nahi hai.
Ye ek call 99% fraud rok deti hai.

---

## 9. Open decisions (Week 1 me finalize karo)

1. **Ek university me kitne users?** — Recommendation: pehla banda claim kare aur approve ho, phir wo khud apni team invite kare (Google Workspace model). Admin ka kaam ek hi baar.
2. **Already claimed university ko koi aur claim kare to?** — Auto-reject mat karo. Admin ko dikhao — ho sakta hai purana banda job chhod chuka ho.
3. **Payment fail ho gaya but approve hai — kitne din tak retry kar sakta hai?**
4. **Refund policy** — Razorpay me refund flow chahiye ya manual?
5. **GST invoice** — dena hai to Week 1 me hi plan karo, baad me retrofit mushkil hai.

---

## Quick reference

**Sabse pehle:** Week 1 ke contracts. Sab kuch usi pe khada hai.
**Sabse khatarnak:** Tenancy leak (R2) aur fake payment (R3).
**Sabse zyada bhula jaane wala:** R5 — expire hone pe public page zinda rehna chahiye.
