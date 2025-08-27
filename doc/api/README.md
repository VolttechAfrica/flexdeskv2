# FlexDesk API Documentation

This directory contains comprehensive API documentation for the FlexDesk School Management System.

## 📁 File Structure

```
doc/api/
├── openapi.yaml          # Main OpenAPI 3.0 specification
├── README.md            # This file - documentation guide
└── examples/            # Example API requests/responses (future)
```

## 🚀 Quick Start

### Viewing the Documentation

1. **Online Swagger UI**: Copy the `openapi.yaml` content to [Swagger Editor](https://editor.swagger.io/)
2. **Local Development**: Use tools like Swagger UI or Redoc for local viewing
3. **IDE Integration**: Most modern IDEs support OpenAPI files natively

### Using the API

1. **Authentication**: Most endpoints require JWT token in `Authorization: Bearer <token>` header
2. **Base URL**: Update the server URLs in `openapi.yaml` for your environment
3. **Rate Limiting**: Implement proper error handling for rate-limited requests

## 📚 API Groups

### 🔐 Authentication
- **Login**: `POST /auth/login` - User authentication with auto-detection
- **Logout**: `POST /auth/logout` - Session termination
- **Register**: `POST /auth/register` - Staff member registration

### 👥 User Management
- **Profile**: `GET/PUT /user/profile` - User profile operations
- **User Info**: Various user data retrieval endpoints

### 📋 Task Management
- **Tasks**: `GET/POST /tasks` - Task CRUD operations
- **Task Details**: `GET /tasks/{taskId}` - Individual task information
- **Task Members**: Task assignment and collaboration

### 🎫 Support System
- **Tickets**: `POST /support/tickets` - Support ticket creation
- **Ticket Management**: `GET /support/tickets` - Ticket retrieval (admin)

### 🏫 School Operations
- **Schools**: `GET /schools` - School information
- **Classes**: Class and subject management
- **Staff Assignment**: Teacher-class-subject relationships

### 💚 Health & Monitoring
- **Health Check**: `GET /health` - System status

## 🛠️ Maintenance

### Adding New Endpoints

1. **Update `openapi.yaml`**:
   - Add new path under appropriate tag
   - Define request/response schemas
   - Include examples and descriptions

2. **Update this README**:
   - Add endpoint to appropriate group
   - Document any new features

3. **Schema Updates**:
   - Add new schemas to `components/schemas`
   - Update existing schemas as needed

### Best Practices

1. **Consistent Naming**: Use kebab-case for URLs, camelCase for properties
2. **Comprehensive Examples**: Include realistic examples for all endpoints
3. **Error Handling**: Document all possible error responses
4. **Authentication**: Clearly mark which endpoints require auth
5. **Validation**: Include proper validation rules in schemas

### Version Control

- **Major Changes**: Update version number in `openapi.yaml`
- **Breaking Changes**: Document in changelog
- **Deprecation**: Mark deprecated endpoints clearly

## 🔧 Development Tools

### Recommended Tools

1. **Swagger Editor**: [https://editor.swagger.io/](https://editor.swagger.io/)
2. **Swagger UI**: Interactive API documentation
3. **Redoc**: Beautiful API documentation
4. **Postman**: API testing and collection management

### IDE Extensions

- **VS Code**: OpenAPI (Swagger Editor) extension
- **IntelliJ**: OpenAPI/Swagger support
- **Eclipse**: Swagger Editor plugin

## 📖 Schema Reference

### Common Patterns

1. **Pagination**: Use consistent pagination structure
2. **Error Responses**: Standardized error format across all endpoints
3. **Success Responses**: Consistent success response structure
4. **Data Types**: Use appropriate OpenAPI data types

### Authentication

```yaml
security:
  - BearerAuth: []
```

### Request/Response Examples

```yaml
examples:
  success_case:
    summary: Successful Response
    value:
      status: true
      message: "Operation successful"
      data: {...}
```

## 🚨 Important Notes

1. **JWT Tokens**: All authenticated endpoints require valid JWT tokens
2. **Rate Limiting**: Implement proper error handling for rate limits
3. **Validation**: Server-side validation may be stricter than schema
4. **Environment**: Update server URLs for different environments
5. **Permissions**: Some endpoints require specific role permissions

## 🔄 Updates & Maintenance

### Regular Tasks

- [ ] Review and update examples quarterly
- [ ] Validate schemas against actual API responses
- [ ] Update version numbers for releases
- [ ] Review and update error response documentation
- [ ] Validate authentication requirements

### When Adding Features

- [ ] Update OpenAPI specification
- [ ] Add comprehensive examples
- [ ] Update this README
- [ ] Test documentation accuracy
- [ ] Review with team

## 📞 Support

For questions about this documentation:
- **Technical Issues**: Check the OpenAPI specification
- **Content Updates**: Follow the maintenance guidelines
- **API Changes**: Coordinate with development team

---

**Last Updated**: January 2024  
**Version**: 1.1.0  
**Maintainer**: FlexDesk Development Team 