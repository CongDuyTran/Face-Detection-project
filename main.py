import cv2
import mediapipe as mp
import asyncio
import websockets
import json
import threading
import queue
import numpy as np
import time # Thêm thư viện time
from insightface.app import FaceAnalysis

# --- CẤU HÌNH VÀ KHỞI TẠO ---
FRAME_SEND_INTERVAL = 0.3  # Chỉ gửi frame mỗi 0.3 giây (khoảng 3 FPS)

frame_queue = queue.Queue(maxsize=1)
shared_data = {"recognized_info": {}, "lock": threading.Lock()}

mp_face_detection = mp.solutions.face_detection
face_detector = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)

face_embedder = FaceAnalysis(providers=['CPUExecutionProvider'])
face_embedder.prepare(ctx_id=0, det_size=(640, 640))

FONT = cv2.FONT_HERSHEY_PLAIN

# --- LUỒNG PHỤ: TÍNH EMBEDDING VÀ GIAO TIẾP VỚI SERVER ---
# (Luồng này giữ nguyên, nó chỉ xử lý khi có frame trong queue)
def websocket_worker():
    async def worker_logic():
        uri = "ws://localhost:8000/api/v1/checkins/ws"
        while True:
            try:
                async with websockets.connect(uri) as websocket:
                    print("Worker: Đã kết nối tới server.")
                    while True:
                        try:
                            frame_to_process = frame_queue.get(block=True, timeout=1)

                            faces = face_embedder.get(frame_to_process)
                            if not faces:
                                continue

                            embedding = faces[0].normed_embedding
                            embedding_list = embedding.tolist()

                            await websocket.send(json.dumps({"embedding": embedding_list}))
                            response_str = await websocket.recv()
                            recognized_info = json.loads(response_str)

                            with shared_data["lock"]:
                                shared_data["recognized_info"] = recognized_info

                        except queue.Empty:
                            continue
                        except websockets.exceptions.ConnectionClosed:
                            print("Worker: Mất kết nối, đang thử kết nối lại...")
                            await asyncio.sleep(2)
                            break
            except Exception as e:
                print(f"Worker: Lỗi nghiêm trọng - {e}. Đang thử kết nối lại...")
                await asyncio.sleep(5)

    asyncio.run(worker_logic())

# --- LUỒNG CHÍNH: HIỂN THỊ CAMERA VÀ ĐIỀU TIẾT FRAME ---
def camera_thread():
    cap = cv2.VideoCapture(0)
    last_sent_time = 0 # Biến để theo dõi thời điểm gửi frame cuối cùng

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break
        
        frame = cv2.flip(frame, 1)
        display_frame = frame.copy()
        
        # Lấy kết quả nhận diện hiện tại
        with shared_data["lock"]:
            info = shared_data["recognized_info"]
        
        # Phát hiện khuôn mặt bằng MediaPipe (luôn chạy để vẽ bounding box)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_detector.process(frame_rgb)
        
        if results.detections:
            detection = results.detections[0]
            bboxC = detection.location_data.relative_bounding_box
            ih, iw, _ = frame.shape
            x, y, w, h = int(bboxC.xmin * iw), int(bboxC.ymin * ih), \
                         int(bboxC.width * iw), int(bboxC.height * ih)
            
            x1, y1 = max(0, x), max(0, y)
            x2, y2 = min(iw, x + w), min(ih, y + h)

            cv2.rectangle(display_frame, (x1, y1), (x2, y2), (255, 0, 255), 2)

            # --- LOGIC ĐIỀU TIẾT (THROTTLING) ---
            current_time = time.time()
            if (current_time - last_sent_time) > FRAME_SEND_INTERVAL:
                # Chỉ đưa frame vào queue nếu hàng đợi đang rỗng
                if frame_queue.empty():
                    frame_queue.put(frame)
                    last_sent_time = current_time # Cập nhật thời điểm gửi
            
            # Hiển thị overlay text dựa trên kết quả gần nhất
            if info.get("status") == "success":
                name = info.get("name", "N/A")
                cv2.putText(display_frame, name, (x1, y1 - 10), FONT, 0.9, (0, 255, 0), 2)
            elif info.get("status") == "not_found":
                cv2.putText(display_frame, "Unknown", (x1, y1 - 10), FONT, 0.9, (0, 0, 255), 2)
        else:
            # Nếu không có khuôn mặt, reset trạng thái
            with shared_data["lock"]:
                shared_data["recognized_info"] = {}

        cv2.imshow('Face Recognition Check-in', display_frame)

        if cv2.waitKey(5) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    worker = threading.Thread(target=websocket_worker, daemon=True)
    worker.start()
    camera_thread()

