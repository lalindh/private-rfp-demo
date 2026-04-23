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

function detectWorkstream(files) {
  const joined = files.map(file => normalizeText(file.name)).join(' ');

  if (joined.includes('finance') || joined.includes('invoice') || joined.includes('billing')) {
    return 'Finance and operations advisory';
  }

  if (joined.includes('crm') || joined.includes('sales') || joined.includes('customer')) {
    return 'Customer engagement transformation';
  }

  if (joined.includes('warehouse') || joined.includes('supply') || joined.includes('inventory')) {
    return 'Supply chain and operations';
  }

  if (joined.includes('hr') || joined.includes('talent') || joined.includes('people')) {
    return 'Human resources enablement';
  }

  return 'General proposal intake';
}

function determineReadiness(files) {
  if (!files.length) {
    return 'Awaiting input';
  }

  if (files.length >= 5) {
    return 'Draft response can be structured';
  }

  if (files.length >= 3) {
    return 'Clarification and shaping recommended';
  }

  return 'More source material recommended';
}

function buildExecutiveSummary(files, workstream, readiness, missingSignals) {
  const fileCount = files.length;
  const types = unique(files.map(file => getExtension(file.name)).filter(Boolean));

  const typeText = types.length
    ? `The uploaded package includes ${types.join(', ').toUpperCase()} material`
    : 'The uploaded package includes a limited set of source material';

  const gapText = missingSignals.length
    ? `The current intake still appears to be missing ${missingSignals.slice(0, 2).join(' and ')}.`
    : 'The current intake contains enough signal to begin a first response structure.';

  return `The uploaded material indicates a ${workstream.toLowerCase()} opportunity with ${fileCount} source document${fileCount === 1 ? '' : 's'}. ${typeText}, which suggests a mixed proposal workflow rather than a single-source request. Current readiness is assessed as "${readiness}", meaning the team can begin structured response planning while continuing to refine scope, assumptions, and delivery framing. ${gapText}`;
}

function buildScopeSignals(files, workstream) {
  const extensions = unique(files.map(file => getExtension(file.name)).filter(Boolean));
  const signals = [];

  signals.push({
    title: 'Primary workstream',
    text: `The uploaded material points to a likely workstream of ${workstream.toLowerCase()}.`
  });

  if (extensions.length) {
    signals.push({
      title: 'Document mix',
      text: `The intake includes ${extensions.join(', ').toUpperCase()} files, which suggests collaboration across commercial, functional, and supporting workstreams.`
    });
  }

  const hasSpreadsheet = extensions.includes('xlsx') || extensions.includes('xls');
  const hasPresentation = extensions.includes('pptx') || extensions.includes('ppt');
  const hasWord = extensions.includes('docx') || extensions.includes('doc');
  const hasPdf = extensions.includes('pdf');

  if (hasSpreadsheet) {
    signals.push({
      title: 'Structured input material',
      text: 'Spreadsheet-based material indicates tabular requirements, scoring models, price structures, or requirement matrices may be part of the opportunity.'
    });
  }

  if (hasPresentation) {
    signals.push({
      title: 'Stakeholder communication signal',
      text: 'Presentation material often suggests prior internal review, steering input, or storyline work that can support a tailored proposal narrative.'
    });
  }

  if (hasWord || hasPdf) {
    signals.push({
      title: 'Formal procurement signal',
      text: 'Document-heavy intake suggests formal requirement wording, governance language, or qualification criteria that should be reflected in the response structure.'
    });
  }

  signals.push({
    title: 'Review approach',
    text: 'The current submission appears suitable for first-pass intake, categorization, and response planning before detailed requirement mapping.'
  });

  return signals.slice(0, 5);
}

function buildRiskFlags(files, missingSignals) {
  const totalSize = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  const flags = [];

  if (files.length <= 2) {
    flags.push({
      title: 'Limited source coverage',
      text: 'Only a small amount of source material is available, which may reduce confidence in scope interpretation.'
    });
  }

  if (totalSize < 150000) {
    flags.push({
      title: 'Metadata-only assessment risk',
      text: 'The intake appears lightweight, which can indicate that important annexes, qualification criteria, or pricing attachments are still missing.'
    });
  }

  if (missingSignals.length) {
    flags.push({
      title: 'Missing proposal signals',
      text: `The current intake does not strongly indicate ${missingSignals.join(', ')}, so the first response structure should include explicit assumptions.`
    });
  }

  flags.push({
    title: 'Process mapping still provisional',
    text: 'Any process catalog alignment at this stage should be treated as directional until full requirement extraction and stakeholder review are completed.'
  });

  return flags.slice(0, 4);
}

