## Installation Guide

Purple A11y is provided as a portable distribution which minimises installation steps required for Windows and Mac.

### About Purple A11y
Purple A11y is a customisable, automated accessibility testing tool that allows software development teams to find and fix accessibility problems to improve persons with disabilities (PWDs) access to digital services.

### System Requirements
* Purple A11y can run on MacOS Big Sur or above, and a [supported](https://learn.microsoft.com/en-us/windows/release-health/supported-versions-windows-client) version of Windows 10 (64-bit) or Windows 11.
* Google Chrome browser is [installed](https://www.google.com/chrome).
* One-time Internet access is needed to download and install Purple A11y Desktop.
* You are recommended to be logged on to an admin user to run Purple A11y Desktop.

### Windows
<details>
  <summary>Click here for Windows setup instructions</summary>

#### Download Portable Copy
* Download and extract latest [purple-a11y-portable-windows.zip](https://github.com/GovTechSG/purple-hats/releases/latest/download/purple-a11y-portable-windows.zip).
* Tip: To extract files, right-click the Compressed zip file and click "Extract All…" in the context menu.

#### Run Purple A11y
 * Navigate to the folder containing purple-a11y-portable-windows.
 * Double-click `a11y_shell.cmd` (Windows Command Script file).
  <img width="480" alt="Screenshot of Windows Explorer with a11y_shell.cmd selected" src="https://github.com/GovTechSG/purple-hats/assets/50561219/872c9fce-0d7f-405d-b6b6-c8a196c3e81a">

 * A Windows Command Prompt window should open with contents as illustrated below. `a11y_shell` will automatically prepare your system to run Purple a11y.
```
a11y Shell - Created By younglim - NO WARRANTY PROVIDED
================================================================

INFO: Stored current working directory at C:\Users\a11y\Downloads\purple-a11y-portable-windows
INFO: Set path to node for this session
INFO: Set path to node_modules for this session
INFO: Set path to npm-global for this session
INFO: Set path to Playwright cache for this session
INFO: Set path to ImageMagick for this session
INFO: Set path to purple-hats for this session


PS C:\Users\username\Downloads\purple-a11y-portable-windows>
```


 * Type in the following commands into the window.  The following commands will navigate your Command Prompt window to the `purple-hats` sub-directory and initiate a scan
```
cd purple-hats
node index
```
 * If a Windows Firewall prompt appears, click "Allow access"
<img width="261" alt="Windows Firewall prompt for Allow access" src="https://github.com/GovTechSG/purple-hats/assets/50561219/4ece401b-1195-4a90-a327-243c081690b9">

 * You should then see your Windows Command Prompt window updated with the following contents
```
PS C:\Users\username\Downloads\purple-a11y-portable-windows> cd purple-hats
PS C:\Users\username\Downloads\purple-a11y-portable-windows\purple-hats> node index
┌────────────────────────────────────────────────────────────┐
│ Welcome to A11y Accessibility Testing Tool!                │
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
 * Download and extract [purple-a11y-portable-mac.zip](https://github.com/GovTechSG/purple-hats/releases/latest/download/purple-a11y-portable-mac.zip) version.
 * Tip: To extract files in Mac, double-click on `purple-a11y-portable-mac.zip` file, usually located at your Downloads folder. A new folder with the name `purple-a11y-portable-mac` will appear in Finder.

#### Run Purple A11y
 * Navigate to the folder `purple-a11y-portable-mac`, usually located at your Downloads folder.
 * Right-click `a11y_shell.command`. Then click `Open` in the context menu.
  <img width="480" alt="Screenshot of right-click a11y_shell.command and Open" src="https://github.com/GovTechSG/purple-hats/assets/152410523/15a0f577-c8c4-43e2-9c9d-ca4b960b8874">

 * A prompt as follows will appear like below. Click `Open`.
 <img width="240" alt="MacOS prompt for unidentified developer" src="https://github.com/GovTechSG/purple-hats/assets/152410523/85eb0d58-8dd9-477c-916a-b759cfb1afd6">

 * A Terminal window should open with contents as illustrated below. `a11y_shell` will automatically prepare your system to run Purple A11y.
```
Last login: Thu Mar 16 10:48:05 on ttys002
/Users/username/Downloads/purple-a11y-portable-mac/a11y_shell.command ; exit;
username@hostname ~ % /Users/username/Downloads/purple-a11y-portable-mac/a11y_shell.command ; exit;
a11y Shell - Created By younglim - NO WARRANTY PROVIDED
================================================================

INFO: Setting path to node for this session
INFO: Set path to node_modules for this session
INFO: Set path to Playwright cache for this session
INFO: Set symbolic link to ImageMagick
INFO: Set path to ImageMagick binaries
INFO: Removing com.apple.quarantine attributes for required binaries to run
username@hostname purple-a11y-portable-mac %
```

 * Type in the following commands into the window.  The following commands will navigate your Terminal window to the `purple-hats` sub-directory and initiate a scan
 ```
cd purple-hats
node index
```

 * You should then see your Terminal window updated with the following contents
```
username@hostname purple-a11y-portable-mac % cd purple-hats
username@hostname purple-hats % node index
┌────────────────────────────────────────────────────────────┐
│ Welcome to A11y Accessibility Testing Tool!                │
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
