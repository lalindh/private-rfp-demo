const REQUIREMENT_PATTERNS = [
  {
    keywords: ['finance', 'general ledger', 'ledger', 'accounts payable', 'accounts receivable', 'invoice', 'invoicing', 'fixed asset', 'financial reporting'],
    processArea: 'Record to report',
    process: 'Manage financials',
    processId: 'BPC-FIN-001',
    endToEndScenario: 'Finance operations',
    fitType: 'Standard fit',
    confidence: 'High'
  },
  {
    keywords: ['procurement', 'purchasing', 'purchase order', 'vendor', 'supplier', 'sourcing', 'requisition'],
    processArea: 'Source to pay',
    process: 'Procure goods and services',
    processId: 'BPC-PROC-002',
    endToEndScenario: 'Procurement and sourcing',
    fitType: 'Standard fit',
    confidence: 'High'
  },
  {
    keywords: ['inventory', 'warehouse', 'stock', 'fulfillment', 'pick', 'pack', 'shipment', 'distribution'],
    processArea: 'Inventory to deliver',
    process: 'Manage warehouse and fulfillment',
    processId: 'BPC-SCM-003',
    endToEndScenario: 'Supply chain execution',
    fitType: 'Configuration fit',
    confidence: 'Medium'
  },
  {
    keywords: ['crm', 'sales', 'lead', 'opportunity', 'customer engagement', 'pipeline'],
    processArea: 'Lead to order',
    process: 'Manage sales execution',
    processId: 'BPC-SALES-004',
    endToEndScenario: 'Sales and customer management',
    fitType: 'Standard fit',
    confidence: 'Medium'
  },
  {
    keywords: ['customer service', 'case management', 'support', 'ticket', 'field service'],
    processArea: 'Case to resolution',
    process: 'Manage service operations',
    processId: 'BPC-SERVICE-005',
    endToEndScenario: 'Customer and field service',
    fitType: 'Configuration fit',
    confidence: 'Medium'
  },
  {
    keywords: ['hr', 'human resources', 'payroll', 'talent', 'employee', 'workforce'],
    processArea: 'Hire to retire',
    process: 'Manage workforce lifecycle',
    processId: 'BPC-HR-006',
    endToEndScenario: 'HR operations',
    fitType: 'Integration gap',
    confidence: 'Low'
  },
  {
    keywords: ['integration', 'api', 'interface', 'middleware', 'sap', 'legacy', 'third-party', 'third party'],
    processArea: 'Cross-process integration',
    process: 'Integrate external systems',
    processId: 'BPC-INT-007',
    endToEndScenario: 'Solution integration',
    fitType: 'Integration gap',
    confidence: 'High'
  },
  {
    keywords: ['migration', 'data migration', 'conversion', 'master data', 'historical data'],
    processArea: 'Cross-process data',
    process: 'Migrate business data',
    processId: 'BPC-DATA-008',
    endToEndScenario: 'Data transition',
    fitType: 'Extension gap',
    confidence: 'Medium'
  },
  {
    keywords: ['security', 'role', 'access', 'identity', 'audit', 'compliance', 'gdpr'],
    processArea: 'Platform governance',
    process: 'Manage security and compliance controls',
    processId: 'BPC-GOV-009',
    endToEndScenario: 'Governance and compliance',
    fitType: 'Configuration fit',
    confidence: 'Medium'
  },
  {
    keywords: ['reporting', 'analytics', 'dashboard', 'kpi', 'power bi', 'insight'],
    processArea: 'Performance management',
    process: 'Monitor business performance',
    processId: 'BPC-ANL-010',
    endToEndScenario: 'Analytics and reporting',
    fitType: 'Configuration fit',
    confidence: 'Medium'
  }
];

