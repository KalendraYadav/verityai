from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class PageLanguageInfo(BaseModel):
    page_number: int
    detected_language: Optional[str] = None
    language_confidence: Optional[float] = None
    translated_text: Optional[str] = None
    translation_provider: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentLanguageResponse(BaseModel):
    document_id: str
    detected_language: Optional[str] = None
    language_distribution: Optional[Dict[str, float]] = None
    page_languages: List[PageLanguageInfo] = []

    model_config = ConfigDict(from_attributes=True)


class TranslationRequest(BaseModel):
    text: Optional[str] = None
    page_number: Optional[int] = None
    provider: str = "GLOSSARY"


class GlossaryMatch(BaseModel):
    source: str
    translated: str


class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    glossary_terms_found: List[GlossaryMatch] = []
    provider: str
    timestamp: str


class MultilingualFieldItem(BaseModel):
    id: str
    field_name: str
    raw_value: str
    normalized_value: Optional[str] = None
    confidence: Optional[float] = None
    extraction_method: Optional[str] = None
    page_number: Optional[int] = None
    document_id: str

    model_config = ConfigDict(from_attributes=True)


class MultilingualReprocessResponse(BaseModel):
    document_id: str
    detected_language: Optional[str] = None
    language_distribution: Optional[Dict[str, float]] = None
    page_count: int
    candidate_fields_discovered: int
