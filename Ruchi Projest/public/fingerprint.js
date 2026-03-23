async function startFingerprint() {
  try {
    const publicKey = {
      challenge: new Uint8Array(32),
      rp: { name: "AttendAI" },
      user: {
        id: new Uint8Array(16),
        name: "student",
        displayName: "Student"
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }]
    };

    const credential = await navigator.credentials.create({ publicKey });
    console.log("Fingerprint verified", credential);
    showFingerprintStatus("✓ Biometric verified successfully", "success");

  } catch (error) {
    console.error(error);
    if (
      error.name === "NotSupportedError" ||
      error.name === "NotAllowedError" ||
      error.name === "SecurityError"
    ) {
      showFingerprintStatus(
        "⚠️ No fingerprint hardware detected on this device",
        "warning"
      );
    } else {
      showFingerprintStatus("⚠️ Authentication failed. Try again.", "warning");
    }
  }
}