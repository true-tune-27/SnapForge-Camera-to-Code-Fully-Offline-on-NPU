# Office Kit Transport

This directory contains the `OfficeKitTransport` shim, which bridges SnapForge to the iQOO Office Kit SDK for secure, local PC-to-phone communication.

## Implementation Guide

Because we do not have access to the Office Kit SDK in this environment, `officekit.ts` is currently stubbed with `// TODO(officekit)` markers. A human developer with SDK access must complete the bindings.

### Required SDK Bindings

1. **Pairing & Secrets (`pair`)**
   - Bind to the SDK's pairing/discovery method.
   - You must obtain the paired device's name and establish a shared secret (`Buffer` or byte array) to satisfy the `PairedDevice` interface.

2. **Channel 1: Index Transfer (`sendIndex`)**
   - Bind to the SDK's method for sending data from the PC to the phone.
   - The payload is a Gzipped JSON buffer containing the repository index.

3. **Channel 2: Forge Payload (`onForge`)**
   - Bind to the SDK's listener for incoming messages from the phone.
   - When the phone sends a Forge request (containing the layout JSON and any patch operations), deserialize it into a `ForgePayload` and trigger the callback.

4. **Channel 3: Screen Mirroring (`mirrorPreview`)**
   - Bind to the SDK's video streaming capability.
   - You must sink the provided `ReadableStream` of the PC's preview window to the phone.

5. **Channel 4: Clipboard Sync (`clipboard`)**
   - Bind `clipboard.read()` and `clipboard.write()` to the SDK's cross-device clipboard APIs to allow seamless copy-pasting of tokens/text between the PC and the phone.

Ensure all implementations adhere to the security invariant: **no outbound internet connections are allowed.**
