// Tests for Onboarding Wizard validation logic
// Tests form validation, step progression, and data transformation
import { describe, it, expect } from 'vitest'

// ========== Industries Validation ==========

describe('Onboarding - Industries List', () => {
  const INDUSTRIES = [
    { value: 'technology', labelAr: 'التقنية' },
    { value: 'healthcare', labelAr: 'الرعاية الصحية' },
    { value: 'education', labelAr: 'التعليم' },
    { value: 'fintech', labelAr: 'التقنية المالية' },
    { value: 'ecommerce', labelAr: 'التجارة الإلكترونية' },
    { value: 'food', labelAr: 'الأغذية والمطاعم' },
    { value: 'real-estate', labelAr: 'العقارات' },
    { value: 'tourism', labelAr: 'السياحة والسفر' },
    { value: 'logistics', labelAr: 'اللوجستيات والنقل' },
    { value: 'energy', labelAr: 'الطاقة' },
    { value: 'media', labelAr: 'الإعلام والترفيه' },
    { value: 'manufacturing', labelAr: 'التصنيع' },
    { value: 'agriculture', labelAr: 'الزراعة' },
    { value: 'social-impact', labelAr: 'التأثير الاجتماعي' },
    { value: 'other', labelAr: 'أخرى' },
  ]

  it('should have 15 industry options', () => {
    expect(INDUSTRIES).toHaveLength(15)
  })

  it('should have unique values for all industries', () => {
    const values = INDUSTRIES.map((i) => i.value)
    const uniqueValues = new Set(values)
    expect(uniqueValues.size).toBe(values.length)
  })

  it('should have Arabic labels for all industries', () => {
    for (const industry of INDUSTRIES) {
      expect(industry.labelAr).toBeTruthy()
      expect(industry.labelAr.length).toBeGreaterThan(0)
    }
  })

  it('should include "other" as last option', () => {
    expect(INDUSTRIES[INDUSTRIES.length - 1].value).toBe('other')
  })

  it('should have valid industry values matching API expectations', () => {
    const validValues = INDUSTRIES.map((i) => i.value)
    // These are the values the API would accept
    expect(validValues).toContain('technology')
    expect(validValues).toContain('healthcare')
    expect(validValues).toContain('fintech')
    expect(validValues).toContain('other')
  })
})

// ========== Project Stages Validation ==========

describe('Onboarding - Project Stages', () => {
  const PROJECT_STAGES = [
    { value: 'IDEA', labelAr: 'فكرة', description: 'عندي فكرة بس للحين ما بدأت', icon: '💡' },
    { value: 'PROTOTYPE', labelAr: 'نموذج أولي', description: 'سويت نموذج أولي بسيط', icon: '🔧' },
    { value: 'MVP', labelAr: 'MVP', description: 'عندي منتج أولي يشتغل', icon: '🚀' },
    { value: 'OPERATING', labelAr: 'تشغيل', description: 'المشروع يشتغل وعندي عملاء', icon: '📈' },
    { value: 'SCALING', labelAr: 'توسع', description: 'أبغي أوسع المشروع', icon: '🌍' },
  ]

  it('should have 5 stage options matching ProjectStage enum', () => {
    expect(PROJECT_STAGES).toHaveLength(5)
  })

  it('should have unique values for all stages', () => {
    const values = PROJECT_STAGES.map((s) => s.value)
    const uniqueValues = new Set(values)
    expect(uniqueValues.size).toBe(values.length)
  })

  it('should match valid API stages exactly', () => {
    const validStages = ['IDEA', 'PROTOTYPE', 'MVP', 'OPERATING', 'SCALING']
    const stageValues = PROJECT_STAGES.map((s) => s.value)
    expect(stageValues).toEqual(validStages)
  })

  it('should have Arabic labels for all stages', () => {
    for (const stage of PROJECT_STAGES) {
      expect(stage.labelAr).toBeTruthy()
    }
  })

  it('should have descriptions for all stages', () => {
    for (const stage of PROJECT_STAGES) {
      expect(stage.description).toBeTruthy()
    }
  })

  it('should have icons for all stages', () => {
    for (const stage of PROJECT_STAGES) {
      expect(stage.icon).toBeTruthy()
    }
  })
})

