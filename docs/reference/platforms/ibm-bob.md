# IBM Bob Platform Reference

IBM Bob is IBM's AI-powered fork of Visual Studio Code, featuring custom modes and custom instructions for AI personalization. This document provides technical details about BMAD's integration with IBM Bob.

## Platform Overview

**Category**: IDE (VS Code Fork)  
**Status**: Preferred Platform  
**Configuration Directory**: `.bob/`  
**Modes File**: `custom_modes.yaml`  
**Instructions Directory**: `rules/`

## Architecture

### Integration Pattern

IBM Bob follows BMAD's **Category 1** integration pattern for VS Code forks:

1. **IDE Handler**: `tools/cli/installers/lib/ide/ibm-bob.js`
2. **Auto-Discovery**: Automatically detected by `IdeManager`
3. **Mode Generation**: BMAD agents → Bob custom modes
4. **Instructions Generation**: Agent prompts → Custom instructions

### File Structure

```
project-root/
├── .bob/                           # Bob configuration directory
│   ├── custom_modes.yaml           # All BMAD modes (YAML format)
│   ├── rules/                      # General custom instructions
│   │   ├── 01-bmad-core.md        # Core BMAD principles
│   │   └── 02-workflow-guidance.md # Workflow instructions
│   ├── rules-bmad-master/         # BMad Master mode instructions
│   │   ├── 01-activation.md
│   │   ├── 02-menu-commands.md
│   │   └── 03-prompts.md
│   ├── rules-architect/           # Architect mode instructions
│   ├── rules-developer/           # Developer mode instructions
│   └── rules-test-engineer/       # Test Engineer mode instructions
└── _bmad/                         # BMAD installation
    ├── core/
    └── {modules}/
```

## Custom Modes

### Mode Structure

Each BMAD agent is converted to a Bob custom mode with the following structure:

```yaml
customModes:
  - slug: string              # Unique identifier (kebab-case)
    name: string              # Display name with emoji
    roleDefinition: string    # Core identity and expertise
    whenToUse: string         # Optional: When to use this mode
    customInstructions: string # Optional: Additional guidelines
    groups: array             # Tool permissions
```

### Mode Properties

#### slug
- **Type**: `string`
- **Format**: Lowercase, kebab-case (e.g., `bmad-master`)
- **Source**: Generated from agent metadata ID or name
- **Usage**: Used for mode-specific rules directory naming

#### name
- **Type**: `string`
- **Format**: Display name with emoji icon
- **Example**: `🧙 BMad Master`
- **Source**: Agent metadata icon + name

#### roleDefinition
- **Type**: `string`
- **Purpose**: Defines agent's core identity and expertise
- **Placement**: Beginning of system prompt
- **Source**: Combines agent `persona.role` and `persona.identity`

#### whenToUse
- **Type**: `string` (optional)
- **Purpose**: Guides mode selection
- **Source**: Extracted from agent role or generated from metadata
- **Example**: `"Use for task execution and workflow orchestration"`

#### customInstructions
- **Type**: `string` (optional)
- **Purpose**: Additional behavioral guidelines
- **Placement**: End of system prompt
- **Source**: Agent `persona.principles` and `persona.communication_style`

#### groups
- **Type**: `array`
- **Purpose**: Defines tool permissions
- **Options**: `read`, `edit`, `browser`, `execute`
- **File Restrictions**: Can include regex patterns for edit permissions

### Tool Groups Mapping

BMAD agents are mapped to Bob tool groups based on their capabilities:

| Agent Type | Read | Edit | Browser | Execute | File Restrictions |
|------------|------|------|---------|---------|-------------------|
| BMad Master | ✓ | ✓ | ✓ | ✓ | None |
| Architect | ✓ | ✓ | ✓ | - | `\.(md\|yaml\|json)$` |
| Developer | ✓ | ✓ | ✓ | ✓ | None |
| Test Engineer | ✓ | ✓ | ✓ | ✓ | None |
| Documentation Writer | ✓ | ✓ | ✓ | - | `\.(md\|mdx\|txt)$` |

