# Contributing to Heleerra API Integration Guide

We welcome contributions to improve this API integration guide! This document provides guidelines and instructions for contributing.

## 🤝 How to Contribute

### 1. Reporting Issues

Before creating an issue, please check if it already exists. When creating a new issue:

- **Use a clear and descriptive title**
- **Provide detailed information** about the problem or suggestion
- **Include steps to reproduce** (for bugs)
- **Specify the environment** (language, framework, OS)
- **Add relevant labels** when possible

### 2. Suggesting Enhancements

We welcome suggestions for new features or improvements:

- **Describe the enhancement** in detail
- **Explain the use case** and why it would be beneficial
- **Provide examples** if applicable
- **Consider backward compatibility**

### 3. Code Contributions

#### Before You Start

- Fork the repository
- Create a feature branch from `main`
- Ensure your development environment is set up
- Review existing code style and patterns

#### Development Setup

1. **Clone your fork**
   ```bash
   git clone https://github.com/heleerra/heleerra-api-integration.git
   cd heleerra-api-integration
   ```

2. **Install dependencies** (for Node.js examples)
   ```bash
   cd examples/nodejs
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your test credentials
   ```

#### Code Guidelines

- **Follow the existing code style** in each language
- **Add comments** for complex logic
- **Include error handling** where appropriate
- **Write tests** when adding new features
- **Update documentation** for any changes

#### Example Code Standards

**PHP:**
- Use PSR-12 coding standards
- Include type hints
- Use proper exception handling
- Document with PHPDoc

**Python:**
- Follow PEP 8 style guide
- Use type hints
- Include docstrings
- Handle exceptions appropriately

**Node.js:**
- Use ES6+ features
- Follow Airbnb style guide
- Use async/await for promises
- Include JSDoc comments

### 4. Documentation Contributions

#### Documentation Guidelines

- **Use clear, concise language**
- **Include code examples** where helpful
- **Keep examples up to date**
- **Test all examples** before submitting
- **Use proper markdown formatting**

#### What to Document

- New API endpoints or features
- Code examples for new languages/frameworks
- Troubleshooting guides
- Best practices
- Integration patterns

## 📝 Pull Request Process

### Before Creating a Pull Request

1. **Test your changes**
   - Run existing tests
   - Test new functionality
   - Verify examples work

2. **Update documentation**
   - Update README if needed
   - Add inline comments
   - Update API documentation

3. **Write a clear commit message**
   - Use present tense ("Add feature" not "Added feature")
   - Keep the first line under 50 characters
   - Reference issues and pull requests when applicable

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Performance improvement

## Testing
- [ ] I have tested these changes locally
- [ ] I have updated/added tests
- [ ] Examples work correctly

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
```

## 🧪 Testing

### Running Tests

**Node.js Examples:**
```bash
cd examples/nodejs
npm test
node test_example.js
```

**Python Examples:**
```bash
cd examples/python
python heleerra_api.py
```

**PHP Examples:**
```bash
cd examples/php
# Run with your PHP setup
```

### Test Requirements

- All existing tests must pass
- New features should include tests
- Examples must work with test credentials
- No breaking changes without discussion

## 🎯 Areas for Contribution

### High Priority
- [ ] Additional language examples (Ruby, Go, Java)
- [ ] Framework integrations (Laravel, Django, Express)
- [ ] Advanced webhook handling examples
- [ ] Testing utilities and mocks

### Medium Priority
- [ ] Performance optimization guides
- [ ] Security best practices
- [ ] Troubleshooting common issues
- [ ] Video tutorials

### Low Priority
- [ ] Additional payment method examples
- [ ] Mobile integration guides
- [ ] Third-party service integrations

## 🏷️ Labels

We use labels to organize issues and pull requests:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `priority-high` - High priority issue
- `priority-medium` - Medium priority issue
- `priority-low` - Low priority issue

## 💬 Communication

### Channels
- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and general discussion
- **Pull Requests** - Code review and implementation

### Code of Conduct

Please be respectful and constructive in all interactions:
- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community

## 🙏 Recognition

Contributors will be recognized in our README and release notes. Thank you for helping make this integration guide better for everyone!

## 📞 Getting Help

If you need help with contributing:

1. Check existing documentation
2. Search through existing issues
3. Create a new issue with your question
4. Tag it with the `question` label

---

**Thank you for contributing to the Heleerra API Integration Guide!** 🎉
