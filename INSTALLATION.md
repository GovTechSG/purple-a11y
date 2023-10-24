## Installation Guide

Purple hats is provided as a portable distribution which minimises installation steps required for Windows and Mac. 

### About Purple hats
Purple hats is a customisable, automated accessibility testing tool that allows software development teams to find and fix accessibility problems to improve persons with disabilities (PWDs) access to digital services.

### System Requirements
* Purple HATS can run on MacOS Big Sur or above, and a [supported](https://learn.microsoft.com/en-us/windows/release-health/supported-versions-windows-client) version of Windows 10 (64-bit) or Windows 11.
* Google Chrome browser is [installed](https://www.google.com/chrome).
* One-time Internet access is needed to download and install Purple HATS Desktop.
* You are recommended to be logged on to an admin user to run Purple HATS Desktop.

### Windows
<details>
  <summary>Click here for Windows setup instructions</summary>
  
#### Download Portable Copy
* Download and extract latest [purple-hats-portable-windows.zip](https://github.com/GovTechSG/purple-hats/releases/latest/download/purple-hats-portable-windows.zip).
* Tip: To extract files, right-click the Compressed zip file and click "Extract All…" in the context menu.

#### Run Purple hats
 * Navigate to the folder containing purple-hats-portable. 
 * Double-click `hats_shell.cmd` (Windows Command Script file).
  <img width="480" alt="Screenshot of Windows Explorer with hats_shell.cmd selected" src="https://user-images.githubusercontent.com/2021525/225506018-9f7a6684-ac14-4a69-a4f2-4d1a67a068c4.png">

 * A Windows Command Prompt window should open with contents as illustrated below. `hats_shell` will autmatically prepare your system to run Purple hats. 
```
hats Shell - Created By younglim - NO WARRANTY PROVIDED
================================================================

INFO: Stored current working directory at C:\Users\a11y\Downloads\purple-hats-portable-windows
INFO: Set path to node for this session
INFO: Set path to node_modules for this session
INFO: Set path to npm-global for this session
INFO: Set path to Playwright cache for this session
INFO: Set path to ImageMagick for this session
INFO: Set path to purple-hats for this session


PS C:\Users\username\Downloads\purple-hats-portable-windows>
```
 

 * Type in the following commands into the window.  The following commands will navigate your Command Prompt window to the `purple-hats` sub-directory and initiate a scan
```
cd purple-hats
node index
```
 * If a Windows Firewall prompt appears, click "Allow access"
<img width="261" alt="Windows Firewall prompt for Allow access" src="https://user-images.githubusercontent.com/2021525/208462360-ae9e1e3d-beca-4b78-af40-4126719432f0.png">

 * You should then see your Windows Command Prompt window updated with the following contents
```
PS C:\Users\username\Downloads\purple-hats-portable-windows> cd purple-hats
PS C:\Users\username\Downloads\purple-hats-portable-windows\purple-hats> node index
┌────────────────────────────────────────────────────────────┐
│ Welcome to HATS Accessibility Testing Tool!                │
│ We recommend using Chrome browser for the best experience. │
│                                                            │
│ Version: ░░░░░░                                            │
└────────────────────────────────────────────────────────────┘
? What would you like to scan today? (Use arrow keys)
> sitemap
  website
  custom flow
```

 * Follow the steps at [Features](https://github.com/GovTechSG/purple-hats#features) for more information on how to run a scan.
 
  </details>
  
### MacOS
<details>
  <summary>Click here for MacOS setup instructions</summary>

#### Download Portable Copy
 * Download and extract [purple-hats-portable-mac.zip](https://github.com/GovTechSG/purple-hats/releases/latest/download/purple-hats-portable-mac.zip) version.
 * Tip: To extract files in Mac, double-click on `purple-hats-portable-mac.zip` file, usually located at your Downloads folder. A new folder with the name `purple-hats-mac` will appear in Finder.
 
#### Run Purple hats
 * Navigate to the folder `purple-hats-mac`, usually located at your Downloads folder. 
 * Right-click `hats_shell.command`. Then click `Open` in the context menu.
  <img width="480" alt="Screenshot of right-click hats_shell.command and Open" src="https://user-images.githubusercontent.com/2021525/225501586-2df8ba37-f58a-4d1f-b28c-e06865fec2b0.png">

 * A prompt as follows will appear like below. Click `Open`. 
 <img width="240" alt="MacOS prompt for unidentified developer" src="https://user-images.githubusercontent.com/2021525/208457749-3a0a573d-5a6d-4905-b11e-c957d2073979.png">

 * A Terminal window should open with contents as illustrated below. `hats_shell` will autmatically prepare your system to run Purple hats.  
```
Last login: Thu Mar 16 10:48:05 on ttys002
/Users/username/Downloads/purple-hats-portable-mac/hats_shell.command ; exit;
username@hostname ~ % /Users/username/Downloads/purple-hats-portable-mac/hats_shell.command ; exit;
hats Shell - Created By younglim - NO WARRANTY PROVIDED
================================================================

INFO: Setting path to node for this session
INFO: Set path to node_modules for this session
INFO: Set path to Playwright cache for this session
INFO: Set symbolic link to ImageMagick
INFO: Set path to ImageMagick binaries
INFO: Removing com.apple.quarantine attributes for required binaries to run
username@hostname purple-hats-portable-mac % 
```
  
 * Type in the following commands into the window.  The following commands will navigate your Terminal window to the `purple-hats` sub-directory and initiate a scan
 ``` 
cd purple-hats
node index
```

 * You should then see your Terminal window updated with the following contents
```
username@hostname purple-hats-portable-mac % cd purple-hats 
username@hostname purple-hats % node index
┌────────────────────────────────────────────────────────────┐
│ Welcome to HATS Accessibility Testing Tool!                │
│ We recommend using Chrome browser for the best experience. │
│                                                            │
│ Version: ░░░░░░                                            │
└────────────────────────────────────────────────────────────┘
? What would you like to scan today? (Use arrow keys)
❯ sitemap 
  website 
  custom flow 
```

 * Follow the steps at [Features](https://github.com/GovTechSG/purple-hats#features) for more information on how to run a scan.
</details>
