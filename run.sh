#! /bin/bash

# source the shell_functions/commonShellFunctions.sh to utilize the check_format_url shell function
. shell_functions/commonShellFunctions.sh

# By deleting the entire folder (.a11y_storage) is deleted, Apify.pushData will be able to create the respective folders.
# If only the subfolders are removed while retaining .a11y_storage folder, it will result in the datasets/default folder to not be created
# This will result in no such file or directory error
if [ -d ".a11y_storage" ]; then
    rm -r .a11y_storage 2> /dev/null
fi


if [ -d "results/current" ]; then
    rm -r results/current/* 2> /dev/null
fi

export APIFY_LOCAL_STORAGE_DIR=`pwd`/.a11y_storage
export APIFY_HEADLESS=1

if ! [ -d "a11y/bin" ]; then
    echo "Please run the installer script (mac-installer.sh / linux-installer.sh) to install the necessary components."
    exit 0
fi

echo "Welcome to HAT's Accessibility Testing Tool!"
echo "We recommend using Chrome browser for the best experience."
echo "What would you like to scan today?"

options=("sitemap file containing links" "website") 

select opt in "${options[@]}"
do
    case $opt in
    
    "sitemap file containing links")
        crawler=crawlSitemap

        read -p "Please enter URL to sitemap: " page
        # 0 == FALSE, 1 == TRUE
        validate_status=0
        
        while [ $validate_status != 1 ]
        do
            if [ $page = "exit" ];then
                exit
            else
                check_reformat_url

                #Validate the content of the link
                #Curl the content of the page & check if it has the required XML tag or links
                curl_check=$(curl --silent $page | egrep '<urlset|(http|https)://')
                if [ -z "$curl_check" ]
                then
                    echo ""
                    echo "The provided link does not contain a sitemap."
                    echo "A sitemap can be in the following format:"
                    echo "  1. A text file with a list of links"
                    echo "  2. A XML file with XML tags in Sitemap Protocol format"
                    echo ""
                    echo "Please try again or type 'exit' to stop the script."
                    echo ""
                    read -p "Please enter URL to sitemap: " page
                else 
                    validate_status=1
                fi

            fi
        done

        echo ""

        break;;
    

    "website")

        read -p "Do you need to login to your website? Y/N: " user_reply

            case $user_reply in

                "Y"|"y"):
                    crawler=crawlLogin

                    read -p "Please enter URL of login page: " page
                    read -p "Please enter your login ID: " login_id
                    read -sp "Please enter your password: " login_pwd

                    echo ""
                    echo "Now, go to your browser and right-click on these 3 elements,"
                    echo "  1. Username field"
                    echo "  2. Login password field"
                    echo "  3. Submit button"
                    echo ""
                    echo "Select 'inspect' and 'copy selector'"
                    echo "Next, navigate back here and paste the selector one by one."
                    echo ""

                    read -p "Please enter “username field” selector: " id_selector
                    read -p "Please enter “login password field” selector: " pwd_selector
                    read -p "Please enter “submit button” selector: " btn_selector

                    check_reformat_url
                    break;;
                
                "N"|"n"):
                    crawler=crawlDomain
                    read -p "Please enter URL of website: " page
                    check_reformat_url

                    break;;

                "exit"):
                    exit;;

                *) echo "invalid option $REPLY"

            esac

        break;;

    *) echo "invalid option $REPLY"
    esac
done

if curl --output /dev/null --silent --head --fail "$page"
then
    randomToken=$(date +%s)$(openssl rand -hex 5)
    currentDate=$(date '+%Y-%-m-%-d')

    echo "Scanning website..."
    
    URL=$page LOGINID=$login_id LOGINPWD=$login_pwd IDSEL=$id_selector PWDSEL=$pwd_selector SUBMIT=$btn_selector RANDOMTOKEN=$randomToken TYPE=$crawler node -e 'require("./combine").combineRun()' | tee errors.txt
    open -a "Google Chrome" results/$currentDate/$randomToken/reports/report.html
else
    echo "Warning: This website does not exist"
fi
            prompt_website
