# Task: send-email-task

## Description
Thực hiện gửi email phục vụ quy trình **onboarding nhân sự mới**.  
Task này bao gồm các email chính:  
- Welcome email cho nhân sự mới.  
- Confirmation email cho HR.  
- Notification email cho Manager.  
- Checklist email cho Mentor (nếu có).  

Mỗi email phải được log trạng thái (success/fail). Nếu thất bại, hệ thống thực hiện retry tối đa 3 lần.

---

## Trigger
- HR system phát sự kiện **"New Employee Created"** thông qua API/webhook.  
- Hoặc được khởi chạy thủ công bởi orchestrator agent với lệnh:  

---

## Steps
1. **Validate event data**  
 - Kiểm tra thông tin nhân sự (họ tên, email, ngày bắt đầu, manager, mentor).  
 - Nếu thiếu dữ liệu → log lỗi, dừng task.  

2. **Render templates**  
 - Sử dụng `Template Engine` để tạo nội dung email.  
 - Placeholder: `{{Employee_Name}}`, `{{Start_Date}}`, `{{Manager_Name}}`, `{{Mentor_Name}}`.  

3. **Dispatch emails**  
 - Gửi từng loại email qua `tools/send_email.py`.  
 - Gồm: Welcome, HR confirm, Manager notify, Mentor checklist.  

4. **Retry on failure**  
 - Nếu gửi thất bại → thử lại 3 lần (exponential backoff).  
 - Nếu thất bại toàn bộ → escalate error về orchestrator agent.  

5. **Log results**  
 - Ghi trạng thái gửi email (success/fail, recipient, timestamp) vào hệ thống log.  

---

## Checklist
- [ ] Dữ liệu nhân sự hợp lệ.  
- [ ] Template được render thành công.  
- [ ] Email gửi thành công cho nhân sự mới.  
- [ ] Email gửi thành công cho HR.  
- [ ] Email gửi thành công cho Manager.  
- [ ] Email gửi thành công cho Mentor (nếu có).  
- [ ] Log ghi đầy đủ và chính xác.  

---

## Outputs
- **Success**: Tất cả email gửi thành công, log trạng thái lưu lại.  
- **Partial Fail**: Một số email retry thành công, một số thất bại → escalated.  
- **Fail**: Không gửi được email nào → báo lỗi về orchestrator agent.  

---

## Dependencies
- `../agents/email-agent.md`  
- `../tools/send_email.py`  
- `../docs/prd-email.md`  
- `../docs/architecture.md`  