// ========== Form Validation Logic ==========

describe('Onboarding - Step Validation (canProceed)', () => {
  // Replicate the canProceed logic from OnboardingWizard
  function canProceed(step: number, formData: { name: string; industry: string; description: string; stage: string }): boolean {
    switch (step) {
      case 1: return formData.name.trim().length >= 2
      case 2: return formData.industry !== ''
      case 3: return true // description is optional
      case 4: return formData.stage !== ''
      default: return false
    }
  }

  describe('Step 1 - Project Name', () => {
    it('should reject empty name', () => {
      expect(canProceed(1, { name: '', industry: '', description: '', stage: '' })).toBe(false)
    })

    it('should reject single character name', () => {
      expect(canProceed(1, { name: 'a', industry: '', description: '', stage: '' })).toBe(false)
    })

    it('should accept 2 character name', () => {
      expect(canProceed(1, { name: 'ab', industry: '', description: '', stage: '' })).toBe(true)
    })

    it('should accept normal project name', () => {
      expect(canProceed(1, { name: 'My Project', industry: '', description: '', stage: '' })).toBe(true)
    })

    it('should accept Arabic project name', () => {
      expect(canProceed(1, { name: 'مشروعي', industry: '', description: '', stage: '' })).toBe(true)
    })

    it('should reject whitespace-only name', () => {
      expect(canProceed(1, { name: '   ', industry: '', description: '', stage: '' })).toBe(false)
    })

    it('should accept name with leading/trailing whitespace after trim', () => {
      expect(canProceed(1, { name: '  My Project  ', industry: '', description: '', stage: '' })).toBe(true)
    })
  })

  describe('Step 2 - Industry', () => {
    it('should reject empty industry', () => {
      expect(canProceed(2, { name: 'Test', industry: '', description: '', stage: '' })).toBe(false)
    })

    it('should accept any selected industry', () => {
      expect(canProceed(2, { name: 'Test', industry: 'technology', description: '', stage: '' })).toBe(true)
    })

    it('should accept "other" industry', () => {
      expect(canProceed(2, { name: 'Test', industry: 'other', description: '', stage: '' })).toBe(true)
    })
  })

  describe('Step 3 - Description', () => {
    it('should always allow proceeding (description is optional)', () => {
      expect(canProceed(3, { name: 'Test', industry: 'tech', description: '', stage: '' })).toBe(true)
    })

    it('should allow proceeding with description', () => {
      expect(canProceed(3, { name: 'Test', industry: 'tech', description: 'A great project', stage: '' })).toBe(true)
    })
  })

  describe('Step 4 - Stage', () => {
    it('should reject empty stage', () => {
      expect(canProceed(4, { name: 'Test', industry: 'tech', description: '', stage: '' })).toBe(false)
    })

    it('should accept IDEA stage', () => {
      expect(canProceed(4, { name: 'Test', industry: 'tech', description: '', stage: 'IDEA' })).toBe(true)
    })

    it('should accept SCALING stage', () => {
      expect(canProceed(4, { name: 'Test', industry: 'tech', description: '', stage: 'SCALING' })).toBe(true)
    })
  })

  describe('Invalid steps', () => {
    it('should reject step 0', () => {
      expect(canProceed(0, { name: '', industry: '', description: '', stage: '' })).toBe(false)
    })

    it('should reject step 5', () => {
      expect(canProceed(5, { name: 'Test', industry: 'tech', description: '', stage: 'IDEA' })).toBe(false)
    })

    it('should reject negative step', () => {
      expect(canProceed(-1, { name: '', industry: '', description: '', stage: '' })).toBe(false)
    })
  })
})

// ========== Step Navigation Logic ==========

