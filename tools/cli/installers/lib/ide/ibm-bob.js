const path = require('node:path');
const fs = require('fs-extra');
const { BaseIdeSetup } = require('./_base-ide');
const chalk = require('chalk');
const yaml = require('js-yaml');
const { AgentCommandGenerator } = require('./shared/agent-command-generator');

/**
 * IBM Bob IDE setup handler
 * Generates custom modes and custom instructions for IBM Bob
 */
class IbmBobSetup extends BaseIdeSetup {
    constructor() {
        super('ibm-bob', 'IBM Bob', true); // preferred IDE
        this.configDir = '.bob';
        this.modesFile = 'custom_modes.yaml';
        this.rulesDir = 'rules';
    }

    /**
     * Setup IBM Bob IDE configuration
     * @param {string} projectDir - Project directory
     * @param {string} bmadDir - BMAD installation directory
     * @param {Object} options - Setup options
     */
    async setup(projectDir, bmadDir, options = {}) {
        console.log(chalk.cyan(`Setting up ${this.name}...`));

        // Clean up old BMAD installation first
        await this.cleanup(projectDir);

        // Create .bob directory structure
        const bobDir = path.join(projectDir, this.configDir);
        const rulesDir = path.join(bobDir, this.rulesDir);

        await this.ensureDir(bobDir);
        await this.ensureDir(rulesDir);

        // Generate custom modes from BMAD agents
        const agentGen = new AgentCommandGenerator(this.bmadFolderName);
        const { artifacts: agentArtifacts } = await agentGen.collectAgentArtifacts(bmadDir, options.selectedModules || []);

        // Convert BMAD agents to Bob modes
        const customModes = await this.generateCustomModes(agentArtifacts, bmadDir);

        // Write custom_modes.yaml
        const modesPath = path.join(bobDir, this.modesFile);
        const modesYaml = yaml.dump({ customModes }, { lineWidth: -1, noRefs: true });
        await this.writeFile(modesPath, modesYaml);

        // Generate custom instructions
        const instructionCounts = await this.generateCustomInstructions(bobDir, agentArtifacts, bmadDir);

        console.log(chalk.green(`✓ ${this.name} configured:`));
        console.log(chalk.dim(`  - ${customModes.length} custom modes generated`));
        console.log(chalk.dim(`  - ${instructionCounts.general} general instruction files`));
        console.log(chalk.dim(`  - ${instructionCounts.modeSpecific} mode-specific instruction files`));
        console.log(chalk.dim(`  - Configuration directory: ${path.relative(projectDir, bobDir)}`));

        return {
            success: true,
            modes: customModes.length,
            instructions: instructionCounts.general + instructionCounts.modeSpecific,
        };
    }

    /**
     * Generate custom modes from BMAD agents
     * @param {Array} agentArtifacts - Agent artifacts from AgentCommandGenerator
     * @param {string} bmadDir - BMAD installation directory
     * @returns {Promise<Array>} Array of custom mode objects
     */
    async generateCustomModes(agentArtifacts, bmadDir) {
        const modes = [];

        for (const artifact of agentArtifacts) {
            try {
                // Read the agent YAML file
                const agentPath = path.join(bmadDir, artifact.module, 'agents', `${artifact.name}.agent.yaml`);
                const agentContent = await this.readFile(agentPath);
                const agentData = yaml.load(agentContent);

                if (!agentData || !agentData.agent) {
                    console.log(chalk.yellow(`  Warning: Invalid agent structure in ${artifact.name}`));
                    continue;
                }

                const agent = agentData.agent;
                const metadata = agent.metadata || {};
                const persona = agent.persona || {};

                // Generate mode slug from agent ID or name
                const slug = this.generateSlug(metadata.id || metadata.name || artifact.name);

                // Build role definition
                let roleDefinition = '';
                if (persona.role) {
                    roleDefinition = persona.role;
                    if (persona.identity) {
                        roleDefinition += '. ' + persona.identity;
                    }
                } else if (persona.identity) {
                    roleDefinition = persona.identity;
                } else {
                    roleDefinition = `You are ${metadata.name || artifact.name}`;
                }

                // Extract whenToUse from role definition or generate it
                const whenToUse = this.extractWhenToUse(agent, metadata);

                // Map tool groups based on agent capabilities
                const groups = this.mapToolGroups(agent, metadata);

                // Build custom instructions from principles
                let customInstructions = '';
                if (persona.principles) {
                    customInstructions = persona.principles;
                }
                if (persona.communication_style) {
                    if (customInstructions) customInstructions += '\n\n';
                    customInstructions += `Communication style: ${persona.communication_style}`;
                }

                // Create mode object
                const mode = {
                    slug,
                    name: `${metadata.icon || '🤖'} ${metadata.name || artifact.name}`,
                    roleDefinition,
                };

                // Add optional properties
                if (whenToUse) {
                    mode.whenToUse = whenToUse;
                }
                if (customInstructions) {
                    mode.customInstructions = customInstructions;
                }
                if (groups && groups.length > 0) {
                    mode.groups = groups;
                }

                modes.push(mode);
            } catch (error) {
                console.log(chalk.yellow(`  Warning: Could not process agent ${artifact.name}: ${error.message}`));
            }
        }

        return modes;
    }

