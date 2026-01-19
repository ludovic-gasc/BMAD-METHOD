# Installing BMAD for IBM Bob

This guide walks you through installing BMAD-METHOD for IBM Bob, IBM's AI-powered VS Code fork with custom modes and instructions.

## Prerequisites

- **IBM Bob** installed on your system
- **Node.js** (version 18 or higher)
- **Git** (for cloning the repository)

## What Gets Installed

When you install BMAD for IBM Bob, the installer creates:

1. **Custom Modes** (`custom_modes.yaml`): All BMAD agents as Bob modes
2. **Custom Instructions** (`.bob/rules/`): General BMAD guidelines
3. **Mode-Specific Instructions** (`.bob/rules-{mode}/`): Agent-specific rules
4. **BMAD Core** (`_bmad/`): Core framework and selected modules

## Installation Steps

### 1. Install BMAD

Navigate to your project directory and run:

```bash
npx bmad-method install
```

### 2. Select IBM Bob

When prompted to select your IDE/tool, choose **IBM Bob** from the list:

```
? Select your IDE/tool: (Use arrow keys)
❯ IBM Bob
  Cursor
  Windsurf
  Claude Code
  (Other options...)
```

### 3. Select Modules

Choose which BMAD modules to install:

```
? Select modules to install: (Press <space> to select, <a> to toggle all)
❯ ◉ Core (required)
  ◯ BMM (Business Model Method)
  ◯ TEA (Test Engineering Automation)
  ◯ Custom modules
```

**Recommended for first-time users**: Start with Core only, add modules later as needed.

### 4. Installation Complete

The installer will:
- Create `.bob/` directory in your project
- Generate `custom_modes.yaml` with all BMAD agents
- Create custom instruction files
- Install BMAD core and selected modules

You should see output like:

```
✓ IBM Bob configured:
  - 8 custom modes generated
  - 1 general instruction files
  - 16 mode-specific instruction files
  - Configuration directory: .bob
```

## Verifying Installation

### Check Generated Files

Your project should now have:

```
your-project/
├── .bob/
│   ├── custom_modes.yaml           # All BMAD modes
│   ├── rules/                      # General instructions
│   │   └── 01-bmad-core.md
│   ├── rules-bmad-master/          # BMad Master mode
│   │   ├── 01-activation.md
│   │   └── 02-menu-commands.md
│   ├── rules-architect/            # Architect mode
│   ├── rules-developer/            # Developer mode
│   └── rules-test-engineer/        # Test Engineer mode
└── _bmad/                          # BMAD installation
    ├── core/
    └── _config/
```

### Test in IBM Bob

1. **Open IBM Bob** in your project directory
2. **Open the Bob panel** (sidebar icon or `Cmd/Ctrl+Shift+P` → "Bob: Focus on Chat")
3. **Check available modes**: Click the mode selector dropdown
4. You should see all BMAD modes listed with their icons:
   - 🧙 BMad Master
   - 🏗️ Architect
   - 👨‍💻 Developer
   - 🧪 Test Engineer
   - (and others based on installed modules)

### Test a Mode

1. **Select a mode**: Choose "🧙 BMad Master" from the mode dropdown
2. **Send a test message**: Type "LT" (List Tasks)
3. **Verify response**: BMad Master should list available tasks

## Understanding the Configuration

### Custom Modes (`custom_modes.yaml`)

Each BMAD agent becomes a Bob mode with:

```yaml
customModes:
  - slug: bmad-master
    name: 🧙 BMad Master
    roleDefinition: Master Task Executor + BMad Expert...
    whenToUse: Use for task execution and workflow orchestration
    customInstructions: Load resources at runtime...
    groups:
      - read
      - edit
      - browser
      - execute
```

**Key Properties**:
- `slug`: Internal identifier (used for mode-specific rules)
- `name`: Display name in Bob UI
- `roleDefinition`: Agent's core identity and expertise
- `whenToUse`: Guidance for when to use this mode
- `customInstructions`: Additional behavioral guidelines
- `groups`: Tool permissions (read, edit, browser, execute)

### Custom Instructions

**General Instructions** (`.bob/rules/`):
- Apply to all modes
- Contains core BMAD principles
- Loaded automatically

**Mode-Specific Instructions** (`.bob/rules-{slug}/`):
- Apply only when that mode is active
- Contains agent-specific activation steps
- Menu commands and prompts reference

### Tool Permissions

BMAD modes have different tool permissions based on their role:

| Mode | Read | Edit | Browser | Execute |
|------|------|------|---------|---------|
| BMad Master | ✓ | ✓ | ✓ | ✓ |
| Architect | ✓ | ✓* | ✓ | - |
| Developer | ✓ | ✓ | ✓ | ✓ |
| Test Engineer | ✓ | ✓ | ✓ | ✓ |
| Documentation Writer | ✓ | ✓* | ✓ | - |

