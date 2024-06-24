*** Settings ***
Library    Process
Library    OperatingSystem
Resource   resources/keywords.robot
Resource   resources/variables.robot
Suite Setup       Setup Suite
Suite Teardown    Teardown Suite
Test Setup        Setup Test
Test Teardown     Teardown Test

*** Test Cases ***
01. Run Sitemap Scan
    [Documentation]    Verify that a sitemap scan runs successfully.
    ${output}=    Run Process    ${CLI_COMMAND}    -c sitemap -u ${URL} -k "${EMAIL}" -d desktop -w 1920 -p 50 -h yes -b ${BROWSER}
    Should Contain    ${output.stdout}    Scan completed successfully

02. Run Website Crawl
    [Documentation]    Verify that a website crawl runs successfully.
    ${output}=    Run Process    ${CLI_COMMAND}    -c website -u ${URL} -k "${EMAIL}" -p 100 -f yes -h no -b edge -s same-hostname
    Should Contain    ${output.stdout}    Scan completed successfully

03. Run Custom Flow Scan
    [Documentation]    Verify that a custom flow scan runs successfully.
    ${output}=    Run Process    ${CLI_COMMAND}    -c custom -u ${URL} -k "${EMAIL}" -j "User Flow Test" -d mobile -w 375
    Should Contain    ${output.stdout}    Scan completed successfully

04. Run Intelligent Scan
    [Documentation]    Verify that an intelligent scan runs successfully.
    ${output}=    Run Process    ${CLI_COMMAND}    -c intelligent -u ${URL} -k "${EMAIL}" -o results.zip -a screenshots -t 30
    Should Contain    ${output.stdout}    Scan completed successfully

05. Run Sitemap Scan with Default Options
    [Documentation]    Verify that a sitemap scan runs with default options.
    ${output}=    Run Process    ${CLI_COMMAND}    -c sitemap -u ${URL} -k "${EMAIL}"
    Should Contain    ${output.stdout}    Scan completed successfully

06. Run Website Crawl with Maximum Pages
    [Documentation]    Verify that a website crawl runs with maximum pages set.
    ${output}=    Run Process    ${CLI_COMMAND}    -c website -u ${URL} -k "${EMAIL}" -p 200
    Should Contain    ${output.stdout}    Scan completed successfully

07. Run Scan with Safe Mode Enabled
    [Documentation]    Verify that a scan runs with safe mode enabled.
    ${output}=    Run Process    ${CLI_COMMAND}    -c website -u ${URL} -k "${EMAIL}" -f yes
    Should Contain    ${output.stdout}    Scan completed successfully

08. Run Scan with Headless Mode Disabled
    [Documentation]    Verify that a scan runs with headless mode disabled.
    ${output}=    Run Process    ${CLI_COMMAND}    -c website -u ${URL} -k "${EMAIL}" -h no
    Should Contain    ${output.stdout}    Scan completed successfully

09. Run Scan with Custom Export Directory
    [Documentation]    Verify that a scan runs with a custom export directory.
    ${output}=    Run Process    ${CLI_COMMAND}    -c sitemap -u ${URL} -k "${EMAIL}" -e /custom/path
    Should Contain    ${output.stdout}    Scan completed successfully

10. Run Scan with Specific File Types
    [Documentation]    Verify that a scan runs with specific file types included.
    ${output}=    Run Process    ${CLI_COMMAND}    -c website -u ${URL} -k "${EMAIL}" -i all
    Should Contain    ${output.stdout}    Scan completed successfully