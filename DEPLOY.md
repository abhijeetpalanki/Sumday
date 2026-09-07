# Shipping Sumday — the runbook

Written Sunday 6 September 2026. Times are what you should actually expect, not
best cases.

## The situation, confirmed

Play Console has been checked. The 2022 developer account is **closed**:

> **Status:** Account closed
> **Closed:** Mar 13, 2024
> **Warning sent:** Jan 8, 2024 · **Warning deadline:** Mar 8, 2024
> *"Your developer account has been closed because it was not being used…
> The developer account registration fee is not refundable. To start
> publishing apps on Google Play, create a new account."*

Two things follow from that wording, and both matter.

**It is an inactivity closure, not a policy termination.** The account was
registered on 7 Oct 2022, never had an app published, and was closed under the
inactive-accounts policy. That distinction is the important one: a termination
for policy violation bars you from registering again and gets related accounts
banned too. This does not. Google's own console is *instructing* you to create
a new account, so doing so carries no ban risk.

**Don't chase reinstatement.** Appeals for inactivity closures realistically
only succeed for accounts with live apps, meaningful installs, and a closure
inside the last ~180 days. Yours has none of those and is two and a half years
old. The console has already given the answer. Spending three days waiting on
a support reply costs more than the $25.

### What that means for the timeline

A new account registered today is post-13-Nov-2023, so the **12 testers for 14
continuous days** closed-testing requirement applies in full. The old account's
exemption is gone.

| Gate | Realistic |
|---|---|
| Apple enrollment → review → **App Store live** | **Wed 9 – Fri 11 Sep** |
| New Play account verified | Mon 7 – Tue 8 Sep |
| 12 testers opted in, 14-day clock runs | ends ~Sun 21 Sep |
| Play production review (new account, up to 7 days) | **Mon 22 – Mon 29 Sep** |

So: **iOS is your launch.** Play follows about three weeks later. Plan the
announcement around the App Store date and treat Play as a second wave.

### The one lever, and why it loses

Organization accounts are exempt from the 12-tester rule entirely. But an
organization account needs a D-U-N-S number as a legal entity: free, and up to
30 days to issue, plus 1–3 weeks of Google verification on top. That is 4–8
weeks against 14 days. **Register as an individual** and take the tester
requirement.

You have **no Apple Developer account** — there is nothing from Apple in your
mail at all — so that $99 enrolment is genuinely step one for iOS.

---

## Step 1 — Both registrations (do this first, ~30 min)

Nothing else today is on the critical path. These two are.

1. **New Play account — on a NEW Google account.** $25.

   ajpalanki@gmail.com cannot be used. A Google account holds exactly one
   developer account, the closed one occupies that slot permanently, and the
   signup page just redirects back to the closure notice. The closed account
   cannot be deleted to free the slot.

   - Create a dedicated Google account for this. It **owns the app
     permanently**, receives payouts, and cannot be swapped later — so make it
     something durable and professional, not a throwaway. `abhiyourpal@gmail.com`
     or similar matches the developer name and the bundle ID.
   - Set its recovery email to ajpalanki@gmail.com, add a recovery phone, and
     turn on 2FA **before** paying. Losing this login means losing the app;
     Google has no recovery path that hands a developer account to a different
     Google account.
   - Register as an **individual**, not an organization (see above).
   - Developer name: `AbhiYourPal` — public on every listing.
   - Identity verification needs a government ID and a card **in your own legal
     name**. Registering again after an inactivity closure is exactly what the
     console instructed, so there is nothing to explain or disclose.
   - Verification takes hours to a couple of days, and **you cannot upload a
     build until it clears** — this is the gate on the 14-day clock.

   Then two things so Play mail can never be missed again:
   - In the new Gmail: **Settings → Forwarding → forward to
     ajpalanki@gmail.com**, keeping a copy. Google sends closure warnings and
     policy notices to the *account owner* address, and missing the January
     2024 warning is precisely what killed the last account.
   - In Play Console: **Users and permissions → Invite user →
     ajpalanki@gmail.com as Admin**, so you can operate the console from your
     main login without switching accounts.

   The account in use is `abhiyourpalapps@gmail.com`.
2. **Apple Developer Program** — https://developer.apple.com/programs/enroll/ —
   $99/year. You don't have one, so this is a fresh enrolment.
   - Your Apple Account's name **must exactly match your legal name**. A
     nickname triggers manual review and turns 48 hours into two weeks.
   - Pay with a card in your own name. Someone else's card prompts an ID request.
   - If it is still pending after 48h, phone Apple Developer Support and request
     a callback with your Enrollment ID. The web form is dramatically slower.

