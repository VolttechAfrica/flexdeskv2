# 🚀 Quick Start Guide

Get up and running with FlexDesk API documentation in under 5 minutes!

## ⚡ Super Quick Start

### Option 1: Online (Recommended for first-time users)
1. Copy the contents of `openapi.yaml`
2. Go to [Swagger Editor](https://editor.swagger.io/)
3. Paste the content
4. View your API documentation instantly!

### Option 2: Local Development
```bash
# Navigate to the docs directory
cd doc/api

# Install dependencies
npm install

# Validate the specification
npm run validate

# Serve documentation locally
npm run serve
```

## 🛠️ Development Workflow

### 1. View Documentation
```bash
# Interactive menu
./serve-docs.sh

# Or direct commands
./serve-docs.sh serve python    # Python HTTP server
./serve-docs.sh serve node      # Node.js HTTP server
./serve-docs.sh serve php       # PHP built-in server
```

### 2. Validate Changes
```bash
# Validate OpenAPI spec
npm run validate

# Or use the script
./serve-docs.sh validate
```

### 3. Build Static Documentation
```bash
# Generate Redoc HTML
npm run build:redoc

# Generate Swagger UI
npm run build:swagger
```

## 📱 Available Tools

| Tool | Purpose | Command |
|------|---------|---------|
| **Swagger Editor** | Edit & validate OpenAPI specs | `./serve-docs.sh open` |
| **Redoc** | Beautiful static documentation | `npm run redoc` |
| **Swagger UI** | Interactive API playground | `npm run build:swagger` |
| **HTTP Server** | Serve files locally | `npm run serve` |

## 🔍 Common Tasks

### Adding a New Endpoint
1. Open `openapi.yaml`
2. Add new path under appropriate tag
3. Define request/response schemas
4. Include examples
5. Run `npm run validate`

### Updating Examples
1. Find the endpoint in `openapi.yaml`
2. Update the `examples` section
3. Ensure examples match actual API responses
4. Validate with `npm run validate`

### Testing API
1. Use Swagger UI for interactive testing
2. Copy examples to Postman/Insomnia
3. Test with real API endpoints
4. Update documentation based on results

## 🚨 Troubleshooting

### Validation Errors
```bash
# Check for syntax errors
npm run validate

# Common issues:
# - Missing required fields
# - Invalid YAML syntax
# - Schema reference errors
```

### Server Issues
```bash
# Check if port is available
lsof -i :8080

# Use different port
./serve-docs.sh serve python  # Will use default port
# Or manually: python3 -m http.server 9000
```

### Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📚 Next Steps

1. **Explore the API**: Use Swagger UI to test endpoints
2. **Customize**: Modify examples and descriptions
3. **Integrate**: Add documentation to your CI/CD pipeline
4. **Maintain**: Regular updates and validation

## 🆘 Need Help?

- **Documentation Issues**: Check the main README.md
- **API Questions**: Review the OpenAPI specification
- **Technical Problems**: Check troubleshooting section above
- **Feature Requests**: Contact the development team

---

**Happy Documenting! 🎉** 