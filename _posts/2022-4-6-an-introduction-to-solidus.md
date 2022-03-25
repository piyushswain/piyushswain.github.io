---
layout: post
title: An Intoduction to Solidus
---

In 2022, if someone wants to start their own ecommerce store then they have broadly 2 options, use an ecommerce platform like Shopify, Magneto or Wix or build your own web application from scratch. If you choose to go the first way as most people do then that's great as it allows you to get your store up and running very quickly but it comes with certain limitations.

- It can be as hard as a custom built website to customize the theme and layout for the store.
- Sometimes you don't get any email hosting services or have to pay quite a lot more for them, a properly fully featured ecommerce website could cost upto $300 per month
- You might have to pay additionally for certain apps or integrations that might be necessary for your store.
- Certain customization options and themes might be free, but modifiying functionality and getting truly great themes and layouts would also incur additional costs on you.

This can make it quite a difficult option for small to medium businesses looking to stand out from the crowd and create something unique and have a very different identity.

So, what's the other option? The other option is to build your own web application from scratch and host it. Although this requires some degree of technical knowledge and if you have that knowledge in your team then this is the best way to go. Although here the difficulty comes when you try to create an ecommerce application. A typical ecommerce application has a lot of moving parts and functionalities that keep all processes working correctly and this can be quite hard to achieve in the first go even for a experienced development team. This can in turn increase the turnaround time for your store.

And this is exactly where **Solidus** comes in.


## What is Solidus

In it's own words, Solidus is the only ecommerce platform you'll ever need once you start using it, and it's true because you can do almost anything you can imagine with it.

You want a custom truly unique theme and design, you can have it.

You want 10 different payment partners for different type of products, you can do that.

You want a unique stock management solution, you can do that as well.

You want people to go through a quiz before or after buying a product, that can be done as well.

I can go on but you may have understood by now that you can have a store that gives a unique custom experience to your customers similar to a large scale, highly developed ecomeerce store by using Solidus.

In technical terms, Solidus is a ruby gem that you can add to a Rails project and instantly get an ecommerce web application up and running. It is an open source project that provides an ecommerce framework for developers to work with instead of having them build everything from scratch.

You can check out the official solidus demo by clicking on the link [here](http://demo.solidus.io/){:target="_blank"}

## How to use Solidus

It is quite simple to start using Solidus though, you just add the following line in the Gemfile for your Rails application

```rb
gem 'solidus'
```
OR

use the following command in the root folder of your Rails project
```shell
bundle add solidus
```

After that you have to use the following command to allow solidus to setup the ecommerce framework in your project.
```shell
bin/rails g solidus:install
```

Once this command has finished successfully, you can start your rails server and see your ecommerce web application in action., if you haven't made any other modifications to the project yet

This is what you'll see at the homepage of your rails application.

{% include image.html url="/images/solidus_home.png" description="Homepage of the Solidus store" %}

Solidus also provides you with the full admin functionalities to manage your store as well. You can access this at the `/admin` path and after logging in it looks like this.

{% include image.html url="/images/solidus_admin.png" description="Admin Page of the Solidus store" %}

Every part of an ecommerce application that you need, be it order management, a stock management solution, setting up discounts and promotional coupons, user registration and management, setting up shipping solutions and status, tax calculations on order. All of these parts of an ecommerce application come out of the box with Solidus.

The only part you'll find missing before taking your store live is a payment provider for your store. But that can also be easily fixed by just adding a supporting gem to your project that adds a payment provider to your store. You can browse a selection of available payment provider gems here at this [link](https://guides.solidus.io/developers/payments/payment-service-providers.html#payment-service-providers){:target="_blank"}.

You can find popular payment providers like Paypal, Klarna, Razorpay etc. on here and if you want to build your own integration for a payment provider you can do that as well.

## Why Solidus?

Apart from the plug and play nature of Solidus for an ecommerce store, the biggest advantage of using Solidus is the freedom of customizing and building your store how you want to.

Solidus provides a developer freedom to mould their website in anyway they like. A developer can even pick and choose what componets of the solidus gem they would like to use.

If you want to use only the core models and helpers for an ecommerce platform and design your own store and admin interface around it, you can only use the `solidus_core` gem instead of the full `solidus` gem.

If you want the admin part of solidus but want to design your own store interface, you can do that too by using only the `solidus_core` and the `solidus_backend` gems.

Similarly, if you want the default store that solidus provides and build your own admin solution, then you can use only the `solidus_core` and the `solidus_frontend` gems.

Further, if you don't want to design a completely new interface from scratch, but you want to just customize some of the views to your liking, then you can do that by overriding the views or by using the Deface gem. You can find a guide to overriding and customizing views here at this [link](https://guides.solidus.io/developers/views/override-views.html){:target="_blank"}.

You can also customize any assets provided by solidus. You can find a guide to override assets here at this [link](https://guides.solidus.io/developers/assets/override-solidus-assets.html){:target="_blank"}.

And that is not all.

You can also customize the functionality that solidus offers. If you want add a functionality to any of the models, controllers, helpers, services etc provided by solidus, you can do that too.

How cool is that ?

Let's say you want to add a functionality to your application where everytime a product is created by an admin, you want a mail to be sent so that everyone in your team is notified about the product. You can do this in solidus by simply writing a `decorator`. A `decorator` is a file that contains additional methods and definitions for a pre-existing class.

So, for our above mentioned problem statement, we can add a file, which has to named `product_decorator.rb` and has the following content.

```rb
Spree::Product.class_eval do
  def self.prepended(base)
    base.after_create :send_product_notification
  end


  private

  def send_product_notification
    # Code to send a product notification email
  end

  Spree::Product.prepend self
end
```

This can be done for any and all classes in Solidus. You can follow this [link](https://guides.solidus.io/developers/customizations/decorators.html){:target="_blank"} to know more about decorators and customization for classes in Solidus.

And this is why I keep repeating throughout this post that when it comes to freedom or what you can do with your ecommerce store, there probably isn't a better alternative to Solidus right now and that is exactly **'Why Solidus?'**.

---

In the next post I will talk about a solidus payment service provider integration for **Razorpay** and also tell you how you can build your own solidus extension to do the same for another payment service of your choice.
