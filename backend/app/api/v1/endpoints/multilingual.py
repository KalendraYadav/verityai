from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_optional_current_user, get_current_user, require_roles
from app.models.user import User
from app.models.document import Document
from app.models.document_page import DocumentPage
from app.models.finding import ExtractedField
from app.schemas.multilingual import (
    DocumentLanguageResponse,
    PageLanguageInfo,
    TranslationRequest,
    TranslationResponse,
    MultilingualFieldItem,
    MultilingualReprocessResponse,
)
from app.services.multilingual import (
    analyze_document_multilingual,
    translate_text,
    REGULATORY_GLOSSARY,
)
from app.core.exceptions import NotFoundException, ValidationException

router = APIRouter()


@router.get("/documents/{document_id}/languages", response_model=DocumentLanguageResponse)
def get_document_languages(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve detected language, confidence, and page breakdown for a document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )

    pages = (
        db.query(DocumentPage)
        .filter(DocumentPage.document_id == document_id)
        .order_by(DocumentPage.page_number.asc())
        .all()
    )

    page_infos = [
        PageLanguageInfo(
            page_number=p.page_number,
            detected_language=p.detected_language,
            language_confidence=p.language_confidence,
            translated_text=p.translated_text,
            translation_provider=p.translation_provider,
        )
        for p in pages
    ]

    return DocumentLanguageResponse(
        document_id=doc.id,
        detected_language=doc.detected_language,
        language_distribution=doc.language_distribution,
        page_languages=page_infos,
    )


@router.get("/documents/{document_id}/extracted-fields", response_model=List[MultilingualFieldItem])
def get_document_extracted_fields(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve structured candidate fields extracted from document text."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )

    fields = (
        db.query(ExtractedField)
        .filter(ExtractedField.document_id == document_id)
        .order_by(ExtractedField.page_number.asc(), ExtractedField.field_key.asc())
        .all()
    )

    return [
        MultilingualFieldItem(
            id=f.id,
            field_name=f.field_key,
            raw_value=f.raw_value or "",
            normalized_value=f.normalized_value,
            confidence=f.confidence,
            extraction_method=f.extraction_method,
            page_number=f.page_number,
            document_id=f.document_id,
        )
        for f in fields
    ]


@router.post("/documents/{document_id}/multilingual-reprocess", response_model=MultilingualReprocessResponse)
def trigger_multilingual_reprocessing(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Rerun multilingual analysis, language classification, and candidate field discovery
    across all pages of a document.
    """
    try:
        result = analyze_document_multilingual(db, document_id)
        return MultilingualReprocessResponse(**result)
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/documents/{document_id}/translate", response_model=TranslationResponse)
def translate_document_text(
    document_id: str,
    payload: TranslationRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Translate text using the selected translation provider (defaults to local statutory regulatory glossary).
    If page_number is supplied and text is omitted, the page's clean/raw text is used.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )

    text_to_translate = payload.text
    target_page = None

    if payload.page_number is not None:
        target_page = (
            db.query(DocumentPage)
            .filter(
                DocumentPage.document_id == document_id,
                DocumentPage.page_number == payload.page_number,
            )
            .first()
        )
        if not target_page:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Page {payload.page_number} not found in document '{document_id}'."
            )
        if not text_to_translate:
            text_to_translate = target_page.clean_text or target_page.raw_text or ""

    if not text_to_translate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No text provided or found on specified page to translate."
        )

    try:
        trans_res = translate_text(text_to_translate, provider_key=payload.provider)
        
        # If translating a specific page, save translation result on page
        if target_page:
            target_page.translated_text = trans_res.get("translated_text")
            target_page.translation_provider = trans_res.get("provider")
            db.commit()

        return TranslationResponse(
            original_text=trans_res.get("original_text", text_to_translate),
            translated_text=trans_res.get("translated_text", ""),
            glossary_terms_found=trans_res.get("glossary_terms_found", []),
            provider=trans_res.get("provider", payload.provider),
            timestamp=trans_res.get("timestamp", ""),
        )
    except ValidationException as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/multilingual/glossary", response_model=Dict[str, str])
def get_regulatory_glossary():
    """Retrieve the statutory bilingual regulatory glossary for Indian institutional scrutiny."""
    return REGULATORY_GLOSSARY
