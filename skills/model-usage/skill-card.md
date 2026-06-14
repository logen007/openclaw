## Description: <br>
Use CodexBar CLI local cost usage to summarize per-model usage for Codex or Claude, including the current model or a full model breakdown. <br>

This skill is ready for commercial/non-commercial use. <br>

## Publisher: <br>
[steipete](https://clawhub.ai/user/steipete) <br>

### License/Terms of Use: <br>


## Use Case: <br>
Developers and engineers use this skill to summarize local CodexBar cost logs by model for Codex or Claude. It supports current-model and all-model views, with optional text or JSON output for interactive review or automation. <br>

### Deployment Geography for Use: <br>
Global <br>

## Known Risks and Mitigations: <br>
Risk: The skill reads local CodexBar cost data, which may reveal model usage and spending patterns if shared. <br>
Mitigation: Review generated text or JSON before sharing it outside the intended audience. <br>
Risk: The workflow depends on the CodexBar CLI and local usage logs being available on the host. <br>
Mitigation: Install CodexBar from the documented Homebrew cask and verify the requested provider data exists before relying on the summary. <br>


## Reference(s): <br>
- [CodexBar CLI quick ref](references/codexbar-cli.md) <br>
- [ClawHub skill page](https://clawhub.ai/steipete/model-usage) <br>
- [Publisher profile](https://clawhub.ai/user/steipete) <br>


## Skill Output: <br>
**Output Type(s):** [text, JSON, shell commands, guidance] <br>
**Output Format:** [Plain text or JSON, with Markdown command examples in the skill guidance] <br>
**Output Parameters:** [1D] <br>
**Other Properties Related to Output:** [Summaries are cost-only by model because CodexBar output does not split tokens by model.] <br>

## Skill Version(s): <br>
1.0.0 (source: server release metadata) <br>

## Ethical Considerations: <br>
Users should evaluate whether this skill is appropriate for their environment, review any generated or modified files before relying on them, and apply their organization's safety, security, and compliance requirements before deployment. <br>
