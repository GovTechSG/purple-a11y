#!/bin/bash

# ================================== DEBUG =======================================

check_values(){
    echo "scanType: $scanType"
    echo "message: $prompt_message"
    echo "formatted_url: $formatted_url, user-defined:$user_defined_trail"
    echo "LOCATION: $_LOCATION"
    echo "full_url: $_full_url"
}

# ======================== PREREQUISITES & CLEAN UP SCAN DATA ====================

# Check if the installer script is executed
check_installer_status(){

    if ! [ -d "a11y/bin" ]; then
        echo "Please run the installer script (mac-installer.sh / linux-installer.sh) to install the necessary components."
        exit 0
    fi

}

# By deleting the entire folder (.a11y_storage) is deleted, Apify.pushData will be able to create the respective folders.
# If only the subfolders are removed while retaining .a11y_storage folder, it will result in the datasets/default folder to not be created
# This will result in no such file or directory error
# Also, remove the results from previous scan; previous scan would have been copied into
# the directory named with the date of scan
clean_up(){

    if [ -d ".a11y_storage" ]; then
        rm -r .a11y_storage 2> /dev/null
    fi


    if [ -d "results/current" ]; then
        rm -r results/current/* 2> /dev/null
    fi

}



prompt_website(){
    scanType="website"
    crawler=crawlDomain
    prompt_message="Please enter URL of website: "
}





# ============================ ERROR MESSAGES =================================

# Provide user with brief information of what a sitemap is
# Prompt user to provide URL again
sitemap_error(){

    echo ""
    echo "The provided link does not contain a sitemap."
    echo "A sitemap can be in the following format:"
    echo "  1. A text file with a list of links"
    echo "  2. A XML file with XML tags in Sitemap Protocol format"
    echo ""
    echo "Please try again or type 'exit' to stop the script."
    echo ""
    read -p "$prompt_message" page

}

# Generic error message and prompt user to provide URL again
website_error(){

    echo ""
    echo "Warning: The provided link cannot be found."
    echo ""
    echo "Please try again or type 'exit' to stop the script."
    echo ""
    read -p "$prompt_message" page

}

# ============================== URL VALIDATION ================================

# Take in the scanType
# Verify if can connect with URL
check_website(){

    # Attempt to redirect to effective URL
    local _LOCATION=$(curl -Ls -w %{url_effective} -o /dev/null "$formatted_url" | sed 's/%//g')

    # Verify if URL can be connected
    LOCATION=$(curl -o /dev/null --silent $formatted_url)
    local _res=$?

    if [ "$_res" != "0" ]; then
        #Couldn't resolve host
        check_url_status=1
    else
        # Remove any trailing part of URL after the curl check
        LOCATION=$(echo "$_LOCATION" | sed -E 's#([^/])/[^/].*#\1#')

        if [ $scanType = "website" ]; then
            page="$LOCATION"
            check_url_status=0
        fi

    fi

}

# 3 step verification for sitemap
# 1) Check if domain is valid
# 2) Check as a whole, domain + path parameter
# 3) Check content of sitemap, check_sitemap_content; else login (which will be up to step 2 only)

check_domain_path_param(){

    check_website
    local _res_domain=$?

    if [ "$_res_domain" != "0" ]; then
        #Couldn't resolve host
        check_url_status=1

    else
        #2) Check if the whole URL provided is valid
        local _full_url="$LOCATION/$user_defined_trail"

        LOCATION=$(curl -o /dev/null --silent $_full_url)
        local _res=$?

        if [ "$_res" == "0" ]; then

            #3) Check content of provided sitemap file is valid
            if [ $scanType = "sitemap" ]; then
                get_sitemap_content=$(curl --silent $_full_url)
                check_sitemap_content

                if [ $check_sitemap_status = "1" ]; then
                    #Invalid sitemap provided
                    check_url_status=1
                else
                    page=$_full_url
                    check_url_status=0
                fi

            else
                # else just set status to be 0 (valid domain/path_param)
                # scanType is login
                page=$_full_url
                check_url_status=0
            fi

        else
            #Couldn't resolve host
            check_url_status=1
        fi

    fi

}



check_sitemap_content(){

    # Check if HTML tags exists
    # If not empty, means highly to NOT be a sitemap nor text sitemap
    local _check_if_html=$(echo "$get_sitemap_content" | egrep '^<!DOCTYPE html.*>|<html.*>|<head>|<body>')

    # Check if mandatory urlset tag exists
    # If not empty, means highly to be XML sitemap
    local _check_xml_sitemap=$(echo "$get_sitemap_content" | egrep '^<urlset')

    # Check if RSS/Atom tags exists
    # If not empty, means highly to be RSS sitemap
    local _check_rss_sitemap=$(echo "$get_sitemap_content" | egrep '^<link>|<updated>|<pubDate>')

    if [ -z "$_check_if_html" ]; then

        if [ -n "$_check_xml_sitemap" ] || [ -n "$_check_rss_sitemap" ]; then
            check_sitemap_status=0
        else
             # As we have verified that it's not a HTML page only
             # Check if it most likely to be text sitemap, by checking for URLs
             local _check_text_sitemap=$(echo "$get_sitemap_content" | egrep '^(http|https|\w{0,5}):\/\/.*')

             if [ -z "$_check_text_sitemap" ]; then
                check_sitemap_status=1
             else
                check_sitemap_status=0
             fi
        fi
    else
        check_sitemap_status=1
    fi

}


check_url() {

    local _page=$page

    # Strip off the protocol regardless of format
    local _strip_protocol=$(echo $_page | perl -pne 's/^(https|http|\w{0,5}):(?:\/{0,2})//g')

    # Get the main domain and user-defined trailing path, if any
    user_defined_trail=$(echo $_strip_protocol | cut -d'/' -f2)
    formatted_url=$_strip_protocol

    if [ $scanType = "sitemap" ]; then

        check_domain_path_param

    elif [ $scanType = "website" ]; then

        check_website

    fi

}

export -f check_installer_status
export -f clean_up
export -f sitemap_error
export -f website_error
export -f check_url
export -f prompt_website