While those verify, do everything below.

---

## Step 2 — Get the project running (~15 min)

You do **not** need a Mac. EAS builds iOS in the cloud.

```bash
cd sumday
npm install
npm run setup        # adds the native deps at SDK-57-correct versions
npm run verify       # proves a year of puzzles are solvable — should print ALL CHECKS PASSED
npm run typecheck
npx expo-doctor      # catches version mismatches before a 20-minute build does
```

`npm run setup` runs `expo install` rather than pinning versions in
`package.json`, so Expo resolves each native module to the exact version SDK 57
expects. Do not skip it and do not hand-edit those versions.

Then run it on your Samsung phone:

```bash
npx expo start
```

Scan the QR with Expo Go. Play a full daily. Check specifically:

- [ ] Tap tile → operator → tile merges correctly
- [ ] Illegal moves (3 − 8, 7 ÷ 2) shake and buzz instead of applying
- [ ] Undo and Reset behave
- [ ] Hint once → two tiles pulse. Hint again → the operator is named and its
      button outlines. Counter drops 3 → 2 → 1
- [ ] Deliberately wreck a board (multiply everything together) → the red
      "no way to reach the target" strip appears on its own, and costs no hint
- [ ] A hinted solve shows 🟨 not 🟩 on the results grid
- [ ] Finishing all 5 shows the results grid, and Share opens the sheet
- [ ] Force-quit and reopen mid-run — your progress **and** remaining hints are
      still there
- [ ] Background the app for a minute mid-puzzle — the timer does **not** jump

> Reanimated 4 animations need a real build, not Expo Go, on some SDK
> combinations. If tiles pop rather than animate in Expo Go, ignore it — check
> again on the preview build in Step 4.

---

## Step 3 — Set your identifiers (~5 min)

In `app.json`, confirm or change:

- `expo.ios.bundleIdentifier` → currently `com.abhiyourpal.sumday`
- `expo.android.package` → same

These are **permanent**. You cannot change either after the first upload
without creating a brand new store listing.

Then:

```bash
npm install -g eas-cli
eas login
eas init            # writes the real projectId into app.json
```

---

## Step 4 — Android build and the Play clock (~1 hour, do this before iOS)

```bash
eas build --platform android --profile production
```

~15–25 minutes in the queue. Produces an `.aab`.

Meanwhile, in Play Console:

1. **Create app** — name `Sumday`, app not game? Choose **Game → Puzzle**.
   Free. Confirm the declarations.
2. Fill **Store listing** — copy is ready for you in `STORE-LISTING.md`.
3. Upload `assets/play-feature-graphic.png` as the feature graphic.
4. **Screenshots** — you need at least 2 phone screenshots. Capture them from
   your phone: Home, a mid-puzzle board, and the results grid. Power + Volume
   Down on Samsung. Three good ones beat eight mediocre ones.
5. **App content** — work through every item, they all block release:
   - Privacy policy URL — you need one. `STORE-LISTING.md` has the text; put it
     on a GitHub Pages page or any static host and paste the URL.
   - **Data safety** → *No data collected. No data shared.* True: the app has
     no network code and no analytics.
   - Content rating questionnaire → Everyone.
   - Target audience → 13+ (choosing under-13 pulls in Families policy review
     and slows you down for no benefit).
   - Ads → No.
   - Government app → No.
6. **Upload the build.** Start with **Testing → Internal testing** whichever
   track you're on: it's instant, needs no review, and lets you check the real
   release build on your own phone before anyone else sees it. Install it,
   play a daily end to end.

7. **Start the 14-day clock.** Go to **Testing → Closed testing → Create a new
   release** and set `submit.production.android.track` in `eas.json` to
   `"alpha"`.
   - Create a **Google Group** (groups.google.com) for testers and point the
     track at that email list, so adding people later doesn't need a new
     release.
   - **Recruit 12 testers.** They must each open the opt-in link, join, and
     install — and stay opted in for 14 continuous days; if someone drops out
     the clock resets. Get 15 so you have slack.
   - Google counts testers who have **opted in**, so chasing people to
     actually accept the invite is the real work, not sending it. Friends,
     family, coworkers, your Discord.
   - Tester-swap communities exist, but Google has been rejecting production
     applications that look like reciprocal-testing rings, so real people who
     open the app are the safer route.

   Note the clock cannot start until identity verification clears and the
   build is live on the closed track. If verification runs into Monday, the
   14 days start Monday. Nothing you can do but front-load Step 1.

