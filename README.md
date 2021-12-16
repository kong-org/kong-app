# Building

First, install a bunch of stuff:

    brew install node
    brew install watchman
    brew tap AdoptOpenJDK/openjdk
    brew cask install adoptopenjdk8

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

To run on ios,

      npx pod install
      
Inside of Xcode's Pod folder,

    remove all Compiled Sources other than `CocoaAsyncSocket-dummy`
    
![image](https://i.imgur.com/xiCUI0M.png)

    npx react-native run-ios

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

Port forwarding for android server.

    echo "
    rdr pass inet proto tcp from any to any port 8081 -> 127.0.0.1 port 8081
    " | sudo pfctl -ef -
