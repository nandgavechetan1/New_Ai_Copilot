/**
 * AI Service — OpenAI-powered analysis with rule-based fallback.
 * Key design decisions:
 *  - All AI calls use json_object response_format so parsing never fails silently
 *  - max_tokens is generous (4096) so responses are never truncated mid-JSON
 *  - JSON.parse failures are caught, repaired with regex, or fall back gracefully
 *  - Scores are derived from REAL extracted data — no hardcoded "70" defaults
 *  - Prompts pass full structured context so the AI doesn't hallucinate
 */

const OpenAI = require('openai');

let openaiClient = null;

const getClient = () => {
  if (
    !openaiClient &&
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== 'demo-mode'
  ) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
};

// ─── Safe JSON parser ─────────────────────────────────────────────────────────
const safeParseJSON = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract the first complete JSON object from the string
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return null;
  }
};

// ─── Core AI caller ───────────────────────────────────────────────────────────
const callAI = async (systemPrompt, userPrompt, fallbackFn, maxTokens = 4096) => {
  const client = getClient();
  if (!client) {
    return fallbackFn();
  }

  try {
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = safeParseJSON(content);
    if (!parsed) {
      console.warn('AI returned unparseable JSON — using fallback');
      return fallbackFn();
    }
    return parsed;
  } catch (error) {
    console.error('AI call failed:', error.message);
    return fallbackFn();
  }
};

// ─── Resume analysis ──────────────────────────────────────────────────────────
const analyzeResume = async (resumeText) => {
  if (!resumeText || resumeText.trim().length < 30) {
    return extractSkillsFromText(resumeText || '');
  }

  // Trim to avoid exceeding context window while keeping all relevant content
  const trimmedText = resumeText.trim().slice(0, 12000);

  const systemPrompt = `You are an expert resume parser. Extract ONLY information that is explicitly present in the resume text. Never invent or assume skills, companies, or achievements not mentioned. Return valid JSON only.`;

  const userPrompt = `Parse this resume and extract ALL information that is explicitly stated. Be thorough — extract every skill, technology, tool, and framework mentioned.

Return JSON with this exact structure (use empty arrays/strings if not found, never null):
{
  "name": "candidate full name",
  "email": "email address",
  "phone": "phone number",
  "location": "city/country",
  "summary": "professional summary or objective if present",
  "programmingLanguages": ["every programming language explicitly mentioned"],
  "frameworks": ["every framework, library, runtime explicitly mentioned"],
  "databases": ["every database or data store mentioned"],
  "tools": ["every tool, IDE, platform, cloud service mentioned"],
  "softSkills": ["soft skills, methodologies like Agile/Scrum"],
  "projects": [
    {"name": "project name", "description": "what it does", "technologies": ["tech used"]}
  ],
  "internships": [
    {"company": "company name", "role": "job title", "duration": "dates/months", "description": "responsibilities"}
  ],
  "education": [
    {"institution": "university name", "degree": "degree type", "field": "major/field", "year": "graduation year", "gpa": "GPA if mentioned"}
  ],
  "certifications": ["every certification or course completion mentioned"],
  "allSkills": ["deduplicated flat list of ALL technical skills across all categories"]
}

RESUME TEXT:
${trimmedText}`;

  return callAI(systemPrompt, userPrompt, () => extractSkillsFromText(resumeText));
};

// ─── Rule-based skill extractor (fallback) ───────────────────────────────────
const extractSkillsFromText = (text) => {
  const t = text.toLowerCase();

  const programmingLanguages = ['java', 'python', 'javascript', 'typescript', 'c#', 'c++', 'golang', 'go', 'rust',
    'kotlin', 'swift', 'php', 'ruby', 'scala', 'r', 'matlab', 'dart', 'html', 'css', 'sql', 'bash', 'shell']
    .filter(l => t.includes(l));

  const frameworks = ['spring boot', 'spring mvc', 'spring', 'react', 'angular', 'vue', 'svelte',
    'node.js', 'nodejs', 'express', 'django', 'flask', 'fastapi', 'asp.net', '.net core', '.net',
    'laravel', 'hibernate', 'jpa', 'jquery', 'next.js', 'nuxt', 'nestjs', 'rails',
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
    'redux', 'tailwind', 'bootstrap', 'graphql', 'rest api', 'restful']
    .filter(f => t.includes(f));

  const databases = ['mysql', 'postgresql', 'postgres', 'mongodb', 'sqlite', 'oracle',
    'sql server', 'mssql', 'redis', 'cassandra', 'dynamodb', 'firebase',
    'elasticsearch', 'neo4j', 'h2', 'mariadb']
    .filter(d => t.includes(d));

  const tools = ['git', 'github', 'gitlab', 'bitbucket', 'docker', 'kubernetes', 'k8s',
    'jenkins', 'aws', 'azure', 'gcp', 'google cloud', 'linux', 'unix',
    'webpack', 'maven', 'gradle', 'ant', 'npm', 'yarn', 'pip',
    'postman', 'jira', 'confluence', 'figma', 'swagger', 'sonarqube',
    'vscode', 'intellij', 'eclipse', 'android studio', 'xcode',
    'terraform', 'ansible', 'ci/cd', 'github actions', 'travis ci', 'circle ci']
    .filter(tool => t.includes(tool));

  const softSkills = ['communication', 'teamwork', 'leadership', 'problem solving', 'critical thinking',
    'agile', 'scrum', 'kanban', 'project management', 'collaboration', 'time management']
    .filter(s => t.includes(s));

  const lines = text.split('\n').filter(l => l.trim());
  const name = lines[0]?.trim() || '';
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);

  const allSkills = [...new Set([...programmingLanguages, ...frameworks, ...databases, ...tools])];

  return {
    name,
    email: emailMatch?.[0] || '',
    phone: phoneMatch?.[0] || '',
    location: '',
    summary: '',
    programmingLanguages,
    frameworks,
    databases,
    tools,
    softSkills,
    projects: [],
    internships: [],
    education: [],
    certifications: [],
    allSkills,
  };
};

