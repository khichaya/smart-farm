"""مكان النموذج الذكي - هذا الملف هو الوحيد الذي ستبرمجه لاحقاً.
© جميع الحقوق محفوظة - المهندس خيشة يحي - نسخة أكاديمية

الخدمة (ai_service.py) تستدعي:
    predict(context)  -> قائمة توصيات
    train(db_path, log) -> يدرّب النموذج ويحفظه في مجلد models/ ويُرجع وصفاً للنتيجة

كل الباقي (جمع البيانات، التخزين، التصدير، الواجهة) جاهز ولا يحتاج تعديلاً.
"""


def predict(context):
    """context مثال:
        {"zone": {"id":1, "crop":"tomato", "stage":"إزهار", "crop_day":23},
         "live": {"soil_pct":42, "wind":12.5, "level":1, "pump":0},
         "hour": 7, "history": [... آخر قراءات ...]}
    يجب أن تُرجع قائمة عناصر بالشكل:
        {"level": "info|warn|critical|tip", "title": "...", "text": "...", "confidence": 0.0-1.0, "zone": 1}
    """
    return []     # لا يوجد نموذج مُدرَّب بعد


def train(db_path, log):
    """يقرأ جداول samples / events / feedback من قاعدة SQLite المعزولة (db_path) ويدرّب النموذج.
    استخدم log("رسالة") لعرض تقدّم التدريب في الواجهة."""
    raise NotImplementedError("التدريب لم يُبرمج بعد")