    /**
     * Generate custom instructions in .bob/rules/ directories
     * @param {string} bobDir - .bob directory path
     * @param {Array} agentArtifacts - Agent artifacts
     * @param {string} bmadDir - BMAD installation directory
     * @returns {Promise<Object>} Counts of generated files
     */
    async generateCustomInstructions(bobDir, agentArtifacts, bmadDir) {
        let generalCount = 0;
        let modeSpecificCount = 0;

        // Generate general BMAD instructions
        const rulesDir = path.join(bobDir, this.rulesDir);
        const coreInstructions = this.generateCoreInstructions();
        await this.writeFile(path.join(rulesDir, '01-bmad-core.md'), coreInstructions);
        generalCount++;

        // Generate mode-specific instructions for each agent
        for (const artifact of agentArtifacts) {
            try {
                const agentPath = path.join(bmadDir, artifact.module, 'agents', `${artifact.name}.agent.yaml`);
                const agentContent = await this.readFile(agentPath);
                const agentData = yaml.load(agentContent);

                if (!agentData || !agentData.agent) continue;

                const agent = agentData.agent;
                const metadata = agent.metadata || {};
                const slug = this.generateSlug(metadata.id || metadata.name || artifact.name);

                // Create mode-specific rules directory
                const modeRulesDir = path.join(bobDir, `${this.rulesDir}-${slug}`);
                await this.ensureDir(modeRulesDir);

                // Generate activation instructions
                if (agent.critical_actions || agent.menu) {
                    const activationInstructions = this.generateActivationInstructions(agent, metadata);
                    await this.writeFile(path.join(modeRulesDir, '01-activation.md'), activationInstructions);
                    modeSpecificCount++;
                }

                // Generate menu commands reference
                if (agent.menu && agent.menu.length > 0) {
                    const menuInstructions = this.generateMenuInstructions(agent.menu, metadata);
                    await this.writeFile(path.join(modeRulesDir, '02-menu-commands.md'), menuInstructions);
                    modeSpecificCount++;
                }

                // Generate prompts reference if available
                if (agent.prompts && agent.prompts.length > 0) {
                    const promptsInstructions = this.generatePromptsInstructions(agent.prompts, metadata);
                    await this.writeFile(path.join(modeRulesDir, '03-prompts.md'), promptsInstructions);
                    modeSpecificCount++;
                }
            } catch (error) {
                console.log(chalk.yellow(`  Warning: Could not generate instructions for ${artifact.name}: ${error.message}`));
            }
        }

        return { general: generalCount, modeSpecific: modeSpecificCount };
    }

    /**
     * Generate core BMAD instructions
     * @returns {string} Markdown content
     */
    generateCoreInstructions() {
        return `# BMAD Core Instructions

## About BMAD

BMAD (Business Model Agile Development) is an AI-driven agile development framework that provides:
- Specialized AI agents for different development roles
- Structured workflows for software development
- Task and tool management system
- Module-based extensibility

## General Principles

1. **Runtime Resource Loading**: Load resources at runtime, never pre-load
2. **Numbered Lists**: Always present numbered lists for user choices
3. **Communication Language**: Communicate in the user's preferred language
4. **Workflow Orchestration**: Follow BMAD workflows for structured development
5. **Module Awareness**: Be aware of installed modules and their capabilities

## Project Structure

- \`_bmad/\`: BMAD installation directory
- \`_bmad/core/config.yaml\`: Project configuration
- \`_bmad/_config/\`: Compiled manifests and configurations
- \`_bmad/{module}/\`: Module-specific resources

## Configuration Variables

When activated, load these variables from \`_bmad/core/config.yaml\`:
- \`project_name\`: Name of the current project
- \`output_folder\`: Default output directory
- \`user_name\`: User's preferred name
- \`communication_language\`: Preferred language for communication
`;
    }

