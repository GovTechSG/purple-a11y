*** Settings ***
Library    Process
Library    OperatingSystem
Resource   resources/keywords.robot
Resource   resources/variables.robot

*** Test Cases ***
Functional Test - Sitemap Scan
    [Documentation]    Verify that the sitemap scan works correctly.
    Run Scan    sitemap    ${SITEMAP_URL}    ${CUSTOM_DEVICE}    ${VIEWPORT_WIDTH}    ${MAX_PAGES}
    Verify Scan Result    ${OUTPUT_DIR}

Functional Test - Website Scan
    [Documentation]    Verify that the website scan works correctly.
    Run Scan    website    ${BASE_URL}    ${CUSTOM_DEVICE}    ${VIEWPORT_WIDTH}    ${MAX_PAGES}
    Verify Scan Result    ${OUTPUT_DIR}

Functional Test - Custom Flow Scan
    [Documentation]    Verify that the custom flow scan works correctly.
    Run Scan    custom    ${BASE_URL}    ${CUSTOM_DEVICE}    ${VIEWPORT_WIDTH}    ${MAX_PAGES}
    Verify Scan Result    ${OUTPUT_DIR}

Functional Test - Intelligent Scan
    [Documentation]    Verify that the intelligent scan works correctly.
    Run Scan    intelligent    ${BASE_URL}    ${CUSTOM_DEVICE}    ${VIEWPORT_WIDTH}    ${MAX_PAGES}
    Verify Scan Result    ${OUTPUT_DIR}

Functional Test - Scan with Basic Authentication
    [Documentation]    Verify that the scan works with basic authentication.
    ${auth_header}=    Create List    Authorization: Basic ${USERNAME}:${PASSWORD}
    Run Scan    website    ${BASE_URL}    ${CUSTOM_DEVICE}    ${VIEWPORT_WIDTH}    ${MAX_PAGES}    -m ${auth_header}
    Verify Scan Result    ${OUTPUT_DIR}

Functional Test - Scan with PDF Files
    [Documentation]    Verify that the scan includes PDF files.
    Run Scan    website    ${BASE_URL}    ${CUSTOM_DEVICE}    ${VIEWPORT_WIDTH}    ${MAX_PAGES}    -i pdf-only
    Verify Scan Result    ${OUTPUT_DIR}

Functional Test - Scan with Safe Mode
    [Documentation]    Verify that the scan runs in safe mode.
    Run Scan    website    ${BASE_URL}    ${CUSTOM_DEVICE}    ${VIEWPORT_WIDTH}    ${MAX_PAGES}    -f yes
    Verify Scan Result    ${OUTPUT_DIR}

Functional Test - Scan in Headless Mode
    [Documentation]    Verify that the scan runs in headless mode.
    Run Scan    website    ${BASE_URL}    ${CUSTOM_DEVICE}    ${VIEWPORT_WIDTH}    ${MAX_PAGES}    -h ${HEADLESS}
    Verify Scan Result    ${OUTPUT_DIR}

Functional Test - Scan with Chrome Browser
    [Documentation]    Verify that the scan runs in Chrome browser.
    Run Scan    website    ${BASE_URL}    ${CUSTOM_DEVICE}    ${VIEWPORT_WIDTH}    ${MAX_PAGES}    -b ${BROWSER}
    Verify Scan Result    ${OUTPUT_DIR}

Functional Test - Scan and Save Results as Zip
    [Documentation]    Verify that the scan results can be saved as a zip file.
    Run Scan    website    ${BASE_URL}    ${CUSTOM_DEVICE}    ${VIEWPORT_WIDTH}    ${MAX_PAGES}    -o ${ZIP_FILENAME}
    File Should Exist    ${ZIP_FILENAME}
