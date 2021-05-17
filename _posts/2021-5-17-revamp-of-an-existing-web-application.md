---
layout: post
title: Revamp of our Coding Platform
---

#### _The story of how we took a good platform and made it even better_

Before I start telling you this story, I want to just make this clear that this is not filled with technical details of our implementation but rather with the thought process and the journey of redeveloping our coding platform. I will definitely share my learnings and some technical details of this whole endeavour in later blog posts.

So, this story starts in October 2019, with me looking at a web application that I inherited from previous developers at the organisation that I had joined 6 months earlier and thinking to myself that, "Here we have a perfectly functional web application that does it's job pretty well, but still why does it feel so underwhelming and out of place on the modern web".


### Realization

What I realized after 2 days of pondering on this topic was that, with the way web applications and their popularity has been growing in our times, The UX had become as important as the function of the web application.

If that was not clear, then let me explain further. In broad terms we can breakdown the components of a web application into 2 areas - 
* Back End or Server Side components
* Front End or User Side components

The **Back End** controls the functions of the web application, what it can do and how efficiently it can do that task.

While the **Front End** dictates the interaction between the user and the application.

Now, both of these components need to be as good as the other one to ensure that your web application provides a seamless experience. In the case of our coding platform, this was not true, as we had a great **Back End** implementation but the **Front End** felt like it was still stuck in the early 2010s.

{% include image.html url="/images/codelitmus_old_dashboard.png" %}
{% include image.html url="/images/codelitmus_old_pl.png" %}
{% include image.html url="/images/codelitmus_old_editor.png" description="Old Coding Platform User Interface" %}


### Identify the Issue

I knew I wanted to change this platform, but it was important to focus on a few specifics instead of getting bogged down by all the things I wanted to improve. So, I sat down with my colleague [Shubham Pandey](https://www.shubhampandey.in) (Please do checkout his blog and website. He has some amazing stuff on there) and we tried to categorise the problems in the platform under a few broad umbrellas.

**Experience** - We used this category to encompass all the problems that were related to causing an inconvenience to the user who was using our platform.
Some of the problems we put under this category were things like the user not being able to see the list of problems while coding, the user's event time starting before they can see the editor, not being able to see the result and the problem statement at one time and a few more things similar to these problems.

**Interface** - We brought all the issues regarding design, layouts and colours on the platform under this category.
Problems like the text being too small in some places, buttons not being of a standard size, the event timer not eye catching feature of the design and again a few more problems similar to these ones.

The actual list was a lot longer than mentioned here but, all of them importantly came under these two broad categories.


### Setting Objectives

Now that we had our problem well-defined, we could move on to coming up with a plan of action to solve these problems. To solve these problems we started thinking like a user who had minimal technical background to give us a set of objectives.

One of the biggest issues we noticed was the number of clicks that a user had to go through to reach the problem and start coding. On the old platform, a user had to go through the following steps to start their event:

`=> Login`

`=> Find event on dashboard`

`=> Click on "Load Challenge"`

`=> Find/Select a problem from the list`

`=> Click on "Start"`

`=> Start Coding`

This was a lot of clicks to start an event on a platform dedicated to hosting coding events and we needed to reduce this as every click meant a complete page reload.

>**Objective 1:** Reduce the amount of clicks a user needs to reach the Coding Test

>**Objective 2:** Minimise Page Reloads

Another issue was the dated look and feel of the UI. It did not feel slick or intuitive. This might have been a very good UI by 2012 standards but for 2019 it was not up to the mark.

>**Objective 3:** Modernise the UI

We found another issue with the editor we were using on the platform. We used Codemirror on the older platform which although was a good editor, had a few problems that were holding it back. The size of the library was huge, we had to load multiple script tags to access the full set of features, few editing options were missing and some more.

**P.S :** After the recent Codemirror 6 updates some of these problems were solved but at that time there was no confirmation if that would be the case.

>**Objective 4:** Use a featureful coding editor with long term support

So, these were the 4 objectives that we set out to achieve in the first version of our new coding platform. Even though this was technically an overhaul of an existing project, we had started calling it "new" so that we start thinking for solutions from scratch instead of just updating a few things and complicating the whole code base and the project even more.

### Plan of Action and Execution

To achieve our 4 objectives, we selected the following libraries and plugins and I will also briefly explain why we opted for these:
1. REACT
2. Bootstrap
3. Monaco Editor

To achieve **Objectives 1 & 2**.
We decided that we had to change flow of the user journey on the platform.
This was the only way that we could reduce the amount of clicks on the platform and for minimising page reloads, REACT came to our rescue.

REACT allowed us to develop, what we call a SPA (Single Page Application) quite easily and without much hassle.
I will explain the specific use cases and advantages of a SPA in a future blog post.
Also an added benefit was that REACT had a pretty simple integration with our existing application which is a Ruby on Rails based web application. We integrated REACT into our Rails 5.2 application using the webpacker gem.
After Rails 6 the webpacker gem now comes as standard with Rails so using REACT as front end for a Rails application has become easier now.

Bootstrap is a very popular library that makes developing beautiful UIs very simple with its plethora of classes and functionality that it offers. So, that was a very obvious choice to achieve **Objective 3**.

And lastly Monaco Editor is also a very popular and well-supported coding editor. It is being officially maintained by Microsoft and contains a lot of features that Virtual Studio Code Editor provides on a desktop. That makes it an obvious choice when we were deciding on an editor to use for our platform to achieve **Objective 4**.

Now you can check out the redeveloped platform and see how we executed our plan.

{% include image.html url="/images/codelitmus_new_dashboard.png" %}
{% include image.html url="/images/codelitmus_new_editor_pl.png" %}
{% include image.html url="/images/codelitmus_new_editor_pd.png" description="New Coding Platform User Interface" %}

Remember, the number of clicks the older platform required to get to the actual coding? That has been reduced to the following now in this new platform:

`=> Login`

`=> Find event on dashboard`

`=> Click on "Load Challenge"`

`=> Start Event`

That's it. Everything was compressed into a single page to provide a more intuitive and easy to use coding platform that would allow the candidate to focus on coding more than worrying about other things. We tried to make everything else like time, problem list, result etc. available at a glance whenever the candidate needs it.

And if you are wondering, we did add a "Dark Mode" also, which has become quite the rage nowadays in modern web design. Notice the sun and moon icons on the right edge of the top bar that denoted the Light and Dark Modes respectively.

{% include image.html url="/images/codelitmus_new_dashboard_dark.png" %}
{% include image.html url="/images/codelitmus_new_editor_pl_dark.png" %}
{% include image.html url="/images/codelitmus_new_editor_pd_dark.png" description="Coding Platform in Dark Mode" %}

So, that was the story of how we did a complete overhaul of our coding platform to make it fit for the modern web.
It took us about 2 months to complete this project, from coming up with the concept, finalising the technical specifications, development, testing and finally deployment.

The process that we followed is what I still use whenever I have to come up with a solution to any problem. That is probably the biggest learning that I took from this project along with learning REACT and developing Single Page Applications that I use quite a lot now.
