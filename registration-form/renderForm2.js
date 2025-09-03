import { renderThanks } from './renderThanks.js';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

export const renderForm2 = userInfo => {
  const stepButton = document.querySelector(`.root-container > .steps-wrapper > .step-2`);
  const contentWrapper = document.querySelector('.root-container > .main > .content-wrapper');

  stepButton.classList.add('active');

  contentWrapper.innerHTML = `
    <form id="form" class="step-2">
      <p class="title">Chụp hình khuôn mặt</p>
      <p class="intro">
        Vui lòng nhìn thằng vào camera và nhấn nút
        <i>
          <strong>Mở Camera</strong>
        </i>
        dưới đây
      </p>
      <div class="input">
        <div class="camera">
          <video id="video" autoplay playsinline></video>
          <img class="hidden" src="./assets/images/image-face-detection.png" alt="Image Face Detection">
          <canvas id="canvas"></canvas>
          <div class="loading-spinner">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle style="opacity: 0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path style="opacity: 0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span style="margin-left: 0.75rem">Đang tải...</span>
          </div>
        </div>
        <button id="camera">Mở Camera</button>
      </div>
      <div class="file hidden">
        <a target="_blank"></a>
        <p></p>
      </div>
    </form>
  `;

  const form = document.getElementById('form');
  const video = document.getElementById("video");
  const image = document.querySelector('.root-container > .main > .content-wrapper > form.step-2 > .input > .camera > img')
  const canvas = document.getElementById("canvas");
  const cameraButton = document.getElementById('camera');
  const fileLink = document.querySelector('.root-container > .main > .content-wrapper > form.step-2 > .file > a');
  const fileCapacity = document.querySelector('.root-container > .main > .content-wrapper > form.step-2 > .file > p');
  
  const canvasCtx = canvas.getContext("2d");
  const drawingUtils = new DrawingUtils(canvasCtx);

  let faceLandmarker = null;
  let results = null;
  let predictInterval = null;
  let runningMode = "VIDEO";
  let webcamRunning = false;
  let file = null;

  // --- Biến quản lý bộ đếm ---
  let countdownTimer = null;
  let countdownSeconds = 3;

  const createFaceLandmarker = async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
      },
      outputFaceBlendshapes: true,
      runningMode,
      numFaces: 1
    });

    const loadingSpinner = document.querySelector('.root-container > .main > .content-wrapper > form.step-2 > .input > .camera > .loading-spinner');
    loadingSpinner.classList.add('hidden');
  };

  createFaceLandmarker();

  const takePhoto = async () => {
    // 1. Lấy kích thước hiển thị thực tế của thẻ video
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;
  
    // 2. Đặt kích thước cho canvas bằng với kích thước hiển thị của video
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  
    // 3. Vẽ video lên canvas với kích thước đã được cập nhật
    canvasCtx.drawImage(video, 0, 0, displayWidth, displayHeight);
    
    // --- 4. Tạo Blob ---
    canvas.toBlob(blob => {
      file = blob;
      const url = URL.createObjectURL(file);
      
      fileLink.parentElement.classList.remove('hidden');
      fileLink.href = url;
      fileLink.textContent = `${userInfo?.name} - Ảnh Khuôn Mặt.jpeg`;
      fileCapacity.textContent = `${(file.size / 1024).toFixed(2)} KB`;

      // Hiển thị ảnh cuối cùng
      video.classList.add('hidden');
      image.classList.remove('hidden');
      image.src = url;
    }, "image/jpeg", 0.95);
  };

  const enableCam = async (event) => {
    event.preventDefault();

    video.classList.remove('hidden');
    image.classList.add('hidden');

    if (!faceLandmarker) {
      console.log("Wait! faceLandmarker not loaded yet.");
      return;
    }

    webcamRunning = true;
    
    const constraints = {
      video: true
    };
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      // video.addEventListener("loadeddata", predictWebcam);
      predictInterval = setInterval(predictWebcam, 200);
    } catch (err) {
      console.error(err);
    }
  };

  const disableCam = async () => {
    const intro = document.querySelector('.root-container > .main > .content-wrapper > form.step-2 > p.intro');
    intro.innerHTML = `
      Nhấn nút
        <i>
          <strong>Chụp lại</strong>
        </i>
      dưới đây để chụp lại hình ảnh khuôn mặt
    `;

    webcamRunning = false;
    cameraButton.innerText = "Chụp lại";

    takePhoto();

    // Xóa sạch nội dung trên canvas ngay sau khi chụp
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    video.srcObject = null;
    countdownTimer = null;
    clearInterval(countdownTimer);
    clearInterval(predictInterval);
  };

  // async function predictWebcam() {
  //   // *** THAY ĐỔI QUAN TRỌNG Ở ĐÂY ***
  //   // 1. Lấy kích thước hiển thị thực tế của video
  //   const displayWidth = video.clientWidth;
  //   const displayHeight = video.clientHeight;

  //   // 2. Kiểm tra xem kích thước canvas có khớp với kích thước hiển thị không
  //   if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
  //     // 3. Nếu không, cập nhật lại kích thước canvas
  //     canvas.width = displayWidth;
  //     canvas.height = displayHeight;
  //   }

  //   const startTimeMs = performance.now();
  //   if (lastVideoTime !== video.currentTime) {
  //     lastVideoTime = video.currentTime;
  //     results = faceLandmarker.detectForVideo(video, startTimeMs);

  //     canvasCtx.save();
  //     canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  //     if (results.faceLandmarks) {
  //       for (const landmarks of results.faceLandmarks) {
  //         drawingUtils.drawConnectors(
  //           landmarks,
  //           FaceLandmarker.FACE_LANDMARKS_TESSELATION,
  //           { color: "#C0C0C070", lineWidth: 1 }
  //         );
  //         // Các lệnh vẽ khác...
  //       }
  //     }
  //     canvasCtx.restore();
  //   }

  //   if (webcamRunning === true) {
  //     window.requestAnimationFrame(predictWebcam);
  //   }
  // }

  // Các chỉ số landmark quan trọng từ FaceLandmarker
  const NOSE_TIP_INDEX = 4;
  const LEFT_EYE_INDEX = 33;
  const RIGHT_EYE_INDEX = 263;
  
  /**
   * Kiểm tra xem khuôn mặt có nhìn thẳng không dựa trên landmarks
   * @param {Array} landmarks - Mảng các điểm landmarks từ FaceLandmarker
   * @returns {boolean} - Trả về true nếu khuôn mặt trực diện
   */
  function isFaceFrontal(landmarks) {
    if (!landmarks || landmarks.length === 0) return false;
  
    const nose = landmarks[NOSE_TIP_INDEX];
    const leftEye = landmarks[LEFT_EYE_INDEX];
    const rightEye = landmarks[RIGHT_EYE_INDEX];
  
    // Tính khoảng cách theo chiều ngang (trục x)
    const distLeft = Math.abs(nose.x - leftEye.x);
    const distRight = Math.abs(nose.x - rightEye.x);
  
    // Tính tỉ lệ. Nếu tỉ lệ quá chênh lệch, tức là mặt đang nghiêng
    // Ngưỡng 0.3 có nghĩa là chênh lệch không quá 30%
    const ratio = Math.abs(distLeft - distRight) / Math.max(distLeft, distRight);
  
    return ratio < 0.3; 
  }

  async function predictWebcam() {
    // --- Phần resize canvas của bạn đã rất tốt, giữ nguyên ---
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    // --- Phần xử lý và tích hợp ---
    const startTimeMs = performance.now();
    if (video.currentTime > 0) { // Đảm bảo video đã bắt đầu
      results = faceLandmarker.detectForVideo(video, startTimeMs);
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height); // Xóa canvas trước khi vẽ

    if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];
      const isFrontal = isFaceFrontal(landmarks);

      // Cung cấp phản hồi trực quan
      canvas.style.borderColor = isFrontal ? "lime" : "red";

      // Chỉ cho phép chụp khi mặt trực diện
      cameraButton.disabled = true;

      if (isFrontal) {
        // Nếu mặt nhìn thẳng và bộ đếm chưa chạy, hãy bắt đầu nó
        if (!countdownTimer) {

          countdownSeconds = 3; // Reset lại bộ đếm
          cameraButton.innerText = `Đang ghi hình ... ${countdownSeconds}s`;
          
          countdownTimer = setInterval(() => {
            countdownSeconds--;
            cameraButton.innerText = `Đang ghi hình ... ${countdownSeconds}s`;
            
            if (countdownSeconds <= 0) {
              clearInterval(countdownTimer);
              countdownTimer = null;
              disableCam(); // Tự động chụp và tắt camera
              cameraButton.disabled = false;
            }
          }, 1000);
        }
      } else {
        // Nếu mặt không nhìn thẳng, hủy bộ đếm
        if (countdownTimer) {
          clearInterval(countdownTimer);
          countdownTimer = null;
        }

        cameraButton.innerText = "Vui lòng nhìn vào camera";
      }

      // Vẽ lưới lên mặt
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
        { color: isFrontal ? "#00FF0070" : "#FF000070", lineWidth: 1 }
      );
    } else {
      // Không tìm thấy mặt
      // Không tìm thấy mặt, hủy bộ đếm
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }

      canvas.style.borderColor = "red";
    }

    canvasCtx.restore();
  }

  cameraButton.addEventListener('click', enableCam);

  form.addEventListener('submit', async (e) => {
    try {
      e.preventDefault();
      const formData = new FormData();
      formData.append('email', userInfo?.email);
      formData.append('file', file);
    
      await axios.post('http://localhost:8000/api/v1/users/upload', formData);
      stepButton.classList.remove('active');
      renderThanks();
    } catch {
      alert('try again');
    }
  });
};