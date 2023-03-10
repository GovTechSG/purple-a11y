# Install Git binaries
if (-Not (Test-Path git)) {
    Write-Output "Downloading Git"
    Invoke-WebRequest -o ".\PortableGit.7z.exe" "https://github.com/git-for-windows/git/releases/download/v2.39.1.windows.1/PortableGit-2.39.1-64-bit.7z.exe"

    Write-Output "Unzip Git"
    .\PortableGit.7z.exe -o ".\git" -y | Out-Null
    Remove-Item -Force .\PortableGit.7z.exe
}

# Install NodeJS binaries
if (-Not (Test-Path nodejs-win)) {
    Write-Output "Downloading Node"
    Invoke-WebRequest -o ./nodejs-win.zip "https://nodejs.org/dist/v18.12.1/node-v18.12.1-win-x64.zip"     
    
    Write-Output "Unzip Node"
    Expand-Archive .\nodejs-win.zip -DestinationPath .
    Rename-Item node-v18.12.1-win-x64 -NewName nodejs-win
    Remove-Item -Force .\nodejs-win.zip
}

# Install Image<agick
if (-Not (Test-Path ImageMagick\bin)) {
    Write-Output "Downloading ImageMagick (Mirror)"
    Invoke-WebRequest -o ./ImageMagick-win.zip "https://mirror.checkdomain.de/imagemagick/binaries/ImageMagick-6.9.12-77-portable-Q16-HDRI-x64.zip"
    Expand-Archive .\ImageMagick-win.zip -DestinationPath ImageMagick\bin
    Remove-Item -Force .\ImageMagick-win.zip
}

# Install Node dependencies
if (Test-Path purple-hats) {
    Write-Output "Installing node dependencies"
    & ".\hats_shell_ps.ps1" "cd purple-hats;npm i fsevents@latest -f --save-optional"     
} else {
    Write-Output "Trying to search for package.json instead"

    if (Test-Path package.json) {
        Write-Output "Installing node dependencies"
        & ".\hats_shell_ps.ps1" "npm i fsevents@latest -f --save-optional"   
    } else {
        Write-Output "Could not find purple-hats"
    }
}
