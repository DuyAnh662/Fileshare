# Hướng Dẫn Deploy Lên Cloudflare Pages

Project này là một trang web tĩnh (static site), nhưng vì lý do bảo mật, chúng ta **không** lưu trực tiếp các API Key trong code. Thay vào đó, chúng ta sẽ sử dụng tính năng **Environment Variables** của Cloudflare Pages và một script build đơn giản.

## Bước 1: Tạo Project (Chọn đúng loại!)

**QUAN TRỌNG:** Bạn cần chọn **Pages**, KHÔNG PHẢI **Workers**.

1.  Vào Dashboard > **Workers & Pages**.
2.  Bấm **Create Application**.
3.  Bấm sang tab **Pages** (ở giữa/bên cạnh tab Workers).
4.  Bấm nút **Connect to Git**.
5.  Chọn repo `Fileshare` (hoặc tên repo bạn vừa tạo).
6.  Ở mục **Project name**, nếu bạn muốn cái link đẹp thì nhớ đổi thành `fileshare-allfree`.

## Bước 2: Cấu hình Build

Trong phần cài đặt build (Build settings):

*   **Framework preset**: Chọn `None`.
*   **Build command**: Nhập lệnh sau (copy y nguyên):
    ```bash
    chmod +x build.sh && ./build.sh
    ```
*   **Build output directory**: Để trống.
*   **Root directory**: Để trống.

## Bước 3: Nhập Token (Environment Variables)

Đây là bước quan trọng nhất. Bạn copy chính xác các dòng dưới đây vào mục **Environment variables (advanced)** trên Cloudflare:

| Variable Name (Tên biến) | Value (Giá trị - Copy dòng này) |
| :--- | :--- |
| `SUPABASE_URL` | `https://onywmbsbqsemrubokknr.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ueXdtYnNicXNlbXJ1Ym9ra25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNTQzMDYsImV4cCI6MjA4MjgzMDMwNn0.nlL1kmYHGmYzreylhLiTkKUgeuVMYWdqfuSDtsgKXZ4` |
| `LOOTLABS_API_TOKEN` | `481c8a54ca51bd805d72ba28d9bf7023ca668ba05d1e58bb802d225d82aac02a` |

> **Lưu ý:** `build.sh` sẽ tự động chèn các token này vào code của bạn ngay khi Cloudflare chạy lệnh build, giúp bảo mật tuyệt đối các key này trên GitHub.

## Bước 4: Deploy

1.  Ấn **Save and Deploy**.
2.  Chờ Cloudflare chạy lệnh build (khoảng 1-2 phút).
3.  Khi thấy thông báo "Success", bạn có thể truy cập website ngay.

---

## Kiểm tra

Sau khi deploy xong:
1.  Vào web, mở F12 > Console.
2.  Nếu không thấy lỗi đỏ, hãy thử upload một file test.
3.  Nếu file hiện lên danh sách -> Bạn đã thành công!
