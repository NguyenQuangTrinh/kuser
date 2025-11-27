# KuserNew Tab Tracker Chrome Extension

Chrome extension để theo dõi thời gian xem link từ KuserNew app một cách chính xác.

## Tính năng

- ✅ Theo dõi chính xác thời gian mở/đóng tab
- ✅ Chỉ hoạt động khi user đã đăng nhập
- ✅ Chỉ track tabs mở từ KuserNew app
- ✅ Tự động tính điểm dựa trên thời gian xem
- ✅ Không cần polling (tiết kiệm tài nguyên)

## Cài đặt

### Bước 1: Load Extension

1. Mở Chrome và truy cập `chrome://extensions/`
2. Bật "Developer mode" ở góc trên bên phải
3. Click "Load unpacked"
4. Chọn thư mục `chrome-extension` trong project

### Bước 2: Cấu hình (Nếu cần)

Nếu bạn đang chạy app ở domain khác localhost, cập nhật `manifest.json`:

```json
"host_permissions": [
  "https://your-domain.com/*",
  "https://your-backend.com/*"
]
```

Và cập nhật `background.js`:

```javascript
const BACKEND_URL = 'https://your-backend.com';
const APP_URL = 'https://your-domain.com';
```

## Cách hoạt động

### 1. Kiểm tra Authentication

- Content script chạy trên trang KuserNew
- Tự động lấy Firebase auth token
- Gửi token đến background worker
- Chỉ track khi user đã login

### 2. Tracking Tab

- User click link trong post
- App gửi message đến extension
- Extension gọi API `/api/views/start`
- Lưu viewId và thông tin tab

### 3. Đóng Tab

- Chrome phát hiện tab đóng
- Extension gọi API `/api/views/end`
- Backend tính điểm dựa trên duration
- Cộng điểm cho viewer, trừ điểm cho author

## API Endpoints

### POST /api/views/start

Bắt đầu tracking view.

**Headers:**
```
Authorization: Bearer <firebase-token>
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "firebase-uid",
  "postId": "post-id",
  "link": "https://example.com"
}
```

**Response:**
```json
{
  "viewId": "view-id"
}
```

### POST /api/views/end

Kết thúc tracking view.

**Headers:**
```
Authorization: Bearer <firebase-token>
Content-Type: application/json
```

**Body:**
```json
{
  "viewId": "view-id",
  "postId": "post-id"
}
```

**Response:**
```json
{
  "success": true,
  "pointsEarned": 5
}
```

## Công thức tính điểm

- < 30 giây: 0 điểm
- 30-59 giây: 2 điểm
- 60-89 giây: 5 điểm
- 90-119 giây: 8 điểm
- ≥ 120 giây: 10 điểm

## Debugging

Mở Chrome DevTools:
- Background worker: `chrome://extensions/` → Click "service worker"
- Content script: F12 trên trang KuserNew

Logs sẽ hiển thị:
- Auth status
- Tab tracking events
- API calls

## Lưu ý

- Extension cần quyền `tabs` và `storage`
- Chỉ hoạt động trên domain được cấu hình trong `manifest.json`
- Cần cài extension trên mỗi Chrome profile

## Troubleshooting

### Extension không hoạt động

1. Kiểm tra extension đã được enable
2. Reload extension: `chrome://extensions/` → Click reload icon
3. Kiểm tra console logs

### Không track được tab

1. Đảm bảo đã đăng nhập vào app
2. Kiểm tra domain trong `manifest.json`
3. Xem logs trong background worker

### API errors

1. Kiểm tra backend đang chạy
2. Kiểm tra CORS settings
3. Verify Firebase token còn hạn