Once the build is uploaded you can automate future submissions:

```bash
eas submit --platform android --profile production
```

This needs a Play service account JSON at `./play-service-account.json`
(Play Console → Setup → API access). It is gitignored. Never commit it.

---

## Step 5 — iOS build and TestFlight (~1 hour, once enrollment clears)

```bash
eas build --platform ios --profile production
```

EAS will offer to generate the distribution certificate and provisioning
profile for you. Say yes to all of it — that is the whole reason you don't need
a Mac.

In App Store Connect:

1. **My Apps → +** → New App. Pick the bundle ID EAS registered.
2. Fill the listing from `STORE-LISTING.md`.
3. **Screenshots** — Apple requires 6.9" iPhone screenshots. You have no
   iPhone, so use the iOS Simulator... which needs a Mac. Two ways around it:
   - Ask anyone with an iPhone to install your TestFlight build and send you
     three screenshots, or
   - Take your Android screenshots and reframe them at 1320×2868. Apple accepts
     correctly-sized images; they just have to depict the real app.
4. **App Privacy** → *Data Not Collected*.
5. **Age rating** → 4+.
6. Export compliance is already answered for you —
   `ios.config.usesNonExemptEncryption: false` is set in `app.json`, so you
   won't be stopped by that question on every upload.

```bash
eas submit --platform ios --profile production
```

Fill the three `REPLACE_WITH_...` values in `eas.json` first (your Apple ID
email, the App Store Connect app ID, and your Team ID).

Then in App Store Connect: add the build to the version, and **Submit for
Review**. Choose *Automatically release* so it goes live the moment it passes.

---

## The rejection risks, ranked

**1. Guideline 4.3 — Spam (the real one).** Apple rejects simple puzzle games
from new accounts that look like template output. What protects you: the daily
seeded puzzle with a streak and share grid, a distinct visual identity, an
endless mode, a two-level hint system with automatic dead-end detection, and a
real in-app tutorial. What would hurt you: shipping under a generic name like
"Math Puzzle Game", or a listing full of keyword soup. Keep the listing human.

**2. Guideline 2.1 — App completeness.** Reviewers reject games whose rules
they can't work out. The How-to-play sheet auto-shows on first launch, which is
exactly why it's there. Don't remove it.

**3. Play — Data safety mismatch.** Declaring "no data collected" while an SDK
quietly phones home is an instant rejection. You have no analytics SDK. Keep it
that way until after launch; adding one later means updating the declaration.

**4. Play — new-account extended review.** Your account is brand new, so
budget up to 7 days after applying for production access. Nothing to be done
about it but expect it.

---

## After it's live

The share grid is the only growth loop in the app, and it currently has no
link in it. Once the store URLs exist, set `SHARE_URL` in `src/share.ts` and
ship an update — a share card with nothing to tap is a wasted impression.

Version bumps for future releases: `eas.json` sets
`appVersionSource: "remote"` with `autoIncrement`, so EAS handles build
numbers. Bump `expo.version` in `app.json` yourself for user-visible versions
(1.0.0 → 1.0.1).

---

## Don't let this one die too

The 2022 account was closed under the inactive-accounts policy: registered,
never published, closed 18 months later. The new one is subject to exactly the
same rule — an account with no app submitted within a year gets closed, and the
$25 is not refunded.

Publishing Sumday clears it. But if you ever step away from Play for a stretch,
the two things that keep an account alive are having a published app and
keeping the contact details in Account settings verified. Warnings go out at
60, 30 and 7 days before closure — to the account owner's email, which is now
the new Google account, which is why inviting your main address as Admin
matters.

---

## Why there is no EAS Update (deliberate)

`eas build` offers to install `expo-updates` and configure EAS Update. It was
installed once and then removed on purpose.

With it, the app calls `u.expo.dev` on every launch carrying a random install
ID. That turns the Data safety answer from *no data collected* into a
"Device or other IDs" disclosure, and makes the store copy's "no network
requests at all" untrue. A Data safety declaration that doesn't match actual
app behaviour is one of the most common Play rejections, and this is a first
submission on a brand-new account.

The trade was worth taking because over-the-air updates mostly pay off when
you can DETECT problems, and v1 ships with no crash reporting and no
analytics — a bug would reach you through a store review either way. The
engine, which is the part that could silently produce a wrong puzzle, is the
part that is verified.

Add it in 1.0.1, together with crash reporting, and update both the privacy
policy and the Data safety form in the same release.
