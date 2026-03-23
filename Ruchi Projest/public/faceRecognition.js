// Bug 8 Fix: Wrap everything in DOMContentLoaded so it doesn't crash on pages without #video
document.addEventListener("DOMContentLoaded", function () {

const video = document.getElementById("video");
if (!video) return; // No video element on this page — bail out safely

// ── Start Face Recognition (load models + camera) ──────────
let matchedStudent = null;

// Helper to show on-page status messages instead of alerts
function showStatus(msg, type = "info") {
  const el = document.getElementById("attendanceStatus");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
  
  if (type === "success") {
    el.style.color = "#22c55e";
    el.style.background = "rgba(34,197,94,0.08)";
    el.style.borderColor = "rgba(34,197,94,0.2)";
  } else if (type === "error") {
    el.style.color = "#ffb347";
    el.style.background = "rgba(255,179,71,0.08)";
    el.style.borderColor = "rgba(255,179,71,0.2)";
  } else {
    el.style.color = "#e2e2eb";
    el.style.background = "rgba(255,255,255,0.05)";
    el.style.borderColor = "rgba(255,255,255,0.1)";
  }
}

// ── Start Face Recognition (load models + camera) ──────────
window.startFaceRecognition = async function () {
  showStatus("⏳ Loading AI models...");
  await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
  await faceapi.nets.faceRecognitionNet.loadFromUri('./models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('./models');

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => { 
      video.srcObject = stream; 
      showStatus("📷 Camera active. Align your face.");
    })
    .catch(err => {
      console.error(err);
      showStatus("❌ Camera permission denied", "error");
    });
};

// ── Live face overlay on video play ─────────────────────────
video.addEventListener("play", async () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.querySelector(".camera-container").append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
  }, 100);
});

// ── Capture face descriptor for the last registered student ─
// Bug 7 Fix: Update existing student's descriptor instead of pushing a duplicate
window.captureFace = async function () {
  const students = JSON.parse(localStorage.getItem("students")) || [];

  if (students.length === 0) {
    showStatus("⚠️ Register student first", "error");
    return;
  }

  const lastStudent = students[students.length - 1];

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    showStatus("⚠️ No face detected", "error");
    return;
  }

  const descriptor = Array.from(detection.descriptor);

  // Find existing student by name and update descriptor, don't push duplicate
  const existing = students.find(s => s.name === lastStudent.name);
  if (existing) {
    existing.descriptor = descriptor;
  } else {
    students.push({ name: lastStudent.name, roll: lastStudent.roll, dept: lastStudent.dept, descriptor: descriptor });
  }

  localStorage.setItem("students", JSON.stringify(students));
  showStatus("✓ Face registered for " + lastStudent.name, "success");
};

// ── Recognize face and mark attendance ──────────────────────
// Bug 1 Fix: Re-fetch full student object from localStorage so roll/dept are always present
window.recognizeFace = async function () {
  const students = JSON.parse(localStorage.getItem("students")) || [];
  const btn = document.getElementById("markAttendanceBtn");
  
  if (btn) btn.style.display = "none";
  matchedStudent = null;

  if (students.length === 0) {
    showStatus("⚠️ No registered students", "error");
    return;
  }

  showStatus("🔍 Scanning face...");

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    showStatus("⚠️ No face detected", "error");
    return;
  }

  const faceDescriptor = detection.descriptor;
  let bestMatch = null;
  let bestDistance = 0.6;

  students.forEach(student => {
    if (!student.descriptor) return;
    const distance = faceapi.euclideanDistance(
      faceDescriptor,
      new Float32Array(student.descriptor)
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = student;
    }
  });

  if (bestMatch) {
    // Re-fetch from localStorage to guarantee we have roll/dept
    const freshStudents = JSON.parse(localStorage.getItem("students")) || [];
    matchedStudent = freshStudents.find(s => s.name === bestMatch.name) || bestMatch;
    
    showStatus("✓ Face Recognized: " + matchedStudent.name, "success");
    if (btn) btn.style.display = "inline-block";
  } else {
    showStatus("❌ Face not recognized", "error");
  }
};

// ── Confirm and Save attendance record ──────────────────────
window.confirmAttendance = function() {
  if (!matchedStudent) return;
  
  let attendance = JSON.parse(localStorage.getItem("attendance")) || [];

  const record = {
    name: matchedStudent.name,
    roll: matchedStudent.roll,
    dept: matchedStudent.dept,
    time: new Date().toLocaleString()
  };

  attendance.push(record);
  localStorage.setItem("attendance", JSON.stringify(attendance));
  
  showStatus("✅ Attendance marked for " + matchedStudent.name, "success");
  
  const btn = document.getElementById("markAttendanceBtn");
  if (btn) btn.style.display = "none";
  matchedStudent = null;
}

}); // end DOMContentLoaded
