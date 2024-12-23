# Contribution Guide

zx is a fully [open-source project](https://github.com/google/zx), which is developing by the community for the community. 
We welcome contributions of any kind, including but not limited to:
* Bug reports
* Feature requests
* Code contributions
* Documentation improvements
* Discussions

https://google.github.io/zx/contribution

## Community Guidelines

This project follows [Google's Open Source Community Guidelines](https://opensource.google/conduct/).
In short: all contributors are treated with respect and fairness.

## Contributor License Agreement

Contributions to this project must be accompanied by a Contributor License
Agreement. You (or your employer) retain the copyright to your contribution;
this simply gives us permission to use and redistribute your contributions as
part of the project. Head over to <https://cla.developers.google.com/> to see
your current agreements on file or to sign a new one.

You generally only need to submit a CLA once, so if you've already submitted one
(even if it was for a different project), you probably don't need to do it
again.

## How to Contribute
Before proposing changes, look for similar ones in the project's [issues](https://github.com/google/zx/issues) and [pull requests](https://github.com/google/zx/pulls). If you can't decide, create a new [discussion](https://github.com/google/zx/discussions) topic, and we will help you figure it out. When ready to move on:

* Prepare your development environment.
  * Switch to the recommended version of Node.js
    * Install manually `Node.js >= 22`.
    * Delegate the routine to any version manager, that [supports .node_version config](https://stackoverflow.com/questions/27425852/what-uses-respects-the-node-version-file)
    * Use [Volta](https://volta.sh/), the target version will be set automatically from the `package.json`
  * Bash is essential for running zx scripts. Linux and macOS users usually have it installed by default. Consider using [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install) or [Git Bash](https://git-scm.com/downloads) if you are on Windows.
* Fork [the repository](https://github.com/google/zx).
* Create a new branch.

* Make your changes.
  * If you are adding a new feature, please include additional tests. The coverage threshold is 98%.
  * Create a [conventional-commits](https://www.conventionalcommits.org/en/v1.0.0/) compliant messages.
* Ensure that everything is working:
  * `npm run fmt` to format your code.
  * `npm run test:coverage` to run the tests.
* Push the changes to your fork.
* Create a pull request.
  * Describe your changes in detail.
  * Reference any related issues if applicable.

## Code Reviews

All submissions, including submissions by project members, require review. We use GitHub pull requests for this purpose. Consult [GitHub Help](https://help.github.com/articles/about-pull-requests/) for more information on using pull requests.

## License

The project is licensed under the [Apache-2.0](https://github.com/google/zx?tab=Apache-2.0-1-ov-file#readme)
