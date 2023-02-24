---
layout: post
title: Localising your Solidus Store to your needs
---

Ecommerce platforms, libraries and gems, especially open source projects like Solidus, all have a common issue, which is that they try to cater to everybody. This approach allows for the project to be accessible and useful for a lot of developers around the world, but the disadvantage of this approach is that usually the developer has to do a lot of manual work to make that ecommerce application serviceable in the real world. The problem is that, it is quite a challenge to set up the application with the correct currency for the products, payment providers and taxes for the region the ecommerce store is being operated in.
This is a big problem for users that are new to Solidus and even users who have done this a thousand times can find the process very tedious and not user-friendly at all.

So, what's the solution to this problem? If you ask me, the solution is an approach that allows Solidus users to quickly configure their applications to their local rules and regulations. This includes configuring all the currency changes and basic tax calculators for them.

I have developed an extension for Solidus that does exactly the same for the Indian region.

## Solidus India
Let me introduce you to Solidus India. You can checkout the project using this link ([Solidus India project](https://github.com/piyushswain/solidus_india){:target="_blank"}).
Solidus India does what it's name suggests, it makes Solidus Indian. This is an extension for Solidus that modifies the sample store to make it easy for new and experienced users to setup Solidus in their local context.

The Solidus India extension does the following things for the sample store.
1. Adds seeds that add products with prices in INR(₹).
1. Adds basic tax categories and tax rates for taxes in the Indian context like GST.
1. Adds tax calculators to support these tax calculations.
1. Adds basic shipping methods and categories.

## How to Use
Solidus India is very simple to use for Solidus users. Here are the steps to quickly convert your sample Solidus Store into a sample indian ecommerce store.
1. Run the Solidus install process and wait for it to finish. You can find the details [here](https://guides.solidus.io/getting-started/installing-solidus/){:target="_blank"} if you are new to Solidus or want the instructions anyway.
1. Add the gem `solidus_india` to your `Gemfile` or use the command `bundle add solidus_india`.
1. Run the rake task `rails generate solidus_india:install` and let the operation complete
1. Go to the file `config/initializers/spree.rb` and change the line

```rb
# Default currency for new sites
  config.currency = "USD"
```

to

```rb
# Default currency for new sites
  config.currency = "INR"
```
Now just start the server and everything will be set up for you to get a sample Solidus Store set in the Indian context.

It's really that easy.

## Scope and Future of Solidus India
Solidus India is a very good starting point for developers using Solidus who want to create a new ecommerce application in an Indian context and it still has a lot of scope for improvement.

One major area of development is adding default payment providers that work in India. Extensions like Razorpay and Paytm could be added by default to allow easy payment processing out of the box for sandbox and also production environments.

Also, this extension can be used as a base for multiple other localised extensions, like a Solidus Japan or a Solidus Italy, which can be built on top of all the features in Solidus India to localise the sample store for another region.

---

Provided all these factors, this extension is a step in the right direction for Solidus to help new and experienced users alike to setup and work on localised Solidus stores in India. Also, for developers around the world, with other upcoming localised extensions for Solidus like Solidus India, this area could become a strength for Solidus in the future.
