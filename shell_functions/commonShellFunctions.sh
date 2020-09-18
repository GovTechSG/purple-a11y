#!/bin/bash

check_reformat_url() {
    # added a check to see whether the input URL have // after http: or https:
    check_bad_url=$(echo $page | perl -n -e '/^(https|http):(?!\/\/).*$/ && print')
    if ! [ -z "$check_bad_url" ]
    then
        # for url in this format (eg. https:isomer.gov.sg without //)
        # remove http:
        reformat_url=$(echo $page | sed -E 's/(https|http)://g')
    else
        # for url in this format (eg. https://isomer.gov.sg) with the //
        # remove http://
        reformat_url=$(echo $page | sed -E 's/^(https|http)(:\/\/)//g')
    fi

    # get the main domain to let curl check
    get_main_domain=$(echo $reformat_url | cut -d'/' -f1)
    LOCATION=$(curl -Ls -w %{url_effective} -o /dev/null $get_main_domain)

    # to remove any trailing part of URL after the curl check
    LOCATION=$(echo $LOCATION | sed -E 's#([^/])/[^/].*#\1#')

    if ! [[ "$LOCATION" == */ ]]
    then
        # if there is removal of trailing part after the check,
        # need to add a / behind the URL
        LOCATION="$LOCATION/"
    fi

    # check whether user input URL has trailing parts and attach the trailing parts
    # back to the main domain URL if present
    check_for_trail_ends=$(echo $page | perl -n -e '/(?!\/\/).((\/\w+)+\/?).*$/ && print')

    if [ "$check_for_trail_ends" ]
    then
        page="$LOCATION${page##*/}"
    else
        page="$LOCATION"
    fi
}

export -f check_reformat_url
    if [ $scanType = "sitemap" ]; then
