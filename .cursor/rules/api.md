API & DATA SOURCE RULES (CRITICAL)

1. Always assume APIs are incomplete unless specified.
2. Separate mock data from API data strictly.

3. Use this structure:
   - /services/api → real API calls
   - /services/mock → mock generators
   - /adapters → normalize API + mock into same format

4. Never mix mock logic inside UI components.

5. Always define a contract (TypeScript type) before using data.

6. If API is missing:
   - Create mock generator matching expected schema
   - Mark clearly: // TODO: replace with API

7. UI must never depend on whether data is mock or real.

8. Use deterministic mock data for map visualization (not random every render).

9. Avoid refactoring when real API arrives → adapter should handle transition.