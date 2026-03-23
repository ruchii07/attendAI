// Bug 3 Fix: Guard against null #video — this file loads on index.html which has no #video
const video = document.getElementById("video");
if (video) {

  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./models')
  ]).then(startVideo);

  function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        video.srcObject = stream;
      });
  }

  async function captureFace() {
    const name = document.getElementById("studentName").value;

    if (name === "") {
      alert("Enter student name");
      return;
    }

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      alert("No face detected");
      return;
    }

    const descriptor = Array.from(detection.descriptor);
    let students = JSON.parse(localStorage.getItem("students")) || [];

    students.push({
      name: name,
      descriptor: descriptor
    });

    localStorage.setItem("students", JSON.stringify(students));
    alert("Student Registered Successfully");
  }

} // end video guard