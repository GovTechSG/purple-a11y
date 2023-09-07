# If currently within script, go one directory up
if ((Split-Path -Path $pwd -Leaf) -eq "scripts") {
	cd ..
}

# Set current path
$current_path = (Get-Item -Path ".\" -Verbose).FullName

echo "INFO: Stored current working directory at $current_path"

# INFO: Set path to hats
# $path_to_hats  = split-path -parent $MyInvocation.MyCommand.Definition
$path_to_hats = "$PSScriptRoot"

echo "INFO: Set path to node for this session"
$env:Path = "$path_to_hats\nodejs-win;$env:Path";

echo "INFO: Set path to node_modules for this session"
$env:Path = "$path_to_hats\node_modules\.bin;./node_modules/.bin;$env:Path";

echo "INFO: Set path to Playwright cache for this session"
$env:PLAYWRIGHT_BROWSERS_PATH = "$path_to_hats\ms-playwright"
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "true"

echo "INFO: Set path to JRE for this session"
$env:JAVA_HOME = "$path_to_hats\jre"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

echo "INFO: Set path to VeraPDF for this session"
$env:Path = "$path_to_hats\verapdf;$env:Path"

if (Test-Path purple-hats) {
   echo "INFO: Set path to purple-hats for this session"
	$env:Path = "$path_to_hats\purple-hats;$env:Path"	
} else {
    if (Test-Path package.json) {
    	echo "INFO: Set path to purple-hats for this session"
	$env:Path = "$path_to_hats;$env:Path"	
    } else {
        Write-Output "Could not find purple-hats"
    }
}

echo ""
$allArgs = $PsBoundParameters.Values + $args + ""

if ($allArgs)
{
	echo "Running: $allArgs"
	iex "& $allArgs"
} else
{
	echo ""
}