### Mode Generation Logic

```javascript
// Pseudo-code for mode generation
function generateMode(agent) {
  return {
    slug: generateSlug(agent.metadata.id),
    name: `${agent.metadata.icon} ${agent.metadata.name}`,
    roleDefinition: combineRoleAndIdentity(agent.persona),
    whenToUse: extractWhenToUse(agent),
    customInstructions: combineInstructions(agent.persona),
    groups: mapToolGroups(agent)
  };
}
```

## Custom Instructions

### Instruction Hierarchy

Bob loads custom instructions in the following order (later overrides earlier):

1. **Global General**: `~/.bob/rules/*.md`
2. **Global Mode-Specific**: `~/.bob/rules-{slug}/*.md`
3. **Project General**: `.bob/rules/*.md`
4. **Project Mode-Specific**: `.bob/rules-{slug}/*.md`

### Generated Instructions

#### General Instructions (`rules/01-bmad-core.md`)

Contains:
- BMAD framework overview
- General principles (runtime loading, numbered lists, etc.)
- Project structure information
- Configuration variables

#### Mode-Specific Instructions (`rules-{slug}/`)

**Activation Instructions** (`01-activation.md`):
- Critical actions to execute on mode activation
- Role and identity information
- Communication style guidelines

**Menu Commands** (`02-menu-commands.md`):
- Available commands for the mode
- Command triggers and actions
- Usage examples

**Prompts Reference** (`03-prompts.md`):
- Available prompts
- Prompt descriptions and content

### Instruction File Format

All instruction files use Markdown format:

```markdown
# Title

## Section

Content with **formatting** and `code`.

1. Numbered lists
2. For instructions

- Bullet points
- For options
```

## Installation Process

### Setup Flow

1. **Detection**: Installer detects IBM Bob selection
2. **Directory Creation**: Creates `.bob/` directory
3. **Mode Generation**: Converts all BMAD agents to modes
4. **YAML Generation**: Writes `custom_modes.yaml`
5. **Instructions Generation**: Creates rules directories and files
6. **Cleanup**: Removes old BMAD-generated content

### Cleanup Strategy

The installer performs surgical cleanup:
- Removes `custom_modes.yaml` if it contains BMAD content
- Removes BMAD-generated rule files (`01-bmad-*.md`, `02-workflow-*.md`)
- Removes mode-specific rules directories (`rules-*`)
- Preserves user customizations

### File Generation

**Modes File** (`custom_modes.yaml`):
```yaml
customModes:
  - slug: bmad-master
    name: 🧙 BMad Master
    # ... properties ...
  - slug: architect
    name: 🏗️ Architect
    # ... properties ...
```

**General Instructions** (`rules/01-bmad-core.md`):
- Core BMAD principles
- Project structure
- Configuration variables

**Mode Instructions** (`rules-{slug}/*.md`):
- Activation steps
- Menu commands
- Prompts reference

## Customization

### User Customizations

Users can customize BMAD for Bob by:

1. **Editing Modes**: Modify `custom_modes.yaml`
2. **Adding Instructions**: Create new files in `rules/`
3. **Mode-Specific Rules**: Add files to `rules-{slug}/`
4. **File Restrictions**: Add `fileRegex` patterns to edit groups

### Example Customizations

**Restrict Architect to Planning Files**:
```yaml
- slug: architect
  # ... other properties ...
  groups:
    - read
    - - edit
      - fileRegex: \.(md|yaml|json)$
        description: Planning and configuration files
    - browser
```

**Add Team Standards**:
```bash
# Create team standards file
cat > .bob/rules/02-team-standards.md << EOF
# Team Standards

- Use TypeScript for all new code
- Write unit tests for all functions
- Follow ESLint configuration
EOF
```

**Add Mode-Specific Rule**:
```bash
# Add developer-specific rule
cat > .bob/rules-developer/04-coding-style.md << EOF
# Coding Style

- Use async/await instead of callbacks
- Prefer functional programming patterns
- Use descriptive variable names
EOF
```

## Technical Details

