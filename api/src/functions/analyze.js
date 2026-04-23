const { app } = require('@azure/functions');

function json(status, body) {
  return {
    status,
    jsonBody: body
  };
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function getExtension(name) {
  const parts = String(name || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function unique(values) {
  return [...new Set(values)];
}

function hasAny(text, words) {
  return words.some(word => text.includes(word));
}

function detectWorkstream(files) {
  const joined = files.map(file => normalizeText(file.name)).join(' ');

  if (hasAny(joined, ['finance', 'invoice', 'billing', 'ledger', 'accounts'])) {
    return 'Finance and operations advisory';
  }

  if (hasAny(joined, ['crm', 'sales', 'customer', 'marketing', 'case'])) {
    return 'Customer engagement transformation';
  }

  if (hasAny(joined, ['warehouse', 'supply', 'inventory', 'procurement', 'logistics'])) {
    return 'Supply chain and operations';
  }

  if (hasAny(joined, ['hr', 'talent', 'people', 'payroll', 'workforce'])) {
    return 'Human resources enablement';
  }

  return 'General proposal intake';
}

function determineReadiness(files) {
  if (!files.length) {
    return 'Awaiting input';
  }

  if (files.length >= 6) {
    return 'Draft response can be structured';
  }

  if (files.length >= 3) {
    return 'Clarification and shaping recommended';
  }

  return 'More source material recommended';
}

function buildMissingSignals(files) {
  const joined = files.map(file => normalizeText(file.name)).join(' ');
  const missing = [];

  if (!hasAny(joined, ['scope', 'statement-of-work', 'sow', 'deliverable'])) {
    missing.push('scope detail');
  }

  if (!hasAny(joined, ['timeline', 'plan', 'milestone', 'schedule'])) {
    missing.push('timeline guidance');
  }

  if (!hasAny(joined, ['pricing', 'price', 'cost', 'commercial', 'budget'])) {
    missing.push('commercial detail');
  }

  if (!hasAny(joined, ['requirement', 'requirements', 'matrix', 'compliance'])) {
    missing.push('requirement structure');
  }

  if (!hasAny(joined, ['architecture', 'solution', 'design'])) {
    missing.push('solution framing');
  }

  return missing.slice(0, 4);
}

function inferDetectedSignals(files) {
  const joined = files.map(file => normalizeText(file.name)).join(' ');
  const extensions = unique(files.map(file => getExtension(file.name)).filter(Boolean));
  const signals = [];

  if (extensions.includes('xlsx') || extensions.includes('xls')) {
    signals.push('Tabular input likely present');
  }

  if (extensions.includes('pptx') || extensions.includes('ppt')) {
    signals.push('Stakeholder storyline material likely present');
  }

  if (extensions.includes('docx') || extensions.includes('doc') || extensions.includes('pdf')) {
    signals.push('Formal procurement wording likely present');
  }

  if (hasAny(joined, ['pricing', 'price', 'cost', 'budget'])) {
    signals.push('Commercial signal detected');
  }

  if (hasAny(joined, ['timeline', 'plan', 'milestone'])) {
    signals.push('Timeline signal detected');
  }

  if (hasAny(joined, ['requirement', 'requirements', 'matrix', 'compliance'])) {
    signals.push('Requirement structure signal detected');
  }

  if (hasAny(joined, ['scope', 'sow', 'deliverable'])) {
    signals.push('Scope signal detected');
  }

  return signals;
}

function buildExecutiveSummary(files, workstream, readiness, missingSignals) {
  const fileCount = files.length;
  const types = unique(files.map(file => getExtension(file.name)).filter(Boolean));
  const typeText = types.length
    ? `The intake includes ${types.join(', ').toUpperCase()} material`
    : 'The intake includes a limited range of source material';

  const gapText = missingSignals.length
    ? `Key proposal signals still appear weak, especially around ${missingSignals.slice(0, 2).join(' and ')}.`
    : 'The available source set provides a reasonable baseline for shaping the first structured response.';

  return `The submitted package suggests a ${workstream.toLowerCase()} opportunity based on the uploaded file set and naming patterns. ${typeText}, which indicates that the response effort will likely span several proposal workstreams rather than a single isolated document track. Current readiness is assessed as "${readiness}", so the team can begin a first structured response while still validating assumptions, extracting detailed requirements, and tightening scope interpretation. ${gapText}`;
}

function buildScopeSignals(files, workstream) {
  const extensions = unique(files.map(file => getExtension(file.name)).filter(Boolean));
  const signals = [
    {
      title: 'Primary workstream',
      text: `The current intake most closely aligns with ${workstream.toLowerCase()}.`
    },
    {
      title: 'Review posture',
      text: 'The package appears suitable for first-pass triage, categorization, and proposal planning before deeper requirement-by-requirement analysis.'
    }
  ];

  if (extensions.length) {
    signals.push({
      title: 'Document mix',
      text: `The intake includes ${extensions.join(', ').toUpperCase()} files, which suggests a cross-functional response process with both narrative and structured inputs.`
    });
  }

  if (extensions.includes('xlsx') || extensions.includes('xls')) {
    signals.push({
      title: 'Structured attachments',
      text: 'Spreadsheet material often indicates scoring models, requirement matrices, pricing structures, or implementation trackers.'
    });
  }

  if (extensions.includes('pdf') || extensions.includes('docx') || extensions.includes('doc')) {
    signals.push({
      title: 'Formal requirements pattern',
      text: 'Document-led intake usually indicates formal language that should be tracked into the response outline and compliance view.'
    });
  }

  return signals.slice(0, 5);
}

function buildRiskFlags(files, missingSignals) {
  const totalSize = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  const flags = [];

  if (files.length <= 2) {
    flags.push({
      title: 'Limited source coverage',
      text: 'A small number of uploaded files reduces confidence in initial scope interpretation and may hide annexes or qualification material.'
    });
  }

  if (totalSize < 150000) {
    flags.push({
      title: 'Light intake package',
      text: 'The total size of uploaded material is small, which can indicate that key appendices or supporting content are still missing.'
    });
  }

  if (missingSignals.length) {
    flags.push({
      title: 'Incomplete response basis',
      text: `The intake does not yet strongly indicate ${missingSignals.join(', ')}, so early drafts should clearly distinguish confirmed facts from assumptions.`
    });
  }

  flags.push({
    title: 'Catalog mapping is provisional',
    text: 'Process alignment at this stage should be treated as directional until requirement extraction and solution review are completed.'
  });

  return flags.slice(0, 4);
}

function buildRecommendedActions(files, readiness) {
  return [
    {
      title: 'Create first response structure',
      text: `Prepare an initial proposal skeleton aligned to the current readiness state: ${readiness.toLowerCase()}.`
    },
    {
      title: 'Extract explicit requirements',
      text: 'Break the available material into trackable requirements, assumptions, dependencies, and review questions.'
    },
    {
      title: 'Build a gap view',
      text: 'Separate confirmed fit, likely gaps, and open items before the writing team starts detailed response production.'
    },
    {
      title: 'Map business process relevance',
      text: 'Relate the request to Microsoft business process areas and business processes to frame standard fit versus customer-specific needs.'
    }
  ];
}

function buildCatalogMatches(workstream) {
  const defaultMatches = [
    {
      level: 'Level 2',
      type: 'Business process area',
      name: 'Create and manage sales',
      rationale: 'The opportunity appears to involve qualification, shaping, and commercial response planning.'
    },
    {
      level: 'Level 3',
      type: 'Business process',
      name: 'Sell products to customers',
      rationale: 'This provides a reasonable starting point for proposal-oriented process mapping.'
    }
  ];

  if (workstream === 'Finance and operations advisory') {
    return [
      {
        level: 'Level 2',
        type: 'Business process area',
        name: 'Record and report financial transactions',
        rationale: 'The intake suggests finance-oriented activities and likely operational control requirements.'
      },
      {
        level: 'Level 3',
        type: 'Business process',
        name: 'Manage general ledger',
        rationale: 'This is a useful directional baseline for mapping finance-driven requirement themes.'
      }
    ];
  }

  if (workstream === 'Customer engagement transformation') {
    return [
      {
        level: 'Level 2',
        type: 'Business process area',
        name: 'Create and manage sales',
        rationale: 'The intake appears to focus on customer-facing processes, opportunity shaping, and commercial engagement.'
      },
      {
        level: 'Level 3',
        type: 'Business process',
        name: 'Manage sales opportunities',
        rationale: 'This process is a practical anchor for early-stage CRM and customer engagement mapping.'
      }
    ];
  }

  if (workstream === 'Supply chain and operations') {
    return [
      {
        level: 'Level 2',
        type: 'Business process area',
        name: 'Plan and source supply',
        rationale: 'The source naming suggests fulfillment, inventory, or sourcing-related requirements.'
      },
      {
        level: 'Level 3',
        type: 'Business process',
        name: 'Manage inventory',
        rationale: 'This provides a useful first hypothesis for operational process alignment.'
      }
    ];
  }

  if (workstream === 'Human resources enablement') {
    return [
      {
        level: 'Level 2',
        type: 'Business process area',
        name: 'Manage organization and people',
        rationale: 'The intake suggests employee, workforce, or HR-related process themes.'
      },
      {
        level: 'Level 3',
        type: 'Business process',
        name: 'Manage employee information',
        rationale: 'This offers a directional baseline for HR-oriented requirement mapping.'
      }
    ];
  }

  return defaultMatches;
}

function buildProposalPageSections(workstream, readiness) {
  return [
    {
      title: 'Customer context',
      text: `Summarize the customer situation and explain why ${workstream.toLowerCase()} is the best current framing of the opportunity.`
    },
    {
      title: 'Business needs and response themes',
      text: 'Translate intake findings into the primary business needs, response themes, and likely decision drivers.'
    },
    {
      title: 'Proposed solution direction',
      text: 'Describe the expected Microsoft-oriented solution shape, including standard capabilities, accelerators, and likely boundary conditions.'
    },
    {
      title: 'Process alignment and scope',
      text: 'Show how the opportunity maps to business process areas and where further scope clarification is still required.'
    },
    {
      title: 'Delivery approach and next steps',
      text: `Position the recommended next actions around the current readiness state: ${readiness.toLowerCase()}.`
    }
  ];
}

function buildRequirements(files, workstream, missingSignals) {
  const joined = files.map(file => normalizeText(file.name)).join(' ');
  const requirements = [];

  requirements.push({
    id: 'REQ-001',
    title: 'Structured intake review',
    priority: 'High',
    status: 'Detected',
    source: 'File set and naming pattern',
    text: 'The opportunity requires a structured review of uploaded source material before detailed response drafting begins.'
  });

  if (hasAny(joined, ['requirement', 'requirements', 'matrix', 'compliance'])) {
    requirements.push({
      id: 'REQ-002',
      title: 'Requirement traceability',
      priority: 'High',
      status: 'Detected',
      source: 'Requirement-related naming signal',
      text: 'The response should support explicit tracking between stated customer requirements and proposed answers.'
    });
  } else {
    requirements.push({
      id: 'REQ-002',
      title: 'Requirement traceability',
      priority: 'Medium',
      status: 'Assumed',
      source: 'Typical proposal governance need',
      text: 'A traceable requirement structure will likely be needed even if it is not yet clearly visible in the current intake.'
    });
  }

  if (hasAny(joined, ['pricing', 'price', 'cost', 'budget'])) {
    requirements.push({
      id: 'REQ-003',
      title: 'Commercial response input',
      priority: 'High',
      status: 'Detected',
      source: 'Commercial naming signal',
      text: 'The proposal should allow for commercial framing, pricing assumptions, or cost-related qualification.'
    });
  } else if (missingSignals.includes('commercial detail')) {
    requirements.push({
      id: 'REQ-003',
      title: 'Commercial response input',
      priority: 'Medium',
      status: 'Gap',
      source: 'Missing intake signal',
      text: 'Commercial detail is not yet sufficiently represented in the uploaded material.'
    });
  }

  requirements.push({
    id: 'REQ-004',
    title: 'Process-based scope framing',
    priority: 'High',
    status: 'Detected',
    source: workstream,
    text: `The opportunity should be framed against relevant process areas for ${workstream.toLowerCase()} to support fit-gap discussion and proposal structure.`
  });

  if (hasAny(joined, ['timeline', 'plan', 'milestone', 'schedule'])) {
    requirements.push({
      id: 'REQ-005',
      title: 'Delivery planning visibility',
      priority: 'Medium',
      status: 'Detected',
      source: 'Timeline naming signal',
      text: 'The response should account for delivery sequencing, milestones, or implementation planning.'
    });
  } else {
    requirements.push({
      id: 'REQ-005',
      title: 'Delivery planning visibility',
      priority: 'Medium',
      status: 'Assumed',
      source: 'Typical delivery expectation',
      text: 'A phased delivery view will likely be expected even if the current intake does not yet state it explicitly.'
    });
  }

  if (missingSignals.includes('solution framing')) {
    requirements.push({
      id: 'REQ-006',
      title: 'Solution framing',
      priority: 'Medium',
      status: 'Needs review',
      source: 'Missing intake signal',
      text: 'A clear solution framing should be established before the final proposal structure is approved.'
    });
  }

  return requirements;
}

function buildAssumptions(files, missingSignals) {
  const assumptions = [];

  assumptions.push({
    title: 'Metadata-led analysis',
    text: 'This version of the analysis primarily interprets file metadata, naming patterns, and intake composition rather than full document contents.'
  });

  if (missingSignals.includes('scope detail')) {
    assumptions.push({
      title: 'Scope still provisional',
      text: 'Detailed scope boundaries are assumed to require clarification before final proposal writing begins.'
    });
  }

  if (missingSignals.includes('commercial detail')) {
    assumptions.push({
      title: 'Commercial structure to be confirmed',
      text: 'Pricing, commercials, or budget framing may exist outside the current uploaded package.'
    });
  }

  if (missingSignals.includes('timeline guidance')) {
    assumptions.push({
      title: 'Delivery phasing not yet confirmed',
      text: 'Implementation timing and milestone expectations are not yet strongly evidenced in the intake.'
    });
  }

  assumptions.push({
    title: 'Human review remains required',
    text: 'Any inferred fit-gap or process alignment should be validated by proposal and solution stakeholders.'
  });

  return assumptions.slice(0, 5);
}

function buildGaps(files, missingSignals) {
  const gaps = [];

  missingSignals.forEach((signal, index) => {
    gaps.push({
      id: `GAP-00${index + 1}`,
      area: signal,
      severity: index === 0 ? 'High' : 'Medium',
      impact: `The current intake does not provide strong evidence for ${signal}, which limits confidence in the first response baseline.`,
      recommendation: `Request or locate additional material that clarifies ${signal} before the proposal is finalized.`
    });
  });

  if (!gaps.length) {
    gaps.push({
      id: 'GAP-001',
      area: 'Detailed requirement extraction',
      severity: 'Low',
      impact: 'The intake appears reasonably complete for a first pass, but detailed requirement decomposition is still needed.',
      recommendation: 'Proceed to requirement-by-requirement extraction and response mapping.'
    });
  }

  return gaps.slice(0, 4);
}

function buildEvaluationFocus(files, workstream) {
  return [
    {
      title: 'Scope confidence',
      text: `Test whether the uploaded material provides enough evidence to frame a reliable ${workstream.toLowerCase()} response narrative.`
    },
    {
      title: 'Requirement traceability',
      text: 'Check whether all explicit and inferred requirements can be mapped into a controlled response structure.'
    },
    {
      title: 'Commercial and delivery completeness',
      text: 'Assess whether the intake supports pricing, timing, assumptions, and delivery planning with enough clarity.'
    }
  ];
}

function buildResponseOutline(workstream, readiness) {
  return [
    {
      section: '1. Executive framing',
      text: `Introduce the opportunity as a ${workstream.toLowerCase()} case and explain the customer context.`
    },
    {
      section: '2. Customer needs and interpreted requirements',
      text: 'Summarize explicit requirements, inferred needs, and confirmed business drivers.'
    },
    {
      section: '3. Solution fit and process alignment',
      text: 'Explain likely standard fit, process relevance, and where additional clarification is still needed.'
    },
    {
      section: '4. Assumptions, risks, and gaps',
      text: 'Distinguish confirmed content from assumptions and unresolved gaps.'
    },
    {
      section: '5. Delivery approach and next steps',
      text: `Recommend the next proposal actions based on the readiness state: ${readiness.toLowerCase()}.`
    }
  ];
}

function mapRequirementToResponseSection(requirement) {
  const title = normalizeText(requirement.title);

  if (title.includes('intake') || title.includes('traceability')) {
    return '2. Customer needs and interpreted requirements';
  }

  if (title.includes('commercial')) {
    return '5. Delivery approach and next steps';
  }

  if (title.includes('process')) {
    return '3. Solution fit and process alignment';
  }

  if (title.includes('delivery')) {
    return '5. Delivery approach and next steps';
  }

  if (title.includes('solution')) {
    return '3. Solution fit and process alignment';
  }

  return '2. Customer needs and interpreted requirements';
}

function mapOwner(requirement) {
  const title = normalizeText(requirement.title);

  if (title.includes('commercial')) {
    return 'Bid lead';
  }

  if (title.includes('process') || title.includes('solution')) {
    return 'Solution architect';
  }

  if (title.includes('delivery')) {
    return 'Delivery lead';
  }

  return 'Proposal manager';
}

function mapCompliance(requirement) {
  if (requirement.status === 'Detected') {
    return 'Y';
  }

  if (requirement.status === 'Assumed' || requirement.status === 'Needs review') {
    return 'P';
  }

  return 'N';
}

function buildComplianceMatrix(requirements) {
  return requirements.map((requirement, index) => ({
    rowId: `CM-${String(index + 1).padStart(3, '0')}`,
    requirementId: requirement.id,
    requirementTitle: requirement.title,
    requirementText: requirement.text,
    source: requirement.source,
    priority: requirement.priority,
    status: requirement.status,
    proposalSection: mapRequirementToResponseSection(requirement),
    owner: mapOwner(requirement),
    compliance: mapCompliance(requirement),
    responseAction:
      requirement.status === 'Detected'
        ? 'Use detected intake signal as basis for first draft response.'
        : requirement.status === 'Assumed'
          ? 'Confirm assumption with stakeholders and draft provisional response.'
          : requirement.status === 'Needs review'
            ? 'Review with solution team before finalizing proposal structure.'
            : 'Treat as open gap and request clarification or supporting evidence.'
  }));
}

function buildFeed(files, workstream, readiness) {
  return [
    {
      title: 'Intake normalized',
      text: `${files.length} uploaded file${files.length === 1 ? '' : 's'} were converted into a normalized analysis payload.`
    },
    {
      title: 'Opportunity framing completed',
      text: `The intake was categorized as ${workstream.toLowerCase()} based on available source signals.`
    },
    {
      title: 'Readiness estimated',
      text: `The package was assessed as "${readiness}" for proposal progression.`
    },
    {
      title: 'Requirement and gap pass prepared',
      text: 'A first inferred requirement set and gap view were generated to support response planning.'
    },
    {
      title: 'Compliance matrix prepared',
      text: 'Each inferred requirement was mapped to a draft proposal section, owner, and compliance posture.'
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
        return json(400, {
          ok: false,
          message: 'No files were provided for analysis.'
        });
      }

      const safeFiles = files.map(file => ({
        name: String(file?.name || 'Unnamed file'),
        size: Number(file?.size || 0),
        type: String(file?.type || '')
      }));

      const workstream = detectWorkstream(safeFiles);
      const readiness = determineReadiness(safeFiles);
      const missingSignals = buildMissingSignals(safeFiles);
      const detectedSignals = inferDetectedSignals(safeFiles);

      const requirements = buildRequirements(safeFiles, workstream, missingSignals);
      const assumptions = buildAssumptions(safeFiles, missingSignals);
      const gaps = buildGaps(safeFiles, missingSignals);
      const evaluationFocus = buildEvaluationFocus(safeFiles, workstream);
      const responseOutline = buildResponseOutline(workstream, readiness);
      const complianceMatrix = buildComplianceMatrix(requirements);

      const response = {
        ok: true,
        timestamp: new Date().toISOString(),
        workflow: {
          pattern: 'Sequential analysis pipeline',
          stages: [
            'Intake normalization',
            'Signal detection',
            'Requirement inference',
            'Gap assessment',
            'Process mapping',
            'Compliance preparation',
            'Response shaping'
          ]
        },
        summary: {
          documentCount: safeFiles.length,
          workstream,
          readiness
        },
        executiveSummary: buildExecutiveSummary(safeFiles, workstream, readiness, missingSignals),
        scopeSignals: buildScopeSignals(safeFiles, workstream),
        riskFlags: buildRiskFlags(safeFiles, missingSignals),
        recommendedActions: buildRecommendedActions(safeFiles, readiness),
        catalogMatches: buildCatalogMatches(workstream),
        proposalPageSections: buildProposalPageSections(workstream, readiness),
        requirements,
        assumptions,
        gaps,
        evaluationFocus,
        responseOutline,
        complianceMatrix,
        intakeDiagnostics: {
          detectedSignals,
          missingSignals,
          fileTypes: unique(safeFiles.map(file => getExtension(file.name)).filter(Boolean)),
          totalBytes: safeFiles.reduce((sum, file) => sum + file.size, 0)
        },
        feed: buildFeed(safeFiles, workstream, readiness)
      };

      context.log('Analyze request processed successfully.');
      return json(200, response);
    } catch (error) {
      context.error('Analyze function failed', error);

      return json(500, {
        ok: false,
        message: 'The analysis function could not process the request.',
        error: error?.message || 'Unknown error'
      });
    }
  }
});
