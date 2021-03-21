#!/bin/bash

# Removing previous installation of /.nvm directory and node_modules
if [ -d "node_modules" ]; then
   rm -r node_modules
fi

if [ -d "ansible/.nvm" ]; then
   rm -rf ansible/.nvm
fi


#Get ID_LIKE from /etc/os-release - list identifiers of closely related OS to the local OS
get_id_like=$(cat "/etc/os-release" | awk -F 'ID_LIKE=' '{print $2}' )

# Check if can categorize into the following similar OS (rhel, openSUSE/suse, debian, fedora)
os_identifier=$(echo $get_id_like | grep -E 'rhel|fedora|debian|opensuse|suse')

if ! [ -d "a11y/bin" ]; then
deactivate 2>/dev/null;

# Chromium not required, set environment to avoid error regarding failing to download Chromium 
# due to lack of permissions when installing Puppeteer
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=0

#Perform update before installation to get the latest info on pkgs and its updates
#Then install python3 and ansible
case $os_identifier in
   $(echo $os_identifier | grep -E "rhel|fedora"))

      # Uses YUM
      yum check-update
      yum install python3 -y

      # install pip and venv
      pip3 install --user --upgrade pip
      pip3 install --user virtualenv

      python3 -m venv a11y
      . a11y/bin/activate
      
      # Need to install unzip, not available by default; Required for ansible playbook unarchive to work
      yum install zip -y
      yum install unzip -y
      pip3 install ansible
   ;;

   $(echo $os_identifier | grep -E "debian"))                                                                                         
      # Uses APT
      apt-get update
      apt-get install python3 -y

      # install pip and venv
      pip3 install --user --upgrade pip
      pip3 install --user virtualenv

      python3 -m venv a11y
      . a11y/bin/activate
      
      apt-get install zip -y
      pip3 install ansible
   ;;

   $(echo $os_identifier | grep -E "suse|opensuse"))
      # Use Zypper
      zypper update
      zypper install -y python3

      # install pip and venv
      pip3 install --user --upgrade pip
      pip3 install --user virtualenv

      python3 -m venv a11y
      . a11y/bin/activate

      zypper install zip -y
      pip3 install ansible
   ;;

   *)
      echo "$os_identifier"
      echo "Not able to identify the appropriate package manager"
      echo "Please contact the team for assistance"
   ;;
esac

else
   echo "Skipping installation of Ansible"
   . a11y/bin/activate
fi


ansible-playbook -i ansible/inventory.yml -c local ansible/ansible-task-install-packages.yml --extra-vars="playbook_dir=$(pwd)"

mv a11y ../