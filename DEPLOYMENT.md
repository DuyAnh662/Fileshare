# Hướng Dẫn Deploy Lên Cloudflare Pages

Project này là một trang web tĩnh (static site), nhưng vì lý do bảo mật, chúng ta **không** lưu trực tiếp các API Key trong code. Thay vào đó, chúng ta sẽ sử dụng tính năng **Environment Variables** của Cloudflare Pages và một script build đơn giản.

## Bước 1: Tạo Project (Chọn đúng loại!)

**QUAN TRỌNG:** Bạn cần chọn **Pages**, KHÔNG PHẢI **Workers**.
(Giao diện bạn đang xem có "Deploy command: npx wrangler deploy" là của Workers - cái này phức tạp hơn và không cần thiết cho web tĩnh).

1.  Vào Dashboard > **Workers & Pages**.
2.  Bấm **Create Application**.
3.  Bấm sang tab **Pages** (ở giữa/bên cạnh tab Workers).
4.  Bấm nút **Connect to Git**.
5.  Chọn repo `fileshare`.

## Bước 2: Cấu hình Build

Trong phần cài đặt build (Build settings):

*   **Framework preset**: Chọn `None`.
*   **Build command**: Nhập lệnh sau (copy y nguyên):
    ```bash
    chmod +x build.sh && ./build.sh
    ```
*   **Build output directory**: Để trống (quan trọng).
*   **Root directory**: Để trống.

## Bước 3: Nhập Token (Environment Variables)

Đây là bước quan trọng nhất. Bạn copy chính xác các dòng dưới đây vào mục **Environment variables (advanced)** trên Cloudflare:

| Variable Name (Tên biến) | Value (Giá trị) |
| :--- | :--- |
| `SUPABASE_URL` | `https://onywmbsbqsemrubokknr.supabase.co` |
| `SUPABASE_ANON_KEY` | *(Điền Key Anon của bạn)* |
| `LOOTLABS_API_TOKEN` | *(Điền Token LootLabs của bạn)* |

> **Lưu ý:** `build.sh` sẽ tự động chèn các token này vào code khi deploy.

## Bước 4: Deploy

1.  Ấn **Save and Deploy**.
2.  Chờ Cloudflare chạy lệnh build (khoảng 1-2 phút).
3.  Khi thấy thông báo "Success", truy cập vào link web (ví dụ: `fileshare.pages.dev`).
