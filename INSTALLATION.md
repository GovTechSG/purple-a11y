## Installation Guide

Purple hats is provided as a portable distribution which minimises installation steps required for Windows and Mac. 

### About Purple hats
Purple hats is a customisable, automated accessibility testing tool that allows software development teams to find and fix accessibility problems to improve persons with disabilities (PWDs) access to digital services.

### System Requirements
 * Purple hats can run on MacOS Big Sur or above, and Windows 10 (64-bit) or above.
 * One-time Internet access is needed to download and install Purple hats.
 * You are recommended to be logged on to an admin user to run Purple hats.

### Windows
<details>
  <summary>Click here for Windows setup instructions</summary>
  
#### Download Portable Copy
* Download and extract latest [purple-hats-portable-windows.zip](https://github.com/GovTechSG/purple-hats/releases/latest/download/purple-hats-portable-windows.zip).
* Tip: To extract files, right-click the Compressed zip file and click "Extract All…" in the context menu.

#### Run Purple hats
 * Navigate to the folder containing purple-hats-portable. 
 * Double-click `hats-shell.cmd` (Windows Command Script file).
 * A Windows Command Prompt  similar to the one below will appear and prepare your system to run Purple hats
<img width="425" alt="Command Prompt with hats_shell open" src="https://user-images.githubusercontent.com/2021525/208461886-b71a330b-ac62-48bd-b6c5-154b989c8c78.png">

* Type the following commands to navigate to purple-hats and run a scan
```
cd purple-hats
node index
```
 * If a Windows Firewall prompt appears, click "Allow access"
<img width="261" alt="Windows Firewall prompt for Allow access" src="https://user-images.githubusercontent.com/2021525/208462360-ae9e1e3d-beca-4b78-af40-4126719432f0.png">

 * You will then be greeted with the following screen to run a scan.
<img width="386" alt="hats_shell waiting for user to either scan sitemap or website" src="https://user-images.githubusercontent.com/2021525/208462641-84822386-1f26-49e8-8e92-a2107a67978b.png">


 * Follow the steps at [Features](https://github.com/GovTechSG/purple-hats#features) for more information on how to run a scan.
 
  </details>
  
### MacOS
<details>
  <summary>Click here for MacOS setup instructions</summary>

#### Recommended Pre-requisites
* If you are using Mac, ensure you have the following software installed:
  * [Google Chrome](https://www.google.com/chrome)
  * [Python 3](https://www.python.org/downloads/)
  * Either XCode CLI tools or [XCode](https://apps.apple.com/us/app/xcode/id497799835?mt=12) 
  * Tip: Install XCode CLI tools: 
    * Open `Terminal` app.
    * Type in the command: `xcode-select --install` and press Enter.
    * You will then be prompted to accept the installation. Accept the installation and wait for it to complete before proceeding with the next steps.

#### Download Portable Copy
 * Download and extract [purple-hats-portable-mac.zip](https://github.com/GovTechSG/purple-hats/releases/latest/download/purple-hats-portable-mac.zip) version.
 * Tip: To extract files in Mac, double-click on `purple-hats-portable-mac.zip` file, usually located at your Downloads folder. A new folder with the name `purple-hats-mac` will appear in Finder.
 
#### Run Purple hats
 * Navigate to the folder `purple-hats-mac`, usually located at your Downloads folder. 
 * Press and hold [⌘ Command] key on your keyboard, and simultaneously right-click `hats_shell.command`. Then Click “Open” in the context menu.
 * A prompt as follows will appear like below. Click "Open". You only have to do this step once. 
 <img width="164" alt="MacOS prompt for unidentified developer" src="https://user-images.githubusercontent.com/2021525/208457749-3a0a573d-5a6d-4905-b11e-c957d2073979.png">

 * A Terminal window similar to the one below with `hats_shell` will open and prepare your system to run Purple hats.  
 <img width="349" alt="Terminal window open with hats_shell" src="https://user-images.githubusercontent.com/2021525/208458169-e1ccf383-b0a3-44f0-ac0e-761d5812cefa.png">

 * Type in the following command to navigate to purple hats sub-directory and run a scan
 ``` 
cd purple-hats
node index
```

 * You will then be greeted with the following screen to run a scan
<img width="349" alt="hats_shell waiting for user to either scan sitemap or website" src="https://user-images.githubusercontent.com/2021525/208459110-e44feaa9-6d97-4796-a597-9d38d1f80ce5.png">

 * Follow the steps at [Features](https://github.com/GovTechSG/purple-hats#features) for more information on how to run a scan.
 
 * If you are running on an Apple Silicon Mac, you may be prompted to install [Rosetta 2](https://support.apple.com/en-sg/HT211861).  Click "Install" and try running Purple hats again.
 <img width="480" alt="Rosetta 2 alert prompt" src="https://support.apple.com/library/content/dam/edam/applecare/images/en_US/macos/Big-Sur/macos-big-sur-software-update-rosetta-alert.jpg">
</details>
