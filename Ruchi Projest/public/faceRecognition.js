// Bug 8 Fix: Wrap everything in DOMContentLoaded so it doesn't crash on pages without #video
document.addEventListener("DOMContentLoaded", function () {

const video = document.getElementById("video");
if (!video) return; // No video element on this page — bail out safely

// ── Start Face Recognition (load models + camera) ──────────
window.matchedStudent = null;

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
  let teacherId = localStorage.getItem("teacherDbId");

  // If student is logged in, resolve teacherId from their student record
  if (!teacherId && localStorage.getItem("currentRole") === "student") {
    const studentId = localStorage.getItem("studentDbId");
    if (studentId) {
      const { data: stu } = await _supabase.from("students").select("teacher_id").eq("id", studentId).single();
      if (stu) teacherId = stu.teacher_id;
    }
  }

  if (!teacherId) {
    showStatus("⚠️ No teacher profile linked. Please log in again.", "error");
    return;
  }
  
  const { data: students, error } = await _supabase.from("students").select("name,roll,department,descriptor").eq("teacher_id", teacherId);
  const btn = document.getElementById("markAttendanceBtn");
  
  if (btn) btn.style.display = "none";
  window.matchedStudent = null;

  if (error || !students || students.length === 0) {
    showStatus("⚠️ No registered students found in database", "error");
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
    
    // Convert descriptor array from Supabase JSONB back to Float32Array
    let descArray = student.descriptor;
    if (typeof descArray === 'string') {
        try { descArray = JSON.parse(descArray); } catch(e) {}
    }

    const distance = faceapi.euclideanDistance(
      faceDescriptor,
      new Float32Array(descArray)
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = student;
    }
  });

  if (bestMatch) {
    window.matchedStudent = bestMatch;
    showStatus("✓ Face Recognized: " + window.matchedStudent.name, "success");
    if (btn) btn.style.display = "inline-block";
  } else {
    showStatus("❌ Face not recognized", "error");
  }
};

// ── Confirm and Save attendance record ──────────────────────
window.confirmAttendance = async function() {
  if (!window.matchedStudent) return;
  
  let teacherId = localStorage.getItem("teacherDbId");

  // If student is logged in, resolve teacherId from their student record
  if (!teacherId && localStorage.getItem("currentRole") === "student") {
    const studentId = localStorage.getItem("studentDbId");
    if (studentId) {
      const { data: stu } = await _supabase.from("students").select("teacher_id").eq("id", studentId).single();
      if (stu) teacherId = stu.teacher_id;
    }
  }

  // Prevent duplicate attendance on the same day
  const today = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
  const { data: existing } = await _supabase
    .from("attendance")
    .select("id")
    .eq("student_name", window.matchedStudent.name)
    .eq("teacher_id", teacherId)
    .gte("marked_at", today + "T00:00:00")
    .lte("marked_at", today + "T23:59:59");

  if (existing && existing.length > 0) {
    showStatus("⚠️ Attendance already marked for " + window.matchedStudent.name + " today!", "error");
    return;
  }

  const record = {
    student_name: window.matchedStudent.name,
    teacher_id: teacherId,
    marked_at: new Date().toISOString()
  };

  const { error } = await _supabase.from("attendance").insert(record);
  
  if (error) {
     showStatus("❌ Failed to mark attendance: " + error.message, "error");
  } else {
     showStatus("✅ Attendance marked for " + window.matchedStudent.name, "success");
     const btn = document.getElementById("markAttendanceBtn");
     if (btn) btn.style.display = "none";
     window.matchedStudent = null;
  }
}

}); // end DOMContentLoaded
