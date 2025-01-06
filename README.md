# Command-line tools for OS384

When releasing a new version 'x.y.z':

```bash
    # update constant "VERSION" in 'utils.lib.ts' to be 'x.y.z'
    git add . && git commit -m "version x.y.z" && git push

    # then update tag to match
    git tag x.y.z

    # and push the tag update
    git push --tags
```

The tag push will trigger the workflow

When using the package:

```bash
    brew tap 384co/os384-cli
    brew install os384-cli
    384 --help # confirm
```

For reference, to 'hard-reset' when using package:

```bash
    brew uninstall os384-cli
    brew untap 384co/os384-cli
    brew tap 384co/os384-cli
    brew install os384-cli
    384 --version # confirm
```
