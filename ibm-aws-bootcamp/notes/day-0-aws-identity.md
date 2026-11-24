# Day 0: AWS account and IAM basics

> **Date:** 2026-11-23 · **Goal:** understand who you are in AWS before building anything

## TL;DR
- An AWS account is a box: everything you create lives in it, and its bill goes to it. Mine: 8757XXXXXXXX ("Fresh Deploy").
- IAM = the guard. Every request: **authentication** (who are you?) then **authorization** (are you allowed?).
- Root user = owner, can do everything; never for daily work.
- IAM user = permanent password/keys; keys work until deleted (leak risk).
- IAM role = permissions with no permanent keys; you assume it and get keys that expire in hours.
- I sign in to the console → AWS gives me role `AccountFullAccessRole`. `aws login` gives the terminal the same role with short-lived keys.
- My account sits under a parent account (AWS Organizations). Root is held there.

## Ways to sign in (worst → best)
```text
 a) Root user                           ❌
 b) IAM user + permanent access keys    ⚠️ old way
 c) IAM Identity Center (company SSO)   ✅ big companies
 d) Console sign-in → role + aws login  ✅ ← me
```

## My setup
```text
 Me (browser sign-in to "Fresh Deploy")
        ▼
 role AccountFullAccessRole (full power, short-lived)
        ├── Console
        └── Terminal via `aws login`
```

## Verified on my Mac (read-only, 2026-11-23)
- CLI: one default profile using `aws login` (login_session), region ap-southeast-2. No ~/.aws/credentials, no access keys anywhere.
- Account 8757XXXXXXXX is a member of an AWS Organization. The parent (management) account 0970XXXXXXXX is registered to my own email, so the parent is mine.
- Role AccountFullAccessRole = AdministratorAccess, AWS-managed, sessions up to 12 h.
- IAM: 0 users, 0 groups, no Identity Center. 11 roles, all AWS-made.
- An **SCP** (service control policy) from the parent blocks some actions even for admins. "explicit deny in a service control policy" errors come from it, not from my role.

## What is a "Project"?
- In AWS's new console, a "Project" is a friendly name for an AWS account. "Fresh Deploy" = account 8757XXXXXXXX. The parent account (0970…) is mine and pays the bills. (My reading from what we checked, not an official AWS definition.)
```text
 Me (AWS sign-in)
   └── Parent account 0970…  (billing, org)
         └── Project "Fresh Deploy" = account 8757…  (build here)
```

## Check, round 1
**Q:** Difference between IAM user and IAM role; which one am I using?
**My answer:** IAM user is a credential of a user and IAM role is a set of role assigned to each user. 1 user can have more than 1 role and the role may expire after a few hours.
**Feedback:** User part right (named identity, permanent credentials). Role part uses the app-RBAC model (role = label on a user), which is not how AWS works: a role is its own identity that someone temporarily *becomes* (assumes); while wearing it, AWS sees the role, not you (`assumed-role/...` in the ARN). The *session* expires, not the role. Services (Lambda, ECS) wear roles with no user at all. Groups are how you give many users the same permissions. Missed: which one am I using (a role).

## Check, round 2 (Day 1 warm-up)
**Q:** Lambda saves orders to a DB, no person involved. IAM user with keys or role? Why?
**My answer:** You should use role to assume to user in order to control access to aws lambda service.
**Feedback:** Right choice (role). Wrong direction: the *function itself* wears the role (its **execution role**); the role says what the function may do (e.g. write to the orders table), not who may use Lambda. Missing why: a function can't type a password; AWS hands it temporary keys on every run, so no permanent keys live in code. Weak spot, revisit Day 2 warm-up.
