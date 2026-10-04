# AI Tool Boundary Readiness

The AI service must not access operational data directly. Production readiness treats AI actions as ready only when the boundary below is preserved:

```text
FastAPI AI service
-> short-lived authorized context
-> Tool Gateway
-> server-side authorization and risk policy
-> application service
-> domain/database
```

## Required Evidence

- Tool calls include a request or correlation id.
- Read-only tools can execute only with authorized context.
- Operational writes require clear intent.
- Relevant, financial or sensitive operations require confirmation.
- Confirmed actions use pending action or confirmation token semantics.
- Tool execution is auditable with sanitized metadata.

## Provider-Dependent Manual Check

Before production release with a real AI provider:

1. Use a non-production tenant and non-production provider token.
2. Ask for availability.
3. Ask for a booking that requires a tool call.
4. Confirm the action only after the system presents the pending action.
5. Record request id, conversation id and audit id in the release notes.
6. Verify no raw prompt, provider token or tenant-private payload is logged.
