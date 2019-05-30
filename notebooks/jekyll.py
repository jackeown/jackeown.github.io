# modification of config created here: https://gist.github.com/cscorley/9144544

from urllib.parse import quote
import os
import sys

c = get_config()
c.NbConvertApp.export_format = 'markdown'
c.MarkdownExporter.template_path = ['.'] # point this to your jinja template file (jinja template makes jekyll template...confusing)
c.MarkdownExporter.template_file = 'generatedTemplate'

# modify this function to point your images to a custom path
# by default this saves all images to a directory 'images' in the root of the blog directory
def path2support(path):
    """Turn a file path into a URL"""
    return '{{ BASE_PATH }}/assets/images/' + path #os.path.basename(path)

c.MarkdownExporter.filters = {'path2support': path2support}
