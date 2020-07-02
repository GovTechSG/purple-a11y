#purple-hats
----

purple-hats is a customisable, automated accessibility testing tool that allows software development teams to assess whether their products are user-friendly to persons with disabilities (PWDs).

## Technology Stack
1. Apify (Puppeteer)
2. Axe-core
3. NodeJS (NPM)


## Installations
purple-hats includes installer scripts which automates the installation of the required components used by purple-hats. Currently, it is supported on macOS and Linux (Red Hat, Centos, Ubuntu, OpenSuse/Suse).

> **NOTE: Please run the scripts with admin privileges.**

### MacOS
As MacOS does not have a builtin package manager. Node Version Manager (NVM) will be used to install NodeJS. Please run the installer script *mac-installer.sh*

```console
# Navigate into the directory, if not done so
cd purple-hats/installers

# Run the installer script for MacOS with admin privileges
sudo sh mac-installer.sh
````

```console
# If you cannot run the script due to insufficient permission, assign execute permission to the file
chmod +x mac-installer.sh

# Run the script again
sudo sh mac-isntaller.sh
```

### Linux
Depending on the Linux Distro, the builtin package manager (YUM, APT or Zypper) will be used for the respective Linux Distro to install NodeJS. Please run the installer script *linux-installer.sh*

```console
# Navigate into the directory, if not done so
cd purple-hats/installers

# Run the installer script for MacOS with admin privileges
sudo sh linux-installer.sh
````

```console
# If you cannot run the script due to insufficient permission, assign execute permission to the file
chmod +x linux-installer.sh

# Run the script again
sudo sh linux-installer.sh
```


## Features (stand-alone)
purple-hats can perform the following functions to crawl the target URI. Results will be generated in JSON format before being compiled into a HTML file. To start using purple-hats, run the following command(s)

```console
# Navigate into the directory, if not done so
cd purple-hats

# Execute run.sh with admin privileges to start using purple-hats
sudo sh run.sh
```

> NOTE: An online test-site by Web Scraper is used to demonstrate purple-hats' features.


### 1. Crawling of sitemap
The crawler will then generate the results based on the links found **within the provided URL**.

**Required inputs**
- A public URL where sitemap.xml file is hosted

**Sample Output**

```console
user@user-MacBook-Pro  Desktop % cd purple-hats
user@user-MacBook-Pro purple-hats % sudo sh run.sh
Welcome to HAT's Accessibility Testing Tool!
We recommend using Chrome browser for the best experience.

What would you like to scan today?
1) sitemap.xml file containing links
2) public domain URL
#? 1
Please enter file link: https://www.google.com/sitemap.xml
Scanning website...

#The crawler will then start scraping from the file link provided above.
#Console results

user@user-MacBook-Pro purple-hats %
```

### 2. Crawling of Domain
The crawler will recursively visit the links to generate the results from **all the pages found from the input domain**. This will take a longer time depending on the number of links and pages that are being transversed.

Under this feature, it will also take into consideration of the presence of a login page.


#### 2. Crawling of PublicDomain
**Required inputs**
- A public domain URL

**Sample Output**
```console
user@user-MacBook-Pro  Desktop % cd purple-hats
user@user-MacBook-Pro purple-hats % sudo sh run.sh
Welcome to HAT's Accessibility Testing Tool!
We recommend using Chrome browser for the best experience.

What would you like to scan today?
1) sitemap.xml file containing links
2) public domain URL
#? 2
Please enter domain URL: https://webscraper.io/test-sites/e-commerce/allinone
Scanning website...

#The crawler will then start scraping from the file link provided above.
#Console results

user@user-MacBook-Pro purple-hats %
```
