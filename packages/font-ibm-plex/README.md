# IBM Plex font assets

This package contains the exact IBM Plex files used by C4ML's editor and
diagram exporters. They are unmodified files from the official IBM Plex
release `v6.4.2`, Git commit
`242c4cccd37e87985a5337815c99b960ef13c65c`:

- IBM Plex Sans Regular, Medium, SemiBold, Bold, and Italic as WOFF2;
- IBM Plex Sans Regular, Bold, and Italic as TTF; and
- IBM Plex Mono Regular, Bold, and Italic as WOFF2.

The WOFF2 files are used by the desktop editor and embedded into standalone
SVG exports. The TTF files are supplied explicitly to the resvg adapter for
deterministic PNG rendering without system-font discovery.

IBM Plex is Copyright 2017 IBM Corp. with Reserved Font Name "Plex" and is
redistributed under the SIL Open Font License 1.1. `LICENSE.txt` is copied
unchanged from the tagged upstream release.

Upstream: <https://github.com/IBM/plex/tree/v6.4.2>

## SHA-256

```text
9e6c74a889a700d707613d24548fe4ffa6bc59559a0689d2cf9e133bdcdafb2f  fonts/sans/IBMPlexSans-Bold.ttf
fa7130d854a660b39a7fc9e6e0f2dc23dba5f1346e2adea3e1fe37b6d884133d  fonts/sans/IBMPlexSans-Bold.woff2
a9c6ef9942c49e49d11e11a6dacc0b3a087978757e9b22a06b8ac22a6400fb15  fonts/sans/IBMPlexSans-Italic.ttf
13284fab1821ba6e3652c1580fcf2bbfd8c9309520c69b3d1224dab40b37c597  fonts/sans/IBMPlexSans-Italic.woff2
5660f8a658f8bb50dbc005232f885eadffd2bc1c235c4f6fbb63469d1f9cde6d  fonts/sans/IBMPlexSans-Medium.woff2
975dcda37d80f038dcd143c22e33ca2d97a0cc5a929aace1c749153b0fe1afa5  fonts/sans/IBMPlexSans-Regular.ttf
ba711a3085ff9f27440b6b9c4550cfc47c97bf36591d5da958b975bb3add8c1a  fonts/sans/IBMPlexSans-Regular.woff2
f78048030eab62e860efa39a0df79e2e5581bf122eb95b9bc42c0b8a4988d205  fonts/sans/IBMPlexSans-SemiBold.woff2
5788454f0ba4bd6300752c474215c4dd926682fa173ae1c6252d57828b6a235d  fonts/mono/IBMPlexMono-Bold.woff2
6afc2a6edd9a1d1f8104daf139a5062392f47da2f97fe19cb18a6a5a1fa67ec3  fonts/mono/IBMPlexMono-Italic.woff2
49ce58b41a0e1cb921c0f58d9a5b8b96a2cc21437c7066f3ba4f24873076d131  fonts/mono/IBMPlexMono-Regular.woff2
```
