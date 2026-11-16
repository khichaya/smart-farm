@echo off
rem (c) جميع الحقوق محفوظة - المهندس خيشة يحي - نسخة أكاديمية
rem تشغيل المزرعة الذكية: خدمة الذكاء الاصطناعي (معزولة) + منصة الويب
cd /d "%~dp0platform"
start "AI Service" /min python ai\ai_service.py
start "Smart Farm" python server.py http://smartfarm.local 8000
echo.
echo المنصة:  http://localhost:8000
echo (اتركي هذه النوافذ مفتوحة)