    /**
     * Generate activation instructions for an agent
     * @param {Object} agent - Agent data
     * @param {Object} metadata - Agent metadata
     * @returns {string} Markdown content
     */
    generateActivationInstructions(agent, metadata) {
        let content = `# ${metadata.name || 'Agent'} Activation Instructions\n\n`;

        if (metadata.title) {
            content += `**Role**: ${metadata.title}\n\n`;
        }

        if (agent.critical_actions && agent.critical_actions.length > 0) {
            content += `## Critical Actions\n\n`;
            content += `Execute these actions immediately upon activation:\n\n`;
            agent.critical_actions.forEach((action, index) => {
                content += `${index + 1}. ${action}\n`;
            });
            content += '\n';
        }

        if (agent.persona) {
            if (agent.persona.role) {
                content += `## Role\n\n${agent.persona.role}\n\n`;
            }
            if (agent.persona.identity) {
                content += `## Identity\n\n${agent.persona.identity}\n\n`;
            }
            if (agent.persona.communication_style) {
                content += `## Communication Style\n\n${agent.persona.communication_style}\n\n`;
            }
        }

        return content;
    }

    /**
     * Generate menu commands instructions
     * @param {Array} menu - Menu items
     * @param {Object} metadata - Agent metadata
     * @returns {string} Markdown content
     */
    generateMenuInstructions(menu, metadata) {
        let content = `# ${metadata.name || 'Agent'} Menu Commands\n\n`;
        content += `Available commands for this mode:\n\n`;

        menu.forEach((item) => {
            const trigger = item.trigger || '';
            const description = item.description || '';
            const action = item.action || '';

            content += `## ${description || trigger}\n\n`;
            content += `**Trigger**: \`${trigger}\`\n\n`;
            if (action) {
                content += `**Action**: ${action}\n\n`;
            }
        });

        return content;
    }

    /**
     * Generate prompts instructions
     * @param {Array} prompts - Prompt items
     * @param {Object} metadata - Agent metadata
     * @returns {string} Markdown content
     */
    generatePromptsInstructions(prompts, metadata) {
        let content = `# ${metadata.name || 'Agent'} Prompts\n\n`;
        content += `Available prompts for this mode:\n\n`;

        prompts.forEach((prompt) => {
            const id = prompt.id || '';
            const description = prompt.description || '';
            const promptContent = prompt.content || '';

            content += `## ${id}\n\n`;
            if (description) {
                content += `${description}\n\n`;
            }
            if (promptContent) {
                content += `\`\`\`\n${promptContent}\n\`\`\`\n\n`;
            }
        });

        return content;
    }

    /**
     * Generate slug from agent ID or name
     * @param {string} text - Text to convert to slug
     * @returns {string} Slug
     */
    generateSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Extract whenToUse from agent data
     * @param {Object} agent - Agent data
     * @param {Object} metadata - Agent metadata
     * @returns {string} When to use description
     */
    extractWhenToUse(agent, metadata) {
        // Try to extract from role definition first sentence
        if (agent.persona && agent.persona.role) {
            const firstSentence = agent.persona.role.split('.')[0];
            if (firstSentence) {
                return `Use this mode when you need ${firstSentence.toLowerCase()}`;
            }
        }

        // Fallback to metadata title
        if (metadata.title) {
            return `Use this mode for ${metadata.title.toLowerCase()}`;
        }

        return '';
    }

    /**
     * Map BMAD agent capabilities to Bob tool groups
     * @param {Object} agent - Agent data
     * @param {Object} metadata - Agent metadata
     * @returns {Array} Tool groups
     */
    mapToolGroups(agent, metadata) {
        const groups = ['read']; // All modes can read files

        // Determine if agent needs edit permissions
        const needsEdit = this.agentNeedsEdit(agent, metadata);
        if (needsEdit) {
            // Check if we should restrict file types
            const fileRestriction = this.getFileRestriction(agent, metadata);
            if (fileRestriction) {
                groups.push(['edit', fileRestriction]);
            } else {
                groups.push('edit');
            }
        }

        // Add browser for agents that might need web access
        if (this.agentNeedsBrowser(agent, metadata)) {
            groups.push('browser');
        }

        // Add execute for agents that run commands
        if (this.agentNeedsExecute(agent, metadata)) {
            groups.push('execute');
        }

        return groups;
    }

    /**
     * Check if agent needs edit permissions
     * @param {Object} agent - Agent data
     * @param {Object} metadata - Agent metadata
     * @returns {boolean}
     */
    agentNeedsEdit(agent, metadata) {
        const name = (metadata.name || '').toLowerCase();
        const role = (agent.persona?.role || '').toLowerCase();

        // Agents that typically need edit permissions
        const editKeywords = ['developer', 'architect', 'engineer', 'writer', 'coder', 'implement'];
        return editKeywords.some((keyword) => name.includes(keyword) || role.includes(keyword));
    }

