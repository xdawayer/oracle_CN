# Prompt System Specification

## ADDED Requirements

### Requirement: Modular Prompt Architecture
The system SHALL organize prompts into a modular directory structure with three layers: core (infrastructure), templates (by module), and cultural (localization).

#### Scenario: Core layer provides type definitions
- **WHEN** a developer imports from `prompts/core`
- **THEN** PromptMeta, PromptContext, and PromptTemplate types SHALL be available

#### Scenario: Templates organized by functional module
- **WHEN** accessing prompts for a specific feature
- **THEN** prompts SHALL be located in `prompts/templates/{module}/` where module is one of: natal, daily, synastry, cbt, ask, synthetica, kline, wiki

#### Scenario: Cultural layer provides localization
- **WHEN** building a prompt
- **THEN** cultural configuration (persona, tone, metaphors) SHALL be injectable via the builder

---

### Requirement: Prompt Registry
The system SHALL provide a singleton registry for registering, retrieving, and managing prompts.

#### Scenario: Register a prompt template
- **WHEN** calling `registry.register(template)`
- **THEN** the template SHALL be stored and retrievable by its `meta.id`

#### Scenario: Retrieve prompt by ID
- **WHEN** calling `registry.get(id)`
- **THEN** the registered PromptTemplate SHALL be returned, or undefined if not found

#### Scenario: Build cache key
- **WHEN** calling `registry.buildCacheKey(promptId, inputHash)`
- **THEN** a cache key in format `ai:{promptId}:v{version}:{inputHash}` SHALL be returned

#### Scenario: List prompts by module
- **WHEN** calling `registry.listByModule('natal')`
- **THEN** all prompts with `meta.module === 'natal'` SHALL be returned

#### Scenario: List prompts by priority
- **WHEN** calling `registry.listByPriority('P0')`
- **THEN** all prompts with `meta.priority === 'P0'` SHALL be returned

---

### Requirement: Prompt Builder
The system SHALL provide a builder function that constructs system and user prompts from templates with cultural enrichment.

#### Scenario: Build prompt with cultural context
- **WHEN** calling `buildPrompt(promptId, context, inputHash)`
- **THEN** the result SHALL include enriched system prompt, user prompt, and cache key

#### Scenario: Handle missing prompt
- **WHEN** calling `buildPrompt` with non-existent promptId
- **THEN** null SHALL be returned and a warning logged

---

### Requirement: Chinese-Only Output
The system SHALL output all AI responses in Simplified Chinese only, with no English version support.

#### Scenario: Prompt output language
- **WHEN** an AI response is generated
- **THEN** the output SHALL be entirely in Simplified Chinese

#### Scenario: No dual-language switching
- **WHEN** configuring prompt templates
- **THEN** no language selection or switching logic SHALL be present

---

### Requirement: Cultural Persona System
The system SHALL provide three predefined personas for different interaction contexts.

#### Scenario: Default persona for general interactions
- **WHEN** using `DEFAULT_PERSONA`
- **THEN** the AI SHALL behave as a knowledgeable friend discussing astrology, not a fortune teller

#### Scenario: Healing persona for sensitive topics
- **WHEN** using `HEALING_PERSONA` (CBT, emotional support)
- **THEN** the AI SHALL prioritize empathy and validation before analysis

#### Scenario: Analytical persona for detailed readings
- **WHEN** using `ANALYTICAL_PERSONA`
- **THEN** the AI SHALL provide deep psychological analysis with accessible language

---

### Requirement: Tone Guidelines
The system SHALL enforce consistent tone across all prompts following localized guidelines.

#### Scenario: Avoid fortune-telling language
- **WHEN** generating any response
- **THEN** phrases like "destined", "fated", "cannot escape" SHALL NOT appear

#### Scenario: Use probabilistic language
- **WHEN** describing astrological influences
- **THEN** phrases like "tends to", "may", "often" SHALL be used instead of deterministic statements

#### Scenario: Provide actionable advice
- **WHEN** offering suggestions
- **THEN** advice SHALL be specific and executable (e.g., "tonight try 5 rounds of 4-7-8 breathing")

---

### Requirement: Metaphor Library
The system SHALL provide localized metaphors for planets, aspects, and houses using Chinese cultural references.

#### Scenario: Planet metaphors
- **WHEN** referencing a planet (e.g., Sun, Moon, Mercury)
- **THEN** a culturally appropriate Chinese metaphor SHALL be available (e.g., Sun as "your backbone")

#### Scenario: Aspect metaphors
- **WHEN** explaining astrological aspects
- **THEN** relatable Chinese metaphors SHALL be used (e.g., opposition as "seesaw")

#### Scenario: House metaphors
- **WHEN** describing houses
- **THEN** modern Chinese life context SHALL be used (e.g., 6th house as "your work desk and health")

---

### Requirement: Scenario Library
The system SHALL provide a library of relatable scenarios for Chinese young adults (18-35).

#### Scenario: Relationship scenarios
- **WHEN** discussing relationships
- **THEN** scenarios SHALL include situations like 996 work pressure, family marriage pressure, dating app challenges

#### Scenario: Emotional scenarios
- **WHEN** addressing emotions
- **THEN** scenarios SHALL include Sunday night work anxiety, waiting for interview results, month-end account balance worry

---

### Requirement: Psychology Concept Localization
The system SHALL translate Western psychology concepts into accessible Chinese expressions.

#### Scenario: Jungian concepts
- **WHEN** referencing Shadow, Persona, Anima/Animus, Individuation
- **THEN** localized explanations with Chinese context SHALL be provided

#### Scenario: Attachment theory
- **WHEN** discussing attachment styles
- **THEN** descriptions SHALL use relatable Chinese scenarios

#### Scenario: CBT cognitive distortions
- **WHEN** identifying thinking patterns
- **THEN** examples SHALL use Chinese daily life situations (e.g., boss calls you to office → catastrophizing)

---

### Requirement: Prompt Priority Classification
The system SHALL classify all prompts into three priority levels: P0 (core), P1 (important), P2 (enhanced).

#### Scenario: P0 core prompts
- **WHEN** the system requires essential functionality
- **THEN** 12 P0 prompts SHALL be available: daily-forecast, daily-detail, natal-overview, natal-core-themes, natal-dimension, detail-big3-natal, synastry-overview, synastry-highlights, cbt-analysis, ask-answer, synthetica-analysis, wiki-home

#### Scenario: P1 important prompts
- **WHEN** complete user experience is needed
- **THEN** 16 P1 prompts SHALL be available for detailed analysis

#### Scenario: P2 enhanced prompts
- **WHEN** advanced features are enabled
- **THEN** 10 P2 prompts SHALL be available for specialized analysis

---

### Requirement: JSON Output Format
All prompts SHALL produce structured JSON output following consistent conventions.

#### Scenario: Standard field naming
- **WHEN** outputting titles, use `title`
- **WHEN** outputting scores, use `score` (0-100 scale)
- **WHEN** outputting descriptions, use `description` or `summary`
- **WHEN** outputting suggestions, use `advice` or `tips`

#### Scenario: No markdown in JSON content
- **WHEN** returning JSON response
- **THEN** content fields SHALL NOT contain markdown formatting unless explicitly specified

---

### Requirement: Cache Compatibility
The system SHALL maintain backward compatibility with existing cache key format.

#### Scenario: Cache key format
- **WHEN** generating cache keys
- **THEN** format SHALL be `ai:{promptId}:v{version}:{inputHash}`

#### Scenario: Version-based cache invalidation
- **WHEN** prompt version changes
- **THEN** cache key SHALL change, triggering cache refresh
