# Alchemy Shop: mobile

Benchmark app for Alchemist-QA. Bare React Native, Android and iOS.

**It contains seeded defects on purpose. Do not fix them.** The requirements it should meet are in [`../REQUIREMENTS.md`](../REQUIREMENTS.md).

It needs the API from `../api` on port 3001. The Android emulator reaches it at `10.0.2.2:3001`.

Build a release APK that carries its own JavaScript bundle:

```bash
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64
```

The release build is signed with the debug keystore that the React Native template ships. That is fine for a benchmark and must never be done for a real app.
