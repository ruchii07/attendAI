// Bug 5 Fix: Removed DOMContentLoaded stat-update code that targeted .card1/.card2/.card3 h3
// Those elements now have IDs and are updated by loadTeacherDashboard() in index.html

function goRegister() {
  window.location.href = "register.html";
}

function goAttendance() {
  window.location.href = "attendance.html";
}

function goReport() {
  window.location.href = "report.html";
}

function startFingerprint() {
  // Logic replaced by fingerprint.js and showFingerprintStatus
}