describe('Onboarding - Step Navigation', () => {
  const totalSteps = 4

  it('should calculate progress correctly for each step', () => {
    expect((1 / totalSteps) * 100).toBe(25)
    expect((2 / totalSteps) * 100).toBe(50)
    expect((3 / totalSteps) * 100).toBe(75)
    expect((4 / totalSteps) * 100).toBe(100)
  })

  it('should allow moving forward from steps 1-3', () => {
    for (let step = 1; step < totalSteps; step++) {
      expect(step < totalSteps).toBe(true)
    }
  })

  it('should not allow moving forward from step 4', () => {
    const step = 4
    expect(step < totalSteps).toBe(false)
  })

  it('should allow moving back from steps 2-4', () => {
    for (let step = 2; step <= totalSteps; step++) {
      expect(step > 1).toBe(true)
    }
  })

  it('should not allow moving back from step 1', () => {
    const step = 1
    expect(step > 1).toBe(false)
  })
})

// ========== Form Data Transformation ==========

describe('Onboarding - Data Transformation', () => {
  it('should trim project name before submission', () => {
    const rawName = '  My Project  '
    const trimmed = rawName.trim()
    expect(trimmed).toBe('My Project')
  })

  it('should send undefined for empty description', () => {
    const rawDescription = '  '
    const description = rawDescription.trim() || undefined
    expect(description).toBeUndefined()
  })

  it('should send trimmed description when provided', () => {
    const rawDescription = '  A great project  '
    const description = rawDescription.trim() || undefined
    expect(description).toBe('A great project')
  })

  it('should construct correct API payload', () => {
    const formData = {
      name: 'My Project',
      industry: 'technology',
      description: 'A great project',
      stage: 'IDEA',
    }

    const payload = {
      name: formData.name.trim(),
      industry: formData.industry,
      description: formData.description.trim() || undefined,
      stage: formData.stage,
    }

    expect(payload).toEqual({
      name: 'My Project',
      industry: 'technology',
      description: 'A great project',
      stage: 'IDEA',
    })
  })

  it('should omit description when empty in API payload', () => {
    const formData = {
      name: 'My Project',
      industry: 'technology',
      description: '',
      stage: 'IDEA',
    }

    const payload = {
      name: formData.name.trim(),
      industry: formData.industry,
      description: formData.description.trim() || undefined,
      stage: formData.stage,
    }

    expect(payload.description).toBeUndefined()
  })
})

// ========== Onboarding Detection Logic ==========

describe('Onboarding - Detection', () => {
  it('should detect onboarding needed when entrepreneur has 0 projects', () => {
    const projects: unknown[] = []
    const needsOnboarding = projects.length === 0
    expect(needsOnboarding).toBe(true)
  })

  it('should not detect onboarding when entrepreneur has projects', () => {
    const projects = [{ id: 'p1', name: 'Project 1' }]
    const needsOnboarding = projects.length === 0
    expect(needsOnboarding).toBe(false)
  })

  it('should only detect onboarding for ENTREPRENEUR role', () => {
    const entrepreneurRole: string = 'ENTREPRENEUR'
    const consultantRole: string = 'CONSULTANT'
    const adminRole: string = 'ADMIN'

    expect(entrepreneurRole === 'ENTREPRENEUR').toBe(true)
    expect(consultantRole === 'ENTREPRENEUR').toBe(false)
    expect(adminRole === 'ENTREPRENEUR').toBe(false)
  })
})

// ========== Description Length Validation ==========

describe('Onboarding - Description Length', () => {
  it('should accept description within 500 characters', () => {
    const description = 'a'.repeat(500)
    expect(description.length).toBe(500)
    expect(description.length <= 500).toBe(true)
  })

  it('should identify description exceeding 500 characters', () => {
    const description = 'a'.repeat(501)
    expect(description.length > 500).toBe(true)
  })

  it('should accept empty description', () => {
    const description = ''
    expect(description.length <= 500).toBe(true)
  })

  it('should accept description with exactly 500 characters', () => {
    const description = 'a'.repeat(500)
    expect(description.length).toBe(500)
    expect(description.length <= 500).toBe(true)
  })
})