// ─── Career recommendation ────────────────────────────────────────────────────
const analyzeCareer = async (skills, targetRole, githubData) => {
  const studentSkillList = [...new Set([
    ...(skills.allSkills || []),
    ...(skills.programmingLanguages || []),
    ...(skills.frameworks || []),
    ...(skills.databases || []),
    ...(skills.tools || []),
  ])];

  const skillSummary = {
    programmingLanguages: skills.programmingLanguages || [],
    frameworks: skills.frameworks || [],
    databases: skills.databases || [],
    tools: skills.tools || [],
    projectCount: (skills.projects || []).length,
    hasInternship: (skills.internships || []).length > 0,
    hasCertifications: (skills.certifications || []).length > 0,
    totalSkills: studentSkillList.length,
    githubLanguages: githubData?.languages?.map(l => l.name) || [],
  };

  const systemPrompt = `You are an expert software engineering career advisor.

CRITICAL RULES:
1. The "strengths" field for each career MUST ONLY list skills from the STUDENT SKILL LIST.
   Never list a skill in "strengths" that the student does not have.
2. "skillGaps" lists important skills for the role that are NOT in the student list.
3. matchScore must honestly reflect how many required skills the student actually has.
4. Return valid JSON only.`;

  const userPrompt = `Recommend career paths for this student.

STUDENT SKILL LIST (the ONLY skills this student has):
${JSON.stringify(studentSkillList)}

STUDENT PROFILE CONTEXT:
${JSON.stringify(skillSummary, null, 2)}
Target role preference: ${targetRole || 'not specified'}

SCORING GUIDE (be realistic):
- 85-100: Student has most core AND nice-to-have skills for the role
- 70-84: Student has most core skills, some gaps in advanced areas
- 50-69: Student has some core skills but significant gaps
- 30-49: Foundational overlap but major gaps
- <30: Poor fit

Return JSON:
{
  "recommendations": [
    {
      "career": "exact career name",
      "matchScore": 72,
      "whyItMatches": "specific explanation referencing their actual skills",
      "strengths": ["only skills from STUDENT SKILL LIST that are relevant to this role"],
      "skillGaps": ["important role skills NOT in the student list"],
      "nextSteps": ["actionable learning step 1", "actionable learning step 2", "actionable learning step 3"]
    }
  ],
  "topCareer": "single best matched career name",
  "overallAssessment": "honest 2-sentence assessment"
}

Include 3-4 careers from this list ordered by match score:
Java Backend Developer, Full Stack Developer, Frontend Developer, Backend Developer, .NET Developer, Python Developer, Data Analyst, Data Scientist, AI/ML Engineer, DevOps Engineer, Cybersecurity Engineer, Cloud Engineer, Mobile Developer, Software Engineer`;

  const aiResult = await callAI(systemPrompt, userPrompt, () => ruleBasedCareerRecommendation(skills, targetRole));

  // ── Deterministic guard: strip hallucinated strengths from each recommendation ──
  const studentLower = studentSkillList.map(s => s.toLowerCase());
  const studentHas = (skill) => studentLower.some(s =>
    s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s)
  );

  if (Array.isArray(aiResult.recommendations)) {
    aiResult.recommendations = aiResult.recommendations.map(rec => ({
      ...rec,
      strengths: (rec.strengths || []).filter(studentHas),
      skillGaps: (rec.skillGaps || []).filter(s => !studentHas(s)),
    }));
  }

  return aiResult;
};

// ─── Rule-based career recommendation (fallback) ─────────────────────────────
const ruleBasedCareerRecommendation = (skills, targetRole) => {
  const allSkills = [...new Set([
    ...(skills.allSkills || []),
    ...(skills.programmingLanguages || []),
    ...(skills.frameworks || []),
    ...(skills.databases || []),
    ...(skills.tools || []),
  ])].map(s => s.toLowerCase());

  const careerDefs = [
    {
      career: 'Java Backend Developer',
      core: ['java', 'spring boot', 'spring', 'hibernate', 'maven', 'sql', 'rest api'],
      required: ['java'],
      missing: ['Spring Boot', 'Hibernate', 'REST API', 'Microservices'],
    },
    {
      career: 'Full Stack Developer',
      core: ['javascript', 'react', 'node.js', 'html', 'css', 'mongodb', 'express', 'rest api'],
      required: ['javascript', 'html'],
      missing: ['React', 'Node.js', 'MongoDB', 'REST API'],
    },
    {
      career: 'Frontend Developer',
      core: ['javascript', 'react', 'vue', 'angular', 'html', 'css', 'typescript'],
      required: ['html', 'css', 'javascript'],
      missing: ['React', 'TypeScript', 'Testing', 'Responsive Design'],
    },
    {
      career: 'Python Developer',
      core: ['python', 'django', 'flask', 'fastapi', 'sql'],
      required: ['python'],
      missing: ['Django/Flask', 'SQLAlchemy', 'REST API', 'Testing'],
    },
    {
      career: 'Data Scientist',
      core: ['python', 'pandas', 'numpy', 'scikit-learn', 'sql', 'statistics', 'machine learning'],
      required: ['python'],
      missing: ['Pandas', 'Scikit-learn', 'Machine Learning', 'Statistics', 'Data Visualization'],
    },
    {
      career: 'DevOps Engineer',
      core: ['docker', 'kubernetes', 'linux', 'bash', 'aws', 'jenkins', 'git'],
      required: ['docker', 'linux'],
      missing: ['Kubernetes', 'Terraform', 'CI/CD', 'Monitoring'],
    },
    {
      career: '.NET Developer',
      core: ['c#', '.net', 'asp.net', 'entity framework', 'sql server'],
      required: ['c#'],
      missing: ['ASP.NET Core', 'Entity Framework', 'Azure', 'Microservices'],
    },
  ];

  const scored = careerDefs.map(def => {
    const matched = def.core.filter(kw => allSkills.some(s => s.includes(kw) || kw.includes(s)));
    const hasRequired = def.required.some(r => allSkills.some(s => s.includes(r)));
    const ratio = matched.length / def.core.length;

    let matchScore = hasRequired
      ? Math.round(35 + ratio * 55)
      : Math.round(ratio * 35);

    if (targetRole && def.career.toLowerCase().includes(targetRole.toLowerCase().split(' ')[0])) {
      matchScore = Math.min(92, matchScore + 8);
    }

    const gaps = def.missing.filter(m =>
      !allSkills.some(s => s.includes(m.toLowerCase()) || m.toLowerCase().includes(s))
    );

    return {
      career: def.career,
      matchScore,
      whyItMatches: hasRequired
        ? `You have ${matched.length}/${def.core.length} key skills: ${matched.slice(0, 3).join(', ')}.`
        : `Limited overlap — only ${matched.length} matching skills found.`,
      strengths: matched.map(s => s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 5),
      skillGaps: gaps.slice(0, 5),
      nextSteps: gaps.slice(0, 3).map(s => `Learn ${s}`),
    };
  });

  const sorted = scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 4);
  return {
    recommendations: sorted,
    topCareer: sorted[0]?.career || 'Software Engineer',
    overallAssessment: sorted[0]
      ? `Your strongest match is ${sorted[0].career} at ${sorted[0].matchScore}%. ${sorted[0].matchScore >= 60 ? 'You have a solid foundation.' : 'Focus on building core technical skills.'}`
      : 'Expand your technical skill set to improve career matches.',
  };
};

// ─── Job readiness score ──────────────────────────────────────────────────────
const generateJobReadinessScore = async (profileData) => {
  const { skills, targetRole, hasResume, hasGithub, hasProjects, hasInternship, hasCertifications } = profileData;

  // Build a rich context for the AI — pass real counts, not just booleans
  const context = {
    targetRole,
    programmingLanguages: skills?.programmingLanguages || [],
    frameworks: skills?.frameworks || [],
    databases: skills?.databases || [],
    tools: skills?.tools || [],
    totalTechnicalSkills: (skills?.allSkills || []).length,
    projectCount: (skills?.projects || []).length,
    internshipCount: (skills?.internships || []).length,
    certificationCount: (skills?.certifications || []).length,
    hasGithub,
    hasResume,
    educationLevel: (skills?.education || [])[0]?.degree || 'Unknown',
    hasSummary: !!(skills?.summary?.trim()),
  };

  const systemPrompt = `You are a career readiness assessor. Score a student's job readiness based on their ACTUAL profile data. Scores must reflect reality — do not be overly optimistic. Return valid JSON only.`;

  const userPrompt = `Score this student's job readiness for the role: ${targetRole}

ACTUAL PROFILE DATA:
${JSON.stringify(context, null, 2)}

SCORING CRITERIA:
- technicalSkills: Based on relevance and breadth of their actual skills for ${targetRole}
- projects: Based on actual project count and complexity indicators
- github: 0 if no GitHub, 40-70 if has GitHub (base), higher with active projects
- resume: Based on completeness — has summary? skills? education? projects?
- certifications: 0 if none, 60-80 if has certifications
- interviewReadiness: Estimate based on technical depth visible in profile
- overall: Weighted average (technical 30%, projects 20%, github 15%, resume 15%, internship 10%, certs 5%, interview 5%)

Be HONEST and REALISTIC. A student with 3 skills and no projects should score around 20-35 overall.
A student with 8+ skills, 3 projects, and internship should score 60-75.

Return JSON:
{
  "overall": 52,
  "technicalSkills": 60,
  "projects": 40,
  "github": 0,
  "resume": 65,
  "interviewReadiness": 45,
  "certifications": 0,
  "explanation": "Specific explanation referencing their actual skills and gaps"
}`;

  const result = await callAI(systemPrompt, userPrompt, () => computeReadinessScore(profileData));

  // Validate all fields are numbers in range
  return validateReadinessScore(result, profileData);
};

