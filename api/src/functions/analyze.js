const { app } = require('@azure/functions');

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
  return String(fileName || '')
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function inferRequirementType(text, fileRole = 'Other') {
  const normalized = normalizeText(text);

  if (fileRole === 'Commercial') {
    return {
      requirementType: 'Commercial requirement',
      mandatoryLevel: 'Must'
    };
  }

  if (fileRole === 'Evaluation criteria') {
    return {
      requirementType: 'Delivery requirement',
      mandatoryLevel: 'Must'
    };
  }

  for (const rule of REQUIREMENT_TYPE_RULES) {
    if (rule.keywords.some(keyword => normalized.includes(keyword))) {
      return {
        requirementType: rule.type,
        mandatoryLevel: rule.mandatoryLevel
      };
    }
  }

  return {
    requirementType: fileRole === 'Functional requirements' ? 'Functional requirement' : 'Functional requirement',
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

function buildReviewReason(fitType, confidence, documentRole, sourceMode) {
  if (documentRole === 'Functional requirements' && sourceMode === 'Extracted') {
    return 'Derived from the designated functional requirements source and should be validated against the original Excel rows.';
  }

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

function defaultOwner(processArea, role) {
  if (role === 'Commercial') return 'Commercial lead';
  if (role === 'Evaluation criteria') return 'Bid manager';
  if (String(processArea).toLowerCase().includes('finance')) return 'Finance SME';
  if (String(processArea).toLowerCase().includes('integration')) return 'Solution architect';
  if (String(processArea).toLowerCase().includes('service')) return 'Service lead';
  return 'Bid manager';
}

function futureDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function mapToProcess(text, fileRole = 'Other') {
  const normalized = normalizeText(text);

  if (fileRole === 'Commercial') {
    return {
      processArea: 'Commercial and contracting',
      process: 'Manage commercial response',
      processId: 'BPC-COM-011',
      endToEndScenario: 'Commercial response',
      fitType: 'Unclear',
      confidence: 'Medium'
    };
  }

  if (fileRole === 'Evaluation criteria') {
    return {
      processArea: 'Bid governance',
      process: 'Respond to evaluation criteria',
      processId: 'BPC-BID-012',
      endToEndScenario: 'Proposal governance',
      fitType: 'Configuration fit',
      confidence: 'Medium'
    };
  }

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

function buildRequirementSentence(file, signal, index, role, sourceMode) {
  const rolePrefix =
    role === 'Functional requirements'
      ? 'Functional requirement'
      : role === 'Main RFP'
        ? 'RFP requirement'
        : role === 'Commercial'
          ? 'Commercial requirement'
          : role === 'Evaluation criteria'
            ? 'Evaluation requirement'
            : 'Requirement';

  const statements = sourceMode === 'Extracted'
    ? [
        `${rolePrefix}: ${signal} must be addressed in the proposed solution scope.`,
        `${rolePrefix}: ${signal} should be reviewed against Microsoft standard capabilities.`,
        `${rolePrefix}: ${signal} needs compliance, fit and gap assessment.`,
        `${rolePrefix}: ${signal} should be traceable to the original customer requirement source.`
      ]
    : [
        `Inferred from ${role.toLowerCase()}: ${signal} appears relevant for the proposal response.`,
        `The intake suggests that ${signal} may need scope clarification or process mapping.`,
        `The system inferred that ${signal} may affect fit, assumptions or delivery planning.`,
        `This item was inferred from supporting documents and should be validated by the bid team.`
      ];

  return statements[index % statements.length];
}

function buildRequirementRow(file, signal, index, options = {}) {
  const documentRole = String(options.documentRole || file.role || 'Other');
  const sourceMode = String(options.sourceMode || 'Inferred');
  const sheetName = String(options.sheetName || 'Sheet1');
  const rowNumber = Number(options.rowNumber || index + 2);

  const requirementText = buildRequirementSentence(file, signal, index, documentRole, sourceMode);
  const mapping = mapToProcess(`${signal} ${file.name} ${requirementText}`, documentRole);
  const typeInfo = inferRequirementType(`${signal} ${file.name} ${requirementText}`, documentRole);
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
    sourceSection: `${sheetName} / row ${rowNumber}`,
    sourcePage: index + 1,
    sourceMode,
    documentRole,
    sheetName,
    rowNumber,
    endToEndScenario: mapping.endToEndScenario,
    processArea: mapping.processArea,
    process: mapping.process,
    processId: mapping.processId,
    fitType: mapping.fitType,
    confidence: mapping.confidence,
    reviewReason: buildReviewReason(mapping.fitType, mapping.confidence, documentRole, sourceMode),
    priority,
    status,
    compliance,
    owner: defaultOwner(mapping.processArea, documentRole),
    deadline: futureDate((index % 5 + 1) * 3),
    reviewStatus: index % 4 === 0 ? 'Reviewed' : index % 4 === 1 ? 'In progress' : index % 4 === 2 ? 'Not started' : 'Blocked',
    comments: sourceMode === 'Extracted'
      ? `Review original row in ${sheetName} before final proposal shaping.`
      : 'This row is inferred and should be confirmed during review.',
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
    const role = String(file.role || 'Other');
    const ext = String(file.name || '').split('.').pop().toLowerCase();
    const isFunctionalExcel = role === 'Functional requirements' && (ext === 'xlsx' || ext === 'xls');
    const signals = splitFileNameToSignals(file.name);

    if (isFunctionalExcel) {
      const sheetCandidates = ['Overview', 'Functional Requirements', 'Processes', 'Integrations', 'Reporting'];
      const selectedSignals = signals.length ? signals : [`workbook ${fileIndex + 1}`];

      sheetCandidates.forEach((sheetName, sheetIndex) => {
        selectedSignals.slice(0, 3).forEach((signal, signalIndex) => {
          rows.push(
            buildRequirementRow(file, `${signal} ${sheetName}`.trim(), rows.length, {
              documentRole: role,
              sourceMode: 'Extracted',
              sheetName,
              rowNumber: 2 + signalIndex + sheetIndex * 10
            })
          );
        });
      });

      return;
    }

    const selectedSignals = signals.slice(0, 2);
    if (!selectedSignals.length) {
      selectedSignals.push(`document ${fileIndex + 1}`);
    }

    selectedSignals.forEach((signal, signalIndex) => {
      rows.push(
        buildRequirementRow(file, signal, rows.length + signalIndex, {
          documentRole: role,
          sourceMode: 'Inferred',
          sheetName: 'Document summary',
          rowNumber: signalIndex + 1
        })
      );
    });
  });

  return rows.slice(0, 40);
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
  const extracted = requirements.filter(item => item.sourceMode === 'Extracted').length;
  const functionalMasters = files.filter(file => file.role === 'Functional requirements').length;

  return `The current intake covers ${files.length} file(s), including ${functionalMasters} designated functional requirements source file(s), and produced ${requirements.length} structured requirement rows. The analysis currently contains ${extracted} extracted-style rows and ${requirements.length - extracted} inferred rows. The strongest signals point to ${summarizeWorkstream(requirements)}. Early analysis suggests ${detected} detected fits, ${assumed} assumed/configuration fits, ${gap} gaps and ${review} items that still need review before proposal shaping.`;
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

function buildRecommendedActions(files) {
  const hasFunctionalMaster = files.some(file => file.role === 'Functional requirements');

  return [
    {
      title: 'Validate requirement extraction',
      text: hasFunctionalMaster
        ? 'Review whether the designated functional requirements source is represented correctly in the current requirement list.'
        : 'No functional requirements master was marked. Confirm whether one of the uploaded files should be treated as the primary source.'
    },
    {
      title: 'Confirm process mapping',
      text: 'Validate process area and process matches against the Microsoft Business Process Catalog view you want to use.'
    },
    {
      title: 'Assign ownership and deadlines',
      text: 'Use the matrix owner and deadline fields actively so every requirement has a clear reviewer and due date.'
    },
    {
      title: 'Review fit/gap assumptions',
      text: 'Confirm which items are standard fit, configuration fit or true solution gaps before pricing and shaping.'
    }
  ];
}

function buildCatalogMatches(requirements) {
  return requirements.slice(0, 8).map(item => ({
    level: item.endToEndScenario,
    type: item.processId,
    name: `${item.processArea} → ${item.process}`,
    rationale: `Mapped from ${item.sourceDocument} (${item.documentRole}, ${item.sourceMode.toLowerCase()}) with ${item.confidence.toLowerCase()} confidence.`
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

  if (requirements.some(item => item.fitType.toLowerCase().includes('gap') || item.fitType === 'Unclear')) {
    outline.push({
      section: 'Gaps and dependencies',
      text: 'Document integration needs, extension areas, assumptions and items that require confirmation.'
    });
  }

  return outline;
}

function buildDiagnostics(requirements, files) {
  const functionalMasters = files.filter(file => file.role === 'Functional requirements').map(file => file.name);

  return {
    detectedSignals: [...new Set(requirements.map(item => item.processArea))].slice(0, 8),
    missingSignals: [
      'Explicit evaluation criteria',
      'Named business outcomes',
      'Architecture principles',
      'Detailed integration inventory',
      'Data migration scope',
      'Service level expectations'
    ],
    documentRoleSummary: files.map(file => ({
      fileName: file.name,
      role: file.role || 'Other'
    })),
    functionalRequirementSources: functionalMasters
  };
}

function buildFeed(files, requirements) {
  const extracted = requirements.filter(item => item.sourceMode === 'Extracted').length;
  const inferred = requirements.filter(item => item.sourceMode === 'Inferred').length;
  const functionalMasters = files.filter(file => file.role === 'Functional requirements').length;

  return [
    {
      title: 'Files ingested',
      text: `The intake received ${files.length} file(s) with explicit document roles.`
    },
    {
      title: 'Functional requirements sources marked',
      text: `${functionalMasters} file(s) were marked as functional requirements sources.`
    },
    {
      title: 'Requirements synthesized',
      text: `${requirements.length} requirement rows were created, including ${extracted} extracted-style rows and ${inferred} inferred rows.`
    },
    {
      title: 'Workbook-style traceability added',
      text: 'Each row now includes sheet and row references together with owner, deadline, review status and comments.'
    }
  ];
}

app.http('analyze', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
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

      const normalizedFiles = files.map(file => ({
        name: String(file.name || 'Unnamed file'),
        size: Number(file.size || 0),
        type: String(file.type || ''),
        role: String(file.role || 'Other')
      }));

      const requirements = buildRequirements(normalizedFiles);

      const response = {
        ok: true,
        timestamp: new Date().toISOString(),
        summary: {
          documentCount: normalizedFiles.length,
          workstream: summarizeWorkstream(requirements),
          readiness: requirements.some(item => item.status === 'Gap')
            ? 'Needs structured review'
            : 'Ready for proposal shaping'
        },
        workflow: {
          pattern: 'Document role assignment → requirement extraction → process mapping → fit/gap review',
          stages: [
            'Intake',
            'Document role assignment',
            'Requirement extraction',
            'Process mapping',
            'Fit/gap assessment',
            'Proposal shaping'
          ]
        },
        executiveSummary: buildExecutiveSummary(requirements, normalizedFiles),
        scopeSignals: buildScopeSignals(requirements),
        riskFlags: buildRiskFlags(requirements),
        recommendedActions: buildRecommendedActions(normalizedFiles),
        catalogMatches: buildCatalogMatches(requirements),
        proposalPageSections: buildProposalSections(requirements),
        requirements,
        assumptions: buildAssumptions(requirements),
        gaps: buildGaps(requirements),
        evaluationFocus: buildEvaluationFocus(requirements),
        responseOutline: buildResponseOutline(requirements),
        complianceMatrix: requirements,
        intakeDiagnostics: buildDiagnostics(requirements, normalizedFiles),
        feed: buildFeed(normalizedFiles, requirements)
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
});
