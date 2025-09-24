# Architecture

# Architecture – New Employee Onboarding Email Integration

## 1. Overview
Hệ thống được thiết kế để tự động gửi email đến nhân sự mới và các bên liên quan trong quá trình onboarding.  
Nguyên tắc: **modular, loosely coupled, event-driven**.

---

## 2. High-Level Architecture

### Diagram

```ascii
[HR System: New Employee Created]
            │
            ▼
   ┌──────────────────┐
   │ Trigger Listener │
   └──────────────────┘
            │
            ▼
   ┌──────────────────┐
   │ Template Engine  │───> [Template Store]
   └──────────────────┘
            │
            ▼
   ┌──────────────────┐
   │ Email Dispatcher │───> [SMTP / API Providers]
   └──────────────────┘
            │
            ▼
   ┌──────────────────┐
   │ Logger & Monitor │───> [Log DB / ELK / CloudWatch]
   └──────────────────┘
            │
            ▼
   ┌──────────────────┐
   │ HR/QA Dashboard  │
   └──────────────────┘

---

## 3. Module Descriptions

### 3.1 Trigger Listener
- Nhận sự kiện từ HR system khi nhân sự mới được tạo.  
- Có thể kết nối qua **webhook** hoặc **event bus**.  
- Validate dữ liệu trước khi xử lý.  

### 3.2 Template Engine
- Render email từ template động ({{Employee_Name}}, {{Manager_Name}}, {{Start_Date}}).  
- Hỗ trợ nhiều loại email: chào mừng nhân sự, xác nhận HR, thông báo cho quản lý, checklist mentor.  
- Hỗ trợ đa ngôn ngữ (EN, VN).  

### 3.3 Email Dispatcher
- Gửi email đến các bên liên quan qua SMTP hoặc API (SendGrid, SES…).  
- Hỗ trợ retry (3 lần, exponential backoff).  
- Cho phép fallback giữa nhiều provider.  

### 3.4 Logger & Monitor
- Ghi lại tất cả trạng thái gửi email.  
- Lưu trữ log tối thiểu 12 tháng.  
- Tích hợp alert nếu tỷ lệ thất bại > 5%.  

### 3.5 HR/QA Dashboard
- Giao diện cho HR và QA theo dõi trạng thái gửi email.  
- Bộ lọc theo: ngày, nhân sự, trạng thái.  
- Cho phép export log để audit.  

---

## 4. Non-Functional Considerations
- **Performance**: Email gửi trong vòng < 5 giây sau trigger.  
- **Security**: Thông tin nhân sự bảo mật, credential quản lý qua secret manager.  
- **Scalability**: Có thể scale out Email Dispatcher bằng worker queue.  
- **Observability**: Metrics tích hợp Prometheus/Grafana.  

---

## 5. Technology Choices
- **Language**: Python hoặc Node.js (tùy stack).  
- **Queue/Event**: Kafka, RabbitMQ hoặc webhook trực tiếp.  
- **Email Provider**: SendGrid, AWS SES, SMTP fallback.  
- **Log Storage**: PostgreSQL/MySQL hoặc Elasticsearch.  
- **Dashboard**: React/Next.js hoặc Metabase/Grafana.  

---

## 6. Future Enhancements
- Hỗ trợ nhiều kênh: Slack, Teams, SMS.  
- Personalization nâng cao (chèn avatar, video chào mừng).  
- A/B testing template email.  
