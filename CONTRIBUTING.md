# Contributing to Cerebro MCP

Thank you for your interest in contributing to Cerebro MCP! This document covers the guidelines for contributing to this project.

## Code of Conduct

This project follows the [Contributor Covenant v2.0](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## How to Contribute

### Reporting Bugs

Open a [bug report issue](https://github.com/Synvoya/cerebro-mcp/issues/new?template=bug_report.md) with:

- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node.js version, Claude Desktop version)

### Suggesting Features

Open a [feature request issue](https://github.com/Synvoya/cerebro-mcp/issues/new?template=feature_request.md) with:

- Problem description
- Proposed solution
- Use case / who benefits

### Submitting Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Write your code with tests
4. Run `npm test` to ensure all tests pass
5. Run `npm run lint` to check types
6. Commit with a clear message
7. Open a Pull Request against `main`

### Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new functionality
- Update documentation if behavior changes
- Follow existing code style (TypeScript strict mode)
- Reference related issues in the PR description

## Development Setup

```bash
git clone https://github.com/Synvoya/cerebro-mcp.git
cd cerebro-mcp
npm install
npm run build
npm test
```

### Running in Development

```bash
npm run dev    # Watch mode — rebuilds on file changes
npm test       # Run test suite
npm run lint   # Type check without building
```

## Project Governance

Cerebro MCP follows a BDFL (Benevolent Dictator for Life) model. Hibi ([@Synvoya](https://github.com/Synvoya)) has final say on project direction. All contributions are welcome and will be reviewed fairly.

## License

By contributing to Cerebro MCP, you agree that your contributions will be licensed under the Apache License 2.0. No Contributor License Agreement (CLA) is required — same approach as MCP itself.

## Community

- [GitHub Issues](https://github.com/Synvoya/cerebro-mcp/issues) — bugs, features, discussion
- [GitHub Discussions](https://github.com/Synvoya/cerebro-mcp/discussions) — questions, ideas, show & tell

## Agent Contributions

If you've built a custom agent that others might find useful:

1. Create a JSON file following the format in `agents/` directory
2. Test it with a starter kit config
3. Submit a PR to the `agents/` directory
4. Include a description of what the agent does and example use cases

Thank you for helping make AI accessible to everyone.
