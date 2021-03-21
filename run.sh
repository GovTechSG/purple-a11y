#! /bin/bash

# For common shell function
. shell_functions/commonShellFunctions.sh

# For Apify environment settings
. shell_functions/settings.sh

# Check if installer script is executed beforehand
check_installer_status

# Delete .a11y_storage and results/current to remove previous scan data
clean_up

#0 == SUCCESS, 1 == FAIL
_valid_url=1

echo "Welcome to HATS Accessibility Testing Tool!"
echo "We recommend using Chrome browser for the best experience."
echo "What would you like to scan today?"

options=("sitemap file containing links" "website")

# Get information related to scan type as well as the URL for URL validation
select opt in "${options[@]}"
do
    case $opt in

        "sitemap file containing links")

            scanType="sitemap"
            crawler=crawlSitemap
            prompt_message="Please enter URL to sitemap: "
            break;;

        "website")

            prompt_website
            break;;

        "exit")
            exit;;

        *)
            echo "Invalid option $REPLY";;

    esac

done

# Prompt for URL (Common across all scan types)
read -p "$prompt_message" page


# URL validation
while [ "$_valid_url" != 0 ]
do
    check_url

    if [ "$page" = "exit" ]; then
        exit
    elif [ -n $check_url_status ] && [ $check_url_status = 0 ]; then
        _valid_url=0
    else
        # Prompt error message to rectify error for URL
        if [ $scanType = "sitemap" ]; then
            sitemap_error
        else
            website_error
        fi

    fi

done



# Run the crawler
randomToken=$(date +%s)$(openssl rand -hex 5)
currentDate=$(date '+%Y-%-m-%-d')

echo "Scanning website..."

URL="$page" LOGINID="$login_id" LOGINPWD="$login_pwd" IDSEL="$id_selector" PWDSEL="$pwd_selector" SUBMIT="$btn_selector" RANDOMTOKEN="$randomToken" TYPE="$crawler" node -e 'require("./combine").combineRun()' | tee errors.txt

# Verify that the newly generated directory exists
if [ -d "results/$currentDate/$randomToken" ]; then

    # Test for the command before attempting to open the report
    if [ -n "command -v open" ]; then
        open -a "Google Chrome" "results/$currentDate/$randomToken/reports/report.html"
    elif [ -n "command -v xdg-open" ]; then
        # Linux equivalent of open
        xdg-open -a "Google Chrome" "results/$currentDate/$randomToken/reports/report.html"
    else
        echo "The scan has been completed."
        current_dir=$(pwd)
        reportPath="$current_dir/results/$currentDate/$randomToken/reports/report.html"
        echo "You can find the report in $reportPath"
    fi

else
    echo "WARNING: An unexpected error has occurred. Please try again later."
fi
