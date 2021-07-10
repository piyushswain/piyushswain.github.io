---
layout: post
title: Fixing an issue caused by Docker 3.3.0 in the CI pipelines for our Rails app
---

So, recently we started seeing an issue with our CI pipelines in Gitlab. The issue was that most of the tests used to fail and gave an `ActiveStorage::IntegrityError`. This was kind of confusing as it had popped up seemingly out of nowhere one morning and we also hadn't encountered this issue earlier.

## The search begins
We needed to crush this bug as soon as possible and started to look for the origin of this issue. Interestingly, on closer inspection, we found that only 2 out 3 of our gitlab-runners running on our CI pipelines were giving us this error.

Our first instinct was that there might be something wrong with the runners. So, we reinstalled one of the gitlab-runners and tried running our CI pipeline on it again but still the issue persisted. Mind you, our whole test suite was running fine on all our local development environments.

After some more hours of hair pulling and perplexion, we started to look at things that we might have updated in the past few days. We found that we had updated Gitlab and also docker on 2 out of our 3 runners and these were the 2 runners on which the CI pipeline was constantly failing. Ahaa!! some correlation finally.

As it turns out, both our gitlab-runners that were having the issue were running on docker version 3.3.2 and the one which didn't have the issue was running on docker version 2.2.0. This was extremely strange as the one's running on the newer version of docker were having issues but the one running on the older version of docker was having no issues at all. In an ideal world you would expect the opposite, but not here.

Now, since we were fairly confident that we had narrowed down the issue, so to test our hypothesis we decided to downgrade docker on one of the runners. We downgraded from docker version 3.3 to docker version 3.0 and Voila!! That runner didn't have any issue with our CI pipeline after the downgrade.

## The issue and our learnings
We could have taken the easy way out and downgraded the docker version on our other runner as well, but we started to look for a solution, without downgrading docker. So, after spending a few hours crawling through docker and rails community forums, we found a lot of helpful posts from a lot of people having the same issues and trying to solve them.

I'll explain what we learned from digging through the forums as briefly as possible.
- In the docker update 3.3.0, there was a possible bug introduced which causes files to not be created properly under certain situations.
- You can observe this issue by running the following script in a docker container for a ruby image running docker version 3.3.0 or higher.

```ruby
require 'fileutils'
require 'tempfile'

# Create a tempfile and copy some mounted file into the tempfile
tempfile_1 = Tempfile.new(['tempfile_1', ".txt"])
FileUtils.cp('some/mounted/path/example.txt', tempfile_1.path)

puts tempfile_1.read #This should return some data

# Create another tempfile and copy the first tempfile into the second tempfile
tempfile_2 = Tempfile.new(['tempfile_2', ".txt"])
FileUtils.cp(tempfile_1.path, tempfile_2.path)

puts tempfile_2.read # This will be empty, but it should not be. This highlights the issue we are talking about.
```

- If you run this same script on the same ruby image container but on docker version 3.2.2.2 or lower, then you won't observe this issue.
- Apparently something similar to this is being used by the method `fixture_file_upload` that we use to upload files from `'tests/fixtures'` directory in our test suite.
- The reason we were getting the `ActiveStorage::IntegrityError` was because the `fixture_file_upload` method returned a file of 0 bytes and ActiveStorage couldn't handle this as it wasn't a valid file.

## Fixing the issue
At the time of writing this post, docker has released version 3.5.1 which still has the same issue.
But we needed our pipelines to run on newer versions of docker as well, downgrading wasn't as option that we wanted to consider. So, we went on to write a replacement for the `fixture_file_upload` method in our `TestHelper` and use that instead.

This is the function that we wrote with help from the Rails community forums.

```ruby
def upload_file(src, content_type, binary = false)
  path = Rails.root.join(src)
  original_filename = ::File.basename(path)

  tempfile = Tempfile.open(original_filename) #create a new tempfile

  content = File.open(path).read # Extract content of the original file  
  tempfile.write content # Write all content from original file to the tempfile

  uploaded_file = Rack::Test::UploadedFile.new(tempfile, content_type, binary, original_filename: original_filename)

  uploaded_file
end
```

`fixture_file_upload` also returns the same `Rack::Test::UploadedFile` object but the difference is in how it creates the `tempfile` that is used to generate that object.

Here, we manually create that `tempfile` and pass it to the `Rack::Test::UploadedFile` object and return it to ensure that it functions the same way as the `fixture_file_upload` method.

You can find additional information regarding this issue and the discussion around it by following these links.
- [https://github.com/docker/for-mac/issues/5570](https://github.com/docker/for-mac/issues/5570)
- [https://api.rubyonrails.org/classes/ActionDispatch/TestProcess/FixtureFile.html](https://api.rubyonrails.org/classes/ActionDispatch/TestProcess/FixtureFile.html)