    /**
     * Get file restriction for edit permissions
     * @param {Object} agent - Agent data
     * @param {Object} metadata - Agent metadata
     * @returns {Object|null} File restriction object or null
     */
    getFileRestriction(agent, metadata) {
        const name = (metadata.name || '').toLowerCase();

        // Documentation writers should only edit markdown
        if (name.includes('document') || name.includes('writer')) {
            return {
                fileRegex: '\\.(md|mdx|txt)$',
                description: 'Documentation files only',
            };
        }

        // Plan mode should edit markdown and YAML
        if (name.includes('plan') || name.includes('architect')) {
            return {
                fileRegex: '\\.(md|yaml|yml|json)$',
                description: 'Planning and configuration files',
            };
        }

        return null;
    }

    /**
     * Check if agent needs browser permissions
     * @param {Object} agent - Agent data
     * @param {Object} metadata - Agent metadata
     * @returns {boolean}
     */
    agentNeedsBrowser(agent, metadata) {
        const name = (metadata.name || '').toLowerCase();
        const role = (agent.persona?.role || '').toLowerCase();

        const browserKeywords = ['research', 'architect', 'document'];
        return browserKeywords.some((keyword) => name.includes(keyword) || role.includes(keyword));
    }

    /**
     * Check if agent needs execute permissions
     * @param {Object} agent - Agent data
     * @param {Object} metadata - Agent metadata
     * @returns {boolean}
     */
    agentNeedsExecute(agent, metadata) {
        const name = (metadata.name || '').toLowerCase();
        const role = (agent.persona?.role || '').toLowerCase();

        const executeKeywords = ['developer', 'engineer', 'test', 'deploy', 'build'];
        return executeKeywords.some((keyword) => name.includes(keyword) || role.includes(keyword));
    }

    /**
     * Cleanup IBM Bob configuration
     * @param {string} projectDir - Project directory
     */
    async cleanup(projectDir) {
        const bobDir = path.join(projectDir, this.configDir);

        if (await fs.pathExists(bobDir)) {
            // Only remove BMAD-generated files, not user customizations
            const modesPath = path.join(bobDir, this.modesFile);
            const rulesDir = path.join(bobDir, this.rulesDir);

            // Check if modes file has BMAD-generated content
            if (await fs.pathExists(modesPath)) {
                try {
                    const content = await fs.readFile(modesPath, 'utf8');
                    if (content.includes('BMad') || content.includes('bmad')) {
                        await fs.remove(modesPath);
                        console.log(chalk.dim(`  Removed old BMAD modes from ${this.name}`));
                    }
                } catch (error) {
                    // Ignore errors
                }
            }

            // Remove BMAD-generated rules
            if (await fs.pathExists(rulesDir)) {
                const files = await fs.readdir(rulesDir);
                for (const file of files) {
                    if (file.startsWith('01-bmad-') || file.startsWith('02-workflow-')) {
                        await fs.remove(path.join(rulesDir, file));
                    }
                }
            }

            // Remove mode-specific rules directories
            const bobContents = await fs.readdir(bobDir);
            for (const item of bobContents) {
                if (item.startsWith('rules-') && item !== 'rules') {
                    const itemPath = path.join(bobDir, item);
                    const stat = await fs.stat(itemPath);
                    if (stat.isDirectory()) {
                        await fs.remove(itemPath);
                    }
                }
            }
        }
    }

    /**
     * Install a custom agent launcher for IBM Bob
     * @param {string} projectDir - Project directory
     * @param {string} agentName - Agent name
     * @param {string} agentPath - Path to compiled agent
     * @param {Object} metadata - Agent metadata
     * @returns {Object|null} Info about created mode
     */
    async installCustomAgentLauncher(projectDir, agentName, agentPath, metadata) {
        const bobDir = path.join(projectDir, this.configDir);
        const modesPath = path.join(bobDir, this.modesFile);

        if (!(await this.exists(bobDir))) {
            return null; // IDE not configured for this project
        }

        // Read existing modes
        let modesData = { customModes: [] };
        if (await this.exists(modesPath)) {
            const content = await this.readFile(modesPath);
            modesData = yaml.load(content) || { customModes: [] };
        }

        // Create new mode for custom agent
        const slug = this.generateSlug(agentName);
        const newMode = {
            slug,
            name: `${metadata.icon || '🤖'} ${metadata.title || agentName}`,
            roleDefinition: metadata.description || `Custom agent: ${agentName}`,
            groups: ['read', 'edit', 'browser', 'execute'],
        };

        // Add or update mode
        const existingIndex = modesData.customModes.findIndex((m) => m.slug === slug);
        if (existingIndex >= 0) {
            modesData.customModes[existingIndex] = newMode;
        } else {
            modesData.customModes.push(newMode);
        }

        // Write updated modes
        const modesYaml = yaml.dump(modesData, { lineWidth: -1, noRefs: true });
        await this.writeFile(modesPath, modesYaml);

        return {
            path: modesPath,
            mode: slug,
        };
    }
}

module.exports = { IbmBobSetup };

// Made with Bob
