import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.ts';
import { hashPassword } from './auth.ts';
import type {
  ApplicationStage,
  CitizenRecord,
  DepartmentRecord,
  DocumentRequirement,
  EligibilityRules,
  Language,
  SchemeAlertRecord,
  SchemeRecord,
  TrackedApplicationRecord,
  UploadedDocumentRecord,
} from './types.ts';

let dbInstance: Database.Database | null = null;

export function getDb(customPath?: string): Database.Database {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const targetPath = customPath || config.databasePath;
  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.mkdirSync(config.uploadDir, { recursive: true });

  const db = new Database(targetPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initializeSchema(db);
  seedInitialData(db);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

export function resetDbForTests(db: Database.Database): void {
  dbInstance = db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_te TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      official_portal TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title_en TEXT NOT NULL,
      title_te TEXT NOT NULL,
      category TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'Andhra Pradesh',
      scheme_status TEXT NOT NULL DEFAULT 'active',
      department_id INTEGER NOT NULL,
      short_desc_en TEXT NOT NULL,
      short_desc_te TEXT NOT NULL,
      eligibility_summary_en TEXT NOT NULL,
      eligibility_summary_te TEXT NOT NULL,
      eligibility_rules_json TEXT NOT NULL,
      documents_json TEXT NOT NULL,
      application_steps_en_json TEXT NOT NULL,
      application_steps_te_json TEXT NOT NULL,
      benefit_summary_en TEXT NOT NULL,
      benefit_summary_te TEXT NOT NULL,
      official_url TEXT NOT NULL,
      source_document_name TEXT NOT NULL,
      last_verified_at TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      page_count INTEGER NOT NULL DEFAULT 1,
      scheme_id INTEGER,
      source_type TEXT NOT NULL DEFAULT 'citizen_pdf',
      status TEXT NOT NULL DEFAULT 'indexed',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS document_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER,
      scheme_id INTEGER,
      source_type TEXT NOT NULL,
      title TEXT NOT NULL,
      document_name TEXT NOT NULL,
      page_number INTEGER,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding_json TEXT,
      official_url TEXT,
      is_sample INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'super_admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS citizens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT 'Guntur',
      occupation TEXT NOT NULL DEFAULT 'Citizen',
      preferred_language TEXT NOT NULL DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS query_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      language TEXT NOT NULL,
      query_text TEXT NOT NULL,
      mode TEXT NOT NULL,
      retrieved_count INTEGER NOT NULL DEFAULT 0,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS citizen_bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      scheme_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(session_id, scheme_id),
      FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scheme_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title_en TEXT NOT NULL,
      title_te TEXT NOT NULL,
      category TEXT NOT NULL,
      summary_en TEXT NOT NULL,
      summary_te TEXT NOT NULL,
      source_url TEXT NOT NULL,
      alert_type TEXT NOT NULL DEFAULT 'new_scheme',
      published_at TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS citizen_application_tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_key TEXT NOT NULL,
      scheme_id INTEGER NOT NULL,
      stage TEXT NOT NULL DEFAULT 'collecting_docs',
      checked_doc_ids_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      application_ref TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(owner_key, scheme_id),
      FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE
    );
  `);

  const schemeCols = db.prepare('PRAGMA table_info(schemes)').all() as Array<{ name: string }>;
  if (!schemeCols.some((c) => c.name === 'scheme_status')) {
    db.exec("ALTER TABLE schemes ADD COLUMN scheme_status TEXT NOT NULL DEFAULT 'active'");
  }
}

function seedInitialData(db: Database.Database): void {
  const adminCount = db.prepare('SELECT COUNT(*) as cnt FROM admins').get() as { cnt: number };
  if (adminCount.cnt === 0) {
    db.prepare(
      'INSERT INTO admins (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(
      'CivicSahayak Admin',
      config.adminEmail.toLowerCase(),
      hashPassword(config.adminPassword),
      'super_admin'
    );
  }

  const deptCount = db.prepare('SELECT COUNT(*) as cnt FROM departments').get() as { cnt: number };
  if (deptCount.cnt === 0) {
    const insertDept = db.prepare(
      'INSERT INTO departments (name_en, name_te, code, official_portal) VALUES (?, ?, ?, ?)'
    );
    const depts = [
      [
        'Social Welfare & Higher Education Department, AP',
        'సాంఘిక సంక్షేమ మరియు ఉన్నత విద్యా శాఖ, ఆంధ్రప్రదేశ్',
        'AP_EDU_SW',
        'https://jnanabhumi.ap.gov.in',
      ],
      [
        'Department of Agriculture & Cooperation, AP',
        'వ్యవసాయ మరియు సహకార శాఖ, ఆంధ్రప్రదేశ్',
        'AP_AGRI',
        'https://apagrisnet.gov.in',
      ],
      [
        'Health, Medical & Family Welfare Department, AP',
        'ఆరోగ్య, వైద్య మరియు కుటుంబ సంక్షేమ శాఖ, ఆంధ్రప్రదేశ్',
        'AP_HEALTH',
        'https://drntrvaidyaseva.ap.gov.in',
      ],
      [
        'Women Development & Child Welfare Department, AP',
        'మహిళా అభివృద్ధి మరియు శిశు సంక్షేమ శాఖ, ఆంధ్రప్రదేశ్',
        'AP_WDCW',
        'https://wdcw.ap.gov.in',
      ],
      [
        'AP State Skill Development Corporation (APSSDC)',
        'ఆంధ్రప్రదేశ్ రాష్ట్ర నైపుణ్యాభివృద్ధి సంస్థ (APSSDC)',
        'AP_SKILL',
        'https://www.apssdc.in',
      ],
      [
        'Society for Elimination of Rural Poverty (SERP), AP',
        'గ్రామీణ పేదరిక నిర్మూలన సంస్థ (SERP), ఆంధ్రప్రదేశ్',
        'AP_SERP',
        'https://sspensions.ap.gov.in',
      ],
      [
        'ITE&C / Grama Ward Sachivalayam & MeeSeva, AP',
        'గ్రామ వార్డు సచివాలయం మరియు మీసేవా సేవలు, ఆంధ్రప్రదేశ్',
        'AP_MEESEVA',
        'https://ap.meeseva.gov.in',
      ],
    ];
    for (const d of depts) {
      insertDept.run(...d);
    }
  }

  const schemeCount = db.prepare('SELECT COUNT(*) as cnt FROM schemes').get() as { cnt: number };
  if (schemeCount.cnt === 0) {
    const deptRows = db.prepare('SELECT id, code FROM departments').all() as Array<{
      id: number;
      code: string;
    }>;
    const deptMap = new Map(deptRows.map((d) => [d.code, d.id]));

    const sampleSchemes = [
      {
        slug: 'ap-post-matric-scholarship',
        title_en: 'AP Post-Matric Scholarship (Jnanabhumi)',
        title_te: 'ఆంధ్రప్రదేశ్ పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్ (జ్ఞానభూమి)',
        category: 'Education and Scholarships',
        state: 'Andhra Pradesh',
        department_id: deptMap.get('AP_EDU_SW')!,
        short_desc_en:
          'Tuition fee reimbursement and maintenance support for eligible SC, ST, BC, EBC, Minority, and Kapu college students enrolled in recognized post-matric courses in Andhra Pradesh.',
        short_desc_te:
          'ఆంధ్రప్రదేశ్‌లో గుర్తింపు పొందిన పోస్ట్-మెట్రిక్ కోర్సులలో చదువుతున్న అర్హులైన SC, ST, BC, EBC, మైనారిటీ మరియు కాపు విద్యార్థులకు ట్యూషన్ ఫీజు రీయింబర్స్‌మెంట్ మరియు నిర్వహణ సహాయం.',
        eligibility_summary_en:
          'Permanent resident of Andhra Pradesh pursuing ITI, Polytechnic, Degree, Engineering, Medicine, or PG courses with annual family income up to INR 2,50,000 and minimum 75% college attendance.',
        eligibility_summary_te:
          'ఆంధ్రప్రదేశ్ శాశ్వత నివాసియై ఉండి ITI, పాలిటెక్నిక్, డిగ్రీ, ఇంజనీరింగ్, మెడిసిన్ లేదా PG చదువుతున్న విద్యార్థులు; కుటుంబ వార్షిక ఆదాయం రూ. 2,50,000 మించకూడదు మరియు కనీసం 75% హాజరు ఉండాలి.',
        eligibility_rules: {
          states: ['Andhra Pradesh'],
          minAge: 15,
          maxAge: 35,
          maxAnnualIncomeInr: 250000,
          allowedOccupations: ['Student'],
          educationLevels: ['ITI / Vocational', 'Diploma / Polytechnic', 'Undergraduate', 'Postgraduate'],
          gender: 'all',
          notes_en: [
            'Applicant must belong to SC, ST, BC, EBC, Minority, or Kapu welfare category as per AP guidelines.',
            'Minimum 75% attendance per semester/year is required for continuation.',
            'Not eligible if another family member is a regular government employee (except sanitation workers under specific rules).',
          ],
          notes_te: [
            'దరఖాస్తుదారు AP మార్గదర్శకాల ప్రకారం SC, ST, BC, EBC, మైనారిటీ లేదా కాపు వర్గానికి చెందినవారై ఉండాలి.',
            'ప్రతి సెమిస్టర్/సంవత్సరంలో కనీసం 75% హాజరు తప్పనిసరి.',
            'కుటుంబంలో ప్రభుత్వ ఉద్యోగి ఉన్నట్లయితే (ప్రత్యేక మినహాయింపులు తప్ప) అర్హత ఉండదు.',
          ],
        } satisfies EligibilityRules,
        documents: [
          {
            id: 'doc-aadhaar',
            name_en: 'Aadhaar Card of Student and Mother/Guardian',
            name_te: 'విద్యార్థి మరియు తల్లి/సంరక్షకుల ఆధార్ కార్డు',
            required: true,
            instructions_en: 'Ensure Aadhaar is linked to an active bank account with NPCI seeding.',
            instructions_te: 'ఆధార్ నంబర్ NPCI సీడింగ్‌తో బ్యాంకు ఖాతాకు అనుసంధానమై ఉండాలి.',
            source_reference: 'Jnanabhumi Portal Guidelines (Sample Record)',
          },
          {
            id: 'doc-income',
            name_en: 'Integrated Caste & Income Certificate (MeeSeva)',
            name_te: 'కులం మరియు ఆదాయ ధృవీకరణ పత్రం (మీసేవా)',
            required: true,
            instructions_en: 'Valid income certificate or Rice Card verified via Grama/Ward Sachivalayam.',
            instructions_te: 'గ్రామ/వార్డు సచివాలయం ద్వారా ధృవీకరించిన ఆదాయ సర్టిఫికేట్ లేదా రైస్ కార్డు.',
            source_reference: 'AP Social Welfare Dept Guidelines (Sample Record)',
          },
          {
            id: 'doc-bonafide',
            name_en: 'College Admission & Bonafide Certificate / SSC Memo',
            name_te: 'కళాశాల అడ్మిషన్, బోనాఫైడ్ సర్టిఫికేట్ మరియు 10వ తరగతి మెమో',
            required: true,
            instructions_en: 'College principal must verify enrollment on Jnanabhumi biometric portal.',
            instructions_te: 'కళాశాల ప్రిన్సిపాల్ జ్ఞానభూమి పోర్టల్‌లో ప్రవేశాన్ని ధృవీకరించాలి.',
            source_reference: 'Jnanabhumi Portal Guidelines (Sample Record)',
          },
          {
            id: 'doc-hostel',
            name_en: 'Hostel / Mess Attendance Certificate',
            name_te: 'హాస్టల్ / మెస్ ధృవీకరణ పత్రం',
            required: false,
            condition_en: 'Required only if applying for hostel maintenance allowance.',
            condition_te: 'హాస్టల్ నిర్వహణ భత్యం కోసం దరఖాస్తు చేసే విద్యార్థులకు మాత్రమే అవసరం.',
            instructions_en: 'Obtain endorsement from recognized college/welfare hostel warden.',
            instructions_te: 'గుర్తింపు పొందిన హాస్టల్ వార్డెన్ సంతకం అవసరం.',
            source_reference: 'AP Post-Matric Rules (Sample Record)',
          },
        ] satisfies DocumentRequirement[],
        application_steps_en: [
          'Register or verify your student profile on the official Jnanabhumi portal (jnanabhumi.ap.gov.in) or through your college scholarship cell.',
          'Complete biometric / e-KYC verification at your college or nearest Grama/Ward Sachivalayam.',
          'Upload or auto-fetch Income, Caste, SSC Hall Ticket, and Bank NPCI details.',
          'Submit the application before the notified academic deadline and save the Jnanabhumi Application ID.',
        ],
        application_steps_te: [
          'అధికారిక జ్ఞానభూమి పోర్టల్ (jnanabhumi.ap.gov.in) లేదా కళాశాల స్కాలర్‌షిప్ విభాగం ద్వారా నమోదు చేయండి.',
          'మీ కళాశాల లేదా సమీప గ్రామ/వార్డు సచివాలయంలో బయోమెట్రిక్ / e-KYC పూర్తి చేయండి.',
          'ఆదాయం, కులం, SSC హాల్ టికెట్ మరియు బ్యాంకు NPCI వివరాలను ధృవీకరించండి.',
          'గడువు తేదీలోగా దరఖాస్తు సమర్పించి అప్లికేషన్ ఐడిని భద్రపరచండి.',
        ],
        benefit_summary_en:
          'Full tuition fee reimbursement as fixed by AP Higher Education regulatory authorities plus annual maintenance support (subject to latest GO limits).',
        benefit_summary_te:
          'ప్రభుత్వ నిబంధనల ప్రకారం పూర్తి ట్యూషన్ ఫీజు రీయింబర్స్‌మెంట్ మరియు వార్షిక నిర్వహణ సహాయం.',
        official_url: 'https://jnanabhumi.ap.gov.in',
        source_document_name: 'AP_Sample_Scholarship_Notification_2026.pdf',
        last_verified_at: '2026-10-15',
        is_sample: 1,
      },
      {
        slug: 'ap-thalliki-vandanam',
        title_en: 'Thalliki Vandanam (School Student Financial Assistance)',
        title_te: 'తల్లికి వందనం (పాఠశాల విద్యార్థుల ఆర్థిక సహాయం)',
        category: 'Education and Scholarships',
        state: 'Andhra Pradesh',
        department_id: deptMap.get('AP_EDU_SW')!,
        short_desc_en:
          'Annual financial assistance credited to mothers/guardians of school-going children studying in Class 1 to Class 12 across government, aided, and private schools in Andhra Pradesh.',
        short_desc_te:
          'ఆంధ్రప్రదేశ్‌లోని ప్రభుత్వ, ఎయిడెడ్ మరియు ప్రైవేట్ పాఠశాలల్లో 1 నుండి 12వ తరగతి వరకు చదువుతున్న విద్యార్థుల తల్లులకు/సంరక్షకులకు వార్షిక ఆర్థిక సహాయం.',
        eligibility_summary_en:
          'AP resident families with school-going children (Classes 1–12) meeting household income/ration card norms and 75% school attendance requirement.',
        eligibility_summary_te:
          '1 నుండి 12వ తరగతి వరకు చదువుతున్న పిల్లలు కలిగిన AP నివాస కుటుంబాలు; కనీసం 75% పాఠశాల హాజరు మరియు ఆదాయ/రైస్ కార్డు నిబంధనలకు లోబడి ఉండాలి.',
        eligibility_rules: {
          states: ['Andhra Pradesh'],
          minAge: 5,
          maxAge: 19,
          maxAnnualIncomeInr: 180000,
          allowedOccupations: ['Student', 'Homemaker', 'Unemployed', 'Farmer', 'Daily Wage Worker'],
          educationLevels: ['Primary / High School (Class 1-10)', 'Intermediate (Class 11-12)'],
          gender: 'all',
          notes_en: [
            'Student must maintain minimum 75% school attendance as recorded in UDISE / ChildInfo.',
            'Mother or female guardian bank account must be Aadhaar-seeded.',
          ],
          notes_te: [
            'విద్యార్థి UDISE / ChildInfo రికార్డుల ప్రకారం కనీసం 75% హాజరు కలిగి ఉండాలి.',
            'తల్లి లేదా మహిళా సంరక్షకుల బ్యాంకు ఖాతా ఆధార్‌తో అనుసంధానమై ఉండాలి.',
          ],
        } satisfies EligibilityRules,
        documents: [
          {
            id: 'tv-aadhaar',
            name_en: 'Mother/Guardian & Student Aadhaar Cards',
            name_te: 'తల్లి/సంరక్షకులు మరియు విద్యార్థి ఆధార్ కార్డులు',
            required: true,
            instructions_en: 'Must match school admission records.',
            instructions_te: 'పాఠశాల రికార్డులతో వివరాలు సరిపోలాలి.',
            source_reference: 'AP School Education Sample Guidelines',
          },
          {
            id: 'tv-ricecard',
            name_en: 'AP Rice Card / Household Income Proof',
            name_te: 'ఆంధ్రప్రదేశ్ రైస్ కార్డు / కుటుంబ ఆదాయ పత్రం',
            required: true,
            instructions_en: 'Used for household verification at Grama/Ward Sachivalayam.',
            instructions_te: 'గ్రామ/వార్డు సచివాలయ ధృవీకరణకు అవసరం.',
            source_reference: 'AP School Education Sample Guidelines',
          },
          {
            id: 'tv-school',
            name_en: 'School Enrollment & Attendance Confirmation',
            name_te: 'పాఠశాల నమోదు మరియు హాజరు ధృవీకరణ',
            required: true,
            instructions_en: 'Verified directly by school headmaster in ChildInfo portal.',
            instructions_te: 'పాఠశాల ప్రధానోపాధ్యాయులు ChildInfo పోర్టల్‌లో ధృవీకరిస్తారు.',
            source_reference: 'AP School Education Sample Guidelines',
          },
        ] satisfies DocumentRequirement[],
        application_steps_en: [
          'Verify student enrollment and mother bank details with the school headmaster.',
          'Check preliminary eligibility list displayed at your Grama/Ward Sachivalayam.',
          'Complete e-KYC if prompted by the Village/Ward Volunteer or Sachivalayam staff.',
        ],
        application_steps_te: [
          'పాఠశాల ప్రధానోపాధ్యాయుల వద్ద విద్యార్థి పేరు మరియు తల్లి బ్యాంకు ఖాతా వివరాలను సరిచూసుకోండి.',
          'గ్రామ/వార్డు సచివాలయంలో ప్రదర్శించిన అర్హుల జాబితాను తనిఖీ చేయండి.',
          'అవసరమైతే సచివాలయంలో e-KYC పూర్తి చేయండి.',
        ],
        benefit_summary_en: 'Annual educational financial support per eligible school-going child (confirm latest GO amount on official AP portal).',
        benefit_summary_te: 'అర్హులైన పాఠశాల విద్యార్థుల కోసం వార్షిక ఆర్థిక సహాయం (అధికారిక GO ప్రకారం).',
        official_url: 'https://cse.ap.gov.in',
        source_document_name: 'AP_Sample_School_Welfare_Guidelines.pdf',
        last_verified_at: '2026-10-10',
        is_sample: 1,
      },
      {
        slug: 'ap-annadata-sukhibhava',
        title_en: 'Annadata Sukhibhava — Farmer Investment Support',
        title_te: 'అన్నదాత సుఖీభవ — రైతు పెట్టుబడి సహాయం',
        category: 'Agriculture and Farmer Welfare',
        state: 'Andhra Pradesh',
        department_id: deptMap.get('AP_AGRI')!,
        short_desc_en:
          'Direct financial investment support for landowning farmers and eligible tenant cultivators in Andhra Pradesh to cover seasonal crop input expenses alongside PM-KISAN.',
        short_desc_te:
          'ఆంధ్రప్రదేశ్‌లోని భూమి కలిగిన రైతులు మరియు అర్హులైన కౌలు రైతులకు పంట పెట్టుబడి ఖర్చుల కోసం నేరుగా ఆర్థిక సహాయం.',
        eligibility_summary_en:
          'Cultivating farmer families in Andhra Pradesh registered in Webland / e-Crop / CCRC (for tenant farmers) within notified landholding limits.',
        eligibility_summary_te:
          'ఆంధ్రప్రదేశ్‌లో Webland / e-Crop లేదా CCRC (కౌలు రైతులకు) లో నమోదైన సాగు రైతు కుటుంబాలు.',
        eligibility_rules: {
          states: ['Andhra Pradesh'],
          minAge: 18,
          maxAge: 90,
          maxAnnualIncomeInr: 500000,
          allowedOccupations: ['Farmer', 'Tenant Farmer', 'Agricultural Worker'],
          educationLevels: ['Any'],
          gender: 'all',
          maxWetLandAcres: 5,
          maxDryLandAcres: 10,
          notes_en: [
            'Land records must be updated in Webland / Meebhoomi.',
            'Tenant farmers (SC/ST/BC/Minority) require a valid Crop Cultivator Rights Card (CCRC).',
            'Income-tax payers and regular government employees are generally excluded.',
          ],
          notes_te: [
            'భూమి వివరాలు Webland / మీభూమిలో నమోదై ఉండాలి.',
            'కౌలు రైతులకు చెల్లుబాటు అయ్యే CCRC కార్డు తప్పనిసరి.',
            'ఆదాయపు పన్ను చెల్లించేవారు మరియు ప్రభుత్వ ఉద్యోగులు అర్హులు కారు.',
          ],
        } satisfies EligibilityRules,
        documents: [
          {
            id: 'ag-aadhaar',
            name_en: 'Farmer Aadhaar Card (NPCI Bank Seeded)',
            name_te: 'రైతు ఆధార్ కార్డు (బ్యాంకు ఖాతాకు అనుసంధానం)',
            required: true,
            instructions_en: 'DBT transfer goes only to Aadhaar-mapped active bank account.',
            instructions_te: 'DBT నగదు ఆధార్ అనుసంధానిత బ్యాంకు ఖాతాలో జమ అవుతుంది.',
            source_reference: 'AP Agriculture Dept Sample Guidelines',
          },
          {
            id: 'ag-land',
            name_en: 'Pattadar Passbook / Webland 1B Record',
            name_te: 'పట్టాదార్ పాస్‌బుక్ / వెబ్‌ల్యాండ్ 1B రికార్డు',
            required: false,
            condition_en: 'Required for landowning farmers.',
            condition_te: 'సొంత భూమి కలిగిన రైతులకు అవసరం.',
            instructions_en: 'Ensure survey numbers match e-Crop registration.',
            instructions_te: 'సర్వే నంబర్లు e-Crop నమోదుతో సరిపోలాలి.',
            source_reference: 'AP Agriculture Dept Sample Guidelines',
          },
          {
            id: 'ag-ccrc',
            name_en: 'Crop Cultivator Rights Card (CCRC)',
            name_te: 'కౌలు రైతు గుర్తింపు కార్డు (CCRC)',
            required: false,
            condition_en: 'Required only for landless tenant farmers.',
            condition_te: 'భూమి లేని కౌలు రైతులకు మాత్రమే అవసరం.',
            instructions_en: 'Issued annually through Village Revenue Officer / Rythu Seva Kendra.',
            instructions_te: 'గ్రామ రెవెన్యూ అధికారి / రైతు సేవా కేంద్రం ద్వారా పొందాలి.',
            source_reference: 'AP Agriculture Dept Sample Guidelines',
          },
        ] satisfies DocumentRequirement[],
        application_steps_en: [
          'Visit your nearest Rythu Seva Kendra (RSK) or Grama Sachivalayam with Aadhaar and land/CCRC details.',
          'Verify e-Crop and Webland data along with PM-KISAN e-KYC status.',
          'Track disbursement status on the official AP Agriculture / Annadata Sukhibhava portal.',
        ],
        application_steps_te: [
          'ఆధార్ మరియు భూమి/CCRC పత్రాలతో సమీప రైతు సేవా కేంద్రం (RSK) లేదా గ్రామ సచివాలయాన్ని సంప్రదించండి.',
          'e-Crop, Webland మరియు PM-KISAN e-KYC స్థితిని సరిచూసుకోండి.',
          'అధికారిక AP వ్యవసాయ పోర్టల్ ద్వారా సహాయ స్థితిని తనిఖీ చేయండి.',
        ],
        benefit_summary_en:
          'Annual direct benefit transfer investment support per eligible farmer family in instalments (verify current state + PM-KISAN split on official portal).',
        benefit_summary_te: 'అర్హులైన రైతు కుటుంబాలకు విడతల వారీగా వార్షిక పెట్టుబడి సహాయం.',
        official_url: 'https://apagrisnet.gov.in',
        source_document_name: 'AP_Sample_Farmer_Investment_Scheme.pdf',
        last_verified_at: '2026-10-12',
        is_sample: 1,
      },
      {
        slug: 'ap-ntr-vaidya-seva',
        title_en: 'Dr. NTR Vaidya Seva (Universal Health Coverage)',
        title_te: 'డాక్టర్ ఎన్టీఆర్ వైద్య సేవ (ఉచిత ఆరోగ్య బీమా)',
        category: 'Health and Family Welfare',
        state: 'Andhra Pradesh',
        department_id: deptMap.get('AP_HEALTH')!,
        short_desc_en:
          'Cashless secondary and tertiary medical treatment at empanelled network hospitals for eligible low- and middle-income families in Andhra Pradesh.',
        short_desc_te:
          'ఆంధ్రప్రదేశ్‌లోని అర్హులైన కుటుంబాలకు నెట్‌వర్క్ ఆసుపత్రులలో నగదు రహిత ద్వితీయ మరియు తృతీయ స్థాయి వైద్య చికిత్స.',
        eligibility_summary_en:
          'Andhra Pradesh families holding a valid White Ration / Rice Card or annual family income up to INR 5,00,000 as per Dr. NTR Vaidya Seva Trust guidelines.',
        eligibility_summary_te:
          'చెల్లుబాటు అయ్యే తెల్ల రేషన్/రైస్ కార్డు లేదా కుటుంబ వార్షిక ఆదాయం రూ. 5,00,000 లోపు ఉన్న ఆంధ్రప్రదేశ్ కుటుంబాలు.',
        eligibility_rules: {
          states: ['Andhra Pradesh'],
          minAge: 0,
          maxAge: 100,
          maxAnnualIncomeInr: 500000,
          allowedOccupations: ['Any'],
          educationLevels: ['Any'],
          gender: 'all',
          notes_en: [
            'Covers families with Rice Card, Aarogyasri Health Card, or verified annual income <= INR 5 lakh.',
            'Cashless treatment applies to notified procedures at empanelled network hospitals.',
          ],
          notes_te: [
            'రైస్ కార్డు, ఆరోగ్యశ్రీ కార్డు లేదా వార్షిక ఆదాయం రూ. 5 లక్షలలోపు ఉన్న కుటుంబాలకు వర్తిస్తుంది.',
            'ఎంప్యానెల్ చేసిన ఆసుపత్రులలో గుర్తించబడిన చికిత్సలకు నగదు రహిత సేవ అందుబాటులో ఉంటుంది.',
          ],
        } satisfies EligibilityRules,
        documents: [
          {
            id: 'hs-card',
            name_en: 'Dr. NTR Vaidya Seva / Aarogyasri Health Card or Rice Card',
            name_te: 'ఎన్టీఆర్ వైద్య సేవ / ఆరోగ్యశ్రీ కార్డు లేదా రైస్ కార్డు',
            required: true,
            instructions_en: 'Present card number at the Arogya Mitra desk in any network hospital.',
            instructions_te: 'నెట్‌వర్క్ ఆసుపత్రిలోని ఆరోగ్య మిత్ర డెస్క్ వద్ద కార్డును చూపించాలి.',
            source_reference: 'Dr. NTR Vaidya Seva Trust Guidelines (Sample Record)',
          },
          {
            id: 'hs-aadhaar',
            name_en: 'Patient Aadhaar Card',
            name_te: 'రోగి ఆధార్ కార్డు',
            required: true,
            instructions_en: 'Used for patient identity verification and pre-authorization.',
            instructions_te: 'రోగి గుర్తింపు మరియు ప్రీ-ఆథరైజేషన్ కోసం అవసరం.',
            source_reference: 'Dr. NTR Vaidya Seva Trust Guidelines (Sample Record)',
          },
          {
            id: 'hs-income',
            name_en: 'Income Certificate (for non-Rice Card families up to ₹5L)',
            name_te: 'ఆదాయ ధృవీకరణ పత్రం (రైస్ కార్డు లేని రూ.5 లక్షలలోపు కుటుంబాలకు)',
            required: false,
            condition_en: 'Required only if family does not hold an active Rice Card.',
            condition_te: 'రైస్ కార్డు లేని కుటుంబాలకు మాత్రమే అవసరం.',
            instructions_en: 'Obtain via MeeSeva / Grama Sachivalayam.',
            instructions_te: 'మీసేవా / గ్రామ సచివాలయం ద్వారా పొందాలి.',
            source_reference: 'Dr. NTR Vaidya Seva Trust Guidelines (Sample Record)',
          },
        ] satisfies DocumentRequirement[],
        application_steps_en: [
          'Visit an empanelled network hospital or government general hospital and meet the Arogya Mitra helpdesk.',
          'Submit your Health Card / Rice Card and Aadhaar for diagnostic evaluation and trust pre-authorization.',
          'Receive cashless surgical/medical treatment and post-treatment follow-up medicines as covered.',
        ],
        application_steps_te: [
          'ఎంప్యానెల్ నెట్‌వర్క్ ఆసుపత్రి లేదా ప్రభుత్వ ఆసుపత్రిలోని ఆరోగ్య మిత్ర హెల్ప్‌డెస్క్‌ను సంప్రదించండి.',
          'ఆరోగ్య కార్డు / రైస్ కార్డు మరియు ఆధార్ వివరాలు అందించి ప్రీ-ఆథరైజేషన్ పొందండి.',
          'ఆమోదం పొందిన తర్వాత నగదు రహిత వైద్య చికిత్స మరియు ఫాలో-అప్ సేవలు పొందండి.',
        ],
        benefit_summary_en:
          'Cashless medical and surgical coverage for thousands of listed procedures up to notified annual family ceiling.',
        benefit_summary_te: 'జాబితా చేయబడిన వైద్య చికిత్సలకు వార్షిక కుటుంబ పరిమితి వరకు నగదు రహిత ఆరోగ్య కవరేజీ.',
        official_url: 'https://drntrvaidyaseva.ap.gov.in',
        source_document_name: 'AP_Sample_Vaidya_Seva_Guidelines.pdf',
        last_verified_at: '2026-10-14',
        is_sample: 1,
      },
      {
        slug: 'ap-deepam-women-welfare',
        title_en: 'Deepam 2.0 — Free LPG Cylinder Subsidy for Women',
        title_te: 'దీపం 2.0 — మహిళలకు ఉచిత గ్యాస్ సిలిండర్ పథకం',
        category: 'Women and Child Welfare',
        state: 'Andhra Pradesh',
        department_id: deptMap.get('AP_WDCW')!,
        short_desc_en:
          'LPG refill subsidy support for eligible women beneficiaries in Andhra Pradesh holding valid domestic gas connections and Rice Cards.',
        short_desc_te:
          'ఆంధ్రప్రదేశ్‌లో చెల్లుబాటు అయ్యే గృహ గ్యాస్ కనెక్షన్ మరియు రైస్ కార్డు కలిగిన అర్హులైన మహిళా లబ్ధిదారులకు LPG సిలిండర్ సబ్సిడీ సహాయం.',
        eligibility_summary_en:
          'Women residents of Andhra Pradesh with an active domestic LPG connection, valid AP Rice Card, and Aadhaar-linked bank account.',
        eligibility_summary_te:
          'ఆంధ్రప్రదేశ్ నివాసియైన మహిళకు గృహ LPG కనెక్షన్, చెల్లుబాటు అయ్యే రైస్ కార్డు మరియు ఆధార్ అనుసంధానిత బ్యాంకు ఖాతా ఉండాలి.',
        eligibility_rules: {
          states: ['Andhra Pradesh'],
          minAge: 18,
          maxAge: 95,
          maxAnnualIncomeInr: 180000,
          allowedOccupations: ['Any'],
          educationLevels: ['Any'],
          gender: 'female',
          notes_en: [
            'Domestic LPG connection must be in the name of an eligible woman member on the Rice Card.',
            'Subsidy amount is credited via DBT after cylinder delivery.',
          ],
          notes_te: [
            'గృహ LPG కనెక్షన్ రైస్ కార్డులో ఉన్న మహిళ పేరు మీద ఉండాలి.',
            'సిలిండర్ డెలివరీ అయిన తర్వాత సబ్సిడీ మొత్తం DBT ద్వారా బ్యాంకు ఖాతాలో జమ అవుతుంది.',
          ],
        } satisfies EligibilityRules,
        documents: [
          {
            id: 'dp-ricecard',
            name_en: 'AP White Ration / Rice Card',
            name_te: 'ఆంధ్రప్రదేశ్ తెల్ల రేషన్ / రైస్ కార్డు',
            required: true,
            instructions_en: 'Beneficiary woman must be listed in the household Rice Card.',
            instructions_te: 'లబ్ధిదారు మహిళ పేరు కుటుంబ రైస్ కార్డులో ఉండాలి.',
            source_reference: 'AP Civil Supplies & WDCW Sample Note',
          },
          {
            id: 'dp-lpg',
            name_en: 'Domestic LPG Consumer Book & e-KYC Receipt',
            name_te: 'LPG గ్యాస్ కనెక్షన్ పుస్తకం మరియు e-KYC రసీదు',
            required: true,
            instructions_en: 'Ensure LPG agency e-KYC with Aadhaar is completed.',
            instructions_te: 'గ్యాస్ ఏజెన్సీ వద్ద ఆధార్ e-KYC పూర్తి చేసి ఉండాలి.',
            source_reference: 'AP Civil Supplies & WDCW Sample Note',
          },
          {
            id: 'dp-aadhaar',
            name_en: 'Aadhaar Card linked to Bank Account',
            name_te: 'బ్యాంకు ఖాతాకు అనుసంధానించిన ఆధార్ కార్డు',
            required: true,
            instructions_en: 'Required for automated DBT reimbursement.',
            instructions_te: 'DBT రీయింబర్స్‌మెంట్ కోసం అవసరం.',
            source_reference: 'AP Civil Supplies & WDCW Sample Note',
          },
        ] satisfies DocumentRequirement[],
        application_steps_en: [
          'Complete Aadhaar e-KYC with your LPG distributor (IOCL/HPCL/BPCL).',
          'Book your domestic LPG refill through standard agency channels.',
          'Verify subsidy DBT credit to your Aadhaar-seeded bank account after delivery.',
        ],
        application_steps_te: [
          'మీ LPG గ్యాస్ ఏజెన్సీ వద్ద ఆధార్ e-KYC పూర్తి చేయండి.',
          'సాధారణ పద్ధతిలో గృహ గ్యాస్ సిలిండర్ బుక్ చేయండి.',
          'సిలిండర్ డెలివరీ తర్వాత బ్యాంకు ఖాతాలో సబ్సిడీ జమ అయినట్లు తనిఖీ చేయండి.',
        ],
        benefit_summary_en: 'Refill cost subsidy for notified annual LPG cylinders credited directly to beneficiary bank account.',
        benefit_summary_te: 'నిర్ణీత వార్షిక గ్యాస్ సిలిండర్ల ఖర్చుకు నేరుగా బ్యాంకు ఖాతాలో సబ్సిడీ జమ.',
        official_url: 'https://civilsupplies.ap.gov.in',
        source_document_name: 'AP_Sample_Deepam_LPG_Guidelines.pdf',
        last_verified_at: '2026-10-18',
        is_sample: 1,
      },
      {
        slug: 'ap-apssdc-skill-training',
        title_en: 'APSSDC Industry Skill Training & Placement Program',
        title_te: 'APSSDC పరిశ్రమల ఆధారిత నైపుణ్య శిక్షణ మరియు ఉపాధి పథకం',
        category: 'Employment and Skill Development',
        state: 'Andhra Pradesh',
        department_id: deptMap.get('AP_SKILL')!,
        short_desc_en:
          'Free industry-aligned technical, IT, manufacturing, and vocational skill training with placement assistance for youth and graduates in Andhra Pradesh.',
        short_desc_te:
          'ఆంధ్రప్రదేశ్‌లోని యువత మరియు పట్టభద్రులకు ఉచిత టెక్నికల్, IT మరియు వృత్తి నైపుణ్య శిక్షణ మరియు ఉద్యోగ సహాయం.',
        eligibility_summary_en:
          'Unemployed youth or final-year students residing in Andhra Pradesh aged 18–35 with minimum SSC, ITI, Diploma, or Degree qualification depending on the track.',
        eligibility_summary_te:
          '18 నుండి 35 సంవత్సరాల మధ్య వయస్సు గల AP యువత/విద్యార్థులు; కోర్సు ఆధారంగా SSC, ITI, డిప్లొమా లేదా డిగ్రీ అర్హత.',
        eligibility_rules: {
          states: ['Andhra Pradesh'],
          minAge: 18,
          maxAge: 35,
          allowedOccupations: ['Student', 'Unemployed', 'Job Seeker'],
          educationLevels: ['Primary / High School (Class 1-10)', 'ITI / Vocational', 'Diploma / Polytechnic', 'Undergraduate', 'Postgraduate'],
          gender: 'all',
          notes_en: [
            'Course prerequisites vary by domain (e.g., Full-Stack IT, EV Technician, CNC Operations).',
            'Placement drives are organized across district Skill Hubs and Skill Colleges.',
          ],
          notes_te: [
            'శిక్షణ కోర్సు ఆధారంగా విద్యార్హతలు మారుతాయి (ఉదా: IT, EV టెక్నీషియన్, CNC).',
            'జిల్లా స్కిల్ హబ్‌ల ద్వారా ఉద్యోగ మేళాలు నిర్వహించబడతాయి.',
          ],
        } satisfies EligibilityRules,
        documents: [
          {
            id: 'sk-aadhaar',
            name_en: 'Aadhaar Card',
            name_te: 'ఆధార్ కార్డు',
            required: true,
            instructions_en: 'Required for candidate registration on APSSDC portal.',
            instructions_te: 'APSSDC పోర్టల్‌లో నమోదుకు అవసరం.',
            source_reference: 'APSSDC Training Enrollment Sample Guide',
          },
          {
            id: 'sk-edu',
            name_en: 'Highest Educational Qualification Certificate / Marks Memo',
            name_te: 'విద్యార్హత సర్టిఫికేట్ / మార్కుల మెమో',
            required: true,
            instructions_en: 'SSC, ITI, Diploma, or Degree certificate matching chosen skill course.',
            instructions_te: 'ఎంచుకున్న కోర్సుకు తగిన SSC, ITI, డిప్లొమా లేదా డిగ్రీ సర్టిఫికేట్.',
            source_reference: 'APSSDC Training Enrollment Sample Guide',
          },
          {
            id: 'sk-resume',
            name_en: 'Passport Photos & Resume (for placement batch)',
            name_te: 'పాస్‌పోర్ట్ ఫోటోలు మరియు రెజ్యూమే',
            required: false,
            condition_en: 'Recommended when attending job drives.',
            condition_te: 'ఉద్యోగ మేళాలకు హాజరయ్యేటప్పుడు అవసరం.',
            instructions_en: 'Keep digital and printed copies ready.',
            instructions_te: 'డిజిటల్ మరియు ప్రింటెడ్ కాపీలు సిద్ధంగా ఉంచుకోండి.',
            source_reference: 'APSSDC Training Enrollment Sample Guide',
          },
        ] satisfies DocumentRequirement[],
        application_steps_en: [
          'Browse active district skill batches and courses on apssdc.in.',
          'Register online using your Aadhaar and mobile number, and choose your nearest Skill Hub.',
          'Complete orientation assessment and attend classroom/lab training.',
        ],
        application_steps_te: [
          'apssdc.in పోర్టల్‌లో మీ జిల్లాలోని అందుబాటులో ఉన్న కోర్సులను పరిశీలించండి.',
          'ఆధార్ మరియు మొబైల్ నంబర్‌తో ఆన్‌లైన్‌లో నమోదు చేసి సమీప స్కిల్ హబ్‌ను ఎంచుకోండి.',
          'ప్రారంభ పరీక్ష పూర్తి చేసి శిక్షణ మరియు ప్లేస్‌మెంట్ డ్రైవ్‌లలో పాల్గొనండి.',
        ],
        benefit_summary_en: 'Zero-fee certified technical/vocational training and direct industry placement drives.',
        benefit_summary_te: 'ఉచిత నైపుణ్య శిక్షణ సర్టిఫికేషన్ మరియు పరిశ్రమలలో ఉద్యోగ అవకాశాలు.',
        official_url: 'https://www.apssdc.in',
        source_document_name: 'AP_Sample_APSSDC_Skill_Catalog.pdf',
        last_verified_at: '2026-10-11',
        is_sample: 1,
      },
      {
        slug: 'ap-ntr-bharosa-pension',
        title_en: 'NTR Bharosa Social Security Pensions',
        title_te: 'ఎన్టీఆర్ భరోసా సామాజిక భద్రతా పెన్షన్లు',
        category: 'Social Welfare',
        state: 'Andhra Pradesh',
        department_id: deptMap.get('AP_SERP')!,
        short_desc_en:
          'Monthly social security pension assistance for senior citizens, widows, persons with disabilities, weavers, toddy tappers, fishermen, and chronic illness patients in Andhra Pradesh.',
        short_desc_te:
          'ఆంధ్రప్రదేశ్‌లోని వృద్ధులు, వితంతువులు, దివ్యాంగులు, చేనేత, కల్లుగీత కార్మికులు, మత్స్యకారులు మరియు దీర్ఘకాలిక వ్యాధిగ్రస్తులకు నెలవారీ సామాజిక భద్రతా పెన్షన్.',
        eligibility_summary_en:
          'BPL / Rice Card households in Andhra Pradesh meeting category-specific age (60+ for old age) or SADAREM disability (>=40%) criteria.',
        eligibility_summary_te:
          'AP లోని BPL / రైస్ కార్డు కుటుంబాలు; వృద్ధాప్య పెన్షన్‌కు 60+ సంవత్సరాలు లేదా దివ్యాంగులకు కనీసం 40% SADAREM సర్టిఫికేట్ ఉండాలి.',
        eligibility_rules: {
          states: ['Andhra Pradesh'],
          minAge: 18,
          maxAge: 110,
          maxAnnualIncomeInr: 120000,
          allowedOccupations: ['Any'],
          educationLevels: ['Any'],
          gender: 'all',
          notes_en: [
            'Old age pension typically requires age >= 60 (50+ for notified ST/traditional artisan categories).',
            'Disability pension requires valid SADAREM certificate showing >= 40% disability.',
            'Household should satisfy BPL / Rice Card and electricity/land limits.',
          ],
          notes_te: [
            'వృద్ధాప్య పెన్షన్‌కు సాధారణంగా 60 ఏళ్లు నిండి ఉండాలి (ప్రత్యేక వర్గాలకు 50+).',
            'దివ్యాంగ పెన్షన్‌కు కనీసం 40% వైకల్యంతో SADAREM సర్టిఫికేట్ అవసరం.',
            'కుటుంబం BPL / రైస్ కార్డు మరియు ఆదాయ/భూమి నిబంధనలకు లోబడి ఉండాలి.',
          ],
        } satisfies EligibilityRules,
        documents: [
          {
            id: 'pn-aadhaar',
            name_en: 'Applicant Aadhaar Card & Age Proof',
            name_te: 'దరఖాస్తుదారు ఆధార్ కార్డు మరియు వయస్సు ధృవీకరణ',
            required: true,
            instructions_en: 'Age on Aadhaar/Voter ID/Birth record must meet category threshold.',
            instructions_te: 'ఆధార్ లేదా జనన రికార్డులో వయస్సు అర్హతకు అనుగుణంగా ఉండాలి.',
            source_reference: 'SERP AP Pension Manual (Sample Record)',
          },
          {
            id: 'pn-rice',
            name_en: 'AP Rice Card',
            name_te: 'ఆంధ్రప్రదేశ్ రైస్ కార్డు',
            required: true,
            instructions_en: 'Household BPL verification via Sachivalayam.',
            instructions_te: 'కుటుంబ BPL ధృవీకరణ కోసం అవసరం.',
            source_reference: 'SERP AP Pension Manual (Sample Record)',
          },
          {
            id: 'pn-sadarem',
            name_en: 'SADAREM Disability Certificate',
            name_te: 'సదరం (SADAREM) వైకల్య ధృవీకరణ పత్రం',
            required: false,
            condition_en: 'Required only for Persons with Disabilities (PwD) pension category.',
            condition_te: 'దివ్యాంగుల పెన్షన్ దరఖాస్తుకు మాత్రమే అవసరం.',
            instructions_en: 'Must certify >= 40% permanent disability.',
            instructions_te: 'కనీసం 40% వైకల్యం నిర్ధారించబడి ఉండాలి.',
            source_reference: 'SERP AP Pension Manual (Sample Record)',
          },
        ] satisfies DocumentRequirement[],
        application_steps_en: [
          'Visit your Grama / Ward Sachivalayam and submit a pension application with Aadhaar and Rice Card.',
          'Digital Assistant / Welfare Assistant conducts household verification and biometric validation.',
          'Once sanctioned by MPDO / Municipal Commissioner, monthly pension is disbursed at doorstep.',
        ],
        application_steps_te: [
          'మీ గ్రామ/వార్డు సచివాలయాన్ని సందర్శించి ఆధార్ మరియు రైస్ కార్డుతో పెన్షన్ దరఖాస్తు సమర్పించండి.',
          'వెల్ఫేర్ అసిస్టెంట్ ద్వారా కుటుంబ మరియు అర్హత ధృవీకరణ జరుగుతుంది.',
          'మంజూరైన తర్వాత ప్రతి నెలా పెన్షన్ పంపిణీ చేయబడుతుంది.',
        ],
        benefit_summary_en: 'Monthly social security pension disbursed on the 1st of every month (rates vary by pension category per latest AP GO).',
        benefit_summary_te: 'ప్రతి నెల 1వ తేదీన వర్గాన్ని బట్టి నెలవారీ పెన్షన్ పంపిణీ.',
        official_url: 'https://sspensions.ap.gov.in',
        source_document_name: 'AP_Sample_Social_Security_Pensions.pdf',
        last_verified_at: '2026-10-16',
        is_sample: 1,
      },
      {
        slug: 'ap-meeseva-citizen-services',
        title_en: 'AP MeeSeva & Grama/Ward Sachivalayam Citizen Certificates',
        title_te: 'AP మీసేవా మరియు గ్రామ/వార్డు సచివాలయ పౌర సేవలు',
        category: 'Other Public Services',
        state: 'Andhra Pradesh',
        department_id: deptMap.get('AP_MEESEVA')!,
        short_desc_en:
          'Single-window digital delivery of Integrated Caste, Income, Residence, Birth/Death, Adangal/1B revenue records, and public certificates across Andhra Pradesh.',
        short_desc_te:
          'ఆంధ్రప్రదేశ్ వ్యాప్తంగా కులం, ఆదాయం, నివాసం, జనన/మరణ, అడంగల్/1B మరియు ఇతర ప్రభుత్వ ధృవీకరణ పత్రాల డిజిటల్ సేవలు.',
        eligibility_summary_en:
          'Open to all residents of Andhra Pradesh requiring verified government certificates or revenue/municipal services.',
        eligibility_summary_te:
          'ప్రభుత్వ ధృవీకరణ పత్రాలు లేదా రెవెన్యూ/మున్సిపల్ సేవలు అవసరమైన ఆంధ్రప్రదేశ్ నివాసితులందరికీ అందుబాటులో ఉంటుంది.',
        eligibility_rules: {
          states: ['Andhra Pradesh'],
          minAge: 0,
          maxAge: 110,
          allowedOccupations: ['Any'],
          educationLevels: ['Any'],
          gender: 'all',
          notes_en: [
            'Specific certificate requirements depend on the service requested (Income, Caste, Residence, Land 1B).',
            'Service delivery timelines follow AP Citizen Charter SLAs.',
          ],
          notes_te: [
            'దరఖాస్తు చేసే సేవ ఆధారంగా పత్రాలు మారుతాయి (ఆదాయం, కులం, నివాసం, 1B).',
            'AP సిటిజన్ చార్టర్ ప్రకారం నిర్ణీత గడువులో సేవలు అందుతాయి.',
          ],
        } satisfies EligibilityRules,
        documents: [
          {
            id: 'ms-aadhaar',
            name_en: 'Applicant Aadhaar Card',
            name_te: 'దరఖాస్తుదారు ఆధార్ కార్డు',
            required: true,
            instructions_en: 'Required for citizen identity and SMS tracking.',
            instructions_te: 'గుర్తింపు మరియు SMS ట్రాకింగ్ కోసం అవసరం.',
            source_reference: 'AP MeeSeva Citizen Charter (Sample Record)',
          },
          {
            id: 'ms-appform',
            name_en: 'Signed Service Application Form & Ration/Residence Proof',
            name_te: 'సంతకం చేసిన దరఖాస్తు ఫారం మరియు నివాస రుజువు',
            required: true,
            instructions_en: 'Available at MeeSeva center or Grama/Ward Sachivalayam.',
            instructions_te: 'మీసేవా కేంద్రం లేదా సచివాలయంలో లభిస్తుంది.',
            source_reference: 'AP MeeSeva Citizen Charter (Sample Record)',
          },
        ] satisfies DocumentRequirement[],
        application_steps_en: [
          'Visit your nearest Grama/Ward Sachivalayam or authorized MeeSeva center (or log in via AP Seva portal).',
          'Submit supporting identity and address documents and pay the nominal statutory user fee.',
          'Track your Application Number online via ap.meeseva.gov.in and download the digitally signed certificate.',
        ],
        application_steps_te: [
          'సమీప గ్రామ/వార్డు సచివాలయం లేదా మీసేవా కేంద్రాన్ని సందర్శించండి.',
          'అవసరమైన గుర్తింపు మరియు నివాస పత్రాలు అందించి నిర్ణీత సేవా రుసుము చెల్లించండి.',
          'ap.meeseva.gov.in ద్వారా అప్లికేషన్ నంబర్‌తో స్థితిని ట్రాక్ చేసి డిజిటల్ సర్టిఫికేట్ డౌన్‌లోడ్ చేసుకోండి.',
        ],
        benefit_summary_en: 'Digitally signed, legally valid government certificates with transparent SLA tracking.',
        benefit_summary_te: 'డిజిటల్ సంతకంతో కూడిన చట్టబద్ధమైన ప్రభుత్వ ధృవీకరణ పత్రాలు మరియు పారదర్శక ట్రాకింగ్.',
        official_url: 'https://ap.meeseva.gov.in',
        source_document_name: 'AP_Sample_MeeSeva_Service_Charter.pdf',
        last_verified_at: '2026-10-15',
        is_sample: 1,
      },
    ];

    const insertScheme = db.prepare(`
      INSERT INTO schemes (
        slug, title_en, title_te, category, state, department_id,
        short_desc_en, short_desc_te,
        eligibility_summary_en, eligibility_summary_te,
        eligibility_rules_json, documents_json,
        application_steps_en_json, application_steps_te_json,
        benefit_summary_en, benefit_summary_te,
        official_url, source_document_name, last_verified_at, is_sample
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of sampleSchemes) {
      insertScheme.run(
        s.slug,
        s.title_en,
        s.title_te,
        s.category,
        s.state,
        s.department_id,
        s.short_desc_en,
        s.short_desc_te,
        s.eligibility_summary_en,
        s.eligibility_summary_te,
        JSON.stringify(s.eligibility_rules),
        JSON.stringify(s.documents),
        JSON.stringify(s.application_steps_en),
        JSON.stringify(s.application_steps_te),
        s.benefit_summary_en,
        s.benefit_summary_te,
        s.official_url,
        s.source_document_name,
        s.last_verified_at,
        s.is_sample
      );
    }
  }

  // Seed one clearly labelled sample notification PDF record so PDF Assistant is testable immediately
  const docCount = db.prepare('SELECT COUNT(*) as cnt FROM documents').get() as { cnt: number };
  if (docCount.cnt === 0) {
    const scholarshipScheme = db
      .prepare('SELECT id FROM schemes WHERE slug = ?')
      .get('ap-post-matric-scholarship') as { id: number } | undefined;

    const info = db
      .prepare(
        `INSERT INTO documents (filename, original_name, mime_type, size_bytes, page_count, scheme_id, source_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        'sample_ap_scholarship_notification_2026.pdf',
        'AP_Sample_Scholarship_Notification_2026.pdf',
        'application/pdf',
        48210,
        3,
        scholarshipScheme?.id ?? null,
        'admin_notification',
        'indexed'
      );

    const docId = Number(info.lastInsertRowid);
    const samplePages = [
      {
        page: 1,
        content:
          'SAMPLE GOVERNMENT NOTIFICATION (ACADEMIC DEMO): Government of Andhra Pradesh Social Welfare & Higher Education Department. Notification for Post-Matric Scholarship / Jnanabhumi Fee Reimbursement Renewal and Fresh Applications for 2026-27. Eligible categories include SC, ST, BC, EBC, Minority, and Kapu students studying in recognized ITI, Polytechnic, Degree, Engineering, Medical, and Postgraduate institutions in Andhra Pradesh. Annual family income must not exceed INR 2,50,000.',
      },
      {
        page: 2,
        content:
          'SAMPLE NOTIFICATION PAGE 2 — ATTENDANCE AND VERIFICATION RULES: Minimum 75% attendance per semester/academic year is mandatory for release of fee reimbursement and hostel maintenance support. Applicants must ensure their Aadhaar card is linked to an active NPCI-seeded bank account in the name of the student or mother as notified. Biometric authentication at the college or Grama/Ward Sachivalayam is required before final submission on jnanabhumi.ap.gov.in.',
      },
      {
        page: 3,
        content:
          'SAMPLE NOTIFICATION PAGE 3 — IMPORTANT TIMELINES AND DOCUMENTS: Required documents include Student & Mother Aadhaar Card, MeeSeva Integrated Caste & Income Certificate (or valid Rice Card), SSC Marks Memo, College Bonafide Certificate, and Hostel Certificate (conditional, only for hostellers). Note: This is a sample academic notification document; verify live submission cut-off dates directly on https://jnanabhumi.ap.gov.in.',
      },
    ];

    const insertChunk = db.prepare(`
      INSERT INTO document_chunks (
        document_id, scheme_id, source_type, title, document_name,
        page_number, chunk_index, content, embedding_json, official_url, is_sample
      ) VALUES (?, ?, 'pdf', ?, ?, ?, ?, ?, NULL, ?, 1)
    `);

    samplePages.forEach((p, idx) => {
      insertChunk.run(
        docId,
        scholarshipScheme?.id ?? null,
        'AP Sample Scholarship Notification 2026',
        'AP_Sample_Scholarship_Notification_2026.pdf',
        p.page,
        idx,
        p.content,
        'https://jnanabhumi.ap.gov.in'
      );
    });
  }

  const alertCount = db.prepare('SELECT COUNT(*) as cnt FROM scheme_alerts').get() as { cnt: number };
  if (alertCount.cnt === 0) {
    const insertAlert = db.prepare(`
      INSERT INTO scheme_alerts (
        title_en, title_te, category, summary_en, summary_te,
        source_url, alert_type, published_at, is_sample
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAlert.run(
      'AP Post-Matric Scholarship (Jnanabhumi) Guidelines Indexed',
      'AP పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్ (జ్ఞానభూమి) మార్గదర్శకాలు',
      'Education and Scholarships',
      'Tuition fee reimbursement & hostel support for eligible ITI, Polytechnic, Degree, Engineering, Medical & PG students (Sample Knowledge Base Record).',
      'ITI, పాలిటెక్నిక్, డిగ్రీ, ఇంజనీరింగ్, మెడికల్ & PG విద్యార్థులకు ట్యూషన్ ఫీజు రీయింబర్స్‌మెంట్ (నమూనా రికార్డు).',
      'https://jnanabhumi.ap.gov.in',
      'scholarship',
      '2026-10-15',
      1
    );

    insertAlert.run(
      'Thalliki Vandanam School Assistance Overview',
      'తల్లికి వందనం పాఠశాల విద్యార్థి సహాయ వివరాలు',
      'Education and Scholarships',
      'Annual financial assistance guidelines for Class 1–12 students in Andhra Pradesh (Sample Record — confirm active circular on cse.ap.gov.in).',
      '1 నుండి 12వ తరగతి విద్యార్థుల తల్లులకు వార్షిక ఆర్థిక సహాయ మార్గదర్శకాలు (నమూనా రికార్డు).',
      'https://cse.ap.gov.in',
      'scholarship',
      '2026-10-10',
      1
    );

    insertAlert.run(
      'Annadata Sukhibhava Farmer Investment & CCRC Checklist',
      'అన్నదాత సుఖీభవ రైతు పెట్టుబడి సహాయం & CCRC పత్రాలు',
      'Agriculture and Farmer Welfare',
      'Crop investment assistance for landowning farmers and CCRC tenant cultivators in AP (Sample Record — verify disbursement schedule at RSK).',
      'సొంత భూమి మరియు CCRC కౌలు రైతులకు పెట్టుబడి సహాయ వివరాలు (నమూనా రికార్డు).',
      'https://apagrisnet.gov.in',
      'new_scheme',
      '2026-10-12',
      1
    );
  }

  seedAdditionalSchemes(db);
}

function seedAdditionalSchemes(db: Database.Database): void {
  const deptRows = db.prepare('SELECT id, code FROM departments').all() as Array<{
    id: number;
    code: string;
  }>;
  const deptMap = new Map(deptRows.map((d) => [d.code, d.id]));

  const additionalSchemes = [
    {
      slug: 'ap-jagananna-vidya-vasathi-deevena',
      title_en: 'Jagananna Vidya Deevena & Vasathi Deevena (Previous Post-Matric Scheme)',
      title_te: 'జగనన్న విద్యా దీవెన & వసతి దీవెన (గత పోస్ట్-మెట్రిక్ పథకం)',
      category: 'Education and Scholarships',
      state: 'Andhra Pradesh',
      scheme_status: 'previous' as const,
      department_id: deptMap.get('AP_EDU_SW')!,
      short_desc_en:
        'Previous AP post-matric full fee reimbursement and boarding/lodging allowance (2019–2024). Historical Reference: Check the successor AP Post-Matric Scholarship record and current official portal circulars for active renewals.',
      short_desc_te:
        'గత ఆంధ్రప్రదేశ్ పోస్ట్-మెట్రిక్ పూర్తి ఫీజు రీయింబర్స్‌మెంట్ మరియు వసతి భోజన సహాయ పథకం (2019–2024). గమనిక: ప్రస్తుత కొనసాగింపు కోసం AP పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్ వివరాలను చూడండి.',
      eligibility_summary_en:
        'Historical criteria: AP resident college students (ITI, Polytechnic, Degree, B.Tech, Medical, PG) with family income up to INR 2,50,000, below 10 acres wetland / 25 acres dryland, and 75% attendance.',
      eligibility_summary_te:
        'గత నిబంధనలు: కుటుంబ వార్షిక ఆదాయం రూ. 2,50,000 లోపు ఉండి, కనీసం 75% హాజరు ఉన్న ITI, పాలిటెక్నిక్, డిగ్రీ, ఇంజనీరింగ్, మెడికల్, PG విద్యార్థులు.',
      eligibility_rules: {
        states: ['Andhra Pradesh'],
        minAge: 15,
        maxAge: 35,
        maxAnnualIncomeInr: 250000,
        allowedOccupations: ['Student'],
        educationLevels: ['ITI / Vocational', 'Diploma / Polytechnic', 'Undergraduate', 'Postgraduate'],
        gender: 'all',
        notes_en: [
          'Previous scheme (2019–2024): Continued under updated AP Post-Matric Scholarship guidelines.',
          'Tuition fee (Vidya Deevena) and hostel allowance (Vasathi Deevena) were credited via mother/college linkage.',
        ],
        notes_te: [
          'గత పథకం (2019–2024): ప్రస్తుతం నవీకరించబడిన AP పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్ మార్గదర్శకాల క్రింద కొనసాగుతోంది.',
          'ట్యూషన్ ఫీజు (విద్యా దీవెన) మరియు వసతి ఖర్చులు (వసతి దీవెన) తల్లుల/కళాశాల ఖాతాల్లో జమ చేయబడ్డాయి.',
        ],
      } satisfies EligibilityRules,
      documents: [
        {
          id: 'prev-jvd-aadhaar',
          name_en: 'Student & Mother Aadhaar Card (NPCI Linked)',
          name_te: 'విద్యార్థి మరియు తల్లి ఆధార్ కార్డు',
          required: true,
          instructions_en: 'Mother bank account linked with Aadhaar NPCI was used for quarterly release.',
          instructions_te: 'తల్లి బ్యాంకు ఖాతా ఆధార్ NPCI తో అనుసంధానమై ఉండాలి.',
          source_reference: 'Historical AP Post-Matric Reference (Sample)',
        },
        {
          id: 'prev-jvd-income',
          name_en: 'Rice Card / Income & Caste Certificate',
          name_te: 'రైస్ కార్డు / ఆదాయ మరియు కుల ధృవీకరణ పత్రం',
          required: true,
          instructions_en: 'Issued via MeeSeva / Grama Ward Sachivalayam.',
          instructions_te: 'మీసేవా లేదా గ్రామ/వార్డు సచివాలయం ద్వారా జారీ చేసిన పత్రాలు.',
          source_reference: 'Historical AP Post-Matric Reference (Sample)',
        },
      ] satisfies DocumentRequirement[],
      application_steps_en: [
        'Historical workflow: Fresh registration was completed during college admission with Grama/Ward Sachivalayam e-KYC.',
        'For current academic years (2025–2026 onwards), verify active renewal steps under AP Post-Matric Scholarship on the official portal.',
      ],
      application_steps_te: [
        'గత విధానం: కళాశాల ప్రవేశ సమయంలో గ్రామ/వార్డు సచివాలయ e-KYC తో నమోదు జరిగేది.',
        'ప్రస్తుత విద్యా సంవత్సరాలకు (2025–2026 నుండి) అధికారిక పోర్టల్‌లో AP పోస్ట్-మెట్రిక్ స్కాలర్‌షిప్ మార్గదర్శకాలు చూడండి.',
      ],
      benefit_summary_en:
        'Historical benefit: 100% tuition fee reimbursement (Vidya Deevena) + up to INR 20,000/year hostel & mess support (Vasathi Deevena) for degree/PG students.',
      benefit_summary_te:
        'గత ప్రయోజనం: 100% ట్యూషన్ ఫీజు రీయింబర్స్‌మెంట్ + డిగ్రీ/PG విద్యార్థులకు ఏడాదికి రూ. 20,000 వరకు వసతి దీవెన సహాయం.',
      official_url: 'https://jnanabhumi.ap.gov.in',
      source_document_name: 'AP_Legacy_PostMatric_Vidya_Vasathi_Archive.pdf',
      last_verified_at: '2024-05-01',
      is_sample: 1,
    },
    {
      slug: 'ap-jagananna-amma-vodi',
      title_en: 'Jagananna Amma Vodi (Previous School Student Mother Assistance)',
      title_te: 'జగనన్న అమ్మ ఒడి (గత పాఠశాల విద్యార్థి తల్లుల సహాయ పథకం)',
      category: 'Education and Scholarships',
      state: 'Andhra Pradesh',
      scheme_status: 'previous' as const,
      department_id: deptMap.get('AP_EDU_SW')!,
      short_desc_en:
        'Previous AP annual financial assistance scheme (2020–2024) for mothers sending Class 1 to 12 children to school. Successor Reference: Continued/replaced by Thalliki Vandanam.',
      short_desc_te:
        '1 నుండి 12వ తరగతి చదివే పిల్లల తల్లులకు గతంలో అందించిన వార్షిక ఆర్థిక సహాయ పథకం (2020–2024). ప్రస్తుత పథకం: తల్లికి వందనం.',
      eligibility_summary_en:
        'Historical criteria: Mothers/guardians below poverty line (White Ration/Rice Card) with children enrolled in Class 1–12 in AP and minimum 75% attendance.',
      eligibility_summary_te:
        'గత నిబంధనలు: రైస్ కార్డు కలిగి ఉండి, 1–12 తరగతులలో కనీసం 75% హాజరు ఉన్న విద్యార్థుల తల్లులు/సంరక్షకులు.',
      eligibility_rules: {
        states: ['Andhra Pradesh'],
        minAge: 5,
        maxAge: 20,
        maxAnnualIncomeInr: 144000,
        allowedOccupations: ['Student', 'Parent / Guardian', 'Homemaker'],
        educationLevels: ['Primary / High School (Class 1-10)', 'Intermediate (Class 11-12)'],
        gender: 'all',
        notes_en: [
          'Historical scheme (2020–2024): Replaced by Thalliki Vandanam for current academic cycles.',
          'Previously provided INR 15,000/year (with INR 1,000–2,000 school/toilet maintenance deductions in later cycles).',
        ],
        notes_te: [
          'గత పథకం (2020–2024): ప్రస్తుత విద్యా సంవత్సరాలకు "తల్లికి వందనం" పథకంగా కొనసాగుతోంది.',
          'గతంలో ఏడాదికి రూ. 15,000 (పాఠశాల నిర్వహణ మినహాయింపులతో) అందించబడింది.',
        ],
      } satisfies EligibilityRules,
      documents: [
        {
          id: 'prev-amma-aadhaar',
          name_en: 'Mother & Student Aadhaar Cards',
          name_te: 'తల్లి మరియు విద్యార్థి ఆధార్ కార్డులు',
          required: true,
          instructions_en: 'Linked with school UDISE / ChildInfo record.',
          instructions_te: 'పాఠశాల UDISE / ChildInfo రికార్డుతో అనుసంధానమై ఉండాలి.',
          source_reference: 'Historical Amma Vodi Reference (Sample)',
        },
        {
          id: 'prev-amma-rice',
          name_en: 'AP Rice Card & Mother Bank Passbook',
          name_te: 'ఆంధ్రప్రదేశ్ రైస్ కార్డు & తల్లి బ్యాంక్ పాస్‌బుక్',
          required: true,
          instructions_en: 'Active Aadhaar-seeded bank account.',
          instructions_te: 'ఆధార్ అనుసంధానం ఉన్న బ్యాంకు ఖాతా.',
          source_reference: 'Historical Amma Vodi Reference (Sample)',
        },
      ] satisfies DocumentRequirement[],
      application_steps_en: [
        'Historical data was verified via school headmasters and Grama/Ward Sachivalayam social audit lists.',
        'For current cycles, check the successor scheme "Thalliki Vandanam" on cse.ap.gov.in.',
      ],
      application_steps_te: [
        'గతంలో పాఠశాల ప్రధానోపాధ్యాయులు మరియు సచివాలయ సామాజిక తనిఖీ ద్వారా జాబితా సిద్ధమయ్యేది.',
        'ప్రస్తుత ప్రయోజనాల కోసం "తల్లికి వందనం" (cse.ap.gov.in) వివరాలు పరిశీలించండి.',
      ],
      benefit_summary_en: 'Historical benefit: INR 15,000 annual school education assistance per eligible family (see Thalliki Vandanam for current scheme).',
      benefit_summary_te: 'గత ప్రయోజనం: అర్హులైన కుటుంబానికి ఏడాదికి రూ. 15,000 పాఠశాల విద్యా సహాయం (ప్రస్తుత పథకం: తల్లికి వందనం).',
      official_url: 'https://cse.ap.gov.in',
      source_document_name: 'AP_Legacy_AmmaVodi_Archive.pdf',
      last_verified_at: '2024-05-01',
      is_sample: 1,
    },
    {
      slug: 'ap-ysr-rythu-bharosa',
      title_en: 'YSR Rythu Bharosa – PM-KISAN (Previous Farmer Investment Support)',
      title_te: 'వైయస్ఆర్ రైతు భరోసా – PM-KISAN (గత రైతు పెట్టుబడి సహాయ పథకం)',
      category: 'Agriculture and Farmer Welfare',
      state: 'Andhra Pradesh',
      scheme_status: 'previous' as const,
      department_id: deptMap.get('AP_AGRI')!,
      short_desc_en:
        'Previous AP farmer crop investment support scheme (2019–2024) delivering INR 13,500/year combined with PM-KISAN. Successor Reference: Continued/enhanced under Annadata Sukhibhava.',
      short_desc_te:
        'గత ఆంధ్రప్రదేశ్ రైతు పంట పెట్టుబడి సహాయ పథకం (2019–2024; PM-KISAN తో కలిపి రూ. 13,500). ప్రస్తుత పథకం: అన్నదాత సుఖీభవ.',
      eligibility_summary_en:
        'Historical criteria: Landowning farmers and eligible SC/ST/BC/Minority tenant cultivators with CCRC cards in Andhra Pradesh.',
      eligibility_summary_te:
        'గత నిబంధనలు: ఆంధ్రప్రదేశ్‌లోని భూమి కలిగిన రైతులు మరియు CCRC కార్డు కలిగిన అర్హులైన కౌలు రైతులు.',
      eligibility_rules: {
        states: ['Andhra Pradesh'],
        minAge: 18,
        maxAge: 90,
        allowedOccupations: ['Farmer', 'Agricultural Worker'],
        educationLevels: ['Any'],
        gender: 'all',
        notes_en: [
          'Previous scheme (2019–2024): INR 7,500 AP state share + INR 6,000 Central PM-KISAN = INR 13,500/year.',
          'Replaced by Annadata Sukhibhava in current AP budgets.',
        ],
        notes_te: [
          'గత పథకం (2019–2024): రాష్ట్ర వాటా రూ. 7,500 + కేంద్ర PM-KISAN రూ. 6,000 = ఏడాదికి రూ. 13,500.',
          'ప్రస్తుత ఆంధ్రప్రదేశ్ ప్రభుత్వంలో "అన్నదాత సుఖీభవ" ద్వారా కొనసాగించబడుతోంది.',
        ],
      } satisfies EligibilityRules,
      documents: [
        {
          id: 'prev-rb-pattadar',
          name_en: 'Pattadar Passbook / Webland Record or CCRC Card',
          name_te: 'పట్టాదార్ పాస్‌బుక్ / వెబ్‌ల్యాండ్ రికార్డు లేదా CCRC కార్డు',
          required: true,
          instructions_en: 'Verified through Rythu Bharosa Kendram (RBK / RSK) e-Crop.',
          instructions_te: 'రైతు భరోసా కేంద్రం (RBK / RSK) e-Crop ద్వారా ధృవీకరించబడాలి.',
          source_reference: 'Historical Rythu Bharosa Reference (Sample)',
        },
        {
          id: 'prev-rb-aadhaar',
          name_en: 'Farmer Aadhaar & NPCI Bank Account',
          name_te: 'రైతు ఆధార్ & NPCI బ్యాంకు ఖాతా',
          required: true,
          instructions_en: 'e-KYC required for both PM-KISAN and state disbursement.',
          instructions_te: 'PM-KISAN మరియు రాష్ట్ర సహాయం కోసం e-KYC తప్పనిసరి.',
          source_reference: 'Historical Rythu Bharosa Reference (Sample)',
        },
      ] satisfies DocumentRequirement[],
      application_steps_en: [
        'Historical records were maintained at local RBK / Rythu Seva Kendram with e-KYC.',
        'For active 2025–2026 installments, check Annadata Sukhibhava and PM-KISAN on apagrisnet.gov.in / pmkisan.gov.in.',
      ],
      application_steps_te: [
        'గత వివరాలు స్థానిక RBK / రైతు సేవా కేంద్రంలో e-KYC ద్వారా నమోదయ్యేవి.',
        'ప్రస్తుత విడతల కోసం "అన్నదాత సుఖీభవ" మరియు PM-KISAN వివరాలను apagrisnet.gov.in లో చూడండి.',
      ],
      benefit_summary_en: 'Historical benefit: INR 13,500/year in 3 installments (superseded by Annadata Sukhibhava).',
      benefit_summary_te: 'గత ప్రయోజనం: మూడు విడతల్లో ఏడాదికి రూ. 13,500 (ప్రస్తుత పథకం: అన్నదాత సుఖీభవ).',
      official_url: 'https://apagrisnet.gov.in',
      source_document_name: 'AP_Legacy_YSR_Rythu_Bharosa_Archive.pdf',
      last_verified_at: '2024-05-01',
      is_sample: 1,
    },
    {
      slug: 'ap-ysr-aarogyasri',
      title_en: 'YSR Aarogyasri (Previous AP Universal Health Coverage)',
      title_te: 'వైయస్ఆర్ ఆరోగ్యశ్రీ (గత ఆంధ్రప్రదేశ్ ఉచిత ఆరోగ్య బీమా పథకం)',
      category: 'Health and Family Welfare',
      state: 'Andhra Pradesh',
      scheme_status: 'previous' as const,
      department_id: deptMap.get('AP_HEALTH')!,
      short_desc_en:
        'Previous AP cashless tertiary healthcare insurance scheme (2019–2024) offering up to INR 25 Lakh coverage. Successor Reference: Continued under Dr. NTR Vaidya Seva Trust.',
      short_desc_te:
        'గత ఆంధ్రప్రదేశ్ ఉచిత ఆరోగ్య బీమా పథకం (2019–2024; రూ. 25 లక్షల వరకు ఉచిత వైద్యం). ప్రస్తుత పథకం: డా. ఎన్టీఆర్ వైద్య సేవ.',
      eligibility_summary_en:
        'Historical criteria: Families in AP with Rice Card or annual family income up to INR 5,00,000 across empanelled hospitals.',
      eligibility_summary_te:
        'గత నిబంధనలు: AP లో రైస్ కార్డు ఉన్న లేదా వార్షిక ఆదాయం రూ. 5,00,000 లోపు ఉన్న కుటుంబాలు.',
      eligibility_rules: {
        states: ['Andhra Pradesh'],
        minAge: 0,
        maxAge: 100,
        maxAnnualIncomeInr: 500000,
        allowedOccupations: ['Any'],
        educationLevels: ['Any'],
        gender: 'all',
        notes_en: [
          'Legacy name (2019–2024): Existing health cards and empaneled treatments continue under Dr. NTR Vaidya Seva.',
          'Aarogya Aasara provided post-surgery recovery allowance.',
        ],
        notes_te: [
          'గత పేరు (2019–2024): ప్రస్తుతం "డా. ఎన్టీఆర్ వైద్య సేవ" ట్రస్ట్ ద్వారా ఆసుపత్రి సేవలు కొనసాగుతున్నాయి.',
          'శస్త్రచికిత్స అనంతర విశ్రాంతి భత్యం (ఆరోగ్య ఆసరా) కూడా అందించబడింది.',
        ],
      } satisfies EligibilityRules,
      documents: [
        {
          id: 'prev-aarogya-card',
          name_en: 'Aarogyasri / Dr. NTR Vaidya Seva Health Card or Rice Card',
          name_te: 'ఆరోగ్యశ్రీ / ఎన్టీఆర్ వైద్య సేవ కార్డు లేదా రైస్ కార్డు',
          required: true,
          instructions_en: 'Present at Vaidya Mitra helpdesk inside network hospitals.',
          instructions_te: 'నెట్‌వర్క్ ఆసుపత్రిలోని వైద్య మిత్ర డెస్క్ వద్ద చూపించండి.',
          source_reference: 'Historical Aarogyasri Trust Reference (Sample)',
        },
        {
          id: 'prev-aarogya-aadhaar',
          name_en: 'Patient Aadhaar Card',
          name_te: 'రోగి ఆధార్ కార్డు',
          required: true,
          instructions_en: 'Used for biometric pre-authorization.',
          instructions_te: 'బయోమెట్రిక్ ప్రీ-ఆథరైజేషన్ కోసం అవసరం.',
          source_reference: 'Historical Aarogyasri Trust Reference (Sample)',
        },
      ] satisfies DocumentRequirement[],
      application_steps_en: [
        'Existing Aarogyasri smart cards remain valid for verification at network hospital Vaidya Mitra kiosks.',
        'Consult the active Dr. NTR Vaidya Seva portal (drntrvaidyaseva.ap.gov.in) for latest procedure packages.',
      ],
      application_steps_te: [
        'పాత ఆరోగ్యశ్రీ కార్డులు నెట్‌వర్క్ ఆసుపత్రుల వైద్య మిత్ర కౌంటర్లలో ధృవీకరణకు ఉపయోగపడతాయి.',
        'తాజా చికిత్సల జాబితా కోసం drntrvaidyaseva.ap.gov.in చూడండి.',
      ],
      benefit_summary_en: 'Historical benefit: Cashless specialty surgery & hospitalization up to INR 25 Lakh (now Dr. NTR Vaidya Seva).',
      benefit_summary_te: 'గత ప్రయోజనం: రూ. 25 లక్షల వరకు నగదు రహిత వైద్య సేవలు (ప్రస్తుతం డా. ఎన్టీఆర్ వైద్య సేవ).',
      official_url: 'https://drntrvaidyaseva.ap.gov.in',
      source_document_name: 'AP_Legacy_YSR_Aarogyasri_Archive.pdf',
      last_verified_at: '2024-05-01',
      is_sample: 1,
    },
    {
      slug: 'ap-ysr-pension-kanuka',
      title_en: 'YSR Pension Kanuka (Previous Social Security Pensions)',
      title_te: 'వైయస్ఆర్ పెన్షన్ కానుక (గత సామాజిక భద్రతా పెన్షన్ పథకం)',
      category: 'Social Welfare',
      state: 'Andhra Pradesh',
      scheme_status: 'previous' as const,
      department_id: deptMap.get('AP_SERP')!,
      short_desc_en:
        'Previous AP monthly doorstep pension scheme (2019–2024, INR 3,000/month for old-age/widow). Successor Reference: Upgraded to NTR Bharosa Social Security Pensions (INR 4,000+/month).',
      short_desc_te:
        'గత ఆంధ్రప్రదేశ్ నెలవారీ సామాజిక పెన్షన్ పథకం (2019–2024; వృద్ధాప్య/వితంతు పెన్షన్ రూ. 3,000). ప్రస్తుత పథకం: ఎన్టీఆర్ భరోసా (రూ. 4,000+).',
      eligibility_summary_en:
        'Historical criteria: Senior citizens (60+), widows, persons with disabilities (SADAREM), weavers, toddy tappers, and single women in BPL families.',
      eligibility_summary_te:
        'గత నిబంధనలు: 60+ వృద్ధులు, వితంతువులు, దివ్యాంగులు (SADAREM), చేనేత కార్మికులు మరియు ఒంటరి మహిళలు.',
      eligibility_rules: {
        states: ['Andhra Pradesh'],
        minAge: 18,
        maxAge: 100,
        maxAnnualIncomeInr: 144000,
        allowedOccupations: ['Senior Citizen', 'Self-Employed / Artisan', 'Homemaker', 'Any'],
        educationLevels: ['Any'],
        gender: 'all',
        notes_en: [
          'Previous scheme (2019–2024): Pensions gradually rose from INR 2,250 to INR 3,000/month.',
          'Upgraded to NTR Bharosa Social Security Pensions (INR 4,000/month old-age/widow; INR 6,000 Divyang) from 2024.',
        ],
        notes_te: [
          'గత పథకం (2019–2024): నెలవారీ పెన్షన్ రూ. 2,250 నుండి రూ. 3,000 వరకు పెంచబడింది.',
          '2024 నుండి "ఎన్టీఆర్ భరోసా" పథకం క్రింద రూ. 4,000/నెల (దివ్యాంగులకు రూ. 6,000) కు పెంచబడింది.',
        ],
      } satisfies EligibilityRules,
      documents: [
        {
          id: 'prev-pk-aadhaar',
          name_en: 'Aadhaar & Rice Card',
          name_te: 'ఆధార్ మరియు రైస్ కార్డు',
          required: true,
          instructions_en: 'Biometric authentication done at Grama/Ward Sachivalayam.',
          instructions_te: 'గ్రామ/వార్డు సచివాలయంలో బయోమెట్రిక్ ధృవీకరణ.',
          source_reference: 'Historical SERP Pension Reference (Sample)',
        },
        {
          id: 'prev-pk-sadarem',
          name_en: 'SADAREM / Death Certificate (Category Specific)',
          name_te: 'సదరం (SADAREM) / మరణ ధృవీకరణ పత్రం',
          required: false,
          condition_en: 'Required for disability or widow category claims.',
          condition_te: 'దివ్యాంగ లేదా వితంతు పెన్షన్లకు మాత్రమే అవసరం.',
          instructions_en: 'Verified through AP SERP portal.',
          instructions_te: 'SERP పోర్టల్ ద్వారా ధృవీకరించబడుతుంది.',
          source_reference: 'Historical SERP Pension Reference (Sample)',
        },
      ] satisfies DocumentRequirement[],
      application_steps_en: [
        'Previous pensioners were automatically migrated to NTR Bharosa Social Security Pensions.',
        'New pension applications are processed through Grama/Ward Sachivalayam via sspensions.ap.gov.in.',
      ],
      application_steps_te: [
        'గత పెన్షన్ లబ్ధిదారులు ఆటోమేటిక్‌గా ఎన్టీఆర్ భరోసా పెన్షన్ పథకానికి మార్చబడ్డారు.',
        'కొత్త దరఖాస్తుల కోసం గ్రామ/వార్డు సచివాలయం లేదా sspensions.ap.gov.in ను సంప్రదించండి.',
      ],
      benefit_summary_en: 'Historical benefit: INR 3,000/month social security pension (now upgraded under NTR Bharosa to INR 4,000+/month).',
      benefit_summary_te: 'గత ప్రయోజనం: నెలకు రూ. 3,000 పెన్షన్ (ప్రస్తుతం ఎన్టీఆర్ భరోసా క్రింద రూ. 4,000+ కు పెంచబడింది).',
      official_url: 'https://sspensions.ap.gov.in',
      source_document_name: 'AP_Legacy_YSR_Pension_Kanuka_Archive.pdf',
      last_verified_at: '2024-05-01',
      is_sample: 1,
    },
    {
      slug: 'ap-ysr-cheyutha-aasara',
      title_en: 'YSR Cheyutha & YSR Aasara (Previous Women Self-Reliance & SHG Support)',
      title_te: 'వైయస్ఆర్ చేయూత & వైయస్ఆర్ ఆసరా (గత మహిళా స్వయం ఉపాధి & డ్వాక్రా సహాయం)',
      category: 'Women and Child Welfare',
      state: 'Andhra Pradesh',
      scheme_status: 'previous' as const,
      department_id: deptMap.get('AP_WDCW')!,
      short_desc_en:
        'Previous AP schemes (2019–2024) providing INR 18,750/year to SC/ST/BC/Minority women aged 45–60 (Cheyutha) and DWCRA SHG loan reimbursement (Aasara).',
      short_desc_te:
        'గత ఆంధ్రప్రదేశ్ మహిళా సాధికారత పథకాలు (2019–2024): 45–60 ఏళ్ల మహిళలకు ఏడాదికి రూ. 18,750 (చేయూత) మరియు డ్వాక్రా రుణ మాఫీ సహాయం (ఆసరా).',
      eligibility_summary_en:
        'Historical criteria: Women aged 45–60 from SC/ST/BC/Minority categories (Cheyutha) or DWCRA Self-Help Group members with eligible bank loans as of cutoff date (Aasara).',
      eligibility_summary_te:
        'గత నిబంధనలు: 45–60 ఏళ్ల SC/ST/BC/మైనారిటీ మహిళలు (చేయూత) మరియు అర్హులైన డ్వాక్రా స్వయం సహాయక సంఘాల సభ్యులు (ఆసరా).',
      eligibility_rules: {
        states: ['Andhra Pradesh'],
        minAge: 18,
        maxAge: 60,
        maxAnnualIncomeInr: 144000,
        allowedOccupations: ['Homemaker', 'Self-Employed / Artisan', 'Small Business / SHG'],
        educationLevels: ['Any'],
        gender: 'female',
        notes_en: [
          'Previous tenure (2019–2024): INR 75,000 over 4 years for YSR Cheyutha; 4-phase SHG debt reimbursement under YSR Aasara.',
          'Check current SERP / MEPMA women livelihood and interest-free loan programs at wdcw.ap.gov.in.',
        ],
        notes_te: [
          'గత కాలపరిమితి (2019–2024): చేయూత ద్వారా 4 ఏళ్లలో రూ. 75,000; ఆసరా ద్వారా 4 విడతల్లో డ్వాక్రా రుణ సహాయం.',
          'ప్రస్తుత మహిళా జీవనోపాధి పథకాల కోసం wdcw.ap.gov.in లేదా SERP/MEPMA ను సంప్రదించండి.',
        ],
      } satisfies EligibilityRules,
      documents: [
        {
          id: 'prev-cheyutha-caste',
          name_en: 'Integrated Caste & Age Proof / Rice Card',
          name_te: 'కులం, వయస్సు ధృవీకరణ మరియు రైస్ కార్డు',
          required: true,
          instructions_en: 'MeeSeva integrated certificate linked with Aadhaar.',
          instructions_te: 'ఆధార్‌తో అనుసంధానించబడిన మీసేవా సర్టిఫికేట్.',
          source_reference: 'Historical Cheyutha/Aasara Archive (Sample)',
        },
        {
          id: 'prev-aasara-shg',
          name_en: 'SHG (DWCRA) Group Registration & Bank Loan Statement',
          name_te: 'డ్వాక్రా (SHG) సంఘం రిజిస్ట్రేషన్ & బ్యాంక్ రుణ వివరాలు',
          required: false,
          condition_en: 'Required only for YSR Aasara SHG group claims.',
          condition_te: 'వైయస్ఆర్ ఆసరా డ్వాక్రా సంఘం సహాయానికి మాత్రమే.',
          instructions_en: 'Verified by SERP / MEPMA field officers.',
          instructions_te: 'SERP / MEPMA అధికారుల ద్వారా ధృవీకరణ.',
          source_reference: 'Historical Cheyutha/Aasara Archive (Sample)',
        },
      ] satisfies DocumentRequirement[],
      application_steps_en: [
        'Historical disbursements concluded after 4 annual phases (2020–2024).',
        'Visit your Grama/Ward Sachivalayam or wdcw.ap.gov.in for currently active AP women welfare and SHG credit schemes.',
      ],
      application_steps_te: [
        'ఈ గత పథకాల నాలుగు విడతలు 2020–2024 మధ్య పూర్తయ్యాయి.',
        'ప్రస్తుతం అమలులో ఉన్న మహిళా సంక్షేమ & SHG రుణ పథకాల కోసం సచివాలయం లేదా wdcw.ap.gov.in చూడండి.',
      ],
      benefit_summary_en: 'Historical archive: INR 18,750/year women livelihood grant (Cheyutha) and SHG loan reimbursement (Aasara).',
      benefit_summary_te: 'గత పథక వివరాలు: ఏడాదికి రూ. 18,750 మహిళా ఉపాధి సహాయం (చేయూత) & డ్వాక్రా రుణ మాఫీ (ఆసరా).',
      official_url: 'https://wdcw.ap.gov.in',
      source_document_name: 'AP_Legacy_Cheyutha_Aasara_Archive.pdf',
      last_verified_at: '2024-05-01',
      is_sample: 1,
    },
    {
      slug: 'ap-previous-occupational-welfare',
      title_en: 'Jagananna Chedodu, Vahana Mitra & Matsyakara Bharosa (Previous Occupational Archive)',
      title_te: 'జగనన్న చేదోడు, వాహన మిత్ర & మత్స్యకార భరోసా (గత వృత్తిదారుల సంక్షేమ ఆర్కైవ్)',
      category: 'Employment and Skill Development',
      state: 'Andhra Pradesh',
      scheme_status: 'previous' as const,
      department_id: deptMap.get('AP_SKILL')!,
      short_desc_en:
        'Previous AP annual livelihood allowances (2019–2024) of INR 10,000/year for tailors, barbers, washermen (Chedodu), auto/taxi owner-drivers (Vahana Mitra), and marine fishermen (Matsyakara Bharosa).',
      short_desc_te:
        'గత AP వృత్తిదారుల వార్షిక సహాయ పథకాలు (2019–2024): టైలర్లు, నాయీబ్రాహ్మణులు, రజకులు (చేదోడు), ఆటో/ట్యాక్సీ డ్రైవర్లు (వాహన మిత్ర), మత్స్యకారులకు ఏడాదికి రూ. 10,000.',
      eligibility_summary_en:
        'Historical criteria: Self-employed tailors/barbers/washermen, valid-license auto/cab owner-drivers, and licensed marine fishermen aged 21–60 during the 2019–2024 period.',
      eligibility_summary_te:
        'గత నిబంధనలు: 21–60 ఏళ్ల వయస్సు గల స్వయం ఉపాధి టైలర్లు/నాయీబ్రాహ్మణులు/రజకులు, సొంత ఆటో/ట్యాక్సీ డ్రైవర్లు, సముద్ర మత్స్యకారులు.',
      eligibility_rules: {
        states: ['Andhra Pradesh'],
        minAge: 21,
        maxAge: 60,
        maxAnnualIncomeInr: 144000,
        allowedOccupations: ['Self-Employed / Artisan', 'Driver / Transport', 'Fisherman', 'Any'],
        educationLevels: ['Any'],
        gender: 'all',
        notes_en: [
          'Historical reference archive covering occupational direct-benefit schemes (2019–2024).',
          'Verify successor state livelihood and fisheries assistance circulars at Grama/Ward Sachivalayam or ap.gov.in.',
        ],
        notes_te: [
          '2019–2024 మధ్య అమలైన వృత్తిదారుల ప్రత్యక్ష నగదు బదిలీ పథకాల చారిత్రక రికార్డు.',
          'ప్రస్తుత వృత్తిదారుల మరియు మత్స్యకార సహాయ ఉత్తర్వుల కోసం సచివాలయం లేదా ap.gov.in చూడండి.',
        ],
      } satisfies EligibilityRules,
      documents: [
        {
          id: 'prev-occ-id',
          name_en: 'Aadhaar, Rice Card & Occupational License / RC / Fishing ID',
          name_te: 'ఆధార్, రైస్ కార్డు & వృత్తి ధృవీకరణ / డ్రైవింగ్ లైసెన్స్ / మత్స్యకార ID',
          required: true,
          instructions_en: 'Shop photo / driving license / biometric fisherman card depending on trade.',
          instructions_te: 'వృత్తిని బట్టి షాపు ఫోటో / డ్రైవింగ్ లైసెన్స్ / మత్స్యకార కార్డు.',
          source_reference: 'Historical Occupational Welfare Archive (Sample)',
        },
      ] satisfies DocumentRequirement[],
      application_steps_en: [
        'Historical verification was performed by Grama/Ward Volunteers and Secretariat welfare assistants.',
        'Check ap.gov.in for currently active state occupational grants and APSSDC skill programs.',
      ],
      application_steps_te: [
        'గతంలో గ్రామ/వార్డు సచివాలయ సంక్షేమ సహాయకుల ద్వారా క్షేత్ర స్థాయి తనిఖీ జరిగేది.',
        'ప్రస్తుత వృత్తి సంక్షేమ మరియు APSSDC నైపుణ్య పథకాల కోసం ap.gov.in చూడండి.',
      ],
      benefit_summary_en: 'Historical archive: INR 10,000/year annual occupational tool, vehicle insurance, or fishing ban relief.',
      benefit_summary_te: 'గత పథక వివరాలు: ఏడాదికి రూ. 10,000 వృత్తి సామగ్రి, వాహన బీమా లేదా మత్స్యకార వేట నిషేధ భృతి.',
      official_url: 'https://ap.gov.in',
      source_document_name: 'AP_Legacy_Occupational_Welfare_Archive.pdf',
      last_verified_at: '2024-05-01',
      is_sample: 1,
    },
    {
      slug: 'central-pm-kisan',
      title_en: 'PM-KISAN — Pradhan Mantri Kisan Samman Nidhi',
      title_te: 'పీఎం-కిసాన్ — ప్రధానమంత్రి కిసాన్ సమ్మాన్ నిధి',
      category: 'Agriculture and Farmer Welfare',
      state: 'Central (All India / AP)',
      scheme_status: 'active' as const,
      department_id: deptMap.get('AP_AGRI')!,
      short_desc_en:
        'Central Government income support scheme providing INR 6,000 per year in three equal INR 2,000 installments directly to landholding farmer families across India, including Andhra Pradesh.',
      short_desc_te:
        'ఆంధ్రప్రదేశ్‌తో సహా దేశవ్యాప్తంగా భూమి కలిగిన రైతు కుటుంబాలకు ఏడాదికి రూ. 6,000 (మూడు రూ. 2,000 విడతల్లో) అందించే కేంద్ర ప్రభుత్వ పథకం.',
      eligibility_summary_en:
        'Cultivable landholding farmer families across India/AP with completed Aadhaar e-KYC and land seeding; excludes institutional landholders and income-tax payers.',
      eligibility_summary_te:
        'సాగు భూమి కలిగి ఉండి, ఆధార్ e-KYC మరియు ల్యాండ్ సీడింగ్ పూర్తి చేసిన రైతు కుటుంబాలు (ఆదాయపు పన్ను చెల్లింపుదారులు మినహా).',
      eligibility_rules: {
        states: ['Andhra Pradesh', 'Central (All India / AP)'],
        minAge: 18,
        maxAge: 95,
        allowedOccupations: ['Farmer', 'Agricultural Worker'],
        educationLevels: ['Any'],
        gender: 'all',
        notes_en: [
          'Mandatory e-KYC on pmkisan.gov.in and NPCI Aadhaar bank seeding are required for every installment.',
          'Combined alongside AP state Annadata Sukhibhava assistance for eligible AP farmers.',
        ],
        notes_te: [
          'ప్రతి విడతకు pmkisan.gov.in లో ఆధార్ e-KYC మరియు బ్యాంక్ NPCI సీడింగ్ తప్పనిసరి.',
          'అర్హులైన AP రైతులకు రాష్ట్ర అన్నదాత సుఖీభవతో పాటు కేంద్ర PM-KISAN నిధులు అందుతాయి.',
        ],
      } satisfies EligibilityRules,
      documents: [
        {
          id: 'pmkisan-aadhaar',
          name_en: 'Aadhaar Card & NPCI-Seeded Bank Account',
          name_te: 'ఆధార్ కార్డు & NPCI అనుసంధానిత బ్యాంకు ఖాతా',
          required: true,
          instructions_en: 'Complete biometric or OTP e-KYC via PM-KISAN portal or CSC/RSK.',
          instructions_te: 'PM-KISAN పోర్టల్ లేదా RSK/CSC ద్వారా e-KYC పూర్తి చేయండి.',
          source_reference: 'pmkisan.gov.in Guidelines (Sample Record)',
        },
        {
          id: 'pmkisan-land',
          name_en: 'Landholding Record (Pattadar Passbook / RoR)',
          name_te: 'భూమి యాజమాన్య పత్రం (పట్టాదార్ పాస్‌బుక్)',
          required: true,
          instructions_en: 'Must match state Webland / revenue mutation records.',
          instructions_te: 'రాష్ట్ర రెవెన్యూ వెబ్‌ల్యాండ్ రికార్డులతో సరిపోలాలి.',
          source_reference: 'pmkisan.gov.in Guidelines (Sample Record)',
        },
      ] satisfies DocumentRequirement[],
      application_steps_en: [
        'Visit pmkisan.gov.in or your local Rythu Seva Kendram / CSC for New Farmer Registration.',
        'Verify land seeding status and complete Aadhaar OTP/biometric e-KYC.',
        'Track 4-monthly INR 2,000 installment status under "Know Your Status" on pmkisan.gov.in.',
      ],
      application_steps_te: [
        'pmkisan.gov.in లేదా మీ సమీప రైతు సేవా కేంద్రం / CSC లో కొత్త రైతు నమోదు చేయండి.',
        'ల్యాండ్ సీడింగ్ స్థితిని సరిచూసి ఆధార్ OTP/బయోమెట్రిక్ e-KYC పూర్తి చేయండి.',
        'pmkisan.gov.in లో "Know Your Status" ద్వారా రూ. 2,000 విడతల స్థితిని తనిఖీ చేయండి.',
      ],
      benefit_summary_en: 'INR 6,000 per year (3 installments of INR 2,000) transferred via DBT.',
      benefit_summary_te: 'DBT ద్వారా ఏడాదికి రూ. 6,000 (రూ. 2,000 చొప్పున 3 విడతలు).',
      official_url: 'https://pmkisan.gov.in',
      source_document_name: 'Central_Sample_PM_KISAN_Guidelines.pdf',
      last_verified_at: '2026-10-15',
      is_sample: 1,
    },
    {
      slug: 'central-ayushman-bharat-pmjay',
      title_en: 'Ayushman Bharat — PM-JAY (National Health Assurance)',
      title_te: 'ఆయుష్మాన్ భారత్ — PM-JAY (జాతీయ ఆరోగ్య భద్రతా పథకం)',
      category: 'Health and Family Welfare',
      state: 'Central (All India / AP)',
      scheme_status: 'active' as const,
      department_id: deptMap.get('AP_HEALTH')!,
      short_desc_en:
        'Government of India flagship health insurance providing INR 5,00,000 per family per year for secondary and tertiary hospitalization across public and empanelled private hospitals nationwide, including AP.',
      short_desc_te:
        'ఆంధ్రప్రదేశ్‌తో సహా దేశవ్యాప్తంగా ఉన్న నెట్‌వర్క్ ఆసుపత్రులలో ప్రతి కుటుంబానికి ఏడాదికి రూ. 5,00,000 ఉచిత వైద్య బీమా అందించే కేంద్ర ప్రభుత్వ పథకం.',
      eligibility_summary_en:
        'SECC-2011 / state-converged eligible households and senior citizens aged 70+ (Ayushman Vaya Vandana) across India and Andhra Pradesh.',
      eligibility_summary_te:
        'అర్హులైన SECC-2011 / రాష్ట్ర ఆరోగ్య కార్డు కుటుంబాలు మరియు 70+ ఏళ్లు నిండిన సీనియర్ సిటిజన్లు (వయ వందన).',
      eligibility_rules: {
        states: ['Andhra Pradesh', 'Central (All India / AP)'],
        minAge: 0,
        maxAge: 100,
        allowedOccupations: ['Any'],
        educationLevels: ['Any'],
        gender: 'all',
        notes_en: [
          'Converged in Andhra Pradesh alongside Dr. NTR Vaidya Seva for cashless portable treatment across India.',
          'Senior citizens aged 70+ are eligible for Ayushman Vaya Vandana top-up coverage regardless of income.',
        ],
        notes_te: [
          'ఆంధ్రప్రదేశ్‌లో డా. ఎన్టీఆర్ వైద్య సేవతో అనుసంధానమై దేశవ్యాప్తంగా పోర్టబుల్ ఉచిత చికిత్స అందిస్తుంది.',
          '70 ఏళ్లు పైబడిన సీనియర్ సిటిజన్లకు ఆదాయంతో సంబంధం లేకుండా ఆయుష్మాన్ వయ వందన కవరేజ్ లభిస్తుంది.',
        ],
      } satisfies EligibilityRules,
      documents: [
        {
          id: 'pmjay-abha',
          name_en: 'Ayushman Card / Aadhaar Card (for e-KYC)',
          name_te: 'ఆయుష్మాన్ కార్డు / ఆధార్ కార్డు',
          required: true,
          instructions_en: 'Verify eligibility and download card on beneficiary.nha.gov.in or Ayushman App.',
          instructions_te: 'beneficiary.nha.gov.in లేదా Ayushman App ద్వారా అర్హత తనిఖీ చేసి కార్డు డౌన్‌లోడ్ చేయండి.',
          source_reference: 'NHA PM-JAY Guidelines (Sample Record)',
        },
        {
          id: 'pmjay-ration',
          name_en: 'AP Rice Card / SECC Family ID',
          name_te: 'రైస్ కార్డు / SECC కుటుంబ ID',
          required: false,
          condition_en: 'Needed for family linkage verification if not applying under 70+ Vaya Vandana.',
          condition_te: '70+ వయ వందన కాకుండా కుటుంబ విభాగంలో దరఖాస్తు చేసేవారికి అవసరం.',
          instructions_en: 'Keep state ration/rice card handy during e-KYC.',
          instructions_te: 'e-KYC సమయంలో రైస్ కార్డు సిద్ధంగా ఉంచుకోండి.',
          source_reference: 'NHA PM-JAY Guidelines (Sample Record)',
        },
      ] satisfies DocumentRequirement[],
      application_steps_en: [
        'Visit beneficiary.nha.gov.in or open the Ayushman mobile app.',
        'Check eligibility using Aadhaar, mobile number, or Ration Card.',
        'Complete Aadhaar e-KYC to generate your Ayushman Card for cashless care at any PM-JAY empanelled hospital.',
      ],
      application_steps_te: [
        'beneficiary.nha.gov.in లేదా ఆయుష్మాన్ మొబైల్ యాప్‌ను తెరవండి.',
        'ఆధార్, మొబైల్ నంబర్ లేదా రేషన్/రైస్ కార్డుతో మీ కుటుంబ అర్హతను తనిఖీ చేయండి.',
        'ఆధార్ e-KYC పూర్తి చేసి దేశవ్యాప్తంగా ఉన్న PM-JAY ఆసుపత్రులలో ఉచిత వైద్యం కోసం కార్డు పొందండి.',
      ],
      benefit_summary_en: 'INR 5,00,000/year cashless inpatient hospitalization across India.',
      benefit_summary_te: 'దేశవ్యాప్తంగా ఏడాదికి రూ. 5,00,000 వరకు నగదు రహిత ఆసుపత్రి వైద్యం.',
      official_url: 'https://pmjay.gov.in',
      source_document_name: 'Central_Sample_Ayushman_PMJAY_Guidelines.pdf',
      last_verified_at: '2026-10-15',
      is_sample: 1,
    },
    {
      slug: 'central-nsp-scholarships',
      title_en: 'National Scholarship Portal (NSP) & AICTE Scholarships',
      title_te: 'నేషనల్ స్కాలర్‌షిప్ పోర్టల్ (NSP) & AICTE స్కాలర్‌షిప్‌లు',
      category: 'Education and Scholarships',
      state: 'Central (All India / AP)',
      scheme_status: 'active' as const,
      department_id: deptMap.get('AP_EDU_SW')!,
      short_desc_en:
        'Central Government scholarship gateway hosting PM-YASASVI, Central Sector Scheme of Scholarships (CSSS), AICTE Pragati (for girls), Saksham (for differently-abled), and UGC scholarships.',
      short_desc_te:
        'PM-YASASVI, CSSS మెరిట్ స్కాలర్‌షిప్, AICTE ప్రగతి (బాలికలకు), సక్షమ్ (దివ్యాంగులకు) మరియు UGC స్కాలర్‌షిప్‌ల కోసం కేంద్ర ప్రభుత్వ ఏకీకృత పోర్టల్.',
      eligibility_summary_en:
        'Indian / AP students in Class 9–12, Diploma, Engineering/Degree, or PG meeting scheme-specific merit, category, and family income limits (typically INR 2.5L–8L) with One Time Registration (OTR).',
      eligibility_summary_te:
        'మెరిట్ మరియు కుటుంబ ఆదాయ అర్హత (సాధారణంగా రూ. 2.5 లక్షలు–8 లక్షలు) కలిగి OTR పూర్తి చేసిన 9–12, డిప్లొమా, డిగ్రీ, ఇంజనీరింగ్ & PG విద్యార్థులు.',
      eligibility_rules: {
        states: ['Andhra Pradesh', 'Central (All India / AP)'],
        minAge: 14,
        maxAge: 35,
        maxAnnualIncomeInr: 800000,
        allowedOccupations: ['Student'],
        educationLevels: [
          'Primary / High School (Class 1-10)',
          'Intermediate (Class 11-12)',
          'ITI / Vocational',
          'Diploma / Polytechnic',
          'Undergraduate',
          'Postgraduate',
        ],
        gender: 'all',
        notes_en: [
          'Mandatory One Time Registration (OTR) with Aadhaar face-authentication via NSP OTR app.',
          'Check non-duplication rules before combining state fee reimbursement with Central scholarships.',
        ],
        notes_te: [
          'NSP OTR యాప్ ద్వారా ఆధార్ ఫేస్-ఆథెంటికేషన్‌తో One Time Registration (OTR) తప్పనిసరి.',
          'రాష్ట్ర మరియు కేంద్ర స్కాలర్‌షిప్‌లను కలిపి పొందే ముందు డూప్లికేషన్ నిబంధనలను పరిశీలించండి.',
        ],
      } satisfies EligibilityRules,
      documents: [
        {
          id: 'nsp-otr',
          name_en: 'NSP OTR ID & Student Aadhaar Card',
          name_te: 'NSP OTR నంబర్ & విద్యార్థి ఆధార్ కార్డు',
          required: true,
          instructions_en: 'Generate 14-digit OTR via scholarships.gov.in and NSP OTR app.',
          instructions_te: 'scholarships.gov.in లో 14-అంకెల OTR ID పొందండి.',
          source_reference: 'scholarships.gov.in Guidelines (Sample Record)',
        },
        {
          id: 'nsp-income',
          name_en: 'Family Income Certificate, Marks Memo & Bonafide',
          name_te: 'కుటుంబ ఆదాయ ధృవీకరణ పత్రం, మార్కుల మెమో & బోనాఫైడ్',
          required: true,
          instructions_en: 'Institute Nodal Officer (INO) verification is mandatory after online submission.',
          instructions_te: 'ఆన్‌లైన్ సమర్పణ తర్వాత కళాశాల నోడల్ అధికారి (INO) ధృవీకరణ తప్పనిసరి.',
          source_reference: 'scholarships.gov.in Guidelines (Sample Record)',
        },
      ] satisfies DocumentRequirement[],
      application_steps_en: [
        'Complete One Time Registration (OTR) on scholarships.gov.in using Aadhaar face authentication.',
        'Log in with OTR, select eligible Central / AICTE / UGC scheme, and upload required documents.',
        'Ensure your college Institute Nodal Officer (INO) and State Nodal Officer verify the application before cut-off.',
      ],
      application_steps_te: [
        'scholarships.gov.in లో ఆధార్ ఫేస్ ఆథెంటికేషన్ ద్వారా One Time Registration (OTR) పూర్తి చేయండి.',
        'OTR తో లాగిన్ అయ్యి అర్హమైన కేంద్ర / AICTE / UGC స్కాలర్‌షిప్ ఎంచుకుని పత్రాలు అప్‌లోడ్ చేయండి.',
        'గడువు లోపు మీ కళాశాల నోడల్ అధికారి (INO) ద్వారా దరఖాస్తు ధృవీకరణ చేయించండి.',
      ],
      benefit_summary_en: 'INR 12,000 to INR 50,000+ per year depending on Central / AICTE / UGC scholarship category.',
      benefit_summary_te: 'పథకం వర్గాన్ని బట్టి ఏడాదికి రూ. 12,000 నుండి రూ. 50,000+ వరకు విద్యా సహాయం.',
      official_url: 'https://scholarships.gov.in',
      source_document_name: 'Central_Sample_NSP_AICTE_Scholarships.pdf',
      last_verified_at: '2026-10-15',
      is_sample: 1,
    },
  ];

  const checkExisting = db.prepare('SELECT id FROM schemes WHERE slug = ?');
  const insertScheme = db.prepare(`
    INSERT INTO schemes (
      slug, title_en, title_te, category, state, scheme_status, department_id,
      short_desc_en, short_desc_te,
      eligibility_summary_en, eligibility_summary_te,
      eligibility_rules_json, documents_json,
      application_steps_en_json, application_steps_te_json,
      benefit_summary_en, benefit_summary_te,
      official_url, source_document_name, last_verified_at, is_sample
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of additionalSchemes) {
    if (checkExisting.get(s.slug)) continue;
    insertScheme.run(
      s.slug,
      s.title_en,
      s.title_te,
      s.category,
      s.state,
      s.scheme_status,
      s.department_id,
      s.short_desc_en,
      s.short_desc_te,
      s.eligibility_summary_en,
      s.eligibility_summary_te,
      JSON.stringify(s.eligibility_rules),
      JSON.stringify(s.documents),
      JSON.stringify(s.application_steps_en),
      JSON.stringify(s.application_steps_te),
      s.benefit_summary_en,
      s.benefit_summary_te,
      s.official_url,
      s.source_document_name,
      s.last_verified_at,
      s.is_sample
    );
  }
}

export function mapSchemeRow(row: Record<string, unknown>): SchemeRecord {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    title_en: String(row.title_en),
    title_te: String(row.title_te),
    category: String(row.category),
    state: String(row.state),
    scheme_status: row.scheme_status === 'previous' ? 'previous' : 'active',
    department_id: Number(row.department_id),
    department_name_en: row.department_name_en ? String(row.department_name_en) : undefined,
    department_name_te: row.department_name_te ? String(row.department_name_te) : undefined,
    short_desc_en: String(row.short_desc_en),
    short_desc_te: String(row.short_desc_te),
    eligibility_summary_en: String(row.eligibility_summary_en),
    eligibility_summary_te: String(row.eligibility_summary_te),
    eligibility_rules: JSON.parse(String(row.eligibility_rules_json)) as EligibilityRules,
    documents: JSON.parse(String(row.documents_json)) as DocumentRequirement[],
    application_steps_en: JSON.parse(String(row.application_steps_en_json)) as string[],
    application_steps_te: JSON.parse(String(row.application_steps_te_json)) as string[],
    benefit_summary_en: String(row.benefit_summary_en),
    benefit_summary_te: String(row.benefit_summary_te),
    official_url: String(row.official_url),
    source_document_name: String(row.source_document_name),
    last_verified_at: String(row.last_verified_at),
    is_sample: Boolean(row.is_sample),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function listDepartments(db: Database.Database): DepartmentRecord[] {
  return db
    .prepare('SELECT id, name_en, name_te, code, official_portal FROM departments ORDER BY id ASC')
    .all() as DepartmentRecord[];
}

export function listSchemes(
  db: Database.Database,
  filters?: { search?: string; category?: string; state?: string; status?: string }
): SchemeRecord[] {
  let sql = `
    SELECT s.*, d.name_en as department_name_en, d.name_te as department_name_te
    FROM schemes s
    JOIN departments d ON d.id = s.department_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (filters?.category && filters.category !== 'All') {
    sql += ' AND s.category = ?';
    params.push(filters.category);
  }
  if (filters?.state && filters.state !== 'All') {
    sql += ' AND s.state = ?';
    params.push(filters.state);
  }
  if (filters?.status && filters.status !== 'All') {
    sql += ' AND s.scheme_status = ?';
    params.push(filters.status);
  }
  if (filters?.search && filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    sql +=
      ' AND (s.title_en LIKE ? OR s.title_te LIKE ? OR s.short_desc_en LIKE ? OR s.short_desc_te LIKE ? OR s.category LIKE ? OR d.name_en LIKE ?)';
    params.push(q, q, q, q, q, q);
  }

  sql += ' ORDER BY s.id ASC';
  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  return rows.map(mapSchemeRow);
}

export function getSchemeByIdOrSlug(
  db: Database.Database,
  idOrSlug: string | number
): SchemeRecord | null {
  const isNumeric = typeof idOrSlug === 'number' || /^\d+$/.test(String(idOrSlug));
  const row = db
    .prepare(
      `SELECT s.*, d.name_en as department_name_en, d.name_te as department_name_te
       FROM schemes s
       JOIN departments d ON d.id = s.department_id
       WHERE ${isNumeric ? 's.id = ?' : 's.slug = ?'}`
    )
    .get(isNumeric ? Number(idOrSlug) : String(idOrSlug)) as Record<string, unknown> | undefined;

  return row ? mapSchemeRow(row) : null;
}

export function listUploadedDocuments(db: Database.Database): UploadedDocumentRecord[] {
  const rows = db
    .prepare(
      `SELECT d.*, (SELECT COUNT(*) FROM document_chunks c WHERE c.document_id = d.id) as chunk_count
       FROM documents d
       ORDER BY d.id DESC`
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: Number(r.id),
    filename: String(r.filename),
    original_name: String(r.original_name),
    mime_type: String(r.mime_type),
    size_bytes: Number(r.size_bytes),
    page_count: Number(r.page_count),
    scheme_id: r.scheme_id !== null ? Number(r.scheme_id) : null,
    source_type: String(r.source_type) as 'citizen_pdf' | 'admin_notification',
    status: String(r.status) as 'indexed' | 'processing' | 'failed',
    chunk_count: Number(r.chunk_count || 0),
    created_at: String(r.created_at),
  }));
}

export function listSchemeAlerts(db: Database.Database, limit = 30): SchemeAlertRecord[] {
  const rows = db
    .prepare(
      `SELECT id, title_en, title_te, category, summary_en, summary_te,
              source_url, alert_type, published_at, is_sample, created_at
       FROM scheme_alerts
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(limit) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: Number(r.id),
    title_en: String(r.title_en),
    title_te: String(r.title_te),
    category: String(r.category),
    summary_en: String(r.summary_en),
    summary_te: String(r.summary_te),
    source_url: String(r.source_url),
    alert_type: String(r.alert_type) as SchemeAlertRecord['alert_type'],
    published_at: String(r.published_at),
    is_sample: Boolean(r.is_sample),
    created_at: String(r.created_at),
  }));
}

export function createSchemeAlert(
  db: Database.Database,
  params: {
    title_en: string;
    title_te: string;
    category: string;
    summary_en: string;
    summary_te: string;
    source_url: string;
    alert_type: SchemeAlertRecord['alert_type'];
    published_at?: string;
    is_sample?: boolean;
  }
): SchemeAlertRecord {
  const publishedAt = params.published_at || new Date().toISOString().slice(0, 10);
  const info = db
    .prepare(
      `INSERT INTO scheme_alerts (
        title_en, title_te, category, summary_en, summary_te,
        source_url, alert_type, published_at, is_sample
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      params.title_en,
      params.title_te,
      params.category,
      params.summary_en,
      params.summary_te,
      params.source_url,
      params.alert_type,
      publishedAt,
      params.is_sample ? 1 : 0
    );

  const row = db
    .prepare('SELECT * FROM scheme_alerts WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as Record<string, unknown>;

  return {
    id: Number(row.id),
    title_en: String(row.title_en),
    title_te: String(row.title_te),
    category: String(row.category),
    summary_en: String(row.summary_en),
    summary_te: String(row.summary_te),
    source_url: String(row.source_url),
    alert_type: String(row.alert_type) as SchemeAlertRecord['alert_type'],
    published_at: String(row.published_at),
    is_sample: Boolean(row.is_sample),
    created_at: String(row.created_at),
  };
}

function mapCitizenRow(row: Record<string, unknown>): CitizenRecord {
  return {
    id: Number(row.id),
    full_name: String(row.full_name),
    email: String(row.email),
    district: String(row.district),
    occupation: String(row.occupation),
    preferred_language: row.preferred_language === 'te' ? 'te' : 'en',
    created_at: String(row.created_at),
  };
}

export function getCitizenById(db: Database.Database, id: number): CitizenRecord | null {
  const row = db
    .prepare(
      'SELECT id, full_name, email, district, occupation, preferred_language, created_at FROM citizens WHERE id = ?'
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapCitizenRow(row) : null;
}

export function getCitizenAuthByEmail(
  db: Database.Database,
  email: string
): (CitizenRecord & { password_hash: string }) | null {
  const row = db
    .prepare(
      'SELECT id, full_name, email, password_hash, district, occupation, preferred_language, created_at FROM citizens WHERE email = ?'
    )
    .get(email.trim().toLowerCase()) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    ...mapCitizenRow(row),
    password_hash: String(row.password_hash),
  };
}

export function createCitizenAccount(
  db: Database.Database,
  params: {
    full_name: string;
    email: string;
    password_hash: string;
    district?: string;
    occupation?: string;
    preferred_language?: Language;
  }
): CitizenRecord {
  const info = db
    .prepare(
      `INSERT INTO citizens (full_name, email, password_hash, district, occupation, preferred_language)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      params.full_name.trim(),
      params.email.trim().toLowerCase(),
      params.password_hash,
      params.district?.trim() || 'Guntur',
      params.occupation?.trim() || 'Citizen',
      params.preferred_language === 'te' ? 'te' : 'en'
    );
  const created = getCitizenById(db, Number(info.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to load created citizen account.');
  }
  return created;
}

export function updateCitizenAccount(
  db: Database.Database,
  id: number,
  params: {
    full_name?: string;
    district?: string;
    occupation?: string;
    preferred_language?: Language;
  }
): CitizenRecord | null {
  const existing = getCitizenById(db, id);
  if (!existing) return null;
  db.prepare(
    `UPDATE citizens
     SET full_name = ?, district = ?, occupation = ?, preferred_language = ?
     WHERE id = ?`
  ).run(
    params.full_name?.trim() || existing.full_name,
    params.district?.trim() || existing.district,
    params.occupation?.trim() || existing.occupation,
    params.preferred_language === 'te'
      ? 'te'
      : params.preferred_language === 'en'
      ? 'en'
      : existing.preferred_language,
    id
  );
  return getCitizenById(db, id);
}

function mapTrackerRow(row: Record<string, unknown>): TrackedApplicationRecord {
  let checkedIds: string[] = [];
  try {
    const parsed = JSON.parse(String(row.checked_doc_ids_json || '[]'));
    if (Array.isArray(parsed)) {
      checkedIds = parsed.map((x) => String(x));
    }
  } catch {
    checkedIds = [];
  }

  let totalDocs = 0;
  try {
    const docs = JSON.parse(String(row.documents_json || '[]'));
    if (Array.isArray(docs)) totalDocs = docs.length;
  } catch {
    totalDocs = 0;
  }

  const stageVal = String(row.stage || 'collecting_docs');
  const validStage: ApplicationStage =
    stageVal === 'applied' || stageVal === 'kyc_verification' || stageVal === 'approved'
      ? stageVal
      : 'collecting_docs';

  return {
    id: Number(row.id),
    owner_key: String(row.owner_key),
    scheme_id: Number(row.scheme_id),
    scheme_slug: String(row.scheme_slug),
    scheme_title_en: String(row.scheme_title_en),
    scheme_title_te: String(row.scheme_title_te),
    scheme_category: String(row.scheme_category),
    official_url: String(row.official_url),
    total_documents: totalDocs,
    stage: validStage,
    checked_doc_ids: checkedIds,
    notes: String(row.notes || ''),
    application_ref: String(row.application_ref || ''),
    updated_at: String(row.updated_at),
    created_at: String(row.created_at),
  };
}

export function listTrackedApplications(
  db: Database.Database,
  ownerKey: string
): TrackedApplicationRecord[] {
  const rows = db
    .prepare(
      `SELECT t.*, s.slug as scheme_slug, s.title_en as scheme_title_en, s.title_te as scheme_title_te,
              s.category as scheme_category, s.official_url, s.documents_json
       FROM citizen_application_tracker t
       JOIN schemes s ON s.id = t.scheme_id
       WHERE t.owner_key = ?
       ORDER BY t.updated_at DESC, t.id DESC`
    )
    .all(ownerKey) as Array<Record<string, unknown>>;
  return rows.map(mapTrackerRow);
}

export function upsertTrackedApplication(
  db: Database.Database,
  params: {
    ownerKey: string;
    schemeId: number;
    stage: ApplicationStage;
    checkedDocIds: string[];
    notes?: string;
    applicationRef?: string;
  }
): TrackedApplicationRecord {
  db.prepare(
    `INSERT INTO citizen_application_tracker (
      owner_key, scheme_id, stage, checked_doc_ids_json, notes, application_ref, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(owner_key, scheme_id) DO UPDATE SET
      stage = excluded.stage,
      checked_doc_ids_json = excluded.checked_doc_ids_json,
      notes = excluded.notes,
      application_ref = excluded.application_ref,
      updated_at = datetime('now')`
  ).run(
    params.ownerKey,
    params.schemeId,
    params.stage,
    JSON.stringify(Array.from(new Set(params.checkedDocIds))),
    (params.notes || '').slice(0, 600),
    (params.applicationRef || '').slice(0, 100)
  );

  const row = db
    .prepare(
      `SELECT t.*, s.slug as scheme_slug, s.title_en as scheme_title_en, s.title_te as scheme_title_te,
              s.category as scheme_category, s.official_url, s.documents_json
       FROM citizen_application_tracker t
       JOIN schemes s ON s.id = t.scheme_id
       WHERE t.owner_key = ? AND t.scheme_id = ?`
    )
    .get(params.ownerKey, params.schemeId) as Record<string, unknown>;
  return mapTrackerRow(row);
}

export function deleteTrackedApplication(
  db: Database.Database,
  ownerKey: string,
  schemeId: number
): boolean {
  const info = db
    .prepare('DELETE FROM citizen_application_tracker WHERE owner_key = ? AND scheme_id = ?')
    .run(ownerKey, schemeId);
  return info.changes > 0;
}


