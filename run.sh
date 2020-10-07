#!/bin/bash

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

options=("sitemap file containing links" "public domain URL") 
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
    

    "public domain URL")

        crawler=crawlDomain
        read -p "Please enter domain URL: " page

        break;;

    *) echo "invalid option $REPLY"
    esac
done

# added a check to see whether the input URL have // after http: or https:
input_url=$(echo $page | perl -n -e '/^(https|http):(?!\/\/).*$/ && print')

if ! [ -z "$input_url" ]
then
    # meaning url is in bad format (eg. https:isomer.gov.sg without //)
    # https:/http: will first be removed from the url so that curl can get the final redirected url
    # The final redirected url will be pass into the variable LOCATION
    reformat_url=$(echo $input_url | sed -E 's/(https|http)://g')
    LOCATION=$(curl -sIL -o /dev/null -w '%{url_effective}' $reformat_url | sed 's/%//g')
    page=$LOCATION
else
    # for url that are in this format (eg. https://isomer.gov.sg or https://www.isomer.gov.sg)
    # If url is in this format (eg. https://isomer.gov.sg), url will be curl and redirected to become https://www.isomer.gov.sg/
    LOCATION=$(curl -Ls -w %{url_effective} -o /dev/null $page)
    page=$LOCATION
fi

if curl --output /dev/null --silent --head --fail "$page"
then
    randomToken=$(date +%s)$(openssl rand -hex 5)
    currentDate=$(date '+%Y-%-m-%-d')

    echo "Scanning website..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open results/$currentDate/$randomToken/reports/report.html
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        open -a "Google Chrome" results/$currentDate/$randomToken/reports/report.html     
    else 
        echo results/$currentDate/$randomToken/reports/report.html 
    fi
 
    URL=$page RANDOMTOKEN=$randomToken TYPE=$crawler node -e 'require("./combine").combineRun()' | tee errors.txt
    
else
    echo "This URL does not exist."
fi
