try:
    from app.main import app
except Exception as e:
    import traceback
    traceback.print_exc()