*\* Restricted to specific file types (e.g., `.md`, `.yaml`)*

## Customizing Your Installation

### Adding Custom Instructions

You can add your own instructions that apply to all BMAD modes:

1. Create a new file in `.bob/rules/`:
   ```bash
   touch .bob/rules/02-my-standards.md
   ```

2. Add your instructions:
   ```markdown
   # My Team Standards
   
   - Always use TypeScript
   - Write tests for all new functions
   - Follow our coding style guide
   ```

3. Bob will automatically load these instructions

### Modifying Mode Permissions

Edit `custom_modes.yaml` to change tool permissions:

```yaml
customModes:
  - slug: architect
    name: 🏗️ Architect
    # ... other properties ...
    groups:
      - read
      - - edit
        - fileRegex: \.(md|yaml|json)$
          description: Planning files only
      - browser
```

### Adding Mode-Specific Rules

Create custom rules for a specific mode:

1. Create a file in the mode's rules directory:
   ```bash
   touch .bob/rules-developer/04-my-coding-rules.md
   ```

2. Add your rules:
   ```markdown
   # My Coding Rules
   
   - Use async/await instead of promises
   - Prefer functional programming patterns
   ```

## Updating BMAD

To update BMAD and regenerate Bob configuration:

```bash
npx bmad-method install
```

The installer will:
- Preserve your custom instruction files
- Update BMAD-generated modes and instructions
- Maintain your customizations

## Troubleshooting

### Modes Not Appearing

**Problem**: BMAD modes don't appear in Bob's mode selector

**Solutions**:
1. Check that `custom_modes.yaml` exists in `.bob/` directory
2. Verify the YAML syntax is valid (use a YAML validator)
3. Restart IBM Bob
4. Check Bob's developer console for errors

### Instructions Not Loading

**Problem**: Custom instructions aren't being applied

**Solutions**:
1. Verify files are in correct directories (`.bob/rules/` or `.bob/rules-{slug}/`)
2. Check file extensions are `.md` or `.txt`
3. Ensure files contain valid markdown
4. Restart the Bob chat session

### Permission Errors

**Problem**: Mode can't perform certain actions (e.g., can't edit files)

**Solutions**:
1. Check the mode's `groups` in `custom_modes.yaml`
2. Add missing permissions (e.g., add `"edit"` to groups array)
3. For file restrictions, verify `fileRegex` pattern is correct
4. Reload Bob configuration

### Installation Fails

**Problem**: Installation command fails with errors

**Solutions**:
1. Ensure Node.js version is 18 or higher: `node --version`
2. Check you have write permissions in the project directory
3. Try clearing npm cache: `npm cache clean --force`
4. Check for conflicting `.bob/` directory from previous installations

## Advanced Configuration

### Global vs Project Instructions

**Global Instructions** (`~/.bob/rules/`):
- Apply to all projects
- Good for personal coding standards
- Not version controlled

**Project Instructions** (`.bob/rules/`):
- Apply only to current project
- Good for team standards
- Can be version controlled (commit to git)

### File Type Restrictions

Restrict modes to specific file types:

```yaml
groups:
  - read
  - - edit
    - fileRegex: \.(ts|tsx|js|jsx)$
      description: TypeScript and JavaScript files only
```

Common patterns:
- Markdown: `\.(md|mdx)$`
- Config files: `\.(json|yaml|yml|toml)$`
- Code files: `\.(ts|tsx|js|jsx|py|java)$`
- Documentation: `\.(md|txt|rst)$`

### Multiple Projects

BMAD can be installed in multiple projects:

```bash
# Project 1
cd ~/projects/project1
npx bmad-method install

# Project 2
cd ~/projects/project2
npx bmad-method install
```

Each project gets its own:
- `.bob/` configuration
- `_bmad/` installation
- Custom modes and instructions

## Next Steps

- **Learn BMAD Workflows**: See [Getting Started Guide](../../tutorials/getting-started/getting-started-bmadv6.md)
- **Explore Modes**: Try different BMAD modes for various tasks
- **Customize Instructions**: Add your team's standards to `.bob/rules/`
- **Install Modules**: Add BMM or TEA modules for additional capabilities

## Related Documentation

- [IBM Bob Custom Modes](../../../bob/docs/Customizing%20modes.html)
- [IBM Bob Custom Instructions](../../../bob/docs/Using%20custom%20instructions.html)
- [BMAD Core Workflows](../../reference/workflows/core-workflows.md)
- [Agent Reference](../../reference/agents/index.md)

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review [BMAD Documentation](../../index.md)
3. Check [IBM Bob Documentation](../../../bob/docs/)
4. Open an issue on the BMAD GitHub repository