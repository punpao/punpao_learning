# Day 0: AWS account and identity

> **Date:** 2026-11-23 · **Goal:** know who you are in AWS and why.

## TL;DR
- An **AWS account** is a box with its own bill. Yours: `875706244209` (the "Fresh Deploy" project = this account).
- **IAM** answers two questions: **authentication** (who are you?) and **authorization** (what may you do?).
- **Root user**: the account owner. Only for rare account-level tasks.
- **IAM user**: a *permanent* identity in one account; can have a password and access keys that don't expire by themselves.
- **IAM role**: an identity with permissions that someone or something *assumes*; you get a **temporary session** (here up to 12 h). The session expires, the role does not.
- This account has **0 IAM users**. You sign in with `aws login` and assume `AccountFullAccessRole` (AdministratorAccess).
- The **parent organization** (management account `097083345455`) is your own.
- An **SCP** (service control policy) is a fence set by the parent: it can **explicitly deny** actions even for an admin role (e.g. `iam:ListAccountAliases`).

## Weak spot
- ❌ "A role is a label assigned to a user" (the app RBAC model, like `role: 'admin'` in an Express app)
  → ✅ In AWS, a role is its own identity that you *put on* for a while; its trust policy says who may assume it. Giving many users the same permissions is what **groups** are for.