const validateReadinessScore = (result, profileData) => {
  const clamp = (v, min = 0, max = 100) => {
    const n = parseInt(v);
    return isNaN(n) ? null : Math.max(min, Math.min(max, n));
  };

  const fields = ['overall', 'technicalSkills', 'projects', 'github', 'resume', 'interviewReadiness', 'certifications'];
  const valid = {};
  let anyNull = false;

  for (const f of fields) {
    valid[f] = clamp(result?.[f]);
    if (valid[f] === null) anyNull = true;
  }

  if (anyNull) {
    // AI returned garbage — compute from real data
    return computeReadinessScore(profileData);
  }

  valid.explanation = typeof result?.explanation === 'string' && result.explanation.length > 10
    ? result.explanation
    : buildExplanation(valid, profileData);

  return valid;
};

const computeReadinessScore = (profileData) => {
  const { skills, hasGithub, hasProjects, hasInternship, hasCertifications } = profileData;

  const langCount   = (skills?.programmingLanguages || []).length;
  const fwCount     = (skills?.frameworks || []).length;
  const dbCount     = (skills?.databases || []).length;
  const toolCount   = (skills?.tools || []).length;
  const projCount   = (skills?.projects || []).length;
  const internCount = (skills?.internships || []).length;
  const certCount   = (skills?.certifications || []).length;
  const hasSummary  = !!(skills?.summary?.trim());
  const hasEdu      = (skills?.education || []).length > 0;
  const hasEmail    = !!(skills?.email?.trim());

  // Technical skills: languages 8pt each (cap 40), frameworks 6pt (cap 30), DB 5pt (cap 15), tools 3pt (cap 15)
  const technicalSkills = Math.min(95,
    Math.min(40, langCount * 8) +
    Math.min(30, fwCount * 6) +
    Math.min(15, dbCount * 5) +
    Math.min(15, toolCount * 3)
  );

  // Projects: 0 → 20, 1 → 45, 2 → 60, 3 → 72, 4+ → 82
  const projectScores = [20, 45, 60, 72, 82, 88];
  const projects = hasProjects ? (projectScores[Math.min(projCount, 5)] || 88) : 20;

  // GitHub: present = base 50 + bonus for having projects
  const github = hasGithub ? Math.min(85, 50 + projCount * 5) : 0;

  // Resume quality: each section adds points
  const resumeParts = [
    hasSummary, hasEdu, hasEmail,
    langCount > 0, fwCount > 0,
    projCount > 0, certCount > 0,
  ];
  const resume = Math.round(30 + (resumeParts.filter(Boolean).length / resumeParts.length) * 65);

  // Certifications
  const certifications = certCount > 0 ? Math.min(85, 55 + certCount * 10) : 0;

  // Interview readiness: based on technical depth
  const interviewReadiness = Math.round(
    (technicalSkills * 0.5 + projects * 0.3 + (hasInternship ? 80 : 30) * 0.2)
  );

  // Internship factor
  const internshipFactor = internCount > 0 ? Math.min(90, 65 + internCount * 10) : 30;

  const overall = Math.round(
    technicalSkills  * 0.30 +
    projects         * 0.20 +
    github           * 0.15 +
    resume           * 0.15 +
    internshipFactor * 0.10 +
    certifications   * 0.05 +
    interviewReadiness * 0.05
  );

  const score = { overall, technicalSkills, projects, github, resume, certifications, interviewReadiness };
  score.explanation = buildExplanation(score, profileData);
  return score;
};

const buildExplanation = (score, profileData) => {
  const { skills, hasGithub, hasInternship } = profileData;
  const langCount = (skills?.programmingLanguages || []).length;
  const projCount = (skills?.projects || []).length;

  const parts = [
    `Your overall job readiness score is ${score.overall}/100.`,
    langCount > 0
      ? `You know ${langCount} programming language${langCount > 1 ? 's' : ''}: ${(skills.programmingLanguages || []).slice(0, 3).join(', ')}.`
      : 'No programming languages were detected on your resume.',
    projCount > 0
      ? `You have ${projCount} project${projCount > 1 ? 's' : ''} listed — good.`
      : 'Adding projects would significantly improve your score.',
    hasInternship
      ? 'Internship experience is a strong positive signal.'
      : 'No internship experience detected — this would boost your score.',
    hasGithub
      ? 'Your GitHub profile adds credibility.'
      : 'Connecting your GitHub profile would improve your score.',
  ];

  return parts.join(' ');
};

// ─── Skill gap analysis ───────────────────────────────────────────────────────
const generateSkillGap = async (studentSkills, targetRole) => {
  const studentSkillList = [...new Set([
    ...(studentSkills.programmingLanguages || []),
    ...(studentSkills.frameworks || []),
    ...(studentSkills.databases || []),
    ...(studentSkills.tools || []),
    ...(studentSkills.softSkills || []),
    ...(studentSkills.allSkills || []),
  ])];

  const systemPrompt = `You are a technical hiring expert performing a skill gap analysis.

CRITICAL RULES — you MUST follow these exactly:
1. strongSkills and developingSkills MUST ONLY contain skills from the STUDENT SKILL LIST below.
   Do NOT add any skill to strongSkills or developingSkills that is not in the student list.
2. missingSkills contains required skills for the role that are NOT in the student list.
3. Never invent, assume, or hallucinate skills the student has not listed.
4. Return ONLY valid JSON — no explanation text.`;

  const userPrompt = `Target Role: ${targetRole}

STUDENT SKILL LIST (these are the ONLY skills the student has — do not add any others):
${JSON.stringify(studentSkillList)}

Task:
- strongSkills: which skills from the STUDENT SKILL LIST above are core requirements for ${targetRole}?
- developingSkills: which skills from the STUDENT SKILL LIST above are useful but secondary for ${targetRole}?
- missingSkills: which important skills for ${targetRole} are NOT in the student list at all?
- requiredSkills: full list of skills a ${targetRole} needs
- priorityLearning: top 3 from missingSkills to learn first (highest career impact)

Return JSON:
{
  "strongSkills": [],
  "developingSkills": [],
  "missingSkills": [],
  "requiredSkills": [],
  "priorityLearning": []
}`;

  const aiResult = await callAI(systemPrompt, userPrompt, () => ruleBasedSkillGap(studentSkills, targetRole));

  // ── Deterministic guard: strip any "strong/developing" skill the student doesn't actually have ──
  // This prevents AI hallucinations from leaking through regardless of prompt compliance.
  const studentLower = studentSkillList.map(s => s.toLowerCase());
  const studentHas = (skill) => studentLower.some(s =>
    s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s)
  );

  const verifiedStrong = (aiResult.strongSkills || []).filter(studentHas);
  const verifiedDeveloping = (aiResult.developingSkills || []).filter(studentHas);

  // Any skill AI put in strong/developing but the student doesn't actually have → move to missingSkills
  const falseStrong = (aiResult.strongSkills || []).filter(s => !studentHas(s));
  const falseDeveloping = (aiResult.developingSkills || []).filter(s => !studentHas(s));
  const extraMissing = [...falseStrong, ...falseDeveloping].filter(
    s => !(aiResult.missingSkills || []).some(m => m.toLowerCase() === s.toLowerCase())
  );

  const verifiedMissing = [...(aiResult.missingSkills || []), ...extraMissing];

  return {
    strongSkills: verifiedStrong,
    developingSkills: verifiedDeveloping,
    missingSkills: verifiedMissing,
    requiredSkills: aiResult.requiredSkills || [],
    priorityLearning: (aiResult.priorityLearning || []).filter(s => !studentHas(s)).slice(0, 3),
  };
};

