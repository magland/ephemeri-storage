# ephemeri-storage

## Important note to self

When using Cloudflare R2 with Range headers and large files, it's important to configure the website to bypass the cache.

This is very important when setting up the tempory.net bucket!

See: https://community.cloudflare.com/t/public-r2-bucket-doesnt-handle-range-requests-well/434221/4