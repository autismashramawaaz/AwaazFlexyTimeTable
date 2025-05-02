#!/bin/bash

# Git Diagnostic Script Wrapper
# This script runs the git diagnostic Python script and ensures it has proper permissions

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}   AwaazFlexyTimeTable Git Diagnostic Tool   ${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed or not in PATH${NC}"
    echo "Please install Python 3 to use this diagnostic tool"
    exit 1
fi

# Check if diagnose_git.py exists
if [ ! -f "diagnose_git.py" ]; then
    echo -e "${RED}Error: diagnose_git.py script not found${NC}"
    echo "Please ensure you're running this script from the project root directory"
    exit 1
fi

# Make diagnose_git.py executable
chmod +x diagnose_git.py

echo -e "${YELLOW}Running Git diagnostic tool...${NC}"
echo

# Run the diagnostic script
python3 diagnose_git.py

# Get exit code
EXIT_CODE=$?

echo
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Diagnostic completed successfully!${NC}"
else
    echo -e "${YELLOW}Diagnostic completed with issues.${NC}"
    echo -e "Please review the output above for recommendations."
fi

echo
echo -e "${BLUE}To learn more about setting up Git access on Render:${NC}"
echo -e "Open ${YELLOW}render_environment_setup.md${NC} for detailed instructions"
echo

exit $EXIT_CODE 