# client.py
# import cv2
# import mediapipe as mp
# import asyncio
# import websockets
# import base64
# import json
# from insightface.app import FaceAnalysis
# import numpy as np

# # --- KHỞI TẠO ---
# mp_face_detection = mp.solutions.face_detection
# face_detection = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)

# app = FaceAnalysis(providers=['CPUExecutionProvider'])
# app.prepare(ctx_id=0, det_size=(640, 640))

# cap = cv2.VideoCapture(0)
# FONT = cv2.FONT_HERSHEY_SIMPLEX
# recognized_info = {} # Lưu thông tin nhận diện được

# async def run_client():
#     global recognized_info
#     uri = "ws://localhost:8000/api/v1/checkins/ws"  # Địa chỉ WebSocket server
#     async with websockets.connect(uri) as websocket:
#         while cap.isOpened():
#             success, frame = cap.read()
#             if not success:
#                 print("Không thể đọc frame từ camera.")
#                 break
            
#             # Lật ảnh để có hiệu ứng gương, giúp người dùng dễ điều chỉnh hơn
#             frame = cv2.flip(frame, 1)
            
#             frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#             results = face_detection.process(frame_rgb)
            
#             display_frame = frame.copy()
            
#             if results.detections:
#                 # Chỉ lấy khuôn mặt đầu tiên và lớn nhất trong khung hình
#                 detection = results.detections[0] 
#                 bboxC = detection.location_data.relative_bounding_box
#                 ih, iw, _ = frame.shape
                
#                 # Tính toán tọa độ bounding box
#                 x, y, w, h = int(bboxC.xmin * iw), int(bboxC.ymin * ih), \
#                              int(bboxC.width * iw), int(bboxC.height * ih)
                
#                 # --- PHẦN SỬA LỖI QUAN TRỌNG ---
#                 # 1. Giới hạn lại tọa độ để đảm bảo chúng không nằm ngoài khung hình
#                 x1 = max(0, x)
#                 y1 = max(0, y)
#                 x2 = min(iw, x + w)
#                 y2 = min(ih, y + h)
#                 # --------------------------------

#                 # Vẽ bounding box lên khung hình hiển thị
#                 cv2.rectangle(display_frame, (x1, y1), (x2, y2), (255, 0, 255), 2)

#                 # 2. Kiểm tra xem bounding box sau khi giới hạn có hợp lệ không
#                 if x2 > x1 and y2 > y1:
#                     # 3. Thực hiện crop ảnh trên frame gốc với tọa độ đã được đảm bảo an toàn
#                     face_crop = frame[y1:y2, x1:x2]

#                     # Gửi ảnh đã crop lên server
#                     if face_crop.size > 0:
#                         # _, buffer = cv2.imencode('.jpg', face_crop)
#                         # b64_string = base64.b64encode(buffer).decode('utf-8')
#                         # await websocket.send(b64_string)

#                         faces = app.get(face_crop)
#                         if not faces:
#                             continue
                        
#                         embedding = faces[0].normed_embedding
#                         embedding_list = embedding.tolist()
                        
#                         await websocket.send(json.dumps({"embedding": embedding_list}))
#                         response_str = await websocket.recv()
#                         recognized_info = json.loads(response_str)
                    
#                         # # Nhận kết quả (non-blocking)
#                         # try:
#                         #     response_str = await asyncio.wait_for(websocket.recv(), timeout=0.1)
#                         #     recognized_info = json.loads(response_str)
#                         # except asyncio.TimeoutError:
#                         #     pass # Bỏ qua nếu không có phản hồi kịp
#                     else:
#                         print("Crop khuôn mặt không hợp lệ (kích thước bằng 0).")
#                 else:
#                     print("Bounding box nằm ngoài khung hình.")


#             # Overlay thông tin nếu nhận diện thành công
#             if recognized_info.get("status") == "success":
#                 name = recognized_info.get("name")
#                 # Lấy tọa độ đã được giới hạn để vẽ text
#                 # text_x = recognized_info.get("x", x1)
#                 # text_y = recognized_info.get("y", y1)
#                 cv2.putText(display_frame, name, (x1, y1 - 10), FONT, 0.9, (0, 255, 0), 2)

#             cv2.imshow('Face Recognition Check-in', display_frame)

#             if cv2.waitKey(5) & 0xFF == ord('q'):
#                 break

#         cap.release()
#         cv2.destroyAllWindows()

# if __name__ == "__main__":
#     try:
#         asyncio.run(run_client())
#     except websockets.exceptions.ConnectionClosedError:
#         print("Mất kết nối tới server.")
#     except Exception as e:
#         print(f"Đã có lỗi xảy ra: {e}")