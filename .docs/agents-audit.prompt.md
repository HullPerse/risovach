# Risovach Agent Rules Audit Prompt

Compare `AGENTS.md` and every `.docs/` rules file against the current repository.

## Audit checklist

- Commands match backend and frontend package.json.
- Directory layout and naming match source files.
- Decisions match current user decisions and code.
- Technologies and dependencies are covered.
- Neo-brutalism design rules match real UI behavior.
- Testing commands, directories, and unavailable advanced checks remain accurate.
- Security profile and capability budget match actual network, filesystem, process, and credential behavior.
- New scenarios have a documented rule.
- Obsolete rules are identified.

## Process

Read all rules files, inspect package manifests, configs, source, tests, and server code, then report contradictions, gaps, stale rules, and priorities. Never edit the rules based on this audit without user approval.
