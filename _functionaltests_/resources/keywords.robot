*** Keywords ***
Run Scan
    [Arguments]    ${scanner}    ${url}    ${device}=    ${viewport}=    ${maxpages}=100    ${other_options}=
    ${command}=    Set Variable    npm run cli -- -c ${scanner} -u ${url} -k "John Doe:john@domain.com"
    Run Keyword If    ${device} != None    Set Variable    ${command}    ${command} -d ${device}
    Run Keyword If    ${viewport} != None    Set Variable    ${command}    ${command} -w ${viewport}
    Run Keyword If    ${scanner} == "website" or ${scanner} == "sitemap"    Set Variable    ${command}    ${command} -p ${maxpages}
    ${command}=    Set Variable    ${command} ${other_options}
    Run Process    ${command}
    Should Be Equal As Strings    ${result.rc}    0
    Log    ${result.stdout}
    Log    ${result.stderr}

Verify Scan Result
    [Arguments]    ${output_dir}
    Directory Should Exist    ${output_dir}
    ${files}=    List Files In Directory    ${output_dir}
    Should Not Be Empty    ${files}

Verify File Content
    [Arguments]    ${file_path}    ${content}
    File Should Exist    ${file_path}
    ${file_content}=    Get File    ${file_path}
    Should Contain    ${file_content}    ${content}
