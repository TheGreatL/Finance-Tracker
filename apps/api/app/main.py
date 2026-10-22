import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="Finance Tracker AI & Ledger API",
    description="Backend API for financial transactions, MySQL ledger synchronization, and receipt OCR",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthResponse(BaseModel):
    status: str
    database_configured: bool
    version: str

class ReceiptScanResult(BaseModel):
    vendor: Optional[str] = None
    date: Optional[str] = None
    amount: Optional[float] = None
    tax: Optional[float] = None
    suggested_category: str = "Groceries"
    suggested_nature: str = "needs"
    raw_text: str = ""

@app.get("/health", response_model=HealthResponse)
def health_check():
    db_url = os.getenv("DATABASE_URL", "")
    return {
        "status": "online",
        "database_configured": bool(db_url),
        "version": "1.0.0"
    }

@app.post("/ocr/receipt", response_model=ReceiptScanResult)
async def scan_receipt(file: UploadFile = File(...)):
    # OCR parsing endpoint stub (ready for pytesseract or cloud vision integration)
    filename = file.filename or "receipt.jpg"
    contents = await file.read()
    
    return {
        "vendor": "Sample Store",
        "date": "2026-10-22",
        "amount": 0.00,
        "tax": 0.00,
        "suggested_category": "Groceries",
        "suggested_nature": "needs",
        "raw_text": f"Scanned {filename} ({len(contents)} bytes)"
    }