// ─── Rule-based skill gap (fallback) ─────────────────────────────────────────
const ruleBasedSkillGap = (studentSkills, targetRole) => {
  const roleRequirements = {
    'java backend developer': {
      core: ['Java', 'Spring Boot', 'Hibernate', 'REST API', 'Maven', 'SQL', 'OOP', 'Git'],
      nice: ['Docker', 'AWS', 'JUnit', 'Redis', 'Microservices', 'Kafka'],
    },
    'full stack developer': {
      core: ['JavaScript', 'React', 'Node.js', 'HTML', 'CSS', 'REST API', 'Git'],
      nice: ['TypeScript', 'MongoDB', 'Redux', 'Docker', 'Testing'],
    },
    'frontend developer': {
      core: ['JavaScript', 'HTML', 'CSS', 'React', 'Git', 'Responsive Design'],
      nice: ['TypeScript', 'Vue', 'Angular', 'Testing', 'Webpack', 'Accessibility'],
    },
    'python developer': {
      core: ['Python', 'REST API', 'SQL', 'Git'],
      nice: ['Django', 'Flask', 'FastAPI', 'SQLAlchemy', 'Testing', 'Docker'],
    },
    'data scientist': {
      core: ['Python', 'Pandas', 'NumPy', 'Scikit-learn', 'SQL', 'Statistics'],
      nice: ['TensorFlow', 'PyTorch', 'Data Visualization', 'Spark', 'Machine Learning'],
    },
    'ai/ml engineer': {
      core: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Machine Learning', 'Mathematics'],
      nice: ['Kubernetes', 'MLflow', 'Data Engineering', 'Cloud ML', 'NLP'],
    },
    'devops engineer': {
      core: ['Docker', 'Kubernetes', 'Linux', 'CI/CD', 'Git', 'Bash'],
      nice: ['AWS', 'Terraform', 'Ansible', 'Jenkins', 'Monitoring', 'Security'],
    },
    '.net developer': {
      core: ['C#', '.NET', 'ASP.NET Core', 'SQL Server', 'REST API', 'Git'],
      nice: ['Entity Framework', 'Azure', 'Docker', 'Unit Testing', 'Microservices'],
    },
    'cloud engineer': {
      core: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Linux', 'Terraform'],
      nice: ['Networking', 'Security', 'CI/CD', 'Monitoring', 'Python/Bash scripting'],
    },
    'software engineer': {
      core: ['Data Structures', 'Algorithms', 'OOP', 'Git', 'SQL', 'REST API'],
      nice: ['System Design', 'Testing', 'CI/CD', 'Docker', 'Cloud'],
    },
  };

  const roleKey = (targetRole || '').toLowerCase();
  const reqs = roleRequirements[roleKey] ||
    Object.entries(roleRequirements).find(([k]) => roleKey.includes(k.split(' ')[0]))?.[1] ||
    roleRequirements['software engineer'];

  const allRequired = [...reqs.core, ...reqs.nice];

  const studentList = [...new Set([
    ...(studentSkills.allSkills || []),
    ...(studentSkills.programmingLanguages || []),
    ...(studentSkills.frameworks || []),
    ...(studentSkills.databases || []),
    ...(studentSkills.tools || []),
  ])].map(s => s.toLowerCase());

  const has = (skill) => studentList.some(s =>
    s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s)
  );

  const strongSkills    = reqs.core.filter(has);
  const developingSkills = reqs.nice.filter(has);
  const missingSkills   = allRequired.filter(s => !has(s));

  return {
    strongSkills,
    developingSkills,
    missingSkills,
    requiredSkills: allRequired,
    priorityLearning: missingSkills.slice(0, 3),
  };
};

// ─── Learning roadmap ─────────────────────────────────────────────────────────
const generateRoadmap = async (skillGaps, targetRole, currentSkills) => {
  const systemPrompt = `You are a software engineering learning path expert. Create practical, ordered learning roadmaps. Return valid JSON only.`;

  const userPrompt = `Create a personalized learning roadmap.

Target Role: ${targetRole}
Current skills student HAS: ${JSON.stringify((currentSkills?.allSkills || []).slice(0, 20))}
Missing skills to address: ${JSON.stringify((skillGaps.missingSkills || []).slice(0, 10))}
Priority skills: ${JSON.stringify(skillGaps.priorityLearning || [])}

Create 4-6 stages ordered from foundational to advanced.
Each stage should address 1-2 of the missing skills.

Return JSON:
{
  "stages": [
    {
      "stageNumber": 1,
      "title": "Stage Title",
      "topic": "Primary topic",
      "duration": "1-2 weeks",
      "whyItMatters": "Why this matters for ${targetRole}",
      "resources": [
        {"title": "Resource name", "url": "https://...", "type": "course|documentation|tutorial", "provider": "Provider"}
      ],
      "practiceTask": "Specific hands-on task",
      "miniProject": "Mini project idea"
    }
  ],
  "totalDuration": "X-Y weeks",
  "overview": "Summary paragraph"
}

Include at least one IBM SkillsBuild resource where relevant (https://skillsbuild.org).`;

  return callAI(systemPrompt, userPrompt, () => ruleBasedRoadmap(skillGaps, targetRole), 5000);
};

