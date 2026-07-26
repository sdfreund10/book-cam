This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# BookCamera API

The app uses the BookCamera HTTP API as its only source of book data. Start the
API before launching the app:

```sh
cd ../api
npm run dev
```

Development builds derive the API hostname from Metro's bundle URL and connect
to port `4000`. This works with both the iOS simulator (`localhost:4000`) and a
physical iPhone on the same network (the Mac's Metro hostname on port `4000`).
If the API uses a different development port, update
`DEVELOPMENT_API_PORT` in `src/config/api.ts`.

Before making a release build, set `PRODUCTION_API_BASE_URL` in
`src/config/api.ts` to the API's public HTTPS origin. Release builds fail with a
clear configuration error instead of silently trying to connect to localhost.

Books previously saved in AsyncStorage are not automatically uploaded. The API
has no authentication or idempotency key with which to migrate records safely;
automatic migration could copy one device's books into the wrong shared
library or create duplicates after an interrupted migration.

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

To install on a **physical iPhone** instead of a simulator:

```sh
npm run ios:device
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

## `xcodebuild` requires Xcode, but active developer directory is Command Line Tools

If `npm run ios` fails with something like:

```text
xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer directory
'/Library/Developer/CommandLineTools' is a command line tools instance
```

React Native's iOS build needs the full **Xcode** app, not just Apple's Command Line Tools.

1. Install **Xcode** from the Mac App Store (or [developer.apple.com/xcode](https://developer.apple.com/xcode/)).
2. Open Xcode once and finish any first-launch setup (additional components, license).
3. Point the active developer directory at Xcode:

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

4. Confirm it worked:

```sh
xcode-select -p
# should print: /Applications/Xcode.app/Contents/Developer

xcodebuild -version
```

5. From `mobile/`, try again:

```sh
npm run ios
```

If you already had Xcode installed somewhere other than `/Applications/Xcode.app`, pass that path to `xcode-select -s` instead.

## Signing for "BookCamera" requires a development team

If `npm run ios:device` finds your phone but then fails with:

```text
error Signing for "BookCamera" requires a development team.
Select a development team in the Signing & Capabilities editor.
error Failed to build ios project. "xcodebuild" exited with error code '65'.
```

the Mac can see the device, but Xcode has no Apple ID / Development Team set up yet. This machine currently has **no code-signing identities** until you sign into Xcode once — that part can't be automated from the CLI.

### Fix (one-time, in Xcode)

1. From `mobile/`, open the workspace:

```sh
npm run ios:xcode
```

   (Or open `ios/BookCamera.xcworkspace` yourself — use the **`.xcworkspace`**, not the `.xcodeproj`.)

2. In Xcode: **Settings → Accounts** (or **Xcode → Settings → Accounts**) → **+** → sign in with your Apple ID.

3. In the project navigator, select **BookCamera** (blue project icon) → target **BookCamera** → **Signing & Capabilities**.

4. Check **Automatically manage signing**.

5. Under **Team**, choose your Personal Team (your Apple ID name). Xcode will create a free development cert + provisioning profile.

6. Bundle id is already set to `com.stevefreund.bookcamera`. If Xcode still complains it is taken, change it to something unique under **Bundle Identifier**.

7. On the phone (iOS 16+): **Settings → Privacy & Security → Developer Mode** → On → reboot if asked.

8. Keep the phone unlocked and plugged in, then from `mobile/`:

```sh
npm run ios:device
```

9. If the phone says the developer is untrusted after install: **Settings → General → VPN & Device Management** → trust your Apple ID / developer certificate, then open the app again.

After step 5, Xcode usually writes `DEVELOPMENT_TEAM` into the project so later CLI builds work without reopening Xcode.

## Running on a physical iPhone

`npm run ios` targets a **simulator** by default. If you have a phone plugged in but no simulator selected, you may see:

```text
error iOS devices or simulators not detected. Install simulators via Xcode or connect a physical iOS device
```

or:

```text
error No simulator available with udid "undefined".
```

### Target the phone explicitly

With the phone unlocked and trusted (tap **Trust** if prompted), from `mobile/`:

```sh
# first available physical device
npm run ios:device

# or pick by name (use the exact name shown in Xcode / Finder)
npx react-native run-ios --device "Stephen's iPhone (2)"

# or pick interactively
npx react-native run-ios --list-devices
```

Confirm the Mac can see the phone:

```sh
xcrun xctrace list devices
```

You should see your iPhone under **Devices**, not only under Simulators.

### Prefer USB for the first install

Wireless debugging can work later, but the first build/install is more reliable over a cable. Keep the phone unlocked while Xcode / the CLI installs the app.

If the build still fails after signing is configured, see [Signing for "BookCamera" requires a development team](#signing-for-bookcamera-requires-a-development-team) above.

For other issues, see the React Native [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