### Dependencies

The IBM Bob handler requires:
- `js-yaml`: For YAML parsing and generation
- `fs-extra`: For file system operations
- `chalk`: For colored console output

### Handler Class

**File**: `tools/cli/installers/lib/ide/ibm-bob.js`

**Key Methods**:
- `setup()`: Main setup orchestration
- `generateCustomModes()`: Converts agents to modes
- `generateCustomInstructions()`: Creates instruction files
- `mapToolGroups()`: Maps agent capabilities to tool permissions
- `cleanup()`: Removes old BMAD content
- `installCustomAgentLauncher()`: Adds custom agent modes

### Agent to Mode Conversion

**Input** (BMAD Agent YAML):
```yaml
agent:
  metadata:
    id: "_bmad/core/agents/bmad-master.md"
    name: "BMad Master"
    icon: "🧙"
  persona:
    role: "Master Task Executor"
    identity: "Expert in BMAD Core Platform"
    principles: "Load resources at runtime"
  critical_actions:
    - "Load config.yaml"
  menu:
    - trigger: "LT"
      action: "list tasks"
```

**Output** (Bob Mode):
```yaml
- slug: bmad-master
  name: 🧙 BMad Master
  roleDefinition: Master Task Executor. Expert in BMAD Core Platform
  whenToUse: Use for task execution and workflow orchestration
  customInstructions: Load resources at runtime
  groups:
    - read
    - edit
    - browser
    - execute
```

## Comparison with Other Platforms

### vs Cursor

| Feature | IBM Bob | Cursor |
|---------|---------|--------|
| Configuration | `.bob/` directory | `.cursor/` directory |
| Modes | Custom modes (YAML) | Commands (Markdown) |
| Instructions | Hierarchical rules | Rules directory |
| File Format | YAML + Markdown | Markdown with frontmatter |

### vs Windsurf

| Feature | IBM Bob | Windsurf |
|---------|---------|---------|
| Configuration | `.bob/` directory | `.windsurf/` directory |
| Modes | Custom modes (YAML) | Workflows (Markdown) |
| Instructions | Separate rules files | Embedded in workflows |
| Execution | Mode-based | Workflow-based |

## Best Practices

### Mode Design

1. **Clear Role Definition**: Make the mode's purpose obvious
2. **Appropriate Permissions**: Grant only necessary tool access
3. **File Restrictions**: Use regex patterns for sensitive operations
4. **When to Use**: Provide clear guidance for mode selection

### Instruction Organization

1. **General First**: Put common instructions in `rules/`
2. **Mode-Specific Second**: Use `rules-{slug}/` for specialized rules
3. **Numbered Files**: Use prefixes (01-, 02-) for load order
4. **Clear Headings**: Use markdown headings for structure

### Customization Strategy

1. **Start Simple**: Begin with default BMAD configuration
2. **Add Gradually**: Add custom instructions as needs arise
3. **Test Changes**: Verify mode behavior after modifications
4. **Version Control**: Commit `.bob/` directory for team sharing

## Troubleshooting

### Common Issues

**Modes Not Loading**:
- Check YAML syntax in `custom_modes.yaml`
- Verify file is in `.bob/` directory
- Restart IBM Bob

**Instructions Not Applied**:
- Verify files are in correct directories
- Check file extensions (`.md` or `.txt`)
- Ensure markdown is valid

**Permission Errors**:
- Check `groups` array in mode configuration
- Verify `fileRegex` patterns are correct
- Add missing tool permissions

## Related Documentation

- [Installing BMAD for IBM Bob](../../how-to/installation/install-ibm-bob.md)
- [IBM Bob Custom Modes Documentation](../../../bob/docs/Customizing%20modes.html)
- [IBM Bob Custom Instructions Documentation](../../../bob/docs/Using%20custom%20instructions.html)
- [BMAD Agent Reference](../agents/index.md)

## Version History

- **v6.0.0**: Initial IBM Bob support
  - Custom modes generation
  - Custom instructions generation
  - Tool permissions mapping
  - File restriction support