function buildRecommendedActions(files, readiness) {
  const actions = [];

  actions.push({
    title: 'Create first response outline',
    text: `Use the current intake to create a structured proposal outline aligned to the readiness state: ${readiness.toLowerCase()}.`
  });

  actions.push({
    title: 'Perform requirement decomposition',
    text: 'Break the source material into explicit requirements, assumptions, dependencies, and qualification criteria before drafting detailed answers.'
  });

  actions.push({
    title: 'Prepare process catalog mapping',
    text: 'Map the identified business needs to Microsoft business process areas and business processes to distinguish standard fit from customer-specific extensions.'
  });

  actions.push({
    title: 'Shape customer-facing narrative',
    text: 'Prepare a customer-specific proposal page that turns the intake summary into a solution story, delivery framing, and recommended next steps.'
  });

  return actions;
}

function buildMissingSignals(files) {
  const joined = files.map(file => normalizeText(file.name)).join(' ');
  const missing = [];

  if (!joined.includes('scope')) {
    missing.push('scope detail');
  }

  if (!joined.includes('timeline') && !joined.includes('plan')) {
    missing.push('timeline guidance');
  }

  if (!joined.includes('pricing') && !joined.includes('cost')) {
    missing.push('commercial detail');
  }

  if (!joined.includes('requirement') && !joined.includes('matrix')) {
    missing.push('requirement structure');
  }

  return missing.slice(0, 3);
}

function buildCatalogMatches(workstream) {
  const defaultMatches = [
    {
      level: 'Level 2',
      type: 'Business process area',
      name: 'Create and manage sales',
      rationale: 'The intake indicates a commercial opportunity where customer demand, qualification, shaping, and response framing are central.'
    },
    {
      level: 'Level 3',
      type: 'Business process',
      name: 'Sell products to customers',
      rationale: 'The opportunity appears to require a structured proposal flow that supports qualification, offer shaping, and commercial response.'
    }
  ];

  if (workstream === 'Finance and operations advisory') {
    return [
      {
        level: 'Level 2',
        type: 'Business process area',
        name: 'Process vendor invoices',
        rationale: 'The source naming pattern suggests finance-oriented process work with likely emphasis on invoice, accounting, or operational controls.'
      },
      {
        level: 'Level 3',
        type: 'Business process',
        name: 'Record invoice details',
        rationale: 'This is a directional starting point for mapping detailed requirements to standard business process definitions.'
      }
    ];
  }

  if (workstream === 'Customer engagement transformation') {
    return [
      {
        level: 'Level 2',
        type: 'Business process area',
        name: 'Create and manage sales',
        rationale: 'The intake signals customer-facing, sales, or CRM-oriented requirements that fit this process area.'
      },
      {
        level: 'Level 3',
        type: 'Business process',
        name: 'Sell products to customers',
        rationale: 'This process offers a practical baseline for mapping customer engagement requirements to standard process patterns.'
      }
    ];
  }

  return defaultMatches;
}

function buildProposalPageSections(workstream, readiness) {
  return [
    {
      title: 'Customer context',
      text: `Introduce the customer situation, key drivers, and why ${workstream.toLowerCase()} appears to be the relevant framing for this opportunity.`
    },
    {
      title: 'Proposed solution direction',
      text: 'Describe the recommended Microsoft-oriented solution shape, including standard capabilities, likely accelerators, and expected delivery framing.'
    },
    {
      title: 'Process alignment',
      text: 'Show how the request maps to relevant business process areas, business processes, and where customer-specific variation is likely required.'
    },
    {
      title: 'Delivery approach',
      text: `Position the next delivery step around the current readiness state: ${readiness.toLowerCase()}, with phased review and clarification where needed.`
    },
    {
      title: 'Assumptions and next steps',
      text: 'List key assumptions, open questions, and the follow-up actions needed before creating a full customer response and proposal page.'
    }
  ];
}

function buildFeed(files, workstream, readiness) {
  return [
    {
      title: 'Intake registered',
      text: `${files.length} file${files.length === 1 ? '' : 's'} were received by the analysis endpoint and converted into a normalized intake payload.`
    },
    {
      title: 'Workstream interpreted',
      text: `The submission was categorized as ${workstream.toLowerCase()} based on naming patterns, file mix, and opportunity context.`
    },
    {
      title: 'Readiness estimated',
      text: `The current intake was assessed as "${readiness}", which helps determine whether the next step should focus on shaping, clarification, or draft creation.`
    },
    {
      title: 'Catalog mapping prepared',
      text: 'A provisional mapping was assembled to support later comparison against Microsoft Business Process Catalog process areas and business processes.'
    },
    {
      title: 'Proposal page basis created',
      text: 'The response also includes structured section suggestions that can later be used to generate a customer-specific proposal or case page.'
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

      const response = {
        ok: true,
        timestamp: new Date().toISOString(),
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
