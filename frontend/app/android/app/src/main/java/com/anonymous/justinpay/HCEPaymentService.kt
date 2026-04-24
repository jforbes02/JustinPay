package com.anonymous.justinpay

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

class HCEPaymentService : HostApduService() {

    companion object {
        const val PREFS_NAME = "JustinPayNFC"
        const val PAYLOAD_KEY = "nfc_payload"
        private val SW_OK = byteArrayOf(0x90.toByte(), 0x00.toByte())
        private val SW_FAIL = byteArrayOf(0x6F.toByte(), 0x00.toByte())
    }

    override fun processCommandApdu(commandApdu: ByteArray, extras: Bundle?): ByteArray {
        if (commandApdu.size < 2) return SW_FAIL

        return when (commandApdu[1]) {
            0xA4.toByte() -> SW_OK  // SELECT AID — acknowledge
            else -> {
                // Any other command — return the payload
                val payload = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                    .getString(PAYLOAD_KEY, null)
                    ?: return SW_FAIL
                payload.toByteArray(Charsets.UTF_8) + SW_OK
            }
        }
    }

    override fun onDeactivated(reason: Int) {}
}
