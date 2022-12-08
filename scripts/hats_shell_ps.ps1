# Set current path
$current_path = (Get-Item -Path ".\" -Verbose).FullName

echo "INFO: Stored current working directory at $current_path"

# INFO: Set path to hats
# $path_to_hats  = split-path -parent $MyInvocation.MyCommand.Definition
$path_to_hats = "$PSScriptRoot"

echo "INFO: Set path to node for this session"
$env:Path = "$env:Path;$path_to_hats\nodejs-win";

echo "INFO: Set path to node_modules for this session"
$env:Path = "$env:Path;$path_to_hats\node_modules\.bin;./node_modules/.bin";

echo "INFO: Set path to npm-global for this session"
$env:Path = "$env:Path;$path_to_hats\npm-global;$path_to_hats\npm-global\bin";

echo "INFO: Set path to purple-hats for this session"
$env:Path = "$env:Path;$path_to_hats\purple-hats"

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
