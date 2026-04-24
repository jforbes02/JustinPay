package com.anonymous.justinpay

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NfcPayloadModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "NfcPayload"

    @ReactMethod
    fun setPayload(payload: String) {
        reactApplicationContext
            .getSharedPreferences(HCEPaymentService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(HCEPaymentService.PAYLOAD_KEY, payload).apply()
    }

    @ReactMethod
    fun clearPayload() {
        reactApplicationContext
            .getSharedPreferences(HCEPaymentService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit().remove(HCEPaymentService.PAYLOAD_KEY).apply()
    }
}
