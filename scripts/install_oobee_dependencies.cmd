@echo OFF
if [%1]==[] goto usage

@"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass "& ""%~dp0oobee_shell_ps.ps1""" %*
exit /B 1

:usage
echo oobee Shell - Created By younglim - NO WARRANTY PROVIDED
echo ================================================================
echo 

@"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NoExit -ExecutionPolicy Bypass "& ""%~dp0install_oobee_dependencies.ps1"""
Footer