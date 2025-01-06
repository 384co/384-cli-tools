## Command-line tools for OS384

```bash
    # when releasing 'x.y.z':

    # update constant "VERSION" in 'utils.lib.ts' to be 'x.y.z'
    git add . && git commit -m "version x.y.z" && git push

    # then update tag to match
    git tag x.y.z
    # and push the tag update
    git push --tags
```
