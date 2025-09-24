# PRD – New Employee Onboarding Email Integration

## 1. Background & Context
Trong quy trình onboarding hiện tại, nhiều tổ chức gặp khó khăn trong việc truyền tải thông tin đầy đủ và kịp thời cho nhân sự mới.  
Hậu quả:
- Nhân sự mới thiếu tài liệu, thông tin đăng nhập, hoặc lịch training.  
- Bộ phận HR/PO mất nhiều thời gian gửi email thủ công.  
- Quản lý trực tiếp không có kênh thống nhất để chào mừng và hướng dẫn nhân viên mới.  

**Giải pháp**: Tích hợp hệ thống gửi email tự động cho quy trình onboarding, đảm bảo nhân sự mới và các bên liên quan nhận được thông báo phù hợp, đúng thời điểm.

---

## 2. Goals
- Tự động gửi email onboarding cho nhân sự mới, HR, quản lý trực tiếp, và mentor (nếu có).  
- Cung cấp email mẫu chuẩn hóa, dễ tùy biến.  
- Đảm bảo có log kiểm chứng để HR theo dõi.  
- Giảm thiểu công việc thủ công, tăng trải nghiệm cho nhân sự mới.  

---

## 3. Success Metrics (KPIs)
- **100% nhân sự mới** nhận được email chào mừng ngay khi onboard.  
- **Tỷ lệ gửi email thành công** ≥ 99%.  
- **Thời gian gửi** ≤ 5 giây sau khi HR kích hoạt onboarding.  
- **Mức độ hài lòng của nhân sự mới** (survey) ≥ 80% về thông tin onboarding.  

---

## 4. Functional Requirements (FR)
- **FR1**: Gửi email cho nhân sự mới với nội dung chào mừng + thông tin cần thiết (lịch training, tài liệu, người liên hệ).  
- **FR2**: Gửi email cho HR/PO xác nhận đã hoàn tất bước onboarding.  
- **FR3**: Gửi email cho quản lý trực tiếp với thông tin nhân sự mới (họ tên, vị trí, ngày bắt đầu).  
- **FR4**: Gửi email cho mentor (nếu có) với danh sách trách nhiệm hỗ trợ.  
- **FR5**: Hỗ trợ template động ({{Employee_Name}}, {{Start_Date}}, {{Manager_Name}}).  
- **FR6**: Log tất cả email gửi đi (success/fail).  
- **FR7**: Tự động retry khi gửi thất bại.  

---

## 5. Non-Functional Requirements (NFR)
- **NFR1**: Email phải gửi trong vòng < 5 giây sau trigger onboarding.  
- **NFR2**: Đảm bảo bảo mật thông tin nhân sự mới.  
- **NFR3**: Hỗ trợ nhiều ngôn ngữ (EN, VN) cho template.  
- **NFR4**: Audit log lưu trữ tối thiểu 12 tháng.  

---

## 6. User Stories & Acceptance Criteria

### Epic: Onboarding Email Notification

**Story 1 – Email chào mừng nhân sự mới**  
- *As a New Employee, I want to receive a welcome email with key information, so that I can start smoothly.*  
- **Acceptance Criteria**:  
  - Email gồm: lời chào, lịch training, link tài liệu, thông tin người liên hệ.  
  - Email gửi ngay khi HR khởi tạo hồ sơ nhân sự.  

**Story 2 – Email xác nhận cho HR**  
- *As an HR, I want to receive a confirmation email when onboarding emails are sent, so that I can track progress.*  
- **Acceptance Criteria**:  
  - Email ghi rõ: nhân sự mới đã được gửi mail, trạng thái thành công/thất bại.  

**Story 3 – Email thông báo cho quản lý trực tiếp**  
- *As a Manager, I want to be informed when a new employee joins, so that I can prepare my team.*  
- **Acceptance Criteria**:  
  - Email gồm: tên nhân sự, chức danh, ngày bắt đầu, mentor (nếu có).  

**Story 4 – Email cho mentor**  
- *As a Mentor, I want to receive an onboarding checklist for my mentee, so that I can support them properly.*  
- **Acceptance Criteria**:  
  - Email chứa thông tin cơ bản của nhân sự mới và trách nhiệm hỗ trợ.  

**Story 5 – Logging & Retry**  
- *As a QA, I want to see logs of all email send attempts, so that I can verify and debug issues.*  
- **Acceptance Criteria**:  
  - Log gồm: Recipient, Event, Timestamp, Status.  
  - Retry tối đa 3 lần với lỗi tạm thời.  

---

## 7. Constraints & Assumptions
- Assumption: HR system cung cấp API/webhook khi tạo nhân sự mới.  
- Constraint: Chỉ gửi email sau khi thông tin nhân sự đã được xác thực.  
- Constraint: SMTP server/API phải được cấp quyền trước.  

---

## 8. Dependencies
- HR system (nguồn sự kiện).  
- Email provider (SMTP, SendGrid, SES…).  
- Logging & dashboard system (DB, ELK).  

---

## 9. Risks & Mitigation
- **Spam email** → throttle + domain whitelist.  
- **Sai thông tin nhân sự** → chỉ trigger sau khi HR confirm.  
- **Provider downtime** → hỗ trợ multi-provider fallback.  

---

## 10. Future Scope
- Gửi SMS/Slack song song với email.  
- Cá nhân hóa template theo bộ phận/văn hóa công ty.  
- Đo lường engagement (open rate, click rate).  

