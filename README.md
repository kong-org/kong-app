# Building

First, install a bunch of stuff:

    brew install node
    brew install watchman
    brew tap AdoptOpenJDK/openjdk
    brew cask install adoptopenjdk8
    npm install -g react-native-cli

You will also need to install the Xcode Command Line Tools. Open Xcode, then choose "Preferences..." from the Xcode menu. Go to the Locations panel and install the tools by selecting the most recent version in the Command Line Tools dropdown.

Next, clone repo and run the following:

    watchman watch-del-all
    rm package-lock.json
    rm -rf /tmp/metro-bundler-cache-*
    rm -rf /tmp/haste-map-react-native-packager-*
    rm -rf node_modules
    npm install
    ./node_modules/.bin/rn-nodeify --hack --install

*Note that /tmp may be identified by $TMPDIR on some systems*

To run on ios, either start the simulator

    react-native run-ios

or build to use on the device using xcodeproj in ./ios/ folder.

To run on android with the device connected:

    npx react-native run-android

or build using gradle; Go to ./android/ and run:

    ./gradleW assembleRelease

When running with a connected device, run

    adb logcat *:S ReactNative:V ReactNativeJS:V

to get the log output of the app running on the device. This is extremely helpful to localize issues.

# Strings

Dependent on contracts, there are some important strings to consider: the Kong registry contracts, the individual Kong escrow contracts and the Kong minting contracts ("entropy").

See `knownValues.js` and `defaultSettings.js` for more of these.

# Notes

When updating packages, start out by running

    npm outdated

Then try to update package by package, including a full rebuilt (see above) to make sure each updated package works.

You might also have to remove .git files in some of the submodules, e.g.:

    rm -rf ./node_modules/react-native-udp/.git

On iOS you may need to enable legacy build phases:

    https://freakycoder.com/react-native-notes-14-cycle-inside-exampletests-building-could-produce-unreliable-results-issue-5b7ff4dc89ad

In case of trouble with fonts.

    https://medium.com/react-native-training/react-native-custom-fonts-ccc9aacf9e5e

See also:

    react-native link react-native-vector-icons

The `react-native-mmkv-storage` lib might need a custom `cmake` version set in the `node_modules` `build.gradle` file. See https://github.com/ammarahm-ed/react-native-mmkv-storage/issues/67 for more on this. Likewise the `pods` version may need to be manully changed to `10.0` or higher on the specific `react-native-mmkv-storage` pod.

Note that we currently need to monkey patch the `build.gradle` for this library on every update. See https://github.com/ammarahm-ed/react-native-mmkv-storage/issues/67 for more on this.

Port forwarding for android server.

    echo "
    rdr pass inet proto tcp from any to any port 8081 -> 127.0.0.1 port 8081
    " | sudo pfctl -ef -
