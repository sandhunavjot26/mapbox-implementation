FIGMA DESIGN RULES (STRICT)

1. Figma is the single source of truth for UI.

2. Always extract from Figma before writing code:
   - Font size
   - Font weight
   - Line height
   - Colors (hex or rgba)
   - Spacing (margin, padding, gaps)
   - Border radius
   - Component dimensions

3. Never guess design values.

4. If Figma node is provided:
   - Use it as exact reference
   - Do not approximate

5. Follow pixel-perfect implementation.

6. Use Tailwind classes mapped exactly:
   - Convert px → Tailwind scale where possible
   - If not possible → use arbitrary values (e.g. text-[13px])

7. Maintain consistent spacing scale:
   - Prefer multiples of 4 or 8
   - But prioritize Figma accuracy over system

8. Colors:
   - Use design tokens if available
   - Otherwise use exact hex from Figma

9. Typography:
   - Do not use default Tailwind sizes blindly
   - Match Figma exactly

10. Layout:
   - Respect alignment (flex/grid)
   - Maintain exact gaps and positioning

11. Do NOT:
   - Redesign
   - Improve UI
   - Add creativity
   - Change spacing or colors

12. If design is unclear:
   - Ask for clarification
   - Do not assume

13. Components must be reusable:
   - Extract repeated UI into components
   - Keep styles consistent

14. Follow dark tactical UI theme (command center style)

--------------------------------------------------
DESIGN TOKEN RULES (CRITICAL)
--------------------------------------------------

1. Always use tokens from `driifTokens.ts`.

2. Never create new tokens unless explicitly asked.

3. Before adding any style:
   - Check if a matching token already exists
   - Reuse it

4. Do not create duplicate tokens for:
   - same color
   - same font size
   - same spacing

5. If a close token exists:
   - Use the closest token
   - Do NOT create a new one for minor differences

6. If no token exists:
   - Use inline Tailwind value
   - Add comment: // TODO: token

7. Maintain consistency:
   - Same heading → same token
   - Same text color → same token
   - Same spacing → same token

8. Never hardcode values if token exists.

9. Tokens take priority over Tailwind defaults.

10. Do not modify existing tokens unless instructed.