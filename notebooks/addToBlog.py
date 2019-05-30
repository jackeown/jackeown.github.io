# This file should take in a jupyter notebook and an author name.
# it will use jupyter nbconvert to convert the notebook to markdown 
# (with some Front Matter for jekyll)
# 
# This script will then copy that md file along with any images created
# into the jekyll site located at ../jekyllSite relative to where this script
# was run.

import sys, os
import re
import datetime

try:
    notebook, title, author = sys.argv[1:]
except Exception as e:
    print("usage: python addToBlog.py notebook.ipynb \"Best Blog Post Ever!\" \"John Smith\"")

# Create custom jekyll template using the appropriate author and title
baseTemplate = open("baseTemplate.tpl", "r")
generatedTemplate = open("generatedTemplate.tpl","w")

frontMatter = \
f"""
author: {author}
title: {title}
"""

generatedText = baseTemplate.read()
baseTemplate.close()

generatedText = re.sub(r"HereToBeReplaced", frontMatter, generatedText)
generatedTemplate.write(generatedText)
generatedTemplate.close()


# Apply that generated jekyll template using nbconvert.
now = datetime.datetime.now()
outFileName = now.strftime('%Y-%m-%d')
outFileName += "-"
outFileName += title.replace(' ','_')
outFileName += ".md"

os.system(f"""jupyter nbconvert {notebook} --config jekyll.py --output {outFileName}""")

# copy files to jekyll _posts and images.
# but first make sure a previous version isn't already there...
try:
    os.system(f"""rm -rf ../jekyllSite/assets/images/{outFileName.split('.')[-2]}_files""")
    print("updated/removed old stuff")
except:
    print("no old stuff")

os.system(f"""mv {outFileName} ../jekyllSite/_posts/""")
os.system(f"""mv {outFileName.split('.')[-2]}_files ../jekyllSite/assets/images/""")