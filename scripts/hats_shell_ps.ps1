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

echo "INFO: Set path to npm-global for this session"
$env:Path = "$path_to_hats\npm-global;$path_to_hats\npm-global\bin;$env:Path";

echo "INFO: Set path to git for this session"
$env:Path = "$env:Path;$path_to_hats\git\bin";

echo "INFO: Set path to Playwright cache for this session"
$env:PLAYWRIGHT_BROWSERS_PATH = "$path_to_hats\ms-playwright"

echo "INFO: Set path to ImageMagick for this session"
$env:Path = "$path_to_hats\ImageMagick\bin"

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
