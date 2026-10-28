# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who enjoy short daily puzzles on phones and computers. They want a challenge they can understand quickly, finish in a few minutes, and compare with friends.

## Product Purpose

Pinpoise is a daily physics game about locating the center of mass. The main game presents five flat mixed-material shapes with one scored attempt each. Pinpoise 3D is a separate daily mode with three volume-based objects that can be rotated before placing a surface pin.

## Positioning

The puzzle is solved by reading an object's geometry and material density rather than recalling trivia or guessing a word. The result is demonstrated through physical motion around the chosen pin.

## Operating Context

The game is free, browser-based, account-optional, and designed for quick daily play. A challenge is shared by everyone on the same date. Touch placement, pointer dragging, and keyboard operation are supported.

## Capabilities and Constraints

- The original two-dimensional daily game remains the default and must not be replaced by the 3D mode.
- Daily puzzles are deterministic so every player receives the same set.
- Each original shape allows one scored attempt. Pinpoise 3D also allows one scored attempt per object.
- Materials have distinct densities and the center-of-mass calculation must include shape geometry, holes, transformations, and density.
- The site is a Vite and TypeScript application deployed as a static Cloudflare Pages site, with optional Supabase authentication and Cloudflare functions.
- The game must remain practical on phone-sized screens and modest hardware.
- Famous copyrighted characters are not part of the generated catalogue. Original recognizable archetypes are allowed.

## Brand Commitments

- Product name: Pinpoise.
- Domain during the current trial: poisedaily.com.
- Voice: concise, direct, and playful without overexplaining.
- Preserve the existing Pinpoise mark, neutral palette, Bricolage Grotesque typography, and instrument-like controls.

## Evidence on Hand

The repository contains the working game, generated puzzle catalogue, physics and scoring tests, share output, authentication, analytics, favicon, and search metadata. Player feedback quoted in the project conversation is qualitative and must not be turned into fabricated usage metrics.

## Product Principles

- The puzzle itself is the priority. New features must deepen the balancing problem.
- Hard is good; arbitrary or impossible is not.
- Motion should explain the result of a pin placement.
- Material density must be visually legible before a player commits.
- Original character and object forms should feel recognizable without borrowing protected designs.

## Accessibility & Inclusion

Support keyboard input, visible focus states, reduced motion, high contrast, larger text, colour-blind-friendly scoring, and touch targets of at least 44 pixels.
