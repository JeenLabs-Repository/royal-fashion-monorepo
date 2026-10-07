# Phase 5 Research — Hard Cutover

**Confidence:** HIGH (mechanical removal once bridges proven)  
**Distilled from:** STACK removal checklist, PITFALLS dual-IdP, REQUIREMENTS CUT-*

## Goal

Eliminate Medusa password IdP entirely for customers and Admin after Supabase bridges work.

## Removal checklist

| Remove | Location |
|--------|----------|
| `emailpass` in authMethodsPerActor / Auth providers | `apps/backend/medusa-config.ts` |
| Any remaining `emailpass` strings in storefront | `apps/storefront` grep clean |
| Stock Admin password login reachability | redirect to supabase-login or disable |
| Medusa verify/reset leftovers | storefront routes |
| Docs that say `medusa user -p` is login credential | README/runbooks |

## JWT invalidation

- Ensure logout clears `_medusa_jwt`
- On deploy/cutover: optional `JWT_SECRET` rotate invalidates all Medusa JWTs
- Middleware/account pages: if Medusa token invalid, force Supabase re-login + exchange

## Messaging

Account login/register surfaces: "Previous passwords no longer work — create a Supabase account or reset via email" (no hash migration).

## Out of scope

v2 kill-switch metrics; password import tooling.
