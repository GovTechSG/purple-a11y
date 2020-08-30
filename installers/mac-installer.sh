#!/bin/bash

# Removing previous installation of /.nvm directory, node_modules and python pkgs
if [ -d "node_modules" ]; then
   rm -r node_modules
fi

if [ -d "ansible/.nvm" ]; then
   rm -rf ansible/.nvm
fi

# If virtual env directory does not exists
if ! [ -d "a11y/bin" ]; then
deactivate 2>/dev/null;

# For macOS 
# High Sierra onwards - has Python2.7 by default
# Catalina onwards - has Python2.7 and Python3 by default

    # Check if  Python3, 
    # Then use the respective python version to create virtual environment & install Ansible
    if ! [ -z "which python3" ]; then
        echo "Skipping Python3 Installation"
        python3 -m venv a11y
        . a11y/bin/activate
        yes | pip3 install ansible
    else
        # Install python3, will be installed on /usr/local/bin/python3
        curl -OL https://www.python.org/ftp/python/3.7.6/python-3.7.6-macosx10.9.pkg
        installer -pkg python-3.7.6-macosx10.9.pkg -target /
        rm python-3.7.6-macosx10.9.pkg -target /
        
        python3 -m venv a11y
        . a11y/bin/activate
        yes | pip3 install ansible

    fi

else

    echo "Skipping Ansible install"
    . a11y/bin/activate

fi

ansible-playbook -i ansible/inventory.yml -c local ansible/ansible-task-install-packages.yml --extra-vars="playbook_dir=$(pwd)"

mv a11y ../