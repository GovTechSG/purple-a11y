#purple-hats
----

purple-hats is a customisable, automated accessibility testing tool that allows software development teams to assess whether their products are user-friendly to persons with disabilities (PWDs).

## Technology Stack
1. Apify (Puppeteer)
2. Axe-core
3. NodeJS (NPM)


## Installations
purple-hats includes installer scripts which automates the installation of the required components used by purple-hats. Currently, it is supported on macOS and Linux (Red Hat, Centos, Ubuntu, OpenSuse/Suse).

<details>
  <summary>Instructions for changing file permissions</summary>
  
  #### Commands to modify file permissions
  In the event you cannot access the files due to running the installer scripts with elevated privileges previously, you can modify the file permissions to the appropriate owner and group.

```shell
# Linux/Unix: The user id (uid) and group id (gid) by default should be the same
# MacOS: The uid and gid may differ, if the user group doesn't exist, set the group as staff

# You can check the current user's uid and gid with the following command
id

# Update permissions for files
# Can provide the name or numerical id
sudo chown <user:group> <filename>

# Update permissions for directories
sudo chown -R <user:group> <filename>
```
</details>


### MacOS
As MacOS does not have a builtin package manager. Node Version Manager (NVM) will be used to install NodeJS. Please run the installer script *mac-installer.sh*

```shell
# Navigate into the directory, if not done so
cd purple-hats/installers

# Run the installer script for MacOS with admin privileges
bash mac-installer.sh
```

```shell
# If you cannot run the script due to insufficient permission, assign execute permission to the file
chmod +x mac-installer.sh

# Run the script again
bash mac-isntaller.sh
```

### Linux
Depending on the Linux Distro, the builtin package manager (YUM, APT or Zypper) will be used for the respective Linux Distro to install NodeJS. Please run the installer script *linux-installer.sh*

```shell
# If you cannot run the script due to insufficient permission, assign execute permission to the file
chmod +x linux-installer.sh

# Run the script again
bash linux-installer.sh
```

## Features
purple-hats can perform the following functions to crawl the target URI. Results will be generated in JSON format before being compiled into a HTML file. To start using purple-hats, run the following command(s)

```shell
# Navigate into the directory, if not done so
cd purple-hats

# Execute run.sh with admin privileges to start using purple-hats
bash run.sh
```

> NOTE: An online test-site by Web Scraper is used to demonstrate purple-hats' features.


### 1. Crawling of sitemap
The crawler will then generate the results based on the links found **within the provided URL**.

**Required inputs**
- URL linking to the sitemap file
- Examples of valid sitemap format
  - XML (Recommended): https://www.sitemaps.org/sitemap.xml
  - RSS: https://itunes.apple.com/gb/rss/customerreviews/id=317212648/xml
  - Text: https://www.xml-sitemaps.com/urllist.txt  
- For more information on sitemap: https://www.sitemaps.org/protocol.html

**Sample Output**

```console
user@user-MacBook-Pro  Desktop % cd purple-hats
user@user-MacBook-Pro purple-hats %  bash run.sh
Welcome to HAT's Accessibility Testing Tool!
We recommend using Chrome browser for the best experience.

What would you like to scan today?
1) sitemap.xml file containing links
2) public domain URL
#? 1
Please enter file link: https://webscraper.io/test-sites/e-commerce/allinone
Scanning website...

#The crawler will then start scraping from the file link provided above.
#Console results

user@user-MacBook-Pro purple-hats %
```

### 2. Crawling of Domain
The crawler will recursively visit the links to generate the results from **all the pages found from the input domain**. This will take a longer time depending on the number of links and pages that are being transversed.

Under this feature, it will also take into consideration of the presence of a login page.


#### 2. Crawling of PublicDomain w/o Login Page
**Required inputs**
- A website URL

**Sample Output - Public Domain without Login Page**
```console
user@user-MacBook-Pro  Desktop % cd purple-hats
user@user-MacBook-Pro purple-hats % bash run.sh
Welcome to HAT's Accessibility Testing Tool!
We recommend using Chrome browser for the best experience.

What would you like to scan today?
1) sitemap.xml file containing links
2) public domain URL
#? 2
Please enter domain URL: https://webscraper.io/test-sites/e-commerce/allinone
Do you need to login to your domain? Y/N: N
Scanning website...

#The crawler will then start scraping from the file link provided above.
#Console results

user@user-MacBook-Pro purple-hats %
```

### 3. Crawling login page
The crawler will automated the login and recursively visit the links to generate the results from **all the pages found from the input domain**.

**Required inputs**
- A website URL
- User's login credential
- Selectors of the username field, password field and submit button field

**Sample Output - Public Domain with Login Page**
```console
user@user-MacBook-Pro  Desktop % cd purple-hats
user@user-MacBook-Pro purple-hats %  bash run.sh
Welcome to HAT's Accessibility Testing Tool!
We recommend using Chrome browser for the best experience.

What would you like to scan today?
1) sitemap.xml file containing links
2) public domain URL
#? 2
Please enter domain URL: https://fontawesome.com/sessions/sign-in
Do you need to login to your domain? Y/N: y
Please enter your login ID: user@gmail.com
Please enter your password: 

Now, go to your browser and right-click on these 3 elements,
1. Username field
2. Login password field
3. Submit button

Select 'inspect' and 'copy selector'
Next, navigate back here and paste the selector one by one.

Please enter “username field” selector: #email_address
Please enter “login password field” selector: #password
Please enter “submit button” selector: #page-top > div.view.flex.flex-column.min-vh-100.db-pr > div.flex-grow-1.flex-shrink-0.flex-basis-auto.flex.flex-column > main > div.relative.z-1.mw6-l.center-l > div > form > button
Scanning website...

#The crawler will then start scraping from the file link provided above.
#Console results

user@user-MacBook-Pro purple-hats %
```