const REQUIREMENT_TYPE_RULES = [
  { keywords: ['must', 'mandatory', 'shall', 'required'], type: 'Functional requirement', mandatoryLevel: 'Must' },
  { keywords: ['should', 'preferred', 'desired'], type: 'Functional requirement', mandatoryLevel: 'Should' },
  { keywords: ['security', 'availability', 'performance', 'scalability', 'compliance', 'gdpr'], type: 'Non-functional requirement', mandatoryLevel: 'Must' },
  { keywords: ['pricing', 'commercial', 'cost', 'license', 'licensing', 'payment terms'], type: 'Commercial requirement', mandatoryLevel: 'Must' },
  { keywords: ['timeline', 'milestone', 'deadline', 'submission', 'delivery'], type: 'Delivery requirement', mandatoryLevel: 'Must' }
];

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function splitFileNameToSignals(fileName) {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function inferRequirementType(text) {
  const normalized = normalizeText(text);

  for (const rule of REQUIREMENT_TYPE_RULES) {
    if (rule.keywords.some(keyword => normalized.includes(keyword))) {
      return {
        requirementType: rule.type,
        mandatoryLevel: rule.mandatoryLevel
      };
    }
  }

  return {
    requirementType: 'Functional requirement',
    mandatoryLevel: 'Should'
  };
}

function inferPriority(mandatoryLevel, fitType) {
  if (mandatoryLevel === 'Must' && (fitType === 'Integration gap' || fitType === 'Extension gap')) {
    return 'Critical';
  }
  if (mandatoryLevel === 'Must') {
    return 'High';
  }
  if (fitType === 'Unclear') {
    return 'Medium';
  }
  return 'Medium';
}

function inferStatus(fitType, confidence) {
  if (fitType === 'Standard fit') return 'Detected';
  if (fitType === 'Configuration fit') return 'Assumed';
  if (fitType === 'Integration gap' || fitType === 'Extension gap') return 'Gap';
  if (confidence === 'Low') return 'Needs review';
  return 'Needs review';
}

function inferCompliance(status) {
  if (status === 'Detected') return 'Y';
  if (status === 'Assumed') return 'P';
  if (status === 'Gap') return 'N';
  return 'P';
}

function buildReviewReason(fitType, confidence) {
  if (fitType === 'Integration gap') {
    return 'Requires architect review because external systems or interfaces are implied.';
  }
  if (fitType === 'Extension gap') {
    return 'Requires solution review because standard process coverage appears incomplete.';
  }
  if (confidence === 'Low') {
    return 'Low-confidence mapping. Human validation is needed before proposal shaping.';
  }
  if (fitType === 'Configuration fit') {
    return 'Likely covered through configuration, but customer scope and assumptions should be confirmed.';
  }
  return 'Looks aligned with standard process coverage, but should still be validated during bid review.';
}

function mapToProcess(text) {
  const normalized = normalizeText(text);

  for (const pattern of REQUIREMENT_PATTERNS) {
    if (pattern.keywords.some(keyword => normalized.includes(keyword))) {
      return pattern;
    }
  }

  return {
    processArea: 'Unmapped process area',
    process: 'Manual review required',
    processId: 'BPC-UNMAPPED',
    endToEndScenario: 'Needs classification',
    fitType: 'Unclear',
    confidence: 'Low'
  };
}

function buildRequirementSentence(file, signal, index) {
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  const syntheticStatements = [
    `The solution must support ${signal} processes and provide traceable response coverage.`,
    `The customer expects ${signal} capabilities to be reviewed against Microsoft standard functionality.`,
    `The response should explain how ${signal} scope will be delivered, configured, integrated or clarified.`,
    `The proposal must identify assumptions, fit gaps and review points related to ${signal}.`
  ];

  return syntheticStatements[index % syntheticStatements.length].replace(/  +/g, ' ').replace(baseName, signal);
}

function buildRequirementRow(file, signal, index) {
  const requirementText = buildRequirementSentence(file, signal, index);
  const mapping = mapToProcess(`${signal} ${file.name} ${requirementText}`);
  const typeInfo = inferRequirementType(`${signal} ${file.name} ${requirementText}`);
  const status = inferStatus(mapping.fitType, mapping.confidence);
  const priority = inferPriority(typeInfo.mandatoryLevel, mapping.fitType);
  const compliance = inferCompliance(status);

  const requirementId = `REQ-${String(index + 1).padStart(3, '0')}`;

  return {
    rowId: requirementId,
    requirementId,
    requirementTitle: `${signal.charAt(0).toUpperCase()}${signal.slice(1)} requirement`,
    requirementText,
    requirementType: typeInfo.requirementType,
    mandatoryLevel: typeInfo.mandatoryLevel,
    sourceDocument: file.name,
    sourceSection: `Section ${index + 1}`,
    sourcePage: index + 1,
    endToEndScenario: mapping.endToEndScenario,
    processArea: mapping.processArea,
    process: mapping.process,
    processId: mapping.processId,
    fitType: mapping.fitType,
    confidence: mapping.confidence,
    reviewReason: buildReviewReason(mapping.fitType, mapping.confidence),
    priority,
    status,
    compliance,
    owner: '',
    proposalSection: 'Solution fit and approach',
    responseAction:
      mapping.fitType === 'Standard fit'
        ? 'Reference standard capabilities and confirm scope.'
        : mapping.fitType === 'Configuration fit'
          ? 'Validate assumptions and describe configuration approach.'
          : mapping.fitType === 'Integration gap'
            ? 'Describe integration approach, dependencies and effort drivers.'
            : mapping.fitType === 'Extension gap'
              ? 'Describe gap closure options, estimate impact and assumptions.'
              : 'Escalate for manual process classification.'
  };
}

function buildRequirements(files) {
  const rows = [];

  files.forEach((file, fileIndex) => {
    const signals = splitFileNameToSignals(file.name);
    const selectedSignals = signals.slice(0, 4);

    if (!selectedSignals.length) {
      selectedSignals.push(`document ${fileIndex + 1}`);
    }

    selectedSignals.forEach((signal, signalIndex) => {
      rows.push(buildRequirementRow(file, signal, rows.length + signalIndex));
    });
  });

  return rows.slice(0, 18);
}

function summarizeWorkstream(requirements) {
  const areas = requirements.map(item => item.processArea);
  const counts = areas.reduce((acc, area) => {
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {});

  const topArea = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return topArea ? topArea[0] : 'General business transformation';
}

function buildExecutiveSummary(requirements, files) {
  const detected = requirements.filter(item => item.status === 'Detected').length;
  const assumed = requirements.filter(item => item.status === 'Assumed').length;
  const gap = requirements.filter(item => item.status === 'Gap').length;
  const review = requirements.filter(item => item.status === 'Needs review').length;

  return `The current intake covers ${files.length} file(s) and produced ${requirements.length} structured requirement rows. The strongest signals point to ${summarizeWorkstream(requirements)}. Early analysis suggests ${detected} detected fits, ${assumed} assumed/configuration fits, ${gap} gaps and ${review} items that still need review before proposal shaping.`;
}

function buildScopeSignals(requirements) {
  const uniqueAreas = [...new Set(requirements.map(item => item.processArea))];

  return uniqueAreas.slice(0, 6).map(area => ({
    title: area,
    text: `The intake contains signals that map to ${area} and should be considered during scope confirmation.`
  }));
}

function buildRiskFlags(requirements) {
  return requirements
    .filter(item => item.fitType === 'Integration gap' || item.fitType === 'Extension gap' || item.confidence === 'Low')
    .slice(0, 6)
    .map(item => ({
      title: item.requirementTitle,
      text: `${item.fitType} · ${item.reviewReason}`
    }));
}

function buildRecommendedActions(requirements) {
  return [
    {
      title: 'Validate requirement extraction',
      text: 'Review whether important RFP requirements are missing from the current requirement list.'
    },
    {
      title: 'Confirm process mapping',
      text: 'Validate process area and process matches against the Microsoft Business Process Catalog view you want to use.'
    },
    {
      title: 'Review fit/gap assumptions',
      text: 'Confirm which items are standard fit, configuration fit or true solution gaps before pricing and shaping.'
    },
    {
      title: 'Prepare response strategy',
      text: 'Use the reviewed matrix to decide where to reuse standard content and where to draft tailored responses.'
    }
  ];
}

function buildCatalogMatches(requirements) {
  return requirements.slice(0, 8).map(item => ({
    level: item.endToEndScenario,
    type: item.processId,
    name: `${item.processArea} → ${item.process}`,
    rationale: `Mapped from ${item.sourceDocument} with ${item.confidence.toLowerCase()} confidence.`
  }));
}

function buildProposalSections(requirements) {
  const hasGaps = requirements.some(item => item.status === 'Gap');

  const sections = [
    {
      title: 'Executive overview',
      text: 'Summarize customer goals, major scope signals and bid positioning.'
    },
    {
      title: 'Scope and fit analysis',
      text: 'Explain how the request maps to Microsoft process coverage and where assumptions apply.'
    },
    {
      title: 'Solution approach',
      text: 'Describe target capabilities, implementation direction and governance approach.'
    }
  ];

  if (hasGaps) {
    sections.push({
      title: 'Gaps, assumptions and dependencies',
      text: 'Explicitly describe integration gaps, extension areas, assumptions and customer dependencies.'
    });
  }

  return sections;
}

function buildAssumptions(requirements) {
  return requirements
    .filter(item => item.status === 'Assumed' || item.confidence === 'Low')
    .slice(0, 6)
    .map(item => ({
      title: item.requirementTitle,
      text: `Assumption: ${item.process} can likely be covered through configuration or clarified scope, but this needs validation.`
    }));
}

function buildGaps(requirements) {
  return requirements
    .filter(item => item.status === 'Gap')
    .slice(0, 6)
    .map(item => ({
      id: item.requirementId,
      severity: item.priority,
      area: item.processArea,
      impact: `${item.requirementTitle} is currently assessed as ${item.fitType}.`,
      recommendation: item.responseAction
    }));
}

function buildEvaluationFocus(requirements) {
  return requirements.slice(0, 6).map(item => ({
    title: item.requirementTitle,
    text: `Review mapping to ${item.processArea} / ${item.process} and confirm ${item.fitType.toLowerCase()} assessment.`
  }));
}

function buildResponseOutline(requirements) {
  const outline = [
    { section: 'Customer context', text: 'Describe the opportunity context, requested scope and operating model.' },
    { section: 'Scope alignment', text: 'Show how requirements align to Microsoft process coverage and project scope.' },
    { section: 'Delivery approach', text: 'Describe implementation method, assumptions and governance.' }
  ];

  if (requirements.some(item => item.fitType.includes('gap') || item.fitType === 'Unclear')) {
    outline.push({
      section: 'Gaps and dependencies',
      text: 'Document integration needs, extension areas, assumptions and items that require confirmation.'
    });
  }

  return outline;
}

function buildDiagnostics(requirements) {
  return {
    detectedSignals: [...new Set(requirements.map(item => item.processArea))].slice(0, 8),
    missingSignals: [
      'Explicit evaluation criteria',
      'Named business outcomes',
      'Architecture principles',
      'Detailed integration inventory',
      'Data migration scope',
      'Service level expectations'
    ]
  };
}

function buildFeed(files, requirements) {
  return [
    {
      title: 'Files ingested',
      text: `The intake received ${files.length} file(s) and generated structured review signals from file names and metadata.`
    },
    {
      title: 'Requirements synthesized',
      text: `${requirements.length} requirement rows were created for compliance review and proposal shaping.`
    },
    {
      title: 'Process mapping completed',
      text: 'Each row was matched to a process area and process using a lightweight rule-based mapping model.'
    },
    {
      title: 'Fit and review assessment added',
      text: 'Rows were labeled with fit type, confidence and review reasons to support bid team validation.'
    }
  ];
}

export async function handler(request, context) {
  try {
    const body = await request.json();
    const files = Array.isArray(body?.files) ? body.files : [];

    if (!files.length) {
      return Response.json(
        {
          ok: false,
          message: 'No files were provided.'
        },
        { status: 400 }
      );
    }

    const requirements = buildRequirements(files);

    const response = {
      ok: true,
      timestamp: new Date().toISOString(),
      summary: {
        documentCount: files.length,
        workstream: summarizeWorkstream(requirements),
        readiness: requirements.some(item => item.status === 'Gap')
          ? 'Needs structured review'
          : 'Ready for proposal shaping'
      },
      workflow: {
        pattern: 'Requirement extraction → process mapping → fit/gap review',
        stages: [
          'Intake',
          'Requirement extraction',
          'Process mapping',
          'Fit/gap assessment',
          'Proposal shaping'
        ]
      },
      executiveSummary: buildExecutiveSummary(requirements, files),
      scopeSignals: buildScopeSignals(requirements),
      riskFlags: buildRiskFlags(requirements),
      recommendedActions: buildRecommendedActions(requirements),
      catalogMatches: buildCatalogMatches(requirements),
      proposalPageSections: buildProposalSections(requirements),
      requirements,
      assumptions: buildAssumptions(requirements),
      gaps: buildGaps(requirements),
      evaluationFocus: buildEvaluationFocus(requirements),
      responseOutline: buildResponseOutline(requirements),
      complianceMatrix: requirements,
      intakeDiagnostics: buildDiagnostics(requirements),
      feed: buildFeed(files, requirements)
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    context.log('Analyze function failed', error);

    return Response.json(
      {
        ok: false,
        message: 'Failed to analyze the uploaded files.'
      },
      { status: 500 }
    );
  }
}
