---
layout: default

author: James McKeown
title: Seconded Post

---
# This is a blog post jupyter notebook!!!


{% highlight python %}
from IPython.display import HTML

# Youtube
HTML('<iframe width="560" height="315" src="https://www.youtube.com/embed/O-MQC_G9jTU" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>')

{% endhighlight %}




<iframe width="560" height="315" src="https://www.youtube.com/embed/O-MQC_G9jTU" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>




{% highlight python %}
from matplotlib import pyplot as plt
import numpy as np

%matplotlib inline
{% endhighlight %}


{% highlight python %}
xs = list(range(100))
ys = np.sin(xs)
plt.plot(xs,ys)
plt.show()
{% endhighlight %}


![png]({{ BASE_PATH }}/assets/images/2019-05-30-Seconded_Post_files/2019-05-30-Seconded_Post_3_0.png)


$$\displaystyle\sum_1^\infty x = 10$$


{% highlight python %}

{% endhighlight %}
