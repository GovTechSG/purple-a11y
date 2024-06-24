*** Settings ***
Library           Process
Library           OperatingSystem
Resource          resources/keywords.robot
Resource          resources/variables.robot
Suite Setup       Setup Suite
Suite Teardown    Teardown Suite
Test Setup        Setup Test
Test Teardown     Teardown Test

*** Test Cases ***
01. Run Sitemap Scan
    [Documentation]    Verify that a sitemap scan runs successfully.
    ${command}=    Set Variable    ${CLI_COMMAND} -c sitemap -u ${SITEMAP_URL} -k "${EMAIL}" -d ${CUSTOM_DEVICE} -p {DEFAULT_MAX_PAGES} -b ${BROWSER}
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

02. Run Website Crawl
    [Documentation]    Verify that a website crawl runs successfully.
    ${command}=    Set Variable    ${CLI_COMMAND} -c website -u ${URL} -k "${EMAIL}" -d ${CUSTOM_DEVICE} -p {DEFAULT_MAX_PAGES} -b ${BROWSER}
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

03. Run Custom Flow Scan
    [Documentation]    Verify that a custom flow scan runs successfully.
    ${command}=    Set Variable    ${CLI_COMMAND} -c custom -u ${URL} -k "${EMAIL}" -d ${CUSTOM_DEVICE} -p {DEFAULT_MAX_PAGES} -b ${BROWSER} -j "Default Custom Flow Test"
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

04. Run Intelligent Scan
    [Documentation]    Verify that an intelligent scan runs successfully.
    ${command}=    Set Variable   ${CLI_COMMAND} -c intelligent -u ${URL} -k "${EMAIL}" -d ${CUSTOM_DEVICE} -p {DEFAULT_MAX_PAGES} -b ${BROWSER}
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

05. Run Sitemap Scan
    [Documentation]    Verify that a sitemap scan runs successfully.
    ${command}=    Set Variable    ${CLI_COMMAND} -c sitemap -u ${SITEMAP_URL} -k "${EMAIL}" -d ${CUSTOM_DEVICE} -w 1920 -p 50 -h yes -b ${BROWSER}
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

06. Run Website Crawl
    [Documentation]    Verify that a website crawl runs successfully.
    ${command}=    Set Variable    ${CLI_COMMAND} -c website -u ${URL} -k "${EMAIL}" -p 100 -f yes -h no -b safari -s same-hostname
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

07. Run Custom Flow Scan
    [Documentation]    Verify that a custom flow scan runs successfully.
    ${command}=    Set Variable    ${CLI_COMMAND} -c custom -u ${URL} -k "${EMAIL}" -j "User Flow Test" -d mobile -w 375
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

08. Run Intelligent Scan
    [Documentation]    Verify that an intelligent scan runs successfully.
    ${command}=    Set Variable    ${CLI_COMMAND} -c intelligent -u ${URL} -k "${EMAIL}" -o results.zip -a screenshots -t 30
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

09. Run Sitemap Scan with Default Options
    [Documentation]    Verify that a sitemap scan runs with default options.
    ${command}=    Set Variable    ${CLI_COMMAND} -c sitemap -u ${SITEMAP_URL} -k "${EMAIL}"
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

10. Run Website Crawl with Maximum Pages
    [Documentation]    Verify that a website crawl runs with maximum pages set.
    ${command}=    Set Variable    ${CLI_COMMAND} -c website -u ${URL} -k "${EMAIL}" -p 200
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

11. Run Scan with Safe Mode Enabled
    [Documentation]    Verify that a scan runs with safe mode enabled.
    ${command}=    Set Variable    ${CLI_COMMAND} -c website -u ${URL} -k "${EMAIL}" -f yes
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

12. Run Scan with Headless Mode Disabled
    [Documentation]    Verify that a scan runs with headless mode disabled.
    ${command}=    Set Variable    ${CLI_COMMAND} -c website -u ${URL} -k "${EMAIL}" -h no
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

13. Run Scan with Custom Export Directory
    [Documentation]    Verify that a scan runs with a custom export directory.
    ${command}=    Set Variable    ${CLI_COMMAND} -c sitemap -u ${URL} -k "${EMAIL}" -e ../Desktop/A11y-Results
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully

14. Run Scan with Specific File Types
    [Documentation]    Verify that a scan runs with specific file types included.
    ${command}=    Set Variable    ${CLI_COMMAND} -c website -u ${URL} -k "${EMAIL}" -i all
    ${output}=    Run Process    ${command}    shell=True    cwd=${WORKING_DIRECTORY}
    Should Contain    ${output.stdout}    Scan completed successfully