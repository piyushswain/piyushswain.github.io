---
layout: post
title: Usage of yarn link
---

This post shares the use of the `yarn link` command and how it simplifies development of npm and specifically REACT npm packages.

## What is `yarn link`

`yarn link` is a command that helps during the development of npm packages. It links a local npm package to an existing project that uses yarn package manager.

What this does is that it removes the need to create a new example project to test your npm package in development.

## How to use

To use the `yarn link` command, first you go the root of your local npm package and then type in the command

```shell
yarn link
```

Let's say the name of my local npm package is `example-npm-package`. Then the output will look something like this.

```shell
yarn link v1.22.10
success Registered "example-npm-package".
info You can now run `yarn link "example-npm-package"` in the projects where you want to use this package and it will be used instead.
```

Now, You can go to your existing project that uses the yarn package manager and use the following command to start using your local npm package.

```shell
yarn link "example-npm-package"
```

If everything is working fine then you will see the following output

```shell
yarn link v1.22.10
success Using linked package for "react-rails-pagination".
```

And Voila!! You are now using your local npm package in your project.

Make sure that the npm package is already being used by the project. The `yarn link` command creates a symlink in the `node_modules` folder of your project to the local copy of your npm package.

To see the changes you made are working, you will have to run the command `yarn install --force` to recompile all packages.

## How to stop

If you have tested your npm package and are ready to publish, you can now safely unlink your package from your projects and add the published packages instead.

You will have to first go to the root of your local npm package and type in the command

```shell
yarn unlink
```

This should give you the following output

```shell
yarn unlink v1.22.10
success Unregistered "example-npm-package".
info You can now run `yarn unlink "example-npm-package"` in the projects where you no longer want to use this package.
```

Now you can go to your project and type

```shell
yarn unlink "example-npm-package"
```

If everything works fine then you should see the following output

```shell
yarn unlink v1.22.10
success Removed linked package "react-rails-pagination".
info You will need to run `yarn install --force` to re-install the package that was linked.
```

This will remove all symlinks and allow you to again use the published npm packages instead of the local ones.

Again, you will have to run the `yarn install --force` command to recompile all packages.
