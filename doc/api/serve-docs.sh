#!/bin/bash

# FlexDesk API Documentation Server
# This script helps serve the OpenAPI documentation locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OPENAPI_FILE="openapi.yaml"
PORT=8080

echo -e "${BLUE}🚀 FlexDesk API Documentation Server${NC}"
echo "=================================="

# Check if openapi.yaml exists
if [ ! -f "$OPENAPI_FILE" ]; then
    echo -e "${RED}❌ Error: $OPENAPI_FILE not found!${NC}"
    echo "Please run this script from the doc/api/ directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    
    if command_exists npm; then
        echo "Installing http-server and swagger-ui-express..."
        npm install -g http-server swagger-ui-express
    elif command_exists yarn; then
        echo "Installing http-server and swagger-ui-express..."
        yarn global add http-server swagger-ui-express
    else
        echo -e "${RED}❌ Error: npm or yarn not found!${NC}"
        echo "Please install Node.js first: https://nodejs.org/"
        exit 1
    fi
}

# Function to serve with Python
serve_python() {
    if command_exists python3; then
        echo -e "${GREEN}🐍 Serving with Python 3...${NC}"
        echo "OpenAPI spec available at: http://localhost:$PORT/$OPENAPI_FILE"
        echo "Use Swagger Editor: https://editor.swagger.io/"
        echo "Press Ctrl+C to stop"
        python3 -m http.server $PORT
    elif command_exists python; then
        echo -e "${GREEN}🐍 Serving with Python...${NC}"
        echo "OpenAPI spec available at: http://localhost:$PORT/$OPENAPI_FILE"
        echo "Use Swagger Editor: https://editor.swagger.io/"
        echo "Press Ctrl+C to stop"
        python -m SimpleHTTPServer $PORT
    else
        echo -e "${RED}❌ Python not found!${NC}"
        return 1
    fi
}

# Function to serve with Node.js
serve_node() {
    if command_exists npx; then
        echo -e "${GREEN}🟢 Serving with Node.js...${NC}"
        echo "OpenAPI spec available at: http://localhost:$PORT/$OPENAPI_FILE"
        echo "Use Swagger Editor: https://editor.swagger.io/"
        echo "Press Ctrl+C to stop"
        npx http-server -p $PORT
    else
        echo -e "${RED}❌ npx not found!${NC}"
        return 1
    fi
}

# Function to serve with PHP
serve_php() {
    if command_exists php; then
        echo -e "${GREEN}🐘 Serving with PHP...${NC}"
        echo "OpenAPI spec available at: http://localhost:$PORT/$OPENAPI_FILE"
        echo "Use Swagger Editor: https://editor.swagger.io/"
        echo "Press Ctrl+C to stop"
        php -S localhost:$PORT
    else
        echo -e "${RED}❌ PHP not found!${NC}"
        return 1
    fi
}

# Function to validate OpenAPI spec
validate_spec() {
    echo -e "${BLUE}🔍 Validating OpenAPI specification...${NC}"
    
    if command_exists npm; then
        echo "Installing swagger-cli..."
        npm install -g swagger-cli
        
        if command_exists swagger-cli; then
            echo "Validating $OPENAPI_FILE..."
            if swagger-cli validate $OPENAPI_FILE; then
                echo -e "${GREEN}✅ OpenAPI specification is valid!${NC}"
            else
                echo -e "${RED}❌ OpenAPI specification has errors!${NC}"
                exit 1
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Skipping validation (npm not found)${NC}"
        echo "You can validate manually at: https://editor.swagger.io/"
    fi
}

# Function to open in browser
open_browser() {
    if command_exists xdg-open; then
        xdg-open "https://editor.swagger.io/"
    elif command_exists open; then
        open "https://editor.swagger.io/"
    elif command_exists start; then
        start "https://editor.swagger.io/"
    else
        echo -e "${YELLOW}⚠️  Could not open browser automatically${NC}"
        echo "Please open: https://editor.swagger.io/"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo -e "${BLUE}Choose an option:${NC}"
    echo "1) Validate OpenAPI specification"
    echo "2) Serve documentation (Python)"
    echo "3) Serve documentation (Node.js)"
    echo "4) Serve documentation (PHP)"
    echo "5) Open in Swagger Editor"
    echo "6) Install dependencies"
    echo "0) Exit"
    echo ""
    read -p "Enter your choice (0-6): " choice
    
    case $choice in
        1)
            validate_spec
            ;;
        2)
            serve_python
            ;;
        3)
            serve_node
            ;;
        4)
            serve_php
            ;;
        5)
            open_browser
            ;;
        6)
            install_dependencies
            ;;
        0)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid choice!${NC}"
            show_menu
            ;;
    esac
}

# Check if arguments provided
if [ $# -eq 0 ]; then
    show_menu
else
    case $1 in
        "validate")
            validate_spec
            ;;
        "serve")
            if [ "$2" = "python" ]; then
                serve_python
            elif [ "$2" = "node" ]; then
                serve_node
            elif [ "$2" = "php" ]; then
                serve_php
            else
                echo -e "${RED}❌ Invalid server type!${NC}"
                echo "Usage: $0 serve [python|node|php]"
                exit 1
            fi
            ;;
        "open")
            open_browser
            ;;
        "install")
            install_dependencies
            ;;
        *)
            echo -e "${RED}❌ Invalid argument!${NC}"
            echo "Usage: $0 [validate|serve|open|install]"
            echo "Run without arguments for interactive menu"
            exit 1
            ;;
    esac
fi 