// ─── Roadmap fallback ─────────────────────────────────────────────────────────
const ruleBasedRoadmap = (skillGaps, targetRole) => {
  const roleKey = (targetRole || '').toLowerCase();

  const templates = {
    java: [
      { stageNumber: 1, title: 'Advanced Java', topic: 'Core Java & OOP', duration: '1-2 weeks', whyItMatters: 'Deep Java knowledge underpins all Java backend work.', resources: [{ title: 'Oracle Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/', type: 'documentation', provider: 'Oracle' }, { title: 'IBM SkillsBuild: Java Basics', url: 'https://skillsbuild.org', type: 'course', provider: 'IBM SkillsBuild' }], practiceTask: 'Implement design patterns (Singleton, Factory, Observer)', miniProject: 'CLI bank account system' },
      { stageNumber: 2, title: 'Spring Boot', topic: 'Spring Boot & Dependency Injection', duration: '2-3 weeks', whyItMatters: 'Spring Boot is the industry standard Java backend framework.', resources: [{ title: 'Spring Boot Guides', url: 'https://spring.io/guides', type: 'tutorial', provider: 'Spring.io' }, { title: 'Baeldung Spring', url: 'https://www.baeldung.com/spring-boot', type: 'tutorial', provider: 'Baeldung' }], practiceTask: 'Build a REST API with CRUD operations', miniProject: 'Student management REST API' },
      { stageNumber: 3, title: 'Hibernate & JPA', topic: 'ORM & Database Persistence', duration: '1-2 weeks', whyItMatters: 'Hibernate is the standard ORM for Java database access.', resources: [{ title: 'Hibernate ORM Docs', url: 'https://hibernate.org/orm/documentation/', type: 'documentation', provider: 'Hibernate' }, { title: 'Spring Data JPA Tutorial', url: 'https://www.baeldung.com/the-persistence-layer-with-spring-data-jpa', type: 'tutorial', provider: 'Baeldung' }], practiceTask: 'Map entities, relationships, and run queries', miniProject: 'Add database to your Spring Boot API' },
      { stageNumber: 4, title: 'REST API Design', topic: 'API Best Practices & Security', duration: '1 week', whyItMatters: 'Well-designed APIs are a core backend developer skill.', resources: [{ title: 'REST API Design Guide', url: 'https://restfulapi.net/', type: 'guide', provider: 'RestfulAPI.net' }, { title: 'Spring Security', url: 'https://spring.io/projects/spring-security', type: 'documentation', provider: 'Spring' }], practiceTask: 'Add JWT authentication to your API', miniProject: 'Secure blog REST API' },
      { stageNumber: 5, title: 'Microservices', topic: 'Microservices with Spring Cloud', duration: '2-3 weeks', whyItMatters: 'Enterprise Java uses microservices for scalable architectures.', resources: [{ title: 'Spring Cloud Docs', url: 'https://spring.io/projects/spring-cloud', type: 'documentation', provider: 'Spring' }, { title: 'IBM SkillsBuild: Cloud Native Dev', url: 'https://skillsbuild.org', type: 'course', provider: 'IBM SkillsBuild' }], practiceTask: 'Split a monolith into two communicating services', miniProject: 'E-commerce order + inventory microservices' },
    ],
    fullstack: [
      { stageNumber: 1, title: 'JavaScript Deep Dive', topic: 'ES6+, async/await, closures', duration: '1-2 weeks', whyItMatters: 'Strong JS fundamentals are required for any JS full-stack role.', resources: [{ title: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', type: 'documentation', provider: 'MDN' }, { title: 'javascript.info', url: 'https://javascript.info', type: 'tutorial', provider: 'javascript.info' }], practiceTask: 'Implement promises, closures, and class inheritance', miniProject: 'Todo app with vanilla JS' },
      { stageNumber: 2, title: 'React', topic: 'React Hooks & Component Design', duration: '2-3 weeks', whyItMatters: 'React is used by the majority of modern frontend codebases.', resources: [{ title: 'React Official Docs', url: 'https://react.dev', type: 'documentation', provider: 'React' }, { title: 'IBM SkillsBuild: Front-End Dev', url: 'https://skillsbuild.org', type: 'course', provider: 'IBM SkillsBuild' }], practiceTask: 'Build components with useState, useEffect, and custom hooks', miniProject: 'Weather dashboard with real API' },
      { stageNumber: 3, title: 'Node.js & Express', topic: 'Backend with REST APIs', duration: '2 weeks', whyItMatters: 'Node.js enables JavaScript on the server for full-stack development.', resources: [{ title: 'Node.js Docs', url: 'https://nodejs.org/docs/', type: 'documentation', provider: 'Node.js' }, { title: 'Express.js Guide', url: 'https://expressjs.com/en/guide/routing.html', type: 'documentation', provider: 'Express' }], practiceTask: 'Build REST API with authentication', miniProject: 'Notes app API with JWT auth' },
      { stageNumber: 4, title: 'Databases', topic: 'MongoDB & SQL', duration: '1-2 weeks', whyItMatters: 'Full-stack developers need both SQL and NoSQL skills.', resources: [{ title: 'MongoDB University', url: 'https://learn.mongodb.com', type: 'course', provider: 'MongoDB' }, { title: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com', type: 'tutorial', provider: 'PostgreSQL' }], practiceTask: 'Design schemas and perform joins/aggregations', miniProject: 'Connect your Express API to MongoDB' },
    ],
    python: [
      { stageNumber: 1, title: 'Python Data Stack', topic: 'NumPy & Pandas', duration: '1-2 weeks', whyItMatters: 'NumPy and Pandas are the foundation of all Python data work.', resources: [{ title: 'Pandas Docs', url: 'https://pandas.pydata.org/docs/', type: 'documentation', provider: 'Pandas' }, { title: 'IBM SkillsBuild: Data Science', url: 'https://skillsbuild.org/adult-learners/explore-learn/data-science', type: 'course', provider: 'IBM SkillsBuild' }], practiceTask: 'Clean and explore a real dataset', miniProject: 'Analyze student performance CSV data' },
      { stageNumber: 2, title: 'Machine Learning', topic: 'Scikit-learn & ML Fundamentals', duration: '2-3 weeks', whyItMatters: 'Scikit-learn is the standard ML library for Python data roles.', resources: [{ title: 'Scikit-learn User Guide', url: 'https://scikit-learn.org/stable/user_guide.html', type: 'documentation', provider: 'Scikit-learn' }, { title: 'IBM SkillsBuild: AI Fundamentals', url: 'https://skillsbuild.org/adult-learners/explore-learn/artificial-intelligence', type: 'course', provider: 'IBM SkillsBuild' }], practiceTask: 'Train classification, regression, and clustering models', miniProject: 'House price prediction model' },
      { stageNumber: 3, title: 'Data Visualization', topic: 'Matplotlib & Seaborn', duration: '1 week', whyItMatters: 'Communicating insights visually is a core data science skill.', resources: [{ title: 'Matplotlib Tutorials', url: 'https://matplotlib.org/stable/tutorials/', type: 'documentation', provider: 'Matplotlib' }], practiceTask: 'Create charts: histograms, scatter plots, heatmaps', miniProject: 'EDA dashboard for a Kaggle dataset' },
    ],
    default: [
      { stageNumber: 1, title: 'Programming Fundamentals', topic: 'Data Structures & Algorithms', duration: '2-3 weeks', whyItMatters: 'DSA is tested in every technical interview.', resources: [{ title: 'LeetCode', url: 'https://leetcode.com', type: 'practice', provider: 'LeetCode' }, { title: 'IBM SkillsBuild: Software Engineering', url: 'https://skillsbuild.org', type: 'course', provider: 'IBM SkillsBuild' }], practiceTask: 'Solve 2 LeetCode problems daily (arrays, strings, trees)', miniProject: 'Implement common data structures from scratch' },
      { stageNumber: 2, title: 'Version Control', topic: 'Git & GitHub', duration: '3-5 days', whyItMatters: 'Git is mandatory at every software engineering job.', resources: [{ title: 'Git Documentation', url: 'https://git-scm.com/doc', type: 'documentation', provider: 'Git' }, { title: 'GitHub Learning Lab', url: 'https://skills.github.com', type: 'course', provider: 'GitHub' }], practiceTask: 'Create branches, merge PRs, resolve conflicts', miniProject: 'Push 3 personal projects to GitHub' },
      { stageNumber: 3, title: 'Databases & SQL', topic: 'SQL Fundamentals', duration: '1 week', whyItMatters: 'SQL is required for almost every software engineering role.', resources: [{ title: 'SQLZoo', url: 'https://sqlzoo.net', type: 'tutorial', provider: 'SQLZoo' }, { title: 'IBM SkillsBuild: Databases', url: 'https://skillsbuild.org', type: 'course', provider: 'IBM SkillsBuild' }], practiceTask: 'Write queries with JOINs, GROUP BY, subqueries', miniProject: 'Database schema for a library system' },
    ],
  };

  let stages;
  if (roleKey.includes('java')) stages = templates.java;
  else if (roleKey.includes('full stack') || roleKey.includes('frontend') || roleKey.includes('javascript')) stages = templates.fullstack;
  else if (roleKey.includes('python') || roleKey.includes('data') || roleKey.includes('ai') || roleKey.includes('ml')) stages = templates.python;
  else stages = templates.default;

  return {
    stages,
    totalDuration: stages.length <= 3 ? '4-6 weeks' : stages.length <= 4 ? '6-9 weeks' : '8-13 weeks',
    overview: `This roadmap guides you step-by-step toward becoming a ${targetRole}. Complete each stage before moving to the next.`,
  };
};

// ─── Interview question generation ───────────────────────────────────────────
const generateInterviewQuestion = async (jobRole, difficulty, interviewType, questionNumber, previousQuestions) => {
  const previousTexts = previousQuestions.map(q => q.questionText).filter(Boolean);

  const systemPrompt = `You are an experienced technical interviewer at a tech company. Ask realistic, role-specific interview questions. Return valid JSON only.`;

  const userPrompt = `Generate interview question #${questionNumber + 1}.

Role: ${jobRole}
Difficulty: ${difficulty}
Interview type: ${interviewType === 'mixed' ? (questionNumber % 2 === 0 ? 'technical' : 'behavioral') : interviewType}
Questions already asked (do NOT repeat): ${JSON.stringify(previousTexts)}

For ${difficulty} ${interviewType} interview for ${jobRole}, ask a question that:
- Is specific and realistic (not generic like "tell me about yourself" every time)
- Matches the ${difficulty} difficulty level
- Has not been asked yet

Return JSON:
{
  "questionText": "The full question",
  "questionType": "${interviewType === 'hr' ? 'behavioral' : 'technical'}",
  "expectedKeywords": ["key concept 1", "key concept 2"]
}`;

  return callAI(systemPrompt, userPrompt, () => ruleBasedInterviewQuestion(jobRole, difficulty, interviewType, questionNumber, previousQuestions));
};

// ─── Interview question fallback ──────────────────────────────────────────────
const ruleBasedInterviewQuestion = (jobRole, difficulty, interviewType, questionNumber, previousQuestions) => {
  const banks = {
    java: {
      beginner: ['What is the difference between an interface and an abstract class in Java?', 'Explain Java memory management and garbage collection.', 'What is the difference between ArrayList and LinkedList?', 'What are Java generics and why are they used?', 'Explain the four pillars of OOP with Java examples.'],
      intermediate: ['Explain Spring Boot auto-configuration and how it works.', 'What is dependency injection and how does Spring implement it?', 'Explain the difference between JPA and Hibernate.', 'How would you design a REST API for a library system?', 'What are Java streams and how do you use them?'],
      advanced: ['How would you design a microservices architecture for an e-commerce system?', 'Explain Java concurrency — thread safety and synchronization.', 'How do you diagnose and fix memory leaks in a Java application?', 'Explain event sourcing and CQRS patterns.', 'How would you implement a distributed cache?'],
    },
    javascript: {
      beginner: ['What is the difference between var, let, and const?', 'Explain the event loop in JavaScript.', 'What is the difference between == and ===?', 'Explain closures in JavaScript with an example.', 'What are promises and how do they work?'],
      intermediate: ['Explain React hooks and the rules of hooks.', 'How does the virtual DOM work in React?', 'What is Redux and when would you use it over Context?', 'Explain RESTful API design principles.', 'How do you handle authentication in a React application?'],
      advanced: ['How would you implement server-side rendering in Next.js?', 'Explain micro-frontend architecture and its trade-offs.', 'How would you optimize performance of a large React application?', 'What is WebSocket and when would you use it over HTTP?', 'Explain the SOLID principles with JavaScript examples.'],
    },
    behavioral: ['Tell me about a challenging technical problem you solved.', 'Describe a time you had to learn something new quickly.', 'How do you handle disagreements with teammates?', 'Tell me about your most impactful project.', 'How do you prioritize tasks when working on multiple things?', 'Describe a situation where you failed and what you learned.', 'Why are you interested in this role?', 'Where do you see yourself in 3-5 years?'],
    default: {
      beginner: ['Tell me about yourself and your technical background.', 'What programming languages are you most comfortable with?', 'How do you approach debugging a difficult problem?', 'What is version control and why is it important?', 'Describe a project you have worked on.'],
      intermediate: ['Explain the SOLID principles with examples.', 'How do you ensure code quality?', 'Describe your experience with databases.', 'How do you approach learning a new technology?', 'Explain REST vs GraphQL.'],
      advanced: ['How would you design a URL shortener system?', 'Explain CAP theorem and its implications.', 'How do you handle technical debt?', 'Describe a system design challenge you solved.', 'How do you approach code reviews?'],
    },
  };

  const roleKey = jobRole.toLowerCase().includes('java') ? 'java'
    : jobRole.toLowerCase().includes('javascript') || jobRole.toLowerCase().includes('react') || jobRole.toLowerCase().includes('full stack') || jobRole.toLowerCase().includes('frontend') ? 'javascript'
    : 'default';

  const diff = ['beginner', 'intermediate', 'advanced'].includes(difficulty) ? difficulty : 'intermediate';

  let pool;
  if (interviewType === 'hr' || (interviewType === 'mixed' && questionNumber % 2 !== 0)) {
    pool = banks.behavioral;
  } else {
    pool = banks[roleKey][diff] || banks.default[diff];
  }

  const asked = previousQuestions.map(q => q.questionText);
  const available = pool.filter(q => !asked.includes(q));
  const questionText = available[questionNumber % Math.max(available.length, 1)] || pool[0];

  return {
    questionText,
    questionType: (interviewType === 'hr' || (interviewType === 'mixed' && questionNumber % 2 !== 0)) ? 'behavioral' : 'technical',
    expectedKeywords: [],
  };
};

// ─── Answer evaluation ────────────────────────────────────────────────────────
const evaluateAnswer = async (question, answer, jobRole, difficulty) => {
  const systemPrompt = `You are an experienced interviewer providing specific, constructive feedback. Be honest — if the answer is weak, say so clearly. Return valid JSON only.`;

  const userPrompt = `Evaluate this interview answer:

Role: ${jobRole}
Difficulty: ${difficulty}
Question: "${question.questionText}"
Candidate's Answer: "${answer.trim()}"

Score the answer on these criteria:
- Technical accuracy (was the answer correct?)
- Depth and specificity (did they explain HOW/WHY, not just what?)
- Use of examples or concrete details
- Completeness (did they address the full question?)

SCORING (be realistic):
- 85-100: Excellent, thorough, accurate with examples
- 70-84: Good, mostly correct with some depth
- 55-69: Adequate, correct basics but lacks depth or examples
- 40-54: Partial, some correct points but significant gaps
- 20-39: Weak, vague or mostly incorrect
- 0-19: No meaningful answer

Return JSON:
{
  "score": 65,
  "whatWasGood": "specific thing(s) the candidate did well",
  "whatCouldBeImproved": "specific, actionable improvement advice",
  "modelAnswer": "a concise model answer covering the key points",
  "keywords": ["key terms the candidate used correctly"]
}`;

  const result = await callAI(systemPrompt, userPrompt, () => ruleBasedEvaluation(question, answer));

  // Validate score is a real number
  if (typeof result?.score !== 'number' || result.score < 0 || result.score > 100) {
    return ruleBasedEvaluation(question, answer);
  }
  return result;
};

// ─── Answer evaluation fallback ───────────────────────────────────────────────
const ruleBasedEvaluation = (question, answer) => {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const technicalTerms = ['implement', 'design', 'architecture', 'pattern', 'algorithm', 'complexity',
    'optimize', 'scalable', 'interface', 'class', 'method', 'function', 'database', 'api',
    'service', 'component', 'framework', 'library', 'performance', 'cache', 'async', 'thread'];
  const usedTerms = technicalTerms.filter(t => answer.toLowerCase().includes(t));
  const hasExample = answer.toLowerCase().includes('example') || answer.toLowerCase().includes('for instance') || answer.toLowerCase().includes('such as');

  let score = 25; // base
  if (wordCount >= 30) score += 15;
  if (wordCount >= 80) score += 15;
  if (wordCount >= 150) score += 10;
  score += Math.min(20, usedTerms.length * 4);
  if (hasExample) score += 10;
  score = Math.min(82, score);

  return {
    score,
    whatWasGood: wordCount >= 50
      ? `You provided a ${wordCount >= 100 ? 'detailed' : 'reasonable'} answer.${hasExample ? ' Good use of examples.' : ''}`
      : 'You attempted to answer the question.',
    whatCouldBeImproved: wordCount < 80
      ? 'Provide more detail. Explain the underlying concepts, the trade-offs, and give a concrete example from your experience.'
      : 'Consider deepening your answer with performance implications, edge cases, or real-world examples.',
    modelAnswer: 'A strong answer explains the concept clearly, covers trade-offs, and gives a concrete implementation example.',
    keywords: usedTerms.slice(0, 5),
  };
};

// ─── Final interview results ───────────────────────────────────────────────────
const generateInterviewResults = async (interview) => {
  const answeredQs = interview.questions.filter(q => q.answer && q.feedback?.score != null);

  if (answeredQs.length === 0) {
    return { overallScore: 0, technicalKnowledge: 0, communication: 0, problemSolving: 0, answerQuality: 0, confidence: 0, areasToImprove: ['Answer more questions'], recommendedTopics: [], summary: 'No answers recorded.' };
  }

  const scores = answeredQs.map(q => q.feedback.score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  const systemPrompt = `You are an interviewer writing a post-interview assessment. Be honest and specific. Return valid JSON only.`;

  const userPrompt = `Write a final interview assessment.

Role: ${interview.jobRole}
Difficulty: ${interview.difficulty}
Questions answered: ${answeredQs.length}
Individual scores: ${JSON.stringify(answeredQs.map(q => ({ q: q.questionText?.slice(0, 60), score: q.feedback?.score, feedback: q.feedback?.whatCouldBeImproved?.slice(0, 80) })))}
Average score: ${avgScore}

Return JSON:
{
  "overallScore": ${avgScore},
  "technicalKnowledge": <derive from answer quality>,
  "communication": <based on answer clarity and structure>,
  "problemSolving": <based on approach shown>,
  "answerQuality": <based on depth and accuracy>,
  "confidence": <estimate based on detail and completeness>,
  "areasToImprove": ["specific area 1", "specific area 2"],
  "recommendedTopics": ["topic to study 1", "topic to study 2"],
  "summary": "2-3 sentence honest assessment"
}`;

  const result = await callAI(systemPrompt, userPrompt, () => ({
    overallScore: avgScore,
    technicalKnowledge: Math.round(avgScore * 0.95),
    communication: Math.round(avgScore * 0.85),
    problemSolving: Math.round(avgScore * 0.90),
    answerQuality: Math.round(avgScore * 0.88),
    confidence: Math.round(avgScore * 0.80),
    areasToImprove: ['Add specific examples to answers', 'Explain trade-offs and edge cases', 'Practice STAR format for behavioral questions'],
    recommendedTopics: ['System design', 'Data structures & algorithms'],
    summary: `You scored ${avgScore}/100 in this ${interview.difficulty} ${interview.interviewType} interview. ${avgScore >= 70 ? 'Good performance overall.' : avgScore >= 50 ? 'Solid foundation — practice deeper explanations.' : 'Focus on strengthening core concepts before your next interview.'}`,
  }));

  // Ensure overallScore is the real average, not whatever AI says
  result.overallScore = avgScore;
  return result;
};

// ─── GitHub profile analysis ───────────────────────────────────────────────────
const analyzeGithubProfile = async (repos, profile) => {
  const repoSummary = repos.slice(0, 20).map(r => ({
    name: r.name,
    description: r.description || null,
    language: r.language || null,
    stars: r.stargazers_count || 0,
    updatedAt: r.updated_at,
    topics: r.topics || [],
    fork: r.fork,
  }));

  const systemPrompt = `You are a software portfolio analyst. Analyze GitHub profiles accurately. Return valid JSON only.`;

  const userPrompt = `Analyze this GitHub profile:

Username: ${profile.login}
Bio: ${profile.bio || 'None'}
Public repos: ${profile.public_repos}
Followers: ${profile.followers}
Account created: ${profile.created_at}

Repositories:
${JSON.stringify(repoSummary, null, 2)}

Return JSON:
{
  "languages": [{"name": "JavaScript", "count": 5, "percentage": 45}],
  "frameworks": ["React", "Express"],
  "totalProjects": ${repos.length},
  "activeProjects": <count of repos updated in last 6 months>,
  "projectDiversity": <number of different languages used>,
  "activityScore": <0-100 based on recency and frequency>,
  "overallScore": <0-100 holistic score>,
  "topLanguage": "most used language",
  "projectExperience": "Excellent|Good|Some|Limited",
  "strengths": ["specific strength 1", "specific strength 2"],
  "areasToImprove": ["specific improvement 1", "specific improvement 2"],
  "summary": "2-3 sentence profile summary"
}`;

  return callAI(systemPrompt, userPrompt, () => ruleBasedGithubAnalysis(repos, profile));
};

// ─── GitHub analysis fallback ─────────────────────────────────────────────────
const ruleBasedGithubAnalysis = (repos, profile) => {
  const langCounts = {};
  const ownRepos = repos.filter(r => !r.fork);

  ownRepos.forEach(r => {
    if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
  });

  const total = Object.values(langCounts).reduce((s, c) => s + c, 0) || 1;
  const languages = Object.entries(langCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / total) * 100) }));

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const activeProjects = repos.filter(r => new Date(r.updated_at) > sixMonthsAgo).length;

  const totalProjects = repos.length;
  const hasReadme = ownRepos.some(r => r.description);
  const hasTopics = ownRepos.some(r => r.topics?.length > 0);
  const topLanguage = languages[0]?.name || 'Unknown';

  const activityScore = Math.min(100, 20 + activeProjects * 6 + totalProjects * 2);
  const overallScore = Math.min(95, Math.round(
    activityScore * 0.4 +
    Math.min(40, totalProjects * 3) +
    (hasReadme ? 10 : 0) +
    (hasTopics ? 5 : 0) +
    Math.min(15, languages.length * 3)
  ));

  const exp = totalProjects >= 15 ? 'Excellent' : totalProjects >= 8 ? 'Good' : totalProjects >= 3 ? 'Some' : 'Limited';

  return {
    languages: languages.slice(0, 8),
    frameworks: [],
    totalProjects,
    activeProjects,
    projectDiversity: languages.length,
    activityScore,
    overallScore,
    topLanguage,
    projectExperience: exp,
    strengths: [
      languages.length > 2 ? `Works in ${languages.length} languages` : `Focused ${topLanguage} developer`,
      activeProjects > 3 ? 'Recently active profile' : totalProjects > 5 ? 'Good number of projects' : 'Has GitHub projects',
      hasReadme ? 'Writes project descriptions' : null,
    ].filter(Boolean),
    areasToImprove: [
      'Add README.md to every repository',
      !hasTopics ? 'Add topic tags to repositories for discoverability' : null,
      activeProjects < 3 ? 'Increase activity with regular commits' : 'Contribute to open-source projects',
      'Add unit tests to your projects',
    ].filter(Boolean),
    summary: `${profile.login} has ${totalProjects} public repositories. Primary language: ${topLanguage}. ${activeProjects > 3 ? 'The profile shows recent activity.' : 'Profile activity could be improved.'}`,
  };
};

// ─── Resume improvement suggestions ──────────────────────────────────────────
const generateResumeImprovement = async (resumeData, targetRole) => {
  const systemPrompt = `You are an expert resume coach for software engineering students. Only suggest improvements to information that EXISTS in the resume. Never invent new skills, projects, or experience. Return valid JSON only.`;

  const hasData = resumeData && Object.keys(resumeData).length > 0;

  if (!hasData) {
    return {
      suggestions: [],
      missingKeywords: [],
      formattingIssues: ['Upload and analyze your resume first to get improvement suggestions.'],
      overallTips: ['Upload your PDF resume to receive personalized improvement suggestions.'],
      overallScore: 0,
    };
  }

  const context = {
    targetRole: targetRole || 'Software Engineer',
    hasSummary: !!(resumeData.summary?.trim()),
    summaryText: resumeData.summary?.slice(0, 200) || '',
    skills: {
      languages: resumeData.programmingLanguages || [],
      frameworks: resumeData.frameworks || [],
      databases: resumeData.databases || [],
      tools: resumeData.tools || [],
    },
    projectCount: (resumeData.projects || []).length,
    projectNames: (resumeData.projects || []).map(p => p.name),
    internshipCount: (resumeData.internships || []).length,
    certificationCount: (resumeData.certifications || []).length,
    educationCount: (resumeData.education || []).length,
    hasEmail: !!(resumeData.email?.trim()),
    hasPhone: !!(resumeData.phone?.trim()),
  };

  // Compute resume score from real data
  const overallScore = computeResumeScore(context);

  const userPrompt = `Suggest improvements for this resume targeting: ${targetRole || 'Software Engineer'}

ACTUAL RESUME DATA (only improve what exists):
${JSON.stringify(context, null, 2)}

RULES:
- Only suggest improvements to sections that exist
- Never fabricate skills, projects, companies, or certifications
- Suggest stronger wording, better structure, missing keywords the student should ADD if they have them
- Identify ATS keywords missing for ${targetRole}

Return JSON:
{
  "suggestions": [
    {
      "section": "section name",
      "original": "current weak content",
      "improved": "stronger version (only improving presentation, not adding fake info)",
      "reason": "why this change helps"
    }
  ],
  "missingKeywords": ["keyword missing for ${targetRole} that student should add if they have the skill"],
  "formattingIssues": ["specific formatting/structure issue"],
  "overallTips": ["actionable tip 1", "actionable tip 2"],
  "overallScore": ${overallScore}
}
Limit to 3-4 most impactful suggestions.`;

  const result = await callAI(systemPrompt, userPrompt, () => ruleBasedResumeImprovement(resumeData, targetRole));

  // Always use computed score — never trust AI score here
  result.overallScore = overallScore;
  return result;
};

const computeResumeScore = (context) => {
  let score = 0;
  if (context.hasEmail) score += 10;
  if (context.hasPhone) score += 5;
  if (context.hasSummary) score += 15;
  if (context.educationCount > 0) score += 15;
  score += Math.min(20, context.skills.languages.length * 4);
  score += Math.min(15, context.skills.frameworks.length * 3);
  score += Math.min(10, context.skills.databases.length * 3);
  score += Math.min(10, context.projectCount * 4);
  score += Math.min(5, context.internshipCount * 5);
  score += Math.min(5, context.certificationCount * 3);
  return Math.min(98, score);
};

const ruleBasedResumeImprovement = (resumeData, targetRole) => {
  const suggestions = [];

  if (!resumeData.summary || resumeData.summary.trim().length < 30) {
    suggestions.push({
      section: 'Professional Summary',
      original: resumeData.summary || '(missing)',
      improved: `Results-driven ${targetRole || 'software engineering'} student with hands-on experience in ${(resumeData.programmingLanguages || []).slice(0, 3).join(', ') || 'multiple technologies'}. Passionate about building scalable, clean code solutions.`,
      reason: 'A strong summary at the top grabs recruiter attention and sets the context for the rest of your resume.',
    });
  }

  const roleKeywords = {
    'java': ['Spring Boot', 'Hibernate', 'REST API', 'Maven', 'JUnit', 'Microservices'],
    'javascript': ['React', 'Node.js', 'TypeScript', 'REST API', 'Testing'],
    'python': ['Django', 'Flask', 'Pandas', 'REST API', 'Testing'],
    'devops': ['Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'AWS'],
    '.net': ['ASP.NET Core', 'Entity Framework', 'Azure', 'C#'],
  };

  const roleKey = Object.keys(roleKeywords).find(k => (targetRole || '').toLowerCase().includes(k)) || 'javascript';
  const studentFlat = [
    ...(resumeData.programmingLanguages || []),
    ...(resumeData.frameworks || []),
    ...(resumeData.tools || []),
  ].map(s => s.toLowerCase());

  const missingKeywords = roleKeywords[roleKey].filter(kw =>
    !studentFlat.some(s => s.includes(kw.toLowerCase()))
  );

  const context = {
    hasSummary: !!(resumeData.summary?.trim()),
    hasEmail: !!(resumeData.email?.trim()),
    hasPhone: !!(resumeData.phone?.trim()),
    projectCount: (resumeData.projects || []).length,
    internshipCount: (resumeData.internships || []).length,
    certificationCount: (resumeData.certifications || []).length,
    educationCount: (resumeData.education || []).length,
    skills: {
      languages: resumeData.programmingLanguages || [],
      frameworks: resumeData.frameworks || [],
      databases: resumeData.databases || [],
      tools: resumeData.tools || [],
    },
  };

  return {
    suggestions,
    missingKeywords,
    formattingIssues: [
      'Start every bullet point with an action verb (Developed, Built, Designed, Implemented)',
      'Add measurable achievements where possible (e.g., "Reduced load time by 40%")',
      'Keep your resume to one page for entry-level positions',
    ],
    overallTips: [
      missingKeywords.length > 0 ? `Add these keywords to improve ATS ranking: ${missingKeywords.slice(0, 3).join(', ')}` : 'Your keyword coverage looks good for this role.',
      'Add your GitHub profile URL to contact information',
      'Tailor the skills section to match the specific job description',
    ],
    overallScore: computeResumeScore(context),
  };
};

module.exports = {
  analyzeResume,
  analyzeCareer,
  generateJobReadinessScore,
  generateSkillGap,
  generateRoadmap,
  generateInterviewQuestion,
  evaluateAnswer,
  generateInterviewResults,
  analyzeGithubProfile,
  generateResumeImprovement,
};
