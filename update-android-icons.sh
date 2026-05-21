#!/bin/bash

# Generate launcher icons in all required densities
echo "Generating Android launcher icons from public/icons/icon-512.png..."

# Root android folder
convert public/icons/icon-512.png -resize 48x48 android/mdpi/ic_launcher.png
convert public/icons/icon-512.png -resize 72x72 android/hdpi/ic_launcher.png
convert public/icons/icon-512.png -resize 96x96 android/xhdpi/ic_launcher.png
convert public/icons/icon-512.png -resize 144x144 android/xxhdpi/ic_launcher.png
convert public/icons/icon-512.png -resize 192x192 android/xxxhdpi/ic_launcher.png

# Mipmap versions (Android Studio project structure)
convert public/icons/icon-512.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
convert public/icons/icon-512.png -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
convert public/icons/icon-512.png -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert public/icons/icon-512.png -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert public/icons/icon-512.png -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

echo "✓ Android launcher icons updated successfully!"
echo "The Android app will now use the same logo as the web app."
