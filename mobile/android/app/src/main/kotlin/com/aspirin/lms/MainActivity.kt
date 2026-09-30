package com.aspirin.lms

import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val PIP_CHANNEL = "com.aspirin.lms/pip"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, PIP_CHANNEL).setMethodCallHandler { call, result ->
            if (call.method == "enterPip") {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val aspectRatioNumerator = call.argument<Int>("numerator") ?: 16
                    val aspectRatioDenominator = call.argument<Int>("denominator") ?: 9
                    
                    val params = PictureInPictureParams.Builder()
                        .setAspectRatio(Rational(aspectRatioNumerator, aspectRatioDenominator))
                        .build()
                    
                    val entered = enterPictureInPictureMode(params)
                    result.success(entered)
                } else {
                    result.error("UNSUPPORTED", "PiP requires Android Oreo (API 26) or higher", null)
                }
            } else {
                result.notImplemented()
            }
        }
    }
}
