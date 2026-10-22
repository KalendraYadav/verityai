import pytest
from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.document import Document
from app.models.processing_run import ProcessingRun
from app.models.document_page import DocumentPage
from app.models.user import User
from app.core.security import hash_password
from app.services.multilingual import (
    normalize_unicode_text,
    normalize_devanagari_numerals,
    detect_text_language,
    extract_multilingual_candidate_fields,
    GlossaryTranslationProvider,
    ExternalTranslationStub,
    analyze_document_multilingual,
)
from app.core.exceptions import ValidationException


@pytest.fixture
def multilingual_user(db_session):
    user = db_session.get(User, "usr-ml-test")
    if not user:
        user = User(
            id="usr-ml-test",
            email="ml.officer@verityai.gov.in",
            display_name="Multilingual Scrutiny Officer",
            password_hash=hash_password("PassSecure123!"),
            role="ADMIN",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
    return user



def test_unicode_and_devanagari_numeral_normalization():
    """Verify Unicode NFKC normalization and Devanagari digit translation."""
    raw = "संस्थान\u200b का\ufeff नाम:   तकनीकी   महाविद्यालय"
    clean = normalize_unicode_text(raw)
    assert "\u200b" not in clean
    assert "\ufeff" not in clean
    assert "   " not in clean

    devanagari_nums = "स्वीकृत क्षमता: १२० एवं सत्र: २०२४-२५"
    ascii_nums = normalize_devanagari_numerals(devanagari_nums)
    assert "120" in ascii_nums
    assert "2024-25" in ascii_nums


def test_script_distribution_language_detection():
    """Test honest language classification and short-text rejection."""
    # 1. Pure English text
    eng_text = "All India Council for Technical Education Approval Process Handbook 2024-25"
    res_en = detect_text_language(eng_text)
    assert res_en["language"] == "en"
    assert res_en["confidence"] > 0.8
    assert res_en["is_mixed"] is False

    # 2. Pure Hindi text
    hi_text = "अखिल भारतीय तकनीकी शिक्षा परिषद अनुमोदन प्रक्रिया पुस्तिका वर्ष २०२४-२५"
    res_hi = detect_text_language(hi_text)
    assert res_hi["language"] == "hi"
    assert res_hi["confidence"] > 0.8
    assert res_hi["is_mixed"] is False

    # 3. Mixed script text
    mixed_text = "अखिल भारतीय तकनीकी शिक्षा परिषद (AICTE) Approved Institution of Technology"
    res_mix = detect_text_language(mixed_text)
    assert res_mix["language"] == "mixed"
    assert res_mix["is_mixed"] is True

    # 4. Short / ambiguous snippet (must be labeled 'und' without fabricated confidence)
    short_text = "C-12345"
    res_short = detect_text_language(short_text)
    assert res_short["language"] == "und"
    assert res_short["confidence"] is None
    assert res_short["method"] == "INSUFFICIENT_TEXT"


def test_extract_multilingual_candidate_fields():
    """Test bilingual regex pattern extraction and normalization of Hindi/English fields."""
    sample_page_text = """
    अखिल भारतीय तकनीकी शिक्षा परिषद
    अनुमोदन पत्र
    संस्थान का नाम : राजकीय महिला प्रौद्योगिकी संस्थान
    स्वीकृत क्षमता : २४०
    शैक्षणिक सत्र : २०२४-२५
    संस्था कोड : AISHE-C-54321
    दिनांक : १५/०७/२०२४
    """
    fields = extract_multilingual_candidate_fields(sample_page_text, "doc-test-1", 1)
    field_map = {f["field_name"]: f for f in fields}

    assert "institution_name" in field_map
    assert "राजकीय महिला प्रौद्योगिकी संस्थान" in field_map["institution_name"]["raw_value"]

    assert "approved_intake" in field_map
    assert field_map["approved_intake"]["normalized_value"] == "240"

    assert "academic_year" in field_map
    assert field_map["academic_year"]["normalized_value"] == "2024-25"

    assert "aishe_code" in field_map
    assert "AISHE-C-54321" in field_map["aishe_code"]["normalized_value"]

    assert "issue_date" in field_map
    assert field_map["issue_date"]["normalized_value"] == "15-07-2024"


def test_glossary_translation_provider():
    """Verify local statutory glossary translation without external API calls."""
    provider = GlossaryTranslationProvider()
    input_text = "संस्थान का नाम और स्वीकृत क्षमता अखिल भारतीय तकनीकी शिक्षा परिषद द्वारा अनुमोदित है।"
    res = provider.translate(input_text)

    assert "[Institution Name]" in res["translated_text"]
    assert "[Approved Intake]" in res["translated_text"]
    assert "[All India Council for Technical Education (AICTE)]" in res["translated_text"]
    assert len(res["glossary_terms_found"]) >= 3
    assert res["provider"] == "LOCAL_REGULATORY_GLOSSARY"


def test_external_translation_stub_unconfigured():
    """Verify unconfigured cloud translator honestly rejects requests."""
    stub = ExternalTranslationStub()
    with pytest.raises(ValidationException) as exc:
        stub.translate("कुछ पाठ")
    assert "not configured" in str(exc.value).lower()


def test_multilingual_document_analysis_flow(db_session, multilingual_user):
    """Integration test: analyze a document with multiple pages of Hindi and English content."""
    # Setup test hierarchy
    inst = Institution(
        institution_name="Multilingual Institute of Technology",
        institution_identifier="INST-ML-001",
        state="Uttar Pradesh",
        city="Lucknow"
    )
    db_session.add(inst)
    db_session.commit()

    cat = ApplicationCategory(code="NEW_PROG", name="New Program")
    db_session.add(cat)
    db_session.commit()

    app = Application(
        institution_id=inst.id,
        category_code=cat.code,
        application_reference="APP-ML-TEST-001",
        created_by=multilingual_user.id,
        declared_data={"declared_intake": 180}
    )
    db_session.add(app)
    db_session.commit()

    doc = Document(
        application_id=app.id,
        original_filename="approval_letter_hindi.pdf",
        storage_key="store-key-hi-001",
        uploaded_by=multilingual_user.id,
        sha256="1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        file_size_bytes=45000,
        media_type="application/pdf",
        page_count=2
    )
    db_session.add(doc)
    db_session.commit()

    run = ProcessingRun(document_id=doc.id, status="COMPLETED")
    db_session.add(run)
    db_session.commit()

    # Page 1: Hindi content
    p1 = DocumentPage(
        document_id=doc.id,
        processing_run_id=run.id,
        page_number=1,
        raw_text="संस्थान का नाम: राजकीय प्रौद्योगिकी संस्थान। स्वीकृत क्षमता: १८०। शैक्षणिक सत्र: २०२४-२५।",
        clean_text="संस्थान का नाम: राजकीय प्रौद्योगिकी संस्थान। स्वीकृत क्षमता: १८०। शैक्षणिक सत्र: २०२४-२५।",
        char_count=90,
        text_source="OCR"
    )
    # Page 2: English content
    p2 = DocumentPage(
        document_id=doc.id,
        processing_run_id=run.id,
        page_number=2,
        raw_text="This is an official English endorsement regarding institutional accreditation and building compliance.",
        clean_text="This is an official English endorsement regarding institutional accreditation and building compliance.",
        char_count=105,
        text_source="DIGITAL_TEXT"
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    # Run multilingual analysis
    summary = analyze_document_multilingual(db_session, doc.id)

    assert summary["document_id"] == doc.id
    assert summary["page_count"] == 2
    assert summary["candidate_fields_discovered"] >= 3

    # Check that database records reflect detected languages
    db_session.refresh(doc)
    db_session.refresh(p1)
    db_session.refresh(p2)

    assert p1.detected_language == "hi"
    assert p2.detected_language == "en"
    assert doc.detected_language in ["hi", "en", "mixed"]


def test_multilingual_api_endpoints(client, multilingual_user, db_session):
    """Test FastAPI multilingual scrutiny endpoints."""
    # 1. Statutory Glossary endpoint
    gloss_resp = client.get("/api/v1/multilingual/glossary")
    assert gloss_resp.status_code == 200
    glossary = gloss_resp.json()
    assert "संस्थान का नाम" in glossary
    assert glossary["संस्थान का नाम"] == "Institution Name"

    # 2. Create sample doc
    inst = Institution(institution_name="GL Tech", institution_identifier="GLT-01", state="Delhi", city="Delhi")
    db_session.add(inst)
    db_session.commit()

    cat = ApplicationCategory(code="REV_01", name="Revision")
    db_session.add(cat)
    db_session.commit()

    app = Application(
        institution_id=inst.id,
        category_code=cat.code,
        application_reference="APP-API-ML-01",
        created_by=multilingual_user.id
    )
    db_session.add(app)
    db_session.commit()

    doc = Document(
        application_id=app.id,
        original_filename="sample_hi.pdf",
        storage_key="store-key-hi-002",
        uploaded_by=multilingual_user.id,
        sha256="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        file_size_bytes=20000,
        media_type="application/pdf",
        page_count=1
    )
    db_session.add(doc)
    db_session.commit()

    run2 = ProcessingRun(document_id=doc.id, status="COMPLETED")
    db_session.add(run2)
    db_session.commit()

    page = DocumentPage(
        document_id=doc.id,
        processing_run_id=run2.id,
        page_number=1,
        raw_text="संस्थान का नाम: दिल्ली महिला कॉलेज। स्वीकृत क्षमता: १२०।",
        clean_text="संस्थान का नाम: दिल्ली महिला कॉलेज। स्वीकृत क्षमता: १२०।",
        char_count=60,
        text_source="DIGITAL_TEXT"
    )
    db_session.add(page)
    db_session.commit()

    # Reprocess document
    rep_resp = client.post(f"/api/v1/documents/{doc.id}/multilingual-reprocess")
    assert rep_resp.status_code == 200
    rep_data = rep_resp.json()
    assert rep_data["document_id"] == doc.id
    assert rep_data["candidate_fields_discovered"] >= 2

    # Get document languages
    lang_resp = client.get(f"/api/v1/documents/{doc.id}/languages")
    assert lang_resp.status_code == 200
    lang_data = lang_resp.json()
    assert lang_data["document_id"] == doc.id
    assert len(lang_data["page_languages"]) == 1
    assert lang_data["page_languages"][0]["detected_language"] == "hi"

    # Get extracted fields
    fields_resp = client.get(f"/api/v1/documents/{doc.id}/extracted-fields")
    assert fields_resp.status_code == 200
    fields_data = fields_resp.json()
    assert len(fields_data) >= 2
    field_names = [f["field_name"] for f in fields_data]
    assert "institution_name" in field_names
    assert "approved_intake" in field_names

    # Translate text
    trans_resp = client.post(
        f"/api/v1/documents/{doc.id}/translate",
        json={"page_number": 1, "provider": "GLOSSARY"}
    )
    assert trans_resp.status_code == 200
    trans_data = trans_resp.json()
    assert "[Institution Name]" in trans_data["translated_text"]
    assert "[Approved Intake]" in trans_data["translated_text"]
    assert trans_data["provider"] == "LOCAL_REGULATORY_GLOSSARY"
