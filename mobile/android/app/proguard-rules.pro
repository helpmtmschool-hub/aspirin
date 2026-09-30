# Flutter ProGuard / R8 Rules for Aspirin LMS

# Keep Flutter Engine & JNI
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# media_kit & MPV Native Video Player
-keep class com.alexmercerind.media_kit.** { *; }
-keep class com.alexmercerind.mediakitvideo.** { *; }
-keep class com.alexmercerind.media_kit_libs_android_video.** { *; }
-keep class * implements com.alexmercerind.media_kit.** { *; }
-keepclasseswithmembernames class * {
    native <methods>;
}

# pdfrx & PDFium Engine
-keep class com.github.espresso3389.pdfrx.** { *; }
-keep class com.github.espresso3389.pdfrx_flutter.** { *; }

# Flutter Secure Storage & KeyStore
-keep class androidx.security.crypto.** { *; }
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Background Downloader & WorkManager
-keep class com.bbflight.background_downloader.** { *; }
-keep class androidx.work.** { *; }

# PointyCastle & BouncyCastle Crypto
-dontwarn org.bouncycastle.**
-keep class org.bouncycastle.** { *; }

# Keep Attributes
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes Signature
-keepattributes EnclosingMethod
-keepattributes InnerClasses
